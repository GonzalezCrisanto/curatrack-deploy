import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, Briefcase, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSponsor } from '@/context/SponsorContext';

export default function Reports() {
  const navigate = useNavigate();
  const { sponsor } = useSponsor();

  const reports = [
    {
      icon: Users,
      title: 'Historia clínica por paciente',
      desc: 'Reporte completo con datos del paciente, casos, evoluciones, fotos y firmas. Ideal para auditoría o derivación.',
      action: 'Ir a pacientes',
      to: '/patients',
    },
    {
      icon: Briefcase,
      title: `Reporte mensual sponsor ${sponsor?.sponsor_name ?? ''}`.trim(),
      desc: 'Métricas agregadas de adopción, demanda y oportunidades comerciales. Sin información identificable de pacientes.',
      action: 'Ver Panel Sponsor',
      to: '/sponsor',
    },
    {
      icon: FileText,
      title: 'Estadísticas clínicas y comerciales',
      desc: 'Dashboards con filtros por período, tipo de herida, categoría y profesional.',
      action: 'Abrir estadísticas',
      to: '/statistics',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="heading-display text-3xl flex items-center gap-3">
              <FileText className="h-7 w-7 text-primary" /> Reportes
            </h1>
            <p className="font-body text-muted-foreground mt-1">
              Documentos clínicos y comerciales disponibles en la plataforma.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-accent/40 p-3 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="font-body text-xs text-muted-foreground">
            Los reportes clínicos contienen datos sensibles del paciente y solo son visibles para el equipo profesional.
            Los reportes comerciales para sponsor son agregados y anónimos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {reports.map(r => (
            <Card key={r.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <r.icon className="h-5 w-5" />
                </div>
                <CardTitle className="heading-display text-base">{r.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm text-muted-foreground mb-4">{r.desc}</p>
                <Button variant="outline" className="font-body" onClick={() => navigate(r.to)}>
                  {r.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
