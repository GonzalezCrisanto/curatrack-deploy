import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import NewPatientDialog from '@/components/NewPatientDialog';
import { Plus, Search, Trash2, Edit, ChevronRight, CalendarClock, Activity, ArrowLeft } from 'lucide-react';
import { Patient, professionals } from '@/data/demoData';
import { formatPatientAge } from '@/lib/age';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { getPatientIndicator, indicatorMeta, getActiveWoundCount, getLastEvolutionDate } from '@/lib/patientStatus';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const FILTER_LABELS: Record<string, string> = {
  patients: 'Todos los pacientes',
  active: 'Casos activos',
  critical: 'Casos críticos',
  improving: 'En mejoría',
  resolved: 'Resueltos',
  evolutions: 'Con evoluciones',
};

export default function Patients() {
  const { patients, addPatient, updatePatient, deletePatient } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterKey = searchParams.get('filter') || 'all';
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [woundPickerPatient, setWoundPickerPatient] = useState<Patient | null>(null);

  const statusFiltered = useMemo(() => {
    switch (filterKey) {
      case 'active':
        return patients.filter(p => p.cases.some(c => c.status === 'activo' || c.status === 'critico' || c.status === 'en_mejoria'));
      case 'critical':
        return patients.filter(p => p.cases.some(c => c.status === 'critico'));
      case 'improving':
        return patients.filter(p => p.cases.some(c => c.status === 'en_mejoria'));
      case 'resolved':
        return patients.filter(p => p.cases.length > 0 && p.cases.every(c => c.status === 'resuelto'));
      case 'evolutions':
        return patients.filter(p => p.cases.some(c => c.evolutions.length > 0));
      case 'patients':
      case 'all':
      default:
        return patients;
    }
  }, [patients, filterKey]);

  const filtered = statusFiltered.filter(p =>
    `${p.firstName} ${p.lastName} ${p.dni} ${p.diagnosis}`.toLowerCase().includes(search.toLowerCase())
  );

  const isHealedPatient = (p: Patient) =>
    p.cases.length > 0 && p.cases.every(c => c.status === 'resuelto');

  const activePatients = filtered.filter(p => !isHealedPatient(p));
  const healedPatients = filtered.filter(isHealedPatient);

  const clearFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('filter');
    setSearchParams(next, { replace: true });
  };

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    openNew();
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openEdit = (p: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(p);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="font-body text-sm border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="heading-display text-2xl md:text-3xl">Pacientes</h1>
            <p className="font-body text-sm text-muted-foreground">
              {filterKey !== 'all' && filterKey !== 'patients'
                ? `${filtered.length} de ${patients.length} pacientes`
                : `${patients.length} pacientes registrados`}
            </p>
            {FILTER_LABELS[filterKey] && filterKey !== 'all' && filterKey !== 'patients' && (
              <Badge
                variant="secondary"
                className="font-body text-[11px] gap-1 mt-2 cursor-pointer hover:bg-secondary/80"
                onClick={clearFilter}
              >
                Filtro: {FILTER_LABELS[filterKey]}
                <span aria-hidden>×</span>
              </Badge>
            )}
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
            const activeCases = p.cases.filter(c => c.status !== 'resuelto');
            const firstActiveCase = activeCases[0];
            const handleNewEvo = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (activeCases.length >= 2) {
                setWoundPickerPatient(p);
                return;
              }
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
                      <Badge variant="outline" className="font-body text-xs">{formatPatientAge(p)}</Badge>
                      <Badge variant="secondary" className="font-body text-xs">{p.gender}</Badge>
                      <Badge variant="outline" className={`font-body text-xs ${meta.textClass}`}>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="font-body text-xs text-muted-foreground mt-1 truncate">{p.diagnosis}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="font-body text-xs text-muted-foreground">DNI: {p.dni}</span>
                      {p.admissionDate && (
                        <span className="font-body text-xs text-muted-foreground">· Ingreso: {p.admissionDate}</span>
                      )}
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

        <NewPatientDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

        {/* Wound picker dialog — when patient has 2+ active wounds */}
        <Dialog open={!!woundPickerPatient} onOpenChange={(open) => !open && setWoundPickerPatient(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="heading-display text-lg">Seleccioná la herida</DialogTitle>
            </DialogHeader>
            {woundPickerPatient && (
              <div className="space-y-3 mt-2">
                <p className="font-body text-sm text-muted-foreground">
                  {woundPickerPatient.firstName} {woundPickerPatient.lastName} tiene varias heridas activas. Elegí a cuál corresponde la nueva evolución:
                </p>
                <div className="space-y-2">
                  {woundPickerPatient.cases
                    .filter(c => c.status !== 'resuelto')
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors p-3"
                        onClick={() => {
                          const pid = woundPickerPatient.id;
                          setWoundPickerPatient(null);
                          navigate(`/patients/${pid}/cases/${c.id}?newEvo=1`);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-body text-sm font-semibold truncate">{c.woundType}</p>
                            <p className="font-body text-xs text-muted-foreground truncate">{c.anatomicalLocation}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`font-body text-xs shrink-0 ${
                              c.status === 'critico' ? 'text-destructive' :
                              c.status === 'en_mejoria' ? 'text-success' : 'text-info'
                            }`}
                          >
                            {c.status === 'critico' ? 'Crítico' : c.status === 'en_mejoria' ? 'En mejoría' : 'Activo'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs font-body text-muted-foreground">
                          <span>Inicio: {c.startDate}</span>
                          {c.size && <span>· {c.size}</span>}
                          <span>· {c.evolutions.length} evol.</span>
                        </div>
                      </button>
                    ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="outline" className="font-body" onClick={() => setWoundPickerPatient(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

interface ProfessionalComboboxProps {
  value: string;
  onChange: (v: string) => void;
}

function ProfessionalCombobox({ value, onChange }: ProfessionalComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const showCreate =
    query.trim().length > 0 &&
    !professionals.some(p => p.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-body font-normal"
        >
          <span className={value ? '' : 'text-muted-foreground'}>
            {value || 'Sin asignar'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar o escribir nombre..."
            value={query}
            onValueChange={setQuery}
            className="font-body"
          />
          <CommandList>
            <CommandEmpty className="py-2 px-2 text-sm font-body text-muted-foreground">
              {query.trim() ? 'Presioná "Usar" para asignar este nombre.' : 'Sin coincidencias.'}
            </CommandEmpty>
            {value && (
              <CommandGroup heading="Actual">
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange('');
                    setQuery('');
                    setOpen(false);
                  }}
                  className="font-body text-muted-foreground"
                >
                  Quitar asignación (dejar en blanco)
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Profesionales sugeridos">
              {professionals.map(p => (
                <CommandItem
                  key={p}
                  value={p}
                  onSelect={() => {
                    onChange(p);
                    setQuery('');
                    setOpen(false);
                  }}
                  className="font-body"
                >
                  <Check className={`mr-2 h-4 w-4 ${value === p ? 'opacity-100' : 'opacity-0'}`} />
                  {p}
                </CommandItem>
              ))}
            </CommandGroup>
            {showCreate && (
              <CommandGroup heading="Otro">
                <CommandItem
                  value={`__use__${query}`}
                  onSelect={() => {
                    onChange(query.trim());
                    setQuery('');
                    setOpen(false);
                  }}
                  className="font-body"
                >
                  <Plus className="mr-2 h-4 w-4" /> Usar "{query.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
