import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Star, ShoppingCart, ImageOff } from 'lucide-react';
import { LabProduct, getStockStatus } from '@/types/marketplace';

interface Props {
  product: LabProduct;
  categoryName?: string;
  onAddToCart?: (p: LabProduct) => void;
  onView?: (p: LabProduct) => void;
}

const stockStyles: Record<string, { label: string; className: string }> = {
  in_stock: { label: 'En stock', className: 'bg-success/15 text-success border-success/30' },
  low_stock: { label: 'Stock bajo', className: 'bg-warning/20 text-warning-foreground border-warning/40' },
  out_of_stock: { label: 'Sin stock', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  unknown: { label: 'Consultar stock', className: 'bg-muted text-muted-foreground border-border' },
};

export function ProductCard({ product, categoryName, onAddToCart, onView }: Props) {
  const status = getStockStatus(product);
  const stock = stockStyles[status];
  const priceLabel = product.price != null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: product.currency || 'ARS', maximumFractionDigits: 0 }).format(Number(product.price))
    : 'Precio a consultar';

  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground border-0 gap-1">
            <Star className="h-3 w-3" /> Destacado
          </Badge>
        )}
        <Badge variant="outline" className={`absolute top-2 right-2 ${stock.className}`}>
          {stock.label}
        </Badge>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col gap-2">
        {categoryName && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-body">{categoryName}</p>
        )}
        <h3 className="font-heading font-semibold leading-tight line-clamp-2">{product.name}</h3>
        {product.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2 font-body">{product.short_description}</p>
        )}
        {product.presentation && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Package className="h-3 w-3" /> {product.presentation}
            {product.size ? ` · ${product.size}` : ''}
          </p>
        )}
        {product.clinical_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {product.clinical_tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>
            ))}
          </div>
        )}
        <div className="mt-auto pt-2">
          <p className="font-heading text-lg font-bold text-primary">{priceLabel}</p>
          <p className="text-[10px] text-muted-foreground">Precio estimado · sin pago online</p>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onView?.(product)}>
          Ver detalle
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1"
          disabled={status === 'out_of_stock'}
          onClick={() => onAddToCart?.(product)}
        >
          <ShoppingCart className="h-4 w-4" /> Sumar
        </Button>
      </CardFooter>
    </Card>
  );
}
