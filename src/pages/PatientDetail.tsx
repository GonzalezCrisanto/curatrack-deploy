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
import {
  ArrowLeft, Plus, Edit, Trash2, ChevronRight, Phone, MapPin, Mail, CalendarClock, CalendarDays,
  FileDown, ShieldAlert, BadgeCheck, UserCog, FileDown as FileDownIcon, Users as UsersIcon,
} from 'lucide-react';
import { exportPatientPdf } from '@/lib/exportPdf';
import {
  WoundCase, Photo, woundTypes, woundStatuses, getStatusLabel, professionals,
} from '@/data/demoData';
import { ROLE_LABEL_SHORT } from '@/data/demoUsers';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SharePatientDialog } from '@/components/SharePatientDialog';
import { WoundForm } from '@/components/WoundForm';
import { PatientConsentCard } from '@/components/PatientConsentCard';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { formatPatientAge } from '@/lib/age';

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

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patients, deleteCase, addEvolution, updatePatient, currentUserName, turnos, createTurno } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const [woundFormOpen, setWoundFormOpen] = useState(false);
  const [editingWound, setEditingWound] = useState<WoundCase | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Patient edit dialog
  const [patientEditOpen, setPatientEditOpen] = useState(false);
  const [patientForm, setPatientForm] = useState({
    firstName: '', lastName: '', age: '', birthDate: '', gender: '', dni: '', phone: '',
    email: '', address: '', diagnosis: '', assignedProfessional: '', observations: '',
    admissionDate: '', allergies: '', insurance: '',
    emergencyContactName: '', emergencyContactPhone: '', treatingDoctorName: '', treatingDoctorPhone: '',
  });

  const openPatientEdit = () => {
    setPatientForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: patient.age ? String(patient.age) : '',
      birthDate: patient.birthDate || '',
      gender: patient.gender || '',
      dni: patient.dni || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      diagnosis: patient.diagnosis || '',
      assignedProfessional: patient.assignedProfessional || '',
      observations: patient.observations || '',
      admissionDate: patient.admissionDate || '',
      allergies: patient.allergies || '',
      insurance: patient.insurance || '',
      emergencyContactName: patient.emergencyContactName || '',
      emergencyContactPhone: patient.emergencyContactPhone || '',
      treatingDoctorName: patient.treatingDoctorName || '',
      treatingDoctorPhone: patient.treatingDoctorPhone || '',
    });
    setPatientEditOpen(true);
  };

  const handleSavePatient = async () => {
    if (!patientForm.firstName.trim() || !patientForm.lastName.trim()) return;
    await updatePatient({
      ...patient,
      firstName: patientForm.firstName.trim(),
      lastName: patientForm.lastName.trim(),
      age: patientForm.age ? Number(patientForm.age) : 0,
      birthDate: patientForm.birthDate || undefined,
      gender: patientForm.gender,
      dni: patientForm.dni,
      phone: patientForm.phone,
      email: patientForm.email,
      address: patientForm.address,
      diagnosis: patientForm.diagnosis,
      assignedProfessional: patientForm.assignedProfessional,
      observations: patientForm.observations,
      admissionDate: patientForm.admissionDate,
      allergies: patientForm.allergies,
      insurance: patientForm.insurance,
      emergencyContactName: patientForm.emergencyContactName,
      emergencyContactPhone: patientForm.emergencyContactPhone,
      treatingDoctorName: patientForm.treatingDoctorName,
      treatingDoctorPhone: patientForm.treatingDoctorPhone,
    });
    setPatientEditOpen(false);
  };

  const setPField = <K extends keyof typeof patientForm>(key: K, value: string) =>
    setPatientForm(prev => ({ ...prev, [key]: value }));

  // New appointment dialog state
  const [apptDialogOpen, setApptDialogOpen] = useState(false);
  const [apptCaseId, setApptCaseId] = useState<string>('');
  const [apptDate, setApptDate] = useState<string>('');
  const [apptTime, setApptTime] = useState<string>('09:00');
  const [apptNotes, setApptNotes] = useState<string>('');

  // Compute conflicts for currently selected appointment date (must run before early return)
  // Includes both the current patient's own appointments and other patients' appointments.
  const apptConflicts = useMemo(() => {
    if (!apptDate) return [] as { patientName: string; time: string; woundType: string; isCurrent: boolean }[];
    return turnos
      .filter(t => t.status !== 'cancelado' && t.date === apptDate)
      .map(t => {
        const p = patients.find(pp => pp.id === t.patientId);
        const c = p?.cases.find(cc => cc.id === t.caseId);
        return {
          patientName: t.patientId === patientId ? 'Este paciente' : (p ? `${p.lastName}, ${p.firstName}` : ''),
          time: t.time || '',
          woundType: c?.woundType || '',
          isCurrent: t.patientId === patientId,
        };
      });
  }, [turnos, patients, patientId, apptDate]);

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
        <Button variant="outline" onClick={() => navigate('/dashboard')} className="font-body border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
        </Button>
      </div>
    </AppLayout>
  );

  const sharedCount = 0;

  const handleSaveAppointment = async () => {
    if (!apptCaseId || !apptDate) return;
    await createTurno({ caseId: apptCaseId, patientId: patient.id, date: apptDate, time: apptTime, notes: apptNotes.trim() || undefined });
    setApptDialogOpen(false);
    setApptNotes('');
  };

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="font-body text-sm border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="font-body" onClick={openPatientEdit}>
              <Edit className="mr-2 h-4 w-4" /> Editar paciente
            </Button>
            <Button variant="outline" size="sm" className="font-body" onClick={() => exportPatientPdf(patient, turnos)}>
              <FileDown className="mr-2 h-4 w-4" /> Exportar Historia Clínica
            </Button>
          </div>
        </div>

        {/* Patient header (name + pill) */}
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="heading-display text-2xl truncate">{patient.lastName}, {patient.firstName}</h1>
          </div>
          {/* owner badge removed as requested */}
        </div>

        {/* Patient info (card) */}
        <Card className="border-border/50">
          <CardContent className="space-y-4 pt-6 pb-4">
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-body text-lg font-semibold truncate" title={patient.address}>{patient.address || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-body text-lg font-semibold truncate" title={patient.phone}>{patient.phone || '—'}</p>
                  </div>
                </div>
              </div>
              <Separator className="my-4" />

              {/* Secondary personal data */}
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <div>
                  <p className="font-body text-[11px] uppercase tracking-wide">Edad</p>
                  <p className="font-body">{formatPatientAge(patient)}</p>
                </div>
                <div>
                  <p className="font-body text-[11px] uppercase tracking-wide">DNI / Documento</p>
                  <p className="font-body">{patient.dni || '—'}</p>
                </div>
                <div>
                  <p className="font-body text-[11px] uppercase tracking-wide">Email</p>
                  <p className="font-body">{patient.email || '—'}</p>
                </div>
                <div>
                  <p className="font-body text-[11px] uppercase tracking-wide">Fecha de ingreso</p>
                  <p className="font-body">{patient.admissionDate || '—'}</p>
                </div>
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
            {(patient.insurance || patient.emergencyContactName || patient.emergencyContactPhone || patient.treatingDoctorName || patient.treatingDoctorPhone) && (
              <div className="pt-3 border-t border-border/50">
                <p className="font-body text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Datos administrativos y contacto</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                  {patient.treatingDoctorName && <InfoRow icon={<UserCog className="h-3.5 w-3.5" />} label="Médico tratante" value={patient.treatingDoctorName} />}
                  {patient.treatingDoctorPhone && <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Tel. médico" value={patient.treatingDoctorPhone} />}
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

        {/* Consentimiento informado */}
        <PatientConsentCard patientId={patient.id} patientName={`${patient.firstName} ${patient.lastName}`} patientDni={patient.dni} />

        {/* Casos / Heridas */}
        <div className="flex items-center justify-between">
          <h2 className="heading-display text-xl">Heridas</h2>
          <Button onClick={() => { setEditingWound(null); setWoundFormOpen(true); }} className="font-body" size="sm">
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
                    <span>{c.evolutions.length} evoluciones</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); setEditingWound(c); setWoundFormOpen(true); }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {patient.cases.length === 0 && (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <p className="font-body text-muted-foreground">No hay heridas registradas</p>
              <Button variant="outline" className="font-body mt-3" onClick={() => { setEditingWound(null); setWoundFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Crear primera Herida
              </Button>
            </div>
          )}
        </div>

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

          // Existing appointments grouped by case (from the turnos table, excluding cancelled)
          const activeCaseIds = new Set(activeCases.map(c => c.id));
          const patientTurnos = turnos.filter(t => t.patientId === patient.id && t.status !== 'cancelado');

          const appointmentsByCase = patientTurnos
            .filter(t => activeCaseIds.has(t.caseId) && new Date(t.date + 'T12:00:00') >= today)
            .map(t => {
              const c = activeCases.find(cc => cc.id === t.caseId)!;
              return {
                date: new Date(t.date + 'T12:00:00'),
                caseId: t.caseId,
                status: c.status,
                woundType: c.woundType,
                anatomicalLocation: c.anatomicalLocation,
              };
            });

          // Appointments from OTHER patients (to avoid scheduling clashes)
          const otherPatientsAppointments = turnos
            .filter(t => t.patientId !== patient.id && t.status !== 'cancelado' && new Date(t.date + 'T12:00:00') >= today)
            .map(t => {
              const p = patients.find(pp => pp.id === t.patientId);
              const c = p?.cases.find(cc => cc.id === t.caseId);
              return {
                date: new Date(t.date + 'T12:00:00'),
                time: t.time || '',
                patientName: p ? `${p.lastName}, ${p.firstName}` : '',
                woundType: c?.woundType || '',
              };
            });
          const otherDates = otherPatientsAppointments.map(a => a.date);

          // Build dynamic modifiers: one modifier key per case
          const modifiers: Record<string, Date[]> = { other: otherDates };
          const modifiersStyles: Record<string, React.CSSProperties> = {
            other: {
              backgroundColor: 'hsl(var(--muted))',
              color: 'hsl(var(--muted-foreground))',
              borderRadius: '9999px',
              border: '1.5px solid hsl(var(--muted-foreground) / 0.4)',
              opacity: 0.7,
            },
          };

          // Group existing appointments by date to support multiple wounds per day
          const apptByDate = new Map<string, { date: Date; caseIds: Set<string> }>();
          appointmentsByCase.forEach(a => {
            const ds = a.date.toISOString().split('T')[0];
            if (!apptByDate.has(ds)) apptByDate.set(ds, { date: a.date, caseIds: new Set() });
            apptByDate.get(ds)!.caseIds.add(a.caseId);
          });

          // Single-case days: one modifier per case (solid color)
          activeCases.forEach(c => {
            const dates = Array.from(apptByDate.values())
              .filter(g => g.caseIds.size === 1 && g.caseIds.has(c.id))
              .map(g => g.date);
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
          });

          // Multi-case days: one modifier per unique combo, with conic-gradient colors
          const multiGroups = Array.from(apptByDate.values()).filter(g => g.caseIds.size > 1);
          const multiBuckets = new Map<string, { dates: Date[]; ids: string[] }>();
          multiGroups.forEach(g => {
            const ids = Array.from(g.caseIds).sort();
            const key = ids.join('|');
            if (!multiBuckets.has(key)) multiBuckets.set(key, { dates: [], ids });
            multiBuckets.get(key)!.dates.push(g.date);
          });
          let mIdx = 0;
          multiBuckets.forEach(bucket => {
            const key = `multi_${mIdx++}`;
            modifiers[key] = bucket.dates;
            const colors = bucket.ids.map(id => caseColor[id]).filter(Boolean);
            const slice = 100 / colors.length;
            const stops = colors
              .map((col, i) => `${col} ${i * slice}% ${(i + 1) * slice}%`)
              .join(', ');
            modifiersStyles[key] = {
              background: `conic-gradient(${stops})`,
              color: '#fff',
              borderRadius: '9999px',
              fontWeight: 700,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
            };
          });

          const openNewAppointment = (preselectDate?: string, preselectCaseId?: string) => {
            const caseId = preselectCaseId || activeCases[0]?.id || '';
            setApptCaseId(caseId);

            // Default date: 7 days ahead of today.
            const defaultDate = preselectDate
              || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            setApptDate(defaultDate);

            // Default time: first 15-min slot from 09:00 not colliding with any appointment that day.
            const takenThatDay = new Set<string>();
            turnos.forEach(t => {
              if (t.status !== 'cancelado' && t.date === defaultDate && t.time) takenThatDay.add(t.time);
            });
            setApptTime(pickAvailableTime(takenThatDay));
            setApptNotes('');

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
                      selected={appointmentsByCase.map(a => a.date)}
                      className="p-3 pointer-events-auto rounded-lg border border-border/50"
                      modifiers={modifiers}
                      modifiersStyles={modifiersStyles}
                    />
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 px-1 w-full max-w-[280px]">
                      {activeCases.map(c => (
                        <div key={`leg-${c.id}`} className="flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: caseColor[c.id] }}
                          />
                          <span className="font-body text-xs text-muted-foreground">
                            {c.anatomicalLocation || c.woundType}
                          </span>
                        </div>
                      ))}
                      {Array.from(apptByDate.values()).some(g => g.caseIds.size > 1) && (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ background: 'conic-gradient(hsl(var(--primary)) 0 50%, hsl(var(--destructive)) 50% 100%)' }}
                          />
                          <span className="font-body text-xs text-muted-foreground">Varias heridas</span>
                        </div>
                      )}
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
                    {appointmentsByCase.length > 0 ? (() => {
                      // Keep only the earliest upcoming appointment per case
                      const nextByCase = new Map<string, typeof appointmentsByCase[number]>();
                      [...appointmentsByCase]
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .forEach(ap => {
                          if (!nextByCase.has(ap.caseId)) nextByCase.set(ap.caseId, ap);
                        });
                      return Array.from(nextByCase.values())
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
                      ));
                    })() : (
                      <p className="font-body text-sm text-muted-foreground">No hay turnos programados.</p>
                    )}

                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        

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
                      turnos.forEach(t => {
                        if (t.status !== 'cancelado' && t.date === newDate && t.time) takenThatDay.add(t.time);
                      });
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

              <div className="space-y-1.5">
                <Label className="font-body text-sm">Notas (opcional)</Label>
                <Textarea
                  value={apptNotes}
                  onChange={e => setApptNotes(e.target.value)}
                  placeholder="Ej: traer resultados de laboratorio"
                  className="font-body"
                  rows={2}
                />
              </div>

              {apptConflicts.length > 0 && (() => {
                const own = apptConflicts.filter(c => c.isCurrent);
                const others = apptConflicts.filter(c => !c.isCurrent);
                const sorted = [...apptConflicts].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                return (
                  <div className="rounded-md border border-warning/50 bg-warning/10 p-3 space-y-1.5">
                    <p className="font-body text-xs font-semibold text-warning">
                      ℹ Ese día ya tenés {apptConflicts.length} turno{apptConflicts.length !== 1 ? 's' : ''} agendado{apptConflicts.length !== 1 ? 's' : ''}
                      {own.length > 0 && others.length > 0
                        ? ` (${own.length} de este paciente, ${others.length} de otros)`
                        : own.length > 0
                          ? ' de este paciente'
                          : ' de otros pacientes'}:
                    </p>
                    <ul className="space-y-0.5">
                      {sorted.slice(0, 8).map((c, i) => (
                        <li key={i} className="font-body text-[11px] text-warning/90">
                          • {c.time || '—'} · {c.patientName} ({c.woundType})
                        </li>
                      ))}
                      {sorted.length > 8 && (
                        <li className="font-body text-[11px] text-warning/70">
                          …y {sorted.length - 8} más
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setApptDialogOpen(false)} className="font-body">Cancelar</Button>
              <Button
                onClick={handleSaveAppointment}
                disabled={!apptCaseId || !apptDate || apptTakenTimes.has(apptTime)}
                className="font-body"
              >
                Guardar turno
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Patient Edit Dialog */}
        <Dialog open={patientEditOpen} onOpenChange={setPatientEditOpen}>
          <DialogContent className="max-w-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 gap-0 flex flex-col rounded-none sm:rounded-lg">
            <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b border-border/50 shrink-0">
              <DialogTitle className="heading-display text-lg">Editar paciente</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
              {/* Datos básicos */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre <RequiredMark /></Label>
                  <Input value={patientForm.firstName} onChange={e => setPField('firstName', e.target.value)} className="font-body h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Apellido <RequiredMark /></Label>
                  <Input value={patientForm.lastName} onChange={e => setPField('lastName', e.target.value)} className="font-body h-11" />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha de nacimiento<OptionalTag /></Label>
                  <Input type="date" value={patientForm.birthDate} onChange={e => setPField('birthDate', e.target.value)} className="font-body h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Edad<OptionalTag /></Label>
                  <Input type="number" inputMode="numeric" min="0" value={patientForm.age} onChange={e => setPField('age', e.target.value)} className="font-body h-11" placeholder="Ej: 65" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sexo<OptionalTag /></Label>
                  <Select value={patientForm.gender} onValueChange={v => setPField('gender', v)}>
                    <SelectTrigger className="font-body h-11"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">DNI / Documento<OptionalTag /></Label>
                  <Input value={patientForm.dni} onChange={e => setPField('dni', e.target.value)} className="font-body h-11" placeholder="Ej: 12.345.678" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teléfono<OptionalTag /></Label>
                  <Input value={patientForm.phone} onChange={e => setPField('phone', e.target.value)} className="font-body h-11" placeholder="Ej: +54 11 1234-5678" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email<OptionalTag /></Label>
                  <Input type="email" value={patientForm.email} onChange={e => setPField('email', e.target.value)} className="font-body h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Domicilio<OptionalTag /></Label>
                  <Input value={patientForm.address} onChange={e => setPField('address', e.target.value)} className="font-body h-11" />
                </div>
              </div>

              {/* Datos clínicos */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Antecedentes y comorbilidades<OptionalTag /></Label>
                <Textarea value={patientForm.diagnosis} onChange={e => setPField('diagnosis', e.target.value)} className="font-body" rows={3} placeholder="Ej: Diabetes mellitus tipo 2, HTA, obesidad..." />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alergias<OptionalTag /></Label>
                <Input value={patientForm.allergies} onChange={e => setPField('allergies', e.target.value)} className="font-body h-11" placeholder="Ej: Penicilina, AINEs..." />
              </div>

              {/* Cobertura y contacto de emergencia */}
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cobertura y contacto de emergencia</p>
                <div className="space-y-1.5">
                  <Label className="font-body text-[11px] text-muted-foreground">Obra social / Cobertura</Label>
                  <Input value={patientForm.insurance} onChange={e => setPField('insurance', e.target.value)} className="font-body h-11" placeholder="Ej: OSDE 310, PAMI, Swiss Medical..." />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-body text-[11px] text-muted-foreground">Nombre contacto de emergencia</Label>
                    <Input value={patientForm.emergencyContactName} onChange={e => setPField('emergencyContactName', e.target.value)} className="font-body h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-body text-[11px] text-muted-foreground">Tel. contacto de emergencia</Label>
                    <Input value={patientForm.emergencyContactPhone} onChange={e => setPField('emergencyContactPhone', e.target.value)} className="font-body h-11" />
                  </div>
                </div>
              </div>

              {/* Médico tratante */}
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Médico tratante</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-body text-[11px] text-muted-foreground">Nombre</Label>
                    <Input value={patientForm.treatingDoctorName} onChange={e => setPField('treatingDoctorName', e.target.value)} className="font-body h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-body text-[11px] text-muted-foreground">Teléfono</Label>
                    <Input value={patientForm.treatingDoctorPhone} onChange={e => setPField('treatingDoctorPhone', e.target.value)} className="font-body h-11" />
                  </div>
                </div>
              </div>

              {/* Datos administrativos */}
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profesional asignado<OptionalTag /></Label>
                <Input value={patientForm.assignedProfessional} onChange={e => setPField('assignedProfessional', e.target.value)} className="font-body h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha de ingreso<OptionalTag /></Label>
                <Input type="date" value={patientForm.admissionDate} onChange={e => setPField('admissionDate', e.target.value)} className="font-body h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observaciones generales<OptionalTag /></Label>
                <Textarea value={patientForm.observations} onChange={e => setPField('observations', e.target.value)} className="font-body" rows={3} />
              </div>
            </div>
            <div className="shrink-0 border-t border-border/50 bg-background px-4 sm:px-6 py-3 flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button variant="outline" onClick={() => setPatientEditOpen(false)} className="font-body h-12 flex-1 sm:flex-none">Cancelar</Button>
              <Button onClick={handleSavePatient} disabled={!patientForm.firstName.trim() || !patientForm.lastName.trim()} className="font-body h-12 flex-[2] sm:flex-1 font-semibold">
                Guardar cambios
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

        <WoundForm
          open={woundFormOpen}
          onOpenChange={(o) => { setWoundFormOpen(o); if (!o) setEditingWound(null); }}
          patient={patient}
          editingCase={editingWound}
        />
        </div>
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
