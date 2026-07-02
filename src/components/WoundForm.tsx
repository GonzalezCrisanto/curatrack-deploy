import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import type { Patient, WoundCase } from '@/data/demoData';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const WOUND_TYPES = ['Úlcera por presión', 'Pie diabético', 'Úlcera venosa', 'Herida quirúrgica', 'Quemadura', 'Otro'];

const emptyWound = {
  woundType: '',
  woundTypeOther: '',
  anatomicalLocation: '',
  laterality: 'na',
  startDate: todayISO(),
  status: 'activo' as WoundCase['status'],
  notes: '',
};

interface WoundFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  /** When provided, the modal edits this existing wound instead of creating a new one. */
  editingCase?: WoundCase | null;
  /** Called after a wound is successfully created, with the new case id. */
  onCreated?: (caseId: string) => void;
  /** Called after an existing wound is successfully updated, with its case id. */
  onUpdated?: (caseId: string) => void;
}

/**
 * Modal to register or edit a wound for a patient.
 * Mirrors the wound-registration fields and validation used in the
 * "nueva curación" flow (NewCuration step 1).
 */
export function WoundForm({ open, onOpenChange, patient, editingCase, onCreated, onUpdated }: WoundFormProps) {
  const { addCase, updateCase, currentUser } = useApp();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyWound);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const isEditing = !!editingCase;

  // Sync form state each time the modal opens: pre-populate when editing,
  // reset to an empty wound when creating.
  useEffect(() => {
    if (!open) return;
    if (editingCase) {
      const isKnownType = WOUND_TYPES.includes(editingCase.woundType);
      setForm({
        woundType: isKnownType ? editingCase.woundType : 'Otro',
        woundTypeOther: isKnownType ? '' : editingCase.woundType,
        anatomicalLocation: editingCase.anatomicalLocation,
        // Laterality is folded into anatomicalLocation on save; keep the stored
        // location as-is on edit and avoid re-appending a suffix.
        laterality: 'na',
        startDate: editingCase.startDate,
        status: editingCase.status,
        notes: editingCase.treatment || '',
      });
    } else {
      setForm(emptyWound);
    }
    setErrors({});
  }, [open, editingCase]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    const newErrors: Record<string, string> = {};
    if (!form.woundType) newErrors.woundType = 'Seleccioná tipo de herida.';
    if (form.woundType === 'Otro' && !form.woundTypeOther.trim()) newErrors.woundTypeOther = 'Especificá el tipo de herida.';
    if (!form.anatomicalLocation.trim()) newErrors.anatomicalLocation = 'Indicá ubicación anatómica.';
    if (!form.startDate) newErrors.startDate = 'Ingresá fecha de aparición.';
    else if (form.startDate > todayISO()) newErrors.startDate = 'La fecha de aparición no puede ser futura.';
    if (!form.status) newErrors.status = 'Seleccioná estado inicial.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const lateralityLabel =
        form.laterality === 'izquierdo' ? 'Lado izquierdo'
          : form.laterality === 'derecho' ? 'Lado derecho'
            : form.laterality === 'bilateral' ? 'Bilateral'
              : null;
      const anatomicalLocation = lateralityLabel
        ? `${form.anatomicalLocation.trim()} (${lateralityLabel})`
        : form.anatomicalLocation.trim();
      const woundType = form.woundType === 'Otro' ? form.woundTypeOther.trim() : form.woundType;

      if (editingCase) {
        const { error } = await supabase
          .from('wound_cases')
          .update({
            wound_type: woundType,
            anatomical_location: anatomicalLocation,
            start_date: form.startDate,
            status: form.status,
            treatment: form.notes.trim() || null,
          })
          .eq('id', editingCase.id);
        if (error) throw error;

        const updatedCase: WoundCase = {
          ...editingCase,
          woundType,
          anatomicalLocation,
          startDate: form.startDate,
          status: form.status,
          treatment: form.notes.trim() || '',
        };
        updateCase(patient.id, updatedCase);
        onOpenChange(false);
        onUpdated?.(editingCase.id);
        toast({ title: 'Herida actualizada', description: 'Los cambios se guardaron.' });
      } else {
        const { data: inserted, error } = await supabase
          .from('wound_cases')
          .insert({
            user_id: currentUser.id,
            patient_id: patient.id,
            wound_type: woundType,
            anatomical_location: anatomicalLocation,
            start_date: form.startDate,
            status: form.status,
            treatment: form.notes.trim() || null,
          })
          .select('id')
          .single();
        if (error) throw error;

        const createdCase: WoundCase = {
          id: inserted.id,
          patientId: patient.id,
          woundType,
          anatomicalLocation,
          startDate: form.startDate,
          status: form.status,
          treatment: form.notes.trim() || '',
          evolutions: [],
          photos: [],
        };
        addCase(patient.id, createdCase);
        onOpenChange(false);
        onCreated?.(inserted.id);
        toast({ title: 'Herida registrada', description: 'La herida se agregó al paciente.' });
      }
    } catch (e: any) {
      toast({
        title: isEditing ? 'No se pudo actualizar la herida' : 'No se pudo crear la herida',
        description: e?.message ?? 'Reintentá en unos segundos.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="heading-display text-lg sm:text-xl">
            {isEditing ? 'Editar herida' : 'Nueva herida'} para {patient.firstName} {patient.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="font-body text-sm">Tipo de herida *</Label>
            <Select value={form.woundType} onValueChange={(v) => setForm((prev) => ({ ...prev, woundType: v }))}>
              <SelectTrigger aria-invalid={!!errors.woundType}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {WOUND_TYPES.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.woundType && <p className="mt-1 text-xs text-destructive">{errors.woundType}</p>}
            {form.woundType === 'Otro' && (
              <Input
                className="mt-2"
                value={form.woundTypeOther}
                onChange={(e) => setForm((prev) => ({ ...prev, woundTypeOther: e.target.value }))}
                placeholder="Especificá el tipo de herida"
                aria-invalid={!!errors.woundTypeOther}
              />
            )}
            {errors.woundTypeOther && <p className="mt-1 text-xs text-destructive">{errors.woundTypeOther}</p>}
          </div>
          <div>
            <Label className="font-body text-sm">Ubicación anatómica *</Label>
            <Input
              value={form.anatomicalLocation}
              onChange={(e) => setForm((prev) => ({ ...prev, anatomicalLocation: e.target.value }))}
              placeholder="Ej: Pierna derecha, zona tibial"
              aria-invalid={!!errors.anatomicalLocation}
            />
            {errors.anatomicalLocation && <p className="mt-1 text-xs text-destructive">{errors.anatomicalLocation}</p>}
          </div>
          <div>
            <Label className="font-body text-sm">Lateralidad</Label>
            <Select value={form.laterality} onValueChange={(v) => setForm((prev) => ({ ...prev, laterality: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="izquierdo">Izquierdo</SelectItem>
                <SelectItem value="derecho">Derecho</SelectItem>
                <SelectItem value="bilateral">Bilateral</SelectItem>
                <SelectItem value="na">N/A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-body text-sm">Fecha de aparición *</Label>
            <Input
              type="date"
              max={todayISO()}
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              aria-invalid={!!errors.startDate}
            />
            {errors.startDate && <p className="mt-1 text-xs text-destructive">{errors.startDate}</p>}
          </div>
          <div>
            <Label className="font-body text-sm">Estado inicial *</Label>
            <Select value={form.status} onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as WoundCase['status'] }))}>
              <SelectTrigger aria-invalid={!!errors.status}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en_mejoria">En mejoría</SelectItem>
                <SelectItem value="activo">Estable</SelectItem>
                <SelectItem value="en_deterioro">En deterioro</SelectItem>
                <SelectItem value="critico">Crítica</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="mt-1 text-xs text-destructive">{errors.status}</p>}
          </div>
          <div className="md:col-span-2">
            <Label className="font-body text-sm">Notas iniciales (opcional)</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="font-body">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="font-body">
            {!isEditing && <Plus className="h-4 w-4 mr-1.5" />}
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear herida'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
