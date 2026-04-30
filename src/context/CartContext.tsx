import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LabProduct } from '@/types/marketplace';
import { useToast } from '@/hooks/use-toast';

export type OrderStatus = 'borrador' | 'enviado' | 'aprobado' | 'rechazado';

export interface CartItemRow {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  priority: string;
  related_case_id: string | null;
  related_evolution_id: string | null;
  curation_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItemWithProduct extends CartItemRow {
  product: LabProduct | null;
}

interface CartContextValue {
  items: CartItemWithProduct[];
  itemCount: number;
  totalEstimated: number;
  loading: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  addProduct: (product: LabProduct, quantity?: number) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  confirmOrder: (input: ConfirmOrderInput) => Promise<{ ok: boolean; orderId?: string; orderNumber?: string; message?: string }>;
}

export interface ConfirmOrderInput {
  professional_name?: string;
  institution?: string;
  general_wound_type?: string;
  clinical_recommendation?: string;
  commercial_notes?: string;
  channel?: 'whatsapp' | 'email' | 'manual';
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<CartItemRow[]>([]);
  const [products, setProducts] = useState<Record<string, LabProduct>>({});
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Track session
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load cart whenever user changes
  const reload = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setProducts({});
      return;
    }
    setLoading(true);
    const { data: cartData, error } = await supabase
      .from('cart_items')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Cart load error', error);
      setLoading(false);
      return;
    }
    const cartRows = (cartData ?? []) as CartItemRow[];
    setRows(cartRows);

    const ids = Array.from(new Set(cartRows.map((r) => r.product_id)));
    if (ids.length > 0) {
      const { data: prodData } = await supabase
        .from('lab_products')
        .select('*')
        .in('id', ids);
      const map: Record<string, LabProduct> = {};
      (prodData ?? []).forEach((p) => {
        map[p.id] = p as LabProduct;
      });
      setProducts(map);
    } else {
      setProducts({});
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const items: CartItemWithProduct[] = useMemo(
    () => rows.map((r) => ({ ...r, product: products[r.product_id] ?? null })),
    [rows, products],
  );

  const itemCount = useMemo(() => rows.reduce((sum, r) => sum + r.quantity, 0), [rows]);
  const totalEstimated = useMemo(
    () =>
      items.reduce((sum, it) => {
        const price = it.product?.price ? Number(it.product.price) : 0;
        return sum + price * it.quantity;
      }, 0),
    [items],
  );

  const addProduct = useCallback(
    async (product: LabProduct, quantity = 1) => {
      if (!userId) {
        toast({ title: 'Iniciá sesión', description: 'Necesitás una cuenta para usar el carrito.', variant: 'destructive' });
        return;
      }
      const existing = rows.find((r) => r.product_id === product.id);
      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({
          user_id: userId,
          product_id: product.id,
          quantity,
        });
      }
      await reload();
      toast({ title: 'Producto agregado al carrito', description: product.name });
    },
    [userId, rows, reload, toast],
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      if (quantity < 1) return;
      await supabase
        .from('cart_items')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', cartItemId);
      await reload();
    },
    [reload],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      await supabase.from('cart_items').delete().eq('id', cartItemId);
      await reload();
    },
    [reload],
  );

  const clearCart = useCallback(async () => {
    if (!userId) return;
    await supabase.from('cart_items').delete().eq('user_id', userId);
    await reload();
  }, [userId, reload]);

  const confirmOrder = useCallback<CartContextValue['confirmOrder']>(
    async (input) => {
      if (!userId) return { ok: false, message: 'Sesión no válida' };
      if (items.length === 0) return { ok: false, message: 'El carrito está vacío' };

      // Resolve sponsor + seller (best effort)
      const { data: sponsorRow } = await supabase
        .from('user_lab_sponsors')
        .select('lab_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      const labId = sponsorRow?.lab_id ?? items[0]?.product?.lab_id ?? null;

      let sellerId: string | null = null;
      if (labId) {
        const { data: sellerRow } = await supabase
          .from('lab_sellers')
          .select('id')
          .eq('lab_id', labId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        sellerId = sellerRow?.id ?? null;
      }

      // Generate order number via RPC (function exists in DB)
      let orderNumber = `CT-${Date.now()}`;
      try {
        const { data: numData } = await supabase.rpc('generate_order_number' as never);
        if (typeof numData === 'string' && numData) orderNumber = numData;
      } catch {
        // fallback to timestamp
      }

      const estimatedTotal = totalEstimated;

      const { data: orderData, error: orderErr } = await supabase
        .from('supply_orders')
        .insert({
          user_id: userId,
          lab_id: labId,
          seller_id: sellerId,
          order_number: orderNumber,
          status: 'enviado' as OrderStatus,
          professional_name: input.professional_name ?? null,
          institution: input.institution ?? null,
          general_wound_type: input.general_wound_type ?? null,
          clinical_recommendation: input.clinical_recommendation ?? null,
          commercial_notes: input.commercial_notes ?? null,
          estimated_total: estimatedTotal,
          currency: 'ARS',
          channel: input.channel ?? 'manual',
          sent_at: new Date().toISOString(),
        })
        .select('id, order_number')
        .single();

      if (orderErr || !orderData) {
        return { ok: false, message: orderErr?.message || 'No se pudo crear el pedido' };
      }

      const itemsPayload = items.map((it) => {
        const unitPrice = it.product?.price ? Number(it.product.price) : null;
        return {
          order_id: orderData.id,
          product_id: it.product_id,
          product_name: it.product?.name ?? 'Producto',
          product_sku: it.product?.sku ?? null,
          presentation: it.product?.presentation ?? null,
          quantity: it.quantity,
          unit_price: unitPrice,
          subtotal: unitPrice != null ? unitPrice * it.quantity : null,
          currency: it.product?.currency ?? 'ARS',
          priority: it.priority,
          notes: it.notes,
        };
      });

      const { error: itemsErr } = await supabase.from('supply_order_items').insert(itemsPayload);
      if (itemsErr) {
        return { ok: false, message: itemsErr.message };
      }

      await clearCart();
      return { ok: true, orderId: orderData.id, orderNumber: orderData.order_number };
    },
    [userId, items, totalEstimated, clearCart],
  );

  const value: CartContextValue = {
    items,
    itemCount,
    totalEstimated,
    loading,
    open,
    setOpen,
    addProduct,
    updateQuantity,
    removeItem,
    clearCart,
    confirmOrder,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
