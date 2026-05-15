import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronLeft, ChevronRight, Search, User, Activity, Camera, Package, Sparkles,
  CheckCircle2, ShoppingBag, Save, Copy, ArrowLeft, AlertCircle, Pill, Plus, X, FileText,
} from 'lucide-react';
import type { Patient, WoundCase } from '@/data/demoData';

type SupplyLine = {
  id: string;
  productId?: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  used: boolean;
  restock: boolean;
  isSponsor?: boolean;
  unitPrice?: number | null;
  presentation?: string | null;
  sku?: string | null;
};

type LabProduct = {
  id: string; name: string; category?: string | null; presentation?: string | null;
  sku?: string | null; price?: number | null; currency?: string | null; lab_id: string;
  wound_types?: string[] | null;
};

const SUPPLY_CATEGORIES = [
  'Apósitos', 'Gasas', 'Solución de limpieza', 'Guantes', 'Fijación',
  'Vendas', 'Cremas/Barreras', 'Instrumental', 'Otros',
];

const STEPS = [
  { n: 1, label: 'Paciente', icon: User },
  { n: 2, label: 'Evaluación', icon: Activity },
  { n: 3, label: 'Fotos', icon: Camera },
  { n: 4, label: 'Insumos', icon: Package },
  { n: 5, label: 'Recomendaciones', icon: Sparkles },
  { n: 6, label: 'Resumen', icon: CheckCircle2 },
];

function newId() { return Math.random().toString(36).slice(2, 10); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function nowHM() { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

export default function NewCuration() {
  const { patients, currentUser, currentUserName } = useApp();
  const { sponsor } = useSponsor();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();

  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState<string | null>(params.get('patientId'));
  const [caseId, setCaseId] = useState<string | null>(params.get('caseId'));

  // Step 2 — clinical
  const [evo, setEvo] = useState({
    date: todayISO(),
    time: nowHM(),
    professional: currentUserName || '',
    pain: 3,
    exudate: 'moderado',
    odor: 'no',
    infection: 'no',
    size: '',
    depth: '',
    tissue: 'granulación',
    edges: 'definidos',
    perilesional: 'sana',
    observations: '',
    procedure: '',
    healingFrequency: 'cada 3 días',
    nextControl: '',
  });

  // Step 4 — supplies
  const [supplies, setSupplies] = useState<SupplyLine[]>([]);
  const [sponsorProducts, setSponsorProducts] = useState<LabProduct[]>([]);
  const [productQuery, setProductQuery] = useState('');

  // Step 6
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (currentUserName) setEvo(e => ({ ...e, professional: currentUserName })); }, [currentUserName]);

  // Load sponsor products
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = supabase.from('lab_products').select('id,name,category:product_categories(slug,name),presentation,sku,price,currency,lab_id,wound_types').eq('is_active', true).limit(200);
      if (sponsor?.lab_id) q.eq('lab_id', sponsor.lab_id);
      const { data } = await q;
      if (cancelled) return;
      const mapped: LabProduct[] = (data ?? []).map((p: any) => ({
        id: p.id, name: p.name,
        category: p.category?.name ?? null,
        presentation: p.presentation, sku: p.sku, price: p.price,
        currency: p.currency, lab_id: p.lab_id, wound_types: p.wound_types,
      }));
      setSponsorProducts(mapped);
    })();
    return () => { cancelled = true; };
  }, [sponsor?.lab_id]);

  const patient: Patient | undefined = useMemo(
    () => patients.find(p => p.id === patientId), [patients, patientId]);
  const wcase: WoundCase | undefined = useMemo(
    () => patient?.cases.find(c => c.id === caseId), [patient, caseId]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.dni ?? '').toLowerCase().includes(q),
    );
  }, [patients, search]);

  // --- Recommendations: derive from wound type + exudate + sponsor catalog ---
  const recommendations = useMemo(() => {
    const recs: Array<{ category: string; reason: string; sponsor?: LabProduct }> = [];
    if (!wcase) return recs;
    const wt = (wcase.woundType || '').toLowerCase();
    const heavyExudate = evo.exudate === 'abundante' || evo.exudate === 'moderado';
    const matchSponsor = (cat: string) =>
      sponsorProducts.find(p =>
        (p.category ?? '').toLowerCase().includes(cat.toLowerCase()) ||
        (p.wound_types ?? []).some(w => w.toLowerCase().includes(wt)),
      );

    if (heavyExudate) {
      const sp = matchSponsor('apósito') ?? matchSponsor('absorbente') ?? sponsorProducts[0];
      recs.push({ category: 'Apósito absorbente', reason: 'Para heridas con exudado moderado/abundante.', sponsor: sp });
    }
    if (evo.infection === 'sospecha' || evo.infection === 'si') {
      const sp = matchSponsor('antimicrobiano') ?? matchSponsor('plata') ?? matchSponsor('apósito');
      recs.push({ category: 'Apósito antimicrobiano', reason: 'Por sospecha de infección local.', sponsor: sp });
    }
    if (wt.includes('venosa') || wt.includes('presión') || wt.includes('presion')) {
      const sp = matchSponsor('venda') ?? matchSponsor('compresión') ?? matchSponsor('compresion');
      recs.push({ category: 'Vendaje compresivo', reason: 'Adecuado para úlceras con componente vascular.', sponsor: sp });
    }
    {
      const sp = matchSponsor('limpieza') ?? matchSponsor('solución') ?? matchSponsor('solucion');
      recs.push({ category: 'Solución de limpieza', reason: 'Estándar de irrigación previo a cada curación.', sponsor: sp });
    }
    return recs;
  }, [wcase, evo.exudate, evo.infection, sponsorProducts]);

  // --- Helpers ---
  const addSupplyFromProduct = (p: LabProduct) => {
    setSupplies(prev => ([...prev, {
      id: newId(),
      productId: p.id,
      productName: p.name,
      category: p.category ?? 'Otros',
      quantity: 1, unit: 'u',
      used: true, restock: true,
      isSponsor: true,
      unitPrice: p.price ?? null,
      presentation: p.presentation ?? null,
      sku: p.sku ?? null,
    }]));
    toast({ title: 'Insumo agregado', description: p.name });
  };
  const addSupplyGeneric = (category: string) => {
    setSupplies(prev => ([...prev, {
      id: newId(), productName: category, category, quantity: 1, unit: 'u', used: true, restock: false,
    }]));
  };
  const updateSupply = (id: string, patch: Partial<SupplyLine>) => {
    setSupplies(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };
  const removeSupply = (id: string) => setSupplies(prev => prev.filter(s => s.id !== id));

  const restockItems = supplies.filter(s => s.restock);

  // --- Save ---
  const saveEvolution = async (alsoCreateOrder: boolean) => {
    if (!wcase || !currentUser) {
      toast({ title: 'Faltan datos', description: 'Seleccioná paciente y caso.', variant: 'destructive' });
      return null;
    }
    setSaving(true);
    try {
      const materialsList = supplies.filter(s => s.used)
        .map(s => `${s.productName} x${s.quantity}${s.unit}`).join(', ') || null;
      const description = [
        `Dolor EVA ${evo.pain}/10`,
        `Exudado: ${evo.exudate}`,
        `Olor: ${evo.odor}`,
        `Infección: ${evo.infection}`,
        evo.size && `Tamaño: ${evo.size}`,
        evo.depth && `Profundidad: ${evo.depth}`,
        `Tejido: ${evo.tissue}`,
        `Bordes: ${evo.edges}`,
        `Perilesional: ${evo.perilesional}`,
      ].filter(Boolean).join('. ');

      const { data: evoRow, error: evoErr } = await supabase.from('evolutions').insert({
        user_id: currentUser.id,
        case_id: wcase.id,
        evolution_date: evo.date,
        evolution_time: evo.time || null,
        professional: evo.professional || null,
        description,
        procedure: evo.procedure || null,
        materials: materialsList,
        healing_frequency: evo.healingFrequency || null,
        observations: evo.observations || null,
        next_control: evo.nextControl || null,
      }).select('id').single();
      if (evoErr) throw evoErr;

      let orderNumber: string | null = null;
      if (alsoCreateOrder && restockItems.length > 0) {
        let num = `CT-${Date.now()}`;
        try {
          const { data: numData } = await supabase.rpc('generate_order_number' as never);
          if (typeof numData === 'string' && numData) num = numData;
        } catch { /* ignore */ }

        const estimated = restockItems.reduce((sum, s) => sum + (Number(s.unitPrice ?? 0) * s.quantity), 0);
        const { data: orderRow, error: ordErr } = await supabase.from('supply_orders').insert({
          user_id: currentUser.id,
          lab_id: sponsor?.lab_id ?? null,
          order_number: num,
          status: 'borrador',
          professional_name: evo.professional || null,
          institution: currentUser.institution ?? null,
          general_wound_type: wcase.woundType,
          clinical_recommendation: `Origen: curación/evolución del ${evo.date}`,
          commercial_notes: `Generada desde wizard de Nueva curación (${sponsor?.sponsor_name ?? ''})`.trim(),
          estimated_total: estimated || null,
          currency: 'ARS',
          channel: 'wizard',
        }).select('id, order_number').single();
        if (ordErr) throw ordErr;

        const itemsPayload = restockItems.map(s => ({
          order_id: orderRow.id,
          product_id: s.productId ?? null,
          product_name: s.productName,
          product_sku: s.sku ?? null,
          presentation: s.presentation ?? null,
          quantity: s.quantity,
          unit_price: s.unitPrice ?? null,
          subtotal: s.unitPrice != null ? Number(s.unitPrice) * s.quantity : null,
          currency: 'ARS',
          notes: s.category,
        }));
        const { error: itErr } = await supabase.from('supply_order_items').insert(itemsPayload);
        if (itErr) throw itErr;
        orderNumber = orderRow.order_number;
      }

      toast({
        title: 'Curación guardada',
        description: orderNumber ? `Solicitud generada: ${orderNumber}` : 'Evolución registrada correctamente.',
      });
      return { ok: true, orderNumber };
    } catch (e: any) {
      toast({ title: 'No se pudo guardar', description: e.message ?? String(e), variant: 'destructive' });
      return null;
    } finally { setSaving(false); }
  };

  const copySummary = () => {
    const lines = [
      `Curación — ${wcase?.woundType ?? ''}`,
      `Fecha: ${evo.date} ${evo.time}`,
      `Profesional: ${evo.professional}`,
      `Dolor: EVA ${evo.pain}/10 · Exudado: ${evo.exudate} · Infección: ${evo.infection}`,
      evo.procedure && `Procedimiento: ${evo.procedure}`,
      supplies.length ? `Insumos: ${supplies.map(s => `${s.productName} x${s.quantity}`).join(', ')}` : null,
      restockItems.length ? `Reposición: ${restockItems.map(s => s.productName).join(', ')}` : null,
      evo.nextControl && `Próximo control: ${evo.nextControl}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines);
    toast({ title: 'Resumen copiado' });
  };

  const canNext = () => {
    if (step === 1) return !!wcase;
    if (step === 2) return !!evo.date && !!evo.time;
    return true;
  };

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <Badge variant="outline" className="font-body text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5 mb-2">
                Programa sponsor: {sponsor?.sponsor_name ?? '—'}
              </Badge>
              <h1 className="heading-display text-2xl md:text-3xl">Nueva curación</h1>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Flujo guiado: paciente → evaluación → fotos → insumos → recomendaciones → resumen.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="font-body" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </div>

          {/* Stepper */}
          <Card className="border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 overflow-x-auto">
                {STEPS.map((s, i) => {
                  const active = step === s.n, done = step > s.n;
                  return (
                    <div key={s.n} className="flex items-center gap-1 min-w-fit">
                      <button
                        type="button"
                        onClick={() => setStep(s.n)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-body text-xs transition-colors ${
                          active ? 'bg-primary text-primary-foreground' :
                          done ? 'text-primary hover:bg-primary/10' :
                          'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <s.icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{s.n}. {s.label}</span>
                        <span className="sm:hidden">{s.n}</span>
                      </button>
                      {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step 1 */}
          {step === 1 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Seleccionar paciente y caso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o DNI..." className="pl-9 font-body" />
                </div>
                <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-auto">
                  {filteredPatients.map(p => {
                    const active = p.cases.find(c => c.status !== 'resuelto');
                    const selected = patientId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setPatientId(p.id); setCaseId(active?.id ?? p.cases[0]?.id ?? null); }}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 hover:border-primary/40 bg-background'
                        }`}
                      >
                        <div className="font-body font-medium text-sm">{p.firstName} {p.lastName}</div>
                        <div className="font-body text-xs text-muted-foreground mt-0.5">
                          {p.cases.length} caso(s) · {active ? active.woundType : 'Sin casos activos'}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {patient && (
                  <div className="space-y-2 pt-2">
                    <Label className="font-body text-sm">Caso de herida</Label>
                    <div className="grid md:grid-cols-2 gap-2">
                      {patient.cases.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setCaseId(c.id)}
                          className={`text-left p-3 rounded-lg border transition-all ${
                            caseId === c.id ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-body text-sm font-medium">{c.woundType}</div>
                            <Badge variant="outline" className="font-body text-[10px] uppercase">{c.status}</Badge>
                          </div>
                          <div className="font-body text-xs text-muted-foreground mt-0.5">{c.anatomicalLocation}</div>
                          <div className="font-body text-[11px] text-muted-foreground mt-1">
                            Última evolución: {c.evolutions[0]?.date ?? '—'} · Próx. control: {c.evolutions[0]?.nextControl ?? '—'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Evaluación clínica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label className="font-body text-xs">Fecha</Label><Input type="date" value={evo.date} onChange={e => setEvo({ ...evo, date: e.target.value })} /></div>
                  <div><Label className="font-body text-xs">Hora</Label><Input type="time" value={evo.time} onChange={e => setEvo({ ...evo, time: e.target.value })} /></div>
                  <div><Label className="font-body text-xs">Profesional</Label><Input value={evo.professional} onChange={e => setEvo({ ...evo, professional: e.target.value })} /></div>
                </div>

                <div className="space-y-2">
                  <Label className="font-body text-xs">Dolor (EVA): <span className="font-semibold text-foreground">{evo.pain}/10</span></Label>
                  <Slider value={[evo.pain]} onValueChange={([v]) => setEvo({ ...evo, pain: v })} min={0} max={10} step={1} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { k: 'exudate', label: 'Exudado', opts: ['ausente','escaso','moderado','abundante'] },
                    { k: 'odor', label: 'Olor', opts: ['no','leve','marcado'] },
                    { k: 'infection', label: 'Infección', opts: ['no','sospecha','si'] },
                    { k: 'tissue', label: 'Tejido predom.', opts: ['epitelización','granulación','fibrina','esfacelo','necrosis'] },
                    { k: 'edges', label: 'Bordes', opts: ['definidos','irregulares','macerados','en pendiente'] },
                    { k: 'perilesional', label: 'Perilesional', opts: ['sana','eritematosa','macerada','seca'] },
                  ].map((f) => (
                    <div key={f.k}>
                      <Label className="font-body text-xs">{f.label}</Label>
                      <Select value={(evo as any)[f.k]} onValueChange={v => setEvo({ ...evo, [f.k]: v } as any)}>
                        <SelectTrigger className="font-body text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{f.opts.map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ))}
                  <div><Label className="font-body text-xs">Tamaño</Label><Input placeholder="ej. 5 x 3 cm" value={evo.size} onChange={e => setEvo({ ...evo, size: e.target.value })} /></div>
                  <div><Label className="font-body text-xs">Profundidad</Label><Input placeholder="ej. superficial" value={evo.depth} onChange={e => setEvo({ ...evo, depth: e.target.value })} /></div>
                </div>

                <div><Label className="font-body text-xs">Procedimiento realizado</Label>
                  <Textarea rows={2} value={evo.procedure} onChange={e => setEvo({ ...evo, procedure: e.target.value })} placeholder="Limpieza, desbridamiento, apósito aplicado..." />
                </div>
                <div><Label className="font-body text-xs">Observaciones</Label>
                  <Textarea rows={2} value={evo.observations} onChange={e => setEvo({ ...evo, observations: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="font-body text-xs">Frecuencia de curación</Label>
                    <Input value={evo.healingFrequency} onChange={e => setEvo({ ...evo, healingFrequency: e.target.value })} />
                  </div>
                  <div><Label className="font-body text-xs">Próximo control</Label>
                    <Input type="date" value={evo.nextControl} onChange={e => setEvo({ ...evo, nextControl: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Fotografía clínica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex gap-2.5">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="font-body text-xs leading-relaxed">
                    Las fotografías clínicas se gestionan desde el detalle del caso para preservar consentimiento, firma y trazabilidad. Vas a poder cargarlas inmediatamente después de guardar esta evolución.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="aspect-video rounded-lg border-2 border-dashed border-border/60 flex items-center justify-center text-muted-foreground font-body text-xs">
                    Foto antes (placeholder)
                  </div>
                  <div className="aspect-video rounded-lg border-2 border-dashed border-border/60 flex items-center justify-center text-muted-foreground font-body text-xs">
                    Foto después (placeholder)
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Insumos utilizados</CardTitle>
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  Marcá los insumos usados en esta curación y cuáles necesitan reposición.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sponsor product picker */}
                <div className="space-y-2">
                  <Label className="font-body text-xs">Catálogo {sponsor?.sponsor_name ?? 'sponsor'}</Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={productQuery} onChange={e => setProductQuery(e.target.value)} placeholder="Buscar producto sponsor..." className="pl-9 font-body" />
                  </div>
                  <div className="max-h-44 overflow-auto rounded-lg border border-border/60 divide-y divide-border/60">
                    {sponsorProducts
                      .filter(p => !productQuery || p.name.toLowerCase().includes(productQuery.toLowerCase()))
                      .slice(0, 12)
                      .map(p => (
                        <button key={p.id} onClick={() => addSupplyFromProduct(p)}
                          className="w-full text-left p-2.5 hover:bg-accent/40 transition-colors flex items-center gap-2">
                          <Pill className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-body text-sm font-medium truncate">{p.name}</div>
                            <div className="font-body text-[11px] text-muted-foreground truncate">
                              {p.category ?? 'Sin categoría'}{p.presentation ? ` · ${p.presentation}` : ''}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-primary" />
                        </button>
                      ))}
                    {sponsorProducts.length === 0 && (
                      <div className="p-3 font-body text-xs text-muted-foreground text-center">
                        No hay productos sponsor disponibles. Agregá insumos genéricos.
                      </div>
                    )}
                  </div>
                </div>

                {/* Generic categories */}
                <div className="space-y-2">
                  <Label className="font-body text-xs">Agregar por categoría genérica</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPLY_CATEGORIES.map(c => (
                      <Button key={c} type="button" variant="outline" size="sm" className="font-body text-xs h-7"
                        onClick={() => addSupplyGeneric(c)}>
                        <Plus className="h-3 w-3 mr-1" /> {c}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Supply lines */}
                {supplies.length === 0 ? (
                  <div className="text-center py-6 font-body text-sm text-muted-foreground">
                    Todavía no agregaste insumos.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supplies.map(s => (
                      <div key={s.id} className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-border/60 bg-background">
                        <div className="col-span-12 md:col-span-5 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-body text-sm font-medium truncate">{s.productName}</div>
                            {s.isSponsor && <Badge variant="outline" className="font-body text-[9px] uppercase border-primary/40 text-primary bg-primary/5">Sponsor</Badge>}
                          </div>
                          <div className="font-body text-[11px] text-muted-foreground">{s.category}{s.presentation ? ` · ${s.presentation}` : ''}</div>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Input type="number" min={1} value={s.quantity} onChange={e => updateSupply(s.id, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="h-8 text-sm" />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Input value={s.unit} onChange={e => updateSupply(s.id, { unit: e.target.value })} className="h-8 text-sm" placeholder="u" />
                        </div>
                        <label className="col-span-4 md:col-span-2 flex items-center gap-1.5 font-body text-xs cursor-pointer">
                          <Checkbox checked={s.restock} onCheckedChange={(v) => updateSupply(s.id, { restock: v === true })} />
                          Reponer
                        </label>
                        <Button type="button" variant="ghost" size="icon" className="col-span-12 md:col-span-1 h-8 w-8 ml-auto" onClick={() => removeSupply(s.id)}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Recomendaciones para próxima curación</CardTitle>
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  Sugerencia de apoyo según tipo de herida y datos cargados. Validá siempre con criterio profesional.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.length === 0 ? (
                  <div className="font-body text-sm text-muted-foreground text-center py-6">
                    Sin recomendaciones automáticas para esta evaluación.
                  </div>
                ) : recommendations.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border/60 bg-accent/20 flex items-start gap-3">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-body text-sm font-medium">{r.category}</div>
                        {r.sponsor ? (
                          <Badge variant="outline" className="font-body text-[10px] uppercase border-primary/40 text-primary bg-primary/5">
                            Producto sponsor
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-body text-[10px] uppercase">Recomendación genérica</Badge>
                        )}
                      </div>
                      <div className="font-body text-xs text-muted-foreground mt-0.5">{r.reason}</div>
                      {r.sponsor && (
                        <div className="font-body text-xs mt-1">
                          Sugerido: <span className="font-medium">{r.sponsor.name}</span>
                          {r.sponsor.presentation && <span className="text-muted-foreground"> · {r.sponsor.presentation}</span>}
                        </div>
                      )}
                    </div>
                    {r.sponsor && (
                      <Button size="sm" variant="outline" className="font-body text-xs" onClick={() => addSupplyFromProduct(r.sponsor!)}>
                        <Plus className="h-3 w-3 mr-1" /> Agregar
                      </Button>
                    )}
                  </div>
                ))}
                <div className="text-[11px] text-muted-foreground font-body italic">
                  Estas recomendaciones son orientativas y no constituyen diagnóstico médico.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6 */}
          {step === 6 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Resumen final</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border/60 bg-background">
                    <div className="font-body text-[10px] uppercase text-muted-foreground tracking-wide">Paciente / Caso</div>
                    <div className="font-body text-sm font-medium mt-1">{patient ? `${patient.firstName} ${patient.lastName}` : '—'}</div>
                    <div className="font-body text-xs text-muted-foreground">{wcase?.woundType} · {wcase?.anatomicalLocation}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-background">
                    <div className="font-body text-[10px] uppercase text-muted-foreground tracking-wide">Evolución</div>
                    <div className="font-body text-sm mt-1">{evo.date} {evo.time} · {evo.professional}</div>
                    <div className="font-body text-xs text-muted-foreground">EVA {evo.pain}/10 · Exudado {evo.exudate} · Inf. {evo.infection}</div>
                  </div>
                </div>
                {supplies.length > 0 && (
                  <div>
                    <div className="font-body text-xs font-medium mb-2">Insumos utilizados</div>
                    <div className="space-y-1">
                      {supplies.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 font-body text-xs">
                          <span>{s.productName} <span className="text-muted-foreground">· {s.category}</span></span>
                          <span className="flex items-center gap-2">
                            x{s.quantity}{s.unit}
                            {s.restock && <Badge variant="outline" className="font-body text-[9px] uppercase border-primary/30 text-primary">Reponer</Badge>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {restockItems.length > 0 && (
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="font-body text-sm font-medium flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      {restockItems.length} producto(s) marcados para reposición
                    </div>
                    <div className="font-body text-xs text-muted-foreground mt-1">
                      Se generará una solicitud al laboratorio sponsor con esos insumos.
                    </div>
                  </div>
                )}
                {evo.nextControl && (
                  <div className="font-body text-xs text-muted-foreground">
                    Próximo control: <span className="font-medium text-foreground">{evo.nextControl}</span>
                  </div>
                )}

                <Separator />

                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="font-body" onClick={copySummary}>
                    <Copy className="h-4 w-4 mr-1.5" /> Copiar resumen
                  </Button>
                  <Button variant="outline" size="sm" className="font-body" disabled={saving}
                    onClick={async () => { const r = await saveEvolution(false); if (r) navigate(`/patients/${patient?.id}/cases/${wcase?.id}`); }}>
                    <Save className="h-4 w-4 mr-1.5" /> Guardar evolución
                  </Button>
                  <Button size="sm" className="font-body" disabled={saving || restockItems.length === 0}
                    onClick={async () => { const r = await saveEvolution(true); if (r) navigate('/orders'); }}>
                    <ShoppingBag className="h-4 w-4 mr-1.5" /> Guardar y generar solicitud
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nav controls */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" className="font-body" disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1))}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <div className="font-body text-xs text-muted-foreground">Paso {step} de {STEPS.length}</div>
            <Button size="sm" className="font-body" disabled={step === STEPS.length || !canNext()} onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
