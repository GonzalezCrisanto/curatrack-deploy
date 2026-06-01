import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useSponsor } from '@/context/SponsorContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ShoppingBag, Send, CheckCircle2, XCircle, FileText, Ban, Loader2, Search,
  TrendingUp, Package, Clock, BarChart3, Download, Plus, Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrderStatus } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import SponsorOrders from '@/pages/SponsorOrders';

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

// Orders saved from the cart "Realizar Pedido" flow (table `orders`, not in types.ts).
interface SimpleOrder {
  id: string;
  created_at: string;
  items: { name: string; quantity: number }[];
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
  borrador: { label: 'Pendiente', icon: FileText, className: 'bg-muted text-muted-foreground border-border' },
  enviado: { label: 'Enviada', icon: Send, className: 'bg-info/15 text-info border-info/30' },
  aprobado: { label: 'Confirmada', icon: CheckCircle2, className: 'bg-success/15 text-success border-success/30' },
  rechazado: { label: 'Requiere revisión', icon: XCircle, className: 'bg-destructive/15 text-destructive border-destructive/30' },
  cancelado: { label: 'Cancelada', icon: Ban, className: 'bg-muted text-muted-foreground border-border' },
};

const CANCELLABLE_STATUSES = new Set(['borrador', 'enviado']);

function formatPrice(value: number | null | undefined, currency = 'ARS') {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value));
}
function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PERIOD_OPTIONS = [
  { v: 'all', l: 'Todo el período' },
  { v: '7', l: 'Últimos 7 días' },
  { v: '30', l: 'Últimos 30 días' },
  { v: '90', l: 'Últimos 90 días' },
];

export default function Orders() {
  const { isSponsorRole } = usePermissions();
  const { toast } = useToast();
  const { sponsor } = useSponsor();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Orders created from the cart flow (table `orders`).
  const [myOrders, setMyOrders] = useState<SimpleOrder[]>([]);
  const [openOrder, setOpenOrder] = useState<SimpleOrder | null>(null);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!CANCELLABLE_STATUSES.has(cancelTarget.status)) {
      toast({ title: 'No se puede cancelar', description: 'La solicitud ya fue procesada.', variant: 'destructive' });
      setCancelTarget(null);
      return;
    }
    setCancelling(true);
    const { error } = await supabase
      .from('supply_orders')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', cancelTarget.id)
      .in('status', ['borrador', 'enviado']);
    setCancelling(false);
    if (error) {
      toast({ title: 'No se pudo cancelar', description: error.message, variant: 'destructive' });
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === cancelTarget.id ? { ...o, status: 'cancelado' } : o)));
    toast({ title: 'Solicitud cancelada', description: `Nº ${cancelTarget.order_number}` });
    setCancelTarget(null);
  };

  const handleCopySummary = (o: OrderRow) => {
    const items = itemsByOrder[o.id] ?? [];
    const lines = [
      `Solicitud ${o.order_number}`,
      `Fecha: ${formatDate(o.sent_at ?? o.created_at)}`,
      o.institution ? `Institución: ${o.institution}` : null,
      o.professional_name ? `Profesional: ${o.professional_name}` : null,
      '',
      'Productos:',
      ...items.map(it => `  • ${it.product_name} x${it.quantity}`),
      '',
      `Total estimado: ${formatPrice(o.estimated_total, o.currency)}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines);
    toast({ title: 'Resumen copiado', description: 'Listo para pegar en WhatsApp o email.' });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('supply_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (sponsor?.lab_id) q = q.eq('lab_id', sponsor.lab_id);
      const { data: ordData } = await q;
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
  }, [sponsor?.lab_id]);

  // Load orders saved from the cart. Persisted in localStorage (no backend),
  // already stored newest first.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('curatrack_orders') || '[]');
      if (Array.isArray(stored)) setMyOrders(stored as SimpleOrder[]);
    } catch {
      // Ignore malformed storage.
    }
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffMs = periodFilter === 'all' ? 0 : Date.now() - parseInt(periodFilter, 10) * 86400000;
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (cutoffMs > 0) {
        const ts = new Date(o.sent_at ?? o.created_at).getTime();
        if (ts < cutoffMs) return false;
      }
      if (q) {
        const hay = `${o.order_number} ${o.professional_name ?? ''} ${o.institution ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, periodFilter, search]);

  // KPIs (always over the unfiltered set so the user sees totals)
  const kpis = useMemo(() => {
    const totalProducts = Object.values(itemsByOrder).reduce(
      (sum, items) => sum + items.reduce((s, it) => s + (it.quantity || 0), 0), 0,
    );
    const valueDemand = orders.reduce((sum, o) => sum + Number(o.estimated_total ?? 0), 0);
    const sent = orders.filter(o => o.status === 'enviado').length;
    const confirmed = orders.filter(o => o.status === 'aprobado').length;
    const pending = orders.filter(o => o.status === 'borrador').length;
    // Mock conversion: orders / (orders + 30% extra recommendations)
    const conv = orders.length > 0 ? Math.round((orders.length / (orders.length * 1.4)) * 100) : 0;
    return { total: orders.length, pending, sent, confirmed, totalProducts, valueDemand, conv };
  }, [orders, itemsByOrder]);

  const sponsorName = sponsor?.sponsor_name ?? 'Laboratorio sponsor';

  if (isSponsorRole) {
    return <SponsorOrders />;
  }

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-5 animate-fade-in max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="heading-display text-2xl md:text-3xl flex items-center gap-2.5">
                <ShoppingBag className="h-7 w-7 text-primary" />
                Mis Pedidos
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="font-body">
                <Download className="h-4 w-4 mr-1.5" /> Exportar
              </Button>
              <Button size="sm" className="font-body" asChild>
                <Link to="/marketplace"><Plus className="h-4 w-4 mr-1.5" /> Nueva solicitud</Link>
              </Button>
            </div>
          </div>

          {/* Pedidos realizados */}
          <Card className="p-10 text-center border-dashed">
            {myOrders.length === 0 ? (
              <>
                <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="heading-display text-lg mb-1">Sin pedidos realizados</p>
                <p className="text-sm text-muted-foreground font-body mb-4">
                  Cuando realices un pedido se verá reflejado aquí.
                </p>
                <Button asChild><Link to="/marketplace">Ir al catálogo</Link></Button>
              </>
            ) : (
              <div className="space-y-2 text-left">
                {myOrders.map((o) => {
                  const products = o.items ?? [];
                  const totalUnits = products.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
                  return (
                    <button
                      key={o.id}
                      onClick={() => setOpenOrder(o)}
                      className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold">{formatDate(o.created_at)}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          {products.length} producto{products.length === 1 ? '' : 's'} · {totalUnits} insumo{totalUnits === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-body text-[10px] uppercase tracking-wide shrink-0">
                        Ver detalle
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { k: 'Totales', v: kpis.total, icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10', border: 'border-l-primary' },
              { k: 'Pendientes', v: kpis.pending, icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-l-muted-foreground/40' },
              { k: 'Enviadas', v: kpis.sent, icon: Send, color: 'text-info', bg: 'bg-info/10', border: 'border-l-info' },
              { k: 'Confirmadas', v: kpis.confirmed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', border: 'border-l-success' },
              { k: 'Productos', v: kpis.totalProducts, icon: Package, color: 'text-warning', bg: 'bg-warning/10', border: 'border-l-warning' },
              { k: 'Demanda estim.', v: formatPrice(kpis.valueDemand), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', border: 'border-l-primary', wide: true },
              { k: 'Conversión', v: `${kpis.conv}%`, icon: BarChart3, color: 'text-success', bg: 'bg-success/10', border: 'border-l-success' },
            ].map((c) => (
              <Card key={c.k} className={`rounded-xl border border-border/60 border-l-4 ${c.border} bg-card shadow-sm ${c.wide ? 'col-span-2 lg:col-span-1' : ''}`}>
                <CardContent className="p-3.5">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${c.bg} mb-2`}>
                    <c.icon className={`h-4 w-4 ${c.color}`} />
                  </div>
                  <div className="heading-display text-xl text-foreground leading-none truncate">{c.v}</div>
                  <div className="font-body text-[11px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wide">{c.k}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="border-border/60">
            <CardContent className="p-3 flex flex-col md:flex-row gap-2 items-stretch md:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por número, profesional o institución..."
                  className="pl-9 font-body"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="md:w-44 font-body"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="borrador">Pendiente</SelectItem>
                  <SelectItem value="enviado">Enviada</SelectItem>
                  <SelectItem value="aprobado">Confirmada</SelectItem>
                  <SelectItem value="rechazado">Requiere revisión</SelectItem>
                  <SelectItem value="cancelado">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="md:w-44 font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="font-body text-muted-foreground" disabled>
                <Filter className="h-4 w-4 mr-1.5" /> Más filtros
              </Button>
            </CardContent>
          </Card>

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="heading-display text-lg mb-1">Sin solicitudes para mostrar</p>
              <p className="text-sm text-muted-foreground font-body mb-4">
                Cuando confirmes una reposición desde el catálogo clínico, va a aparecer acá.
              </p>
              <Button asChild><Link to="/marketplace">Ir al catálogo</Link></Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((o) => {
                const cfg = statusConfig[o.status] ?? statusConfig.borrador;
                const Icon = cfg.icon;
                const items = itemsByOrder[o.id] ?? [];
                const canCancel = CANCELLABLE_STATUSES.has(o.status);
                const totalQty = items.reduce((s, it) => s + (it.quantity || 0), 0);
                return (
                  <Card key={o.id} className={`border-border/60 hover:shadow-md transition-shadow ${o.status === 'cancelado' ? 'opacity-70' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="heading-display text-base md:text-lg">
                              {o.order_number}
                            </CardTitle>
                            <Badge variant="outline" className={`${cfg.className} gap-1 font-body text-[10px] uppercase tracking-wide`}>
                              <Icon className="h-3 w-3" /> {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 font-body">
                            {formatDate(o.sent_at ?? o.created_at)}
                            {o.professional_name ? ` · ${o.professional_name}` : ''}
                            {o.institution ? ` · ${o.institution}` : ''}
                            {o.general_wound_type ? ` · ${o.general_wound_type}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-heading font-bold text-primary text-base">
                            {formatPrice(o.estimated_total, o.currency)}
                          </div>
                          <div className="font-body text-[11px] text-muted-foreground">
                            {items.length} producto{items.length === 1 ? '' : 's'} · {totalQty} u.
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="items" className="border-b-0">
                          <AccordionTrigger className="py-2 text-sm font-body">
                            Ver detalle
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              {items.map((it) => (
                                <div key={it.id} className="flex justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
                                  <div className="min-w-0">
                                    <p className="font-medium truncate font-body">{it.product_name}</p>
                                    {it.presentation && <p className="text-xs text-muted-foreground font-body">{it.presentation}</p>}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-muted-foreground font-body">x{it.quantity}</p>
                                    <p className="font-heading text-sm">{formatPrice(it.subtotal, it.currency)}</p>
                                  </div>
                                </div>
                              ))}
                              {(o.delivery_address || o.contact_phone || o.contact_email || o.clinical_recommendation || o.commercial_notes) && (
                                <div className="mt-3 pt-3 border-t space-y-1.5 text-xs font-body">
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
                      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t mt-2">
                        <Button variant="ghost" size="sm" className="font-body" onClick={() => handleCopySummary(o)}>
                          Copiar resumen
                        </Button>
                        {canCancel && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground font-body"
                            onClick={() => setCancelTarget(o)}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!openOrder} onOpenChange={(o) => { if (!o) setOpenOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="heading-display">
              Pedido · {openOrder ? formatDate(openOrder.created_at) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(openOrder?.items ?? []).length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">Este pedido no tiene productos.</p>
            ) : (
              (openOrder?.items ?? []).map((it, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 border-b border-border/60 last:border-0 pb-2 last:pb-0">
                  <span className="font-body text-sm">{it.name}</span>
                  <Badge variant="secondary" className="font-body shrink-0">x{it.quantity}</Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o && !cancelling) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="heading-display">¿Cancelar esta solicitud?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Vas a cancelar la solicitud <strong>{cancelTarget?.order_number}</strong>. El representante comercial verá el cambio de estado y no procesará la entrega. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCancel(); }}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Cancelando…</> : 'Sí, cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
