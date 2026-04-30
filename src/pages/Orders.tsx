import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShoppingBag, Send, CheckCircle2, XCircle, FileText, ArrowLeft, Ban, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrderStatus } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';

interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus | string;
  professional_name: string | null;
  institution: string | null;
  general_wound_type: string | null;
  clinical_recommendation: string | null;
  commercial_notes: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_notes: string | null;
  estimated_total: number | null;
  currency: string;
  channel: string | null;
  sent_at: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  product_sku: string | null;
  presentation: string | null;
  quantity: number;
  unit_price: number | null;
  subtotal: number | null;
  currency: string;
  notes: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Send; className: string }> = {
  borrador: { label: 'Borrador', icon: FileText, className: 'bg-muted text-muted-foreground border-border' },
  enviado: { label: 'Enviado', icon: Send, className: 'bg-info/15 text-info border-info/30' },
  aprobado: { label: 'Aprobado', icon: CheckCircle2, className: 'bg-success/15 text-success border-success/30' },
  rechazado: { label: 'Rechazado', icon: XCircle, className: 'bg-destructive/15 text-destructive border-destructive/30' },
  cancelado: { label: 'Cancelado', icon: Ban, className: 'bg-muted text-muted-foreground border-border line-through-none' },
};

const CANCELLABLE_STATUSES = new Set(['borrador', 'enviado']);

function formatPrice(value: number | null | undefined, currency = 'ARS') {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value));
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Orders() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!CANCELLABLE_STATUSES.has(cancelTarget.status)) {
      toast({ title: 'No se puede cancelar', description: 'El pedido ya fue procesado.', variant: 'destructive' });
      setCancelTarget(null);
      return;
    }
    setCancelling(true);
    const { error } = await supabase
      .from('supply_orders')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', cancelTarget.id)
      .in('status', ['borrador', 'enviado']); // server-side guard
    setCancelling(false);
    if (error) {
      toast({ title: 'No se pudo cancelar', description: error.message, variant: 'destructive' });
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === cancelTarget.id ? { ...o, status: 'cancelado' } : o)));
    toast({ title: 'Pedido cancelado', description: `Nº ${cancelTarget.order_number}` });
    setCancelTarget(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: ordData } = await supabase
        .from('supply_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const ords = (ordData ?? []) as OrderRow[];
      setOrders(ords);

      if (ords.length > 0) {
        const ids = ords.map((o) => o.id);
        const { data: itemData } = await supabase
          .from('supply_order_items')
          .select('*')
          .in('order_id', ids);
        const grouped: Record<string, OrderItem[]> = {};
        (itemData ?? []).forEach((it) => {
          (grouped[it.order_id] ||= []).push(it as OrderItem);
        });
        if (!cancelled) setItemsByOrder(grouped);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-4xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-primary" />
              Mis pedidos
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Historial de pedidos enviados al vendedor. Sin pago online.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/marketplace"><ArrowLeft className="h-4 w-4 mr-1" /> Volver al marketplace</Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-10 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-heading font-semibold mb-1">Todavía no hay pedidos</p>
            <p className="text-sm text-muted-foreground font-body mb-4">Cuando confirmes un pedido del carrito, va a aparecer acá.</p>
            <Button asChild><Link to="/marketplace">Ir al marketplace</Link></Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const cfg = statusConfig[o.status] ?? statusConfig.borrador;
              const Icon = cfg.icon;
              const items = itemsByOrder[o.id] ?? [];
              return (
                <Card key={o.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="font-heading text-lg flex items-center gap-2">
                          {o.order_number}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(o.sent_at ?? o.created_at)}
                          {o.professional_name ? ` · ${o.professional_name}` : ''}
                          {o.institution ? ` · ${o.institution}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={`${cfg.className} gap-1`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </Badge>
                        <span className="font-heading font-bold text-primary">{formatPrice(o.estimated_total, o.currency)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="items" className="border-b-0">
                        <AccordionTrigger className="py-2 text-sm">
                          {items.length} producto{items.length === 1 ? '' : 's'}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {items.map((it) => (
                              <div key={it.id} className="flex justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{it.product_name}</p>
                                  {it.presentation && <p className="text-xs text-muted-foreground">{it.presentation}</p>}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">x{it.quantity}</p>
                                  <p className="font-heading text-sm">{formatPrice(it.subtotal, it.currency)}</p>
                                </div>
                              </div>
                            ))}
                            {(o.delivery_address || o.contact_phone || o.contact_email || o.clinical_recommendation || o.commercial_notes) && (
                              <div className="mt-3 pt-3 border-t space-y-1.5 text-xs">
                                {o.delivery_address && (
                                  <p>
                                    <span className="font-semibold">Entrega:</span> {o.delivery_address}
                                    {o.delivery_city ? `, ${o.delivery_city}` : ''}
                                    {o.delivery_postal_code ? ` (CP ${o.delivery_postal_code})` : ''}
                                  </p>
                                )}
                                {o.delivery_notes && (
                                  <p><span className="font-semibold">Indicaciones:</span> {o.delivery_notes}</p>
                                )}
                                {(o.contact_phone || o.contact_email) && (
                                  <p>
                                    <span className="font-semibold">Contacto:</span>{' '}
                                    {[o.contact_phone, o.contact_email].filter(Boolean).join(' · ')}
                                  </p>
                                )}
                                {o.clinical_recommendation && (
                                  <p><span className="font-semibold">Recomendación clínica:</span> {o.clinical_recommendation}</p>
                                )}
                                {o.commercial_notes && (
                                  <p><span className="font-semibold">Notas:</span> {o.commercial_notes}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
