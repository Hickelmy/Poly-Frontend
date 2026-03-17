import React from 'react';
import { Accessibility as AccessibilityIcon, Eye, MousePointer, Volume2, Keyboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PublicNavbar from "@/components/shared/PublicNavbar";

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AccessibilityIcon className="w-8 h-8" />
              Acessibilidade
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Nosso compromisso com a inclusão e acessibilidade digital
            </p>
          </div>

      <Card>
        <CardHeader>
          <CardTitle>Nossa Política de Acessibilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            O POLYS está comprometido em tornar nossa plataforma acessível para todas as
            pessoas, independentemente de suas habilidades ou deficiências. Acreditamos que
            a tecnologia deve ser inclusiva e utilizável por todos.
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center mb-4">
              <Keyboard className="w-6 h-6 text-teal-600" />
            </div>
            <CardTitle>Navegação por Teclado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Toda a plataforma pode ser navegada usando apenas o teclado. Use Tab para
              navegar entre elementos, Enter para ativar botões e links, e Esc para fechar
              modais e menus.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-emerald-600" />
            </div>
            <CardTitle>Contraste e Legibilidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Mantemos altos níveis de contraste entre texto e fundo, garantindo legibilidade
              para usuários com deficiência visual. Oferecemos também modo escuro para
              reduzir fadiga visual.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center mb-4">
              <MousePointer className="w-6 h-6 text-cyan-600" />
            </div>
            <CardTitle>Áreas de Toque Ampliadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Todos os elementos interativos têm tamanho mínimo adequado para facilitar o
              uso em dispositivos touch e para usuários com dificuldades motoras.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
              <Volume2 className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Textos Alternativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Todas as imagens e elementos visuais incluem textos alternativos descritivos,
              permitindo que leitores de tela transmitam o conteúdo aos usuários.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Padrões e Diretrizes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700 dark:text-slate-300">
            Nossa plataforma segue as diretrizes de acessibilidade web:
          </p>
          <ul className="space-y-2 text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-teal-600 font-bold">•</span>
              <span>
                <strong>WCAG 2.1 Nível AA:</strong> Seguimos as diretrizes do World Wide Web
                Consortium para garantir acessibilidade web.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 font-bold">•</span>
              <span>
                <strong>Lei Brasileira de Inclusão (LBI):</strong> Cumprimos os requisitos
                da Lei nº 13.146/2015 sobre acessibilidade digital.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 font-bold">•</span>
              <span>
                <strong>eMAG:</strong> Seguimos o Modelo de Acessibilidade em Governo Eletrônico.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhorias Contínuas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Estamos constantemente trabalhando para melhorar a acessibilidade da plataforma.
            Realizamos testes regulares com usuários e ferramentas automatizadas para
            identificar e corrigir barreiras de acessibilidade.
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            Se você encontrar alguma barreira de acessibilidade ou tiver sugestões de
            melhoria, entre em contato conosco.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tecnologias Assistivas Suportadas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Nossa plataforma é compatível com as principais tecnologias assistivas:
          </p>
          <ul className="space-y-2 text-slate-700 dark:text-slate-300">
            <li>• Leitores de tela (NVDA, JAWS, VoiceOver, TalkBack)</li>
            <li>• Navegação por teclado</li>
            <li>• Ampliadores de tela</li>
            <li>• Software de reconhecimento de voz</li>
            <li>• Dispositivos de entrada alternativos</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
        <CardHeader>
          <CardTitle>Relatar Problemas de Acessibilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Se você encontrar alguma barreira de acessibilidade em nossa plataforma,
            por favor, entre em contato conosco. Sua feedback é essencial para melhorarmos.
          </p>
          <div className="space-y-2">
            <p className="text-slate-700 dark:text-slate-300">
              <strong>E-mail:</strong>{' '}
              <a href="mailto:acessibilidade@polys.com.br" className="text-teal-600 hover:underline">
                acessibilidade@polys.com.br
              </a>
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong>Telefone:</strong>{' '}
              <a href="tel:+5511999999999" className="text-teal-600 hover:underline">
                (11) 99999-9999
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
