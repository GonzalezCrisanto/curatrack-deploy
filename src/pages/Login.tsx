import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Eye, EyeOff, LogIn, UserPlus, Mail, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/curatrack-logo.png';
import { supabase } from '@/integrations/supabase/client';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      toast({ title: 'No se pudo iniciar sesión', description: result.message, variant: 'destructive' });
      return;
    }
    navigate('/dashboard');
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await loginWithGoogle();
    setLoading(false);
    if (!result.ok) {
      toast({ title: 'No se pudo iniciar sesión con Google', description: result.message, variant: 'destructive' });
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-login');
      if (error || !data?.ok) {
        throw new Error(error?.message || data?.message || 'No se pudo preparar la cuenta demo');
      }
      const result = await login(data.email, data.password);
      if (!result.ok) {
        throw new Error(result.message || 'No se pudo iniciar sesión con la cuenta demo');
      }
      toast({ title: 'Sesión demo iniciada', description: 'Estás usando la cuenta de prueba de CuraTrack.' });
      navigate('/dashboard');
    } catch (err) {
      toast({ title: 'No se pudo entrar a la demo', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminDemoLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-admin-login');
      if (error || !data?.ok) {
        throw new Error(error?.message || data?.message || 'No se pudo preparar la cuenta admin demo');
      }
      const result = await login(data.email, data.password);
      if (!result.ok) {
        throw new Error(result.message || 'No se pudo iniciar sesión con la cuenta admin');
      }
      toast({ title: 'Sesión admin demo iniciada', description: 'Estás usando la cuenta de administrador/vendedor.' });
      navigate('/admin/orders');
    } catch (err) {
      toast({ title: 'No se pudo entrar como admin', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Ingresá tu email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'No se pudo enviar el email', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Revisá tu correo', description: 'Te enviamos un enlace para restablecer tu contraseña.' });
    setForgotMode(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12">
        <div className="max-w-md text-center">
          <img src={logo} alt="CuraTrack" className="h-20 mx-auto mb-8 brightness-0 invert" />
          <h2 className="heading-display text-3xl text-primary-foreground mb-4">
            Plataforma de seguimiento de heridas complejas
          </h2>
          <p className="font-body text-primary-foreground/70 leading-relaxed">
            Registrá evoluciones, cargá fotografías y hacé seguimiento clínico profesional de cada paciente.
          </p>
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

        <Card className="w-full max-w-md border-border/50 shadow-lg my-8">
          <CardHeader className="text-center pb-2">
            <img src={logo} alt="CuraTrack" className="h-14 mx-auto mb-4 lg:hidden" />
            <h1 className="heading-display text-2xl">
              {forgotMode ? 'Restablecer contraseña' : 'Iniciar sesión'}
            </h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              {forgotMode
                ? 'Te enviaremos un enlace a tu correo'
                : 'Ingresá tus credenciales para acceder'}
            </p>
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
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full font-body gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-95 shadow-md text-xs"
                  >
                    <Sparkles className="h-4 w-4" />
                    Demo profesional
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleAdminDemoLogin}
                    disabled={loading}
                    variant="outline"
                    className="w-full font-body gap-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-xs"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Demo vendedor
                  </Button>
                </div>
                <p className="text-[11px] text-center text-muted-foreground font-body -mt-3">
                  Acceso instantáneo · datos de prueba precargados
                </p>

                <Button type="button" variant="outline" size="lg" onClick={handleGoogle} disabled={loading}
                  className="w-full font-body gap-2 border-border">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.12A6.97 6.97 0 0 1 5.46 12c0-.74.13-1.45.36-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                  Continuar con Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground font-body">o con email</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-body text-sm">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="font-body" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-body text-sm">Contraseña</Label>
                    <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline font-body">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="font-body pr-10" required />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full font-body" size="lg" disabled={loading}>
                  <LogIn className="mr-2 h-4 w-4" /> {loading ? 'Ingresando...' : 'Ingresar'}
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground font-body">¿No tenés cuenta?</span>
                  </div>
                </div>

                <Button type="button" variant="outline" size="lg" onClick={() => navigate('/register')} className="w-full font-body">
                  <UserPlus className="mr-2 h-4 w-4" /> Crear cuenta
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
