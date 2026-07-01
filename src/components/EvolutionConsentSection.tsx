import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SignaturePad } from '@/components/SignaturePad';
import { ShieldCheck, FileSignature, AlertTriangle } from 'lucide-react';

export interface ProfessionalSignatureData {
  confirmed: boolean;
  signatureDataUrl: string | null;
}

interface EvolutionConsentSectionProps {
  professionalName: string;
  professionalLicense?: string;
  professionalInstitution?: string;
  hasGeneralConsent: boolean;
  professionalData: ProfessionalSignatureData;
  onProfessionalChange: (data: ProfessionalSignatureData) => void;
  errors?: string[];
}

export function EvolutionConsentSection({
  professionalName,
  professionalLicense,
  professionalInstitution,
  hasGeneralConsent,
  professionalData,
  onProfessionalChange,
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
    </div>
  );
}

/** Validate consent data. Returns array of error strings (empty = valid). */
export function validateEvolutionConsent(prof: ProfessionalSignatureData): string[] {
  const errors: string[] = [];
  if (!prof.confirmed) {
    errors.push('Para finalizar la curación, necesitás confirmar como profesional.');
  }
  if (!prof.signatureDataUrl) {
    errors.push('Para finalizar la curación, necesitás firmar como profesional.');
  }
  return errors;
}
