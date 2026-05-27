import {
  LayoutDashboard, Users, UserPlus, Activity, PlusCircle, Calendar, ShoppingBag,
  Truck, Briefcase, BarChart3, Sparkles, FileText, Settings, Package, ClipboardList, UserCog,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { useAppRole } from '@/hooks/useAppRole';
import { useNavigate, useLocation } from 'react-router-dom';
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
  children?: Array<{
    title: string;
    url: string;
  }>;
};

const clinicalItems: SidebarItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  {
    title: 'Pacientes',
    url: '/patients',
    icon: Users,
    children: [
      { title: 'Nuevo paciente', url: '/patients?new=1' },
    ],
  },
  { title: 'Casos de heridas', url: '/cases', icon: Activity },
  { title: 'Nueva curación', url: '/curation/new', icon: PlusCircle },
  { title: 'Agenda', url: '/agenda', icon: Calendar },
];

const commercialItems: SidebarItem[] = [
  { title: 'Catálogo clínico', url: '/marketplace', icon: ShoppingBag },
  { title: 'Solicitudes de reposición', url: '/orders', icon: Truck },
  { title: 'Panel Sponsor', url: '/sponsor', icon: Briefcase },
];

const insightsItems: SidebarItem[] = [
  { title: 'Estadísticas', url: '/statistics', icon: BarChart3 },
  { title: 'Asistente clínico', url: '/assistant', icon: Sparkles },
  { title: 'Reportes', url: '/reports', icon: FileText },
  { title: 'Configuración', url: '/settings', icon: Settings },
];

const adminItems: SidebarItem[] = [
  { title: 'Productos', url: '/admin/products', icon: Package },
  { title: 'Pedidos', url: '/admin/orders', icon: ClipboardList },
  { title: 'Cuentas', url: '/admin/accounts', icon: UserCog },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { currentUser } = useApp();
  const { sponsor } = useSponsor();
  const { role } = useAppRole();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = role === 'admin';
  const isSponsor = role === 'sponsor';
  const isProfessional = role === 'professional' || (!role && !!currentUser);

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
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
  const profClinical = clinicalItems;
  const profSupplies = [
    { title: 'Catálogo clínico', url: '/marketplace', icon: ShoppingBag },
    { title: 'Solicitudes de reposición', url: '/orders', icon: Truck },
  ];
  const profPlatform = [
    { title: 'Asistente clínico', url: '/assistant', icon: Sparkles },
    { title: 'Configuración', url: '/settings', icon: Settings },
  ];

  const sponsorMain = [
    { title: 'Panel sponsor', url: '/sponsor', icon: Briefcase },
    { title: 'Estadísticas', url: '/statistics', icon: BarChart3 },
    { title: 'Solicitudes de reposición', url: '/orders', icon: Truck },
    { title: 'Reportes', url: '/reports', icon: FileText },
    { title: 'Catálogo clínico', url: '/marketplace', icon: ShoppingBag },
  ];
  const sponsorAccount = [
    { title: 'Configuración', url: '/settings', icon: Settings },
  ];

  const homePath = isSponsor ? '/sponsor' : '/dashboard';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60">
        <button
          onClick={() => navigate(homePath)}
          className="flex items-center gap-2 px-2 py-3 hover:opacity-80 transition-opacity w-full text-left"
          title={sponsor?.app_name}
        >
          <SponsorLogo showName={!collapsed} />
        </button>
      </SidebarHeader>
      <SidebarContent className="pt-2 overflow-visible">
        {isSponsor && (
          <>
            {renderGroup('Sponsor', sponsorMain)}
            {renderGroup('Cuenta', sponsorAccount)}
          </>
        )}
        {(isProfessional || isAdmin) && (
          <>
            {renderGroup('Clínico', profClinical)}
            {renderGroup(isAdmin ? 'Comercial sponsor' : 'Insumos', isAdmin ? commercialItems : profSupplies)}
            {renderGroup('Plataforma', isAdmin ? insightsItems : profPlatform)}
          </>
        )}
        {isAdmin && renderGroup('Administración', adminItems)}
      </SidebarContent>
    </Sidebar>
  );
}

