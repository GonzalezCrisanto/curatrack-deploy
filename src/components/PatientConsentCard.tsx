import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SignaturePad } from '@/components/SignaturePad';
import { FileText, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';

const RELATIONSHIPS = [
  { value: 'paciente', label: 'Paciente' },
  { value: 'madre_padre', label: 'Madre / Padre' },
  { value: 'hijo_a', label: 'Hijo/a' },
  { value: 'conyuge', label: 'Cónyuge' },
  { value: 'tutor_legal', label: 'Tutor legal' },
  { value: 'cuidador_a', label: 'Cuidador/a' },
  { value: 'otro', label: 'Otro' },
];

interface PatientConsentCardProps {
  patientId: string;
  patientName: string;
  patientDni?: string;
}

interface ConsentRow {
  id: string;
  status: string;
  consent_version: string;
  accepts_digital_record: boolean;
  accepts_clinical_photos: boolean;
  accepts_wound_tracking: boolean;
  accepts_digital_reports: boolean;
  signer_full_name: string | null;
  signer_dni: string | null;
  signer_relationship: string | null;
  signed_at: string | null;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  accepted: { label: 'Consentimiento aceptado', icon: <CheckCircle2 className="h-4 w-4 text-success" />, variant: 'default' },
  rejected: { label: 'Consentimiento rechazado', icon: <XCircle className="h-4 w-4 text-destructive" />, variant: 'destructive' },
  partial: { label: 'Consentimiento parcial', icon: <AlertTriangle className="h-4 w-4 text-warning" />, variant: 'secondary' },
  pending: { label: 'Consentimiento pendiente', icon: <Clock className="h-4 w-4 text-muted-foreground" />, variant: 'outline' },
};

export function PatientConsentCard({ patientId, patientName, patientDni }: PatientConsentCardProps) {
  const { currentUser } = useApp();
  const [consent, setConsent] = useState<ConsentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [acceptsDigital, setAcceptsDigital] = useState(false);
  const [acceptsPhotos, setAcceptsPhotos] = useState(false);
  const [acceptsTracking, setAcceptsTracking] = useState(false);
  const [acceptsReports, setAcceptsReports] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerDni, setSignerDni] = useState('');
  const [signerRelationship, setSignerRelationship] = useState('paciente');
  const [signerRelOther, setSignerRelOther] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadConsent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_consents')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1);
    setConsent((data && data.length > 0 ? data[0] : null) as ConsentRow | null);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { loadConsent(); }, [loadConsent]);

  const openDialog = () => {
    setAcceptsDigital(false);
    setAcceptsPhotos(false);
    setAcceptsTracking(false);
    setAcceptsReports(false);
    setSignerName(patientName);
    setSignerDni(patientDni || '');
    setSignerRelationship('paciente');
    setSignerRelOther('');
    setSignatureDataUrl(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!signerName.trim() || !signerDni.trim()) {
      toast.error('Completá nombre y DNI del firmante.');
      return;
    }
    if (!signatureDataUrl) {
      toast.error('Se requiere la firma del paciente o responsable.');
      return;
    }

    setSaving(true);
    try {
      // Upload signature
      let sigPath: string | null = null;
      const blob = await (await fetch(signatureDataUrl)).blob();
      const path = `${currentUser.id}/consent-${patientId}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from('signatures').upload(path, blob, { contentType: 'image/png' });
      if (!upErr) sigPath = path;

      const anyAccepted = acceptsDigital || acceptsPhotos || acceptsTracking || acceptsReports;
      const allAccepted = acceptsDigital && acceptsPhotos && acceptsTracking && acceptsReports;
      const status = !anyAccepted ? 'rejected' : allAccepted ? 'accepted' : 'partial';

      const now = new Date().toISOString();
      const { error } = await supabase.from('patient_consents').insert({
        patient_id: patientId,
        user_id: currentUser.id,
        consent_version: 'v1.0',
        accepts_digital_record: acceptsDigital,
        accepts_clinical_photos: acceptsPhotos,
        accepts_wound_tracking: acceptsTracking,
        accepts_digital_reports: acceptsReports,
        status,
        signer_full_name: signerName,
        signer_dni: signerDni,
        signer_relationship: signerRelationship === 'otro' ? signerRelOther || 'Otro' : signerRelationship,
        signer_relationship_other: signerRelationship === 'otro' ? signerRelOther : null,
        signature_url: sigPath,
        signed_at: now,
      } as any);

      if (error) {
        toast.error('No se pudo guardar el consentimiento.');
        console.error(error);
      } else {
        toast.success('Consentimiento informado registrado correctamente.');
        setDialogOpen(false);
        loadConsent();
      }
    } catch (e) {
      toast.error('Error inesperado al guardar.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const cfg = statusConfig[consent?.status || 'pending'] || statusConfig.pending;

  if (loading) return null;

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="heading-display text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Consentimiento informado
            <Badge variant={cfg.variant} className="ml-auto text-[10px] flex items-center gap-1">
              {cfg.icon} {cfg.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {consent ? (
            <div className="text-xs font-body space-y-1">
              <p><span className="text-muted-foreground">Firmante:</span> {consent.signer_full_name} — DNI {consent.signer_dni}</p>
              <p><span className="text-muted-foreground">Vínculo:</span> {consent.signer_relationship}</p>
              <p><span className="text-muted-foreground">Versión:</span> {consent.consent_version}</p>
              {consent.signed_at && <p><span className="text-muted-foreground">Fecha:</span> {new Date(consent.signed_at).toLocaleString('es-AR')}</p>}
              <div className="flex flex-wrap gap-1 pt-1">
                {consent.accepts_digital_record && <Badge variant="outline" className="text-[10px]">Registro digital</Badge>}
                {consent.accepts_clinical_photos && <Badge variant="outline" className="text-[10px]">Fotos clínicas</Badge>}
                {consent.accepts_wound_tracking && <Badge variant="outline" className="text-[10px]">Seguimiento</Badge>}
                {consent.accepts_digital_reports && <Badge variant="outline" className="text-[10px]">Comprobantes</Badge>}
              </div>
            </div>
          ) : (
            <p className="text-xs font-body text-muted-foreground italic">No hay consentimiento informado registrado para este paciente.</p>
          )}
          <Button variant="outline" size="sm" className="font-body w-full" onClick={openDialog}>
            <FileText className="h-4 w-4 mr-1" />
            {consent ? 'Actualizar consentimiento informado' : 'Registrar consentimiento informado'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-display text-lg">Consentimiento informado del paciente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="font-body text-xs text-muted-foreground leading-relaxed">
              Autorizo el registro digital de mis datos personales y clínicos en la plataforma, incluyendo información relacionada con mi atención, evolución de heridas, materiales utilizados, observaciones profesionales y documentación asociada. Entiendo que esta información será utilizada para seguimiento clínico y gestión de la atención.
            </p>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox id="cd-digital" checked={acceptsDigital} onCheckedChange={(v) => setAcceptsDigital(!!v)} />
                <Label htmlFor="cd-digital" className="font-body text-xs cursor-pointer leading-tight">Acepta el registro digital de datos clínicos.</Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="cd-photos" checked={acceptsPhotos} onCheckedChange={(v) => setAcceptsPhotos(!!v)} />
                <Label htmlFor="cd-photos" className="font-body text-xs cursor-pointer leading-tight">Acepta la carga y almacenamiento de fotografías clínicas.</Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="cd-tracking" checked={acceptsTracking} onCheckedChange={(v) => setAcceptsTracking(!!v)} />
                <Label htmlFor="cd-tracking" className="font-body text-xs cursor-pointer leading-tight">Acepta que la información sea utilizada para seguimiento de la evolución de heridas.</Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="cd-reports" checked={acceptsReports} onCheckedChange={(v) => setAcceptsReports(!!v)} />
                <Label htmlFor="cd-reports" className="font-body text-xs cursor-pointer leading-tight">Acepta recibir o generar comprobantes digitales de atención.</Label>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="font-body text-xs">Nombre y apellido del firmante</Label>
                <Input value={signerName} onChange={e => setSignerName(e.target.value)} className="font-body text-xs h-9" />
              </div>
              <div>
                <Label className="font-body text-xs">DNI</Label>
                <Input value={signerDni} onChange={e => setSignerDni(e.target.value)} className="font-body text-xs h-9" />
              </div>
              <div className={signerRelationship === 'otro' ? '' : 'sm:col-span-2'}>
                <Label className="font-body text-xs">Vínculo con el paciente</Label>
                <Select value={signerRelationship} onValueChange={setSignerRelationship}>
                  <SelectTrigger className="font-body text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map(r => <SelectItem key={r.value} value={r.value} className="font-body text-xs">{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {signerRelationship === 'otro' && (
                <div>
                  <Label className="font-body text-xs">Especificar vínculo</Label>
                  <Input value={signerRelOther} onChange={e => setSignerRelOther(e.target.value)} className="font-body text-xs h-9" />
                </div>
              )}
            </div>

            <SignaturePad
              label="Firma del paciente o responsable"
              onConfirm={setSignatureDataUrl}
              onClear={() => setSignatureDataUrl(null)}
              confirmed={!!signatureDataUrl}
              confirmedDataUrl={signatureDataUrl ?? undefined}
            />

            <p className="text-[10px] text-muted-foreground/70 font-body">
              Versión del consentimiento: v1.0 · {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })} — {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-body flex-1">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="font-body flex-1">
                {saving ? 'Guardando...' : 'Registrar consentimiento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
