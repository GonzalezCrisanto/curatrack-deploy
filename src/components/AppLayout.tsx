import { ReactNode, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { useAppRole } from '@/hooks/useAppRole';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity, LogOut, Menu, Settings, Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CartDrawer } from '@/components/marketplace/CartDrawer';
import { useCart } from '@/context/CartContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, currentUserName, logout } = useApp();
  const { sponsor, resetBrandingToDefault } = useSponsor();
  const { role } = useAppRole();
  const { toast } = useToast();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (role !== 'sponsor' || !currentUser?.id || !sponsor) return;
    const key = `sponsor-first-login:${currentUser.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    toast({
      title: 'Bienvenido a CuraTrack',
      description: `Estás viendo el panel comercial de ${sponsor.sponsor_name}.`,
      action: (
        <ToastAction altText="Abrir panel sponsor" onClick={() => navigate('/panel-sponsor')}>
          Empezar
        </ToastAction>
      ),
    });
  }, [role, currentUser?.id, sponsor?.id]);

  const handleLogout = async () => {
    await logout();
    resetBrandingToDefault();
    navigate('/login');
  };

  const initials = currentUser
    ? `${currentUser.firstName[0] ?? ''}${currentUser.lastName[0] ?? ''}`.toUpperCase()
    : 'U';
  const roleLabel = currentUser?.role === 'admin'
    ? 'Administrativo/a'
    : currentUser?.role === 'sponsor'
      ? 'Sponsor'
      : 'Profesional';
  const isProfessional = role === 'professional';
  const showSponsorSubtle = isProfessional && !!sponsor;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border/50 px-4 bg-card/60 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" aria-label="Abrir menú lateral">
                <Menu className="h-4 w-4" />
              </SidebarTrigger>
              <button
                onClick={() => navigate(role === 'sponsor' ? '/panel-sponsor' : '/dashboard')}
                className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/40 transition-colors"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </span>
                <div className="leading-tight text-left">
                  <p className="font-display text-sm font-semibold tracking-tight">CuraTrack</p>
                  {showSponsorSubtle && (
                    <p className="font-body text-[10px] text-muted-foreground">
                      para programa {sponsor.sponsor_name}
                    </p>
                  )}
                </div>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9"
                      onClick={() => navigate('/cart')}
                      aria-label="Solicitudes de reposición pendientes"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {itemCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                          {itemCount > 99 ? '99+' : itemCount}
                        </span>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Solicitudes de reposición pendientes</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 px-1.5 gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-body">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-body">
                    <p className="text-sm font-medium">{currentUserName || 'Sin sesión'}</p>
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">
                      {roleLabel}{currentUser?.institution ? ` · ${currentUser.institution}` : ''}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/orders')}>
                    <Package className="mr-2 h-4 w-4" />
                    Mis Pedidos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
