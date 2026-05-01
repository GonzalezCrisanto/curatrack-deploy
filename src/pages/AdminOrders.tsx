import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Send, CheckCircle2, XCircle, FileText, Ban, Loader2 } from 'lucide-react';

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  professional_name: string | null;
  institution: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_notes: string | null;
  estimated_total: number | null;
  currency: string;
  created_at: string;
  clinical_recommendation: string | null;
  commercial_notes: string | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number | null;
  subtotal: number | null;
  currency: string;
  presentation: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Send; className: string }> = {
  borrador: { label: 'Borrador', icon: FileText, className: 'bg-muted text-muted-foreground border-border' },
  enviado: { label: 'Enviado', icon: Send, className: 'bg-info/15 text-info border-info/30' },
  aprobado: { label: 'Aprobado', icon: CheckCircle2, className: 'bg-success/15 text-success border-success/30' },
  rechazado: { label: 'Rechazado', icon: XCircle, className: 'bg-destructive/15 text-destructive border-destructive/30' },
  cancelado: { label: 'Cancelado', icon: Ban, className: 'bg-muted text-muted-foreground border-border' },
};

function formatPrice(v: number | null, c = 'ARS') {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v);
}
function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminOrders() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Admin reads ALL orders via admin RLS
      const { data: ords } = await supabase
        .from('supply_orders')
        .select('*')
        .order('created_at', { ascending: false });
      const all = (ords ?? []) as OrderRow[];
      setOrders(all);
      if (all.length > 0) {
        const { data: itemData } = await supabase
          .from('supply_order_items')
          .select('*')
          .in('order_id', all.map(o => o.id));
        const grouped: Record<string, OrderItem[]> = {};
        (itemData ?? []).forEach(it => { (grouped[it.order_id] ||= []).push(it as OrderItem); });
        setItems(grouped);
      }
      setLoading(false);
    })();
  }, []);

  const changeStatus = async (order: OrderRow, newStatus: string) => {
    setUpdatingId(order.id);
    const { error } = await supabase
      .from('supply_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id);
    setUpdatingId(null);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
    toast({ title: `Pedido ${order.order_number} → ${statusConfig[newStatus]?.label ?? newStatus}` });
  };

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-primary" />
              Gestión de pedidos
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Todos los pedidos de los profesionales. Aprobá, rechazá o actualizá el estado.
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="enviado">Enviados</SelectItem>
              <SelectItem value="aprobado">Aprobados</SelectItem>
              <SelectItem value="borrador">Borradores</SelectItem>
              <SelectItem value="rechazado">Rechazados</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-heading font-semibold">No hay pedidos</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => {
              const cfg = statusConfig[o.status] ?? statusConfig.borrador;
              const Icon = cfg.icon;
              const oItems = items[o.id] ?? [];
              return (
                <Card key={o.id} className={o.status === 'cancelado' ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="font-heading text-lg">{o.order_number}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(o.created_at)}
                          {o.professional_name ? ` · ${o.professional_name}` : ''}
                          {o.institution ? ` — ${o.institution}` : ''}
                        </p>
                        {(o.contact_phone || o.contact_email) && (
                          <p className="text-xs text-muted-foreground">
                            Contacto: {[o.contact_phone, o.contact_email].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {o.delivery_address && (
                          <p className="text-xs text-muted-foreground">
                            Entrega: {o.delivery_address}{o.delivery_city ? `, ${o.delivery_city}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
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
                          {oItems.length} producto{oItems.length === 1 ? '' : 's'}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {oItems.map(it => (
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
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Status changer */}
                    {o.status !== 'cancelado' && (
                      <div className="flex items-center gap-2 pt-3 border-t mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Cambiar estado:</span>
                        {['enviado', 'aprobado', 'rechazado'].filter(s => s !== o.status).map(s => (
                          <Button
                            key={s}
                            variant="outline"
                            size="sm"
                            disabled={updatingId === o.id}
                            onClick={() => changeStatus(o, s)}
                            className="text-xs"
                          >
                            {updatingId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            {statusConfig[s]?.label ?? s}
                          </Button>
                        ))}
                      </div>
                    )}
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
