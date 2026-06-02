import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LabProduct } from '@/types/marketplace';
import { useToast } from '@/hooks/use-toast';

export type OrderStatus = 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'cancelado';

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
  contact_phone?: string;
  contact_email?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_notes?: string;
  channel?: 'whatsapp' | 'email' | 'manual';
}

const CartContext = createContext<CartContextValue | null>(null);

// The cart is persisted in localStorage (no backend) so it works with the local
// product catalog (data/dataProducto.js). Each line stores a product snapshot +
// quantity, which also keeps name/price/image available for the cart UI.
const CART_LS_KEY = 'curatrack_cart';

interface StoredCartItem {
  product: LabProduct;
  quantity: number;
}

function readStoredCart(): StoredCartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_LS_KEY) || '[]');
    return Array.isArray(raw) ? (raw as StoredCartItem[]).filter((s) => s && s.product && s.product.id) : [];
  } catch {
    return [];
  }
}

function writeStoredCart(items: StoredCartItem[]) {
  try {
    localStorage.setItem(CART_LS_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [stored, setStored] = useState<StoredCartItem[]>(() => readStoredCart());
  const [open, setOpen] = useState(false);

  // Track session — only needed for the legacy confirmOrder (supply_orders) flow.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Keep in sync when another tab updates the cart.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_LS_KEY) setStored(readStoredCart());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Single mutation helper: update state and persist atomically (no stale closures).
  const mutate = useCallback((updater: (prev: StoredCartItem[]) => StoredCartItem[]) => {
    setStored((prev) => {
      const next = updater(prev);
      writeStoredCart(next);
      return next;
    });
  }, []);

  const items: CartItemWithProduct[] = useMemo(
    () =>
      stored.map((s) => ({
        id: s.product.id,
        user_id: userId ?? '',
        product_id: s.product.id,
        quantity: s.quantity,
        notes: null,
        priority: 'normal',
        related_case_id: null,
        related_evolution_id: null,
        curation_date: null,
        created_at: '',
        updated_at: '',
        product: s.product,
      })),
    [stored, userId],
  );

  const itemCount = useMemo(() => stored.reduce((sum, s) => sum + s.quantity, 0), [stored]);
  const totalEstimated = useMemo(
    () => stored.reduce((sum, s) => sum + (s.product?.price ? Number(s.product.price) : 0) * s.quantity, 0),
    [stored],
  );

  const addProduct = useCallback(
    async (product: LabProduct, quantity = 1) => {
      mutate((prev) => {
        const idx = prev.findIndex((s) => s.product.id === product.id);
        if (idx >= 0) {
          return prev.map((s, i) => (i === idx ? { ...s, quantity: s.quantity + quantity } : s));
        }
        return [...prev, { product, quantity }];
      });
      toast({ title: 'Producto agregado al carrito', description: product.name });
    },
    [mutate, toast],
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      if (quantity < 1) return;
      mutate((prev) => prev.map((s) => (s.product.id === cartItemId ? { ...s, quantity } : s)));
    },
    [mutate],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      mutate((prev) => prev.filter((s) => s.product.id !== cartItemId));
    },
    [mutate],
  );

  const clearCart = useCallback(async () => {
    mutate(() => []);
  }, [mutate]);

  // Legacy checkout flow (CartDrawer → CheckoutDialog). The primary order flow now
  // lives in Cart.tsx (localStorage). Kept for interface compatibility.
  const confirmOrder = useCallback<CartContextValue['confirmOrder']>(
    async (input) => {
      if (!userId) return { ok: false, message: 'Sesión no válida' };
      if (items.length === 0) return { ok: false, message: 'El carrito está vacío' };

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
          contact_phone: input.contact_phone ?? null,
          contact_email: input.contact_email ?? null,
          delivery_address: input.delivery_address ?? null,
          delivery_city: input.delivery_city ?? null,
          delivery_postal_code: input.delivery_postal_code ?? null,
          delivery_notes: input.delivery_notes ?? null,
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
    loading: false,
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
