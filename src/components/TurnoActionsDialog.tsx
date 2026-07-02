import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Trash2 } from 'lucide-react';
import { useApp, type Turno } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

export function turnoStatusLabel(status: Turno['status']) {
  if (status === 'completado') return 'Completado';
  if (status === 'cancelado') return 'Cancelado';
  if (status === 'vencido') return 'Vencido';
  return 'Programado';
}

export function turnoStatusBadgeClass(status: Turno['status']) {
  if (status === 'completado') return 'bg-success/10 text-success border-success/40';
  if (status === 'cancelado') return 'bg-muted text-muted-foreground border-border';
  if (status === 'vencido') return 'bg-destructive/10 text-destructive border-destructive/40';
  return 'bg-warning/10 text-warning border-warning/40';
}

interface TurnoActionsDialogProps {
  turno: Turno | null;
  patientName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Reprogramar / cancelar a single turno. Shared across every screen that
 * lists turnos (Dashboard, PatientDetail, Agenda) so the action lives in
 * one place instead of being reimplemented per list.
 */
export function TurnoActionsDialog({ turno, patientName, open, onOpenChange }: TurnoActionsDialogProps) {
  const { updateTurno, cancelTurno } = useApp();
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  useEffect(() => {
    if (!turno) return;
    setDate(turno.date);
    setTime(turno.time || '');
  }, [turno]);

  if (!turno) return null;

  const isEditable = turno.status === 'programado' || turno.status === 'vencido';
  const hasChanges = date !== turno.date || time !== (turno.time || '');

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    try {
      await updateTurno({ ...turno, date, time });
      toast({ title: 'Turno reprogramado', description: `${date}${time ? ` · ${time}` : ''}` });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelTurno(turno.id);
      toast({ title: 'Turno cancelado' });
      onOpenChange(false);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="heading-display text-xl flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Turno{patientName ? ` — ${patientName}` : ''}
            </DialogTitle>
          </DialogHeader>

          <Badge variant="outline" className={`font-body text-sm w-fit ${turnoStatusBadgeClass(turno.status)}`}>
            {turnoStatusLabel(turno.status)}
          </Badge>

          {isEditable ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Fecha</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Hora</Label>
                  <Input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  className="font-body text-destructive border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setCancelConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Cancelar turno
                </Button>
                <Button onClick={handleSave} disabled={saving || !hasChanges || !date} className="font-body">
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="font-body text-sm text-muted-foreground">
                {turno.date}{turno.time ? ` · ${turno.time}` : ''}
              </p>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Este turno ya está {turnoStatusLabel(turno.status).toLowerCase()} y no se puede modificar.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="heading-display">¿Cancelar este turno?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              {patientName ? `${patientName} — ` : ''}{turno.date}{turno.time ? ` · ${turno.time}` : ''}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="font-body bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelando...' : 'Sí, cancelar turno'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
