import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Leaf, Recycle, TreePine, Droplets, Sun, Heart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PublicNavbar from "@/components/shared/PublicNavbar";

export default function Sustainability() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Leaf className="w-8 h-8 text-emerald-600" />
              Sustentabilidade
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Nosso compromisso com o meio ambiente e o futuro
            </p>
          </div>

      {/* Introduction */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-600" />
            Nossa Missão Sustentável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            No POLYS, acreditamos que tecnologia e sustentabilidade devem caminhar juntas.
            Estamos comprometidos em operar de forma responsável, minimizando nosso impacto
            ambiental e promovendo práticas sustentáveis em todas as nossas operações e
            na comunidade que servimos.
          </p>
        </CardContent>
      </Card>

      {/* Pillars */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
              <Recycle className="w-6 h-6 text-emerald-600" />
            </div>
            <CardTitle>Redução de Resíduos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Implementamos práticas para reduzir o desperdício em nossas operações,
              promovendo a reutilização e reciclagem sempre que possível.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center mb-4">
              <Sun className="w-6 h-6 text-teal-600" />
            </div>
            <CardTitle>Energia Limpa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Nossos servidores e infraestrutura utilizam energia de fontes renováveis,
              reduzindo nossa pegada de carbono.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center mb-4">
              <TreePine className="w-6 h-6 text-cyan-600" />
            </div>
            <CardTitle>Compensação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Investimos em projetos de reflorestamento e conservação para compensar
              nossa pegada ambiental.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle>Nossas Iniciativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              Eficiência Energética
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Otimizamos nossa infraestrutura de TI para reduzir o consumo de energia.
              Utilizamos servidores eficientes e implementamos práticas de virtualização
              para maximizar o uso de recursos.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Recycle className="w-5 h-5 text-emerald-600" />
              Economia Circular
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Promovemos a economia circular através de nossa plataforma, facilitando a
              reutilização de recursos e a redução de desperdício nas comunidades.
              Projetos comunitários frequentemente envolvem reciclagem e reutilização.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <TreePine className="w-5 h-5 text-green-600" />
              Projetos Verdes
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Incentivamos e priorizamos projetos comunitários focados em sustentabilidade,
              como instalação de painéis solares, sistemas de coleta de água da chuva,
              hortas comunitárias e melhorias em eficiência energética.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Community Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Impacto na Comunidade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Através de nossa plataforma, comunidades têm implementado projetos sustentáveis
            que geram impacto positivo:
          </p>
          <ul className="space-y-2 text-slate-700 dark:text-slate-300">
            <li>• Instalação de sistemas de energia solar comunitária</li>
            <li>• Projetos de reflorestamento e áreas verdes</li>
            <li>• Sistemas de coleta seletiva e reciclagem</li>
            <li>• Melhorias em eficiência hídrica e energética</li>
            <li>• Promoção de transporte sustentável</li>
          </ul>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Nossas Metas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-emerald-600 font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                  Carbono Neutro até 2026
                </h4>
                <p className="text-slate-700 dark:text-slate-300 text-sm">
                  Estabelecemos a meta de nos tornarmos carbono neutros através de redução
                  de emissões e compensação ambiental.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-teal-600 font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                  100% Energia Renovável
                </h4>
                <p className="text-slate-700 dark:text-slate-300 text-sm">
                  Migrar toda nossa infraestrutura para fontes de energia renovável até 2025.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-cyan-600 font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                  Redução de Resíduos
                </h4>
                <p className="text-slate-700 dark:text-slate-300 text-sm">
                  Reduzir em 50% o desperdício em nossas operações até 2026 através de
                  práticas de economia circular.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
        <CardHeader>
          <CardTitle className="text-white">Junte-se a Nós</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-emerald-50 mb-4">
            A sustentabilidade é uma jornada coletiva. Se você tem ideias para projetos
            sustentáveis em sua comunidade ou sugestões para melhorarmos nossas práticas,
            entre em contato conosco.
          </p>
          <div className="flex gap-2">
            <a href="mailto:sustentabilidade@polys.com.br">
              <Button variant="secondary" className="bg-white text-emerald-600 hover:bg-emerald-50">
                Enviar Sugestão
              </Button>
            </a>
            <Link to={createPageUrl('Projects')}>
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                Ver Projetos Verdes
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
