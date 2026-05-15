import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSponsor } from '@/context/SponsorContext';
import { SponsorLogo } from '@/components/SponsorLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { sponsor } = useSponsor();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const sponsorName = sponsor?.sponsor_name ?? 'Programa clínico';
  const footer = sponsor?.legal_footer ?? sponsor?.powered_by_label ?? '';

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast({ title: 'Contraseña muy corta', description: 'Mínimo 8 caracteres.', variant: 'destructive' }); return; }
    if (password !== confirm) { toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast({ title: 'No se pudo actualizar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Contraseña actualizada', description: 'Ya podés ingresar con tu nueva contraseña.' });
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3"><SponsorLogo /></div>
          <Badge variant="outline" className="mx-auto font-body text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5 mb-2">
            Programa sponsor: {sponsorName}
          </Badge>
          <h1 className="heading-display text-2xl">Nueva contraseña</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">
            Definí una contraseña segura para tu cuenta
          </p>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="font-body text-sm text-muted-foreground text-center py-6">
              Validando enlace de recuperación...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body text-sm">Nueva contraseña</Label>
                <div className="relative">
                  <Input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="font-body pr-10" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Confirmar contraseña</Label>
                <Input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="font-body" required />
              </div>
              <Button type="submit" className="w-full font-body" size="lg" disabled={loading}>
                <KeyRound className="mr-2 h-4 w-4" /> {loading ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </form>
          )}
          {footer && (
            <p className="text-[10px] text-center text-muted-foreground font-body mt-6 leading-relaxed">{footer}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
