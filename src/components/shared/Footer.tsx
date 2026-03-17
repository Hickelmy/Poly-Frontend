import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Map, Mail, Phone, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FooterProps {
  darkMode?: boolean;
}

export default function Footer({ darkMode }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (darkMode !== undefined) {
      setIsDark(darkMode);
      return;
    }

    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const handleStorageChange = () => {
      checkDarkMode();
    };
    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(checkDarkMode, 100);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [darkMode]);

  return (
    <footer className={cn(
      "w-full border-t",
      isDark
        ? "bg-slate-900 border-slate-800 text-white"
        : "bg-white border-slate-200 text-slate-900"
    )}>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <Map className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">POLYS</h1>
                <p className={cn(
                  "text-xs",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  Melhoria Comunitária
                </p>
              </div>
            </Link>
            <p className={cn(
              "text-sm mb-4 max-w-md",
              isDark ? "text-slate-400" : "text-slate-600"
            )}>
              Transformando comunidades através da colaboração e transparência.
              Conecte-se com seus vizinhos e faça a diferença na sua região.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDark
                    ? "text-slate-400 hover:text-teal-400 hover:bg-slate-800"
                    : "text-slate-600 hover:text-teal-600 hover:bg-slate-100"
                )}
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDark
                    ? "text-slate-400 hover:text-teal-400 hover:bg-slate-800"
                    : "text-slate-600 hover:text-teal-600 hover:bg-slate-100"
                )}
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDark
                    ? "text-slate-400 hover:text-teal-400 hover:bg-slate-800"
                    : "text-slate-600 hover:text-teal-600 hover:bg-slate-100"
                )}
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDark
                    ? "text-slate-400 hover:text-teal-400 hover:bg-slate-800"
                    : "text-slate-600 hover:text-teal-600 hover:bg-slate-100"
                )}
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className={cn(
              "font-semibold mb-4",
              isDark ? "text-white" : "text-slate-900"
            )}>
              Empresa
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to={createPageUrl('About')}
                  className={cn(
                    "text-sm transition-colors",
                    isDark
                      ? "text-slate-400 hover:text-teal-400"
                      : "text-slate-600 hover:text-teal-600"
                  )}
                >
                  Sobre a Empresa
                </Link>
              </li>
              <li>
                <Link
                  to={createPageUrl('CompanyNews')}
                  className={cn(
                    "text-sm transition-colors",
                    isDark
                      ? "text-slate-400 hover:text-teal-400"
                      : "text-slate-600 hover:text-teal-600"
                  )}
                >
                  Notícias da Empresa
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className={cn(
              "font-semibold mb-4",
              isDark ? "text-white" : "text-slate-900"
            )}>
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to={createPageUrl('PrivacyTerms')}
                  className={cn(
                    "text-sm transition-colors",
                    isDark
                      ? "text-slate-400 hover:text-teal-400"
                      : "text-slate-600 hover:text-teal-600"
                  )}
                >
                  Privacidade e Termos
                </Link>
              </li>
              <li>
                <Link
                  to={createPageUrl('Accessibility')}
                  className={cn(
                    "text-sm transition-colors",
                    isDark
                      ? "text-slate-400 hover:text-teal-400"
                      : "text-slate-600 hover:text-teal-600"
                  )}
                >
                  Acessibilidade
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className={cn(
              "font-semibold mb-4",
              isDark ? "text-white" : "text-slate-900"
            )}>
              Sustentabilidade
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to={createPageUrl('Sustainability')}
                  className={cn(
                    "text-sm transition-colors",
                    isDark
                      ? "text-slate-400 hover:text-teal-400"
                      : "text-slate-600 hover:text-teal-600"
                  )}
                >
                  Nossa Política
                </Link>
              </li>
            </ul>
            <div className={cn(
              "mt-6 pt-6 border-t",
              isDark ? "border-slate-800" : "border-slate-200"
            )}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className={cn(
                    "w-4 h-4",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )} />
                  <a
                    href="mailto:contato@polys.com.br"
                    className={cn(
                      "text-sm transition-colors",
                      isDark
                        ? "text-slate-400 hover:text-teal-400"
                        : "text-slate-600 hover:text-teal-600"
                    )}
                  >
                    contato@polys.com.br
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className={cn(
                    "w-4 h-4",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )} />
                  <a
                    href="tel:+5511999999999"
                    className={cn(
                      "text-sm transition-colors",
                      isDark
                        ? "text-slate-400 hover:text-teal-400"
                        : "text-slate-600 hover:text-teal-600"
                    )}
                  >
                    (11) 99999-9999
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn(
          "pt-8 border-t text-center text-sm",
          isDark
            ? "border-slate-800 text-slate-500"
            : "border-slate-200 text-slate-500"
        )}>
          <p>© {currentYear} POLYS. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
