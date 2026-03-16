import React from 'react';
import { Users, Target, Heart, Shield, Zap } from 'lucide-react';
import SEO from '@/components/SEO';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PublicNavbar from "@/components/shared/PublicNavbar";

export default function About() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <SEO
        title="Sobre a Empresa"
        description="Conheça a Polys, nossa missão, valores e a equipe por trás da plataforma de marketplace colaborativo para comunidades."
        path="/About"
      />
      <PublicNavbar />
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Sobre a Empresa
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Conheça mais sobre o POLYS e nossa missão
            </p>
          </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Nossa História</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            O POLYS nasceu da necessidade de criar uma plataforma que conectasse comunidades 
            e facilitasse a colaboração entre vizinhos para melhorias locais. Fundada com a 
            missão de transformar a forma como as pessoas se organizam e tomam decisões em 
            suas comunidades, nossa empresa acredita no poder da união e da transparência.
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Através de tecnologia inovadora e processos transparentes, oferecemos uma 
            solução completa para gestão comunitária, permitindo que moradores votem em 
            projetos, financiem melhorias e participem de um marketplace local seguro.
          </p>
        </CardContent>
      </Card>

      {/* Missão, Visão e Valores */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-teal-600" />
            </div>
            <CardTitle>Missão</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Conectar comunidades e facilitar a colaboração entre vizinhos para criar 
              ambientes melhores e mais seguros através de tecnologia transparente e acessível.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-emerald-600" />
            </div>
            <CardTitle>Visão</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Ser a plataforma líder em gestão comunitária no Brasil, transformando a forma 
              como as pessoas se organizam e colaboram em suas comunidades.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-cyan-600" />
            </div>
            <CardTitle>Valores</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-slate-700 dark:text-slate-300 text-sm space-y-2">
              <li>• Transparência</li>
              <li>• Colaboração</li>
              <li>• Segurança</li>
              <li>• Inovação</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Nossa Equipe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Nossa Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Nossa equipe é composta por profissionais apaixonados por tecnologia e 
            comprometidos com a melhoria das comunidades. Trabalhamos diariamente para 
            desenvolver soluções que facilitem a vida dos moradores e promovam a 
            colaboração local.
          </p>
        </CardContent>
      </Card>

      {/* Compromisso */}
      <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            Nosso Compromisso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Estamos comprometidos em oferecer uma plataforma segura, transparente e 
            acessível. Todos os pagamentos são processados com segurança através de 
            escrow, garantindo que os fundos só sejam liberados quando as metas forem 
            atingidas. Acreditamos que a transparência é fundamental para construir 
            confiança e promover a colaboração comunitária.
          </p>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}

