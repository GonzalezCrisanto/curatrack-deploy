import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { useToast } from '@/hooks/use-toast';
import { Palette, Building2, Check, ShieldCheck, Receipt, Users } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';

export default function SettingsPage() {
  const { currentUser, currentUserName } = useApp();
  const { sponsor, sponsors, setSponsorBySlug } = useSponsor();
  const { isSponsorRole } = usePermissions();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    sponsor_name: sponsor?.sponsor_name ?? '',
    app_name: sponsor?.app_name ?? '',
    logo_url: sponsor?.logo_url ?? '',
    support_email: sponsor?.support_email ?? '',
    contact_phone: sponsor?.contact_phone ?? '',
    responsible_person: sponsor?.responsible_person ?? '',
    billing_details: sponsor?.billing_details ?? '',
    primary_color: sponsor?.primary_color ?? '#1763D2',
  }));
  const [labForm, setLabForm] = useState({
    contact_email: '',
    contact_phone: '',
    website: '',
  });
  useEffect(() => {
    setForm({
      sponsor_name: sponsor?.sponsor_name ?? '',
      app_name: sponsor?.app_name ?? '',
      logo_url: sponsor?.logo_url ?? '',
      support_email: sponsor?.support_email ?? '',
      contact_phone: sponsor?.contact_phone ?? '',
      responsible_person: sponsor?.responsible_person ?? '',
      billing_details: sponsor?.billing_details ?? '',
      primary_color: sponsor?.primary_color ?? '#1763D2',
    });
    if (!sponsor?.lab_id) {
      setLabForm({ contact_email: '', contact_phone: '', website: '' });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('labs')
        .select('contact_email, contact_phone, website')
        .eq('id', sponsor.lab_id)
        .maybeSingle();
      setLabForm({
        contact_email: data?.contact_email ?? '',
        contact_phone: data?.contact_phone ?? '',
        website: data?.website ?? '',
      });
    })();
  }, [sponsor?.id, sponsor?.lab_id, sponsor?.sponsor_name, sponsor?.app_name, sponsor?.logo_url, sponsor?.support_email, sponsor?.contact_phone, sponsor?.responsible_person, sponsor?.billing_details, sponsor?.primary_color]);

  const canEditSponsorSettings = useMemo(() => isSponsorRole && !!sponsor?.id, [isSponsorRole, sponsor?.id]);

  const handleSelect = async (slug: string) => {
    await setSponsorBySlug(slug);
    toast({ title: 'Identidad de plataforma actualizada', description: 'Los colores, logo y textos se aplicaron.' });
  };

  const saveSponsorSettings = async () => {
    if (!sponsor?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('sponsors')
      .update(({
        sponsor_name: form.sponsor_name,
        app_name: form.app_name,
        logo_url: form.logo_url || null,
        support_email: form.support_email || null,
        contact_phone: form.contact_phone || null,
        responsible_person: form.responsible_person || null,
        billing_details: form.billing_details || null,
        primary_color: form.primary_color,
      } as any))
      .eq('id', sponsor.id);
    if (!error && sponsor.lab_id) {
      const { error: labError } = await supabase
        .from('labs')
        .update(({
          contact_email: labForm.contact_email || null,
          contact_phone: labForm.contact_phone || null,
          website: labForm.website || null,
        } as any))
        .eq('id', sponsor.lab_id);
      if (labError) {
        setSaving(false);
        toast({ title: 'No se pudo guardar el contacto del laboratorio', description: labError.message, variant: 'destructive' });
        return;
      }
    }
    setSaving(false);
    if (error) {
      toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
      return;
    }
    await setSponsorBySlug(sponsor.slug, false);
    toast({ title: 'Configuración actualizada', description: 'Se guardaron los datos del laboratorio.' });
  };

  const roleLabel = currentUser?.role === 'medico'
    ? 'Médico/a'
    : currentUser?.role === 'admin'
      ? 'Administrativo/a'
      : 'Enfermería';

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-6 max-w-4xl mx-auto w-full animate-fade-in">
        <h1 className="heading-display text-2xl md:text-3xl">Configuración</h1>

        {!isSponsorRole ? (
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
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="heading-display text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Configuración del laboratorio
              </CardTitle>
              <p className="font-body text-sm text-muted-foreground">
                Solo podés editar la configuración de tu laboratorio. No se permite acceso a configuraciones globales ni de competidores.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Nombre del laboratorio (branding)</Label>
                <Input value={form.sponsor_name} onChange={(e) => setForm((p) => ({ ...p, sponsor_name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Nombre de la plataforma</Label>
                <Input value={form.app_name} onChange={(e) => setForm((p) => ({ ...p, app_name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Logo del laboratorio (URL)</Label>
                <Input
                  value={form.logo_url}
                  onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              {form.logo_url && (
                <div className="rounded-md border border-border/50 p-3 w-fit">
                  <img src={form.logo_url} alt={form.sponsor_name || 'Logo sponsor'} className="h-10 w-auto object-contain" />
                </div>
              )}
              <div className="grid gap-2">
                <Label>Email de contacto comercial</Label>
                <Input value={form.support_email} onChange={(e) => setForm((p) => ({ ...p, support_email: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Persona responsable del programa</Label>
                <Input value={form.responsible_person} onChange={(e) => setForm((p) => ({ ...p, responsible_person: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Teléfono comercial (sponsor)</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Color primario (CTA)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" value={form.primary_color} onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))} className="w-14 p-1 h-10" />
                    <Input value={form.primary_color} onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Datos de facturación</Label>
                <Textarea
                  value={form.billing_details}
                  onChange={(e) => setForm((p) => ({ ...p, billing_details: e.target.value }))}
                  placeholder="CUIT, razón social, condición impositiva, dirección fiscal, etc."
                  rows={3}
                />
              </div>
              <div className="rounded-lg border border-border/50 p-4 space-y-3 bg-muted/20">
                <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">Datos de contacto del laboratorio</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Email institucional</Label>
                    <Input
                      value={labForm.contact_email}
                      onChange={(e) => setLabForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Teléfono institucional</Label>
                    <Input
                      value={labForm.contact_phone}
                      onChange={(e) => setLabForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
                    />
                  </div>
                </div>
                <Label>Sitio web del laboratorio</Label>
                <Input
                  value={labForm.website}
                  onChange={(e) => setLabForm((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <Button onClick={saveSponsorSettings} disabled={!canEditSponsorSettings || saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </CardContent>
          </Card>
        )}

        {isSponsorRole && (
          <>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Usuarios internos del laboratorio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm text-muted-foreground">
                  Gestión disponible en el módulo de administración interno del sponsor (alta/baja de usuarios comerciales del mismo laboratorio).
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Facturación y suscripción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm text-muted-foreground">
                  Esta sección muestra únicamente información de suscripción del laboratorio actual.
                </p>
              </CardContent>
            </Card>
            <div className="rounded-lg border border-border/60 bg-accent/40 p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                Cumplimiento de privacidad: el sponsor no accede a datos identificables de pacientes y no puede modificar configuración global de la plataforma.
              </p>
            </div>
          </>
        )}

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
      </div>
    </AppLayout>
  );
}
