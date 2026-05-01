import { LayoutDashboard, Users, BarChart3, Settings, Sparkles, ShoppingBag, Package, ClipboardList, UserCog } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Pacientes', url: '/patients', icon: Users },
  { title: 'Marketplace', url: '/marketplace', icon: ShoppingBag },
  { title: 'Mis pedidos', url: '/orders', icon: Package },
  { title: 'Asistente IA', url: '/assistant', icon: Sparkles },
  { title: 'Estadísticas', url: '/statistics', icon: BarChart3 },
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
  const location = useLocation();
  const { currentUser } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-2 overflow-visible">
        <SidebarGroup>
          <SidebarGroupLabel className="font-body text-xs uppercase tracking-wider">Menú principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
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

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-body text-xs uppercase tracking-wider">Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
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
        )}
      </SidebarContent>
    </Sidebar>
  );
}
