'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    strategy: true,
    campaign: false,
    settings: false,
    admin: false
  });
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user?.id)
        .single();
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
  };

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ouvrir le menu correspondant à la page active
  useEffect(() => {
    if (pathname === '/dashboard') {
      setOpenMenus(prev => ({ ...prev, strategy: true }));
    } else if (pathname === '/campaigns') {
      setOpenMenus(prev => ({ ...prev, campaign: true }));
    } else if (pathname.startsWith('/setup') || pathname.startsWith('/params') || 
               pathname.startsWith('/competitive-intelligence') || pathname === '/skeleton') {
      setOpenMenus(prev => ({ ...prev, strategy: true }));
    } else if (pathname.startsWith('/campaign-vertical')) {
      setOpenMenus(prev => ({ ...prev, campaign: true }));
    } else if (pathname.startsWith('/settings') || pathname === '/help') {
      setOpenMenus(prev => ({ ...prev, settings: true }));
    } else if (pathname.startsWith('/admin')) {
      setOpenMenus(prev => ({ ...prev, admin: true }));
    }
  }, [pathname]);

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isActive = (href: string) => pathname === href;

  // Menu principal
  const mainNav = [
    { name: 'Tableau de bord', href: '/dashboard', icon: '🏠' }
  ];

  // Menu Stratégie
  const strategyNav = {
    name: 'Stratégie',
    icon: '🎯',
    key: 'strategy',
    items: [
      { name: 'Configuration', href: '/setup', icon: '⚙️' },
      { name: 'Paramètres', href: '/params', icon: '📊' },
      { name: 'Veille concurrentielle', href: '/competitive-intelligence', icon: '🔍' },
      { name: 'Générer squelette', href: '/skeleton', icon: '📋' }
    ]
  };

  // Menu Campagne
  const campaignNav = {
    name: 'Campagne',
    icon: '🚀',
    key: 'campaign',
    items: [
      { name: 'Mes campagnes', href: '/campaigns', icon: '📁' },
      { name: 'Workflow complet', href: '/campaign-vertical', icon: '✨' }
    ]
  };

  // Menu Paramètres
  const settingsNav = {
    name: 'Paramètres',
    icon: '⚙️',
    key: 'settings',
    items: [
      { name: 'Notifications', href: '/settings/notifications', icon: '🔔' },
      { name: 'Équipe', href: '/settings/team', icon: '👥' },
      { name: 'Webhooks', href: '/settings/webhooks', icon: '🔌' },
      { name: 'Mon compte', href: '/settings/account', icon: '👤' },
      { name: 'Aide', href: '/help', icon: '❓' }
    ]
  };

  // Menu Admin (visible uniquement pour admin)
  const adminNav = {
    name: 'Administration',
    icon: '👑',
    key: 'admin',
    items: [
      { name: 'Dashboard Admin', href: '/admin', icon: '📊' },
      { name: 'Utilisateurs', href: '/admin/users', icon: '👥' }
    ]
  };

  // Construction du tableau de navigation conditionnel
  const allNav = [strategyNav, campaignNav, settingsNav];
  if (isAdmin) allNav.push(adminNav);

  const handleLogout = async () => {
    await signOut();
    toast.success('Déconnecté');
    router.push('/login');
  };

  // Pages sans sidebar
  const noSidebarPages = ['/login', '/create'];
  if (noSidebarPages.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-sm transition-all duration-300 z-50 overflow-y-auto ${
          isSidebarOpen ? 'w-64' : 'w-16'
        } ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">B</span>
              </div>
              {isSidebarOpen && (
                <span className="font-semibold text-gray-800 text-base truncate">
                  BDB Consulting
                </span>
              )}
            </div>
            {!isMobile && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1 rounded-md hover:bg-gray-100"
                aria-label={isSidebarOpen ? 'Réduire le menu' : 'Agrandir le menu'}
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-4">
            {/* Dashboard principal */}
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            ))}

            {/* Menus groupés */}
            {allNav.map((group) => (
              <div key={group.key} className="space-y-1">
                <button
                  onClick={() => toggleMenu(group.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    openMenus[group.key]
                      ? 'text-gray-800 font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{group.icon}</span>
                    {isSidebarOpen && <span>{group.name}</span>}
                  </div>
                  {isSidebarOpen && (
                    <svg className={`w-4 h-4 transition-transform ${openMenus[group.key] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Menu ouvert - version complète */}
                {openMenus[group.key] && isSidebarOpen && (
                  <div className="pl-9 space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isActive(item.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-base flex-shrink-0">{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Menu ouvert - version réduite (icônes seulement) */}
                {openMenus[group.key] && !isSidebarOpen && (
                  <div className="flex flex-col items-center gap-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex justify-center items-center w-10 h-10 rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        title={item.name}
                      >
                        <span className="text-xl">{item.icon}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-700">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user?.email?.split('@')[0] || 'Utilisateur'}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
              {!isSidebarOpen && (
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                  title="Déconnexion"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Mobile menu button */}
      {isMobile && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-gray-200"
          aria-label="Ouvrir le menu"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Main content */}
      <main
        className={`transition-all duration-300 min-h-screen ${
          isSidebarOpen && !isMobile ? 'ml-64' : isMobile ? 'ml-0' : 'ml-16'
        }`}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}