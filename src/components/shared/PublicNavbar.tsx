import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { polysApi } from '@/api/polysClient';
import { Map, Sun, Moon, Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PublicNavbar() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('polys-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('polys-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('polys-theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors duration-300",
      darkMode
        ? 'bg-slate-950/80 border-slate-800'
        : 'bg-white/80 border-slate-100'
    )}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to={createPageUrl('Landing')} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <Map className="w-6 h-6 text-white" />
          </div>
          <span className={cn(
            "text-xl font-bold transition-colors",
            darkMode ? 'text-white' : 'text-slate-900'
          )}>
            POLYS
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            to={createPageUrl('Landing')}
            className={cn(
              "transition-colors",
              darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
            )}
          >
            Início
          </Link>
          <Link
            to={createPageUrl('About')}
            className={cn(
              "transition-colors",
              darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
            )}
          >
            Sobre
          </Link>
          <Link
            to={createPageUrl('CompanyNews')}
            className={cn(
              "transition-colors",
              darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
            )}
          >
            Notícias
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "rounded-full",
              darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              className={darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600'}
              onClick={() => polysApi.auth.redirectToLogin(createPageUrl('Dashboard'))}
            >
              Entrar
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-6"
              onClick={() => polysApi.auth.redirectToLogin(createPageUrl('Dashboard'))}
            >
              Começar Agora
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={cn(
          "md:hidden border-t",
          darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100'
        )}>
          <div className="px-6 py-4 space-y-4">
            <Link
              to={createPageUrl('Landing')}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "block transition-colors",
                darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
              )}
            >
              Início
            </Link>
            <Link
              to={createPageUrl('About')}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "block transition-colors",
                darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
              )}
            >
              Sobre
            </Link>
            <Link
              to={createPageUrl('CompanyNews')}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "block transition-colors",
                darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
              )}
            >
              Notícias
            </Link>
            <div className="pt-4 border-t space-y-2" style={{ borderColor: darkMode ? '#1e293b' : '#e2e8f0' }}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600'
                )}
                onClick={() => {
                  polysApi.auth.redirectToLogin(createPageUrl('Dashboard'));
                  setMobileMenuOpen(false);
                }}
              >
                Entrar
              </Button>
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => {
                  polysApi.auth.redirectToLogin(createPageUrl('Dashboard'));
                  setMobileMenuOpen(false);
                }}
              >
                Começar Agora
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
