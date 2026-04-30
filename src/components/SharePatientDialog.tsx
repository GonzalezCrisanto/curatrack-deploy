import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users as UsersIcon } from 'lucide-react';

interface SharePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

// Phase 1 stub: sharing/teams will return in Phase 2 once cases & evolutions
// are migrated to the backend. For now we just inform the user.
export function SharePatientDialog({ open, onOpenChange, patientName }: SharePatientDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-display text-lg flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-primary" /> Compartir paciente
          </DialogTitle>
          <DialogDescription className="font-body">
            {patientName}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-muted/40 border border-border/60 p-4 font-body text-sm text-muted-foreground space-y-2">
          <p>
            Compartir pacientes entre profesionales se va a habilitar en una próxima
            etapa, junto con la sincronización completa de casos y evoluciones en el
            backend.
          </p>
          <p className="text-xs">
            Por ahora cada cuenta gestiona sus propios pacientes de forma privada y segura.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
