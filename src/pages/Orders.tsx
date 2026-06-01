import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import SponsorOrders from '@/pages/SponsorOrders';

// Orders created from the cart "Realizar Pedido" flow, persisted in localStorage.
interface SimpleOrder {
  id: string;
  created_at: string;
  items: { name: string; quantity: number }[];
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Orders() {
  const { isSponsorRole } = usePermissions();
  const [myOrders, setMyOrders] = useState<SimpleOrder[]>([]);
  const [openOrder, setOpenOrder] = useState<SimpleOrder | null>(null);

  // Orders are read from localStorage (no Supabase), already stored newest first.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('curatrack_orders') || '[]');
      if (Array.isArray(stored)) setMyOrders(stored as SimpleOrder[]);
    } catch {
      // Ignore malformed storage.
    }
  }, []);

  if (isSponsorRole) {
    return <SponsorOrders />;
  }

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
          {/* Header */}
          <div>
            <h1 className="heading-display text-2xl md:text-3xl flex items-center gap-2.5">
              <ShoppingBag className="h-7 w-7 text-primary" />
              Mis Pedidos
            </h1>
          </div>

          {/* Pedidos */}
          {myOrders.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="p-10 text-center flex flex-col items-center gap-3">
                <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="heading-display text-lg mb-1">Sin pedidos realizados</p>
                  <p className="font-body text-sm text-muted-foreground">
                    Cuando realices un pedido se verá reflejado aquí.
                  </p>
                </div>
                <Button asChild className="font-body">
                  <Link to="/marketplace">Ir al catálogo</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myOrders.map((o) => {
                const products = o.items ?? [];
                const totalUnits = products.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
                return (
                  <Card key={o.id} className="border-border/60">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold">{formatDate(o.created_at)}</p>
                        <p className="font-body text-xs text-muted-foreground mt-0.5">
                          {products.length} producto{products.length === 1 ? '' : 's'} · {totalUnits} insumo{totalUnits === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="font-body shrink-0" onClick={() => setOpenOrder(o)}>
                        Ver detalle
                      </Button>
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
    </AppLayout>
  );
}
