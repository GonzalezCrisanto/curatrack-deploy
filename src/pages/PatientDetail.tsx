import { useState, useMemo } from 'react';
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
import { ArrowLeft, Plus, Edit, Trash2, ChevronRight, User, Phone, Mail, MapPin, Stethoscope, CalendarClock, Clock, FileDown } from 'lucide-react';
import { exportPatientPdf } from '@/lib/exportPdf';
import { WoundCase, woundTypes, woundStatuses, getStatusLabel, professionals } from '@/data/demoData';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const statusBadgeClass: Record<string, string> = {
  activo: 'bg-info/10 text-info border-info/30',
  en_mejoria: 'bg-success/10 text-success border-success/30',
  critico: 'bg-destructive/10 text-destructive border-destructive/30',
  resuelto: 'bg-success/15 text-success border-success/40',
};

const emptyCase: { woundType: string; anatomicalLocation: string; startDate: string; size: string; depth: string; exudate: string; infection: string; pain: string; treatment: string; status: 'activo' | 'en_mejoria' | 'critico' | 'resuelto' } = {
  woundType: '', anatomicalLocation: '', startDate: '', size: '', depth: '',
  exudate: '', infection: '', pain: '', treatment: '', status: 'activo',
};

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patients, addCase, updateCase, deleteCase } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<WoundCase | null>(null);
  const [caseForm, setCaseForm] = useState(emptyCase);

  if (!patient) return <AppLayout><div className="p-8 text-center font-body text-muted-foreground">Paciente no encontrado</div></AppLayout>;

  const openNewCase = () => {
    setEditingCase(null);
    setCaseForm({ ...emptyCase, startDate: new Date().toISOString().split('T')[0] });
    setCaseDialogOpen(true);
  };

  const openEditCase = (c: WoundCase, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCase(c);
    const { id, patientId, evolutions, photos, ...rest } = c;
    setCaseForm(rest);
    setCaseDialogOpen(true);
  };

  const handleSaveCase = () => {
    if (editingCase) {
      updateCase(patient.id, { ...editingCase, ...caseForm });
    } else {
      addCase(patient.id, { ...caseForm, id: `c${Date.now()}`, patientId: patient.id, evolutions: [], photos: [] } as WoundCase);
    }
    setCaseDialogOpen(false);
  };

  const setCField = (key: string, value: string) => setCaseForm(prev => ({ ...prev, [key]: value }));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/patients')} className="font-body text-sm -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a pacientes
          </Button>
          <Button variant="outline" size="sm" className="font-body" onClick={() => exportPatientPdf(patient)}>
            <FileDown className="mr-2 h-4 w-4" /> Exportar Historia Clínica
          </Button>
        </div>

        {/* Patient info */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="heading-display text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {patient.lastName}, {patient.firstName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoRow icon={<User className="h-4 w-4" />} label="Edad / Género" value={`${patient.age} años · ${patient.gender}`} />
                <InfoRow icon={<User className="h-4 w-4" />} label="DNI" value={patient.dni} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Teléfono" value={patient.phone} />
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={patient.email} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Dirección" value={patient.address} />
                <InfoRow icon={<Stethoscope className="h-4 w-4" />} label="Profesional" value={patient.assignedProfessional} />
                <InfoRow icon={<Clock className="h-4 w-4" />} label="Intervalo entre controles" value={`Cada ${patient.controlIntervalDays} día${patient.controlIntervalDays !== 1 ? 's' : ''}`} />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Diagnóstico</p>
                <p className="font-body text-sm">{patient.diagnosis}</p>
              </div>
              {patient.observations && (
                <div>
                  <p className="font-body text-xs text-muted-foreground mb-1">Observaciones</p>
                  <p className="font-body text-sm">{patient.observations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6 text-center">
              <div className="heading-display text-4xl text-primary mb-1">{patient.cases.length}</div>
              <p className="font-body text-sm text-muted-foreground">Casos / Heridas</p>
              <div className="mt-4 space-y-2">
                {woundStatuses.map(s => {
                  const count = patient.cases.filter(c => c.status === s.value).length;
                  return count > 0 ? (
                    <div key={s.value} className="flex items-center justify-between">
                      <Badge className={`font-body text-xs ${statusBadgeClass[s.value]}`}>{s.label}</Badge>
                      <span className="font-body text-sm font-medium">{count}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendario de Turnos del Paciente */}
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Collect existing next-control dates from evolutions
          const appointmentsByCase = patient.cases
            .filter(c => c.status !== 'resuelto')
            .flatMap(c => c.evolutions
              .filter(e => e.nextControl && e.nextControl.trim() !== '' && new Date(e.nextControl + 'T12:00:00') >= today)
              .map(e => ({ date: new Date(e.nextControl + 'T12:00:00'), caseId: c.id, status: c.status, woundType: c.woundType }))
            );

          // Generate suggested future dates based on interval
          const interval = patient.controlIntervalDays || 7;
          const suggestedDates: Date[] = [];
          const existingDateStrings = new Set(appointmentsByCase.map(a => a.date.toISOString().split('T')[0]));
          for (let i = 1; i <= 8; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + interval * i);
            const ds = d.toISOString().split('T')[0];
            if (!existingDateStrings.has(ds)) {
              suggestedDates.push(new Date(d));
            }
          }

          const criticalDates = appointmentsByCase.filter(a => a.status === 'critico').map(a => a.date);
          const activeDates = appointmentsByCase.filter(a => a.status === 'activo').map(a => a.date);
          const improvingDates = appointmentsByCase.filter(a => a.status === 'en_mejoria').map(a => a.date);

          const modifiers = {
            critical: criticalDates,
            active: activeDates,
            improving: improvingDates,
            suggested: suggestedDates,
          };

          const modifiersStyles = {
            critical: { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))', borderRadius: '9999px' },
            active: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '9999px' },
            improving: { backgroundColor: 'hsl(var(--success))', color: '#fff', borderRadius: '9999px' },
            suggested: { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))', borderRadius: '9999px', border: '2px dashed hsl(var(--primary) / 0.5)' },
          };

          return (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="heading-display text-lg flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Calendario de Controles
                  <Badge variant="outline" className="font-body text-xs ml-2">Cada {interval} día{interval !== 1 ? 's' : ''}</Badge>
                </CardTitle>
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
                      {criticalDates.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded-full bg-destructive" />
                          <span className="font-body text-xs text-muted-foreground">Crítico</span>
                        </div>
                      )}
                      {activeDates.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded-full bg-primary" />
                          <span className="font-body text-xs text-muted-foreground">Activo</span>
                        </div>
                      )}
                      {improvingDates.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded-full bg-success" />
                          <span className="font-body text-xs text-muted-foreground">En mejoría</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full border-2 border-dashed border-primary/50 bg-accent" />
                        <span className="font-body text-xs text-muted-foreground">Sugerido</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <h3 className="font-body text-sm font-semibold text-muted-foreground">Próximos turnos programados</h3>
                    {appointmentsByCase.length > 0 ? appointmentsByCase
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .map((ap, i) => (
                        <div
                          key={`ap-${i}`}
                          className="p-3 rounded-lg border border-border/50 bg-card hover:shadow-sm transition-shadow cursor-pointer"
                          onClick={() => navigate(`/patients/${patient.id}/cases/${ap.caseId}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CalendarClock className="h-4 w-4 text-primary" />
                              <span className="font-body text-sm font-semibold text-primary">{ap.date.toISOString().split('T')[0]}</span>
                            </div>
                            <Badge className={`font-body text-xs ${statusBadgeClass[ap.status]}`}>{getStatusLabel(ap.status)}</Badge>
                          </div>
                          <p className="font-body text-sm mt-1">{ap.woundType}</p>
                        </div>
                      )) : (
                      <p className="font-body text-sm text-muted-foreground">No hay turnos programados.</p>
                    )}

                    {suggestedDates.length > 0 && (
                      <>
                        <h3 className="font-body text-sm font-semibold text-muted-foreground mt-4">Fechas sugeridas (cada {interval} días)</h3>
                        <div className="flex flex-wrap gap-2">
                          {suggestedDates.slice(0, 6).map((d, i) => (
                            <Badge key={`sug-${i}`} variant="outline" className="font-body text-xs border-dashed border-primary/50">
                              {d.toISOString().split('T')[0]}
                            </Badge>
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
            <Plus className="mr-2 h-4 w-4" /> Nuevo Caso
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
        <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="heading-display text-xl">{editingCase ? 'Editar Caso' : 'Nuevo Caso'}</DialogTitle>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="font-body text-sm">Tipo de herida</Label>
                <Select value={caseForm.woundType} onValueChange={v => setCField('woundType', v)}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {woundTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Ubicación anatómica</Label>
                <Input value={caseForm.anatomicalLocation} onChange={e => setCField('anatomicalLocation', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Fecha de inicio</Label>
                <Input type="date" value={caseForm.startDate} onChange={e => setCField('startDate', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Tamaño</Label>
                <Input value={caseForm.size} onChange={e => setCField('size', e.target.value)} placeholder="ej: 8 x 6 cm" className="font-body" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Profundidad</Label>
                <Input value={caseForm.depth} onChange={e => setCField('depth', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Exudado</Label>
                <Input value={caseForm.exudate} onChange={e => setCField('exudate', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Infección</Label>
                <Input value={caseForm.infection} onChange={e => setCField('infection', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Dolor</Label>
                <Input value={caseForm.pain} onChange={e => setCField('pain', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Estado</Label>
                <Select value={caseForm.status} onValueChange={v => setCField('status', v)}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {woundStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Tratamiento</Label>
                <Textarea value={caseForm.treatment} onChange={e => setCField('treatment', e.target.value)} className="font-body" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setCaseDialogOpen(false)} className="font-body">Cancelar</Button>
              <Button onClick={handleSaveCase} className="font-body">{editingCase ? 'Guardar cambios' : 'Crear caso'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="font-body text-xs text-muted-foreground">{label}</p>
        <p className="font-body text-sm">{value}</p>
      </div>
    </div>
  );
}
