export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface ClinicalTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface LabProduct {
  id: string;
  lab_id: string;
  category_id: string | null;
  name: string;
  short_description: string | null;
  description: string | null;
  sku: string | null;
  presentation: string | null;
  size: string | null;
  units_per_box: number | null;
  image_url: string | null;
  datasheet_url: string | null;
  usage_instructions: string | null;
  price: number | null;
  currency: string;
  price_updated_at: string;
  price_valid_until: string | null;
  stock: number | null;
  min_stock: number | null;
  stock_updated_at: string;
  is_active: boolean;
  is_featured: boolean;
  clinical_tags: string[];
  wound_types: string[];
}

export interface Lab {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';

export function getStockStatus(p: Pick<LabProduct, 'stock' | 'min_stock'>): StockStatus {
  if (p.stock === null || p.stock === undefined) return 'unknown';
  if (p.stock <= 0) return 'out_of_stock';
  if (p.min_stock != null && p.stock <= p.min_stock) return 'low_stock';
  return 'in_stock';
}
