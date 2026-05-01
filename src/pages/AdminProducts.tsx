import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { LabProduct } from '@/types/marketplace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Pencil, Trash2, Search } from 'lucide-react';

interface ProductForm {
  name: string;
  short_description: string;
  description: string;
  sku: string;
  presentation: string;
  size: string;
  price: string;
  stock: string;
  min_stock: string;
  is_active: boolean;
  is_featured: boolean;
  image_url: string;
}

const emptyForm: ProductForm = {
  name: '', short_description: '', description: '', sku: '', presentation: '',
  size: '', price: '', stock: '', min_stock: '', is_active: true, is_featured: false, image_url: '',
};

function formFromProduct(p: LabProduct): ProductForm {
  return {
    name: p.name,
    short_description: p.short_description ?? '',
    description: p.description ?? '',
    sku: p.sku ?? '',
    presentation: p.presentation ?? '',
    size: p.size ?? '',
    price: p.price != null ? String(p.price) : '',
    stock: p.stock != null ? String(p.stock) : '',
    min_stock: p.min_stock != null ? String(p.min_stock) : '',
    is_active: p.is_active,
    is_featured: p.is_featured,
    image_url: p.image_url ?? '',
  };
}

export default function AdminProducts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<LabProduct[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [labId, setLabId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Load all products (admin sees all, including inactive)
      const { data: prods } = await supabase.from('lab_products').select('*').order('name');
      setProducts((prods ?? []) as LabProduct[]);
      // Get the lab ID
      const { data: labs } = await supabase.from('labs').select('id').eq('is_active', true).limit(1);
      if (labs?.[0]) setLabId(labs[0].id);
      setLoading(false);
    })();
  }, []);

  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.name} ${p.sku ?? ''} ${p.short_description ?? ''}`.toLowerCase().includes(q);
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: LabProduct) => {
    setEditingId(p.id);
    setForm(formFromProduct(p));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      short_description: form.short_description || null,
      description: form.description || null,
      sku: form.sku || null,
      presentation: form.presentation || null,
      size: form.size || null,
      price: form.price ? Number(form.price) : null,
      stock: form.stock ? Number(form.stock) : null,
      min_stock: form.min_stock ? Number(form.min_stock) : null,
      is_active: form.is_active,
      is_featured: form.is_featured,
      image_url: form.image_url || null,
      lab_id: labId ?? '',
    };

    if (editingId) {
      const { lab_id: _l, ...updatable } = payload;
      const { error } = await supabase.from('lab_products').update(updatable).eq('id', editingId);
      if (error) {
        toast({ title: 'Error al guardar', description: error.message, variant: 'destructive' });
      } else {
        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...updatable } as LabProduct : p));
        toast({ title: 'Producto actualizado' });
        setDialogOpen(false);
      }
    } else {
      const { data, error } = await supabase.from('lab_products').insert(payload).select().single();
      if (error) {
        toast({ title: 'Error al crear', description: error.message, variant: 'destructive' });
      } else {
        setProducts(prev => [data as LabProduct, ...prev]);
        toast({ title: 'Producto creado' });
        setDialogOpen(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (p: LabProduct) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    const { error } = await supabase.from('lab_products').delete().eq('id', p.id);
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
    } else {
      setProducts(prev => prev.filter(x => x.id !== p.id));
      toast({ title: 'Producto eliminado' });
    }
  };

  const setField = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Package className="h-7 w-7 text-primary" />
              Gestión de productos
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Administrá el catálogo de insumos del marketplace.
            </p>
          </div>
          <Button onClick={openNew} className="gap-1">
            <Plus className="h-4 w-4" /> Nuevo producto
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar producto…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-heading font-semibold">No hay productos</p>
            <p className="text-sm text-muted-foreground font-body mt-1">Creá un producto para empezar.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <Card key={p.id} className={`p-4 flex items-center gap-4 ${!p.is_active ? 'opacity-60' : ''}`}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-heading font-semibold text-sm truncate">{p.name}</p>
                    {p.is_featured && <Badge variant="default" className="text-[10px]">Destacado</Badge>}
                    {!p.is_active && <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.sku ?? '—'} · Stock: {p.stock ?? '—'} · ${p.price ?? '—'}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Descripción corta</Label>
              <Input value={form.short_description} onChange={e => setField('short_description', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Descripción completa</Label>
              <Textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>SKU</Label><Input value={form.sku} onChange={e => setField('sku', e.target.value)} /></div>
              <div className="space-y-1"><Label>Presentación</Label><Input value={form.presentation} onChange={e => setField('presentation', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Precio</Label><Input type="number" value={form.price} onChange={e => setField('price', e.target.value)} /></div>
              <div className="space-y-1"><Label>Stock</Label><Input type="number" value={form.stock} onChange={e => setField('stock', e.target.value)} /></div>
              <div className="space-y-1"><Label>Stock mínimo</Label><Input type="number" value={form.min_stock} onChange={e => setField('min_stock', e.target.value)} /></div>
            </div>
            <div className="space-y-1">
              <Label>URL imagen</Label>
              <Input value={form.image_url} onChange={e => setField('image_url', e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form.is_active} onCheckedChange={v => setField('is_active', v)} /> Activo
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form.is_featured} onCheckedChange={v => setField('is_featured', v)} /> Destacado
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
