import {
  LayoutDashboard, Users, Activity, PlusCircle, Calendar, ShoppingBag,
  Truck, Briefcase, BarChart3, Sparkles, FileText, Settings, Package, ClipboardList, UserCog,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { useNavigate } from 'react-router-dom';
import { SponsorLogo } from '@/components/SponsorLogo';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const clinicalItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Pacientes', url: '/patients', icon: Users },
  { title: 'Casos de heridas', url: '/cases', icon: Activity },
  { title: 'Nueva curación', url: '/patients', icon: PlusCircle },
  { title: 'Agenda', url: '/agenda', icon: Calendar },
];

const commercialItems = [
  { title: 'Catálogo clínico', url: '/marketplace', icon: ShoppingBag },
  { title: 'Solicitudes de reposición', url: '/orders', icon: Truck },
  { title: 'Panel Sponsor', url: '/sponsor', icon: Briefcase },
];

const insightsItems = [
  { title: 'Estadísticas', url: '/statistics', icon: BarChart3 },
  { title: 'Asistente clínico', url: '/assistant', icon: Sparkles },
  { title: 'Reportes', url: '/reports', icon: FileText },
  { title: 'Configuración', url: '/settings', icon: Settings },
];

const adminItems = [
  { title: 'Productos', url: '/admin/products', icon: Package },
  { title: 'Pedidos', url: '/admin/orders', icon: ClipboardList },
  { title: 'Cuentas', url: '/admin/accounts', icon: UserCog },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { currentUser } = useApp();
  const { sponsor } = useSponsor();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';

  const renderGroup = (label: string, items: typeof clinicalItems) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="font-body text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === '/dashboard'}
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span className="font-body text-sm">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-2 py-3 hover:opacity-80 transition-opacity w-full text-left"
          title={sponsor?.app_name}
        >
          <SponsorLogo showName={!collapsed} />
        </button>
      </SidebarHeader>
      <SidebarContent className="pt-2 overflow-visible">
        {renderGroup('Clínico', clinicalItems)}
        {renderGroup('Comercial sponsor', commercialItems)}
        {renderGroup('Plataforma', insightsItems)}
        {isAdmin && renderGroup('Administración', adminItems)}
      </SidebarContent>
    </Sidebar>
  );
}
