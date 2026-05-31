import {
  LayoutDashboard, Users, UserPlus, Activity, PlusCircle, Calendar, ShoppingBag,
  Truck, Briefcase, BarChart3, Sparkles, FileText, Settings, Package, ClipboardList, UserCog,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { usePermissions, type PermissionSection } from '@/hooks/usePermissions';
import { useNavigate, useLocation } from 'react-router-dom';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useMemo, useState } from 'react';

type SidebarItem = {
  title: string;
  url: string;
  icon: any;
  section: PermissionSection;
  children?: Array<{
    title: string;
    url: string;
  }>;
};

const clinicalItems: SidebarItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, section: 'dashboard' },
 // { title: 'Casos de heridas', url: '/cases', icon: Activity, section: 'casos-heridas' },
  { title: 'Nueva curación', url: '/curation/new', icon: PlusCircle, section: 'nueva-curacion' },
  { title: 'Nuevo paciente', url: '/patients/new', icon: PlusCircle, section: 'nueva-curacion' },
 

  //{ title: 'Agenda', url: '/agenda', icon: Calendar, section: 'agenda' },
];

const commercialItems: SidebarItem[] = [
  { title: 'Catálogo clínico', url: '/marketplace', icon: ShoppingBag, section: 'catalogo-clinico' },
  { title: 'Solicitudes de reposición', url: '/orders', icon: Truck, section: 'solicitudes-reposicion' },
  { title: 'Panel Sponsor', url: '/sponsor', icon: Briefcase, section: 'panel-sponsor' },
];

const insightsItems: SidebarItem[] = [
  { title: 'Estadísticas', url: '/statistics', icon: BarChart3, section: 'estadisticas' },
 
  { title: 'Reportes', url: '/reports', icon: FileText, section: 'reportes' },
  { title: 'Configuración', url: '/settings', icon: Settings, section: 'configuracion' },
];

const adminItems: SidebarItem[] = [
  { title: 'Productos', url: '/admin/products', icon: Package, section: 'admin-productos' },
  { title: 'Pedidos', url: '/admin/orders', icon: ClipboardList, section: 'admin-pedidos' },
  { title: 'Cuentas', url: '/admin/accounts', icon: UserCog, section: 'admin-cuentas' },
];

const sponsorCommercialItems: SidebarItem[] = [
  { title: 'Panel Sponsor', url: '/panel-sponsor', icon: Briefcase, section: 'panel-sponsor' },
  { title: 'Estadísticas', url: '/statistics', icon: BarChart3, section: 'estadisticas' },
  { title: 'Reportes', url: '/reports', icon: FileText, section: 'reportes' },
];

const sponsorProductsItems: SidebarItem[] = [
  { title: 'Catálogo de productos', url: '/catalogo-productos', icon: Package, section: 'catalogo-productos' },
  { title: 'Pedidos', url: '/orders', icon: ClipboardList, section: 'pedidos' },
  { title: 'Solicitudes de reposición', url: '/orders', icon: Truck, section: 'solicitudes-reposicion' },
];

const sponsorAccountItems: SidebarItem[] = [
  { title: 'Configuración', url: '/settings', icon: Settings, section: 'configuracion-sponsor' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { currentUser } = useApp();
  const { sponsor } = useSponsor();
  const { role, can, ready } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = role === 'ADMIN';
  const isSponsor = role === 'SPONSOR';
  const isProfessional = role === 'CLINICIAN';

  const filterByPermission = (items: SidebarItem[]) => items.filter((item) => can(item.section));

  const defaultOpenKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const group of [clinicalItems, commercialItems, insightsItems, adminItems]) {
      for (const it of group) {
        if (it.children?.length && location.pathname.startsWith(it.url)) keys.add(it.title);
      }
    }
    return keys;
  }, [location.pathname]);

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    defaultOpenKeys.forEach((k) => { init[k] = true; });
    return init;
  });

  const isOpen = (key: string) => !!open[key] || defaultOpenKeys.has(key);

  const renderGroup = (label: string, items: SidebarItem[]) => (
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
                  onClick={() => {
                    if (item.children?.length) setOpen((prev) => ({ ...prev, [item.title]: true }));
                  }}
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent/45 text-sidebar-accent-foreground font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span className="font-body text-sm">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>

              {item.children?.length ? (
                <SidebarMenuSub className={isOpen(item.title) ? undefined : 'hidden'}>
                  {item.children.map((child) => (
                    <SidebarMenuSubItem key={`${item.title}:${child.title}`}>
                      <SidebarMenuSubButton asChild>
                        <NavLink
                          to={child.url}
                          className="hover:bg-sidebar-accent/50"
                          activeClassName="bg-sidebar-accent/45 text-sidebar-accent-foreground font-medium"
                        >
                          <UserPlus className="h-4 w-4" />
                          {!collapsed && <span className="font-body">{child.title}</span>}
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              ) : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  // Items per role
  const profClinical = filterByPermission(clinicalItems);
  const profSupplies = filterByPermission([
    { title: 'Catálogo clínico', url: '/marketplace', icon: ShoppingBag, section: 'catalogo-clinico' },
    { title: 'Solicitudes de reposición', url: '/orders', icon: Truck, section: 'solicitudes-reposicion' },
  ]);
  const profPlatform = filterByPermission([
    //{ title: 'Asistente clínico', url: '/assistant', icon: Sparkles, section: 'asistente-clinico' },
    { title: 'Configuración', url: '/settings', icon: Settings, section: 'configuracion' },
  ]);

  const sponsorPanelCommercial = filterByPermission(sponsorCommercialItems);
  const sponsorProducts = filterByPermission(sponsorProductsItems);
  const sponsorAccount = filterByPermission(sponsorAccountItems);

  const homePath = isSponsor ? '/panel-sponsor' : '/dashboard';

  if (currentUser && !ready) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border/60">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <p className="font-display text-sm font-semibold tracking-tight">CuraTrack</p>
              </div>
            )}
          </div>
        </SidebarHeader>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60">
        <button
          onClick={() => navigate(homePath)}
          className="flex items-center gap-2 px-2 py-3 hover:opacity-80 transition-opacity w-full text-left"
          title="CuraTrack"
        >
          {isSponsor && sponsor ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10">
              {sponsor.logo_url ? (
                <img src={sponsor.logo_url} alt={sponsor.sponsor_name} className="h-7 w-7 object-contain" />
              ) : (
                <Activity className="h-4 w-4 text-primary" />
              )}
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          )}
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold tracking-tight">CuraTrack</p>
              {sponsor && (
                <p className="font-body text-[10px] text-muted-foreground">
                  para {sponsor.sponsor_name}
                </p>
              )}
            </div>
          )}
        </button>
      </SidebarHeader>
      <SidebarContent className="pt-2 overflow-visible">
        {isSponsor && (
          <>
            {sponsorPanelCommercial.length > 0 && renderGroup('Panel comercial', sponsorPanelCommercial)}
            {sponsorProducts.length > 0 && renderGroup('Productos e insumos', sponsorProducts)}
            {sponsorAccount.length > 0 && renderGroup('Cuenta', sponsorAccount)}
          </>
        )}
        {(isProfessional || isAdmin) && (
          <>
            {profClinical.length > 0 && renderGroup('Clínico', profClinical)}
            {isAdmin
              ? filterByPermission(commercialItems).length > 0 && renderGroup('Comercial sponsor', filterByPermission(commercialItems))
              : profSupplies.length > 0 && renderGroup('Insumos', profSupplies)}
            {isAdmin
              ? filterByPermission(insightsItems).length > 0 && renderGroup('Plataforma', filterByPermission(insightsItems))
              : profPlatform.length > 0 && renderGroup('Plataforma', profPlatform)}
          </>
        )}
        {isAdmin && filterByPermission(adminItems).length > 0 && renderGroup('Administración', filterByPermission(adminItems))}
      </SidebarContent>
    </Sidebar>
  );
}

