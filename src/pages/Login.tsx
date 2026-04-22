import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import logo from '@/assets/curatrack-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { setIsLoggedIn } = useApp();
  const [email, setEmail] = useState('maria.gonzalez@curatrack.com');
  const [password, setPassword] = useState('demo1234');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    navigate('/dashboard');
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
      <div className="flex-1 flex items-center justify-center p-6 bg-background relative">
        {/* Back to landing */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 font-body text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver al inicio
        </Button>

        <Card className="w-full max-w-md border-border/50 shadow-lg">
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

              <p className="text-center text-xs text-muted-foreground font-body">
                Demo: las credenciales ya están precargadas
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
