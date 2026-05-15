import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { useToast } from '@/hooks/use-toast';
import { Palette, Building2, Check } from 'lucide-react';

export default function SettingsPage() {
  const { currentUser, currentUserName } = useApp();
  const { sponsor, sponsors, setSponsorBySlug } = useSponsor();
  const { toast } = useToast();

  const handleSelect = async (slug: string) => {
    await setSponsorBySlug(slug);
    toast({ title: 'Identidad de plataforma actualizada', description: 'Los colores, logo y textos se aplicaron.' });
  };

  const roleLabel = currentUser?.role === 'medico'
    ? 'Médico/a'
    : currentUser?.role === 'admin'
      ? 'Administrativo/a'
      : 'Enfermería';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto w-full animate-fade-in">
        <h1 className="heading-display text-2xl md:text-3xl">Configuración</h1>

        {/* Sponsor selector (modo demo) */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="heading-display text-lg flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Identidad de plataforma
            </CardTitle>
            <p className="font-body text-sm text-muted-foreground">
              La plataforma se adapta a la identidad, catálogo y estrategia comercial de cada laboratorio sponsor.
              Elegí la configuración activa para esta sesión.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-3">
              {sponsors.map((s) => {
                const active = sponsor?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s.slug)}
                    className={`text-left p-4 rounded-lg border transition-all ${
                      active
                        ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="h-10 w-10 rounded-md shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${s.primary_color}, ${s.accent_color})` }}
                      />
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="font-display font-bold text-sm">{s.app_name}</p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      <Building2 className="inline h-3 w-3 mr-1" />
                      {s.sponsor_name}
                    </p>
                    <div className="flex gap-1 mt-3">
                      <span className="h-2 flex-1 rounded" style={{ background: s.primary_color }} />
                      <span className="h-2 flex-1 rounded" style={{ background: s.secondary_color }} />
                      <span className="h-2 flex-1 rounded" style={{ background: s.accent_color }} />
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="font-body text-[11px] text-muted-foreground mt-4">
              En producción, esta configuración se asigna automáticamente según el laboratorio sponsor del usuario.
            </p>
          </CardContent>
        </Card>

        {/* Cuenta */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="heading-display text-lg">Información de la cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="font-body text-sm text-muted-foreground">Usuario</span>
              <span className="font-body text-sm">{currentUserName || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="font-body text-sm text-muted-foreground">Email</span>
              <span className="font-body text-sm">{currentUser?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="font-body text-sm text-muted-foreground">Rol</span>
              <Badge variant="outline" className="font-body">{roleLabel}</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-body text-sm text-muted-foreground">Sponsor activo</span>
              <Badge className="font-body bg-primary text-primary-foreground">{sponsor?.sponsor_name ?? '—'}</Badge>
            </div>
          </CardContent>
        </Card>

        <p className="font-body text-xs text-muted-foreground text-center">
          {sponsor?.app_name} · {new Date().getFullYear()}
        </p>
      </div>
    </AppLayout>
  );
}
