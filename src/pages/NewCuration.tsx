import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatNextControl, normalizeAppointmentTime } from '@/lib/appointments';
import { EvolutionConsentSection, validateEvolutionConsent, type ProfessionalSignatureData } from '@/components/EvolutionConsentSection';
import { saveEvolutionSignature } from '@/lib/evolutionSignature';
import {
  ChevronLeft, ChevronRight, Search, User, Activity, Camera, Package,
  CheckCircle2, Save, ArrowLeft, AlertCircle, Pill, Plus, X, FileText, UserPlus, FileSignature,
} from 'lucide-react';
import type { Evolution, Patient, WoundCase } from '@/data/demoData';

type SupplyLine = {
  id: string;
  productId?: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  used: boolean;
  isSponsor?: boolean;
  unitPrice?: number | null;
  presentation?: string | null;
  sku?: string | null;
};

type LabProduct = {
  id: string; name: string; category?: string | null; presentation?: string | null;
  sku?: string | null; price?: number | null; currency?: string | null; lab_id: string;
  wound_types?: string[] | null;
};

const SUPPLY_CATEGORIES = [
  'Apósitos', 'Gasas', 'Solución de limpieza', 'Guantes', 'Fijación',
  'Vendas', 'Cremas/Barreras', 'Instrumental', 'Otros',
];

const STEPS = [
  { n: 1, label: 'Paciente', icon: User },
  { n: 2, label: 'Evaluación', icon: Activity },
  { n: 3, label: 'Fotos', icon: Camera },
  { n: 4, label: 'Insumos', icon: Package },
  { n: 5, label: 'Resumen', icon: CheckCircle2 },
  { n: 6, label: 'Firma', icon: FileSignature },
];

function newId() { return Math.random().toString(36).slice(2, 10); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function nowHM() { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function setTimeHour(time: string, value: string) {
  if (value === '') return '';
  const minutes = time ? (time.split(':')[1] ?? '00') : '00';
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return '';
  const hour = Math.min(23, Math.max(0, parsed));
  return `${String(hour).padStart(2, '0')}:${minutes}`;
}
function setTimeMinutes(time: string, minutes: string) {
  if (!minutes) return '';
  const hour = time ? (time.split(':')[0] ?? '00') : '00';
  return `${hour}:${minutes}`;
}
function ageFromBirthDate(birthDate: string) {
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

export default function NewCuration() {
  const { patients, currentUser, currentUserName, addPatient, addCase, appendEvolutionToState, createTurno } = useApp();
  const { sponsor } = useSponsor();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const initialPatientId = params.get('patientId');
  const initialCaseId = params.get('caseId');
  const requestedStep = Number(params.get('step'));
  const initialStep =
    initialPatientId && initialCaseId && Number.isInteger(requestedStep) && requestedStep >= 2 && requestedStep <= STEPS.length
      ? requestedStep
      : 1;

  const [step, setStep] = useState(initialStep);
  const [stepAttempted, setStepAttempted] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState<string | null>(initialPatientId);
  const [caseId, setCaseId] = useState<string | null>(initialCaseId);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    birthDate: '',
    phone: '',
  });
  const [newPatientErrors, setNewPatientErrors] = useState<Record<string, string>>({});

  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [creatingCase, setCreatingCase] = useState(false);
  const [newCase, setNewCase] = useState({
    woundType: '',
    woundTypeOther: '',
    anatomicalLocation: '',
    laterality: 'na',
    startDate: todayISO(),
    status: 'activo' as WoundCase['status'],
    notes: '',
  });
  const [newCaseErrors, setNewCaseErrors] = useState<Record<string, string>>({});

  // Step 2 — clinical
  const [evo, setEvo] = useState({
    date: todayISO(),
    time: nowHM(),
    professional: currentUserName || '',
    status: 'activo',
    pain: 3,
    exudateAmount: 'Moderado',
    exudateType: 'Seroso',
    exudateColor: 'Transparente',
    odor: 'no',
    infection: 'no',
    woundLength: '',
    woundWidth: '',
    woundDepth: '',
    tissue: 'granulación',
    edges: 'definidos',
    perilesional: 'sana',
    observations: '',
    procedure: '',
    nextControl: '',
    nextControlTime: '',
  });

  // Step 4 — supplies
  const [supplies, setSupplies] = useState<SupplyLine[]>([]);
  const [sponsorProducts, setSponsorProducts] = useState<LabProduct[]>([]);
  const [productQuery, setProductQuery] = useState('');

  // Step 6 — signature & consent
  const emptyProfSignature: ProfessionalSignatureData = { confirmed: false, signatureDataUrl: null };
  const [profSignature, setProfSignature] = useState<ProfessionalSignatureData>(emptyProfSignature);
  const [consentErrors, setConsentErrors] = useState<string[]>([]);
  const [hasGeneralConsent, setHasGeneralConsent] = useState(false);

  // Step 7 (final action)
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (currentUserName) setEvo(e => ({ ...e, professional: currentUserName })); }, [currentUserName]);

  // Load sponsor products
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = supabase.from('lab_products').select('id,name,category_id,presentation,sku,price,currency,lab_id,wound_types').eq('is_active', true).limit(200);
      if (sponsor?.lab_id) q.eq('lab_id', sponsor.lab_id);
      const [{ data }, { data: cats }] = await Promise.all([q, supabase.from('product_categories').select('id,name')]);
      if (cancelled) return;
      const catMap = new Map<string, string>((cats ?? []).map((c: any) => [c.id, c.name]));
      const mapped: LabProduct[] = (data ?? []).map((p: any) => ({
        id: p.id, name: p.name,
        category: p.category_id ? catMap.get(p.category_id) ?? null : null,
        presentation: p.presentation, sku: p.sku, price: p.price,
        currency: p.currency, lab_id: p.lab_id, wound_types: p.wound_types,
      }));
      setSponsorProducts(mapped);
    })();
    return () => { cancelled = true; };
  }, [sponsor?.lab_id]);

  useEffect(() => { setStepAttempted(false); }, [step]);

  const patient: Patient | undefined = useMemo(
    () => patients.find(p => p.id === patientId), [patients, patientId]);
  const wcase: WoundCase | undefined = useMemo(
    () => patient?.cases.find(c => c.id === caseId), [patient, caseId]);

  useEffect(() => {
    if (!patient) return;
    supabase.from('patient_consents').select('id').eq('patient_id', patient.id).eq('status', 'accepted').limit(1)
      .then(({ data }) => setHasGeneralConsent((data ?? []).length > 0));
  }, [patient?.id]);

  // Surface area (Largo × Ancho) for the evaluation step, recomputed in real time.
  const evoWoundArea = useMemo(() => {
    const l = parseFloat(evo.woundLength);
    const w = parseFloat(evo.woundWidth);
    return l > 0 && w > 0 ? (l * w).toFixed(1) : '';
  }, [evo.woundLength, evo.woundWidth]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.dni ?? '').toLowerCase().includes(q),
    );
  }, [patients, search]);

  const visibleCases = useMemo(() => {
    if (!patient) return [];
    const active = patient.cases.filter(c => c.status !== 'resuelto');
    return active.length > 0 ? active : patient.cases;
  }, [patient]);


  // --- Helpers ---
  const addSupplyFromProduct = (p: LabProduct) => {
    setSupplies(prev => ([...prev, {
      id: newId(),
      productId: p.id,
      productName: p.name,
      category: p.category ?? 'Otros',
      quantity: 1, unit: 'u',
      used: true,
      isSponsor: true,
      unitPrice: p.price ?? null,
      presentation: p.presentation ?? null,
      sku: p.sku ?? null,
    }]));
    toast({ title: 'Insumo agregado', description: p.name });
  };
  const addSupplyGeneric = (category: string) => {
    setSupplies(prev => ([...prev, {
      id: newId(), productName: category, category, quantity: 1, unit: 'u', used: true,
    }]));
  };
  const updateSupply = (id: string, patch: Partial<SupplyLine>) => {
    setSupplies(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };
  const removeSupply = (id: string) => setSupplies(prev => prev.filter(s => s.id !== id));

  const resetNewCaseForm = () => {
    setNewCase({
      woundType: '',
      woundTypeOther: '',
      anatomicalLocation: '',
      laterality: 'na',
      startDate: todayISO(),
      status: 'activo',
      notes: '',
    });
    setNewCaseErrors({});
  };

  const handleCreatePatientInline = async () => {
    const errors: Record<string, string> = {};
    if (!newPatient.firstName.trim()) errors.firstName = 'Ingresá nombre.';
    if (!newPatient.lastName.trim()) errors.lastName = 'Ingresá apellido.';
    if (!newPatient.dni.trim()) errors.dni = 'Ingresá DNI.';
    if (!newPatient.birthDate) errors.birthDate = 'Ingresá fecha de nacimiento.';
    if (!newPatient.phone.trim()) errors.phone = 'Ingresá teléfono de contacto.';
    setNewPatientErrors(errors);
    if (Object.keys(errors).length > 0 || !currentUser) return;

    setCreatingPatient(true);
    try {
      await addPatient({
        id: '',
        firstName: newPatient.firstName.trim(),
        lastName: newPatient.lastName.trim(),
        age: ageFromBirthDate(newPatient.birthDate),
        birthDate: newPatient.birthDate,
        gender: '',
        dni: newPatient.dni.trim(),
        phone: newPatient.phone.trim(),
        email: '',
        address: '',
        diagnosis: '',
        assignedProfessional: currentUserName || '',
        observations: `Alta rápida desde Nueva curación. Fecha de nacimiento: ${newPatient.birthDate}.`,
        admissionDate: todayISO(),
        cases: [],
      });

      const { data: createdPatient, error } = await supabase
        .from('patients')
        .select('id')
        .eq('dni', newPatient.dni.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !createdPatient?.id) {
        throw error || new Error('No se pudo recuperar el paciente creado.');
      }

      setPatientId(createdPatient.id);
      setCaseId(null);
      setShowNewPatientForm(false);
      setNewPatient({ firstName: '', lastName: '', dni: '', birthDate: '', phone: '' });
      toast({ title: 'Paciente creado', description: 'Ahora registrá su primera herida para continuar.' });
    } catch (e: any) {
      toast({
        title: 'No se pudo crear el paciente',
        description: e?.message ?? 'Reintentá en unos segundos.',
        variant: 'destructive',
      });
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleCreateCaseInline = async () => {
    if (!patient || !currentUser) return;
    const errors: Record<string, string> = {};
    if (!newCase.woundType) errors.woundType = 'Seleccioná tipo de herida.';
    if (newCase.woundType === 'Otro' && !newCase.woundTypeOther.trim()) errors.woundTypeOther = 'Especificá el tipo de herida.';
    if (!newCase.anatomicalLocation.trim()) errors.anatomicalLocation = 'Indicá ubicación anatómica.';
    if (!newCase.startDate) errors.startDate = 'Ingresá fecha de aparición.';
    else if (newCase.startDate > todayISO()) errors.startDate = 'La fecha de aparición no puede ser futura.';
    if (!newCase.status) errors.status = 'Seleccioná estado inicial.';
    setNewCaseErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreatingCase(true);
    try {
      const lateralityLabel =
        newCase.laterality === 'izquierdo' ? 'Lado izquierdo'
          : newCase.laterality === 'derecho' ? 'Lado derecho'
            : newCase.laterality === 'bilateral' ? 'Bilateral'
              : null;
      const anatomicalLocation = lateralityLabel
        ? `${newCase.anatomicalLocation.trim()} (${lateralityLabel})`
        : newCase.anatomicalLocation.trim();
      const woundType = newCase.woundType === 'Otro' ? newCase.woundTypeOther.trim() : newCase.woundType;

      const { data: inserted, error } = await supabase
        .from('wound_cases')
        .insert({
          user_id: currentUser.id,
          patient_id: patient.id,
          wound_type: woundType,
          anatomical_location: anatomicalLocation,
          start_date: newCase.startDate,
          status: newCase.status,
          treatment: newCase.notes.trim() || null,
        })
        .select('id')
        .single();
      if (error) throw error;

      const createdCase: WoundCase = {
        id: inserted.id,
        patientId: patient.id,
        woundType,
        anatomicalLocation,
        startDate: newCase.startDate,
        status: newCase.status,
        treatment: newCase.notes.trim() || '',
        evolutions: [],
        photos: [],
      };
      addCase(patient.id, createdCase);
      setCaseId(inserted.id);
      setShowNewCaseForm(false);
      resetNewCaseForm();
      toast({ title: 'Herida registrada', description: 'Ya podés avanzar a Evaluación.' });
    } catch (e: any) {
      toast({
        title: 'No se pudo crear la herida',
        description: e?.message ?? 'Reintentá en unos segundos.',
        variant: 'destructive',
      });
    } finally {
      setCreatingCase(false);
    }
  };

  // --- Save ---
  const saveEvolution = async () => {
    if (!patient || !wcase || !currentUser) {
      toast({ title: 'Faltan datos', description: 'Seleccioná paciente y caso.', variant: 'destructive' });
      return null;
    }
    const cErrors = validateEvolutionConsent(profSignature);
    if (cErrors.length > 0) {
      setConsentErrors(cErrors);
      toast({ title: 'Firma y consentimiento requeridos', description: cErrors[0], variant: 'destructive' });
      return null;
    }
    setConsentErrors([]);
    setSaving(true);
    try {
      const materialsList = supplies.filter(s => s.used)
        .map(s => `${s.productName} x${s.quantity}${s.unit}`).join(', ') || null;
      const sizeText = (evo.woundLength && evo.woundWidth)
        ? `Tamaño: ${evo.woundLength} x ${evo.woundWidth} cm${evoWoundArea ? ` (Área: ${evoWoundArea} cm²)` : ''}`
        : '';
      const hasExudate = evo.exudateAmount !== 'Sin exudado';
      const description = [
        `Dolor EVA ${evo.pain}/10`,
        hasExudate
          ? `Exudado: ${evo.exudateAmount} / ${evo.exudateType} / ${evo.exudateColor}`
          : `Exudado: ${evo.exudateAmount}`,
        `Olor: ${evo.odor}`,
        `Infección: ${evo.infection}`,
        sizeText,
        evo.woundDepth && `Profundidad: ${evo.woundDepth} cm`,
        `Tejido: ${evo.tissue}`,
        `Bordes: ${evo.edges}`,
        `Perilesional: ${evo.perilesional}`,
      ].filter(Boolean).join('\n');

      const nextControlTime = evo.nextControl ? normalizeAppointmentTime(evo.nextControlTime) : '';
      const baseEvolutionPayload = {
        user_id: currentUser.id,
        case_id: wcase.id,
        evolution_date: evo.date,
        evolution_time: evo.time || null,
        professional: evo.professional || null,
        description,
        procedure: evo.procedure || null,
        materials: materialsList,
        observations: evo.observations || null,
        // Rich clinical fields
        pain_level: typeof evo.pain === 'number' ? evo.pain : null,
        odor: evo.odor || null,
        exudate_amount: evo.exudateAmount || null,
        exudate_type: hasExudate ? (evo.exudateType || null) : null,
        exudate_color: hasExudate ? (evo.exudateColor || null) : null,
        wound_length: evo.woundLength !== '' ? Number(evo.woundLength) : null,
        wound_width: evo.woundWidth !== '' ? Number(evo.woundWidth) : null,
        wound_depth: evo.woundDepth !== '' ? Number(evo.woundDepth) : null,
        has_infection_signs: evo.infection === 'si',
        tissue_types: evo.tissue ? [evo.tissue] : null,
        edge_types: evo.edges ? [evo.edges] : null,
      };
      const { data: evoRow, error: evoErr } = await supabase
        .from('evolutions')
        .insert(baseEvolutionPayload as any)
        .select('id')
        .single();
      if (evoErr) throw evoErr;

      // Persist the professional signature tied to this evolution.
      const sigResult = await saveEvolutionSignature({
        evolutionId: evoRow.id,
        patientId: patient.id,
        caseId: wcase.id,
        userId: currentUser.id,
        professionalData: profSignature,
      });
      if (sigResult.uploadError === 'professional') {
        toast({
          title: 'Curación guardada, pero la firma profesional no se pudo guardar',
          description: 'Reintentá desde el detalle de la herida.',
          variant: 'destructive',
        });
      }
      if (!sigResult.ok) {
        toast({
          title: 'Curación guardada, pero la firma del profesional no se pudo guardar',
          description: 'Reintentá desde el detalle de la herida.',
          variant: 'destructive',
        });
      }

      // Persist the clinical photo (if any): upload to Storage and store a row in
      // `photos` linked to this evolution. We reuse the owner-scoped private
      // `signatures` bucket (the only bucket writable by authenticated users);
      // the herida detail page generates signed URLs from the stored path.
      let savedPhotoPath: string | null = null;
      if (photoFile) {
        try {
          const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `${currentUser.id}/wound-photos/${wcase.id}/${evoRow.id}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('signatures')
            .upload(path, photoFile, { contentType: photoFile.type || 'image/jpeg', upsert: true });
          if (upErr) throw upErr;
          const { error: photoErr } = await supabase.from('photos').insert({
            user_id: currentUser.id,
            case_id: wcase.id,
            evolution_id: evoRow.id,
            url: path,
            photo_date: evo.date,
          });
          if (photoErr) throw photoErr;
          savedPhotoPath = path;
        } catch (photoError: any) {
          toast({
            title: 'Evolución guardada, pero la foto no se pudo subir',
            description: photoError?.message ?? 'Reintentá cargar la foto desde el detalle de la herida.',
            variant: 'destructive',
          });
        }
      }

      const savedEvolution: Evolution = {
        id: evoRow.id,
        date: evo.date,
        time: evo.time || '',
        professional: evo.professional || '',
        description,
        procedure: evo.procedure || '',
        materials: materialsList || '',
        observations: evo.observations || '',
        nextControl: evo.nextControl || '',
        nextControlTime,
        photos: savedPhotoPath ? [{ id: `local-${evoRow.id}`, url: savedPhotoPath, photo_date: evo.date }] : [],
        painLevel: typeof evo.pain === 'number' ? evo.pain : undefined,
        odor: evo.odor || undefined,
        exudateAmount: (evo.exudateAmount as any) || undefined,
        exudateType: (evo.exudateType as any) || undefined,
        exudateColor: (evo.exudateColor as any) || undefined,
        woundLength: evo.woundLength !== '' ? Number(evo.woundLength) : undefined,
        woundWidth: evo.woundWidth !== '' ? Number(evo.woundWidth) : undefined,
        woundDepth: evo.woundDepth !== '' ? Number(evo.woundDepth) : undefined,
        hasInfectionSigns: evo.infection === 'si',
        tissueTypes: evo.tissue ? [evo.tissue as any] : [],
        edgeTypes: evo.edges ? [evo.edges as any] : [],
      };

      appendEvolutionToState(patient.id, wcase.id, savedEvolution);

      // `turnos` is the single source of truth for scheduling: closing an evolution
      // with a próximo control must also create a linked turno so Agenda/Dashboard
      // (which read exclusively from `turnos`) stay consistent.
      if (evo.nextControl) {
        const turnoId = await createTurno({
          caseId: wcase.id,
          patientId: patient.id,
          date: evo.nextControl,
          time: nextControlTime || undefined,
        });
        if (!turnoId) {
          toast({
            title: 'Evolución guardada, pero no se pudo generar el turno',
            description: 'Registrá el turno manualmente desde la Agenda.',
            variant: 'destructive',
          });
        }
      }

      const controlLabel = formatNextControl(evo.nextControl, nextControlTime);

      toast({
        title: 'Curación guardada',
        description: `Evolución registrada correctamente.${controlLabel ? ` Turno generado para ${controlLabel}.` : ''}`,
      });
      return { ok: true };
    } catch (e: any) {
      toast({ title: 'No se pudo guardar', description: e.message ?? String(e), variant: 'destructive' });
      return null;
    } finally { setSaving(false); }
  };

  const isStepValid = (n: number) => {
    if (n === 1) return !!wcase;
    if (n === 2) return !!evo.date && !!evo.time;
    return true;
  };

  const isStepReachable = (n: number) => {
    for (let i = 1; i < n; i++) {
      if (!isStepValid(i)) return false;
    }
    return true;
  };

  const canNext = () => isStepValid(step);

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
          <div>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="font-body text-sm border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="heading-display text-2xl md:text-3xl">Nueva curación</h1>
            </div>
          </div>

          {/* Stepper */}
          <Card className="border-border/60">
            <CardContent className="p-3 relative">
              <div className="flex items-center gap-1 overflow-x-auto" data-intentional-scroll>
                {STEPS.map((s, i) => {
                  const active = step === s.n;
                  const done = step > s.n;
                  const reachable = isStepReachable(s.n);
                  return (
                    <div key={s.n} className="flex items-center gap-1 min-w-fit">
                      <button
                        type="button"
                        disabled={!reachable}
                        onClick={() => setStep(s.n)}
                        className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-md font-body text-sm transition-colors ${
                          active ? 'bg-primary text-primary-foreground' :
                          done && reachable ? 'text-primary hover:bg-primary/10' :
                          reachable ? 'text-muted-foreground hover:bg-muted' :
                          'text-muted-foreground/40 cursor-not-allowed'
                        }`}
                      >
                        <s.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{s.n}. {s.label}</span>
                        <span className="sm:hidden">{s.n}</span>
                      </button>
                      {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
                    </div>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden" />
            </CardContent>
          </Card>

          {/* Step 1 */}
          {step === 1 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Seleccionar paciente y caso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewPatientForm && (
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-3 transition-all duration-200">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-body text-sm font-medium">Alta rápida de paciente</p>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowNewPatientForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <Label className="font-body text-sm">Nombre *</Label>
                        <Input
                          value={newPatient.firstName}
                          onChange={(e) => setNewPatient((prev) => ({ ...prev, firstName: e.target.value }))}
                          aria-invalid={!!newPatientErrors.firstName}
                        />
                        {newPatientErrors.firstName && <p className="mt-1 text-xs text-destructive">{newPatientErrors.firstName}</p>}
                      </div>
                      <div>
                        <Label className="font-body text-sm">Apellido *</Label>
                        <Input
                          value={newPatient.lastName}
                          onChange={(e) => setNewPatient((prev) => ({ ...prev, lastName: e.target.value }))}
                          aria-invalid={!!newPatientErrors.lastName}
                        />
                        {newPatientErrors.lastName && <p className="mt-1 text-xs text-destructive">{newPatientErrors.lastName}</p>}
                      </div>
                      <div>
                        <Label className="font-body text-sm">DNI *</Label>
                        <Input
                          value={newPatient.dni}
                          onChange={(e) => setNewPatient((prev) => ({ ...prev, dni: e.target.value }))}
                          aria-invalid={!!newPatientErrors.dni}
                        />
                        {newPatientErrors.dni && <p className="mt-1 text-xs text-destructive">{newPatientErrors.dni}</p>}
                      </div>
                      <div>
                        <Label className="font-body text-sm">Fecha de nacimiento *</Label>
                        <Input
                          type="date"
                          value={newPatient.birthDate}
                          onChange={(e) => setNewPatient((prev) => ({ ...prev, birthDate: e.target.value }))}
                          aria-invalid={!!newPatientErrors.birthDate}
                        />
                        {newPatientErrors.birthDate && <p className="mt-1 text-xs text-destructive">{newPatientErrors.birthDate}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <Label className="font-body text-sm">Teléfono de contacto *</Label>
                        <Input
                          value={newPatient.phone}
                          onChange={(e) => setNewPatient((prev) => ({ ...prev, phone: e.target.value }))}
                          aria-invalid={!!newPatientErrors.phone}
                        />
                        {newPatientErrors.phone && <p className="mt-1 text-xs text-destructive">{newPatientErrors.phone}</p>}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button className="font-body" onClick={handleCreatePatientInline} disabled={creatingPatient}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        {creatingPatient ? 'Guardando...' : 'Crear paciente y continuar'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o DNI..." className="pl-9 font-body" />
                </div>
                <div
                  className={`grid md:grid-cols-2 gap-2 max-h-96 overflow-auto rounded-lg transition-colors ${stepAttempted && !patientId ? 'ring-2 ring-destructive ring-offset-2' : ''}`}
                  data-intentional-scroll
                >
                  {filteredPatients.map(p => {
                    const active = p.cases.find(c => c.status !== 'resuelto');
                    const selected = patientId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPatientId(p.id);
                          setCaseId(active?.id ?? p.cases[0]?.id ?? null);
                          setShowNewCaseForm(false);
                        }}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 hover:border-primary/40 bg-background'
                        }`}
                      >
                        <div className="font-body font-medium text-sm">{p.firstName} {p.lastName}</div>
                        <div className="font-body text-sm text-muted-foreground mt-0.5">
                          {p.cases.length} herida(s)
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!patient && (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-center">
                    <p className="font-body text-sm text-muted-foreground">
                      Primero seleccioná un paciente para ver o agregar sus heridas.
                    </p>
                  </div>
                )}
                {patient && (
                  <div className={`space-y-2 pt-2 rounded-lg transition-colors ${stepAttempted && !caseId ? 'ring-2 ring-destructive ring-offset-2 p-2' : ''}`}>
                    <Label className="font-body text-sm">Caso de herida</Label>
                    {visibleCases.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 space-y-3">
                        <p className="font-body text-sm text-muted-foreground">Este paciente no tiene heridas registradas.</p>
                        <Button
                          className="font-body"
                          onClick={() => {
                            setShowNewCaseForm(true);
                            setNewCaseErrors({});
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Registrar nueva herida
                        </Button>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-2">
                        {visibleCases.map(c => (
                          <button
                            key={c.id}
                            onClick={() => setCaseId(c.id)}
                            className={`text-left p-3 rounded-lg border transition-all ${
                              caseId === c.id ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-body text-sm font-medium">{c.woundType}</div>
                              <Badge variant="outline" className="font-body text-[10px] uppercase">{c.status}</Badge>
                            </div>
                            <div className="font-body text-sm text-muted-foreground mt-0.5">{c.anatomicalLocation}</div>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setShowNewCaseForm(true);
                            setNewCaseErrors({});
                          }}
                          className="text-left p-3 rounded-lg border-2 border-dashed border-primary/40 hover:border-primary transition-all bg-primary/5 min-h-[112px]"
                        >
                          <div className="h-full flex items-center justify-center gap-2 text-primary font-body font-medium">
                            <Plus className="h-4 w-4" />
                            Registrar nueva herida
                          </div>
                        </button>
                      </div>
                    )}

                    {showNewCaseForm && (
                      <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-3 transition-all duration-200">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-sm font-medium">Nueva herida para {patient.firstName} {patient.lastName}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setShowNewCaseForm(false);
                              resetNewCaseForm();
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <Label className="font-body text-sm">Tipo de herida *</Label>
                            <Select value={newCase.woundType} onValueChange={(v) => setNewCase((prev) => ({ ...prev, woundType: v }))}>
                              <SelectTrigger aria-invalid={!!newCaseErrors.woundType}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              <SelectContent>
                                {['Úlcera por presión', 'Pie diabético', 'Úlcera venosa', 'Herida quirúrgica', 'Quemadura', 'Otro'].map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {newCaseErrors.woundType && <p className="mt-1 text-xs text-destructive">{newCaseErrors.woundType}</p>}
                            {newCase.woundType === 'Otro' && (
                              <Input
                                className="mt-2"
                                value={newCase.woundTypeOther}
                                onChange={(e) => setNewCase((prev) => ({ ...prev, woundTypeOther: e.target.value }))}
                                placeholder="Especificá el tipo de herida"
                                aria-invalid={!!newCaseErrors.woundTypeOther}
                              />
                            )}
                            {newCaseErrors.woundTypeOther && <p className="mt-1 text-xs text-destructive">{newCaseErrors.woundTypeOther}</p>}
                          </div>
                          <div>
                            <Label className="font-body text-sm">Ubicación anatómica *</Label>
                            <Input
                              value={newCase.anatomicalLocation}
                              onChange={(e) => setNewCase((prev) => ({ ...prev, anatomicalLocation: e.target.value }))}
                              placeholder="Ej: Pierna derecha, zona tibial"
                              aria-invalid={!!newCaseErrors.anatomicalLocation}
                            />
                            {newCaseErrors.anatomicalLocation && <p className="mt-1 text-xs text-destructive">{newCaseErrors.anatomicalLocation}</p>}
                          </div>
                          <div>
                            <Label className="font-body text-sm">Lateralidad</Label>
                            <Select value={newCase.laterality} onValueChange={(v) => setNewCase((prev) => ({ ...prev, laterality: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="izquierdo">Izquierdo</SelectItem>
                                <SelectItem value="derecho">Derecho</SelectItem>
                                <SelectItem value="bilateral">Bilateral</SelectItem>
                                <SelectItem value="na">N/A</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="font-body text-sm">Fecha de aparición *</Label>
                            <Input
                              type="date"
                              max={todayISO()}
                              value={newCase.startDate}
                              onChange={(e) => setNewCase((prev) => ({ ...prev, startDate: e.target.value }))}
                              aria-invalid={!!newCaseErrors.startDate}
                            />
                            {newCaseErrors.startDate && <p className="mt-1 text-xs text-destructive">{newCaseErrors.startDate}</p>}
                          </div>
                          <div>
                            <Label className="font-body text-sm">Estado inicial *</Label>
                            <Select value={newCase.status} onValueChange={(v) => setNewCase((prev) => ({ ...prev, status: v as WoundCase['status'] }))}>
                              <SelectTrigger aria-invalid={!!newCaseErrors.status}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="critico">Crítico</SelectItem>
                                <SelectItem value="activo">Activo</SelectItem>
                                <SelectItem value="en_mejoria">En mejoría</SelectItem>
                              </SelectContent>
                            </Select>
                            {newCaseErrors.status && <p className="mt-1 text-xs text-destructive">{newCaseErrors.status}</p>}
                          </div>
                          <div className="md:col-span-2">
                            <Label className="font-body text-sm">Notas iniciales (opcional)</Label>
                            <Textarea
                              rows={2}
                              value={newCase.notes}
                              onChange={(e) => setNewCase((prev) => ({ ...prev, notes: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowNewCaseForm(false);
                              resetNewCaseForm();
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleCreateCaseInline} disabled={creatingCase}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            {creatingCase ? 'Guardando...' : 'Crear herida y continuar'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Evaluación clínica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="font-body text-sm">Fecha</Label>
                    <Input
                      type="date"
                      value={evo.date}
                      onChange={e => setEvo({ ...evo, date: e.target.value })}
                      className={stepAttempted && !evo.date ? 'border-destructive ring-1 ring-destructive' : ''}
                    />
                  </div>
                  <div>
                    <Label className="font-body text-sm">Hora</Label>
                    <Input
                      type="time"
                      value={evo.time}
                      onChange={e => setEvo({ ...evo, time: e.target.value })}
                      className={stepAttempted && !evo.time ? 'border-destructive ring-1 ring-destructive' : ''}
                    />
                  </div>
                </div>

                <div>
                  <Label className="font-body text-sm">Estado de la herida</Label>
                  <Select value={evo.status} onValueChange={v => setEvo({ ...evo, status: v })}>
                    <SelectTrigger className="font-body text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_mejoria">En mejoría</SelectItem>
                      <SelectItem value="activo">Estable</SelectItem>
                      <SelectItem value="en_deterioro">En deterioro</SelectItem>
                      <SelectItem value="critico">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    Para cerrar la herida como cicatrizada, hacelo desde el detalle de la herida.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-body text-sm">Dolor (EVA): <span className="font-semibold text-foreground">{evo.pain}/10</span></Label>
                  <Slider value={[evo.pain]} onValueChange={([v]) => setEvo({ ...evo, pain: v })} min={0} max={10} step={1} />
                </div>

                {/* Exudado: cantidad, tipo y color en la misma fila */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { k: 'exudateAmount', label: 'Exudado: cantidad', opts: ['Sin exudado','Escaso','Moderado','Abundante'] },
                    { k: 'exudateType', label: 'Exudado: tipo', opts: ['Seroso','Serosanguinolento','Sanguinolento','Purulento','Fibrinoso'] },
                    { k: 'exudateColor', label: 'Exudado: color', opts: ['Transparente','Amarillo','Verde','Rojo','Marrón'] },
                  ].map((f) => {
                    const isExudateDetail = f.k === 'exudateType' || f.k === 'exudateColor';
                    const disabled = isExudateDetail && evo.exudateAmount === 'Sin exudado';
                    return (
                    <div key={f.k}>
                      <Label className="font-body text-sm">{f.label}</Label>
                      <Select
                        value={disabled ? '' : (evo as any)[f.k]}
                        onValueChange={v => setEvo({ ...evo, [f.k]: v } as any)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="font-body text-base"><SelectValue placeholder={disabled ? 'N/A' : undefined} /></SelectTrigger>
                        <SelectContent>{f.opts.map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { k: 'odor', label: 'Olor', opts: ['no','leve','moderado','intenso'] },
                    { k: 'infection', label: 'Infección', opts: ['no','sospecha','si'] },
                    { k: 'tissue', label: 'Tejido predom.', opts: ['epitelización','granulación','fibrina','esfacelo','necrosis','hueso o tendón expuesto'] },
                    { k: 'edges', label: 'Bordes', opts: ['definidos','irregulares','macerados','eritematoso','socavado','enrollado','necrosado'] },
                    { k: 'perilesional', label: 'Perilesional', opts: ['sana','eritematosa','macerada','seca'] },
                  ].map((f) => (
                    <div key={f.k}>
                      <Label className="font-body text-sm">{f.label}</Label>
                      <Select value={(evo as any)[f.k]} onValueChange={v => setEvo({ ...evo, [f.k]: v } as any)}>
                        <SelectTrigger className="font-body text-base"><SelectValue /></SelectTrigger>
                        <SelectContent>{f.opts.map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {/* Tamaño de la herida: largo, ancho y profundidad */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="font-body text-sm">Largo (cm)</Label>
                      <Input type="number" min={0} step="0.1" inputMode="decimal" placeholder="ej. 5" value={evo.woundLength} onChange={e => setEvo({ ...evo, woundLength: e.target.value })} />
                    </div>
                    <div>
                      <Label className="font-body text-sm">Ancho (cm)</Label>
                      <Input type="number" min={0} step="0.1" inputMode="decimal" placeholder="ej. 3" value={evo.woundWidth} onChange={e => setEvo({ ...evo, woundWidth: e.target.value })} />
                    </div>
                    <div>
                      <Label className="font-body text-sm">Profundidad (cm)</Label>
                      <Input type="number" min={0} step="0.1" inputMode="decimal" placeholder="ej. 0.5" value={evo.woundDepth} onChange={e => setEvo({ ...evo, woundDepth: e.target.value })} />
                    </div>
                  </div>
                  <p className="font-body text-sm text-muted-foreground">
                    Superficie (Largo × Ancho): <span className="font-semibold text-foreground tabular-nums">{evoWoundArea ? `${evoWoundArea} cm²` : '—'}</span>
                  </p>
                </div>

                <div><Label className="font-body text-sm">Procedimiento realizado</Label>
                  <Textarea rows={2} value={evo.procedure} onChange={e => setEvo({ ...evo, procedure: e.target.value })} placeholder="Limpieza, desbridamiento, apósito aplicado..." />
                </div>
                <div><Label className="font-body text-sm">Observaciones</Label>
                  <Textarea rows={2} value={evo.observations} onChange={e => setEvo({ ...evo, observations: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Fotografía clínica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex gap-2.5">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="font-body text-sm leading-relaxed">
                    Las fotografías clínicas se gestionan desde el detalle del caso para preservar consentimiento, firma y trazabilidad. Vas a poder cargarlas inmediatamente después de guardar esta evolución.
                  </div>
                </div>
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null;
                      setPhotoFile(file);
                      setPhotoPreview(file ? URL.createObjectURL(file) : null);
                    }}
                  />
                  {photoPreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-border/60 bg-slate-950/5">
                      <img src={photoPreview} alt="Vista previa" className="w-full max-h-72 object-contain" />
                      <div className="absolute bottom-2 right-2">
                        <span className="font-body text-sm bg-background/90 rounded-md px-2 py-1 border border-border/60">
                          Cambiar foto
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video min-h-[160px] rounded-lg border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      <Camera className="h-8 w-8" />
                      <span className="font-body text-sm">Adjuntar foto</span>
                    </div>
                  )}
                </label>
              </CardContent>
            </Card>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Insumos utilizados</CardTitle>
                <p className="font-body text-sm text-muted-foreground mt-0.5">
                  Marcá los insumos utilizados en esta curación.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sponsor product picker */}
                <div className="space-y-2">
                  <Label className="font-body text-sm">Catálogo {sponsor?.sponsor_name ?? 'sponsor'}</Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={productQuery} onChange={e => setProductQuery(e.target.value)} placeholder="Buscar producto sponsor..." className="pl-9 font-body" />
                  </div>
                  <div className="max-h-96 overflow-auto rounded-lg border border-border/60 divide-y divide-border/60">
                    {sponsorProducts
                      .filter(p => !productQuery || p.name.toLowerCase().includes(productQuery.toLowerCase()))
                      .slice(0, 12)
                      .map(p => (
                        <button key={p.id} onClick={() => addSupplyFromProduct(p)}
                          className="w-full text-left p-2.5 hover:bg-accent/40 transition-colors flex items-center gap-2">
                          <Pill className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-body text-sm font-medium truncate">{p.name}</div>
                            <div className="font-body text-[11px] text-muted-foreground truncate">
                              {p.category ?? 'Sin categoría'}{p.presentation ? ` · ${p.presentation}` : ''}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-primary" />
                        </button>
                      ))}
                    {sponsorProducts.length === 0 && (
                      <div className="p-3 font-body text-sm text-muted-foreground text-center">
                        No hay productos sponsor disponibles. Agregá insumos genéricos.
                      </div>
                    )}
                  </div>
                </div>

                {/* Generic categories */}
                <div className="space-y-2">
                  <Label className="font-body text-sm">Agregar por categoría genérica</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPLY_CATEGORIES.map(c => (
                      <Button key={c} type="button" variant="outline" size="sm" className="font-body text-sm h-7"
                        onClick={() => addSupplyGeneric(c)}>
                        <Plus className="h-3 w-3 mr-1" /> {c}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Supply lines */}
                {supplies.length === 0 ? (
                  <div className="text-center py-6 font-body text-sm text-muted-foreground">
                    Todavía no agregaste insumos.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supplies.map(s => (
                      <div key={s.id} className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-border/60 bg-background">
                        <div className="col-span-12 md:col-span-5 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-body text-sm font-medium truncate">{s.productName}</div>
                            {s.isSponsor && <Badge variant="outline" className="font-body text-[9px] uppercase border-primary/40 text-primary bg-primary/5">Sponsor</Badge>}
                          </div>
                          <div className="font-body text-[11px] text-muted-foreground">{s.category}{s.presentation ? ` · ${s.presentation}` : ''}</div>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Input type="number" min={1} value={s.quantity} onChange={e => updateSupply(s.id, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="h-8 text-sm" />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Input value={s.unit} onChange={e => updateSupply(s.id, { unit: e.target.value })} className="h-8 text-sm" placeholder="u" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="col-span-4 md:col-span-3 h-11 w-11 md:h-8 md:w-8 ml-auto" onClick={() => removeSupply(s.id)}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5 */}
          {/* Step 5 */}
          {step === 5 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Resumen final</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border/60 bg-background">
                    <div className="font-body text-[10px] uppercase text-muted-foreground tracking-wide">Paciente / Caso</div>
                    <div className="font-body text-sm font-medium mt-1">{patient ? `${patient.firstName} ${patient.lastName}` : '—'}</div>
                    <div className="font-body text-sm text-muted-foreground">{wcase?.woundType} · {wcase?.anatomicalLocation}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-background">
                    <div className="font-body text-[10px] uppercase text-muted-foreground tracking-wide">Evolución</div>
                    <div className="font-body text-sm mt-1">{evo.date} {evo.time} · {evo.professional}</div>
                    <div className="font-body text-sm text-muted-foreground">EVA {evo.pain}/10 · Exudado {evo.exudateAmount}{evo.exudateAmount !== 'Sin exudado' ? ` / ${evo.exudateType}` : ''} · Inf. {evo.infection}</div>
                  </div>
                </div>
                {supplies.length > 0 && (
                  <div>
                    <div className="font-body text-sm font-medium mb-2">Insumos utilizados</div>
                    <div className="space-y-1">
                      {supplies.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 font-body text-sm">
                          <span>{s.productName} <span className="text-muted-foreground">· {s.category}</span></span>
                          <span className="flex items-center gap-2">
                            x{s.quantity}{s.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {evo.nextControl && (
                  <div className="font-body text-sm text-muted-foreground">
                    Próximo turno: <span className="font-medium text-foreground">{formatNextControl(evo.nextControl, evo.nextControlTime)}</span>
                  </div>
                )}

              </CardContent>
            </Card>
          )}

          {/* Step 6 */}
          {step === 6 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><FileSignature className="h-5 w-5 text-primary" /> Firma y consentimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <EvolutionConsentSection
                  professionalName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
                  professionalLicense={currentUser?.license}
                  professionalInstitution={currentUser?.institution}
                  hasGeneralConsent={hasGeneralConsent}
                  professionalData={profSignature}
                  onProfessionalChange={setProfSignature}
                  errors={consentErrors}
                />
              </CardContent>
            </Card>
          )}

          {/* Nav controls */}
          <div className="space-y-2">
            {stepAttempted && !canNext() && (
              <p className="font-body text-sm text-destructive text-center">
                {step === 1 && !patientId && 'Seleccioná un paciente para continuar.'}
                {step === 1 && patientId && !caseId && 'Seleccioná un caso de herida para continuar.'}
                {step === 2 && (!evo.date || !evo.time) && 'La fecha y la hora de la evolución son obligatorias.'}
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" className="font-body" disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1))}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <div className="font-body text-sm text-muted-foreground">Paso {step} de {STEPS.length}</div>
              <Button
                className="font-body"
                disabled={saving}
                onClick={async () => {
                  if (!canNext()) { setStepAttempted(true); return; }
                  if (step === STEPS.length) {
                    const r = await saveEvolution();
                    if (r) navigate(`/patients/${patient?.id}/cases/${wcase?.id}`);
                    return;
                  }
                  setStep(s => Math.min(STEPS.length, s + 1));
                }}
              >
                {step === STEPS.length ? (
                  <><Save className="h-4 w-4 mr-1" /> Guardar curación</>
                ) : (
                  <>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
