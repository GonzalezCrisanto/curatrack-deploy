import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, SlidersHorizontal, Users, Check } from 'lucide-react';

type CurationWindow = 'all' | '3d' | '2w' | '1m';

const WINDOW_OPTIONS: { value: CurationWindow; label: string; days?: number }[] = [
  { value: 'all', label: 'Todos los pacientes' },
  { value: '3d', label: 'Curaciones en los últimos 3 días', days: 3 },
  { value: '2w', label: 'Curaciones en las últimas 2 semanas', days: 14 },
  { value: '1m', label: 'Curaciones en el último mes', days: 30 },
];

export default function Patients() {
  const { patients, patientsLoading } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [curationWindow, setCurationWindow] = useState<CurationWindow>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const lastCurationDate = (p: (typeof patients)[number]) =>
    p.cases.flatMap((c) => c.evolutions).map((e) => e.date).sort().at(-1) ?? null;

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es', { sensitivity: 'base' }),
    );
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeWindow = WINDOW_OPTIONS.find((w) => w.value === curationWindow);

    return sortedPatients.filter((p) => {
      if (q) {
        const haystack = `${p.firstName} ${p.lastName} ${p.dni}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (activeWindow?.days != null) {
        const last = lastCurationDate(p);
        if (!last) return false;
        const diffDays = (Date.now() - new Date(`${last}T00:00:00`).getTime()) / 86400000;
        if (diffDays < 0 || diffDays > activeWindow.days) return false;
      }
      return true;
    });
  }, [sortedPatients, query, curationWindow]);

  const activeWindowLabel = WINDOW_OPTIONS.find((w) => w.value === curationWindow)?.label;

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-6 max-w-3xl mx-auto w-full">
          <div>
            <h1 className="heading-display text-[26px] flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" /> Pacientes
            </h1>
            <p className="font-body text-base text-muted-foreground mt-1">
              {patients.length} paciente{patients.length !== 1 ? 's' : ''} en total
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o DNI..."
                className="h-11 pl-10 text-base"
                aria-label="Buscar paciente por nombre o DNI"
              />
            </div>

            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-11 w-11 shrink-0 ${curationWindow !== 'all' ? 'border-primary text-primary' : ''}`}
                  aria-label="Filtrar pacientes"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-2">
                <p className="font-body text-sm font-semibold px-2 py-1.5 text-muted-foreground">Filtrar por curaciones</p>
                <div className="space-y-0.5">
                  {WINDOW_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setCurationWindow(opt.value); setFilterOpen(false); }}
                      className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-2 text-left font-body text-base hover:bg-accent/50"
                    >
                      {opt.label}
                      {curationWindow === opt.value && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {curationWindow !== 'all' && (
            <div className="flex items-center gap-2">
              <span className="font-body text-sm rounded-full border border-primary/30 bg-primary/5 text-primary px-3 py-1">
                {activeWindowLabel}
              </span>
              <Button variant="ghost" size="sm" className="font-body text-sm h-7 px-2" onClick={() => setCurationWindow('all')}>
                Quitar filtro
              </Button>
            </div>
          )}

          <Card className="border-border/50">
            <CardContent className="p-2">
              {patientsLoading ? (
                <div className="space-y-2 p-2">
                  {[...Array(6)].map((_, idx) => (
                    <Skeleton key={idx} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center m-2">
                  <p className="font-body text-base text-muted-foreground">
                    {patients.length === 0 ? 'Todavía no hay pacientes.' : 'No encontramos resultados con estos filtros.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredPatients.map((p) => {
                    const name = `${p.lastName}, ${p.firstName}`.trim();
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => navigate(`/patients/${p.id}`)}
                          className="flex min-h-14 w-full flex-col gap-0.5 py-2.5 px-3 text-left rounded-md hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-3"
                        >
                          <span className="flex-1 truncate text-base font-medium">{name}</span>
                          <span className="flex-1 truncate text-sm text-muted-foreground">
                            {p.address || 'Sin domicilio'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
