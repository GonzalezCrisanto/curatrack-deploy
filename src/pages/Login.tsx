import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useSponsor, type Sponsor } from '@/context/SponsorContext';
import { SponsorLogo } from '@/components/SponsorLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, EyeOff, LogIn, UserPlus, Mail, Sparkles, ShieldCheck, Check, Stethoscope } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserAppRole } from '@/lib/appRole';


async function redirectByRole(navigate: (p: string) => void, fallback = '/dashboard') {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) { navigate(fallback); return; }
  const role = await getUserAppRole(uid);
  if (role === 'sponsor') navigate('/panel-sponsor');
  else if (role === 'admin') navigate('/admin/products');
  else navigate('/dashboard');
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithGoogle } = useApp();
  const { sponsor, sponsors, setSponsorBySlug } = useSponsor();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const demoAutoTriggered = useRef(false);

  const sponsorParam = searchParams.get('sponsor');
  const isSponsorLocked = !!sponsorParam;
  const demoParam = searchParams.get('demo');

  const sponsorName = sponsor?.sponsor_name ?? 'Programa clínico';
  const appName = sponsor?.app_name ?? 'Plataforma';
  const footer = sponsor?.legal_footer ?? sponsor?.powered_by_label ?? '';

  // Demo cards: locked mode shows the matching sponsor; internal mode shows only 'demo'.
  // Other lab experiences are accessible via /login?sponsor=<slug> or from Settings.
  const demoSponsors = useMemo<Sponsor[]>(() => {
    if (!sponsors?.length) return [];
    if (sponsorParam) {
      const found = sponsors.find(s => s.slug.toLowerCase() === sponsorParam.toLowerCase());
      return found ? [found] : [];
    }
    const demo = sponsors.find(s => s.slug === 'demo');
    return demo ? [demo] : [];
  }, [sponsors, sponsorParam]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      toast({ title: 'No se pudo iniciar sesión', description: result.message, variant: 'destructive' });
      return;
    }
    await redirectByRole(navigate);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await loginWithGoogle();
    setLoading(false);
    if (!result.ok) {
      toast({ title: 'No se pudo iniciar sesión con Google', description: result.message, variant: 'destructive' });
      return;
    }
  };

  const handleDemoLogin = async (target?: Sponsor, kind: 'pro' | 'sponsor' | 'admin' = 'pro') => {
    const key = kind === 'admin' ? 'admin' : `${target?.slug ?? 'default'}:${kind}`;
    setLoading(true);
    setLoadingKey(key);
    try {
      if (target && kind !== 'admin') await setSponsorBySlug(target.slug, false);

      const fnName = kind === 'pro' ? 'demo-login' : kind === 'sponsor' ? 'demo-sponsor-login' : 'demo-admin-login';
      const body: Record<string, string> = { sponsor_slug: target?.slug ?? sponsor?.slug ?? 'demo' };

      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error || !data?.ok) throw new Error(error?.message || data?.message || 'No se pudo preparar la cuenta demo');
      if (!data.access_token || !data.refresh_token) throw new Error('Sesión demo inválida');
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw new Error(setErr.message || 'No se pudo iniciar sesión con la cuenta demo');

      if (target && kind !== 'admin') await setSponsorBySlug(target.slug, true);

      toast({
        title: kind === 'admin' ? 'Sesión admin iniciada' : kind === 'sponsor' ? 'Sesión laboratorio iniciada' : 'Sesión profesional iniciada',
        description: kind === 'admin' ? 'Acceso total a la plataforma.' : target ? `Demo de ${target.sponsor_name}` : 'Cuenta de prueba activada.',
      });
      if (kind === 'sponsor') navigate('/panel-sponsor');
      else await redirectByRole(navigate);
    } catch (err) {
      toast({ title: 'No se pudo iniciar la demo', description: (err as Error).message, variant: 'destructive' });
    } finally { setLoading(false); setLoadingKey(null); }
  };


  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast({ title: 'Ingresá tu email', variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast({ title: 'No se pudo enviar el email', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Revisá tu correo', description: 'Te enviamos un enlace para restablecer tu contraseña.' });
    setForgotMode(false);
  };

  useEffect(() => {
    if (demoAutoTriggered.current) return;
    if (loading) return;
    if (forgotMode) return;
    if (demoParam !== 'pro' && demoParam !== 'sponsor') return;

    demoAutoTriggered.current = true;
    void handleDemoLogin(undefined, demoParam === 'sponsor' ? 'sponsor' : 'pro');
  }, [demoParam, loading, forgotMode]);

  return (
    <div className="min-h-screen flex">
      {/* Left panel — sponsor branded */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(var(--sponsor-primary)) 0%, hsl(var(--sponsor-secondary)) 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 0%, transparent 50%), radial-gradient(circle at 80% 80%, white 0%, transparent 50%)',
        }} />
        <div className="max-w-md text-center relative z-10">
          <div className="flex justify-center mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-xl">
              <SponsorLogo />
            </div>
          </div>
          <h2 className="heading-display text-3xl text-primary-foreground mb-4 leading-tight">
            Accedé al programa clínico
          </h2>
          <p className="font-body text-primary-foreground/85 leading-relaxed mb-8">
            Gestioná pacientes, heridas, evoluciones y solicitudes de reposición desde una plataforma segura.
          </p>
          <ul className="space-y-2.5 text-left font-body text-sm text-primary-foreground/90 max-w-xs mx-auto">
            {[
              'Historia clínica digital y línea de tiempo fotográfica',
              'Catálogo de insumos y solicitudes de reposición',
              'Reportes y métricas clínico-comerciales',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          {footer && (
            <p className="font-body text-[11px] text-primary-foreground/60 mt-10">{footer}</p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background relative overflow-y-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 font-body border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver al inicio
        </Button>

        <Card className="w-full max-w-lg border-border/50 shadow-lg my-8">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3 lg:hidden">
              <SponsorLogo />
            </div>
            <Badge variant="outline" className="mx-auto font-body text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5 mb-2">
              {isSponsorLocked ? `Programa sponsor: ${sponsorName}` : 'Demo interna · multi-sponsor'}
            </Badge>
            <h1 className="heading-display text-2xl">
              {forgotMode ? 'Restablecer contraseña' : 'Iniciar sesión'}
            </h1>
            {forgotMode && (
              <p className="font-body text-sm text-muted-foreground mt-1">
                Te enviaremos un enlace a tu correo
              </p>
            )}
          </CardHeader>

          <CardContent>
            {forgotMode ? (
              <form onSubmit={handleForgot} className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-body text-sm">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="font-body" required />
                </div>
                <Button type="submit" className="w-full font-body" size="lg" disabled={loading}>
                  <Mail className="mr-2 h-4 w-4" /> {loading ? 'Enviando...' : 'Enviar enlace'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setForgotMode(false)} className="w-full font-body">
                  Volver al inicio de sesión
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Demo access */}
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-border/60 p-3 bg-card hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="h-7 w-7 rounded-md flex items-center justify-center bg-primary shadow-sm shrink-0">
                        <Stethoscope className="h-4 w-4 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold text-sm leading-tight">Acceso demo</div>
                        <div className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Probá la app sin crear cuenta</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" size="sm" disabled={loading}
                        onClick={() => handleDemoLogin(undefined, 'pro')}
                        className="w-full font-body gap-1.5 text-xs">
                        <Stethoscope className="h-3.5 w-3.5" />
                        {loadingKey === 'pro' ? '...' : 'Profesional'}
                      </Button>
                      <Button type="button" size="sm" disabled={loading}
                        onClick={() => handleDemoLogin(undefined, 'admin')}
                        className="w-full font-body gap-1.5 text-xs bg-slate-700 hover:bg-slate-800 text-white">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {loadingKey === 'admin' ? '...' : 'Admin'}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            )}
            {footer && (
              <p className="text-[10px] text-center text-muted-foreground font-body mt-6 leading-relaxed">{footer}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
