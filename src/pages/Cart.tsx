import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useCart } from '@/context/CartContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, ImageOff } from 'lucide-react';

function formatPrice(value: number | null | undefined, currency = 'ARS') {
  if (value == null) return 'A consultar';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value));
}

export default function Cart() {
  const navigate = useNavigate();
  const { items, itemCount, totalEstimated, updateQuantity, removeItem, clearCart, loading } = useCart();

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
          <div>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="font-body text-sm border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <Badge variant="outline" className="font-body text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5 mb-2">
                Insumos seleccionados
              </Badge>
              <h1 className="heading-display text-2xl md:text-3xl flex items-center gap-2.5">
                <ShoppingCart className="h-7 w-7 text-primary" />
                Carrito
              </h1>
              <p className="font-body text-sm text-muted-foreground mt-1 max-w-2xl">
                Productos agregados desde el Catálogo de Insumos. Pedido sin pago online.
              </p>
            </div>
          </div>

          {/* Lista de productos */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="heading-display text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Productos
                {itemCount > 0 && (
                  <Badge variant="secondary" className="font-body">{itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="font-body text-sm text-muted-foreground text-center py-8">Cargando…</p>
              ) : items.length === 0 ? (
                <div className="text-center py-12 space-y-3 border border-dashed border-border rounded-lg">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="heading-display text-lg">El carrito está vacío</p>
                  <p className="font-body text-sm text-muted-foreground">
                    Sumá productos desde el Catálogo de Insumos.
                  </p>
                  <Button variant="outline" className="font-body" onClick={() => navigate('/marketplace')}>
                    Ir al Catálogo de Insumos
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((it) => {
                    const price = it.product?.price ? Number(it.product.price) : null;
                    const subtotal = price != null ? price * it.quantity : null;
                    return (
                      <div key={it.id} className="flex gap-3 p-3 rounded-lg border border-border/60 bg-card">
                        <div className="h-16 w-16 rounded bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {it.product?.image_url ? (
                            <img src={it.product.image_url} alt={it.product?.name ?? ''} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <ImageOff className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm font-semibold leading-tight line-clamp-2">
                            {it.product?.name ?? 'Producto'}
                          </p>
                          {it.product?.presentation && (
                            <p className="font-body text-xs text-muted-foreground">{it.product.presentation}</p>
                          )}
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <div className="flex items-center border border-border/60 rounded-md">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(it.id, it.quantity - 1)}
                                disabled={it.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                value={it.quantity}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(v) && v >= 1) updateQuantity(it.id, v);
                                }}
                                className="h-7 w-10 text-center border-0 focus-visible:ring-0 p-0 text-sm font-body"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(it.id, it.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(it.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-body text-xs text-muted-foreground">{formatPrice(price)} c/u</span>
                            <span className="heading-display text-sm text-primary">{formatPrice(subtotal)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-muted-foreground">Total estimado</span>
                    <span className="heading-display text-xl text-primary">{formatPrice(totalEstimated)}</span>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button variant="outline" className="font-body" onClick={clearCart}>
                      Vaciar carrito
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
