import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="heading-display text-2xl md:text-3xl">Configuración</h1>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="heading-display text-lg">Información de la cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="font-body text-sm text-muted-foreground">Usuario</span>
              <span className="font-body text-sm">Lic. María González</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="font-body text-sm text-muted-foreground">Email</span>
              <span className="font-body text-sm">maria.gonzalez@curatrack.com</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="font-body text-sm text-muted-foreground">Rol</span>
              <Badge variant="outline" className="font-body">Enfermería</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-body text-sm text-muted-foreground">Plan</span>
              <Badge className="font-body bg-primary text-primary-foreground">Profesional</Badge>
            </div>
          </CardContent>
        </Card>
        <p className="font-body text-xs text-muted-foreground text-center">
          CuraTrack v1.0 © 2026
        </p>
      </div>
    </AppLayout>
  );
}
