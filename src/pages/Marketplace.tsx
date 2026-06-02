import { useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { LabProduct, ProductCategory, ClinicalTag, getStockStatus } from '@/types/marketplace';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/CartContext';
// Product catalog comes from a local JSON file (no backend). The file is a bare
// JSON array with no module export, so we read it raw and parse it.
import rawProductsData from '../../data/dataProducto.js?raw';

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

interface RawProduct {
  id: number;
  franquicia: string;
  categoria: string;
  icc_convatec: string;
  descripcion: string;
  precio_con_iva: number;
  img: string;
}

const RAW_PRODUCTS: RawProduct[] = JSON.parse(rawProductsData);

// Resolve the relative `img` path (e.g. "data/img/producto-1.jpg") to a URL that
// Vite bundles/serves. Matching is done by file name; missing images resolve to
// null so the card falls back to its placeholder.
const productImages = import.meta.glob('../../data/img/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// Remote placeholder used until real product images exist under data/img/.
const PLACEHOLDER_IMG = 'https://placehold.co/400x300/e2e8f0/64748b?text=Producto';

function resolveProductImage(img?: string): string {
  if (img) {
    // Absolute URL in the JSON (e.g. an external CDN) → use it directly.
    if (/^https?:\/\//i.test(img)) return img;
    // Otherwise treat it as a local file and match a bundled image by file name.
    const file = img.split('/').pop();
    if (file) {
      const entry = Object.entries(productImages).find(([path]) => path.endsWith(`/${file}`));
      if (entry) return entry[1];
    }
  }
  // No usable image → placeholder so the catalog shows something instead of an empty box.
  return PLACEHOLDER_IMG;
}

// Map the JSON shape to the LabProduct shape the UI already expects.
function mapToLabProduct(p: RawProduct): LabProduct {
  return {
    id: String(p.id),
    lab_id: '',
    category_id: p.categoria,
    name: p.descripcion,
    short_description: null,
    description: p.descripcion,
    sku: p.icc_convatec,
    presentation: null,
    size: null,
    units_per_box: null,
    image_url: resolveProductImage(p.img),
    datasheet_url: null,
    usage_instructions: null,
    price: p.precio_con_iva,
    currency: 'ARS',
    price_updated_at: '',
    price_valid_until: null,
    stock: null,
    min_stock: null,
    stock_updated_at: '',
    is_active: true,
    is_featured: false,
    clinical_tags: [],
    wound_types: [],
  };
}

const ALL_PRODUCTS: LabProduct[] = RAW_PRODUCTS.map(mapToLabProduct);

const ALL_CATEGORIES: ProductCategory[] = Array.from(new Set(RAW_PRODUCTS.map((p) => p.categoria))).map(
  (categoria, i) => ({ id: categoria, name: categoria, slug: categoria, description: null, icon: null, sort_order: i }),
);

export default function Marketplace() {
  const { toast } = useToast();
  const { addProduct } = useCart();

  const products = ALL_PRODUCTS;
  const categories = ALL_CATEGORIES;
  const tags: ClinicalTag[] = [];

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

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
            {`${filtered.length} producto${filtered.length === 1 ? '' : 's'}`}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 font-body">
              <X className="h-3 w-3" /> Limpiar filtros
            </Button>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
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
