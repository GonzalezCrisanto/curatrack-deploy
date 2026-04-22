import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronRight } from 'lucide-react';
import { getStatusLabel, woundStatuses } from '@/data/demoData';

const statusBadgeClass: Record<string, string> = {
  activo: 'bg-info/10 text-info border-info/30',
  en_mejoria: 'bg-success/10 text-success border-success/30',
  critico: 'bg-destructive/10 text-destructive border-destructive/30',
  resuelto: 'bg-muted text-muted-foreground border-border',
};

export default function Cases() {
  const { patients } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const allCases = patients.flatMap(p =>
    p.cases.map(c => ({ ...c, patientName: `${p.lastName}, ${p.firstName}` }))
  );

  const filtered = allCases.filter(c => {
    const matchSearch = `${c.patientName} ${c.woundType} ${c.anatomicalLocation}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="heading-display text-2xl md:text-3xl">Casos Activos</h1>
          <p className="font-body text-sm text-muted-foreground">{allCases.length} casos en total</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente, tipo o ubicación..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 font-body"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] font-body">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {woundStatuses.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3">
          {filtered.map(c => (
            <Card
              key={c.id}
              className="border-border/50 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/patients/${c.patientId}/cases/${c.id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-body text-sm font-semibold">{c.woundType}</h3>
                    <Badge className={`font-body text-xs ${statusBadgeClass[c.status]}`}>{getStatusLabel(c.status)}</Badge>
                  </div>
                  <p className="font-body text-xs text-muted-foreground">{c.patientName} · {c.anatomicalLocation}</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    Inicio: {c.startDate} · {c.evolutions.length} evoluciones · {c.photos.length} fotos
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="font-body text-muted-foreground">No se encontraron casos</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
