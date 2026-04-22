import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, Edit, ChevronRight, CalendarClock, Activity } from 'lucide-react';
import { Patient, professionals } from '@/data/demoData';
import { getPatientIndicator, indicatorMeta, getActiveWoundCount, getLastEvolutionDate } from '@/lib/patientStatus';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const emptyPatient: Omit<Patient, 'id' | 'cases'> = {
  firstName: '', lastName: '', age: 0, gender: '', dni: '', phone: '',
  email: '', address: '', diagnosis: '', assignedProfessional: '', observations: '', admissionDate: '',
  controlIntervalDays: 7,
};

export default function Patients() {
  const { patients, addPatient, updatePatient, deletePatient } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyPatient);
  const [woundPickerPatient, setWoundPickerPatient] = useState<Patient | null>(null);

  const filtered = patients.filter(p =>
    `${p.firstName} ${p.lastName} ${p.dni} ${p.diagnosis}`.toLowerCase().includes(search.toLowerCase())
  );

  const isHealedPatient = (p: Patient) =>
    p.cases.length > 0 && p.cases.every(c => c.status === 'resuelto');

  const activePatients = filtered.filter(p => !isHealedPatient(p));
  const healedPatients = filtered.filter(isHealedPatient);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyPatient, admissionDate: new Date().toISOString().split('T')[0] });
    setDialogOpen(true);
  };

  const openEdit = (p: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(p);
    const { id, cases, ...rest } = p;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      updatePatient({ ...editing, ...form });
    } else {
      addPatient({ ...form, id: `p${Date.now()}`, cases: [] } as Patient);
    }
    setDialogOpen(false);
  };

  const setField = (key: string, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="heading-display text-2xl md:text-3xl">Pacientes</h1>
            <p className="font-body text-sm text-muted-foreground">{patients.length} pacientes registrados</p>
          </div>
          <Button onClick={openNew} className="font-body">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Paciente
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, DNI o diagnóstico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 font-body"
          />
        </div>

        {(() => {
          const renderCard = (p: Patient, dimmed = false) => {
            const indicator = getPatientIndicator(p);
            const meta = indicatorMeta[indicator];
            const activeCount = getActiveWoundCount(p);
            const lastEvo = getLastEvolutionDate(p);
            const firstActiveCase = p.cases.find(c => c.status !== 'resuelto');
            const handleNewEvo = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (firstActiveCase) {
                navigate(`/patients/${p.id}/cases/${firstActiveCase.id}?newEvo=1`);
              } else {
                navigate(`/patients/${p.id}`);
              }
            };
            return (
              <Card
                key={p.id}
                className={`border-border/50 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden ${dimmed ? 'opacity-75' : ''}`}
                onClick={() => navigate(`/patients/${p.id}`)}
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${meta.dotClass}`} aria-hidden />
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass} ring-2 ${meta.ringClass}`} aria-label={meta.label} />
                      <h3 className="font-body text-sm font-semibold truncate">{p.lastName}, {p.firstName}</h3>
                      <Badge variant="outline" className="font-body text-xs">{p.age} años</Badge>
                      <Badge variant="secondary" className="font-body text-xs">{p.gender}</Badge>
                      <Badge variant="outline" className={`font-body text-xs ${meta.textClass}`}>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="font-body text-xs text-muted-foreground mt-1 truncate">{p.diagnosis}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="font-body text-xs text-muted-foreground">DNI: {p.dni}</span>
                      <span className="font-body text-xs text-muted-foreground">· {p.assignedProfessional}</span>
                      <Badge variant="outline" className="font-body text-xs flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {activeCount} herida{activeCount !== 1 ? 's' : ''} activa{activeCount !== 1 ? 's' : ''}
                      </Badge>
                      {lastEvo ? (
                        <span className="font-body text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" /> Última evolución: {lastEvo}
                        </span>
                      ) : (
                        <span className="font-body text-xs text-muted-foreground italic">Sin evoluciones</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {firstActiveCase && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-body h-8 hidden sm:inline-flex border-primary/40 text-primary hover:bg-primary/5"
                        onClick={handleNewEvo}
                        title="Nueva evolución"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Nueva evolución
                      </Button>
                    )}
                    {firstActiveCase && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 sm:hidden border-primary/40 text-primary"
                        onClick={handleNewEvo}
                        title="Nueva evolución"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openEdit(p, e)}>
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
                          <AlertDialogTitle className="heading-display">¿Eliminar paciente?</AlertDialogTitle>
                          <AlertDialogDescription className="font-body">
                            Se eliminará a {p.firstName} {p.lastName} y todos sus casos. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="font-body">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePatient(p.id)} className="font-body bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          };

          if (filtered.length === 0) {
            return (
              <div className="text-center py-12">
                <p className="font-body text-muted-foreground">No se encontraron pacientes</p>
              </div>
            );
          }

          return (
            <div className="space-y-8">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="heading-display text-base">Pacientes con casos activos</h2>
                  <Badge variant="secondary" className="font-body text-xs">{activePatients.length}</Badge>
                </div>
                {activePatients.length > 0 ? (
                  <div className="grid gap-3">
                    {activePatients.map(p => renderCard(p, false))}
                  </div>
                ) : (
                  <p className="font-body text-sm text-muted-foreground italic">No hay pacientes con casos activos.</p>
                )}
              </section>

              {healedPatients.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <h2 className="heading-display text-base mt-4 text-muted-foreground">Pacientes curados</h2>
                    <Badge variant="outline" className="font-body text-xs mt-4">{healedPatients.length}</Badge>
                  </div>
                  <div className="grid gap-3">
                    {healedPatients.map(p => renderCard(p, true))}
                  </div>
                </section>
              )}
            </div>
          );
        })()}

        {/* Patient Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="heading-display text-xl">
                {editing ? 'Editar Paciente' : 'Nuevo Paciente'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="font-body text-sm">Nombre</Label>
                <Input value={form.firstName} onChange={e => setField('firstName', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Apellido</Label>
                <Input value={form.lastName} onChange={e => setField('lastName', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Edad</Label>
                <Input type="number" value={form.age || ''} onChange={e => setField('age', parseInt(e.target.value) || 0)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Género</Label>
                <Select value={form.gender} onValueChange={v => setField('gender', v)}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">DNI</Label>
                <Input value={form.dni} onChange={e => setField('dni', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Teléfono</Label>
                <Input value={form.phone} onChange={e => setField('phone', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Email</Label>
                <Input value={form.email} onChange={e => setField('email', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Dirección</Label>
                <Input value={form.address} onChange={e => setField('address', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Diagnóstico</Label>
                <Textarea value={form.diagnosis} onChange={e => setField('diagnosis', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Profesional asignado</Label>
                <Select value={form.assignedProfessional} onValueChange={v => setField('assignedProfessional', v)}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {professionals.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Fecha de ingreso</Label>
                <Input type="date" value={form.admissionDate} onChange={e => setField('admissionDate', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Intervalo entre controles (días)</Label>
                <Input type="number" min={1} max={90} value={form.controlIntervalDays} onChange={e => setField('controlIntervalDays', e.target.value)} className="font-body" placeholder="ej: 7" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Observaciones</Label>
                <Textarea value={form.observations} onChange={e => setField('observations', e.target.value)} className="font-body" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-body">Cancelar</Button>
              <Button onClick={handleSave} className="font-body">{editing ? 'Guardar cambios' : 'Crear paciente'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
