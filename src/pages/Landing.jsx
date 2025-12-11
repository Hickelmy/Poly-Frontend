import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { motion } from 'framer-motion';
import { 
  Map, Users, Shield, ArrowRight, Check, Star, 
  Building2, Camera, Wrench, Heart, ChevronRight,
  MapPin, Vote, Wallet, ShoppingBag, Zap, Lock,
  Sun, Moon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const [activeCase, setActiveCase] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    // Verifica preferência salva ou do sistema
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('landing-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Escuta mudanças na preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const saved = localStorage.getItem('landing-theme');
      if (!saved) {
        setDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Salva preferência no localStorage
  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('landing-theme', newMode ? 'dark' : 'light');
  };

  const features = [
    {
      icon: MapPin,
      title: "Cadastre-se",
      description: "Crie sua conta e marque sua residência no mapa da comunidade",
      step: "01"
    },
    {
      icon: Vote,
      title: "Vote e Apoie",
      description: "Participe das decisões e vote em melhorias para sua vizinhança",
      step: "02"
    },
    {
      icon: Wallet,
      title: "Contribua",
      description: "Doe para projetos ou venda produtos e serviços locais",
      step: "03"
    }
  ];

  const benefits = [
    { icon: Users, title: "Comunidade Unida", desc: "Conecte-se com vizinhos e tome decisões juntos" },
    { icon: Shield, title: "Segurança", desc: "Projetos de câmeras, iluminação e vigilância" },
    { icon: ShoppingBag, title: "Economia Local", desc: "Compre e venda na sua vizinhança" },
    { icon: Lock, title: "Transparência", desc: "Acompanhe cada centavo com escrow seguro" },
  ];

  const cases = [
    {
      title: "Instalação de Câmeras",
      description: "Moradores se uniram para instalar um sistema de monitoramento com 12 câmeras de segurança.",
      raised: "R$ 15.420",
      target: "R$ 18.000",
      progress: 85,
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"
    },
    {
      title: "Reforma da Praça",
      description: "Revitalização completa da praça central com novos bancos, iluminação e playground.",
      raised: "R$ 42.800",
      target: "R$ 50.000",
      progress: 86,
      image: "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=400&h=300&fit=crop"
    },
    {
      title: "Muro de Contenção",
      description: "Construção de muro de arrimo para prevenir deslizamentos na época de chuvas.",
      raised: "R$ 28.000",
      target: "R$ 28.000",
      progress: 100,
      image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop"
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-950' : 'bg-white'}`}>
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${
        darkMode 
          ? 'bg-slate-950/80 border-slate-800' 
          : 'bg-white/80 border-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <Map className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              POLYS
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className={`transition-colors ${
              darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
            }`}>Como Funciona</a>
            <a href="#beneficios" className={`transition-colors ${
              darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
            }`}>Benefícios</a>
            <a href="#casos" className={`transition-colors ${
              darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
            }`}>Casos de Uso</a>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              className={`rounded-full ${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
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
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className={`absolute inset-0 transition-colors duration-300 ${
          darkMode 
            ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
            : 'bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50'
        }`} />
        <div className={`absolute top-20 right-0 w-96 h-96 rounded-full blur-3xl ${
          darkMode ? 'bg-teal-900/30' : 'bg-teal-200/30'
        }`} />
        <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${
          darkMode ? 'bg-emerald-900/30' : 'bg-emerald-200/30'
        }`} />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
                darkMode ? 'bg-teal-900/50 text-teal-400' : 'bg-teal-100 text-teal-700'
              }`}>
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Plataforma de Comunidade Local</span>
              </div>
              
              <h1 className={`text-5xl lg:text-6xl font-bold leading-tight mb-6 ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Transforme sua
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">
                  vizinhança
                </span>
              </h1>
              
              <p className={`text-xl mb-8 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Una-se aos seus vizinhos, vote em melhorias comunitárias, 
                financie projetos e participe do marketplace local.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-8 h-14 text-lg"
                  onClick={() => polysApi.auth.redirectToLogin(createPageUrl('Dashboard'))}
                >
                  Entrar na Comunidade
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <a href="#como-funciona">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className={`rounded-full px-8 h-14 text-lg border-2 ${
                      darkMode 
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Saiba Como Funciona
                  </Button>
                </a>
              </div>

              <div className="flex items-center gap-8 mt-12">
                <div>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>2.5K+</p>
                  <p className={darkMode ? 'text-slate-500' : 'text-slate-500'}>Moradores Ativos</p>
                </div>
                <div className={`w-px h-12 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                <div>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>R$ 850K</p>
                  <p className={darkMode ? 'text-slate-500' : 'text-slate-500'}>Já Arrecadados</p>
                </div>
                <div className={`w-px h-12 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                <div>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>47</p>
                  <p className={darkMode ? 'text-slate-500' : 'text-slate-500'}>Projetos Concluídos</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop"
                  alt="Mapa 3D da comunidade"
                  className="w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-3 text-white">
                    <MapPin className="w-5 h-5" />
                    <span className="font-medium">Mapa interativo 2D/3D</span>
                  </div>
                </div>
              </div>
              
              {/* Floating Cards */}
              <motion.div 
                className={`absolute -left-8 top-20 rounded-2xl shadow-xl p-4 max-w-[200px] ${
                  darkMode ? 'bg-slate-800' : 'bg-white'
                }`}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Projeto Aprovado!</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Câmeras de Segurança</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className={`absolute -right-4 bottom-32 rounded-2xl shadow-xl p-4 ${
                  darkMode ? 'bg-slate-800' : 'bg-white'
                }`}
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-teal-900/50' : 'bg-teal-100'
                  }`}>
                    <Heart className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>+R$ 1.250</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nova doação recebida</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className={`py-24 px-6 transition-colors duration-300 ${
        darkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Como Funciona
            </h2>
            <p className={`text-xl max-w-2xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Três passos simples para transformar sua comunidade
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow ${
                  darkMode 
                    ? 'bg-gradient-to-br from-slate-800 to-slate-850' 
                    : 'bg-gradient-to-br from-slate-50 to-white'
                }`}>
                  <CardContent className="p-8">
                    <span className={`absolute top-4 right-4 text-6xl font-bold ${
                      darkMode ? 'text-slate-700' : 'text-slate-100'
                    }`}>
                      {feature.step}
                    </span>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                      darkMode ? 'bg-teal-900/50' : 'bg-teal-100'
                    }`}>
                      <feature.icon className="w-7 h-7 text-teal-600" />
                    </div>
                    <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {feature.title}
                    </h3>
                    <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="beneficios" className={`py-24 px-6 transition-colors duration-300 ${
        darkMode ? 'bg-slate-950' : 'bg-slate-50'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className={`text-4xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Por que usar o POLYS?
              </h2>
              <p className={`text-xl mb-12 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Uma plataforma completa para gestão comunitária, 
                com transparência total e segurança em todas as transações.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      darkMode ? 'bg-teal-900/50' : 'bg-teal-100'
                    }`}>
                      <benefit.icon className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h4 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {benefit.title}
                      </h4>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {benefit.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <img 
                src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600&h=500&fit=crop"
                alt="Comunidade unida"
                className="rounded-3xl shadow-2xl"
              />
              <div className={`absolute -bottom-6 -left-6 rounded-2xl shadow-xl p-6 ${
                darkMode ? 'bg-slate-800' : 'bg-white'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 border-2 border-white dark:border-slate-800" />
                    ))}
                  </div>
                  <div>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>+2.500 vizinhos</p>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>já estão conectados</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="casos" className={`py-24 px-6 transition-colors duration-300 ${
        darkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Casos de Sucesso
            </h2>
            <p className={`text-xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Veja projetos que já foram financiados pela comunidade
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {cases.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all group ${
                  darkMode ? 'bg-slate-800' : 'bg-white'
                }`}>
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {item.progress === 100 && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Concluído
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {item.title}
                    </h3>
                    <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={darkMode ? 'text-slate-500' : 'text-slate-500'}>Arrecadado</span>
                        <span className="font-semibold text-teal-500">{item.raised}</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${
                        darkMode ? 'bg-slate-700' : 'bg-slate-100'
                      }`}>
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <p className={`text-xs text-right ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        Meta: {item.target}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className={`py-24 px-6 text-white ${
        darkMode 
          ? 'bg-gradient-to-br from-slate-950 to-slate-900' 
          : 'bg-gradient-to-br from-slate-900 to-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Segurança e Transparência
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                Seus pagamentos ficam em escrow até a meta ser atingida. 
                Se o projeto não for financiado, você recebe o reembolso automático.
              </p>
              
              <ul className="space-y-4">
                {[
                  "Pagamentos via PIX, Cartão ou Boleto",
                  "Escrow seguro até meta ser alcançada",
                  "Reembolso automático se meta não atingida",
                  "Auditoria completa de todas as transações",
                  "Comissão transparente de 10%"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-slate-200">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className={`backdrop-blur-lg rounded-3xl p-8 border ${
                darkMode 
                  ? 'bg-slate-800/50 border-slate-700' 
                  : 'bg-white/10 border-white/20'
              }`}>
                <div className="flex items-center gap-4 mb-6">
                  <Shield className="w-12 h-12 text-teal-400" />
                  <div>
                    <h3 className="text-xl font-bold">Escrow Protegido</h3>
                    <p className="text-slate-400">Seus fundos estão seguros</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-700/50' : 'bg-white/5'}`}>
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-400">Projeto Câmeras</span>
                      <span className="text-teal-400">85%</span>
                    </div>
                    <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-white/10'}`}>
                      <div className="h-full w-[85%] bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" />
                    </div>
                  </div>
                  <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-700/50' : 'bg-white/5'}`}>
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-400">Reforma Praça</span>
                      <span className="text-teal-400">100%</span>
                    </div>
                    <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-white/10'}`}>
                      <div className="h-full w-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-teal-500 to-emerald-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para transformar sua comunidade?
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Junte-se a milhares de vizinhos que já estão fazendo a diferença
          </p>
          <Button 
            size="lg" 
            className="bg-white text-teal-600 hover:bg-teal-50 rounded-full px-10 h-14 text-lg font-semibold"
            onClick={() => polysApi.auth.redirectToLogin(createPageUrl('Dashboard'))}
          >
            Começar Gratuitamente
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-16 px-6 text-white ${
        darkMode ? 'bg-slate-950' : 'bg-slate-900'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <Map className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">POLYS</span>
              </div>
              <p className="text-slate-400">
                Transformando comunidades através da colaboração e transparência.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Plataforma</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-teal-400 transition-colors">Como Funciona</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-teal-400 transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">Status</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-teal-400 transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className={`pt-8 border-t text-center ${
            darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-800 text-slate-500'
          }`}>
            <p>© 2025 POLYS. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
