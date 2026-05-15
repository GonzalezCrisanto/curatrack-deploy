import { useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  Activity, Users, CheckCircle2, Download, FileText, FileSpreadsheet,
  Stethoscope, Camera, Calendar, AlertTriangle, Thermometer, MapPin,
  ListChecks, ClipboardCheck,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Patient, WoundCase, Evolution,
  evolutionStatuses, tissueTypeOptions, edgeTypeOptions,
  exudateAmountOptions, exudateTypeOptions, exudateColorOptions,
  odorOptions, infectionSignFields, healingFrequencies,
} from '@/data/demoData';

// ---------- Helpers ----------
type StatusBucket = 'tratamiento' | 'mejorando' | 'deterioro' | 'cerradas';

const STATUS_BUCKETS: { key: StatusBucket; label: string; color: string }[] = [
  { key: 'tratamiento', label: 'En tratamiento', color: 'hsl(210 90% 50%)' },
  { key: 'mejorando', label: 'Mejorando', color: 'hsl(var(--success))' },
  { key: 'deterioro', label: 'Deterioro', color: 'hsl(var(--destructive))' },
  { key: 'cerradas', label: 'Cerradas', color: 'hsl(var(--muted-foreground))' },
];

const CHART_PALETTE = [
  'hsl(var(--primary))',
  'hsl(210 80% 55%)',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(280 60% 55%)',
  'hsl(30 85% 55%)',
  'hsl(180 60% 45%)',
];

function bucketForCase(c: WoundCase): StatusBucket {
  if (c.status === 'resuelto') return 'cerradas';
  const latest = [...c.evolutions].sort((a, b) => b.date.localeCompare(a.date))[0];
  const ev = latest?.evolutionStatus;
  if (ev === 'cicatrizada') return 'cerradas';
  if (ev === 'deterioro' || c.status === 'critico') return 'deterioro';
  if (ev === 'mejoria_progresiva' || c.status === 'en_mejoria') return 'mejorando';
  return 'tratamiento';
}

function extractMaterials(materials: string): string[] {
  if (!materials) return [];
  return materials
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/\s*\d+(\.\d+)?\s*(ml|cm|mg|g|x\s*\d+)?$/i, '').trim())
    .filter(s => s.length > 1);
}

function evoArea(e: Evolution | WoundCase): number | null {
  if (typeof e.woundLength === 'number' && typeof e.woundWidth === 'number') {
    return +(e.woundLength * e.woundWidth).toFixed(2);
  }
  return null;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsvRow(values: (string | number)[]) {
  return values.map(v => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

// Build label maps for enums
const tissueLabel = Object.fromEntries(tissueTypeOptions.map(o => [o.value, o.label]));
const edgeLabel = Object.fromEntries(edgeTypeOptions.map(o => [o.value, o.label]));
const exAmountLabel = Object.fromEntries(exudateAmountOptions.map(o => [o.value, o.label]));
const exTypeLabel = Object.fromEntries(exudateTypeOptions.map(o => [o.value, o.label]));
const exColorLabel = Object.fromEntries(exudateColorOptions.map(o => [o.value, o.label]));
const odorLabel = Object.fromEntries(odorOptions.map(o => [o.value, o.label]));
const evoStatusLabel = Object.fromEntries(evolutionStatuses.map(o => [o.value, o.label]));
const infectionLabel = Object.fromEntries(infectionSignFields.map(o => [o.key, o.label]));

// ============================================================
export default function Statistics() {
  const { patients } = useApp();
  const [patientFilter, setPatientFilter] = useState<string>('all');
  // Default range: span the last 30 days, but extend to cover all existing
  // evolution dates so charts never appear empty on first load. If no
  // evolutions exist, fall back to a 30-day window ending today.
  const defaultRange = useMemo(() => {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const today = new Date();
    const todayIso = iso(today);
    const thirtyAgo = new Date();
    thirtyAgo.setDate(today.getDate() - 30);
    const thirtyAgoIso = iso(thirtyAgo);

    const allDates: string[] = [];
    patients.forEach(p => p.cases.forEach(c => {
      if (c.startDate) allDates.push(c.startDate);
      c.evolutions.forEach(e => allDates.push(e.date));
    }));
    if (!allDates.length) return { from: thirtyAgoIso, to: todayIso };
    allDates.sort();
    const minDate = allDates[0];
    const maxDate = allDates[allDates.length - 1];
    return {
      from: minDate < thirtyAgoIso ? minDate : thirtyAgoIso,
      to: maxDate > todayIso ? maxDate : todayIso,
    };
  }, [patients]);
  const [fromDate, setFromDate] = useState<string>(defaultRange.from);
  const [toDate, setToDate] = useState<string>(defaultRange.to);

  const filteredPatients = useMemo(() => {
    return patientFilter === 'all'
      ? patients
      : patients.filter(p => p.id === patientFilter);
  }, [patients, patientFilter]);

  // All cases in scope (independent of date range — represents current cohort)
  const allCases = useMemo(
    () => filteredPatients.flatMap(p => p.cases.map(c => ({ patient: p, case: c }))),
    [filteredPatients]
  );

  // Evolutions filtered by date range
  const allEvolutions = useMemo(() => {
    const out: { patient: Patient; case: WoundCase; evolution: Evolution }[] = [];
    filteredPatients.forEach(p => p.cases.forEach(c => c.evolutions.forEach(e => {
      if (fromDate && e.date < fromDate) return;
      if (toDate && e.date > toDate) return;
      out.push({ patient: p, case: c, evolution: e });
    })));
    return out;
  }, [filteredPatients, fromDate, toDate]);

  // Latest evolution per case (within range)
  const latestPerCase = useMemo(() => {
    const map = new Map<string, { patient: Patient; case: WoundCase; evolution: Evolution }>();
    allEvolutions.forEach(item => {
      const key = item.case.id;
      const prev = map.get(key);
      if (!prev || prev.evolution.date.localeCompare(item.evolution.date) < 0) {
        map.set(key, item);
      }
    });
    return [...map.values()];
  }, [allEvolutions]);

  // ---------- Summary ----------
  const summary = useMemo(() => {
    const activePatients = filteredPatients.filter(p => p.cases.some(c => c.status !== 'resuelto')).length;
    const activeWounds = allCases.filter(({ case: c }) => c.status !== 'resuelto').length;
    const totalWounds = allCases.length;
    const totalEvolutions = filteredPatients.reduce(
      (acc, p) => acc + p.cases.reduce((a, c) => a + c.evolutions.length, 0), 0,
    );
    const totalPhotos = filteredPatients.reduce(
      (acc, p) => acc + p.cases.reduce((a, c) =>
        a + (c.photos?.length || 0) + c.evolutions.reduce((x, e) => x + (e.photos?.length || 0), 0), 0,
      ), 0,
    );
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let closedThisMonth = 0;
    allCases.forEach(({ case: c }) => {
      const closingEv = c.evolutions.find(e => e.evolutionStatus === 'cicatrizada' || e.healingDate);
      const closedDate = closingEv?.healingDate || closingEv?.date || c.evolutions.slice(-1)[0]?.date;
      if (c.status === 'resuelto' && closedDate?.startsWith(thisMonthKey)) closedThisMonth++;
    });
    return { activePatients, activeWounds, totalWounds, totalEvolutions, totalPhotos, closedThisMonth };
  }, [filteredPatients, allCases]);

  // ---------- Status distribution (pie) ----------
  const statusData = useMemo(() => {
    const counts: Record<StatusBucket, number> = { tratamiento: 0, mejorando: 0, deterioro: 0, cerradas: 0 };
    allCases.forEach(({ case: c }) => { counts[bucketForCase(c)]++; });
    return STATUS_BUCKETS.map(b => ({ name: b.label, value: counts[b.key], color: b.color }));
  }, [allCases]);

  // ---------- Top materials (bar) ----------
  const topMaterials = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      extractMaterials(evolution.materials).forEach(m => {
        const key = m.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name: name.length > 28 ? name.slice(0, 26) + '…' : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [allEvolutions]);

  // ---------- Wound types (bar) ----------
  const woundTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    allCases.forEach(({ case: c }) => {
      const k = c.woundType?.trim() || 'Sin clasificar';
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allCases]);

  // ---------- Anatomical locations (bar) ----------
  const locationData = useMemo(() => {
    const counts = new Map<string, number>();
    allCases.forEach(({ case: c }) => {
      const k = c.anatomicalLocation?.trim() || 'No especificada';
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [allCases]);

  // ---------- Evolution status distribution (pie) ----------
  const evolutionStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      const k = evolution.evolutionStatus || 'sin_dato';
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return [...counts.entries()].map(([k, v], i) => ({
      name: evoStatusLabel[k] || 'Sin dato',
      value: v,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));
  }, [allEvolutions]);

  // ---------- Tissue types (bar, multi-select per evolution) ----------
  const tissueData = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      (evolution.tissueTypes || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
    });
    return tissueTypeOptions
      .map(o => ({ name: o.label, value: counts.get(o.value) || 0 }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [allEvolutions]);

  // ---------- Edge types (bar) ----------
  const edgeData = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      (evolution.edgeTypes || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
    });
    return edgeTypeOptions
      .map(o => ({ name: o.label, value: counts.get(o.value) || 0 }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [allEvolutions]);

  // ---------- Exudate breakdown (3 mini distributions) ----------
  const exudateAmountData = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      if (evolution.exudateAmount) counts.set(evolution.exudateAmount, (counts.get(evolution.exudateAmount) || 0) + 1);
    });
    return exudateAmountOptions
      .map((o, i) => ({ name: o.label, value: counts.get(o.value) || 0, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
      .filter(d => d.value > 0);
  }, [allEvolutions]);

  const exudateTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      if (evolution.exudateType) counts.set(evolution.exudateType, (counts.get(evolution.exudateType) || 0) + 1);
    });
    return exudateTypeOptions
      .map((o, i) => ({ name: o.label, value: counts.get(o.value) || 0, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
      .filter(d => d.value > 0);
  }, [allEvolutions]);

  const exudateColorData = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      if (evolution.exudateColor) counts.set(evolution.exudateColor, (counts.get(evolution.exudateColor) || 0) + 1);
    });
    return exudateColorOptions
      .map((o, i) => ({ name: o.label, value: counts.get(o.value) || 0, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
      .filter(d => d.value > 0);
  }, [allEvolutions]);

  // ---------- Pain & odor distributions ----------
  const painDistribution = useMemo(() => {
    // Buckets 0, 1-3, 4-6, 7-10
    const buckets = [
      { name: 'Sin dolor (0)', min: 0, max: 0, value: 0 },
      { name: 'Leve (1-3)', min: 1, max: 3, value: 0 },
      { name: 'Moderado (4-6)', min: 4, max: 6, value: 0 },
      { name: 'Severo (7-10)', min: 7, max: 10, value: 0 },
    ];
    allEvolutions.forEach(({ evolution }) => {
      const p = evolution.painLevel;
      if (typeof p !== 'number') return;
      const b = buckets.find(x => p >= x.min && p <= x.max);
      if (b) b.value++;
    });
    return buckets.filter(b => b.value > 0);
  }, [allEvolutions]);

  const odorData = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      if (evolution.odor) counts.set(evolution.odor, (counts.get(evolution.odor) || 0) + 1);
    });
    return odorOptions
      .map((o, i) => ({ name: o.label, value: counts.get(o.value) || 0, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
      .filter(d => d.value > 0);
  }, [allEvolutions]);

  // ---------- Infection signs (bar of individual signs) ----------
  const infectionData = useMemo(() => {
    const counts: Record<string, number> = {};
    let withInfection = 0;
    allEvolutions.forEach(({ evolution }) => {
      if (evolution.hasInfectionSigns) withInfection++;
      infectionSignFields.forEach(f => {
        if ((evolution as any)[f.key]) counts[f.key] = (counts[f.key] || 0) + 1;
      });
    });
    const bars = infectionSignFields
      .map(f => ({ name: f.label, value: counts[f.key] || 0 }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
    return { bars, withInfection, total: allEvolutions.length };
  }, [allEvolutions]);

  // ---------- Body temperature average (per case) ----------
  const tempStats = useMemo(() => {
    const temps = allEvolutions
      .map(({ evolution }) => evolution.bodyTemperature)
      .filter((t): t is number => typeof t === 'number');
    if (!temps.length) return null;
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const max = Math.max(...temps);
    const febrile = temps.filter(t => t >= 38).length;
    return { avg: avg.toFixed(1), max: max.toFixed(1), febrile, total: temps.length };
  }, [allEvolutions]);

  // ---------- Healing frequency adherence ----------
  const frequencyData = useMemo(() => {
    const counts = new Map<string, number>();
    allCases.forEach(({ case: c }) => {
      const f = c.healingFrequency || c.evolutions[0]?.healingFrequency || 'Sin definir';
      counts.set(f, (counts.get(f) || 0) + 1);
    });
    const order = [...healingFrequencies, 'Sin definir'];
    return order
      .map((name, i) => ({ name, value: counts.get(name) || 0, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
      .filter(d => d.value > 0);
  }, [allCases]);

  // ---------- Wound area over time (line, per case) ----------
  const areaSeries = useMemo(() => {
    const dateSet = new Set<string>();
    const seriesByKey = new Map<string, { key: string; label: string; points: Map<string, number> }>();

    filteredPatients.forEach(p => p.cases.forEach(c => {
      const points = new Map<string, number>();
      // include baseline area on case start date
      const baselineArea = evoArea(c);
      if (baselineArea !== null && c.startDate) {
        if ((!fromDate || c.startDate >= fromDate) && (!toDate || c.startDate <= toDate)) {
          points.set(c.startDate, baselineArea);
          dateSet.add(c.startDate);
        }
      }
      c.evolutions.forEach(e => {
        if (fromDate && e.date < fromDate) return;
        if (toDate && e.date > toDate) return;
        const a = evoArea(e);
        if (a !== null) {
          points.set(e.date, a);
          dateSet.add(e.date);
        }
      });
      if (points.size > 0) {
        const key = `${p.id}-${c.id}`;
        seriesByKey.set(key, {
          key,
          label: `${p.firstName} ${p.lastName} — ${c.woundType}`,
          points,
        });
      }
    }));

    const dates = [...dateSet].sort();
    const data = dates.map(d => {
      const row: Record<string, string | number> = { date: d };
      seriesByKey.forEach(s => {
        if (s.points.has(d)) row[s.key] = s.points.get(d)!;
      });
      return row;
    });
    return { data, series: [...seriesByKey.values()] };
  }, [filteredPatients, fromDate, toDate]);

  // ---------- Evolutions per month (activity volume) ----------
  const monthlyActivity = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      const k = evolution.date.slice(0, 7);
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        const [y, m] = k.split('-');
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return { month: `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`, count: v };
      });
  }, [allEvolutions]);

  // ---------- Audit: completeness of new clinical fields ----------
  const audit = useMemo(() => {
    // Field definitions per entity
    const patientFields: { key: keyof Patient; label: string }[] = [
      { key: 'dni', label: 'DNI' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Dirección' },
      { key: 'diagnosis', label: 'Diagnóstico' },
      { key: 'assignedProfessional', label: 'Profesional asignado' },
      { key: 'allergies', label: 'Alergias' },
      { key: 'insurance', label: 'Cobertura' },
      { key: 'emergencyContactName', label: 'Contacto de emergencia' },
      { key: 'emergencyContactPhone', label: 'Tel. emergencia' },
      { key: 'controlIntervalDays', label: 'Intervalo de control' },
    ];
    const caseFields: { key: keyof WoundCase; label: string }[] = [
      { key: 'woundLength', label: 'Largo (cm)' },
      { key: 'woundWidth', label: 'Ancho (cm)' },
      { key: 'woundDepth', label: 'Profundidad (cm)' },
      { key: 'tissueTypes', label: 'Tipos de tejido' },
      { key: 'edgeTypes', label: 'Tipos de borde' },
      { key: 'exudateAmount', label: 'Exudado — cantidad' },
      { key: 'exudateType', label: 'Exudado — tipo' },
      { key: 'exudateColor', label: 'Exudado — color' },
      { key: 'painLevel', label: 'Dolor (0–10)' },
      { key: 'odor', label: 'Olor' },
      { key: 'hasInfectionSigns', label: 'Signos de infección' },
      { key: 'bodyTemperature', label: 'Temperatura corporal' },
      { key: 'healingFrequency', label: 'Frecuencia de curación' },
      { key: 'healingFrequencyDays', label: 'Frecuencia (días)' },
      { key: 'treatment', label: 'Tratamiento' },
    ];
    const evolutionFields: { key: keyof Evolution; label: string }[] = [
      { key: 'painLevel', label: 'Dolor (0–10)' },
      { key: 'odor', label: 'Olor' },
      { key: 'evolutionStatus', label: 'Estado de evolución' },
      { key: 'woundLength', label: 'Largo (cm)' },
      { key: 'woundWidth', label: 'Ancho (cm)' },
      { key: 'woundDepth', label: 'Profundidad (cm)' },
      { key: 'tissueTypes', label: 'Tipos de tejido' },
      { key: 'edgeTypes', label: 'Tipos de borde' },
      { key: 'exudateAmount', label: 'Exudado — cantidad' },
      { key: 'exudateType', label: 'Exudado — tipo' },
      { key: 'exudateColor', label: 'Exudado — color' },
      { key: 'hasInfectionSigns', label: 'Signos de infección' },
      { key: 'bodyTemperature', label: 'Temperatura corporal' },
      { key: 'healingFrequency', label: 'Frecuencia de curación' },
      { key: 'healingFrequencyDays', label: 'Frecuencia (días)' },
      { key: 'materials', label: 'Materiales' },
      { key: 'procedure', label: 'Procedimiento' },
      { key: 'nextControl', label: 'Próximo control' },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isMissing = (v: any) => {
      if (v === undefined || v === null) return true;
      if (typeof v === 'string') return v.trim() === '';
      if (Array.isArray(v)) return v.length === 0;
      return false;
    };

    const patientMissing = new Map<string, number>();
    const caseMissing = new Map<string, number>();
    const evolutionMissing = new Map<string, number>();

    type Gap = {
      kind: 'Paciente' | 'Caso' | 'Evolución';
      patient: string;
      context: string;
      date?: string;
      missing: string[];
    };
    const gaps: Gap[] = [];

    filteredPatients.forEach(p => {
      const pMiss: string[] = [];
      patientFields.forEach(f => {
        if (isMissing(p[f.key])) {
          pMiss.push(f.label);
          patientMissing.set(f.label, (patientMissing.get(f.label) || 0) + 1);
        }
      });
      if (pMiss.length > 0) {
        gaps.push({ kind: 'Paciente', patient: `${p.firstName} ${p.lastName}`, context: '—', missing: pMiss });
      }

      p.cases.forEach(c => {
        const cMiss: string[] = [];
        caseFields.forEach(f => {
          if (isMissing(c[f.key])) {
            cMiss.push(f.label);
            caseMissing.set(f.label, (caseMissing.get(f.label) || 0) + 1);
          }
        });
        if (cMiss.length > 0) {
          gaps.push({
            kind: 'Caso', patient: `${p.firstName} ${p.lastName}`,
            context: `${c.woundType} — ${c.anatomicalLocation || 'sin localización'}`,
            date: c.startDate, missing: cMiss,
          });
        }

        c.evolutions.forEach(e => {
          const eMiss: string[] = [];
          evolutionFields.forEach(f => {
            if (isMissing(e[f.key])) {
              eMiss.push(f.label);
              evolutionMissing.set(f.label, (evolutionMissing.get(f.label) || 0) + 1);
            }
          });
          if (eMiss.length > 0) {
            gaps.push({
              kind: 'Evolución', patient: `${p.firstName} ${p.lastName}`,
              context: `${c.woundType} — ${c.anatomicalLocation || 'sin localización'}`,
              date: e.date, missing: eMiss,
            });
          }
        });
      });
    });

    const totalPatients = filteredPatients.length;
    const totalCases = filteredPatients.reduce((a, p) => a + p.cases.length, 0);
    const totalEvolutions = filteredPatients.reduce(
      (a, p) => a + p.cases.reduce((b, c) => b + c.evolutions.length, 0), 0,
    );

    const toBars = (m: Map<string, number>, total: number, fields: { label: string }[]) =>
      fields
        .map(f => ({
          name: f.label,
          missing: m.get(f.label) || 0,
          total,
          pct: total > 0 ? Math.round(((m.get(f.label) || 0) / total) * 100) : 0,
        }))
        .filter(d => d.missing > 0)
        .sort((a, b) => b.missing - a.missing);

    const patientBars = toBars(patientMissing, totalPatients, patientFields);
    const caseBars = toBars(caseMissing, totalCases, caseFields);
    const evolutionBars = toBars(evolutionMissing, totalEvolutions, evolutionFields);

    const patientsWithGaps = new Set(gaps.filter(g => g.kind === 'Paciente').map(g => g.patient)).size;
    const casesWithGaps = gaps.filter(g => g.kind === 'Caso').length;
    const evolutionsWithGaps = gaps.filter(g => g.kind === 'Evolución').length;

    const patientCompleteness = totalPatients > 0 ? Math.round(((totalPatients - patientsWithGaps) / totalPatients) * 100) : 100;
    const caseCompleteness = totalCases > 0 ? Math.round(((totalCases - casesWithGaps) / totalCases) * 100) : 100;
    const evolutionCompleteness = totalEvolutions > 0 ? Math.round(((totalEvolutions - evolutionsWithGaps) / totalEvolutions) * 100) : 100;

    return {
      totals: { totalPatients, totalCases, totalEvolutions, patientsWithGaps, casesWithGaps, evolutionsWithGaps,
        patientCompleteness, caseCompleteness, evolutionCompleteness },
      patientBars, caseBars, evolutionBars,
      gaps: gaps.sort((a, b) => b.missing.length - a.missing.length),
    };
  }, [filteredPatients]);

  // ---------- Export ----------
  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push('CuraTrack — Reporte de Estadísticas');
    lines.push(`Generado,${new Date().toISOString()}`);
    lines.push(`Paciente,${patientFilter === 'all' ? 'Todos' : (patients.find(p => p.id === patientFilter)?.firstName + ' ' + patients.find(p => p.id === patientFilter)?.lastName)}`);
    lines.push(`Desde,${fromDate || '—'}`);
    lines.push(`Hasta,${toDate || '—'}`);
    lines.push('');

    const blocks: { title: string; rows: (string | number)[][] }[] = [
      { title: 'Resumen', rows: [
        ['Pacientes activos', summary.activePatients],
        ['Heridas activas', summary.activeWounds],
        ['Heridas totales', summary.totalWounds],
        ['Evoluciones totales', summary.totalEvolutions],
        ['Fotos clínicas', summary.totalPhotos],
        ['Cerradas este mes', summary.closedThisMonth],
      ]},
      { title: 'Heridas por estado', rows: [['Estado', 'Cantidad'], ...statusData.map(s => [s.name, s.value])] },
      { title: 'Tipos de herida', rows: [['Tipo', 'Cantidad'], ...woundTypeData.map(d => [d.name, d.value])] },
      { title: 'Localizaciones anatómicas', rows: [['Localización', 'Cantidad'], ...locationData.map(d => [d.name, d.value])] },
      { title: 'Estado de evolución (registros)', rows: [['Estado', 'Cantidad'], ...evolutionStatusData.map(d => [d.name, d.value])] },
      { title: 'Tipos de tejido observado', rows: [['Tejido', 'Veces registrado'], ...tissueData.map(d => [d.name, d.value])] },
      { title: 'Tipos de borde', rows: [['Borde', 'Veces registrado'], ...edgeData.map(d => [d.name, d.value])] },
      { title: 'Exudado — cantidad', rows: [['Cantidad', 'Registros'], ...exudateAmountData.map(d => [d.name, d.value])] },
      { title: 'Exudado — tipo', rows: [['Tipo', 'Registros'], ...exudateTypeData.map(d => [d.name, d.value])] },
      { title: 'Exudado — color', rows: [['Color', 'Registros'], ...exudateColorData.map(d => [d.name, d.value])] },
      { title: 'Distribución del dolor', rows: [['Rango', 'Registros'], ...painDistribution.map(d => [d.name, d.value])] },
      { title: 'Olor de la herida', rows: [['Nivel', 'Registros'], ...odorData.map(d => [d.name, d.value])] },
      { title: 'Signos de infección', rows: [
        ['Resumen', `${infectionData.withInfection} de ${infectionData.total} evoluciones con signos`],
        ['Signo', 'Veces'],
        ...infectionData.bars.map(d => [d.name, d.value]),
      ]},
      { title: 'Frecuencia de curación (casos)', rows: [['Frecuencia', 'Casos'], ...frequencyData.map(d => [d.name, d.value])] },
      { title: 'Top 10 materiales', rows: [['Material', 'Usos'], ...topMaterials.map(m => [m.name, m.count])] },
      { title: 'Actividad por mes (evoluciones)', rows: [['Mes', 'Evoluciones'], ...monthlyActivity.map(d => [d.month, d.count])] },
    ];

    blocks.forEach(b => {
      lines.push(b.title);
      b.rows.forEach(r => lines.push(toCsvRow(r)));
      lines.push('');
    });

    if (tempStats) {
      lines.push('Temperatura corporal');
      lines.push(toCsvRow(['Promedio (°C)', tempStats.avg]));
      lines.push(toCsvRow(['Máxima (°C)', tempStats.max]));
      lines.push(toCsvRow(['Registros febriles (≥38°C)', tempStats.febrile]));
      lines.push(toCsvRow(['Registros totales', tempStats.total]));
      lines.push('');
    }

    lines.push('Evolución del área de heridas (cm²)');
    lines.push(toCsvRow(['Fecha', ...areaSeries.series.map(s => s.label)]));
    areaSeries.data.forEach(row => {
      lines.push(toCsvRow([
        String(row.date),
        ...areaSeries.series.map(s => (row[s.key] as number | undefined) ?? ''),
      ]));
    });

    downloadFile(`curatrack-estadisticas-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  };

  const handleExportPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const filterLabel = patientFilter === 'all'
      ? 'Todos los pacientes'
      : (() => {
          const p = patients.find(p => p.id === patientFilter);
          return p ? `${p.firstName} ${p.lastName}` : '—';
        })();

    const tableHtml = (title: string, headers: string[], rows: (string | number)[][]) => `
      <h2>${title}</h2>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.length === 0 ? `<tr><td colspan="${headers.length}">Sin datos.</td></tr>`
          : rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;

    const html = `
      <!doctype html><html><head><meta charset="utf-8"/>
      <title>Estadísticas clínicas</title>
      <style>
        body{font-family:'Open Sans',Arial,sans-serif;color:#1f2937;padding:32px;max-width:900px;margin:0 auto;}
        h1{font-family:'Montserrat',Arial,sans-serif;color:#00965E;margin:0 0 4px;}
        .meta{color:#6b7280;font-size:12px;margin-bottom:24px;}
        h2{font-family:'Montserrat',Arial,sans-serif;color:#00965E;border-bottom:2px solid #00965E;padding-bottom:4px;margin-top:32px;font-size:15px;}
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}
        th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;}
        th{background:#f0fdf4;}
        .summary{display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;}
        .card{flex:1;min-width:140px;border:1px solid #e5e7eb;border-radius:8px;padding:12px;}
        .card .num{font-size:24px;font-weight:700;color:#00965E;font-family:'Montserrat',Arial,sans-serif;}
        .card .lbl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;}
        @media print{button{display:none;}}
      </style></head><body>
        <h1>Estadísticas clínicas</h1>
        <div class="meta">
          Generado: ${new Date().toLocaleString('es-AR')}<br/>
          Paciente: ${filterLabel}<br/>
          Rango: ${fromDate || '—'} a ${toDate || '—'}
        </div>

        <h2>Resumen</h2>
        <div class="summary">
          <div class="card"><div class="num">${summary.activePatients}</div><div class="lbl">Pacientes activos</div></div>
          <div class="card"><div class="num">${summary.activeWounds}</div><div class="lbl">Heridas activas</div></div>
          <div class="card"><div class="num">${summary.totalWounds}</div><div class="lbl">Heridas totales</div></div>
          <div class="card"><div class="num">${summary.totalEvolutions}</div><div class="lbl">Evoluciones</div></div>
          <div class="card"><div class="num">${summary.totalPhotos}</div><div class="lbl">Fotos clínicas</div></div>
          <div class="card"><div class="num">${summary.closedThisMonth}</div><div class="lbl">Cerradas este mes</div></div>
        </div>

        ${tableHtml('Heridas por estado', ['Estado', 'Cantidad'], statusData.map(s => [s.name, s.value]))}
        ${tableHtml('Tipos de herida', ['Tipo', 'Cantidad'], woundTypeData.map(d => [d.name, d.value]))}
        ${tableHtml('Localizaciones anatómicas', ['Localización', 'Cantidad'], locationData.map(d => [d.name, d.value]))}
        ${tableHtml('Estado de evolución', ['Estado', 'Registros'], evolutionStatusData.map(d => [d.name, d.value]))}
        ${tableHtml('Tipos de tejido', ['Tejido', 'Veces'], tissueData.map(d => [d.name, d.value]))}
        ${tableHtml('Tipos de borde', ['Borde', 'Veces'], edgeData.map(d => [d.name, d.value]))}
        ${tableHtml('Exudado — cantidad', ['Cantidad', 'Registros'], exudateAmountData.map(d => [d.name, d.value]))}
        ${tableHtml('Exudado — tipo', ['Tipo', 'Registros'], exudateTypeData.map(d => [d.name, d.value]))}
        ${tableHtml('Exudado — color', ['Color', 'Registros'], exudateColorData.map(d => [d.name, d.value]))}
        ${tableHtml('Distribución del dolor', ['Rango', 'Registros'], painDistribution.map(d => [d.name, d.value]))}
        ${tableHtml('Olor de la herida', ['Nivel', 'Registros'], odorData.map(d => [d.name, d.value]))}
        ${tableHtml(`Signos de infección (${infectionData.withInfection}/${infectionData.total} evoluciones con signos)`, ['Signo', 'Veces'], infectionData.bars.map(d => [d.name, d.value]))}
        ${tableHtml('Frecuencia de curación', ['Frecuencia', 'Casos'], frequencyData.map(d => [d.name, d.value]))}
        ${tableHtml('Top 10 materiales', ['Material', 'Usos'], topMaterials.map(m => [m.name, m.count]))}
        ${tableHtml('Actividad por mes', ['Mes', 'Evoluciones'], monthlyActivity.map(d => [d.month, d.count]))}

        ${tempStats ? `
          <h2>Temperatura corporal</h2>
          <table><tbody>
            <tr><td>Promedio</td><td>${tempStats.avg} °C</td></tr>
            <tr><td>Máxima</td><td>${tempStats.max} °C</td></tr>
            <tr><td>Registros febriles (≥38°C)</td><td>${tempStats.febrile}</td></tr>
            <tr><td>Registros totales</td><td>${tempStats.total}</td></tr>
          </tbody></table>
        ` : ''}

        <h2>Evolución del área de heridas (cm²)</h2>
        ${areaSeries.series.length === 0 ? '<p>Sin mediciones de área en el rango.</p>' : `
          <table><thead><tr><th>Fecha</th>${areaSeries.series.map(s => `<th>${s.label}</th>`).join('')}</tr></thead>
          <tbody>${areaSeries.data.map(r => `<tr><td>${r.date}</td>${areaSeries.series.map(s => `<td>${(r[s.key] as number | undefined) ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
        `}

        <script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  // ---------- UI ----------
  const tooltipStyle: React.CSSProperties = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Estadísticas clínicas</h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Vista integral de pacientes, heridas, evoluciones y consumo. Refleja todos los datos registrados en los formularios actuales.
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Descargar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
                <FileText className="h-4 w-4" /> Descargar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-body text-xs uppercase tracking-wide text-muted-foreground">Paciente</Label>
                <Select value={patientFilter} onValueChange={setPatientFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los pacientes</SelectItem>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs uppercase tracking-wide text-muted-foreground">Desde</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs uppercase tracking-wide text-muted-foreground">Hasta</Label>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard icon={<Users className="h-5 w-5" />} label="Pacientes activos" value={summary.activePatients} />
          <SummaryCard icon={<Activity className="h-5 w-5" />} label="Heridas activas" value={summary.activeWounds} />
          <SummaryCard icon={<MapPin className="h-5 w-5" />} label="Heridas totales" value={summary.totalWounds} />
          <SummaryCard icon={<Stethoscope className="h-5 w-5" />} label="Evoluciones" value={summary.totalEvolutions} />
          <SummaryCard icon={<Camera className="h-5 w-5" />} label="Fotos clínicas" value={summary.totalPhotos} />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Cerradas este mes" value={summary.closedThisMonth} />
        </div>

        {/* ===== Auditoría de completitud ===== */}
        <Card className="border-warning/40">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-warning" />
              Auditoría de datos clínicos
            </CardTitle>
            <p className="font-body text-xs text-muted-foreground">
              Detecta pacientes, casos y evoluciones con campos clínicos nuevos sin completar. Ignora el rango de fechas: refleja el estado actual de toda la cohorte filtrada por paciente.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Completeness summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <CompletenessTile
                label="Pacientes completos"
                pct={audit.totals.patientCompleteness}
                detail={`${audit.totals.totalPatients - audit.totals.patientsWithGaps} de ${audit.totals.totalPatients} sin huecos`}
                missing={audit.totals.patientsWithGaps}
              />
              <CompletenessTile
                label="Casos completos"
                pct={audit.totals.caseCompleteness}
                detail={`${audit.totals.totalCases - audit.totals.casesWithGaps} de ${audit.totals.totalCases} sin huecos`}
                missing={audit.totals.casesWithGaps}
              />
              <CompletenessTile
                label="Evoluciones completas"
                pct={audit.totals.evolutionCompleteness}
                detail={`${audit.totals.totalEvolutions - audit.totals.evolutionsWithGaps} de ${audit.totals.totalEvolutions} sin huecos`}
                missing={audit.totals.evolutionsWithGaps}
              />
            </div>

            {/* Per-attribute breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MissingFieldsList title="Pacientes" total={audit.totals.totalPatients} bars={audit.patientBars} />
              <MissingFieldsList title="Casos (heridas)" total={audit.totals.totalCases} bars={audit.caseBars} />
              <MissingFieldsList title="Evoluciones" total={audit.totals.totalEvolutions} bars={audit.evolutionBars} />
            </div>

            {/* Records with gaps */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-heading text-sm font-semibold">Registros con datos faltantes</h3>
                <Badge variant="secondary" className="ml-auto">{audit.gaps.length} registros</Badge>
              </div>
              {audit.gaps.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  ¡Todos los registros están completos!
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden max-h-[420px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="w-24">Tipo</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Contexto</TableHead>
                        <TableHead className="w-28">Fecha</TableHead>
                        <TableHead>Campos faltantes</TableHead>
                        <TableHead className="w-20 text-right">Faltan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audit.gaps.slice(0, 200).map((g, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant={g.kind === 'Paciente' ? 'outline' : g.kind === 'Caso' ? 'secondary' : 'default'} className="font-body text-[10px]">
                              {g.kind}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-body text-xs font-medium">{g.patient}</TableCell>
                          <TableCell className="font-body text-xs text-muted-foreground">{g.context}</TableCell>
                          <TableCell className="font-body text-xs text-muted-foreground">{g.date || '—'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {g.missing.slice(0, 6).map(m => (
                                <Badge key={m} variant="outline" className="font-body text-[10px] border-warning/50 text-warning-foreground/80">
                                  {m}
                                </Badge>
                              ))}
                              {g.missing.length > 6 && (
                                <Badge variant="outline" className="font-body text-[10px]">
                                  +{g.missing.length - 6}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-heading text-sm font-bold text-warning">
                            {g.missing.length}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {audit.gaps.length > 200 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/40 border-t border-border">
                      Mostrando los primeros 200 registros de {audit.gaps.length}.
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status & evolution status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Estado actual de heridas" subtitle="Distribución según última evolución registrada.">
            {statusData.every(d => d.value === 0) ? <Empty /> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} label={(e) => `${e.value}`}>
                    {statusData.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Estado de evolución" subtitle="Cómo se está clasificando cada registro de evolución.">
            {evolutionStatusData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={evolutionStatusData} dataKey="value" nameKey="name" outerRadius={100} label={(e) => `${e.value}`}>
                    {evolutionStatusData.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Wound types & locations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Tipos de herida" subtitle="Casos por tipología clínica.">
            {woundTypeData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={woundTypeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={140} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Localizaciones anatómicas" subtitle="Top 10 zonas afectadas.">
            {locationData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={locationData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={140} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(210 80% 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Tissue & edges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Tejido observado" subtitle="Composición del lecho de la herida (multi-selección por evolución).">
            {tissueData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tissueData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={150} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Tipos de borde" subtitle="Características perilesionales registradas.">
            {edgeData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={edgeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={150} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(280 60% 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Exudate trio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Exudado</CardTitle>
            <p className="font-body text-xs text-muted-foreground">Cantidad, tipo y color registrados a lo largo de las evoluciones.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MiniPie title="Cantidad" data={exudateAmountData} />
              <MiniPie title="Tipo" data={exudateTypeData} />
              <MiniPie title="Color" data={exudateColorData} />
            </div>
          </CardContent>
        </Card>

        {/* Pain & odor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Distribución del dolor" subtitle="Escala 0–10 reportada por el paciente, agrupada en rangos.">
            {painDistribution.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={painDistribution} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Olor de la herida" subtitle="Frecuencia de los niveles de olor reportados.">
            {odorData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={odorData} dataKey="value" nameKey="name" outerRadius={90} label={(e) => `${e.value}`}>
                    {odorData.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Infection & temperature */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Signos de infección
              </CardTitle>
              <p className="font-body text-xs text-muted-foreground">
                {infectionData.withInfection} de {infectionData.total} evoluciones marcaron al menos un signo de infección.
              </p>
            </CardHeader>
            <CardContent>
              {infectionData.bars.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={infectionData.bars} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={170} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-warning" /> Temperatura corporal
              </CardTitle>
              <p className="font-body text-xs text-muted-foreground">
                Indicador sistémico capturado en evoluciones.
              </p>
            </CardHeader>
            <CardContent>
              {!tempStats ? (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  Sin registros de temperatura.
                </div>
              ) : (
                <div className="space-y-3">
                  <Stat label="Promedio" value={`${tempStats.avg} °C`} />
                  <Stat label="Máxima" value={`${tempStats.max} °C`} />
                  <Stat label="Registros febriles (≥38°C)" value={String(tempStats.febrile)} accent={tempStats.febrile > 0 ? 'text-destructive' : undefined} />
                  <Stat label="Total registros" value={String(tempStats.total)} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Frequency & monthly activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Frecuencia de curación" subtitle="Distribución de casos por frecuencia indicada.">
            {frequencyData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={frequencyData} dataKey="value" nameKey="name" outerRadius={90} label={(e) => `${e.value}`}>
                    {frequencyData.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Actividad por mes" subtitle="Evoluciones registradas mes a mes.">
            {monthlyActivity.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyActivity} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Materials */}
        <ChartCard title="Top 10 materiales más utilizados" subtitle="Conteo de menciones en evoluciones del rango seleccionado.">
          {topMaterials.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topMaterials} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={160} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Wound area */}
        <ChartCard
          title="Evolución del área de heridas (cm²)"
          subtitle="Largo × ancho registrado por evolución, agrupado por paciente y caso. Incluye la línea base del caso si está registrada."
        >
          {areaSeries.series.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
              Aún no hay mediciones de tamaño (largo × ancho) registradas.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={areaSeries.data} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit=" cm²" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {areaSeries.series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={`hsl(${(i * 67) % 360} 70% 45%)`}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </AppLayout>
  );
}

// ---------- Small presentational helpers ----------
function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight break-words">
              {label}
            </p>
            <p className="font-heading text-3xl font-bold text-foreground mt-2 leading-none">{value}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base">{title}</CardTitle>
        {subtitle && <p className="font-body text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">
      Sin datos para los filtros seleccionados.
    </div>
  );
}

function MiniPie({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
  if (data.length === 0) {
    return (
      <div>
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">Sin datos</div>
      </div>
    );
  }
  return (
    <div>
      <p className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={70} label={(e) => `${e.value}`}>
            {data.map(d => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
      <span className="font-body text-xs text-muted-foreground">{label}</span>
      <span className={`font-heading text-lg font-bold ${accent || 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function CompletenessTile({ label, pct, detail, missing }: { label: string; pct: number; detail: string; missing: number }) {
  const tone = pct >= 90 ? 'text-success' : pct >= 70 ? 'text-warning' : 'text-destructive';
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-body text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`font-heading text-2xl font-bold ${tone}`}>{pct}%</span>
      </div>
      <Progress value={pct} className="mt-3 h-2" />
      <p className="font-body text-[11px] text-muted-foreground mt-2">{detail}</p>
      {missing > 0 && (
        <p className="font-body text-[11px] text-warning mt-1">
          {missing} con campos faltantes
        </p>
      )}
    </div>
  );
}

function MissingFieldsList({ title, total, bars }: {
  title: string;
  total: number;
  bars: { name: string; missing: number; total: number; pct: number }[];
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-heading text-sm font-semibold">{title}</h4>
        <span className="font-body text-[11px] text-muted-foreground">{total} totales</span>
      </div>
      {bars.length === 0 ? (
        <p className="font-body text-xs text-muted-foreground py-6 text-center">
          Sin campos faltantes ✓
        </p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {bars.map(b => (
            <li key={b.name} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-xs text-foreground truncate" title={b.name}>{b.name}</span>
                <span className="font-body text-[11px] text-muted-foreground shrink-0">
                  <span className="font-semibold text-warning">{b.missing}</span>
                  <span className="opacity-60"> / {b.total}</span>
                  <span className="ml-1 opacity-60">({b.pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning"
                  style={{ width: `${b.pct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
