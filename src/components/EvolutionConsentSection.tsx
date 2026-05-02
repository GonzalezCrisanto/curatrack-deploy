import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SignaturePad } from '@/components/SignaturePad';
import { ShieldCheck, FileSignature, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const RELATIONSHIPS = [
  { value: 'paciente', label: 'Paciente' },
  { value: 'madre_padre', label: 'Madre / Padre' },
  { value: 'hijo_a', label: 'Hijo/a' },
  { value: 'conyuge', label: 'Cónyuge' },
  { value: 'tutor_legal', label: 'Tutor legal' },
  { value: 'cuidador_a', label: 'Cuidador/a' },
  { value: 'otro', label: 'Otro' },
];

export interface ProfessionalSignatureData {
  confirmed: boolean;
  signatureDataUrl: string | null;
}

export interface PatientConsentData {
  consentStatus: 'accepts_all' | 'accepts_no_photos' | 'rejects';
  signerFullName: string;
  signerDni: string;
  signerRelationship: string;
  signerRelationshipOther: string;
  signatureDataUrl: string | null;
  observation: string;
}

interface EvolutionConsentSectionProps {
  professionalName: string;
  professionalLicense?: string;
  professionalInstitution?: string;
  patientName: string;
  patientDni?: string;
  hasGeneralConsent: boolean;
  professionalData: ProfessionalSignatureData;
  patientConsentData: PatientConsentData;
  onProfessionalChange: (data: ProfessionalSignatureData) => void;
  onPatientConsentChange: (data: PatientConsentData) => void;
  errors?: string[];
}

export function EvolutionConsentSection({
  professionalName,
  professionalLicense,
  professionalInstitution,
  patientName,
  patientDni,
  hasGeneralConsent,
  professionalData,
  patientConsentData,
  onProfessionalChange,
  onPatientConsentChange,
  errors,
}: EvolutionConsentSectionProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const handleProfConfirm = useCallback((v: boolean) => {
    onProfessionalChange({ ...professionalData, confirmed: v });
  }, [professionalData, onProfessionalChange]);

  const handleProfSignature = useCallback((dataUrl: string) => {
    onProfessionalChange({ ...professionalData, signatureDataUrl: dataUrl });
  }, [professionalData, onProfessionalChange]);

  const handleProfClearSig = useCallback(() => {
    onProfessionalChange({ ...professionalData, signatureDataUrl: null });
  }, [professionalData, onProfessionalChange]);

  const setPatientField = useCallback(<K extends keyof PatientConsentData>(key: K, val: PatientConsentData[K]) => {
    onPatientConsentChange({ ...patientConsentData, [key]: val });
  }, [patientConsentData, onPatientConsentChange]);

  const handlePatientSignature = useCallback((dataUrl: string) => {
    setPatientField('signatureDataUrl', dataUrl);
  }, [setPatientField]);

  const handlePatientClearSig = useCallback(() => {
    setPatientField('signatureDataUrl', null);
  }, [setPatientField]);

  const needsPatientSignature = patientConsentData.consentStatus !== 'rejects';

  return (
    <div className="space-y-4">
      <Separator />
      <h3 className="heading-display text-base flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-primary" /> Firma y consentimiento
      </h3>

      {!hasGeneralConsent && (
        <Alert variant="default" className="border-warning/40 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="font-body text-xs">
            Este paciente aún no tiene consentimiento informado general registrado. Podés continuar, pero se recomienda registrarlo desde la ficha del paciente.
          </AlertDescription>
        </Alert>
      )}

      {errors && errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-body text-xs space-y-1">
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </AlertDescription>
        </Alert>
      )}

      {/* BLOCK 1: Professional */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="heading-display text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Confirmación del profesional
            <Badge variant={professionalData.confirmed && professionalData.signatureDataUrl ? 'default' : 'outline'} className="ml-auto text-[10px]">
              {professionalData.confirmed && professionalData.signatureDataUrl ? 'Confirmado' : 'Pendiente'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-body text-xs text-muted-foreground italic">
            Declaro que la información registrada corresponde a la atención realizada.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs font-body">
            <div><span className="text-muted-foreground">Profesional:</span> <span className="font-medium">{professionalName}</span></div>
            {professionalLicense && <div><span className="text-muted-foreground">Matrícula:</span> <span className="font-medium">{professionalLicense}</span></div>}
            {professionalInstitution && <div><span className="text-muted-foreground">Institución:</span> <span className="font-medium">{professionalInstitution}</span></div>}
            <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{dateStr} — {timeStr}</span></div>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="prof-confirm"
              checked={professionalData.confirmed}
              onCheckedChange={(v) => handleProfConfirm(!!v)}
            />
            <Label htmlFor="prof-confirm" className="font-body text-xs leading-tight cursor-pointer">
              Confirmo que los datos registrados son correctos y corresponden a la atención realizada.
            </Label>
          </div>
          <SignaturePad
            label="Firma del profesional"
            onConfirm={handleProfSignature}
            onClear={handleProfClearSig}
            confirmed={!!professionalData.signatureDataUrl}
            confirmedDataUrl={professionalData.signatureDataUrl ?? undefined}
          />
          <p className="text-[10px] text-muted-foreground/70 font-body">La firma se guardará asociada a esta atención.</p>
        </CardContent>
      </Card>

      {/* BLOCK 2: Patient consent */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="heading-display text-sm flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            Consentimiento del paciente o responsable
            <Badge
              variant={patientConsentData.consentStatus === 'rejects' ? 'destructive' : patientConsentData.signatureDataUrl ? 'default' : 'outline'}
              className="ml-auto text-[10px]"
            >
              {patientConsentData.consentStatus === 'rejects' ? 'Rechazado' :
               patientConsentData.consentStatus === 'accepts_no_photos' ? 'Parcial' :
               patientConsentData.signatureDataUrl ? 'Aceptado' : 'Pendiente'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-body text-xs text-muted-foreground italic">
            El paciente o responsable fue informado sobre el registro digital de la atención y el uso de fotografías clínicas para seguimiento de la herida.
          </p>

          <RadioGroup
            value={patientConsentData.consentStatus}
            onValueChange={(v) => setPatientField('consentStatus', v as PatientConsentData['consentStatus'])}
            className="space-y-1"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="accepts_all" id="consent-all" />
              <Label htmlFor="consent-all" className="font-body text-xs cursor-pointer">Acepta registro digital y uso de fotografías clínicas</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="accepts_no_photos" id="consent-no-photos" />
              <Label htmlFor="consent-no-photos" className="font-body text-xs cursor-pointer">Acepta registro digital, pero NO acepta fotografías clínicas</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="rejects" id="consent-reject" />
              <Label htmlFor="consent-reject" className="font-body text-xs cursor-pointer">No acepta</Label>
            </div>
          </RadioGroup>

          {patientConsentData.consentStatus === 'accepts_no_photos' && (
            <Alert variant="default" className="border-warning/40 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="font-body text-[11px]">
                Si el paciente no acepta fotografías, evitá cargar imágenes en esta evolución.
              </AlertDescription>
            </Alert>
          )}

          {patientConsentData.consentStatus === 'rejects' && (
            <div className="space-y-2">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-body text-[11px]">
                  El paciente no acepta el registro digital. Es obligatorio dejar una observación explicando la situación. No deberían cargarse fotos.
                </AlertDescription>
              </Alert>
              <div>
                <Label className="font-body text-xs">Observación obligatoria</Label>
                <Textarea
                  value={patientConsentData.observation}
                  onChange={(e) => setPatientField('observation', e.target.value)}
                  placeholder="Explicá el motivo del rechazo..."
                  className="font-body text-xs h-16"
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="font-body text-xs">Nombre y apellido del firmante</Label>
              <Input
                value={patientConsentData.signerFullName}
                onChange={(e) => setPatientField('signerFullName', e.target.value)}
                placeholder={patientName}
                className="font-body text-xs h-9"
              />
            </div>
            <div>
              <Label className="font-body text-xs">DNI</Label>
              <Input
                value={patientConsentData.signerDni}
                onChange={(e) => setPatientField('signerDni', e.target.value)}
                placeholder={patientDni || 'Ej: 12.345.678'}
                className="font-body text-xs h-9"
              />
            </div>
            <div className={cn(patientConsentData.signerRelationship === 'otro' ? '' : 'sm:col-span-2')}>
              <Label className="font-body text-xs">Vínculo con el paciente</Label>
              <Select value={patientConsentData.signerRelationship} onValueChange={(v) => setPatientField('signerRelationship', v)}>
                <SelectTrigger className="font-body text-xs h-9">
                  <SelectValue placeholder="Seleccioná..." />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => (
                    <SelectItem key={r.value} value={r.value} className="font-body text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {patientConsentData.signerRelationship === 'otro' && (
              <div>
                <Label className="font-body text-xs">Especificar vínculo</Label>
                <Input
                  value={patientConsentData.signerRelationshipOther}
                  onChange={(e) => setPatientField('signerRelationshipOther', e.target.value)}
                  placeholder="Ej: Vecino responsable"
                  className="font-body text-xs h-9"
                />
              </div>
            )}
          </div>

          {needsPatientSignature && (
            <SignaturePad
              label="Firma del paciente o responsable"
              onConfirm={handlePatientSignature}
              onClear={handlePatientClearSig}
              confirmed={!!patientConsentData.signatureDataUrl}
              confirmedDataUrl={patientConsentData.signatureDataUrl ?? undefined}
            />
          )}

          <p className="text-[10px] text-muted-foreground/70 font-body">
            El consentimiento no reemplaza la evaluación profesional ni la documentación institucional obligatoria.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Validate consent data. Returns array of error strings (empty = valid). */
export function validateEvolutionConsent(
  prof: ProfessionalSignatureData,
  patient: PatientConsentData,
): string[] {
  const errors: string[] = [];
  if (!prof.confirmed) {
    errors.push('Para finalizar la curación, necesitás confirmar como profesional.');
  }
  if (!prof.signatureDataUrl) {
    errors.push('Para finalizar la curación, necesitás firmar como profesional.');
  }
  if (patient.consentStatus === 'rejects') {
    if (!patient.observation.trim()) {
      errors.push('El paciente rechazó el registro. Es obligatorio dejar una observación explicando la situación.');
    }
  } else {
    if (!patient.signatureDataUrl) {
      errors.push('Se requiere la firma del paciente o responsable.');
    }
  }
  if (!patient.signerFullName.trim()) {
    errors.push('Ingresá el nombre del firmante del consentimiento.');
  }
  if (!patient.signerDni.trim()) {
    errors.push('Ingresá el DNI del firmante del consentimiento.');
  }
  if (!patient.signerRelationship) {
    errors.push('Seleccioná el vínculo del firmante con el paciente.');
  }
  return errors;
}
