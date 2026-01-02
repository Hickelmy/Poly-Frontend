import React from 'react';
import { Newspaper, Calendar, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PublicNavbar from "@/components/shared/PublicNavbar";

export default function CompanyNews() {
  // Exemplo de notícias - em produção, isso viria de uma API
  const news = [
    {
      id: 1,
      title: "POLYS atinge marca de 10.000 usuários ativos",
      date: "15 de Janeiro de 2025",
      category: "Crescimento",
      description: "Estamos orgulhosos em anunciar que nossa plataforma alcançou a marca de 10.000 usuários ativos, conectando comunidades em todo o Brasil.",
      image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=400&fit=crop"
    },
    {
      id: 2,
      title: "Nova funcionalidade: Marketplace Local",
      date: "10 de Janeiro de 2025",
      category: "Produto",
      description: "Lançamos o marketplace local, permitindo que moradores comprem e vendam produtos e serviços dentro de suas comunidades.",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop"
    },
    {
      id: 3,
      title: "Parceria com instituições de segurança",
      date: "5 de Janeiro de 2025",
      category: "Parcerias",
      description: "Firmamos parcerias estratégicas com instituições de segurança para melhorar a proteção das comunidades que utilizam nossa plataforma.",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=400&fit=crop"
    },
    {
      id: 4,
      title: "POLYS recebe investimento para expansão",
      date: "28 de Dezembro de 2024",
      category: "Negócios",
      description: "Anunciamos um novo investimento que permitirá expandir nossos serviços para mais cidades e melhorar a infraestrutura da plataforma.",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop"
    }
  ];

  const categories = ["Todos", "Crescimento", "Produto", "Parcerias", "Negócios"];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Newspaper className="w-8 h-8" />
              Notícias da Empresa
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Fique por dentro das últimas novidades do POLYS
            </p>
          </div>

      {/* Categories Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Badge 
            key={category}
            variant={category === "Todos" ? "default" : "outline"}
            className="cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/50"
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* News Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {news.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-48 overflow-hidden">
              <img 
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <Badge variant="secondary">{item.category}</Badge>
              </div>
            </div>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                <Calendar className="w-4 h-4" />
                {item.date}
              </div>
              <CardTitle className="line-clamp-2">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 text-sm line-clamp-3 mb-4">
                {item.description}
              </p>
              <Button variant="ghost" size="sm" className="w-full">
                Ler mais
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Newsletter Signup */}
      <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20">
        <CardHeader>
          <CardTitle>Receba nossas notícias</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Cadastre-se para receber as últimas notícias e atualizações do POLYS diretamente 
            no seu e-mail.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Seu e-mail"
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <Button className="bg-teal-600 hover:bg-teal-700">
              Inscrever-se
            </Button>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}

