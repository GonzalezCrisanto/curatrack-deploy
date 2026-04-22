import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Activity, AlertTriangle, CheckCircle, TrendingUp, Clock, ChevronRight, CalendarClock } from 'lucide-react';
import { getStatusLabel } from '@/data/demoData';
import { Calendar } from '@/components/ui/calendar';
import { useMemo } from 'react';
import AppLayout from '@/components/AppLayout';

export default function Dashboard() {
  const { patients } = useApp();
  const navigate = useNavigate();

  const allCases = patients.flatMap(p => p.cases);
  const activeCases = allCases.filter(c => c.status === 'activo');
  const criticalCases = allCases.filter(c => c.status === 'critico');
  const improvingCases = allCases.filter(c => c.status === 'en_mejoria');
  const resolvedCases = allCases.filter(c => c.status === 'resuelto');
  const totalEvolutions = allCases.reduce((sum, c) => sum + c.evolutions.length, 0);

  const recentEvolutions = allCases
    .flatMap(c => c.evolutions.map(e => ({ ...e, caseId: c.id, patientId: c.patientId, woundType: c.woundType })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const today = new Date().toISOString().split('T')[0];
  const upcomingAppointments = allCases
    .flatMap(c => c.evolutions.map(e => ({ ...e, caseId: c.id, patientId: c.patientId, woundType: c.woundType })))
    .filter(e => e.nextControl && e.nextControl.trim() !== '' && e.nextControl >= today)
    .sort((a, b) => a.nextControl.localeCompare(b.nextControl))
    .slice(0, 6);

  const stats = [
    { label: 'Pacientes', value: patients.length, icon: Users, color: 'text-info' },
    { label: 'Casos activos', value: activeCases.length, icon: Activity, color: 'text-primary' },
    { label: 'Críticos', value: criticalCases.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'En mejoría', value: improvingCases.length, icon: TrendingUp, color: 'text-success' },
    { label: 'Resueltos', value: resolvedCases.length, icon: CheckCircle, color: 'text-muted-foreground' },
    { label: 'Evoluciones', value: totalEvolutions, icon: Clock, color: 'text-accent-foreground' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="heading-display text-2xl md:text-3xl">Dashboard</h1>
          <p className="font-body text-muted-foreground text-sm mt-1">Resumen general del seguimiento de heridas</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="stat-glow border-border/50">
              <CardContent className="p-4 text-center">
                <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                <div className="heading-display text-2xl">{s.value}</div>
                <div className="font-body text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Próximos Turnos con Calendario */}
        {upcomingAppointments.length > 0 && (() => {
          const statusColors: Record<string, string> = {
            critico: 'bg-destructive text-destructive-foreground',
            activo: 'bg-primary text-primary-foreground',
            en_mejoria: 'bg-success text-white',
            resuelto: 'bg-muted-foreground text-white',
          };

          const appointmentDates = upcomingAppointments.map(ap => {
            const caseData = allCases.find(c => c.id === ap.caseId);
            return { date: new Date(ap.nextControl + 'T12:00:00'), status: caseData?.status || 'activo' };
          });

          const criticalDates = appointmentDates.filter(d => d.status === 'critico').map(d => d.date);
          const activeDates = appointmentDates.filter(d => d.status === 'activo').map(d => d.date);
          const improvingDates = appointmentDates.filter(d => d.status === 'en_mejoria').map(d => d.date);
          const resolvedDates = appointmentDates.filter(d => d.status === 'resuelto').map(d => d.date);

          const modifiers = {
            critical: criticalDates,
            active: activeDates,
            improving: improvingDates,
            resolved: resolvedDates,
          };

          const modifiersStyles = {
            critical: { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))', borderRadius: '9999px' },
            active: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '9999px' },
            improving: { backgroundColor: 'hsl(var(--success))', color: '#fff', borderRadius: '9999px' },
            resolved: { backgroundColor: 'hsl(var(--muted-foreground))', color: '#fff', borderRadius: '9999px' },
          };

          return (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="heading-display text-lg flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Próximos Turnos / Controles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Calendario */}
                  <div className="shrink-0">
                    <Calendar
                      mode="multiple"
                      selected={appointmentDates.map(d => d.date)}
                      className="p-3 pointer-events-auto rounded-lg border border-border/50"
                      modifiers={modifiers}
                      modifiersStyles={modifiersStyles}
                    />
                    <div className="flex flex-wrap gap-3 mt-3 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-destructive" />
                        <span className="font-body text-xs text-muted-foreground">Crítico</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-primary" />
                        <span className="font-body text-xs text-muted-foreground">Activo</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-success" />
                        <span className="font-body text-xs text-muted-foreground">En mejoría</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-muted-foreground" />
                        <span className="font-body text-xs text-muted-foreground">Resuelto</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de turnos */}
                  <div className="flex-1 grid sm:grid-cols-2 gap-3 content-start">
                    {upcomingAppointments.map(ap => {
                      const patient = patients.find(p => p.id === ap.patientId);
                      const caseData = allCases.find(c => c.id === ap.caseId);
                      const statusClass = statusColors[caseData?.status || 'activo'];
                      return (
                        <div
                          key={ap.id + '-apt'}
                          className="p-4 rounded-lg border border-border/50 hover:shadow-sm transition-shadow cursor-pointer bg-card"
                          onClick={() => navigate(`/patients/${ap.patientId}/cases/${ap.caseId}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CalendarClock className="h-4 w-4 text-primary" />
                              <span className="font-body text-sm font-semibold text-primary">{ap.nextControl}</span>
                            </div>
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusClass.split(' ')[0]}`} />
                          </div>
                          <p className="font-body text-sm font-medium">{patient?.lastName}, {patient?.firstName}</p>
                          <p className="font-body text-xs text-muted-foreground mt-0.5">{ap.woundType}</p>
                          <p className="font-body text-xs text-muted-foreground mt-1">Prof: {ap.professional}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Critical alerts */}
          {criticalCases.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="heading-display text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Alertas Críticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {criticalCases.map(c => {
                  const patient = patients.find(p => p.id === c.patientId);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50 cursor-pointer hover:shadow-sm transition-shadow"
                      onClick={() => navigate(`/patients/${c.patientId}/cases/${c.id}`)}
                    >
                      <div>
                        <p className="font-body text-sm font-medium">{patient?.firstName} {patient?.lastName}</p>
                        <p className="font-body text-xs text-muted-foreground">{c.woundType} — {c.anatomicalLocation}</p>
                      </div>
                      <Badge variant="destructive" className="font-body text-xs">Crítico</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recent activity */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="heading-display text-lg">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentEvolutions.map(ev => {
                const patient = patients.find(p => p.id === ev.patientId);
                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => navigate(`/patients/${ev.patientId}/cases/${ev.caseId}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium truncate">
                        {patient?.firstName} {patient?.lastName} — {ev.woundType}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">{ev.date} · {ev.professional}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Quick access patients */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="heading-display text-lg">Pacientes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} className="font-body text-sm">
              Ver todos <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {patients.slice(0, 6).map(p => (
                <div
                  key={p.id}
                  className="p-4 rounded-lg border border-border/50 hover:shadow-sm transition-shadow cursor-pointer bg-card"
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <p className="font-body text-sm font-semibold">{p.lastName}, {p.firstName}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">{p.diagnosis.substring(0, 50)}...</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="font-body text-xs">{p.cases.length} caso{p.cases.length !== 1 ? 's' : ''}</Badge>
                    {p.cases.some(c => c.status === 'critico') && (
                      <Badge variant="destructive" className="font-body text-xs">Crítico</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
