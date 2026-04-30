import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/CartContext';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, Truck, Phone, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

const checkoutSchema = z.object({
  professional_name: z.string().trim().min(2, 'Ingresá tu nombre').max(120),
  institution: z.string().trim().max(150).optional().or(z.literal('')),
  wound_type: z.string().trim().max(150).optional().or(z.literal('')),
  recommendation: z.string().trim().max(1000).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  contact_phone: z
    .string()
    .trim()
    .min(6, 'Teléfono demasiado corto')
    .max(30, 'Teléfono demasiado largo')
    .regex(/^[+\d\s().-]+$/, 'Solo números, espacios y +-(). '),
  contact_email: z.string().trim().email('Email inválido').max(255),
  delivery_address: z.string().trim().min(5, 'Ingresá una dirección válida').max(200),
  delivery_city: z.string().trim().min(2, 'Ingresá la ciudad').max(100),
  delivery_postal_code: z.string().trim().max(20).optional().or(z.literal('')),
  delivery_notes: z.string().trim().max(500).optional().or(z.literal('')),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;
type CheckoutErrors = Partial<Record<keyof CheckoutValues, string>>;

const initialValues: CheckoutValues = {
  professional_name: '',
  institution: '',
  wound_type: '',
  recommendation: '',
  notes: '',
  contact_phone: '',
  contact_email: '',
  delivery_address: '',
  delivery_city: '',
  delivery_postal_code: '',
  delivery_notes: '',
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive font-body">{msg}</p>;
}

export function CheckoutDialog({ open, onOpenChange, onSuccess }: Props) {
  const { confirmOrder, items, totalEstimated } = useCart();
  const { currentUser, currentUserName } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ orderNumber: string; orderId: string } | null>(null);
  const [values, setValues] = useState<CheckoutValues>(initialValues);
  const [errors, setErrors] = useState<CheckoutErrors>({});

  useEffect(() => {
    if (open) {
      setValues({
        ...initialValues,
        professional_name: currentUserName || '',
        institution: currentUser?.institution || '',
        contact_email: currentUser?.email || '',
      });
      setErrors({});
      setSuccess(null);
    }
  }, [open, currentUser, currentUserName]);

  const setField = <K extends keyof CheckoutValues>(key: K, value: CheckoutValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleConfirm = async () => {
    const parsed = checkoutSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: CheckoutErrors = {};
      parsed.error.issues.forEach((iss) => {
        const k = iss.path[0] as keyof CheckoutValues;
        if (!fieldErrors[k]) fieldErrors[k] = iss.message;
      });
      setErrors(fieldErrors);
      toast({ title: 'Revisá los datos', description: 'Hay campos obligatorios o con formato inválido.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const v = parsed.data;
    const res = await confirmOrder({
      professional_name: v.professional_name,
      institution: v.institution || undefined,
      general_wound_type: v.wound_type || undefined,
      clinical_recommendation: v.recommendation || undefined,
      commercial_notes: v.notes || undefined,
      contact_phone: v.contact_phone,
      contact_email: v.contact_email,
      delivery_address: v.delivery_address,
      delivery_city: v.delivery_city,
      delivery_postal_code: v.delivery_postal_code || undefined,
      delivery_notes: v.delivery_notes || undefined,
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
                {items.length} producto{items.length === 1 ? '' : 's'} · Total estimado <strong>{formatTotal}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Profesional */}
              <section className="space-y-3">
                <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" /> Datos del profesional
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-name" className="text-xs">Profesional *</Label>
                    <Input id="prof-name" maxLength={120} value={values.professional_name}
                      onChange={(e) => setField('professional_name', e.target.value)}
                      placeholder="Nombre y apellido" />
                    <FieldError msg={errors.professional_name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="institution" className="text-xs">Institución</Label>
                    <Input id="institution" maxLength={150} value={values.institution}
                      onChange={(e) => setField('institution', e.target.value)}
                      placeholder="Hospital / clínica" />
                    <FieldError msg={errors.institution} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Contacto */}
              <section className="space-y-3">
                <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" /> Información de contacto
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-phone" className="text-xs">Teléfono *</Label>
                    <Input id="contact-phone" maxLength={30} value={values.contact_phone}
                      onChange={(e) => setField('contact_phone', e.target.value)}
                      placeholder="+54 11 1234-5678" inputMode="tel" />
                    <FieldError msg={errors.contact_phone} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email" className="text-xs">Email *</Label>
                    <Input id="contact-email" type="email" maxLength={255} value={values.contact_email}
                      onChange={(e) => setField('contact_email', e.target.value)}
                      placeholder="contacto@ejemplo.com" />
                    <FieldError msg={errors.contact_email} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Entrega */}
              <section className="space-y-3">
                <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" /> Dirección de entrega
                </h3>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery-address" className="text-xs">Dirección *</Label>
                  <Input id="delivery-address" maxLength={200} value={values.delivery_address}
                    onChange={(e) => setField('delivery_address', e.target.value)}
                    placeholder="Calle, número, piso/depto" />
                  <FieldError msg={errors.delivery_address} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="delivery-city" className="text-xs">Ciudad / localidad *</Label>
                    <Input id="delivery-city" maxLength={100} value={values.delivery_city}
                      onChange={(e) => setField('delivery_city', e.target.value)}
                      placeholder="Ej: CABA" />
                    <FieldError msg={errors.delivery_city} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="delivery-cp" className="text-xs">Código postal</Label>
                    <Input id="delivery-cp" maxLength={20} value={values.delivery_postal_code}
                      onChange={(e) => setField('delivery_postal_code', e.target.value)}
                      placeholder="1414" />
                    <FieldError msg={errors.delivery_postal_code} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery-notes" className="text-xs">Indicaciones de entrega (opcional)</Label>
                  <Textarea id="delivery-notes" rows={2} maxLength={500} value={values.delivery_notes}
                    onChange={(e) => setField('delivery_notes', e.target.value)}
                    placeholder="Horario, referencia, persona que recibe…" />
                  <FieldError msg={errors.delivery_notes} />
                </div>
              </section>

              <Separator />

              {/* Clínico / comercial */}
              <section className="space-y-3">
                <h3 className="font-heading text-sm font-semibold">Información clínica y comercial</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="wound-type" className="text-xs">Tipo general de herida (opcional)</Label>
                  <Input id="wound-type" maxLength={150} value={values.wound_type}
                    onChange={(e) => setField('wound_type', e.target.value)}
                    placeholder="Ej: úlcera por presión, pie diabético…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recommendation" className="text-xs">Recomendación clínica (opcional)</Label>
                  <Textarea id="recommendation" rows={2} maxLength={1000} value={values.recommendation}
                    onChange={(e) => setField('recommendation', e.target.value)}
                    placeholder="Indicaciones de uso para los insumos" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs">Notas comerciales (opcional)</Label>
                  <Textarea id="notes" rows={2} maxLength={1000} value={values.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Plazos, urgencia, condiciones de pago…" />
                </div>
              </section>

              <p className="text-[11px] text-muted-foreground bg-muted p-2 rounded">
                Al confirmar, el pedido queda en estado <strong>Enviado</strong>. El vendedor se contactará por los datos provistos. No hay pago online.
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
