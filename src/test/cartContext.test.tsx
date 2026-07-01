// Coverage target: src/context/CartContext.tsx — localStorage-based cart operations

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// CartProvider tracks the Supabase auth session only for the legacy confirmOrder flow.
// All add/remove/update/clear operations are purely localStorage — no Supabase needed.
// The mock below satisfies the useEffect that subscribes to auth state on mount.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null }),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { CartProvider, useCart } from '@/context/CartContext';
import type { LabProduct } from '@/types/marketplace';

const CART_LS_KEY = 'curatrack_cart';

function makeProduct(overrides: Partial<LabProduct> = {}): LabProduct {
  return {
    id: 'prod-1',
    lab_id: 'lab-1',
    category_id: null,
    name: 'Test Product',
    short_description: null,
    description: null,
    sku: 'SKU-001',
    presentation: null,
    size: null,
    units_per_box: null,
    image_url: null,
    datasheet_url: null,
    usage_instructions: null,
    price: 100,
    currency: 'ARS',
    price_updated_at: new Date().toISOString(),
    price_valid_until: null,
    stock: 50,
    min_stock: 5,
    stock_updated_at: new Date().toISOString(),
    is_active: true,
    is_featured: false,
    clinical_tags: [],
    wound_types: [],
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

// ---- Initial state ----

describe('CartContext — initial state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty cart when localStorage is empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalEstimated).toBe(0);
  });

  it('hydrates from a pre-existing localStorage cart on mount', () => {
    const stored = [{ product: makeProduct(), quantity: 3 }];
    localStorage.setItem(CART_LS_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.itemCount).toBe(3);
  });

  it('gracefully handles corrupt localStorage data', () => {
    localStorage.setItem(CART_LS_KEY, 'not-valid-json{{{');
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
  });
});

// ---- addProduct ----

describe('CartContext — addProduct', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a new product and persists the entry to localStorage', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct(), 1);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.itemCount).toBe(1);

    const persisted = JSON.parse(localStorage.getItem(CART_LS_KEY) || '[]');
    expect(persisted).toHaveLength(1);
    expect(persisted[0].product.id).toBe('prod-1');
    expect(persisted[0].quantity).toBe(1);
  });

  it('increments quantity when the same product is added a second time', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();

    await act(async () => {
      await result.current.addProduct(product, 1);
      await result.current.addProduct(product, 2);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.itemCount).toBe(3);
  });

  it('creates separate cart lines for distinct products', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct({ id: 'prod-1' }), 1);
      await result.current.addProduct(makeProduct({ id: 'prod-2', name: 'Product B' }), 1);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.itemCount).toBe(2);
  });

  it('uses quantity 1 as default when no quantity is passed', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct());
    });

    expect(result.current.itemCount).toBe(1);
  });
});

// ---- updateQuantity ----

describe('CartContext — updateQuantity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('updates the quantity of an existing item and persists to localStorage', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct(), 1);
      await result.current.updateQuantity('prod-1', 5);
    });

    expect(result.current.itemCount).toBe(5);

    const persisted = JSON.parse(localStorage.getItem(CART_LS_KEY) || '[]');
    expect(persisted[0].quantity).toBe(5);
  });

  it('ignores calls with quantity < 1 (guard against zeroing out)', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct(), 3);
      await result.current.updateQuantity('prod-1', 0);
    });

    // quantity must stay at 3
    expect(result.current.itemCount).toBe(3);
  });
});

// ---- removeItem ----

describe('CartContext — removeItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes the item from state and from localStorage', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct(), 2);
      await result.current.removeItem('prod-1');
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);

    const persisted = JSON.parse(localStorage.getItem(CART_LS_KEY) || '[]');
    expect(persisted).toHaveLength(0);
  });

  it('only removes the targeted product, leaving others intact', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct({ id: 'prod-1' }), 1);
      await result.current.addProduct(makeProduct({ id: 'prod-2', name: 'B' }), 1);
      await result.current.removeItem('prod-1');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].product_id).toBe('prod-2');
  });
});

// ---- clearCart ----

describe('CartContext — clearCart', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('empties all items and writes an empty array to localStorage', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct({ id: 'prod-1' }), 1);
      await result.current.addProduct(makeProduct({ id: 'prod-2', name: 'B' }), 2);
      await result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalEstimated).toBe(0);

    const persisted = JSON.parse(localStorage.getItem(CART_LS_KEY) || '[]');
    expect(persisted).toHaveLength(0);
  });
});

// ---- totalEstimated ----

describe('CartContext — totalEstimated', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('calculates total correctly across multiple items and quantities', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct({ id: 'p1', price: 100 }), 2);
      await result.current.addProduct(makeProduct({ id: 'p2', name: 'B', price: 50 }), 3);
    });

    // 2 × 100 + 3 × 50 = 350
    expect(result.current.totalEstimated).toBe(350);
  });

  it('treats a null price as 0 in the total', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct({ id: 'p1', price: null }), 2);
    });

    expect(result.current.totalEstimated).toBe(0);
  });

  it('recalculates total after updateQuantity', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addProduct(makeProduct({ id: 'p1', price: 10 }), 1);
      await result.current.updateQuantity('p1', 4);
    });

    expect(result.current.totalEstimated).toBe(40);
  });
});
