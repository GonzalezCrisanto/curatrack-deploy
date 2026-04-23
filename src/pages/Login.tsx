import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Eye, EyeOff, LogIn, UserPlus, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/curatrack-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login, allUsers } = useApp();
  const [email, setEmail] = useState('maria@curatrack.demo');
  const [password, setPassword] = useState('demo1234');
  const [showPass, setShowPass] = useState(false);

  // Only show seeded demo accounts (those whose email ends with @curatrack.demo)
  const demoAccounts = allUsers.filter(u => u.email.endsWith('@curatrack.demo'));

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(email, password);
    if (!result.ok) {
      toast({ title: 'No se pudo iniciar sesión', description: result.message, variant: 'destructive' });
      return;
    }
    navigate('/dashboard');
  };

  const pickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo1234');
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
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 font-body text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver al inicio
        </Button>

        <Card className="w-full max-w-md border-border/50 shadow-lg my-8">
          <CardHeader className="text-center pb-2">
            <img src={logo} alt="CuraTrack" className="h-14 mx-auto mb-4 lg:hidden" />
            <h1 className="heading-display text-2xl">Iniciar sesión</h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Ingresá tus credenciales para acceder
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="font-body text-sm">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="font-body"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="font-body pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full font-body" size="lg">
                <LogIn className="mr-2 h-4 w-4" /> Ingresar
              </Button>

              {/* Demo accounts picker */}
              {demoAccounts.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 font-body text-xs font-semibold text-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" /> Cuentas demo
                  </div>
                  <p className="font-body text-[11px] text-muted-foreground">
                    Probá cómo cada profesional ve sólo sus pacientes (y los compartidos):
                  </p>
                  <div className="grid gap-1.5">
                    {demoAccounts.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => pickDemo(u.email)}
                        className={`text-left rounded-md border px-2.5 py-1.5 transition-colors ${
                          email === u.email
                            ? 'border-primary bg-primary/5'
                            : 'border-border/60 bg-background hover:border-primary/40'
                        }`}
                      >
                        <div className="font-body text-xs font-semibold text-foreground">
                          {u.role === 'medico' ? 'Dr.' : 'Lic.'} {u.firstName} {u.lastName}
                        </div>
                        <div className="font-body text-[11px] text-muted-foreground">
                          {u.email} · {u.institution || 'Independiente'}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="font-body text-[11px] text-muted-foreground">
                    Contraseña: <span className="font-mono">demo1234</span>
                  </p>
                </div>
              )}

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground font-body">¿No tenés cuenta?</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate('/register')}
                className="w-full font-body"
              >
                <UserPlus className="mr-2 h-4 w-4" /> Crear cuenta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
