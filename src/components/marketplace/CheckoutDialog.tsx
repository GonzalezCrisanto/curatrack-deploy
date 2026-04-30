import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/context/CartContext';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

export function CheckoutDialog({ open, onOpenChange, onSuccess }: Props) {
  const { confirmOrder, items, totalEstimated } = useCart();
  const { currentUser, currentUserName } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ orderNumber: string; orderId: string } | null>(null);

  const [professionalName, setProfessionalName] = useState('');
  const [institution, setInstitution] = useState('');
  const [woundType, setWoundType] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setProfessionalName(currentUserName || '');
      setInstitution(currentUser?.institution || '');
      setSuccess(null);
    }
  }, [open, currentUser, currentUserName]);

  const handleConfirm = async () => {
    setSubmitting(true);
    const res = await confirmOrder({
      professional_name: professionalName.trim() || undefined,
      institution: institution.trim() || undefined,
      general_wound_type: woundType.trim() || undefined,
      clinical_recommendation: recommendation.trim() || undefined,
      commercial_notes: notes.trim() || undefined,
      channel: 'manual',
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: 'No se pudo enviar el pedido', description: res.message, variant: 'destructive' });
      return;
    }
    setSuccess({ orderNumber: res.orderNumber!, orderId: res.orderId! });
    toast({ title: 'Pedido enviado', description: `Nº ${res.orderNumber}` });
  };

  const formatTotal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(totalEstimated);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {success ? (
          <>
            <DialogHeader>
              <div className="mx-auto h-12 w-12 rounded-full bg-success/15 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <DialogTitle className="text-center font-heading">¡Pedido enviado!</DialogTitle>
              <DialogDescription className="text-center font-body">
                Tu pedido <strong>{success.orderNumber}</strong> fue enviado al vendedor asignado. Vas a poder seguir su estado (enviado, aprobado, rechazado) en la sección de pedidos.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { onOpenChange(false); onSuccess?.(); }}>
                Cerrar
              </Button>
              <Button className="flex-1" onClick={() => { onOpenChange(false); onSuccess?.(); navigate('/orders'); }}>
                Ver mis pedidos
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading">Confirmar pedido</DialogTitle>
              <DialogDescription className="font-body">
                Revisá los datos antes de enviar. {items.length} producto{items.length === 1 ? '' : 's'} · Total estimado <strong>{formatTotal}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-name" className="text-xs">Profesional</Label>
                  <Input id="prof-name" value={professionalName} onChange={(e) => setProfessionalName(e.target.value)} placeholder="Nombre y apellido" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="institution" className="text-xs">Institución</Label>
                  <Input id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Hospital / clínica" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wound-type" className="text-xs">Tipo general de herida (opcional)</Label>
                <Input id="wound-type" value={woundType} onChange={(e) => setWoundType(e.target.value)} placeholder="Ej: úlcera por presión, pie diabético…" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recommendation" className="text-xs">Recomendación clínica (opcional)</Label>
                <Textarea id="recommendation" rows={2} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} placeholder="Indicaciones de uso para los insumos" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">Notas comerciales (opcional)</Label>
                <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Plazos, urgencia, dirección de entrega…" />
              </div>

              <p className="text-[11px] text-muted-foreground bg-muted p-2 rounded">
                Al confirmar, el pedido queda en estado <strong>Enviado</strong>. El vendedor podrá marcarlo como <strong>Aprobado</strong> o <strong>Rechazado</strong>. No hay pago online.
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={submitting || items.length === 0}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Enviando…</> : 'Enviar pedido'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
