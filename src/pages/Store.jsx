import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Grid3X3, List, ShoppingBag, Package,
  SlidersHorizontal, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import ProductCard from '../components/products/ProductCard';

export default function Store() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
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
    loadUser();
  }, []);

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => polysApi.entities.Product.list('-created_date', 100),
  });

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesCondition = conditionFilter === 'all' || product.condition === conditionFilter;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      return matchesSearch && matchesCategory && matchesCondition && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return (a.price || 0) - (b.price || 0);
        case 'price_desc': return (b.price || 0) - (a.price || 0);
        case 'recent': 
        default: return new Date(b.created_date) - new Date(a.created_date);
      }
    });

  const categories = [
    { value: 'all', label: 'Todas Categorias' },
    { value: 'eletronicos', label: '📱 Eletrônicos' },
    { value: 'moveis', label: '🪑 Móveis' },
    { value: 'vestuario', label: '👕 Vestuário' },
    { value: 'alimentos', label: '🍎 Alimentos' },
    { value: 'servicos_domesticos', label: '🏠 Serviços Domésticos' },
    { value: 'artesanato', label: '🎨 Artesanato' },
    { value: 'outros', label: '📦 Outros' },
  ];

  const conditions = [
    { value: 'all', label: 'Qualquer Condição' },
    { value: 'novo', label: 'Novo' },
    { value: 'usado_otimo', label: 'Usado - Ótimo' },
    { value: 'usado_bom', label: 'Usado - Bom' },
    { value: 'usado_regular', label: 'Usado - Regular' },
  ];

  const handleAddToCart = (product) => {
    if (!user) {
      toast.error('Faça login para comprar');
      return;
    }
    if (product.quantity_available <= 0) {
      toast.error('Produto indisponível');
      return;
    }
    // Navega para a tela de detalhes do produto (fluxo de compra)
    window.location.href = `${createPageUrl('ProductDetail')}?id=${product.id}`;
  };

  const availableCount = products.filter(p => p.quantity_available > 0 && p.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Loja Local
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Compre e venda na sua vizinhança
          </p>
        </div>
        
        <Link to={createPageUrl('SellerDashboard')}>
          <Button className="bg-teal-600 hover:bg-teal-700">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Vender Produto
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30">
              <Package className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{products.length}</p>
              <p className="text-sm text-slate-500">Total de Produtos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
              <ShoppingBag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{availableCount}</p>
              <p className="text-sm text-slate-500">Disponíveis</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Condição" />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map(cond => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais Recentes</SelectItem>
                  <SelectItem value="price_asc">Menor Preço</SelectItem>
                  <SelectItem value="price_desc">Maior Preço</SelectItem>
                </SelectContent>
              </Select>

              {/* Advanced Filters Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filtros Avançados</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <label className="text-sm font-medium">Faixa de Preço</label>
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        max={10000}
                        step={50}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>R$ {priceRange[0]}</span>
                        <span>R$ {priceRange[1]}</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setPriceRange([0, 10000]);
                        setCategoryFilter('all');
                        setConditionFilter('all');
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex rounded-lg border">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(categoryFilter !== 'all' || conditionFilter !== 'all' || priceRange[1] < 10000) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {categoryFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find(c => c.value === categoryFilter)?.label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setCategoryFilter('all')} />
                </Badge>
              )}
              {conditionFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {conditions.find(c => c.value === conditionFilter)?.label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setConditionFilter('all')} />
                </Badge>
              )}
              {priceRange[1] < 10000 && (
                <Badge variant="secondary" className="gap-1">
                  Até R$ {priceRange[1]}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceRange([0, 10000])} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-slate-500 mb-4">
              Tente ajustar os filtros ou buscar por outros termos
            </p>
            <Link to={createPageUrl('SellerDashboard')}>
              <Button>
                <ShoppingBag className="w-4 h-4 mr-2" />
                Seja o primeiro a vender
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          className={viewMode === 'grid' 
            ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
          }
          layout
        >
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}