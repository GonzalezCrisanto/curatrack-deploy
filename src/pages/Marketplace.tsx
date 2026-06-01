import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { LabProduct, ProductCategory, ClinicalTag, getStockStatus } from '@/types/marketplace';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X, ShoppingBag, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCart } from '@/context/CartContext';
import { useSponsor } from '@/context/SponsorContext';

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export default function Marketplace() {
  const { toast } = useToast();
  const { addProduct } = useCart();
  const { sponsor } = useSponsor();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<LabProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [tags, setTags] = useState<ClinicalTag[]>([]);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let prodQuery = supabase.from('lab_products').select('*').eq('is_active', true).order('is_featured', { ascending: false }).order('name');
      if (sponsor?.lab_id) prodQuery = prodQuery.eq('lab_id', sponsor.lab_id);
      const [prodRes, catRes, tagRes] = await Promise.all([
        prodQuery,
        supabase.from('product_categories').select('*').order('sort_order'),
        supabase.from('product_clinical_tags').select('*').order('name'),
      ]);
      if (cancelled) return;
      if (prodRes.error || catRes.error || tagRes.error) {
        toast({
          title: 'No se pudo cargar el catálogo',
          description: prodRes.error?.message || catRes.error?.message || tagRes.error?.message,
          variant: 'destructive',
        });
      }
      setProducts((prodRes.data ?? []) as LabProduct[]);
      setCategories((catRes.data ?? []) as ProductCategory[]);
      setTags((tagRes.data ?? []) as ClinicalTag[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [toast, sponsor?.lab_id]);

  const categoriesById = useMemo(() => {
    const m = new Map<string, ProductCategory>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory && p.category_id !== activeCategory) return false;
      if (activeTags.length > 0 && !activeTags.every((t) => p.clinical_tags?.includes(t))) return false;
      if (stockFilter !== 'all' && getStockStatus(p) !== stockFilter) return false;
      if (q) {
        const blob = `${p.name} ${p.short_description ?? ''} ${p.description ?? ''} ${p.sku ?? ''} ${p.clinical_tags?.join(' ') ?? ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [products, search, activeCategory, activeTags, stockFilter]);

  const toggleTag = (slug: string) => {
    setActiveTags((prev) => (prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]));
  };

  const clearFilters = () => {
    setSearch('');
    setActiveCategory(null);
    setActiveTags([]);
    setStockFilter('all');
  };

  const hasFilters = !!search || !!activeCategory || activeTags.length > 0 || stockFilter !== 'all';

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-5 animate-fade-in max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="heading-display text-2xl md:text-3xl flex items-center gap-2.5">
              <ShoppingBag className="h-7 w-7 text-primary" />
              Catálogo de Insumos
            </h1>
          </div>
        </div>

        {/* Search + filters */}
        <Card className="border-border/60">
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto, SKU o descripción…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 font-body"
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeCategory === null ? 'default' : 'outline'}
                size="sm"
                className="font-body"
                onClick={() => setActiveCategory(null)}
              >
                Todas las categorías
              </Button>
              {categories.map((c) => (
                <Button
                  key={c.id}
                  variant={activeCategory === c.id ? 'default' : 'outline'}
                  size="sm"
                  className="font-body"
                  onClick={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
                >
                  {c.name}
                </Button>
              ))}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-body flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Filtros clínicos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => {
                    const active = activeTags.includes(t.slug);
                    return (
                      <Badge
                        key={t.id}
                        variant={active ? 'default' : 'outline'}
                        className="cursor-pointer select-none hover:bg-primary/10 font-body"
                        onClick={() => toggleTag(t.slug)}
                      >
                        {t.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active filters / count */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground font-body">
            {loading ? 'Cargando…' : `${filtered.length} producto${filtered.length === 1 ? '' : 's'}`}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 font-body">
              <X className="h-3 w-3" /> Limpiar filtros
            </Button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[380px] rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center border-border/60">
            <p className="heading-display text-lg mb-1">No encontramos productos</p>
            <p className="text-sm text-muted-foreground font-body mb-4">
              Probá ajustar los filtros o el término de búsqueda.
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" className="font-body" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                categoryName={p.category_id ? categoriesById.get(p.category_id)?.name : undefined}
                onAddToCart={(prod) => addProduct(prod, 1)}
                onView={() =>
                  toast({
                    title: p.name,
                    description: p.description || p.short_description || 'Detalle completo próximamente.',
                  })
                }
              />
            ))}
          </div>
        )}
        </div>
      </div>
    </AppLayout>
  );
}
