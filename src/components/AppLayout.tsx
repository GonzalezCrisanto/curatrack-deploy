import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CartButton, CartDrawer } from '@/components/marketplace/CartDrawer';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, currentUserName, logout } = useApp();
  const { sponsor } = useSponsor();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = currentUser
    ? `${currentUser.firstName[0] ?? ''}${currentUser.lastName[0] ?? ''}`.toUpperCase()
    : 'U';
  const roleLabel = currentUser?.role === 'medico'
    ? 'Médico/a'
    : currentUser?.role === 'admin'
      ? 'Administrativo/a'
      : 'Enfermería';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border/50 px-4 bg-card/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {sponsor && (
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/60 border border-border/50">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span className="font-body text-[11px] text-foreground/80">
                    {sponsor.sponsor_label} · <span className="font-semibold text-foreground">{sponsor.sponsor_name}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CartButton />
              <div className="hidden sm:block text-right">
                <p className="font-body text-sm font-medium">{currentUserName || 'Sin sesión'}</p>
                <p className="font-body text-xs text-muted-foreground">{roleLabel}{currentUser?.institution ? ` · ${currentUser.institution}` : ''}</p>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-body">{initials}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 flex flex-col">
            {children}
          </main>
          <CartDrawer />
        </div>
      </div>
    </SidebarProvider>
  );
}
