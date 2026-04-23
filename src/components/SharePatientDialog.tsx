import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Mail, Trash2, Crown, Users as UsersIcon, Building2 } from 'lucide-react';
import { ROLE_LABEL, ROLE_LABEL_SHORT, ShareRole } from '@/data/demoUsers';

interface SharePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

export function SharePatientDialog({ open, onOpenChange, patientId, patientName }: SharePatientDialogProps) {
  const {
    sharePatient, revokeShare, updateShareRole,
    getPatientCollaborators, getPatientAccess,
  } = useApp();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('collaborator');

  const access = getPatientAccess(patientId);
  const collaborators = getPatientCollaborators(patientId);
  const canManage = access?.canShare ?? false;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const result = sharePatient(patientId, email, role);
    if (!result.ok) {
      toast({ title: 'No se pudo compartir', description: result.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Invitación enviada', description: `${email} ahora tiene acceso como ${ROLE_LABEL_SHORT[role]}.` });
    setEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-display text-lg">Compartir paciente</DialogTitle>
          <DialogDescription className="font-body">
            {patientName} — gestioná quién puede ver y editar este paciente.
          </DialogDescription>
        </DialogHeader>

        {/* Invite form */}
        {canManage ? (
          <form onSubmit={handleInvite} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="font-body text-sm">Email del profesional</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="colega@ejemplo.com"
                  className="font-body pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-sm">Nivel de acceso</Label>
              <Select value={role} onValueChange={v => setRole(v as ShareRole)}>
                <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">{ROLE_LABEL.viewer}</SelectItem>
                  <SelectItem value="collaborator">{ROLE_LABEL.collaborator}</SelectItem>
                  <SelectItem value="co_owner">{ROLE_LABEL.co_owner}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full font-body" disabled={!email}>
              Compartir paciente
            </Button>
          </form>
        ) : (
          <div className="rounded-md bg-muted/40 border border-border/60 p-3 font-body text-xs text-muted-foreground">
            Solo el dueño del paciente (o un co-dueño) puede invitar a otros profesionales.
          </div>
        )}

        {/* Collaborators list */}
        <div className="pt-3 border-t border-border/60">
          <p className="font-body text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Acceso actual ({collaborators.length})
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {collaborators.map(({ user, role: r, via }) => (
              <div key={user.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/60 bg-card">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-body text-sm font-semibold truncate">
                      {user.role === 'medico' ? 'Dr.' : 'Lic.'} {user.firstName} {user.lastName}
                    </p>
                    {via === 'owner' && (
                      <Badge className="font-body text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/30">
                        <Crown className="h-2.5 w-2.5 mr-0.5" /> Dueño
                      </Badge>
                    )}
                    {via === 'team' && (
                      <Badge variant="outline" className="font-body text-[10px] py-0 px-1.5">
                        <Building2 className="h-2.5 w-2.5 mr-0.5" /> Equipo
                      </Badge>
                    )}
                    {via === 'share' && r !== 'owner' && (
                      <Badge variant="outline" className="font-body text-[10px] py-0 px-1.5">
                        <UsersIcon className="h-2.5 w-2.5 mr-0.5" /> Invitado
                      </Badge>
                    )}
                  </div>
                  <p className="font-body text-xs text-muted-foreground truncate">{user.email}</p>
                </div>

                {via === 'share' && r !== 'owner' && canManage ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Select
                      value={r as ShareRole}
                      onValueChange={(v) => updateShareRole(patientId, user.id, v as ShareRole)}
                    >
                      <SelectTrigger className="font-body h-8 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">{ROLE_LABEL_SHORT.viewer}</SelectItem>
                        <SelectItem value="collaborator">{ROLE_LABEL_SHORT.collaborator}</SelectItem>
                        <SelectItem value="co_owner">{ROLE_LABEL_SHORT.co_owner}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        revokeShare(patientId, user.id);
                        toast({ title: 'Acceso revocado', description: `${user.firstName} ${user.lastName} ya no puede ver este paciente.` });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="secondary" className="font-body text-[10px]">
                    {r === 'owner' ? 'Acceso total' : ROLE_LABEL_SHORT[r as ShareRole]}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
