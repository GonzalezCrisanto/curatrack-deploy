import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Eye, EyeOff, UserPlus, LogIn, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSponsor } from '@/context/SponsorContext';
import { SponsorLogo } from '@/components/SponsorLogo';
import { Badge } from '@/components/ui/badge';

const ROLES = [
  { value: 'enfermeria', label: 'Enfermería' },
  { value: 'medico', label: 'Médico/a' },
  { value: 'kinesiologo', label: 'Kinesiólogo/a' },
  { value: 'podologo', label: 'Podólogo/a' },
  { value: 'otro', label: 'Otro' },
];

export default function Register() {
  const navigate = useNavigate();
  const { registerUser } = useApp();
  const { sponsor } = useSponsor();
  const sponsorName = sponsor?.sponsor_name ?? 'Programa clínico';
  const appName = sponsor?.app_name ?? 'Plataforma';
  const footer = sponsor?.legal_footer ?? sponsor?.powered_by_label ?? '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [institution, setInstitution] = useState('');
  const [license, setLicense] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password strength
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password.length > 0 && password === confirm,
  };
  const strength = Object.values(checks).filter(Boolean).length;
  const strengthLabel = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'][strength];
  const strengthColor = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-warning', 'bg-success'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: 'Datos incompletos', description: 'Ingresá tu nombre y apellido.', variant: 'destructive' });
      return;
    }
    if (!role) {
      toast({ title: 'Rol requerido', description: 'Seleccioná tu rol profesional.', variant: 'destructive' });
      return;
    }
    if (!checks.length || !checks.upper || !checks.number) {
      toast({ title: 'Contraseña insegura', description: 'Mínimo 8 caracteres, una mayúscula y un número.', variant: 'destructive' });
      return;
    }
    if (!checks.match) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }
    if (!acceptTerms) {
      toast({ title: 'Términos y condiciones', description: 'Debés aceptar los términos para continuar.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    // Self-registration never grants admin; server-side trigger also enforces this.
    // All clinical specialties map to the 'professional' app_role.
    const result = await registerUser({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'professional',
      license: license.trim() || undefined,
      institution: institution.trim() || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      toast({ title: 'No se pudo crear la cuenta', description: result.message, variant: 'destructive' });
      return;
    }
    if (result.needsEmailConfirmation) {
      toast({
        title: '¡Cuenta creada!',
        description: `Te enviamos un correo a ${email.trim()} para verificar tu cuenta antes de ingresar.`,
      });
      navigate('/login');
      return;
    }
    toast({ title: '¡Cuenta creada!', description: `Bienvenido/a ${firstName}. Ya podés ingresar.` });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(var(--sponsor-primary)) 0%, hsl(var(--sponsor-secondary)) 100%)`,
        }}
      >
        <div className="max-w-md text-center relative z-10">
          <div className="flex justify-center mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-xl">
              <SponsorLogo />
            </div>
          </div>
          <h2 className="heading-display text-3xl text-primary-foreground mb-4">
            Sumate al programa clínico
          </h2>
          <p className="font-body text-primary-foreground/80 leading-relaxed mb-8">
            Creá tu cuenta profesional y empezá a registrar evoluciones, fotografías y solicitudes de reposición en minutos.
          </p>
          <ul className="space-y-3 text-left font-body text-primary-foreground/90">
            {[
              'Historia clínica digital de cada paciente',
              'Fotografía clínica con línea de tiempo',
              'Catálogo y solicitudes de reposición',
              'Reportes y agenda de controles',
            ].map(item => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20">
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
      <div className="flex-1 flex items-center justify-center p-6 bg-background relative">
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
            <div className="flex justify-center mb-3 lg:hidden"><SponsorLogo /></div>
            <Badge variant="outline" className="mx-auto font-body text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5 mb-2">
              Programa sponsor: {sponsorName}
            </Badge>
            <h1 className="heading-display text-2xl">Crear cuenta</h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Completá tus datos para acceder a {appName}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="font-body text-sm">Nombre</Label>
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="María"
                    className="font-body"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm">Apellido</Label>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="González"
                    className="font-body"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="font-body text-sm">Email profesional</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nombre@institucion.com"
                  className="font-body"
                  required
                />
              </div>

              {/* Role + License */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="font-body text-sm">Rol</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm">Matrícula <span className="text-muted-foreground">(opcional)</span></Label>
                  <Input
                    value={license}
                    onChange={e => setLicense(e.target.value)}
                    placeholder="MN 12345"
                    className="font-body"
                  />
                </div>
              </div>

              {/* Institution */}
              <div className="space-y-2">
                <Label className="font-body text-sm">Institución / Centro de salud</Label>
                <Input
                  value={institution}
                  onChange={e => setInstitution(e.target.value)}
                  placeholder="Hospital, clínica o consultorio"
                  className="font-body"
                />
              </div>

              {/* Password */}
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
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < strength ? strengthColor : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground font-body">
                      Seguridad: <span className="font-medium text-foreground">{strengthLabel}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div className="space-y-2">
                <Label className="font-body text-sm">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="font-body pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirm.length > 0 && !checks.match && (
                  <p className="text-xs text-destructive font-body">Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={v => setAcceptTerms(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground font-body leading-relaxed cursor-pointer">
                  Acepto los <a className="text-primary hover:underline" href="#">Términos y Condiciones</a> y la{' '}
                  <a className="text-primary hover:underline" href="#">Política de Privacidad</a> de {appName}, incluyendo el tratamiento de datos clínicos según normativa vigente.
                </label>
              </div>

              <Button type="submit" className="w-full font-body" size="lg" disabled={loading}>
                <UserPlus className="mr-2 h-4 w-4" /> {loading ? 'Creando cuenta...' : 'Registrarme'}
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground font-body">¿Ya tenés cuenta?</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate('/login')}
                className="w-full font-body"
              >
                <LogIn className="mr-2 h-4 w-4" /> Iniciar sesión
              </Button>
            </form>
            {footer && (
              <p className="text-[10px] text-center text-muted-foreground font-body mt-6 leading-relaxed">{footer}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
