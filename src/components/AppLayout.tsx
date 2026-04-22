import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useApp } from '@/context/AppContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/curatrack-logo.png';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, setIsLoggedIn } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-20 flex items-center justify-between border-b border-border/50 px-4 bg-card/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <img src={logo} alt="CuraTrack" className="h-14 md:h-16 w-auto hidden md:block" />
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="font-body text-sm font-medium">{currentUser}</p>
                <p className="font-body text-xs text-muted-foreground">Enfermería</p>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-body">MG</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
