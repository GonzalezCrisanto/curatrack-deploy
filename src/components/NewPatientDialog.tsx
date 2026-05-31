import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Patient } from '@/data/demoData';
import { calculateAge } from '@/lib/age';

const emptyPatient: Omit<Patient, 'id' | 'cases'> = {
  firstName: '', lastName: '', birthDate: '', age: 0, gender: '', dni: '', phone: '',
  email: '', address: '', diagnosis: '', assignedProfessional: '', observations: '', admissionDate: '',
  controlIntervalDays: 7,
  allergies: '', insurance: '', emergencyContactName: '', emergencyContactPhone: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Patient | null;
}

export default function NewPatientDialog({ open, onOpenChange, editing = null }: Props) {
  const { addPatient, updatePatient } = useApp();
  const [form, setFormState] = useState(emptyPatient);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const { id, cases, ...rest } = editing;
      setFormState(rest);
    } else {
      setFormState({ ...emptyPatient, admissionDate: new Date().toISOString().split('T')[0] });
    }
    setErrors({});
  }, [open, editing]);

  const setField = (key: string, value: string | number) => {
    setFormState(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!prev[key]) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = 'Ingresá el nombre';
    if (!form.lastName.trim()) next.lastName = 'Ingresá el apellido';
    if (!form.birthDate) {
      next.birthDate = 'Indicá la fecha de nacimiento';
    } else {
      const age = calculateAge(form.birthDate);
      if (age === null) next.birthDate = 'Fecha de nacimiento inválida';
      else if (age < 0 || age > 120) next.birthDate = 'La edad calculada debe estar entre 0 y 120 años';
      else if (new Date(form.birthDate) > new Date()) next.birthDate = 'La fecha no puede ser futura';
    }
    if (!form.gender) next.gender = 'Seleccioná el sexo';
    if (!form.dni.trim()) next.dni = 'Ingresá el documento';
    if (!form.phone.trim()) next.phone = 'Ingresá un teléfono de contacto';
    if (!form.address.trim()) next.address = 'Ingresá el domicilio';
    if (!form.admissionDate) next.admissionDate = 'Indicá la fecha de ingreso';
    return next;
  };

  const handleSave = () => {
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-error="true"]') as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el?.querySelector('input,textarea,button') as HTMLElement | null)?.focus();
      });
      return;
    }
    if (editing) {
      updatePatient({ ...editing, ...form });
    } else {
      addPatient({ ...form, id: `p${Date.now()}`, cases: [] } as Patient);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="heading-display text-xl">
            {editing ? 'Editar Paciente' : 'Nuevo Paciente'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {/* Datos personales */}
          <section className="space-y-3">
            <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos personales</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5" data-error={!!errors.firstName}>
                <Label className="font-body text-sm">Nombre <span className="text-destructive">*</span></Label>
                <Input
                  value={form.firstName}
                  onChange={e => setField('firstName', e.target.value)}
                  className={`font-body ${errors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && <p className="font-body text-[11px] text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-1.5" data-error={!!errors.lastName}>
                <Label className="font-body text-sm">Apellido <span className="text-destructive">*</span></Label>
                <Input
                  value={form.lastName}
                  onChange={e => setField('lastName', e.target.value)}
                  className={`font-body ${errors.lastName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && <p className="font-body text-[11px] text-destructive">{errors.lastName}</p>}
              </div>
              <div className="space-y-1.5" data-error={!!errors.birthDate}>
                <Label className="font-body text-sm">Fecha de nacimiento <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={form.birthDate || ''}
                  onChange={e => {
                    const v = e.target.value;
                    setField('birthDate', v);
                    const a = calculateAge(v);
                    setField('age', a ?? 0);
                  }}
                  className={`font-body ${errors.birthDate ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  aria-invalid={!!errors.birthDate}
                />
                <p className="font-body text-[11px] text-muted-foreground">
                  {form.birthDate
                    ? (() => {
                        const a = calculateAge(form.birthDate);
                        return a === null ? 'Fecha inválida' : `Edad calculada: ${a} año${a === 1 ? '' : 's'}`;
                      })()
                    : 'La edad se calcula automáticamente.'}
                </p>
                {errors.birthDate && <p className="font-body text-[11px] text-destructive">{errors.birthDate}</p>}
              </div>
              <div className="space-y-1.5" data-error={!!errors.gender}>
                <Label className="font-body text-sm">Sexo <span className="text-destructive">*</span></Label>
                <Select value={form.gender} onValueChange={v => setField('gender', v)}>
                  <SelectTrigger
                    className={`font-body ${errors.gender ? 'border-destructive focus:ring-destructive' : ''}`}
                    aria-invalid={!!errors.gender}
                  >
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="font-body text-[11px] text-destructive">{errors.gender}</p>}
              </div>
              <div className="space-y-1.5" data-error={!!errors.dni}>
                <Label className="font-body text-sm">DNI / Documento <span className="text-destructive">*</span></Label>
                <Input
                  value={form.dni}
                  onChange={e => setField('dni', e.target.value)}
                  className={`font-body ${errors.dni ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  placeholder="DNI, pasaporte u otro"
                  aria-invalid={!!errors.dni}
                />
                {errors.dni && <p className="font-body text-[11px] text-destructive">{errors.dni}</p>}
              </div>
              <div className="space-y-1.5" data-error={!!errors.phone}>
                <Label className="font-body text-sm">Teléfono de contacto <span className="text-destructive">*</span></Label>
                <Input
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  className={`font-body ${errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && <p className="font-body text-[11px] text-destructive">{errors.phone}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Email <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input value={form.email} onChange={e => setField('email', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-1.5 sm:col-span-2" data-error={!!errors.address}>
                <Label className="font-body text-sm">Domicilio <span className="text-destructive">*</span></Label>
                <Input
                  value={form.address}
                  onChange={e => setField('address', e.target.value)}
                  className={`font-body ${errors.address ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  aria-invalid={!!errors.address}
                />
                {errors.address && <p className="font-body text-[11px] text-destructive">{errors.address}</p>}
              </div>
            </div>
          </section>

          {/* Datos clínicos */}
          <section className="space-y-3 pt-4 border-t border-border/60">
            <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos clínicos</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Antecedentes y comorbilidades <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Textarea
                  value={form.diagnosis}
                  onChange={e => setField('diagnosis', e.target.value)}
                  className="font-body"
                  placeholder="Diabetes, hipertensión, insuficiencia venosa, tabaquismo, anticoagulantes, cirugías previas, etc."
                  rows={3}
                />
                <p className="font-body text-[11px] text-muted-foreground">
                  Información médica relevante para el cuidado de las heridas. El detalle de cada herida se carga al crearla.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Alergias <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  value={form.allergies || ''}
                  onChange={e => setField('allergies', e.target.value)}
                  className="font-body"
                  placeholder="Látex, yodo, antibióticos, materiales de cura, etc."
                />
              </div>
            </div>
          </section>

          {/* Seguimiento */}
          <section className="space-y-3 pt-4 border-t border-border/60">
            <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seguimiento</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5" data-error={!!errors.admissionDate}>
                <Label className="font-body text-sm">Fecha de ingreso al servicio <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.admissionDate}
                  onChange={e => setField('admissionDate', e.target.value)}
                  className={`font-body ${errors.admissionDate ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  aria-invalid={!!errors.admissionDate}
                />
                {errors.admissionDate && <p className="font-body text-[11px] text-destructive">{errors.admissionDate}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <p className="font-body text-[11px] text-muted-foreground -mt-1">
                  La frecuencia de curación se define al crear cada herida (preestablecida o en días).
                </p>
              </div>
            </div>
          </section>

          {/* Datos administrativos */}
          <section className="space-y-3 pt-4 border-t border-border/60">
            <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos administrativos y contacto</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Obra social / Cobertura <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  value={form.insurance || ''}
                  onChange={e => setField('insurance', e.target.value)}
                  className="font-body"
                  placeholder="Ej: OSDE 210, PAMI, particular"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Contacto de emergencia <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  value={form.emergencyContactName || ''}
                  onChange={e => setField('emergencyContactName', e.target.value)}
                  className="font-body"
                  placeholder="Nombre y vínculo (ej: María, hija)"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Teléfono de emergencia <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  value={form.emergencyContactPhone || ''}
                  onChange={e => setField('emergencyContactPhone', e.target.value)}
                  className="font-body"
                  placeholder="Ej: +54 11 5555 1234"
                />
              </div>
            </div>
          </section>

          {/* Notas */}
          <section className="space-y-3 pt-4 border-t border-border/60">
            <div className="space-y-2">
              <Label className="font-body text-sm">Notas generales <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                value={form.observations}
                onChange={e => setField('observations', e.target.value)}
                className="font-body"
                placeholder="Movilidad, situación social, cuidador principal, adherencia al tratamiento..."
                rows={2}
              />
              <p className="font-body text-[11px] text-muted-foreground">
                Notas sobre el paciente. Las observaciones clínicas de cada cura se cargan en cada evolución.
              </p>
            </div>
          </section>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
          <p className="font-body text-[11px] text-muted-foreground">
            <span className="text-destructive">*</span> Campos obligatorios. El resto es opcional y se puede completar luego.
          </p>
          <div className="flex items-center gap-3">
            {Object.keys(errors).length > 0 && (
              <span className="font-body text-xs text-destructive">
                Revisá los campos marcados
              </span>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} className="font-body">Cancelar</Button>
            <Button onClick={handleSave} className="font-body">{editing ? 'Guardar cambios' : 'Crear paciente'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
