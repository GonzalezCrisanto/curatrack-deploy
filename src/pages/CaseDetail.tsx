import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { EvolutionConsentSection, validateEvolutionConsent, type ProfessionalSignatureData } from '@/components/EvolutionConsentSection';
import { saveEvolutionSignature } from '@/lib/evolutionSignature';

import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Plus, Edit, Trash2, Clock, Camera, FileText, FileSignature,
  Stethoscope, Ruler, Droplets, ShieldAlert, Thermometer, Pill, X, Image, Upload, Package, RefreshCw, CheckCircle2, Save,
  TrendingDown, TrendingUp, Minus, Sparkles, Archive, Copy, Printer, Download, Loader2
} from 'lucide-react';
import { Evolution, Photo, professionals, getStatusLabel, woundStatuses, odorOptions, evolutionStatuses, OdorLevel, EvolutionStatus, tissueTypeOptions, edgeTypeOptions, TissueType, EdgeType, exudateAmountOptions, exudateTypeOptions, exudateColorOptions, ExudateAmount, ExudateType, ExudateColor, infectionSignFields } from '@/data/demoData';
import { getPatientAge, formatPatientAge } from '@/lib/age';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEvolutionArea } from '@/lib/patientStatus';
import { getActiveTurnoForPatient, formatNextControl } from '@/lib/appointments';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const statusBadgeClass: Record<string, string> = {
  activo: 'bg-info/10 text-info border-info/30',
  en_mejoria: 'bg-success/10 text-success border-success/30',
  critico: 'bg-destructive/10 text-destructive border-destructive/30',
  resuelto: 'bg-success/15 text-success border-success/40',
};

const emptyEvolution = {
  date: '', time: '', professional: '', description: '', procedure: '', materials: '', observations: '',
  healingDate: '', painLevel: 0 as number, odor: 'sin_olor' as OdorLevel, evolutionStatus: 'tratamiento_activo' as EvolutionStatus,
  woundLength: '' as number | '', woundWidth: '' as number | '', woundDepth: '' as number | '',
  tissueTypes: [] as TissueType[], edgeTypes: [] as EdgeType[],
  exudateAmount: undefined as ExudateAmount | undefined,
  exudateType: undefined as ExudateType | undefined,
  exudateColor: undefined as ExudateColor | undefined,
  hasInfectionSigns: false,
  infMalOlor: false, infEritema: false, infCalor: false, infBiofilm: false, infPurulenta: false, infDolorAumentado: false,
  bodyTemperature: '' as number | '',
  requiresMedicalOrder: false,
  medicalOrder: '',
};

export default function CaseDetail() {
  const { patientId, caseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { patients, turnos, updateCase, addEvolution, updateEvolution, deleteEvolution, currentUser } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const woundCase = patient?.cases.find(c => c.id === caseId);

  const [evoDialogOpen, setEvoDialogOpen] = useState(false);
  const [editingEvo, setEditingEvo] = useState<Evolution | null>(null);
  const [evoForm, setEvoForm] = useState(emptyEvolution);
  const [evoPhotos, setEvoPhotos] = useState<Photo[]>([]);
  const [photoViewer, setPhotoViewer] = useState<string | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [consentErrors, setConsentErrors] = useState<string[]>([]);

  const emptyProfSignature: ProfessionalSignatureData = { confirmed: false, signatureDataUrl: null };
  const [profSignature, setProfSignature] = useState<ProfessionalSignatureData>(emptyProfSignature);
  const [hasGeneralConsent, setHasGeneralConsent] = useState(false);

  // Check if patient has general consent
  useEffect(() => {
    if (!patient) return;
    supabase.from('patient_consents').select('id').eq('patient_id', patient.id).eq('status', 'accepted').limit(1)
      .then(({ data }) => setHasGeneralConsent((data ?? []).length > 0));
  }, [patient?.id]);

  // Load persisted evolution photos for this case from the DB. Stored paths live
  // in the private `signatures` bucket, so we sign them for display. Grouped by
  // evolution_id to render under each evolution in the timeline below.
  const [evoDbPhotos, setEvoDbPhotos] = useState<Record<string, Photo[]>>({});
  useEffect(() => {
    if (!woundCase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('id, url, caption, photo_date, evolution_id')
        .eq('case_id', woundCase.id)
        .not('evolution_id', 'is', null);
      if (error || !data || cancelled) return;
      const paths = data.map(r => r.url);
      const signedByPath = new Map<string, string>();
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage
          .from('signatures')
          .createSignedUrls(paths, 60 * 60 * 24 * 365);
        (signed ?? []).forEach((s, i) => { if (s.signedUrl) signedByPath.set(paths[i], s.signedUrl); });
      }
      if (cancelled) return;
      const grouped: Record<string, Photo[]> = {};
      data.forEach(r => {
        const photo: Photo = {
          id: r.id,
          url: signedByPath.get(r.url) ?? r.url,
          caption: r.caption ?? '',
          date: r.photo_date ?? '',
        };
        (grouped[r.evolution_id as string] ||= []).push(photo);
      });
      setEvoDbPhotos(grouped);
    })();
    return () => { cancelled = true; };
  }, [woundCase?.id]);

  // Load the professional's signature for each evolution in this case, so the
  // timeline can offer a "Ver firma responsable" button per evolution.
  interface EvoSignature { professionalName: string; signedAt: string | null; signatureUrl: string | null }
  const [evoSignatures, setEvoSignatures] = useState<Record<string, EvoSignature>>({});
  const [sigViewerEvoId, setSigViewerEvoId] = useState<string | null>(null);
  useEffect(() => {
    if (!woundCase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('evolution_signatures')
        .select('evolution_id, professional_signature_url, professional_signed_at')
        .eq('case_id', woundCase.id);
      if (error || !data || cancelled) return;
      const paths = data.map(r => r.professional_signature_url).filter((p): p is string => !!p);
      const signedByPath = new Map<string, string>();
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage
          .from('signatures')
          .createSignedUrls(paths, 60 * 60 * 24 * 365);
        (signed ?? []).forEach((s, i) => { if (s.signedUrl) signedByPath.set(paths[i], s.signedUrl); });
      }
      if (cancelled) return;
      const map: Record<string, EvoSignature> = {};
      data.forEach(r => {
        const ev = woundCase.evolutions.find(e => e.id === r.evolution_id);
        map[r.evolution_id] = {
          professionalName: ev?.professional || 'Profesional',
          signedAt: r.professional_signed_at,
          signatureUrl: r.professional_signature_url ? (signedByPath.get(r.professional_signature_url) ?? null) : null,
        };
      });
      setEvoSignatures(map);
    })();
    return () => { cancelled = true; };
  }, [woundCase?.id, woundCase?.evolutions]);

  // Case-level AI summary viewer
  const [caseSummaryOpen, setCaseSummaryOpen] = useState(false);

  const evoPhotoInput = useRef<HTMLInputElement>(null);
  const evoCameraInput = useRef<HTMLInputElement>(null);

  // Auto-open the new-evolution dialog when ?newEvo=1 is present (from Patients quick action)
  useEffect(() => {
    if (searchParams.get('newEvo') === '1' && patient && woundCase && !evoDialogOpen) {
      openNewEvo();
      const next = new URLSearchParams(searchParams);
      next.delete('newEvo');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, patient, woundCase]);

  if (!patient || !woundCase) {
    return <AppLayout><div className="p-8 text-center font-body text-muted-foreground">Caso no encontrado</div></AppLayout>;
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" no es una imagen válida`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const photo: Photo = {
          id: `ph${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: reader.result as string,
          caption: file.name.replace(/\.[^.]+$/, ''),
          date: new Date().toISOString().split('T')[0],
        };
        setEvoPhotos(prev => [...prev, photo]);
      };
      reader.readAsDataURL(file);
    });
  };

  const openNewEvo = () => {
    setEditingEvo(null);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    setEvoForm({
      ...emptyEvolution,
      date: today,
      healingDate: today,
      time: now.toTimeString().slice(0, 5),
      professional: 'Lic. María González',
    });
    setEvoPhotos([]);
    setProfSignature(emptyProfSignature);
    setConsentErrors([]);
    setEvoDialogOpen(true);
  };

  const goToNewCurationStep2 = () => {
    navigate(`/curation/new?patientId=${encodeURIComponent(patient.id)}&caseId=${encodeURIComponent(woundCase.id)}&step=2`);
  };

  const openEditEvo = (ev: Evolution) => {
    setEditingEvo(ev);
    const { id, photos, ...rest } = ev;
    setEvoForm({
      ...emptyEvolution,
      ...rest,
      healingDate: rest.healingDate ?? rest.date,
      painLevel: rest.painLevel ?? 0,
      odor: rest.odor ?? 'sin_olor',
      evolutionStatus: rest.evolutionStatus ?? 'tratamiento_activo',
      woundLength: rest.woundLength ?? '',
      woundWidth: rest.woundWidth ?? '',
      woundDepth: rest.woundDepth ?? '',
      tissueTypes: rest.tissueTypes ?? [],
      edgeTypes: rest.edgeTypes ?? [],
      exudateAmount: rest.exudateAmount,
      exudateType: rest.exudateType,
      exudateColor: rest.exudateColor,
      hasInfectionSigns: rest.hasInfectionSigns ?? false,
      infMalOlor: rest.infMalOlor ?? false,
      infEritema: rest.infEritema ?? false,
      infCalor: rest.infCalor ?? false,
      infBiofilm: rest.infBiofilm ?? false,
      infPurulenta: rest.infPurulenta ?? false,
      infDolorAumentado: rest.infDolorAumentado ?? false,
      bodyTemperature: rest.bodyTemperature ?? '',
      requiresMedicalOrder: rest.requiresMedicalOrder ?? false,
      medicalOrder: rest.medicalOrder ?? '',
    });
    setEvoPhotos([...photos]);
    setEvoDialogOpen(true);
  };

  // Build a comprehensive prompt that covers the WHOLE case + ALL its evolutions.
  const buildCasePromptData = () => {
    const labelOf = <T extends string>(arr: { value: T; label: string }[], v?: T) =>
      v ? arr.find(o => o.value === v)?.label ?? v : undefined;

    const evos = [...woundCase.evolutions]
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(ev => {
        const l = typeof ev.woundLength === 'number' ? ev.woundLength : null;
        const w = typeof ev.woundWidth === 'number' ? ev.woundWidth : null;
        const area = l && w ? Number((l * w).toFixed(2)) : null;
        return {
          fecha: ev.date,
          hora: ev.time || null,
          profesional: ev.professional || null,
          estado_evolucion: labelOf(evolutionStatuses, ev.evolutionStatus),
          tamaño_cm: { largo: l, ancho: w, profundidad: ev.woundDepth ?? null, area_cm2: area },
          tipos_tejido: (ev.tissueTypes || []).map(t => labelOf(tissueTypeOptions, t)),
          tipos_borde: (ev.edgeTypes || []).map(t => labelOf(edgeTypeOptions, t)),
          dolor_eva: ev.painLevel ?? null,
          olor: labelOf(odorOptions, ev.odor),
          exudado: {
            cantidad: labelOf(exudateAmountOptions, ev.exudateAmount),
            tipo: labelOf(exudateTypeOptions, ev.exudateType),
            color: labelOf(exudateColorOptions, ev.exudateColor),
          },
          infeccion: ev.hasInfectionSigns
            ? {
                presenta_signos: true,
                signos: infectionSignFields.filter(f => (ev as unknown as Record<string, unknown>)[f.key]).map(f => f.label),
                temperatura_c: ev.bodyTemperature ?? null,
              }
            : { presenta_signos: false },
          procedimiento: ev.procedure || null,
          materiales_usados: ev.materials || null,
          descripcion: ev.description || null,
          observaciones: ev.observations || null,
        };
      });

    const activeTurno = getActiveTurnoForPatient(turnos, patient.id);

    return {
      paciente: `${patient.firstName} ${patient.lastName}`,
      edad: getPatientAge(patient),
      diagnostico_base: patient.diagnosis,
      caso: {
        tipo: woundCase.woundType,
        ubicacion: woundCase.anatomicalLocation,
        inicio: woundCase.startDate,
        estado_actual: labelOf(woundStatuses, woundCase.status as never) ?? woundCase.status,
        tratamiento_actual: woundCase.treatment || null,
        cantidad_evoluciones: evos.length,
        proximo_control_caso: activeTurno ? formatNextControl(activeTurno.date, activeTurno.time) : null,
      },
      evoluciones: evos,
    };
  };

  const generateAISummary = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-evolution-summary', {
        body: { evolutionData: buildCasePromptData() },
      });
      if (error) {
        const msg = (error as { message?: string })?.message || 'Error al generar el resumen';
        setAiError(msg);
        toast.error(msg);
        return;
      }
      if ((data as { error?: string })?.error) {
        setAiError((data as { error: string }).error);
        toast.error((data as { error: string }).error);
        return;
      }
      const summary = (data as { summary?: string })?.summary?.trim();
      if (!summary) {
        setAiError('La IA no devolvió contenido.');
        return;
      }
      // Persist the summary onto the CASE itself.
      updateCase(patient.id, {
        ...woundCase,
        aiSummary: summary,
        aiSummaryUpdatedAt: new Date().toISOString(),
      });
      toast.success('Resumen clínico generado');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setAiError(msg);
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const persistEvo = async (closeCase: boolean) => {
    const numOrUndef = (v: number | '') => (v === '' ? undefined : Number(v));
    const base = {
      ...evoForm,
      woundLength: numOrUndef(evoForm.woundLength),
      woundWidth: numOrUndef(evoForm.woundWidth),
      woundDepth: numOrUndef(evoForm.woundDepth),
      bodyTemperature: numOrUndef(evoForm.bodyTemperature),
    };
    const payload: Evolution = editingEvo
      ? { ...editingEvo, ...base, photos: evoPhotos } as Evolution
      : { ...base, id: `e${Date.now()}`, photos: evoPhotos } as Evolution;

    const isNew = !editingEvo;

    let savedEvoId = payload.id;
    if (editingEvo) {
      const ok = await updateEvolution(patient.id, woundCase.id, payload);
      if (!ok) {
        toast.error('No se pudo guardar la evolución. Revisá la conexión e intentá nuevamente.');
        return;
      }
    } else {
      const dbId = await addEvolution(patient.id, woundCase.id, payload);
      if (!dbId) {
        toast.error('No se pudo registrar la curación. Revisá la conexión e intentá nuevamente.');
        return;
      }
      savedEvoId = dbId;
    }

    // Save the professional's signature for new evolutions
    if (isNew && currentUser) {
      const sigResult = await saveEvolutionSignature({
        evolutionId: savedEvoId,
        patientId: patient.id,
        caseId: woundCase.id,
        userId: currentUser.id,
        professionalData: profSignature,
      });
      if (sigResult.uploadError === 'professional') {
        toast.error('No se pudo guardar la firma profesional. Revisá la conexión e intentá nuevamente.');
      }
      if (!sigResult.ok) {
        toast.error('No se pudo guardar la firma del profesional. Revisá la conexión e intentá nuevamente.');
      }
    }

    if (closeCase) {
      const closedAt = new Date().toISOString().split('T')[0];
      const closedPayload: Evolution = { ...payload, closedAt, id: savedEvoId };
      const evoOk = await updateEvolution(patient.id, woundCase.id, closedPayload);
      const caseOk = await updateCase(patient.id, { ...woundCase, status: 'resuelto' });
      if (!evoOk || !caseOk) {
        toast.error('No se pudo cerrar el caso. Revisá la conexión e intentá nuevamente.');
        return;
      }
      toast.success('Curación registrada correctamente con firma y consentimiento. Caso cerrado.');
      setEvoDialogOpen(false);
      setCloseConfirmOpen(false);
      return;
    }

    toast.success(isNew ? 'Curación registrada correctamente con firma y consentimiento.' : 'Evolución actualizada');
    setCloseConfirmOpen(false);
    setEvoDialogOpen(false);
  };

  const handleSaveEvo = () => {
    // Validate consent & signature (only for new evolutions)
    if (!editingEvo) {
      const cErrors = validateEvolutionConsent(profSignature);
      if (cErrors.length > 0) {
        setConsentErrors(cErrors);
        toast.error(cErrors[0]);
        return;
      }
      setConsentErrors([]);
    }

    if (evoForm.evolutionStatus === 'cicatrizada') {
      setCloseConfirmOpen(true);
      return;
    }
    persistEvo(false);
  };

  const handleConfirmCloseCase = () => {
    if (!editingEvo) {
      const cErrors = validateEvolutionConsent(profSignature);
      if (cErrors.length > 0) {
        setConsentErrors(cErrors);
        toast.error(cErrors[0]);
        setCloseConfirmOpen(false);
        return;
      }
      setConsentErrors([]);
    }
    persistEvo(true);
  };

  const openCaseSummaryPrintWindow = (): boolean => {
    const summary = woundCase.aiSummary;
    if (!summary) {
      toast.error('No hay resumen disponible para imprimir.');
      return false;
    }
    try {
      const win = window.open('', '_blank');
      if (!win) {
        toast.error('No se pudo abrir la ventana de impresión. Revisá el bloqueador de pop-ups del navegador.');
        return false;
      }
      const safe = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
      const rawHtml = marked.parse(summary, { async: false }) as string;
      const bodyHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
      const updated = woundCase.aiSummaryUpdatedAt ? new Date(woundCase.aiSummaryUpdatedAt).toLocaleString('es-AR') : '';
      win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Resumen-IA-${safe(woundCase.woundType)}</title>
        <style>
          body { font-family: 'Open Sans', system-ui, sans-serif; max-width: 720px; margin: 32px auto; padding: 0 24px; color: #111; }
          h1.title { font-family: 'Montserrat', system-ui, sans-serif; color: #00965E; font-size: 22px; margin: 0 0 4px; }
          .meta { color: #555; font-size: 13px; margin-bottom: 24px; }
          .content { line-height: 1.55; font-size: 14px; }
          .content h1, .content h2, .content h3, .content h4 { font-family: 'Montserrat', system-ui, sans-serif; color: #111; margin-top: 18px; margin-bottom: 6px; }
          .content h1 { font-size: 18px; }
          .content h2 { font-size: 16px; }
          .content h3 { font-size: 14px; }
          .content p { margin: 8px 0; }
          .content ul, .content ol { margin: 8px 0; padding-left: 20px; }
          .content li { margin: 3px 0; }
          .content strong { color: #00965E; }
          .content code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 13px; }
          @media print { body { margin: 0; padding: 16mm; } }
        </style></head><body>
        <h1 class="title">Resumen con IA — ${safe(woundCase.woundType)}</h1>
        <div class="meta">${safe(patient.firstName)} ${safe(patient.lastName)} · ${safe(woundCase.anatomicalLocation || '')}${updated ? ` · Generado ${safe(updated)}` : ''}</div>
        <div class="content">${bodyHtml}</div>
        <script>window.onload = () => { try { window.print(); } catch(e) {} };</script>
      </body></html>`);
      win.document.close();
      return true;
    } catch (err) {
      console.error('openCaseSummaryPrintWindow failed', err);
      toast.error('Ocurrió un error al preparar el documento. Probá copiar el resumen como alternativa.');
      return false;
    }
  };


  const setEField = (key: string, value: unknown) => setEvoForm(prev => ({ ...prev, [key]: value as never }));

  const toggleTissue = (t: TissueType) => setEvoForm(prev => ({
    ...prev,
    tissueTypes: prev.tissueTypes.includes(t) ? prev.tissueTypes.filter(x => x !== t) : [...prev.tissueTypes, t],
  }));
  const toggleEdge = (t: EdgeType) => setEvoForm(prev => ({
    ...prev,
    edgeTypes: prev.edgeTypes.includes(t) ? prev.edgeTypes.filter(x => x !== t) : [...prev.edgeTypes, t],
  }));

  const woundArea = (() => {
    const l = typeof evoForm.woundLength === 'number' ? evoForm.woundLength : parseFloat(String(evoForm.woundLength));
    const w = typeof evoForm.woundWidth === 'number' ? evoForm.woundWidth : parseFloat(String(evoForm.woundWidth));
    if (!isFinite(l) || !isFinite(w) || l <= 0 || w <= 0) return null;
    return (l * w).toFixed(2);
  })();

  const emitMedicalOrder = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = today.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const orderId = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;

    const escape = (s: string) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const orderText = evoForm.medicalOrder?.trim() || '(Sin detalle especificado)';

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<title>Orden Profesional ${orderId}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Open Sans','Segoe UI',sans-serif;color:#1a1a1a;margin:0 auto;padding:32px;max-width:780px;line-height:1.5}
  h1,h2{font-family:'Montserrat','Segoe UI',sans-serif;margin:0}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #00965E;padding-bottom:16px;margin-bottom:24px}
  .brand{color:#00965E;font-size:22px;font-weight:700;letter-spacing:.5px}
  .brand small{display:block;font-size:11px;color:#666;font-weight:500;letter-spacing:1px;text-transform:uppercase;margin-top:2px}
  .meta{text-align:right;font-size:12px;color:#555}
  .meta strong{color:#00965E;font-size:14px;display:block;margin-bottom:2px}
  h1{font-size:20px;text-align:center;margin:8px 0 24px;text-transform:uppercase;letter-spacing:1px;color:#00965E}
  .section{margin-bottom:20px;page-break-inside:avoid}
  .section h2{font-size:13px;color:#00965E;text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid #e5e5e5;padding-bottom:6px;margin-bottom:10px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px}
  .grid div{padding:2px 0}
  .grid b{color:#444;font-weight:600;display:inline-block;min-width:90px}
  .order-box{background:#f5faf7;border-left:4px solid #00965E;padding:14px 18px;border-radius:4px;font-size:14px;white-space:pre-wrap;line-height:1.6}
  .materials{background:#fafafa;border:1px solid #eaeaea;padding:12px;border-radius:4px;font-size:13px;white-space:pre-wrap}
  .signature{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:48px}
  .sig-line{border-top:1px solid #333;padding-top:6px;font-size:12px;color:#555;text-align:center}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e5e5;font-size:10px;color:#888;text-align:center}
  @media print{body{padding:24px} .no-print{display:none}}
  .actions{position:fixed;top:16px;right:16px;display:flex;gap:8px}
  .actions button{background:#00965E;color:#fff;border:0;padding:10px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px}
  .actions button.alt{background:#fff;color:#00965E;border:1px solid #00965E}
</style></head><body>
<div class="actions no-print">
  <button onclick="window.print()">Imprimir / Guardar PDF</button>
  <button class="alt" onclick="window.close()">Cerrar</button>
</div>
<div class="header">
  <div><div class="brand">CuraTrack<small>Gestión clínica de heridas</small></div></div>
  <div class="meta"><strong>Orden N° ${escape(orderId)}</strong>Emitida: ${escape(dateStr)} · ${escape(timeStr)}</div>
</div>

<h1>Orden Profesional</h1>

<div class="section">
  <h2>Datos del Paciente</h2>
  <div class="grid">
    <div><b>Nombre:</b> ${escape(patient.firstName + ' ' + patient.lastName)}</div>
    <div><b>DNI:</b> ${escape(patient.dni || '—')}</div>
    <div><b>Edad:</b> ${escape(formatPatientAge(patient))}</div>
    <div><b>Sexo:</b> ${escape(patient.gender || '—')}</div>
    <div><b>Teléfono:</b> ${escape(patient.phone || '—')}</div>
    <div><b>Domicilio:</b> ${escape(patient.address || '—')}</div>
    <div style="grid-column:1/-1"><b>Antecedentes y comorbilidades:</b> ${escape(patient.diagnosis || '—')}</div>
    ${patient.allergies ? `<div style="grid-column:1/-1"><b>Alergias:</b> ${escape(patient.allergies)}</div>` : ''}
  </div>
</div>

<div class="section">
  <h2>Detalle de la Herida</h2>
  <div class="grid">
    <div><b>Tipo:</b> ${escape(woundCase.woundType)}</div>
    <div><b>Ubicación:</b> ${escape(woundCase.anatomicalLocation)}</div>
    <div><b>Inicio:</b> ${escape(woundCase.startDate)}</div>
    <div><b>Estado:</b> ${escape(getStatusLabel(woundCase.status))}</div>
  </div>
</div>

<div class="section">
  <h2>Procedimiento Realizado</h2>
  <div class="materials">${escape(evoForm.procedure || '—')}</div>
</div>

<div class="section">
  <h2>Material de Curación Utilizado</h2>
  <div class="materials">${escape(evoForm.materials || '—')}</div>
</div>

<div class="section">
  <h2>Indicación / Orden Médica</h2>
  <div class="order-box">${escape(orderText)}</div>
</div>

<div class="signature">
  <div class="sig-line">${escape(evoForm.professional || patient.assignedProfessional || '—')}<br/><span style="font-size:10px">Profesional tratante</span></div>
  <div class="sig-line">Firma y sello</div>
</div>

<div class="footer">Documento generado electrónicamente · ${escape(dateStr)} ${escape(timeStr)} · Orden ${escape(orderId)}</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { toast.error('Habilitá las ventanas emergentes para emitir la orden.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast.success(`Orden ${orderId} generada`);
  };

  const caseDetails = [
    { icon: Stethoscope, label: 'Tipo de herida', value: woundCase.woundType },
    { icon: FileText, label: 'Ubicación', value: woundCase.anatomicalLocation },
    { icon: Clock, label: 'Inicio', value: woundCase.startDate },
  ];

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-6 animate-fade-in">
        <Button variant="outline" onClick={() => navigate(`/patients/${patient.id}`)} className="font-body text-base border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al paciente
        </Button>

        {/* Case Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="heading-display text-[26px]">{woundCase.woundType}</h1>
              <Badge className={`font-body text-sm ${statusBadgeClass[woundCase.status]}`}>
                {woundCase.status === 'resuelto' ? 'CERRADA ✅' : getStatusLabel(woundCase.status)}
              </Badge>
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => {
              setAiError(null);
              setCaseSummaryOpen(true);
              if (!woundCase.aiSummary && woundCase.evolutions.length > 0) {
                generateAISummary();
              }
            }}
            className="font-body h-12 px-5 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md shrink-0"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {woundCase.aiSummary ? 'Ver resumen con IA' : 'Generar resumen con IA'}
          </Button>
        </div>

        {/* Case Info Grid */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="heading-display text-xl">Información del Caso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseDetails.map(d => (
                <div key={d.label} className="flex items-start gap-2">
                  <d.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-body text-sm text-muted-foreground">{d.label}</p>
                    <p className="font-body text-base">{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="flex items-center justify-between">
          <h2 className="heading-display text-[22px] flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Evolución de la Herida
          </h2>
          <Button onClick={goToNewCurationStep2} className="font-body" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nueva curación
          </Button>
        </div>

        {(() => {
          const sorted = [...woundCase.evolutions].sort((a, b) => {
            const da = `${a.date || ''}T${a.time || '00:00'}`;
            const db = `${b.date || ''}T${b.time || '00:00'}`;
            return db < da ? -1 : db > da ? 1 : 0;
          });
          const activeTurno = getActiveTurnoForPatient(turnos, patient.id);
          const activeEvos = sorted.filter(e => !e.closedAt);
          const closedEvos = sorted.filter(e => !!e.closedAt);

          // Map evolution id -> previous (older) area for trend computation
          const chronAsc = [...sorted].reverse();
          const trendByEvoId = new Map<string, 'down' | 'up' | 'same' | null>();
          chronAsc.forEach((e, i) => {
            const area = getEvolutionArea(e);
            if (area == null) return trendByEvoId.set(e.id, null);
            // find latest previous evolution with area
            let prevArea: number | null = null;
            for (let j = i - 1; j >= 0; j--) {
              const p = getEvolutionArea(chronAsc[j]);
              if (p != null) { prevArea = p; break; }
            }
            if (prevArea == null) return trendByEvoId.set(e.id, null);
            if (area < prevArea) trendByEvoId.set(e.id, 'down');
            else if (area > prevArea) trendByEvoId.set(e.id, 'up');
            else trendByEvoId.set(e.id, 'same');
          });

          const renderEvolution = (ev: Evolution, idx: number, isHistory: boolean) => {
            const area = getEvolutionArea(ev);
            const trend = trendByEvoId.get(ev.id) ?? null;
            const evoStatus = ev.evolutionStatus
              ? evolutionStatuses.find(s => s.value === ev.evolutionStatus)?.label
              : null;
            const tissueLabels = (ev.tissueTypes || [])
              .map(t => tissueTypeOptions.find(o => o.value === t)?.label)
              .filter(Boolean) as string[];
            const exudateLabel = ev.exudateAmount
              ? exudateAmountOptions.find(o => o.value === ev.exudateAmount)?.label
              : null;
            const exudateType = ev.exudateType
              ? exudateTypeOptions.find(o => o.value === ev.exudateType)?.label
              : null;
            

            return (
              <div key={ev.id} className="relative pl-12 animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-background ${isHistory ? 'bg-muted-foreground' : 'bg-primary'}`} />
                <Card className={`border-border/50 ${isHistory ? 'bg-muted/20' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-base font-semibold">{ev.date}</span>
                          {ev.time && <span className="font-body text-sm text-muted-foreground">{ev.time} hs</span>}
                          {evoStatus && (
                            <Badge variant="secondary" className="font-body text-sm">{evoStatus}</Badge>
                          )}
                          {isHistory && ev.closedAt && (
                            <Badge className="font-body text-sm bg-success/15 text-success border-success/40 border">
                              Cerrada · {ev.closedAt}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick metrics row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
                      {area != null && (
                        <span className="inline-flex items-center gap-1 font-body text-sm">
                          <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="tabular-nums font-medium">{area.toFixed(2)} cm²</span>
                          {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-success" aria-label="Área disminuye" />}
                          {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-destructive" aria-label="Área aumenta" />}
                          {trend === 'same' && <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-label="Área estable" />}
                        </span>
                      )}
                      {tissueLabels.length > 0 && (
                        <span className="inline-flex items-center gap-1 font-body text-sm text-muted-foreground">
                          <Stethoscope className="h-3.5 w-3.5" /> {tissueLabels.slice(0, 3).join(', ')}{tissueLabels.length > 3 ? '…' : ''}
                        </span>
                      )}
                      {exudateLabel && (
                        <span className="inline-flex items-center gap-1 font-body text-sm text-muted-foreground">
                          <Droplets className="h-3.5 w-3.5" /> {exudateLabel}{exudateType ? ` · ${exudateType}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {ev.description && (
                        <div>
                          <p className="font-body text-sm text-muted-foreground mb-0.5">Descripción clínica</p>
                          <p className="font-body text-base whitespace-pre-line">{ev.description}</p>
                        </div>
                      )}
                      {ev.procedure && (
                        <div>
                          <p className="font-body text-sm text-muted-foreground mb-0.5">Procedimiento</p>
                          <p className="font-body text-base">{ev.procedure}</p>
                        </div>
                      )}
                      {ev.materials && (
                        <div>
                          <p className="font-body text-sm text-muted-foreground mb-0.5 flex items-center gap-1"><Package className="h-3 w-3" /> Material de curación</p>
                          <p className="font-body text-base">{ev.materials}</p>
                        </div>
                      )}
                      {ev.observations && (
                        <div>
                          <p className="font-body text-sm text-muted-foreground mb-0.5">Observaciones</p>
                          <p className="font-body text-base">{ev.observations}</p>
                        </div>
                      )}
                      {/* AI summary moved to case header — no per-evolution button */}
                      {!isHistory && idx === 0 && activeTurno && (
                        <div className="flex items-center gap-1 text-sm font-body text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Próximo control: {formatNextControl(activeTurno.date, activeTurno.time)}
                        </div>
                      )}

                      {(() => {
                        const photos = [...ev.photos, ...(evoDbPhotos[ev.id] ?? [])];
                        return photos.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {photos.map(ph => (
                              <div
                                key={ph.id}
                                className="w-20 h-16 rounded-md overflow-hidden border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                                onClick={() => setPhotoViewer(ph.url)}
                              >
                                <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {evoSignatures[ev.id] && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-body text-sm mt-1"
                          onClick={() => setSigViewerEvoId(ev.id)}
                        >
                          <FileSignature className="h-3.5 w-3.5 mr-1.5" /> Ver firma responsable
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          };

          const TimelineList = ({ items, isHistory }: { items: Evolution[]; isHistory: boolean }) => (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-6">
                {items.map((ev, idx) => renderEvolution(ev, idx, isHistory))}
              </div>
              {items.length === 0 && (
                <div className="pl-12 text-center py-12 border border-dashed border-border rounded-lg">
                  <p className="font-body text-muted-foreground">
                    {isHistory ? 'No hay evoluciones cerradas.' : 'No hay evoluciones registradas'}
                  </p>
                  {!isHistory && (
                    <Button variant="outline" className="font-body mt-3" onClick={goToNewCurationStep2}>
                      <Plus className="mr-2 h-4 w-4" /> Nueva curación
                    </Button>
                  )}
                </div>
              )}
            </div>
          );

          if (closedEvos.length === 0) {
            return <TimelineList items={activeEvos} isHistory={false} />;
          }

          return (
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="font-body">
                <TabsTrigger value="active" className="font-body">
                  Activas <Badge variant="secondary" className="ml-2 font-body text-sm">{activeEvos.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="font-body">
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                  Historial <Badge variant="secondary" className="ml-2 font-body text-sm">{closedEvos.length}</Badge>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-4">
                <TimelineList items={activeEvos} isHistory={false} />
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <TimelineList items={closedEvos} isHistory={true} />
              </TabsContent>
            </Tabs>
          );
        })()}

        {/* Evolution Form Dialog — mobile-first */}
        <Dialog open={evoDialogOpen} onOpenChange={setEvoDialogOpen}>
          <DialogContent className="max-w-2xl w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 gap-0 flex flex-col rounded-none sm:rounded-lg">
            <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b border-border/50 shrink-0">
              <DialogTitle className="heading-display text-xl sm:text-[22px]">
                {editingEvo ? 'Editar Evolución' : 'Nueva Evolución'}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
              {/* Fecha de curación + hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fecha de curación</Label>
                  <Input type="date" value={evoForm.healingDate} onChange={e => { setEField('healingDate', e.target.value); setEField('date', e.target.value); }} className="font-body h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Hora</Label>
                  <Input type="time" value={evoForm.time} onChange={e => setEField('time', e.target.value)} className="font-body h-11" />
                </div>
              </div>

              {/* Profesional */}
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profesional</Label>
                <Select value={evoForm.professional} onValueChange={v => setEField('professional', v)}>
                  <SelectTrigger className="font-body h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {professionals.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Tamaño de la herida */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-baseline justify-between">
                  <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tamaño de la herida (cm)</Label>
                  {woundArea && (
                    <span className="font-body text-sm font-semibold text-primary tabular-nums">
                      Área: {woundArea} cm²
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="font-body text-[13px] text-muted-foreground">Largo</Label>
                    <Input
                      type="number" inputMode="decimal" step="0.1" min="0"
                      value={evoForm.woundLength}
                      onChange={e => setEField('woundLength', e.target.value === '' ? '' : Number(e.target.value))}
                      className="font-body h-11 text-center tabular-nums" placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-[13px] text-muted-foreground">Ancho</Label>
                    <Input
                      type="number" inputMode="decimal" step="0.1" min="0"
                      value={evoForm.woundWidth}
                      onChange={e => setEField('woundWidth', e.target.value === '' ? '' : Number(e.target.value))}
                      className="font-body h-11 text-center tabular-nums" placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-[13px] text-muted-foreground">Profundidad</Label>
                    <Input
                      type="number" inputMode="decimal" step="0.1" min="0"
                      value={evoForm.woundDepth}
                      onChange={e => setEField('woundDepth', e.target.value === '' ? '' : Number(e.target.value))}
                      className="font-body h-11 text-center tabular-nums" placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Tipo de tejido — multi-select chips */}
              <div className="space-y-2">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tipo de tejido presente</Label>
                <div className="flex flex-wrap gap-2">
                  {tissueTypeOptions.map(t => {
                    const active = evoForm.tissueTypes.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleTissue(t.value)}
                        className={cn(
                          "min-h-11 px-4 rounded-full border font-body text-base font-medium transition-all active:scale-95",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de borde — multi-select chips */}
              <div className="space-y-2">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tipo de borde</Label>
                <div className="flex flex-wrap gap-2">
                  {edgeTypeOptions.map(t => {
                    const active = evoForm.edgeTypes.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleEdge(t.value)}
                        className={cn(
                          "min-h-11 px-4 rounded-full border font-body text-base font-medium transition-all active:scale-95",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>


              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dolor (EVA)</Label>
                  <span className={cn(
                    "font-body text-base font-bold tabular-nums px-2 py-0.5 rounded-md",
                    evoForm.painLevel <= 3 && "bg-success/15 text-success",
                    evoForm.painLevel > 3 && evoForm.painLevel <= 6 && "bg-warning/15 text-warning",
                    evoForm.painLevel > 6 && "bg-destructive/15 text-destructive",
                  )}>{evoForm.painLevel} / 10</span>
                </div>
                <Slider
                  min={0} max={10} step={1}
                  value={[evoForm.painLevel]}
                  onValueChange={([v]) => setEField('painLevel', v)}
                  className="py-2"
                />
                <div className="flex justify-between font-body text-[12px] text-muted-foreground px-0.5">
                  <span>Sin dolor</span><span>Moderado</span><span>Insoportable</span>
                </div>
              </div>

              {/* Olor — chips */}
              <div className="space-y-2">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Olor</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {odorOptions.map(o => {
                    const active = evoForm.odor === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setEField('odor', o.value)}
                        className={cn(
                          "h-11 rounded-lg border font-body text-base font-medium transition-all active:scale-95",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exudado */}
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5" /> Exudado
                </Label>

                <div className="space-y-1.5">
                  <p className="font-body text-[13px] text-muted-foreground">Cantidad</p>
                  <div className="flex flex-wrap gap-2">
                    {exudateAmountOptions.map(o => {
                      const active = evoForm.exudateAmount === o.value;
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setEField('exudateAmount', active ? undefined : o.value)}
                          className={cn(
                            "min-h-11 px-4 rounded-full border font-body text-base font-medium transition-all active:scale-95",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50"
                          )}
                        >{o.label}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-body text-[13px] text-muted-foreground">Tipo</p>
                  <div className="flex flex-wrap gap-2">
                    {exudateTypeOptions.map(o => {
                      const active = evoForm.exudateType === o.value;
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setEField('exudateType', active ? undefined : o.value)}
                          className={cn(
                            "min-h-11 px-4 rounded-full border font-body text-base font-medium transition-all active:scale-95",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50"
                          )}
                        >{o.label}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-body text-[13px] text-muted-foreground">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {exudateColorOptions.map(o => {
                      const active = evoForm.exudateColor === o.value;
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setEField('exudateColor', active ? undefined : o.value)}
                          className={cn(
                            "min-h-11 px-3 rounded-full border font-body text-base font-medium transition-all active:scale-95 inline-flex items-center gap-2",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50"
                          )}
                        >
                          <span className={cn("inline-block h-4 w-4 rounded-full shrink-0", o.swatch)} />
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Infección — progressive disclosure */}
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="has-infection" className="font-body text-base font-semibold flex items-center gap-1.5">
                    <ShieldAlert className={cn("h-4 w-4", evoForm.hasInfectionSigns ? "text-destructive" : "text-muted-foreground")} />
                    ¿Presenta signos de infección?
                  </Label>
                  <Switch
                    id="has-infection"
                    checked={evoForm.hasInfectionSigns}
                    onCheckedChange={(v) => setEField('hasInfectionSigns', v)}
                  />
                </div>

                {evoForm.hasInfectionSigns && (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {infectionSignFields.map(f => {
                        const checked = !!evoForm[f.key];
                        return (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => setEField(f.key, !checked)}
                            className={cn(
                              "min-h-11 px-3 rounded-lg border font-body text-base text-left flex items-center justify-between gap-2 transition-all active:scale-[0.98]",
                              checked
                                ? "bg-destructive/10 text-destructive border-destructive/40"
                                : "bg-background text-foreground border-border hover:border-destructive/30"
                            )}
                          >
                            <span>{f.label}</span>
                            <span className={cn(
                              "h-5 w-5 rounded-md border flex items-center justify-center shrink-0",
                              checked ? "bg-destructive border-destructive" : "border-border"
                            )}>
                              {checked && <CheckCircle2 className="h-4 w-4 text-destructive-foreground" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-body text-[13px] text-muted-foreground flex items-center gap-1">
                        <Thermometer className="h-3 w-3" /> Temperatura corporal (°C)
                      </Label>
                      <Input
                        type="number" inputMode="decimal" step="0.1" min="30" max="45"
                        value={evoForm.bodyTemperature}
                        onChange={e => setEField('bodyTemperature', e.target.value === '' ? '' : Number(e.target.value))}
                        className={cn(
                          "font-body h-11 tabular-nums",
                          typeof evoForm.bodyTemperature === 'number' && evoForm.bodyTemperature >= 38 && "border-destructive text-destructive font-semibold"
                        )}
                        placeholder="36.5"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Estado de evolución */}
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Estado de evolución</Label>
                <Select value={evoForm.evolutionStatus} onValueChange={v => setEField('evolutionStatus', v)}>
                  <SelectTrigger className={cn(
                    "font-body h-11",
                    evoForm.evolutionStatus === 'cicatrizada' && "border-success text-success font-semibold",
                    evoForm.evolutionStatus === 'deterioro' && "border-destructive text-destructive",
                    evoForm.evolutionStatus === 'requiere_evaluacion' && "border-warning text-warning",
                  )}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {evolutionStatuses.map(s => (
                      <SelectItem key={s.value} value={s.value} className={s.closes ? "text-success font-semibold" : ""}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Próximo control: se gestiona desde el calendario del paciente */}

              {/* Descripción/procedimiento/materiales/observaciones */}
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Descripción clínica</Label>
                <Textarea value={evoForm.description} onChange={e => setEField('description', e.target.value)} className="font-body" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Procedimiento realizado</Label>
                <Textarea
                  value={evoForm.procedure}
                  onChange={e => setEField('procedure', e.target.value)}
                  className="font-body" rows={3}
                  placeholder="Ej: Desbridamiento cortante, Lavado con SF, Aplicación de colagenasa..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Material de curación utilizado
                </Label>
                <Textarea
                  value={evoForm.materials}
                  onChange={e => setEField('materials', e.target.value)}
                  className="font-body" rows={3}
                  placeholder="Ej: Apósito de espuma 10x10, Hidrogel, Gasas, Solución fisiológica 500ml..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Observaciones</Label>
                <Textarea value={evoForm.observations} onChange={e => setEField('observations', e.target.value)} className="font-body" rows={2} />
              </div>

              {/* Orden médica */}
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="req-order" className="font-body text-base font-semibold flex items-center gap-1.5">
                    <FileText className={cn("h-4 w-4", evoForm.requiresMedicalOrder ? "text-primary" : "text-muted-foreground")} />
                    ¿Requiere orden médica?
                  </Label>
                  <Switch
                    id="req-order"
                    checked={evoForm.requiresMedicalOrder}
                    onCheckedChange={(v) => setEField('requiresMedicalOrder', v)}
                  />
                </div>

                {evoForm.requiresMedicalOrder && (
                  <div className="space-y-2 pt-1 animate-fade-in">
                    <Label className="font-body text-[13px] text-muted-foreground">Detalle de la orden médica</Label>
                    <Textarea
                      value={evoForm.medicalOrder}
                      onChange={e => setEField('medicalOrder', e.target.value)}
                      className="font-body" rows={4}
                      placeholder="Ej: Solicitud de cultivo, interconsulta con cirugía vascular, ATB sistémico..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="font-body w-full h-11 border-primary/40 text-primary hover:bg-primary/5"
                      onClick={emitMedicalOrder}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Emitir orden profesional
                    </Button>
                  </div>
                )}
              </div>

              {/* Fotos */}
              <div className="space-y-2">
                <Label className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fotos</Label>
                <div className="flex gap-2">
                  <input ref={evoCameraInput} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }} />
                  <input ref={evoPhotoInput} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }} />
                  <Button type="button" variant="outline" size="sm" className="font-body flex-1 h-11" onClick={() => evoCameraInput.current?.click()}>
                    <Camera className="mr-1.5 h-4 w-4" /> Cámara
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="font-body flex-1 h-11" onClick={() => evoPhotoInput.current?.click()}>
                    <Upload className="mr-1.5 h-4 w-4" /> Subir
                  </Button>
                </div>
                {evoPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {evoPhotos.map(ph => (
                      <div key={ph.id} className="relative w-20 h-16 rounded-md overflow-hidden border border-border/50 group">
                        <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover" />
                        <button type="button"
                          onClick={() => setEvoPhotos(prev => prev.filter(p => p.id !== ph.id))}
                          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Consent & Signature section (only for new evolutions) */}
              {!editingEvo && (
                <EvolutionConsentSection
                  professionalName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : evoForm.professional}
                  professionalLicense={currentUser?.license}
                  professionalInstitution={currentUser?.institution}
                  hasGeneralConsent={hasGeneralConsent}
                  professionalData={profSignature}
                  onProfessionalChange={setProfSignature}
                  errors={consentErrors}
                />
              )}

              {/* AI summary moved to case header — no longer rendered inside the evolution dialog */}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border/50 bg-background px-4 sm:px-6 py-3 flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button variant="outline" onClick={() => setEvoDialogOpen(false)} className="font-body h-12 flex-1 sm:flex-none">Cancelar</Button>
              <Button
                onClick={handleSaveEvo}
                className={cn(
                  "font-body h-12 flex-[2] sm:flex-1 font-semibold",
                  evoForm.evolutionStatus === 'cicatrizada' && "bg-success text-success-foreground hover:bg-success/90"
                )}
              >
                {evoForm.evolutionStatus === 'cicatrizada'
                  ? <><CheckCircle2 className="mr-2 h-5 w-5" /> Cerrar evolución</>
                  : <><Save className="mr-2 h-5 w-5" /> Guardar evolución</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm close evolution */}
        <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="heading-display flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" /> ¿Cerrar evolución?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-body">
                Marcarás la herida como <strong>cicatrizada</strong> y el caso quedará <strong>CERRADO</strong>. Podrás verlo en el historial pero no se sugerirán nuevos controles. Esta acción se puede revertir editando el caso.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-body">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleConfirmCloseCase()}
                className="font-body bg-success text-success-foreground hover:bg-success/90"
              >
                Sí, cerrar evolución
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Photo viewer */}
        <Dialog open={!!photoViewer} onOpenChange={() => setPhotoViewer(null)}>
          <DialogContent className="max-w-3xl p-2">
            <DialogTitle className="sr-only">Foto clínica de la evolución</DialogTitle>
            <img src={photoViewer || ''} alt="Foto clínica" className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>

        {/* Responsible professional's signature viewer */}
        <Dialog open={!!sigViewerEvoId} onOpenChange={() => setSigViewerEvoId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="heading-display text-xl">Firma del profesional responsable</DialogTitle>
            </DialogHeader>
            {sigViewerEvoId && evoSignatures[sigViewerEvoId] && (
              <div className="space-y-2">
                <p className="font-body text-base">
                  <span className="text-muted-foreground">Profesional:</span> {evoSignatures[sigViewerEvoId].professionalName}
                </p>
                {evoSignatures[sigViewerEvoId].signedAt && (
                  <p className="font-body text-base">
                    <span className="text-muted-foreground">Fecha:</span> {new Date(evoSignatures[sigViewerEvoId].signedAt as string).toLocaleString('es-AR')}
                  </p>
                )}
                {evoSignatures[sigViewerEvoId].signatureUrl ? (
                  <img src={evoSignatures[sigViewerEvoId].signatureUrl as string} alt="Firma del profesional" className="w-full rounded-lg border border-border/60 bg-muted/20" />
                ) : (
                  <p className="font-body text-base text-muted-foreground text-center py-6">Sin firma registrada</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Case-level AI Summary viewer */}
        <Dialog open={caseSummaryOpen} onOpenChange={setCaseSummaryOpen}>
          <DialogContent className="max-w-3xl w-full sm:max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[88vh] p-0 gap-0 flex flex-col rounded-none sm:rounded-lg">
            <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b border-border/50 shrink-0">
              <DialogTitle className="heading-display flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Resumen con IA — {woundCase.woundType}
              </DialogTitle>
              <p className="font-body text-base text-muted-foreground mt-1">
                {patient.firstName} {patient.lastName}
                {woundCase.anatomicalLocation ? ` · ${woundCase.anatomicalLocation}` : ''}
                {' · '}{woundCase.evolutions.length} evolución{woundCase.evolutions.length === 1 ? '' : 'es'} considerada{woundCase.evolutions.length === 1 ? '' : 's'}
                {woundCase.aiSummaryUpdatedAt ? ` · Generado ${new Date(woundCase.aiSummaryUpdatedAt).toLocaleString('es-AR')}` : ''}
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {aiLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-body text-base">Generando resumen clínico con todos los datos del caso…</p>
                </div>
              )}
              {!aiLoading && aiError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <p className="font-body text-base text-destructive">{aiError}</p>
                  <Button size="sm" variant="outline" onClick={generateAISummary} className="font-body">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reintentar
                  </Button>
                </div>
              )}
              {!aiLoading && !aiError && woundCase.aiSummary && (
                <div className="font-body text-base leading-relaxed text-foreground/90 prose prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5 prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                  <ReactMarkdown>{woundCase.aiSummary}</ReactMarkdown>
                </div>
              )}
              {!aiLoading && !aiError && !woundCase.aiSummary && (
                <div className="text-center py-12 space-y-4">
                  <Sparkles className="h-10 w-10 text-primary/60 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-body text-lg font-semibold">Aún no se generó un resumen para este caso.</p>
                    <p className="font-body text-base text-muted-foreground">
                      Generá un resumen clínico que contemple todas las evoluciones registradas.
                    </p>
                  </div>
                  <Button onClick={generateAISummary} className="font-body" disabled={woundCase.evolutions.length === 0}>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Generar resumen con IA
                  </Button>
                  {woundCase.evolutions.length === 0 && (
                    <p className="font-body text-sm text-muted-foreground">Registrá al menos una evolución antes de generar el resumen.</p>
                  )}
                </div>
              )}
            </div>

            {!aiLoading && woundCase.aiSummary && (
              <div className="shrink-0 border-t border-border/50 bg-background px-4 sm:px-6 py-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Button
                  variant="outline"
                  className="font-body h-11 w-full sm:w-auto sm:flex-none"
                  onClick={async () => {
                    if (!woundCase.aiSummary) return;
                    try {
                      await navigator.clipboard.writeText(woundCase.aiSummary);
                      toast.success('Resumen copiado al portapapeles');
                    } catch {
                      toast.error('No se pudo copiar');
                    }
                  }}
                >
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar
                </Button>
                <Button
                  variant="outline"
                  className="font-body h-11 w-full sm:w-auto sm:flex-none"
                  onClick={() => openCaseSummaryPrintWindow()}
                >
                  <Printer className="mr-1.5 h-4 w-4" /> Imprimir
                </Button>
                <Button
                  className="font-body h-11 w-full sm:w-auto sm:flex-none"
                  onClick={() => {
                    if (openCaseSummaryPrintWindow()) {
                      toast.info('Elegí "Guardar como PDF" en el diálogo de impresión.');
                    }
                  }}
                >
                  <Download className="mr-1.5 h-4 w-4" /> Descargar PDF
                </Button>
                <Button
                  variant="ghost"
                  className="font-body h-11 w-full sm:w-auto"
                  onClick={() => setCaseSummaryOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </AppLayout>
  );
}
