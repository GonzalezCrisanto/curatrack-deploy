import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Stethoscope, CalendarClock, ClipboardList, FileText } from 'lucide-react';
import { Patient } from '@/data/demoData';
import { calculateAge } from '@/lib/age';

const emptyPatient: Omit<Patient, 'id' | 'cases'> = {
  firstName: '', lastName: '', birthDate: '', age: 0, gender: '', dni: '', phone: '',
  email: '', address: '', diagnosis: '', assignedProfessional: '', observations: '', admissionDate: '',
  treatingDoctorName: '', treatingDoctorPhone: '',
  allergies: '', insurance: '', emergencyContactName: '', emergencyContactPhone: '',
};

export default function NewPatient() {
  const { addPatient } = useApp();
  const navigate = useNavigate();
  const [form, setFormState] = useState(() => ({
    ...emptyPatient,
    admissionDate: new Date().toISOString().split('T')[0],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    return next;
  };

  const handleSave = async () => {
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
    const newId = await addPatient({ ...form, id: `p${Date.now()}`, cases: [] } as Patient);
    if (newId) {
      navigate(`/patients/${newId}`);
    }
  };

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
          <div>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="font-body text-sm border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="heading-display text-2xl md:text-3xl">Nuevo Paciente</h1>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Completá la ficha del paciente. Solo nombre y apellido son obligatorios.
              </p>
            </div>
          </div>

          {/* Datos personales */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="heading-display text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Datos personales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Apellido */}
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
                {/* Nombre */}
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
                {/* Domicilio */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-body text-sm">Domicilio <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    value={form.address}
                    onChange={e => setField('address', e.target.value)}
                    className="font-body"
                  />
                </div>
                {/* Teléfono */}
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Teléfono de contacto <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    value={form.phone}
                    onChange={e => setField('phone', e.target.value)}
                    className="font-body"
                  />
                </div>
                {/* Fecha de nacimiento */}
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Fecha de nacimiento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
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
                    className="font-body"
                  />
                  {form.birthDate && (
                    <p className="font-body text-[11px] text-muted-foreground">
                      {(() => {
                        const a = calculateAge(form.birthDate);
                        return a === null ? 'Fecha inválida' : `Edad calculada: ${a} año${a === 1 ? '' : 's'}`;
                      })()}
                    </p>
                  )}
                </div>
                {/* Sexo */}
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Sexo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Select value={form.gender} onValueChange={v => setField('gender', v)}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* DNI */}
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">DNI / Documento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    value={form.dni}
                    onChange={e => setField('dni', e.target.value)}
                    className="font-body"
                    placeholder="DNI, pasaporte u otro"
                  />
                </div>
                {/* Email */}
                <div className="space-y-2">
                  <Label className="font-body text-sm">Email <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input value={form.email} onChange={e => setField('email', e.target.value)} className="font-body" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datos clínicos */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="heading-display text-lg flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Datos clínicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="space-y-2">
                  <Label className="font-body text-sm">Médico tratante <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    value={form.treatingDoctorName || ''}
                    onChange={e => setField('treatingDoctorName', e.target.value)}
                    className="font-body"
                    placeholder="Dr. / Dra. nombre y apellido"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm">Teléfono del médico <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    value={form.treatingDoctorPhone || ''}
                    onChange={e => setField('treatingDoctorPhone', e.target.value)}
                    className="font-body"
                    placeholder="Ej: +54 11 4444 5678"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seguimiento */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="heading-display text-lg flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /> Seguimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Fecha de ingreso al servicio <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    type="date"
                    value={form.admissionDate}
                    onChange={e => setField('admissionDate', e.target.value)}
                    className="font-body"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <p className="font-body text-[11px] text-muted-foreground -mt-1">
                    La frecuencia de curación se define al crear cada herida (preestablecida o en días).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datos administrativos */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="heading-display text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Datos administrativos y contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Notas */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="heading-display text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Notas generales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-8">
            <p className="font-body text-[11px] text-muted-foreground">
              <span className="text-destructive">*</span> Campos obligatorios. El resto es opcional y se puede completar luego.
            </p>
            <div className="flex items-center gap-3">
              {Object.keys(errors).length > 0 && (
                <span className="font-body text-xs text-destructive">Revisá los campos marcados</span>
              )}
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="font-body">Cancelar</Button>
              <Button onClick={handleSave} className="font-body">Crear paciente</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
