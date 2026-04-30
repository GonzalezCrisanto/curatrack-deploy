import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Minus, ShoppingCart, ImageOff, AlertCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { CheckoutDialog } from './CheckoutDialog';

function formatPrice(value: number | null | undefined, currency = 'ARS') {
  if (value == null) return 'A consultar';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value));
}

export function CartDrawer() {
  const { open, setOpen, items, itemCount, totalEstimated, updateQuantity, removeItem, clearCart, loading } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="font-heading flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Tu carrito
              {itemCount > 0 && (
                <Badge variant="secondary">{itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}</Badge>
              )}
            </SheetTitle>
            <SheetDescription className="font-body text-xs">
              Pedido sin pago online. Confirmar envía la solicitud al vendedor asignado.
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Cargando…</p>
              ) : items.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="font-heading font-medium">El carrito está vacío</p>
                  <p className="text-sm text-muted-foreground font-body">
                    Sumá productos desde el Marketplace.
                  </p>
                </div>
              ) : (
                items.map((it) => {
                  const price = it.product?.price ? Number(it.product.price) : null;
                  const subtotal = price != null ? price * it.quantity : null;
                  return (
                    <div key={it.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                      <div className="h-16 w-16 rounded bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {it.product?.image_url ? (
                          <img src={it.product.image_url} alt={it.product?.name ?? ''} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <ImageOff className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-sm font-semibold leading-tight line-clamp-2">
                          {it.product?.name ?? 'Producto'}
                        </p>
                        {it.product?.presentation && (
                          <p className="text-xs text-muted-foreground">{it.product.presentation}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <div className="flex items-center border rounded-md">
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
                              className="h-7 w-10 text-center border-0 focus-visible:ring-0 p-0 text-sm"
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
                          <span className="text-xs text-muted-foreground">{formatPrice(price)} c/u</span>
                          <span className="font-heading text-sm font-semibold text-primary">
                            {formatPrice(subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {items.length > 0 && (
            <>
              <Separator />
              <div className="p-6 space-y-3">
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-accent/40 p-2 rounded">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Precios y stock estimados. La confirmación final la realiza el vendedor.</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-muted-foreground">Total estimado</span>
                  <span className="font-heading text-xl font-bold text-primary">{formatPrice(totalEstimated)}</span>
                </div>
              </div>
              <SheetFooter className="p-6 pt-0 flex-col sm:flex-col gap-2">
                <Button className="w-full" size="lg" onClick={() => setCheckoutOpen(true)}>
                  Confirmar pedido
                </Button>
                <Button variant="ghost" className="w-full" onClick={clearCart}>
                  Vaciar carrito
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onSuccess={() => {
          setCheckoutOpen(false);
          setOpen(false);
        }}
      />
    </>
  );
}

export function CartButton() {
  const { setOpen, itemCount } = useCart();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9"
      onClick={() => setOpen(true)}
      aria-label="Abrir carrito"
    >
      <ShoppingCart className="h-4 w-4" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Button>
  );
}
