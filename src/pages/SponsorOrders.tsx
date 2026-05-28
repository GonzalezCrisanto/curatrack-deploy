import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Search, ShieldCheck, Download } from 'lucide-react';
import { useSponsor } from '@/context/SponsorContext';
import { supabase } from '@/integrations/supabase/client';

type SponsorOrder = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  institution: string;
  general_wound_type: string;
  estimated_total: number | null;
  currency: string;
  anonymized_case_code: string;
};

type SponsorOrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  subtotal: number | null;
  currency: string;
};

function formatPrice(value: number | null | undefined, currency = 'ARS') {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value));
}

export default function SponsorOrders() {
  const { sponsor } = useSponsor();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<SponsorOrder[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, SponsorOrderItem[]>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: ords } = await supabase.rpc('get_sponsor_orders_anon' as never, { p_period_days: null } as never);
      const safeOrders = (ords ?? []) as SponsorOrder[];
      setOrders(safeOrders);

      const orderIds = safeOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        const { data: items } = await supabase.rpc('get_sponsor_order_items_anon' as never, { p_order_ids: orderIds } as never);
        const grouped: Record<string, SponsorOrderItem[]> = {};
        ((items ?? []) as SponsorOrderItem[]).forEach((it) => {
          (grouped[it.order_id] ||= []).push(it);
        });
        setItemsByOrder(grouped);
      } else {
        setItemsByOrder({});
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      const blob = `${o.order_number} ${o.institution} ${o.general_wound_type} ${o.anonymized_case_code}`.toLowerCase();
      return blob.includes(q);
    });
  }, [orders, statusFilter, search]);

  const exportCsv = () => {
    const rows = [
      'pedido,fecha,codigo_caso,tipo_herida,institucion,estado,total',
      ...filtered.map((o) =>
        [
          o.order_number,
          String(o.created_at).slice(0, 10),
          o.anonymized_case_code,
          o.general_wound_type,
          o.institution,
          o.status,
          o.estimated_total ?? '',
        ].join(','),
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curatrack-pedidos-sponsor-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="heading-display text-2xl md:text-3xl flex items-center gap-2.5">
              <ClipboardList className="h-7 w-7 text-primary" />
              Pedidos del sponsor
            </h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Vista filtrada por laboratorio: {sponsor?.sponsor_name ?? '—'}.
            </p>
          </div>
          <Button variant="outline" size="sm" className="font-body" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1.5" /> Exportar CSV
          </Button>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-3 flex flex-col md:flex-row gap-2 items-stretch md:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 font-body"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número, código de caso o tipo de herida..."
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-44 font-body"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="borrador">Pendiente</SelectItem>
                <SelectItem value="enviado">Enviada</SelectItem>
                <SelectItem value="aprobado">Confirmada</SelectItem>
                <SelectItem value="rechazado">Requiere revisión</SelectItem>
                <SelectItem value="cancelado">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-border/60 bg-accent/40 p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="font-body text-xs text-muted-foreground leading-relaxed">
            Vista anonimizada: se reemplaza la identificación del paciente por código de caso. Nunca se exponen nombre, DNI,
            foto, dirección ni datos de contacto.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const orderItems = itemsByOrder[o.id] ?? [];
              const totalQty = orderItems.reduce((acc, it) => acc + (it.quantity ?? 0), 0);
              return (
                <Card key={o.id} className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <CardTitle className="font-heading text-base">{o.order_number}</CardTitle>
                      <Badge variant="outline" className="text-[10px] uppercase">{o.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <p className="font-body text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString('es-AR')} · {o.anonymized_case_code} · {o.general_wound_type}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">
                      Institución: {o.institution || 'Institución no especificada'}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-body text-muted-foreground">{orderItems.length} productos · {totalQty} unidades</span>
                      <span className="font-heading">{formatPrice(o.estimated_total, o.currency)}</span>
                    </div>
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
