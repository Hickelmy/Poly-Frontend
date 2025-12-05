
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { 
  Home, Map, Users, ShoppingBag, Wrench, Settings, Bell, 
  LogOut, Menu, X, Sun, Moon, ChevronDown, Shield, 
  HelpCircle, FileText, LayoutDashboard, UserCog, Link2, MapPinned
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('polys-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return false;
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appSettings, setAppSettings] = useState(null);

  useEffect(() => {
    loadUser();
    loadNotifications();
    loadAppSettings();
  }, [currentPageName]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('polys-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('polys-theme', 'light');
    }
  }, [darkMode]);

  const loadUser = async () => {
    try {
      const isAuth = await polysApi.auth.isAuthenticated();
      if (!isAuth) return;
      const userData = await polysApi.auth.me();
      setUser(userData);
    } catch (e) {
      // Not logged in
    }
  };

  const loadNotifications = async () => {
    try {
      const isAuth = await polysApi.auth.isAuthenticated();
      if (isAuth) {
        const notifs = await polysApi.entities.Notification.filter(
          { read: false },
          '-created_date',
          5
        );
        setNotifications(notifs);
        setUnreadCount(notifs.length);
      }
    } catch (e) {
      console.log('Error loading notifications');
    }
  };

  const loadAppSettings = async () => {
    try {
      const settings = await polysApi.settings.get();
      setAppSettings(settings);
    } catch (e) {
      console.log('Error loading app settings');
    }
  };

  const handleLogout = () => {
    polysApi.auth.logout('/');
  };

  // Public pages without sidebar
  const publicPages = ['Landing', 'AdminRequestForm', 'AdminCompleteRegister', 'Login', 'Register'];
  const isPublicPage = publicPages.includes(currentPageName);

  if (isPublicPage) {
    return (
      <div className={cn("min-h-screen", darkMode ? "dark bg-slate-950" : "bg-white")}>
        <style>{`
          :root {
            --primary: 168 85% 35%;
            --primary-foreground: 0 0% 100%;
            --accent: 168 60% 95%;
            --accent-foreground: 168 85% 25%;
          }
          .dark {
            --background: 222.2 84% 4.9%;
            --foreground: 210 40% 98%;
            --primary: 168 85% 40%;
          }
        `}</style>
        {children}
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', roles: ['usuario', 'administrador', 'gestor', 'suporte'] },
    { name: 'Comunidade', icon: Users, page: 'Projects', roles: ['usuario', 'administrador', 'gestor', 'suporte'] },
    { name: 'Loja', icon: ShoppingBag, page: 'Store', roles: ['usuario', 'administrador', 'gestor', 'suporte'] },
    { name: 'Serviços', icon: Wrench, page: 'Services', roles: ['usuario', 'administrador', 'gestor', 'suporte'] },
    { name: 'Meus Pedidos', icon: FileText, page: 'MyOrders', roles: ['usuario', 'administrador', 'gestor', 'suporte'] },
    { name: 'Minhas Vendas', icon: ShoppingBag, page: 'SellerDashboard', roles: ['usuario', 'administrador', 'gestor', 'suporte'] },
    { name: 'Suporte', icon: HelpCircle, page: 'Support', roles: ['usuario', 'administrador', 'gestor', 'suporte'] },
  ];

  const adminMenuItems = [
    { name: 'Gestão de Áreas', icon: MapPinned, page: 'ZoneManagement', roles: ['gestor'] },
    { name: 'Links de Convite', icon: Link2, page: 'InviteLinks', roles: ['gestor'] },
    { name: 'Gestão de Usuários', icon: UserCog, page: 'UserManagement', roles: ['gestor', 'administrador'] },
    { name: 'Configurações', icon: Settings, page: 'AppSettings', roles: ['gestor'] },
    { name: 'Auditoria', icon: Shield, page: 'AuditLogs', roles: ['gestor', 'administrador'] },
  ];

  const userRole = user?.user_role || 'usuario';

  const maintenanceActive =
    appSettings?.maintenanceMode &&
    !['gestor', 'administrador', 'suporte'].includes(userRole);

  return (
    <div className={cn("min-h-screen flex", darkMode ? "dark bg-slate-950 text-white" : "bg-slate-50")}>
      <style>{`
        :root {
          --primary: 168 85% 35%;
          --primary-foreground: 0 0% 100%;
          --accent: 168 60% 95%;
          --accent-foreground: 168 85% 25%;
        }
        .dark {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;
          --primary: 168 85% 40%;
          --card: 222.2 84% 6%;
          --card-foreground: 210 40% 98%;
          --border: 217.2 32.6% 17.5%;
        }
      `}</style>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out",
        "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <Map className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">POLYS</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Melhoria Comunitária</p>
              </div>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {menuItems.filter(item => item.roles.includes(userRole)).map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    currentPageName === item.page
                      ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-medium"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>

            {/* Admin Section */}
            {['gestor', 'administrador', 'suporte'].includes(userRole) && (
              <div className="mt-8">
                <p className="px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Administração
                </p>
                <div className="space-y-1">
                  {adminMenuItems.filter(item => item.roles.includes(userRole)).map((item) => (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        currentPageName === item.page
                          ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-medium"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* User Section */}
          {user && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-teal-100 text-teal-700">
                    {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {user.full_name || user.name || 'Usuário'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white hidden sm:block">
                {currentPageName === 'Dashboard' ? 'Painel Principal' : 
                 currentPageName === 'Projects' ? 'Comunidade' :
                 currentPageName === 'Store' ? 'Loja Local' :
                 currentPageName === 'Services' ? 'Serviços' :
                 currentPageName === 'CreateProject' ? 'Criar Projeto' :
                 currentPageName}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode((prev) => !prev)}
                className="text-slate-600 dark:text-slate-400"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-3 border-b">
                    <h3 className="font-semibold">Notificações</h3>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} className="p-3">
                        <div>
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-slate-500">{notif.message}</p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="bg-teal-100 text-teal-700 text-sm">
                        {user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-3 border-b">
                    <p className="font-medium">{user?.full_name || user?.name || 'Usuário'}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {user?.user_role || 'usuario'}
                    </Badge>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Profile')} className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          {maintenanceActive ? (
            <div className="max-w-2xl mx-auto mt-16 text-center space-y-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Plataforma em manutenção
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Estamos realizando ajustes importantes no POLYS. Tente novamente mais tarde
                ou fale com o gestor da sua comunidade.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
