import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft, Plus, Edit, Trash2, ChevronRight, User, Phone, Mail, MapPin, CalendarClock, CalendarDays,
  FileDown, ShieldAlert, BadgeCheck, UserCog, FileDown as FileDownIcon, Share2, Crown, Users as UsersIcon,
  Droplets, Thermometer, Package, CheckCircle2, Camera, Upload, X,
} from 'lucide-react';
import { exportPatientPdf } from '@/lib/exportPdf';
import {
  WoundCase, Photo, woundTypes, woundStatuses, getStatusLabel, professionals,
  healingFrequencies, odorOptions, tissueTypeOptions, edgeTypeOptions,
  exudateAmountOptions, exudateTypeOptions, exudateColorOptions, infectionSignFields,
  TissueType, EdgeType, OdorLevel, ExudateAmount, ExudateType, ExudateColor,
} from '@/data/demoData';
import { ROLE_LABEL_SHORT } from '@/data/demoUsers';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SharePatientDialog } from '@/components/SharePatientDialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const RequiredMark = () => (
  <span className="text-destructive ml-0.5" aria-label="campo obligatorio">*</span>
);
const OptionalTag = () => (
  <span className="font-body text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70 ml-1">(opcional)</span>
);

const statusBadgeClass: Record<string, string> = {
  activo: 'bg-info/10 text-info border-info/30',
  en_mejoria: 'bg-success/10 text-success border-success/30',
  critico: 'bg-destructive/10 text-destructive border-destructive/30',
  resuelto: 'bg-success/15 text-success border-success/40',
};

interface CaseFormState {
  woundType: string;
  anatomicalLocation: string;
  startDate: string;
  status: 'activo' | 'en_mejoria' | 'critico' | 'resuelto';
  professional: string;
  woundLength: number | '';
  woundWidth: number | '';
  woundDepth: number | '';
  tissueTypes: TissueType[];
  edgeTypes: EdgeType[];
  exudateAmount?: ExudateAmount;
  exudateType?: ExudateType;
  exudateColor?: ExudateColor;
  painLevel: number;
  odor: OdorLevel;
  hasInfectionSigns: boolean;
  infMalOlor: boolean;
  infEritema: boolean;
  infCalor: boolean;
  infBiofilm: boolean;
  infPurulenta: boolean;
  infDolorAumentado: boolean;
  bodyTemperature: number | '';
  healingFrequency: string;
  healingFrequencyDays: number | '';
  initialProcedure: string;
  initialMaterials: string;
  initialObservations: string;
  treatment: string;
}

const emptyCase: CaseFormState = {
  woundType: '', anatomicalLocation: '', startDate: '', status: 'activo',
  professional: '',
  woundLength: '', woundWidth: '', woundDepth: '',
  tissueTypes: [], edgeTypes: [],
  exudateAmount: undefined, exudateType: undefined, exudateColor: undefined,
  painLevel: 0, odor: 'sin_olor',
  hasInfectionSigns: false,
  infMalOlor: false, infEritema: false, infCalor: false, infBiofilm: false, infPurulenta: false, infDolorAumentado: false,
  bodyTemperature: '',
  healingFrequency: '',
  healingFrequencyDays: '',
  initialProcedure: '', initialMaterials: '', initialObservations: '',
  treatment: '',
};

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patients, addCase, updateCase, deleteCase, addEvolution, getPatientAccess, getPatientCollaborators, allUsers, currentUserName } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<WoundCase | null>(null);
  const [caseForm, setCaseForm] = useState(emptyCase);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Photos for the new/edit case form (optional)
  const [casePhotos, setCasePhotos] = useState<Photo[]>([]);
  const casePhotoInputRef = useRef<HTMLInputElement>(null);
  const caseCameraInputRef = useRef<HTMLInputElement>(null);

  const handleCaseFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const photo: Photo = {
          id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url,
          caption: file.name,
          date: new Date().toISOString().split('T')[0],
        };
        setCasePhotos(prev => [...prev, photo]);
      };
      reader.readAsDataURL(file);
    });
  };

  // New appointment dialog state
  const [apptDialogOpen, setApptDialogOpen] = useState(false);
  const [apptCaseId, setApptCaseId] = useState<string>('');
  const [apptDate, setApptDate] = useState<string>('');
  const [apptTime, setApptTime] = useState<string>('09:00');

  // Compute conflicts for currently selected appointment date (must run before early return)
  // Includes both the current patient's own appointments and other patients' appointments.
  const apptConflicts = useMemo(() => {
    if (!apptDate) return [] as { patientName: string; time: string; woundType: string; isCurrent: boolean }[];
    return patients.flatMap(p => p.cases.flatMap(c =>
      c.evolutions
        .filter(e => e.nextControl === apptDate)
        .map(e => ({
          patientName: p.id === patientId ? 'Este paciente' : `${p.lastName}, ${p.firstName}`,
          time: e.time || '',
          woundType: c.woundType,
          isCurrent: p.id === patientId,
        }))
    ));
  }, [patients, patientId, apptDate]);

  // Set of HH:MM times already taken on the selected day (any patient)
  const apptTakenTimes = useMemo(() => {
    return new Set(apptConflicts.map(c => c.time).filter(Boolean));
  }, [apptConflicts]);

  // Pick the next available 15-min slot starting from 09:00 (then walking forward, fallback to next day search not needed)
  const pickAvailableTime = (taken: Set<string>): string => {
    const minutes = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    for (let h = 9; h < 20; h++) {
      for (let m = 0; m < 60; m += 15) {
        const t = minutes(h, m);
        if (!taken.has(t)) return t;
      }
    }
    // Fallback: try earlier morning
    for (let h = 7; h < 9; h++) {
      for (let m = 0; m < 60; m += 15) {
        const t = minutes(h, m);
        if (!taken.has(t)) return t;
      }
    }
    return '09:00';
  };

  if (!patient) return (
    <AppLayout>
      <div className="p-8 text-center font-body text-muted-foreground space-y-3">
        <p>No tenés acceso a este paciente o no existe.</p>
        <Button variant="outline" onClick={() => navigate('/patients')} className="font-body">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis pacientes
        </Button>
      </div>
    </AppLayout>
  );

  const access = getPatientAccess(patient.id);
  const collaborators = getPatientCollaborators(patient.id);
  const owner = collaborators.find(c => c.via === 'owner')?.user;
  const sharedCount = collaborators.length - 1; // exclude owner
  const isOwner = access?.effectiveRole === 'owner';

  const openNewCase = () => {
    setEditingCase(null);
    setCaseForm({
      ...emptyCase,
      startDate: new Date().toISOString().split('T')[0],
      professional: currentUserName || patient.assignedProfessional || '',
    });
    setCasePhotos([]);
    setCaseDialogOpen(true);
  };

  const openEditCase = (c: WoundCase, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCase(c);
    setCaseForm({
      woundType: c.woundType,
      anatomicalLocation: c.anatomicalLocation,
      startDate: c.startDate,
      status: c.status,
      professional: patient.assignedProfessional || '',
      woundLength: c.woundLength ?? '',
      woundWidth: c.woundWidth ?? '',
      woundDepth: c.woundDepth ?? '',
      tissueTypes: c.tissueTypes ?? [],
      edgeTypes: c.edgeTypes ?? [],
      exudateAmount: c.exudateAmount,
      exudateType: c.exudateType,
      exudateColor: c.exudateColor,
      painLevel: c.painLevel ?? 0,
      odor: c.odor ?? 'sin_olor',
      hasInfectionSigns: c.hasInfectionSigns ?? false,
      infMalOlor: c.infMalOlor ?? false,
      infEritema: c.infEritema ?? false,
      infCalor: c.infCalor ?? false,
      infBiofilm: c.infBiofilm ?? false,
      infPurulenta: c.infPurulenta ?? false,
      infDolorAumentado: c.infDolorAumentado ?? false,
      bodyTemperature: c.bodyTemperature ?? '',
      healingFrequency: c.healingFrequency ?? '',
      healingFrequencyDays: c.healingFrequencyDays ?? '',
      initialProcedure: c.initialProcedure ?? '',
      initialMaterials: c.initialMaterials ?? '',
      initialObservations: c.initialObservations ?? '',
      treatment: c.treatment ?? '',
    });
    setCasePhotos([...(c.photos ?? [])]);
    setCaseDialogOpen(true);
  };

  // Helper: convert preset frequency label to days, returns null if no preset (free / "A demanda")
  const presetFreqToDays = (freq?: string): number | null => {
    switch ((freq || '').trim()) {
      case 'Diaria': return 1;
      case 'Cada 48hs': return 2;
      case 'Cada 72hs': return 3;
      case 'Semanal': return 7;
      default: return null;
    }
  };

  const handleSaveCase = () => {
    // Validación de campos obligatorios
    const missing: string[] = [];
    if (!caseForm.woundType) missing.push('Tipo de herida');
    if (!caseForm.anatomicalLocation.trim()) missing.push('Ubicación anatómica');
    if (!caseForm.startDate) missing.push('Fecha de inicio');
    // Si no hay frecuencia preestablecida, exigir días manuales
    const presetDays = presetFreqToDays(caseForm.healingFrequency);
    const manualDays = caseForm.healingFrequencyDays === '' ? null : Number(caseForm.healingFrequencyDays);
    if (presetDays === null && (!manualDays || manualDays <= 0)) {
      missing.push('Días estimados de frecuencia de curación');
    }
    if (missing.length > 0) {
      toast({
        title: 'Faltan campos obligatorios',
        description: `Completá: ${missing.join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }
    const numOrUndef = (v: number | '') => (v === '' ? undefined : Number(v));
    const baseCase = {
      woundType: caseForm.woundType,
      anatomicalLocation: caseForm.anatomicalLocation,
      startDate: caseForm.startDate,
      status: caseForm.status,
      woundLength: numOrUndef(caseForm.woundLength),
      woundWidth: numOrUndef(caseForm.woundWidth),
      woundDepth: numOrUndef(caseForm.woundDepth),
      tissueTypes: caseForm.tissueTypes,
      edgeTypes: caseForm.edgeTypes,
      exudateAmount: caseForm.exudateAmount,
      exudateType: caseForm.exudateType,
      exudateColor: caseForm.exudateColor,
      painLevel: caseForm.painLevel,
      odor: caseForm.odor,
      hasInfectionSigns: caseForm.hasInfectionSigns,
      infMalOlor: caseForm.infMalOlor,
      infEritema: caseForm.infEritema,
      infCalor: caseForm.infCalor,
      infBiofilm: caseForm.infBiofilm,
      infPurulenta: caseForm.infPurulenta,
      infDolorAumentado: caseForm.infDolorAumentado,
      bodyTemperature: numOrUndef(caseForm.bodyTemperature),
      healingFrequency: caseForm.healingFrequency,
      healingFrequencyDays: caseForm.healingFrequencyDays === '' ? undefined : Number(caseForm.healingFrequencyDays),
      initialProcedure: caseForm.initialProcedure,
      initialMaterials: caseForm.initialMaterials,
      initialObservations: caseForm.initialObservations,
      treatment: caseForm.treatment,
    };

    if (editingCase) {
      updateCase(patient.id, { ...editingCase, ...baseCase, photos: casePhotos });
    } else {
      const newCaseId = `c${Date.now()}`;
      const newCase: WoundCase = {
        ...baseCase,
        id: newCaseId,
        patientId: patient.id,
        evolutions: [],
        photos: casePhotos,
      };

      // Auto-create initial evolution mirroring the baseline data
      newCase.evolutions = [{
        id: `evo-${Date.now()}`,
        date: caseForm.startDate,
        time: '09:00',
        professional: caseForm.professional,
        description: 'Evaluación inicial. Datos basales de la herida registrados al ingreso del caso.',
        procedure: caseForm.initialProcedure,
        materials: caseForm.initialMaterials,
        healingFrequency: caseForm.healingFrequency,
        healingFrequencyDays: caseForm.healingFrequencyDays === '' ? undefined : Number(caseForm.healingFrequencyDays),
        observations: caseForm.initialObservations,
        nextControl: '',
        photos: casePhotos,
        healingDate: caseForm.startDate,
        painLevel: caseForm.painLevel,
        odor: caseForm.odor,
        evolutionStatus: 'tratamiento_activo',
        woundLength: baseCase.woundLength,
        woundWidth: baseCase.woundWidth,
        woundDepth: baseCase.woundDepth,
        tissueTypes: caseForm.tissueTypes,
        edgeTypes: caseForm.edgeTypes,
        exudateAmount: caseForm.exudateAmount,
        exudateType: caseForm.exudateType,
        exudateColor: caseForm.exudateColor,
        hasInfectionSigns: caseForm.hasInfectionSigns,
        infMalOlor: caseForm.infMalOlor,
        infEritema: caseForm.infEritema,
        infCalor: caseForm.infCalor,
        infBiofilm: caseForm.infBiofilm,
        infPurulenta: caseForm.infPurulenta,
        infDolorAumentado: caseForm.infDolorAumentado,
        bodyTemperature: baseCase.bodyTemperature,
      }];

      addCase(patient.id, newCase);
    }
    setCaseDialogOpen(false);
  };

  const setCField = <K extends keyof CaseFormState>(key: K, value: CaseFormState[K]) =>
    setCaseForm(prev => ({ ...prev, [key]: value }));

  const toggleTissue = (t: TissueType) => setCaseForm(prev => ({
    ...prev,
    tissueTypes: prev.tissueTypes.includes(t) ? prev.tissueTypes.filter(x => x !== t) : [...prev.tissueTypes, t],
  }));
  const toggleEdge = (t: EdgeType) => setCaseForm(prev => ({
    ...prev,
    edgeTypes: prev.edgeTypes.includes(t) ? prev.edgeTypes.filter(x => x !== t) : [...prev.edgeTypes, t],
  }));

  const caseWoundArea = (() => {
    const l = typeof caseForm.woundLength === 'number' ? caseForm.woundLength : parseFloat(String(caseForm.woundLength));
    const w = typeof caseForm.woundWidth === 'number' ? caseForm.woundWidth : parseFloat(String(caseForm.woundWidth));
    if (!isFinite(l) || !isFinite(w) || l <= 0 || w <= 0) return null;
    return (l * w).toFixed(2);
  })();

  const handleSaveAppointment = () => {
    if (!apptCaseId || !apptDate) return;
    const newEvo = {
      id: `evo-${Date.now()}`,
      date: apptDate,
      time: apptTime,
      professional: patient.assignedProfessional || '',
      description: 'Turno programado',
      procedure: '',
      materials: '',
      healingFrequency: '',
      observations: '',
      nextControl: apptDate,
      photos: [],
    };
    addEvolution(patient.id, apptCaseId, newEvo);
    setApptDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" onClick={() => navigate('/patients')} className="font-body text-sm -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a pacientes
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-body"
              onClick={() => setShareDialogOpen(true)}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartir
              {sharedCount > 0 && (
                <Badge variant="secondary" className="ml-2 font-body text-[10px] py-0 px-1.5">
                  {sharedCount}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" className="font-body" onClick={() => exportPatientPdf(patient)}>
              <FileDown className="mr-2 h-4 w-4" /> Exportar Historia Clínica
            </Button>
          </div>
        </div>

        {/* Patient info */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="heading-display text-xl flex items-center gap-2 flex-wrap">
              <User className="h-5 w-5 text-primary" />
              <span>{patient.lastName}, {patient.firstName}</span>
              {isOwner ? (
                <Badge className="font-body text-[10px] uppercase tracking-wide bg-primary/10 text-primary border-primary/30 ml-2">
                  <Crown className="h-2.5 w-2.5 mr-1" /> Tu paciente
                </Badge>
              ) : access ? (
                <Badge variant="outline" className="font-body text-[10px] uppercase tracking-wide ml-2">
                  <UsersIcon className="h-2.5 w-2.5 mr-1" />
                  Compartido por {owner ? `${owner.firstName} ${owner.lastName}` : 'otro profesional'} · {ROLE_LABEL_SHORT[access.effectiveRole === 'owner' ? 'co_owner' : access.effectiveRole]}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {/* Datos personales */}
            <div>
              <p className="font-body text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Datos personales</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2">
                <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Edad / Sexo" value={`${patient.age} años · ${patient.gender}`} />
                <InfoRow icon={<User className="h-3.5 w-3.5" />} label="DNI / Documento" value={patient.dni} />
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono" value={patient.phone} />
                {patient.email && <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={patient.email} />}
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Domicilio" value={patient.address} />
                <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="Fecha de ingreso" value={patient.admissionDate || '—'} />
              </div>
            </div>

            {/* Datos clínicos */}
            <div className="pt-3 border-t border-border/50 grid sm:grid-cols-2 gap-3">
              <div>
                <p className="font-body text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Antecedentes y comorbilidades</p>
                <p className="font-body text-sm leading-snug">{patient.diagnosis || <span className="text-muted-foreground italic">Sin datos</span>}</p>
              </div>
              <div>
                <p className="font-body text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Alergias
                </p>
                <p className="font-body text-sm leading-snug">{patient.allergies || <span className="text-muted-foreground italic">Sin alergias registradas</span>}</p>
              </div>
            </div>

            {/* Datos administrativos y contacto */}
            {(patient.insurance || patient.emergencyContactName || patient.emergencyContactPhone) && (
              <div className="pt-3 border-t border-border/50">
                <p className="font-body text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Datos administrativos y contacto</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                  {patient.insurance && <InfoRow icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Obra social / Cobertura" value={patient.insurance} />}
                  {patient.emergencyContactName && <InfoRow icon={<UserCog className="h-3.5 w-3.5" />} label="Contacto de emergencia" value={patient.emergencyContactName} />}
                  {patient.emergencyContactPhone && <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Tel. de emergencia" value={patient.emergencyContactPhone} />}
                </div>
              </div>
            )}

            {/* Notas generales */}
            {patient.observations && (
              <div className="pt-3 border-t border-border/50">
                <p className="font-body text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Notas generales</p>
                <p className="font-body text-sm leading-snug">{patient.observations}</p>
              </div>
            )}

            {/* Resumen de Casos / Heridas integrado */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border/50">
              <div className="flex items-baseline gap-2">
                <span className="heading-display text-2xl text-primary leading-none">{patient.cases.length}</span>
                <span className="font-body text-xs text-muted-foreground">Casos / Heridas</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {woundStatuses.map(s => {
                  const count = patient.cases.filter(c => c.status === s.value).length;
                  return count > 0 ? (
                    <Badge key={s.value} className={`font-body text-[11px] py-0 px-2 ${statusBadgeClass[s.value]}`}>
                      {s.label} · {count}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendario de Turnos del Paciente — un color por herida */}
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const activeCases = patient.cases.filter(c => c.status !== 'resuelto');

          // Color palette: one HSL hue per wound (case)
          const palette = [
            'hsl(var(--primary))',
            'hsl(var(--destructive))',
            'hsl(var(--success))',
            'hsl(var(--warning))',
            'hsl(265 70% 55%)',
            'hsl(180 60% 40%)',
            'hsl(25 90% 55%)',
            'hsl(330 75% 55%)',
          ];
          const caseColor: Record<string, string> = {};
          activeCases.forEach((c, idx) => {
            caseColor[c.id] = palette[idx % palette.length];
          });

          // Existing appointments grouped by case
          const appointmentsByCase = activeCases.flatMap(c =>
            c.evolutions
              .filter(e => e.nextControl && e.nextControl.trim() !== '' && new Date(e.nextControl + 'T12:00:00') >= today)
              .map(e => ({
                date: new Date(e.nextControl + 'T12:00:00'),
                caseId: c.id,
                status: c.status,
                woundType: c.woundType,
                anatomicalLocation: c.anatomicalLocation,
              }))
          );

          // Appointments from OTHER patients (to avoid scheduling clashes)
          const otherPatientsAppointments = patients
            .filter(p => p.id !== patient.id)
            .flatMap(p => p.cases.flatMap(c =>
              c.evolutions
                .filter(e => e.nextControl && e.nextControl.trim() !== '' && new Date(e.nextControl + 'T12:00:00') >= today)
                .map(e => ({
                  date: new Date(e.nextControl + 'T12:00:00'),
                  time: e.time || '',
                  patientName: `${p.lastName}, ${p.firstName}`,
                  woundType: c.woundType,
                }))
            ));
          const otherDates = otherPatientsAppointments.map(a => a.date);
          const otherDateStrings = new Set(otherDates.map(d => d.toISOString().split('T')[0]));

          // Map healing frequency label to days interval
          const frequencyToDays = (freq?: string): number | null => {
            switch ((freq || '').trim()) {
              case 'Diaria': return 1;
              case 'Cada 48hs': return 2;
              case 'Cada 72hs': return 3;
              case 'Semanal': return 7;
              case 'A demanda': return null;
              default: return null;
            }
          };

          // Suggested future dates PER CASE based on its healingFrequency.
          // Anchor: latest evolution date with that frequency, else next existing nextControl, else today.
          const existingDateStrings = new Set(appointmentsByCase.map(a => a.date.toISOString().split('T')[0]));
          const suggestionsByCase: Array<{ caseId: string; date: Date; days: number }> = [];

          activeCases.forEach(c => {
            // Take the MOST RECENT evolution that defines either a preset frequency or manual days.
            // This way, updating an evolution to manual days overrides any older preset.
            const sortedEvos = [...c.evolutions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            const latestWithFreq = sortedEvos.find(e =>
              (e.healingFrequency && e.healingFrequency.trim() !== '') ||
              (typeof e.healingFrequencyDays === 'number' && e.healingFrequencyDays > 0)
            );
            const freq = latestWithFreq?.healingFrequency || (latestWithFreq ? '' : c.healingFrequency);
            const manualDays = latestWithFreq?.healingFrequencyDays ?? c.healingFrequencyDays ?? null;
            const days = frequencyToDays(freq) ?? (manualDays && manualDays > 0 ? manualDays : null);
            if (!days) return;

            // Anchor date: last existing nextControl for this case, else last evolution date, else today
            const futureControls = c.evolutions
              .filter(e => e.nextControl && e.nextControl.trim() !== '')
              .map(e => new Date(e.nextControl + 'T12:00:00'))
              .sort((a, b) => b.getTime() - a.getTime());
            let anchor = futureControls[0]
              || (sortedEvos[0]?.date ? new Date(sortedEvos[0].date + 'T12:00:00') : new Date(today));
            if (anchor < today) anchor = new Date(today);

            for (let i = 1; i <= 6; i++) {
              const d = new Date(anchor);
              d.setDate(d.getDate() + days * i);
              const ds = d.toISOString().split('T')[0];
              if (!existingDateStrings.has(ds)) {
                suggestionsByCase.push({ caseId: c.id, date: new Date(d), days });
              }
            }
          });

          const suggestedDates: Date[] = suggestionsByCase.map(s => s.date);

          // Build dynamic modifiers: one modifier key per case
          const modifiers: Record<string, Date[]> = { suggested: suggestedDates, other: otherDates };
          const modifiersStyles: Record<string, React.CSSProperties> = {
            suggested: {
              backgroundColor: 'transparent',
              color: 'hsl(var(--muted-foreground))',
              borderRadius: '9999px',
              border: '1.5px dashed hsl(var(--muted-foreground) / 0.5)',
            },
            other: {
              backgroundColor: 'hsl(var(--muted))',
              color: 'hsl(var(--muted-foreground))',
              borderRadius: '9999px',
              border: '1.5px solid hsl(var(--muted-foreground) / 0.4)',
              opacity: 0.7,
            },
          };
          activeCases.forEach(c => {
            const dates = appointmentsByCase.filter(a => a.caseId === c.id).map(a => a.date);
            if (dates.length > 0) {
              const key = `case_${c.id}`;
              modifiers[key] = dates;
              modifiersStyles[key] = {
                backgroundColor: caseColor[c.id],
                color: '#fff',
                borderRadius: '9999px',
                fontWeight: 600,
              };
            }
            // Suggested per-case (dashed circle with case color)
            const sugDates = suggestionsByCase.filter(s => s.caseId === c.id).map(s => s.date);
            if (sugDates.length > 0) {
              const sKey = `sug_${c.id}`;
              modifiers[sKey] = sugDates;
              modifiersStyles[sKey] = {
                backgroundColor: 'transparent',
                color: caseColor[c.id],
                borderRadius: '9999px',
                border: `1.5px dashed ${caseColor[c.id]}`,
                fontWeight: 600,
              };
            }
          });

          const openNewAppointment = (preselectDate?: string, preselectCaseId?: string) => {
            const caseId = preselectCaseId || activeCases[0]?.id || '';
            setApptCaseId(caseId);

            // Default date: first suggested date for the chosen case (or earliest overall),
            // falling back to 7 days ahead if no suggestion exists.
            let defaultDate = preselectDate;
            if (!defaultDate) {
              const sortedSugs = [...suggestionsByCase].sort((a, b) => a.date.getTime() - b.date.getTime());
              const forCase = caseId ? sortedSugs.find(s => s.caseId === caseId) : undefined;
              const chosen = forCase || sortedSugs[0];
              defaultDate = chosen
                ? chosen.date.toISOString().split('T')[0]
                : new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            }
            setApptDate(defaultDate);

            // Default time: first 15-min slot from 09:00 not colliding with any appointment that day.
            const takenThatDay = new Set<string>();
            patients.forEach(p => p.cases.forEach(c => c.evolutions.forEach(e => {
              if (e.nextControl === defaultDate && e.time) takenThatDay.add(e.time);
            })));
            setApptTime(pickAvailableTime(takenThatDay));

            setApptDialogOpen(true);
          };

          return (
            <Card className="border-border/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
                <CardTitle className="heading-display text-lg flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Calendario de Controles
                </CardTitle>
                <Button
                  size="sm"
                  className="font-body"
                  onClick={() => openNewAppointment()}
                  disabled={activeCases.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" /> Nuevo turno
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="shrink-0">
                    <Calendar
                      mode="multiple"
                      selected={[...appointmentsByCase.map(a => a.date), ...suggestedDates]}
                      className="p-3 pointer-events-auto rounded-lg border border-border/50"
                      modifiers={modifiers}
                      modifiersStyles={modifiersStyles}
                    />
                    <div className="flex flex-wrap gap-3 mt-3 px-1">
                      {activeCases.map(c => (
                        <div key={`leg-${c.id}`} className="flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: caseColor[c.id] }}
                          />
                          <span className="font-body text-xs text-muted-foreground">
                            {c.woundType}{c.anatomicalLocation ? ` · ${c.anatomicalLocation}` : ''}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full border-2 border-dashed border-muted-foreground/50" />
                        <span className="font-body text-xs text-muted-foreground">Sugerido</span>
                      </div>
                      {otherDates.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded-full bg-muted border border-muted-foreground/40" />
                          <span className="font-body text-xs text-muted-foreground">Otro paciente</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <h3 className="font-body text-sm font-semibold text-muted-foreground">Próximos turnos programados</h3>
                    {appointmentsByCase.length > 0 ? appointmentsByCase
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .map((ap, i) => (
                        <div
                          key={`ap-${i}`}
                          className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer"
                          style={{ borderLeft: `4px solid ${caseColor[ap.caseId]}` }}
                          onClick={() => navigate(`/patients/${patient.id}/cases/${ap.caseId}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: caseColor[ap.caseId] }} />
                              <span className="font-body text-sm font-semibold">{ap.date.toISOString().split('T')[0]}</span>
                            </div>
                            <Badge className={`font-body text-xs ${statusBadgeClass[ap.status]}`}>{getStatusLabel(ap.status)}</Badge>
                          </div>
                          <p className="font-body text-sm mt-1">{ap.woundType}{ap.anatomicalLocation ? ` · ${ap.anatomicalLocation}` : ''}</p>
                        </div>
                      )) : (
                      <p className="font-body text-sm text-muted-foreground">No hay turnos programados.</p>
                    )}

                    {suggestionsByCase.length > 0 && (
                      <>
                        <h3 className="font-body text-sm font-semibold text-muted-foreground mt-4">Turnos sugeridos según frecuencia de curación</h3>
                        <div className="space-y-2">
                          {activeCases.map(c => {
                            const sugs = suggestionsByCase.filter(s => s.caseId === c.id).slice(0, 4);
                            if (sugs.length === 0) return null;
                            const days = sugs[0].days;
                            const freqLabel =
                              days === 1 ? 'Diaria' :
                              days === 2 ? 'Cada 48hs' :
                              days === 3 ? 'Cada 72hs' :
                              days === 7 ? 'Semanal' :
                              `Cada ${days} días`;
                            return (
                              <div key={`sugcase-${c.id}`} className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: caseColor[c.id] }} />
                                  <span className="font-body text-xs font-semibold truncate">
                                    {c.woundType}{c.anatomicalLocation ? ` · ${c.anatomicalLocation}` : ''}
                                  </span>
                                  <Badge variant="outline" className="font-body text-[10px] ml-auto shrink-0">{freqLabel}</Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {sugs.map((s, i) => {
                                    const ds = s.date.toISOString().split('T')[0];
                                    const clash = otherDateStrings.has(ds);
                                    return (
                                      <Badge
                                        key={`sug-${c.id}-${i}`}
                                        variant="outline"
                                        className={`font-body text-xs cursor-pointer ${clash ? 'border-warning/60 text-warning' : 'hover:bg-accent'}`}
                                        style={!clash ? { borderColor: caseColor[c.id], color: caseColor[c.id], borderStyle: 'dashed' } : undefined}
                                        onClick={() => openNewAppointment(ds, c.id)}
                                        title={clash ? 'Ese día ya hay turno con otro paciente' : `Programar turno para ${c.woundType}`}
                                      >
                                        {ds}{clash ? ' ⚠' : ''}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {otherPatientsAppointments.length > 0 && (
                      <>
                        <h3 className="font-body text-sm font-semibold text-muted-foreground mt-4">Turnos con otros pacientes</h3>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {otherPatientsAppointments
                            .sort((a, b) => a.date.getTime() - b.date.getTime())
                            .slice(0, 8)
                            .map((ap, i) => (
                              <div key={`other-${i}`} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40 border border-border/40">
                                <div className="min-w-0">
                                  <p className="font-body text-xs font-medium truncate">{ap.patientName}</p>
                                  <p className="font-body text-[11px] text-muted-foreground truncate">{ap.woundType}</p>
                                </div>
                                <span className="font-body text-[11px] text-muted-foreground shrink-0">
                                  {ap.date.toISOString().split('T')[0]}{ap.time ? ` · ${ap.time}` : ''}
                                </span>
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Cases */}
        <div className="flex items-center justify-between">
          <h2 className="heading-display text-xl">Casos / Heridas</h2>
          <Button onClick={openNewCase} className="font-body" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nueva Herida
          </Button>
        </div>

        <div className="grid gap-3">
          {patient.cases.map(c => (
            <Card
              key={c.id}
              className="border-border/50 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/patients/${patient.id}/cases/${c.id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-body text-sm font-semibold">{c.woundType}</h3>
                    <Badge className={`font-body text-xs ${statusBadgeClass[c.status]}`}>
                      {c.status === 'resuelto' ? 'CERRADA ✅' : getStatusLabel(c.status)}
                    </Badge>
                  </div>
                  <p className="font-body text-xs text-muted-foreground">{c.anatomicalLocation}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs font-body text-muted-foreground">
                    <span>Inicio: {c.startDate}</span>
                    <span>Tamaño: {c.size}</span>
                    <span>{c.evolutions.length} evoluciones</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openEditCase(c, e)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={e => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="heading-display">¿Eliminar caso?</AlertDialogTitle>
                        <AlertDialogDescription className="font-body">Se eliminarán todas las evoluciones y fotos de este caso.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="font-body">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCase(patient.id, c.id)} className="font-body bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {patient.cases.length === 0 && (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <p className="font-body text-muted-foreground">No hay casos registrados</p>
              <Button variant="outline" className="font-body mt-3" onClick={openNewCase}>
                <Plus className="mr-2 h-4 w-4" /> Crear primer caso
              </Button>
            </div>
          )}
        </div>

        {/* Case Form Dialog */}
        {/* New Appointment Dialog */}
        <Dialog open={apptDialogOpen} onOpenChange={setApptDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="heading-display text-lg">Nuevo turno</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="font-body text-sm">Herida</Label>
                <Select value={apptCaseId} onValueChange={setApptCaseId}>
                  <SelectTrigger className="font-body"><SelectValue placeholder="Seleccionar herida" /></SelectTrigger>
                  <SelectContent>
                    {patient.cases.filter(c => c.status !== 'resuelto').map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.woundType}{c.anatomicalLocation ? ` · ${c.anatomicalLocation}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Fecha</Label>
                  <Input
                    type="date"
                    value={apptDate}
                    onChange={e => {
                      const newDate = e.target.value;
                      setApptDate(newDate);
                      const takenThatDay = new Set<string>();
                      patients.forEach(p => p.cases.forEach(c => c.evolutions.forEach(ev => {
                        if (ev.nextControl === newDate && ev.time) takenThatDay.add(ev.time);
                      })));
                      setApptTime(pickAvailableTime(takenThatDay));
                    }}
                    className="font-body"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Hora</Label>
                  <Input
                    type="time"
                    step={900}
                    value={apptTime}
                    onChange={e => setApptTime(e.target.value)}
                    className={cn(
                      "font-body",
                      apptTakenTimes.has(apptTime) && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {apptTakenTimes.has(apptTime) && (
                    <p className="font-body text-[11px] text-destructive">
                      Ese horario ya está ocupado por otro turno.
                    </p>
                  )}
                </div>
              </div>

              {apptConflicts.length > 0 && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1.5">
                  <p className="font-body text-xs font-semibold text-destructive">
                    ⚠ Ya hay {apptConflicts.length} turno{apptConflicts.length !== 1 ? 's' : ''} agendado{apptConflicts.length !== 1 ? 's' : ''} ese día:
                  </p>
                  <ul className="space-y-0.5">
                    {apptConflicts
                      .slice()
                      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                      .slice(0, 8)
                      .map((c, i) => (
                        <li key={i} className="font-body text-[11px] text-destructive/90">
                          • {c.patientName}{c.time ? ` — ${c.time}` : ''} ({c.woundType})
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setApptDialogOpen(false)} className="font-body">Cancelar</Button>
              <Button onClick={handleSaveAppointment} disabled={!apptCaseId || !apptDate} className="font-body">
                Guardar turno
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
          <DialogContent className="max-w-2xl w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 gap-0 flex flex-col rounded-none sm:rounded-lg">
            <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b border-border/50 shrink-0">
              <DialogTitle className="heading-display text-lg sm:text-xl">
                {editingCase ? 'Editar Herida' : 'Nueva Herida'}
              </DialogTitle>
              <p className="font-body text-xs text-muted-foreground mt-1">
                Los campos marcados con <span className="text-destructive font-semibold">*</span> son obligatorios.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
              {/* Tipo de herida + ubicación */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tipo de herida<RequiredMark />
                  </Label>
                  <Select value={caseForm.woundType} onValueChange={v => setCField('woundType', v)}>
                    <SelectTrigger
                      className={cn("font-body h-11", !caseForm.woundType && "border-destructive/40")}
                      aria-required="true"
                    >
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {woundTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Ubicación anatómica<RequiredMark />
                  </Label>
                  <Input
                    value={caseForm.anatomicalLocation}
                    onChange={e => setCField('anatomicalLocation', e.target.value)}
                    className={cn("font-body h-11", !caseForm.anatomicalLocation.trim() && "border-destructive/40")}
                    placeholder="Ej: Sacro, Pie derecho"
                    aria-required="true"
                  />
                </div>
              </div>

              {/* Fecha de inicio + estado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Fecha de inicio<RequiredMark />
                  </Label>
                  <Input
                    type="date"
                    value={caseForm.startDate}
                    onChange={e => setCField('startDate', e.target.value)}
                    className={cn("font-body h-11", !caseForm.startDate && "border-destructive/40")}
                    aria-required="true"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</Label>
                  <Select value={caseForm.status} onValueChange={v => setCField('status', v as CaseFormState['status'])}>
                    <SelectTrigger className="font-body h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {woundStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Profesional */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profesional responsable</Label>
                <div className="font-body h-11 flex items-center px-3 rounded-md border border-input bg-muted/40 text-sm">
                  {caseForm.professional || currentUserName || '—'}
                </div>
              </div>

              {/* Frecuencia de curación */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frecuencia de curación <span className="text-destructive">*</span></Label>
                <Select value={caseForm.healingFrequency} onValueChange={v => setCField('healingFrequency', v)}>
                  <SelectTrigger className="font-body h-11"><SelectValue placeholder="Seleccionar frecuencia" /></SelectTrigger>
                  <SelectContent>
                    {healingFrequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(caseForm.healingFrequency === '' || caseForm.healingFrequency === 'A demanda') && (
                  <div className="space-y-1 pt-1">
                    <Label className="font-body text-[11px] text-muted-foreground">
                      Días estimados entre curaciones <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number" inputMode="numeric" min="1" step="1"
                      value={caseForm.healingFrequencyDays}
                      onChange={e => setCField('healingFrequencyDays', e.target.value === '' ? '' : Number(e.target.value))}
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
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tamaño de la herida (cm)<OptionalTag /></Label>
                  {caseWoundArea && (
                    <span className="font-body text-xs font-semibold text-primary tabular-nums">
                      Área: {caseWoundArea} cm²
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="font-body text-[11px] text-muted-foreground">Largo</Label>
                    <Input type="number" inputMode="decimal" step="0.1" min="0"
                      value={caseForm.woundLength}
                      onChange={e => setCField('woundLength', e.target.value === '' ? '' : Number(e.target.value))}
                      className="font-body h-11 text-center tabular-nums" placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-[11px] text-muted-foreground">Ancho</Label>
                    <Input type="number" inputMode="decimal" step="0.1" min="0"
                      value={caseForm.woundWidth}
                      onChange={e => setCField('woundWidth', e.target.value === '' ? '' : Number(e.target.value))}
                      className="font-body h-11 text-center tabular-nums" placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-[11px] text-muted-foreground">Profundidad</Label>
                    <Input type="number" inputMode="decimal" step="0.1" min="0"
                      value={caseForm.woundDepth}
                      onChange={e => setCField('woundDepth', e.target.value === '' ? '' : Number(e.target.value))}
                      className="font-body h-11 text-center tabular-nums" placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Tipo de tejido */}
              <div className="space-y-2">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de tejido presente<OptionalTag /></Label>
                <div className="flex flex-wrap gap-2">
                  {tissueTypeOptions.map(t => {
                    const active = caseForm.tissueTypes.includes(t.value);
                    return (
                      <button key={t.value} type="button" onClick={() => toggleTissue(t.value)}
                        className={cn(
                          "min-h-11 px-4 rounded-full border font-body text-sm font-medium transition-all active:scale-95",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        )}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de borde */}
              <div className="space-y-2">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de borde<OptionalTag /></Label>
                <div className="flex flex-wrap gap-2">
                  {edgeTypeOptions.map(t => {
                    const active = caseForm.edgeTypes.includes(t.value);
                    return (
                      <button key={t.value} type="button" onClick={() => toggleEdge(t.value)}
                        className={cn(
                          "min-h-11 px-4 rounded-full border font-body text-sm font-medium transition-all active:scale-95",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        )}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dolor EVA */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dolor (EVA)<OptionalTag /></Label>
                  <span className={cn(
                    "font-body text-sm font-bold tabular-nums px-2 py-0.5 rounded-md",
                    caseForm.painLevel <= 3 && "bg-success/15 text-success",
                    caseForm.painLevel > 3 && caseForm.painLevel <= 6 && "bg-warning/15 text-warning",
                    caseForm.painLevel > 6 && "bg-destructive/15 text-destructive",
                  )}>{caseForm.painLevel} / 10</span>
                </div>
                <Slider min={0} max={10} step={1} value={[caseForm.painLevel]}
                  onValueChange={([v]) => setCField('painLevel', v)} className="py-2" />
                <div className="flex justify-between font-body text-[10px] text-muted-foreground px-0.5">
                  <span>Sin dolor</span><span>Moderado</span><span>Insoportable</span>
                </div>
              </div>

              {/* Olor */}
              <div className="space-y-2">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Olor<OptionalTag /></Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {odorOptions.map(o => {
                    const active = caseForm.odor === o.value;
                    return (
                      <button key={o.value} type="button" onClick={() => setCField('odor', o.value)}
                        className={cn(
                          "h-11 rounded-lg border font-body text-sm font-medium transition-all active:scale-95",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        )}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exudado */}
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5" /> Exudado<OptionalTag />
                </Label>

                <div className="space-y-1.5">
                  <p className="font-body text-[11px] text-muted-foreground">Cantidad</p>
                  <div className="flex flex-wrap gap-2">
                    {exudateAmountOptions.map(o => {
                      const active = caseForm.exudateAmount === o.value;
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setCField('exudateAmount', active ? undefined : o.value)}
                          className={cn(
                            "min-h-11 px-4 rounded-full border font-body text-sm font-medium transition-all active:scale-95",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50"
                          )}>{o.label}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-body text-[11px] text-muted-foreground">Tipo</p>
                  <div className="flex flex-wrap gap-2">
                    {exudateTypeOptions.map(o => {
                      const active = caseForm.exudateType === o.value;
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setCField('exudateType', active ? undefined : o.value)}
                          className={cn(
                            "min-h-11 px-4 rounded-full border font-body text-sm font-medium transition-all active:scale-95",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50"
                          )}>{o.label}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-body text-[11px] text-muted-foreground">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {exudateColorOptions.map(o => {
                      const active = caseForm.exudateColor === o.value;
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setCField('exudateColor', active ? undefined : o.value)}
                          className={cn(
                            "min-h-11 px-3 rounded-full border font-body text-sm font-medium transition-all active:scale-95 inline-flex items-center gap-2",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50"
                          )}>
                          <span className={cn("inline-block h-4 w-4 rounded-full shrink-0", o.swatch)} />
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Infección */}
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="case-has-infection" className="font-body text-sm font-semibold flex items-center gap-1.5">
                    <ShieldAlert className={cn("h-4 w-4", caseForm.hasInfectionSigns ? "text-destructive" : "text-muted-foreground")} />
                    ¿Presenta signos de infección?
                  </Label>
                  <Switch id="case-has-infection" checked={caseForm.hasInfectionSigns}
                    onCheckedChange={(v) => setCField('hasInfectionSigns', v)} />
                </div>

                {caseForm.hasInfectionSigns && (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {infectionSignFields.map(f => {
                        const checked = !!caseForm[f.key];
                        return (
                          <button key={f.key} type="button" onClick={() => setCField(f.key, !checked)}
                            className={cn(
                              "min-h-11 px-3 rounded-lg border font-body text-sm text-left flex items-center justify-between gap-2 transition-all active:scale-[0.98]",
                              checked
                                ? "bg-destructive/10 text-destructive border-destructive/40"
                                : "bg-background text-foreground border-border hover:border-destructive/30"
                            )}>
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
                      <Input type="number" inputMode="decimal" step="0.1" min="30" max="45"
                        value={caseForm.bodyTemperature}
                        onChange={e => setCField('bodyTemperature', e.target.value === '' ? '' : Number(e.target.value))}
                        className={cn(
                          "font-body h-11 tabular-nums",
                          typeof caseForm.bodyTemperature === 'number' && caseForm.bodyTemperature >= 38 && "border-destructive text-destructive font-semibold"
                        )}
                        placeholder="36.5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Procedimiento inicial */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Procedimiento inicial<OptionalTag /></Label>
                <Textarea value={caseForm.initialProcedure} onChange={e => setCField('initialProcedure', e.target.value)}
                  className="font-body" rows={3}
                  placeholder="Ej: Desbridamiento cortante, Lavado con SF, Aplicación de hidrogel..." />
              </div>

              {/* Materiales utilizados */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Material de curación utilizado<OptionalTag />
                </Label>
                <Textarea value={caseForm.initialMaterials} onChange={e => setCField('initialMaterials', e.target.value)}
                  className="font-body" rows={3}
                  placeholder="Ej: Apósito de espuma 10x10, Hidrogel, Gasas, Solución fisiológica..." />
              </div>

              {/* Plan de tratamiento */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan de tratamiento<OptionalTag /></Label>
                <Textarea value={caseForm.treatment} onChange={e => setCField('treatment', e.target.value)}
                  className="font-body" rows={2}
                  placeholder="Resumen del abordaje terapéutico planificado para este caso." />
              </div>

              {/* Observaciones (opcional) */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  Observaciones
                  <span className="font-body text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">(opcional)</span>
                </Label>
                <Textarea value={caseForm.initialObservations} onChange={e => setCField('initialObservations', e.target.value)}
                  className="font-body" rows={2}
                  placeholder="Notas adicionales, antecedentes relevantes, comentarios del paciente, etc." />
              </div>


              {/* Fotos (opcional) */}
              <div className="space-y-2">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  Fotos
                  <OptionalTag />
                </Label>
                <div className="flex gap-2">
                  <input
                    ref={caseCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => { handleCaseFileUpload(e.target.files); e.target.value = ''; }}
                  />
                  <input
                    ref={casePhotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => { handleCaseFileUpload(e.target.files); e.target.value = ''; }}
                  />
                  <Button type="button" variant="outline" size="sm" className="font-body flex-1 h-11" onClick={() => caseCameraInputRef.current?.click()}>
                    <Camera className="mr-1.5 h-4 w-4" /> Cámara
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="font-body flex-1 h-11" onClick={() => casePhotoInputRef.current?.click()}>
                    <Upload className="mr-1.5 h-4 w-4" /> Subir
                  </Button>
                </div>
                {casePhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {casePhotos.map(ph => (
                      <div key={ph.id} className="relative w-20 h-16 rounded-md overflow-hidden border border-border/50 group">
                        <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setCasePhotos(prev => prev.filter(p => p.id !== ph.id))}
                          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                          aria-label="Eliminar foto"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Aviso: se genera Evolución #1 automáticamente */}
              {!editingCase && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="font-body text-xs text-muted-foreground">
                    Al crear la herida se generará automáticamente la <span className="font-semibold text-foreground">Evolución #1</span> con los datos basales registrados aquí.
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border/50 bg-background px-4 sm:px-6 py-3 flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button variant="outline" onClick={() => setCaseDialogOpen(false)} className="font-body h-12 flex-1 sm:flex-none">Cancelar</Button>
              <Button onClick={handleSaveCase} className="font-body h-12 flex-[2] sm:flex-1 font-semibold">
                {editingCase ? 'Guardar cambios' : 'Crear herida'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <SharePatientDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          patientId={patient.id}
          patientName={`${patient.lastName}, ${patient.firstName}`}
        />
      </div>
    </AppLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-body text-[11px] uppercase tracking-wide text-muted-foreground leading-tight">{label}</p>
        <p className="font-body text-sm leading-snug truncate" title={value}>{value}</p>
      </div>
    </div>
  );
}
