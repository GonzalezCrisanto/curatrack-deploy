import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
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
  ArrowLeft, Plus, Edit, Trash2, Clock, Camera, FileText,
  Stethoscope, Ruler, Droplets, ShieldAlert, Thermometer, Pill, X, Image, Upload, ImagePlus, Package, RefreshCw, CheckCircle2, Save,
  TrendingDown, TrendingUp, Minus, Sparkles, Archive, Copy, Printer, Download
} from 'lucide-react';
import { Evolution, Photo, professionals, getStatusLabel, woundStatuses, healingFrequencies, odorOptions, evolutionStatuses, OdorLevel, EvolutionStatus, tissueTypeOptions, edgeTypeOptions, TissueType, EdgeType, exudateAmountOptions, exudateTypeOptions, exudateColorOptions, ExudateAmount, ExudateType, ExudateColor, infectionSignFields } from '@/data/demoData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEvolutionArea } from '@/lib/patientStatus';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AISummaryCard from '@/components/AISummaryCard';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';

const statusBadgeClass: Record<string, string> = {
  activo: 'bg-info/10 text-info border-info/30',
  en_mejoria: 'bg-success/10 text-success border-success/30',
  critico: 'bg-destructive/10 text-destructive border-destructive/30',
  resuelto: 'bg-success/15 text-success border-success/40',
};

const emptyEvolution = {
  date: '', time: '', professional: '', description: '', procedure: '', materials: '', healingFrequency: '', healingFrequencyDays: '' as number | '', observations: '', nextControl: '',
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
  const { patients, updateCase, addEvolution, updateEvolution, deleteEvolution } = useApp();
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

  // Case-level AI summary viewer
  const [caseSummaryOpen, setCaseSummaryOpen] = useState(false);

  const casePhotoInput = useRef<HTMLInputElement>(null);
  const caseCameraInput = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = (
    files: FileList | null,
    target: 'case' | 'evolution'
  ) => {
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
        if (target === 'case') {
          const updated = { ...woundCase, photos: [...woundCase.photos, photo] };
          updateCase(patient.id, updated);
          toast.success('Foto agregada al caso');
        } else {
          setEvoPhotos(prev => [...prev, photo]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeCasePhoto = (photoId: string) => {
    const updated = { ...woundCase, photos: woundCase.photos.filter(p => p.id !== photoId) };
    updateCase(patient.id, updated);
    toast.success('Foto eliminada');
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
    setEvoDialogOpen(true);
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
      healingFrequencyDays: rest.healingFrequencyDays ?? '',
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
          frecuencia_curacion: ev.healingFrequency || null,
          frecuencia_dias: ev.healingFrequencyDays ?? null,
          procedimiento: ev.procedure || null,
          materiales_usados: ev.materials || null,
          descripcion: ev.description || null,
          observaciones: ev.observations || null,
          proximo_control: ev.nextControl || null,
        };
      });

    return {
      paciente: `${patient.firstName} ${patient.lastName}`,
      edad: patient.age,
      diagnostico_base: patient.diagnosis,
      caso: {
        tipo: woundCase.woundType,
        ubicacion: woundCase.anatomicalLocation,
        inicio: woundCase.startDate,
        estado_actual: labelOf(woundStatuses, woundCase.status as never) ?? woundCase.status,
        tratamiento_actual: woundCase.treatment || null,
        frecuencia_curacion_caso: woundCase.healingFrequency || null,
        frecuencia_dias_caso: woundCase.healingFrequencyDays ?? null,
        cantidad_evoluciones: evos.length,
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

  const persistEvo = (closeCase: boolean) => {
    const numOrUndef = (v: number | '') => (v === '' ? undefined : Number(v));
    const base = {
      ...evoForm,
      woundLength: numOrUndef(evoForm.woundLength),
      woundWidth: numOrUndef(evoForm.woundWidth),
      woundDepth: numOrUndef(evoForm.woundDepth),
      bodyTemperature: numOrUndef(evoForm.bodyTemperature),
      healingFrequencyDays: numOrUndef(evoForm.healingFrequencyDays),
    };
    const payload: Evolution = editingEvo
      ? { ...editingEvo, ...base, photos: evoPhotos } as Evolution
      : { ...base, id: `e${Date.now()}`, photos: evoPhotos } as Evolution;

    const isNew = !editingEvo;

    if (editingEvo) {
      updateEvolution(patient.id, woundCase.id, payload);
    } else {
      addEvolution(patient.id, woundCase.id, payload);
    }

    if (closeCase) {
      const closedAt = new Date().toISOString().split('T')[0];
      // Stamp closedAt on the evolution that closes the case
      const closedPayload: Evolution = { ...payload, closedAt };
      updateEvolution(patient.id, woundCase.id, closedPayload);
      updateCase(patient.id, { ...woundCase, status: 'resuelto' });
      toast.success('Evolución cerrada. Caso marcado como cicatrizado.');
      setEvoDialogOpen(false);
      setCloseConfirmOpen(false);
      return;
    }

    toast.success(isNew ? 'Evolución registrada' : 'Evolución actualizada');
    setCloseConfirmOpen(false);

    // Close the dialog. The case-level AI summary stays as is until the user
    // explicitly regenerates it from the case header button.
    setEvoDialogOpen(false);
  };

  const handleSaveEvo = () => {
    // Si no hay frecuencia preestablecida (vacía o "A demanda"), exigir días manuales
    const presetSet = ['Diaria', 'Cada 48hs', 'Cada 72hs', 'Semanal'];
    const hasPreset = presetSet.includes((evoForm.healingFrequency || '').trim());
    const manualDays = evoForm.healingFrequencyDays === '' ? null : Number(evoForm.healingFrequencyDays);
    if (!hasPreset && (!manualDays || manualDays <= 0)) {
      toast.error('Indicá la frecuencia de curación o, en su defecto, los días estimados entre curaciones.');
      return;
    }
    if (evoForm.evolutionStatus === 'cicatrizada') {
      setCloseConfirmOpen(true);
      return;
    }
    persistEvo(false);
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
      const bodyHtml = marked.parse(summary, { async: false }) as string;
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
  <div><div class="brand">CuraTrack<small>Sistema de Gestión de Heridas</small></div></div>
  <div class="meta"><strong>Orden N° ${escape(orderId)}</strong>Emitida: ${escape(dateStr)} · ${escape(timeStr)}</div>
</div>

<h1>Orden Profesional</h1>

<div class="section">
  <h2>Datos del Paciente</h2>
  <div class="grid">
    <div><b>Nombre:</b> ${escape(patient.firstName + ' ' + patient.lastName)}</div>
    <div><b>DNI:</b> ${escape(patient.dni || '—')}</div>
    <div><b>Edad:</b> ${escape(String(patient.age || '—'))}</div>
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
    <div><b>Tamaño:</b> ${escape(woundCase.size)}</div>
    <div><b>Profundidad:</b> ${escape(woundCase.depth)}</div>
    <div><b>Exudado:</b> ${escape(woundCase.exudate)}</div>
    <div><b>Infección:</b> ${escape(woundCase.infection)}</div>
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

<div class="footer">Documento generado electrónicamente por CuraTrack · ${escape(dateStr)} ${escape(timeStr)} · Orden ${escape(orderId)}</div>
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
    { icon: Ruler, label: 'Tamaño', value: woundCase.size },
    { icon: FileText, label: 'Profundidad', value: woundCase.depth },
    { icon: Droplets, label: 'Exudado', value: woundCase.exudate },
    { icon: ShieldAlert, label: 'Infección', value: woundCase.infection },
    { icon: Thermometer, label: 'Dolor', value: woundCase.pain },
    { icon: Pill, label: 'Tratamiento', value: woundCase.treatment },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate(`/patients/${patient.id}`)} className="font-body text-sm -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a {patient.lastName}, {patient.firstName}
        </Button>

        {/* Case Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="heading-display text-2xl">{woundCase.woundType}</h1>
              <Badge className={`font-body text-xs ${statusBadgeClass[woundCase.status]}`}>
                {woundCase.status === 'resuelto' ? 'CERRADA ✅' : getStatusLabel(woundCase.status)}
              </Badge>
            </div>
            <p className="font-body text-sm text-muted-foreground">{woundCase.anatomicalLocation} · {patient.firstName} {patient.lastName}</p>
          </div>
        </div>

        {/* Case Info Grid */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="heading-display text-lg">Información del Caso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseDetails.map(d => (
                <div key={d.label} className="flex items-start gap-2">
                  <d.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-body text-xs text-muted-foreground">{d.label}</p>
                    <p className="font-body text-sm">{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Photo Gallery with upload */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="heading-display text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Galería de Fotos
            </CardTitle>
            <div className="flex gap-2">
              <input
                ref={caseCameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { handleFileUpload(e.target.files, 'case'); e.target.value = ''; }}
              />
              <input
                ref={casePhotoInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => { handleFileUpload(e.target.files, 'case'); e.target.value = ''; }}
              />
              <Button variant="outline" size="sm" className="font-body" onClick={() => caseCameraInput.current?.click()}>
                <Camera className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Cámara</span>
              </Button>
              <Button variant="outline" size="sm" className="font-body" onClick={() => casePhotoInput.current?.click()}>
                <Upload className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Subir</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {woundCase.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {woundCase.photos.map(photo => (
                  <div
                    key={photo.id}
                    className="relative group rounded-lg overflow-hidden border border-border/50 cursor-pointer aspect-[4/3]"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setPhotoViewer(photo.url)}
                    />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-end pointer-events-none">
                      <div className="p-2 w-full bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="font-body text-xs text-primary-foreground">{photo.caption}</p>
                        <p className="font-body text-xs text-primary-foreground/70">{photo.date}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCasePhoto(photo.id); }}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-body text-sm text-muted-foreground">No hay fotos aún</p>
                <div className="flex justify-center gap-2 mt-3">
                  <Button variant="outline" size="sm" className="font-body" onClick={() => caseCameraInput.current?.click()}>
                    <Camera className="mr-2 h-4 w-4" /> Cámara
                  </Button>
                  <Button variant="outline" size="sm" className="font-body" onClick={() => casePhotoInput.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Subir foto
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="flex items-center justify-between">
          <h2 className="heading-display text-xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Timeline de Evoluciones
          </h2>
          <Button onClick={openNewEvo} className="font-body" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nueva Evolución
          </Button>
        </div>

        {(() => {
          const sorted = [...woundCase.evolutions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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
            const hasAiSummary = !!ev.aiSummary && ev.aiSummary.trim().length > 0;

            return (
              <div key={ev.id} className="relative pl-12 animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-background ${isHistory ? 'bg-muted-foreground' : 'bg-primary'}`} />
                <Card className={`border-border/50 ${isHistory ? 'bg-muted/20' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-sm font-semibold">{ev.date}</span>
                          {ev.time && <span className="font-body text-xs text-muted-foreground">{ev.time} hs</span>}
                          <Badge variant="outline" className="font-body text-xs">{ev.professional}</Badge>
                          {evoStatus && (
                            <Badge variant="secondary" className="font-body text-xs">{evoStatus}</Badge>
                          )}
                          {isHistory && ev.closedAt && (
                            <Badge className="font-body text-xs bg-success/15 text-success border-success/40 border">
                              Cerrada · {ev.closedAt}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEvo(ev)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="heading-display">¿Eliminar evolución?</AlertDialogTitle>
                              <AlertDialogDescription className="font-body">Esta acción no se puede deshacer.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="font-body">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteEvolution(patient.id, woundCase.id, ev.id)} className="font-body bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Quick metrics row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
                      {area != null && (
                        <span className="inline-flex items-center gap-1 font-body text-xs">
                          <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="tabular-nums font-medium">{area.toFixed(2)} cm²</span>
                          {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-success" aria-label="Área disminuye" />}
                          {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-destructive" aria-label="Área aumenta" />}
                          {trend === 'same' && <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-label="Área estable" />}
                        </span>
                      )}
                      {tissueLabels.length > 0 && (
                        <span className="inline-flex items-center gap-1 font-body text-xs text-muted-foreground">
                          <Stethoscope className="h-3.5 w-3.5" /> {tissueLabels.slice(0, 3).join(', ')}{tissueLabels.length > 3 ? '…' : ''}
                        </span>
                      )}
                      {exudateLabel && (
                        <span className="inline-flex items-center gap-1 font-body text-xs text-muted-foreground">
                          <Droplets className="h-3.5 w-3.5" /> {exudateLabel}{exudateType ? ` · ${exudateType}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {ev.description && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-0.5">Descripción clínica</p>
                          <p className="font-body text-sm">{ev.description}</p>
                        </div>
                      )}
                      {ev.procedure && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-0.5">Procedimiento</p>
                          <p className="font-body text-sm">{ev.procedure}</p>
                        </div>
                      )}
                      {ev.materials && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Package className="h-3 w-3" /> Material de curación</p>
                          <p className="font-body text-sm">{ev.materials}</p>
                        </div>
                      )}
                      {ev.healingFrequency && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Frecuencia de curación</p>
                          <p className="font-body text-sm">{ev.healingFrequency}</p>
                        </div>
                      )}
                      {ev.observations && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-0.5">Observaciones</p>
                          <p className="font-body text-sm">{ev.observations}</p>
                        </div>
                      )}
                      {/* AI summary moved to case header — no per-evolution button */}
                      {ev.nextControl && (
                        <div className="flex items-center gap-1 text-xs font-body text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Próximo control: {ev.nextControl}
                        </div>
                      )}

                      {ev.photos.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {ev.photos.map(ph => (
                            <div
                              key={ph.id}
                              className="w-20 h-16 rounded-md overflow-hidden border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                              onClick={() => setPhotoViewer(ph.url)}
                            >
                              <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
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
                    <Button variant="outline" className="font-body mt-3" onClick={openNewEvo}>
                      <Plus className="mr-2 h-4 w-4" /> Registrar primera evolución
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
                  Activas <Badge variant="secondary" className="ml-2 font-body text-xs">{activeEvos.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="font-body">
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                  Historial <Badge variant="secondary" className="ml-2 font-body text-xs">{closedEvos.length}</Badge>
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
              <DialogTitle className="heading-display text-lg sm:text-xl">
                {editingEvo ? 'Editar Evolución' : 'Nueva Evolución'}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
              {/* Fecha de curación + hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha de curación</Label>
                  <Input type="date" value={evoForm.healingDate} onChange={e => { setEField('healingDate', e.target.value); setEField('date', e.target.value); }} className="font-body h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hora</Label>
                  <Input type="time" value={evoForm.time} onChange={e => setEField('time', e.target.value)} className="font-body h-11" />
                </div>
              </div>

              {/* Profesional */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profesional</Label>
                <Select value={evoForm.professional} onValueChange={v => setEField('professional', v)}>
                  <SelectTrigger className="font-body h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {professionals.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Frecuencia de curación */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frecuencia de curación <span className="text-destructive">*</span></Label>
                <Select value={evoForm.healingFrequency} onValueChange={v => setEField('healingFrequency', v)}>
                  <SelectTrigger className="font-body h-11"><SelectValue placeholder="Seleccionar frecuencia" /></SelectTrigger>
                  <SelectContent>
                    {healingFrequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(evoForm.healingFrequency === '' || evoForm.healingFrequency === 'A demanda') && (
                  <div className="space-y-1 pt-1">
                    <Label className="font-body text-[11px] text-muted-foreground">
                      Días estimados entre curaciones <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number" inputMode="numeric" min="1" step="1"
                      value={evoForm.healingFrequencyDays}
                      onChange={e => setEField('healingFrequencyDays', e.target.value === '' ? '' : Number(e.target.value))}
                      className="font-body h-10 w-32 tabular-nums"
                      placeholder="Ej: 5"
                    />
                    <p className="font-body text-[11px] text-muted-foreground">
                      Se usa para sugerir los próximos turnos en el calendario.
                    </p>
                  </div>
                )}
              </div>

              {/* Tamaño de la herida */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-baseline justify-between">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tamaño de la herida (cm)</Label>
                  {woundArea && (
                    <span className="font-body text-xs font-semibold text-primary tabular-nums">
                      Área: {woundArea} cm²
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="font-body text-[11px] text-muted-foreground">Largo</Label>
                    <Input
                      type="number" inputMode="decimal" step="0.1" min="0"
                      value={evoForm.woundLength}
                      onChange={e => setEField('woundLength', e.target.value === '' ? '' : Number(e.target.value))}
                      className="font-body h-11 text-center tabular-nums" placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-[11px] text-muted-foreground">Ancho</Label>
                    <Input
                      type="number" inputMode="decimal" step="0.1" min="0"
                      value={evoForm.woundWidth}
                      onChange={e => setEField('woundWidth', e.target.value === '' ? '' : Number(e.target.value))}
                      className="font-body h-11 text-center tabular-nums" placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-[11px] text-muted-foreground">Profundidad</Label>
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
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de tejido presente</Label>
                <div className="flex flex-wrap gap-2">
                  {tissueTypeOptions.map(t => {
                    const active = evoForm.tissueTypes.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleTissue(t.value)}
                        className={cn(
                          "min-h-11 px-4 rounded-full border font-body text-sm font-medium transition-all active:scale-95",
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
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de borde</Label>
                <div className="flex flex-wrap gap-2">
                  {edgeTypeOptions.map(t => {
                    const active = evoForm.edgeTypes.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleEdge(t.value)}
                        className={cn(
                          "min-h-11 px-4 rounded-full border font-body text-sm font-medium transition-all active:scale-95",
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
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dolor (EVA)</Label>
                  <span className={cn(
                    "font-body text-sm font-bold tabular-nums px-2 py-0.5 rounded-md",
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
                <div className="flex justify-between font-body text-[10px] text-muted-foreground px-0.5">
                  <span>Sin dolor</span><span>Moderado</span><span>Insoportable</span>
                </div>
              </div>

              {/* Olor — chips */}
              <div className="space-y-2">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Olor</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {odorOptions.map(o => {
                    const active = evoForm.odor === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setEField('odor', o.value)}
                        className={cn(
                          "h-11 rounded-lg border font-body text-sm font-medium transition-all active:scale-95",
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
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5" /> Exudado
                </Label>

                <div className="space-y-1.5">
                  <p className="font-body text-[11px] text-muted-foreground">Cantidad</p>
                  <div className="flex flex-wrap gap-2">
                    {exudateAmountOptions.map(o => {
                      const active = evoForm.exudateAmount === o.value;
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setEField('exudateAmount', active ? undefined : o.value)}
                          className={cn(
                            "min-h-11 px-4 rounded-full border font-body text-sm font-medium transition-all active:scale-95",
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
                  <p className="font-body text-[11px] text-muted-foreground">Tipo</p>
                  <div className="flex flex-wrap gap-2">
                    {exudateTypeOptions.map(o => {
                      const active = evoForm.exudateType === o.value;
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setEField('exudateType', active ? undefined : o.value)}
                          className={cn(
                            "min-h-11 px-4 rounded-full border font-body text-sm font-medium transition-all active:scale-95",
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
                  <p className="font-body text-[11px] text-muted-foreground">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {exudateColorOptions.map(o => {
                      const active = evoForm.exudateColor === o.value;
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setEField('exudateColor', active ? undefined : o.value)}
                          className={cn(
                            "min-h-11 px-3 rounded-full border font-body text-sm font-medium transition-all active:scale-95 inline-flex items-center gap-2",
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
                  <Label htmlFor="has-infection" className="font-body text-sm font-semibold flex items-center gap-1.5">
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
                              "min-h-11 px-3 rounded-lg border font-body text-sm text-left flex items-center justify-between gap-2 transition-all active:scale-[0.98]",
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
                      <Label className="font-body text-[11px] text-muted-foreground flex items-center gap-1">
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
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado de evolución</Label>
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
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descripción clínica</Label>
                <Textarea value={evoForm.description} onChange={e => setEField('description', e.target.value)} className="font-body" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Procedimiento realizado</Label>
                <Textarea
                  value={evoForm.procedure}
                  onChange={e => setEField('procedure', e.target.value)}
                  className="font-body" rows={3}
                  placeholder="Ej: Desbridamiento cortante, Lavado con SF, Aplicación de colagenasa..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
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
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observaciones</Label>
                <Textarea value={evoForm.observations} onChange={e => setEField('observations', e.target.value)} className="font-body" rows={2} />
              </div>

              {/* Orden médica */}
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="req-order" className="font-body text-sm font-semibold flex items-center gap-1.5">
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
                    <Label className="font-body text-[11px] text-muted-foreground">Detalle de la orden médica</Label>
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
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fotos</Label>
                <div className="flex gap-2">
                  <input ref={evoCameraInput} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { handleFileUpload(e.target.files, 'evolution'); e.target.value = ''; }} />
                  <input ref={evoPhotoInput} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => { handleFileUpload(e.target.files, 'evolution'); e.target.value = ''; }} />
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
                onClick={() => persistEvo(true)}
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
            <img src={photoViewer || ''} alt="Foto clínica" className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>

        {/* AI Summary viewer */}
        <Dialog open={!!summaryViewerEvo} onOpenChange={(o) => !o && setSummaryViewerEvo(null)}>
          <DialogContent className="max-w-2xl w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[85vh] p-0 gap-0 flex flex-col rounded-none sm:rounded-lg">
            <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b border-border/50 shrink-0">
              <DialogTitle className="heading-display flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Resumen con IA
              </DialogTitle>
              {summaryViewerEvo && (
                <p className="font-body text-sm text-muted-foreground mt-1">
                  Evolución del {summaryViewerEvo.date}
                  {summaryViewerEvo.time ? ` · ${summaryViewerEvo.time} hs` : ''}
                  {summaryViewerEvo.professional ? ` · ${summaryViewerEvo.professional}` : ''}
                </p>
              )}
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {summaryViewerEvo?.aiSummary ? (
                <div className="font-body text-sm leading-relaxed text-foreground/90 prose prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5 prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                  <ReactMarkdown>{summaryViewerEvo.aiSummary}</ReactMarkdown>
                </div>
              ) : (
                <p className="font-body text-sm text-muted-foreground">No hay resumen disponible.</p>
              )}
            </div>

            <div className="shrink-0 border-t border-border/50 bg-background px-4 sm:px-6 py-3 flex flex-wrap gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                variant="outline"
                className="font-body h-11 flex-1 sm:flex-none"
                onClick={async () => {
                  if (!summaryViewerEvo?.aiSummary) return;
                  try {
                    await navigator.clipboard.writeText(summaryViewerEvo.aiSummary);
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
                className="font-body h-11 flex-1 sm:flex-none"
                onClick={() => openSummaryPrintWindow(summaryViewerEvo)}
              >
                <Printer className="mr-1.5 h-4 w-4" /> Imprimir
              </Button>
              <Button
                className="font-body h-11 flex-1 sm:flex-none"
                onClick={() => {
                  if (openSummaryPrintWindow(summaryViewerEvo)) {
                    toast.info('Elegí "Guardar como PDF" en el diálogo de impresión.');
                  }
                }}
              >
                <Download className="mr-1.5 h-4 w-4" /> Descargar PDF
              </Button>
              <Button
                variant="ghost"
                className="font-body h-11"
                onClick={() => setSummaryViewerEvo(null)}
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}