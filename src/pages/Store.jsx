import React, { useState, useEffect } from 'react';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { useQuery } from '@tanstack/react-query';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';
import { useProximityFilter } from '@/hooks/useProximityFilter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Grid3X3, List, ShoppingBag, Package,
  SlidersHorizontal, X, MapPin
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
import CreateProductModal from '../components/modals/CreateProductModal';
import FullScreenLoading from '../components/shared/FullScreenLoading';
import { ProductCardSkeleton } from '../components/shared/SkeletonLoader';

export default function Store() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [createProductModalOpen, setCreateProductModalOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);

  // Zone context (para condomínios privados)
  const { selectedZone } = useSelectedZone();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await polysApi.auth.isAuthenticated();
        if (!isAuth) return;
        const userData = await polysApi.auth.me();
        setUser(userData);
        
        // Se o usuário tem residence_lat/lng, usa essas coordenadas
        if (userData.residence_lat && userData.residence_lng) {
          setUserLocation({
            lat: userData.residence_lat,
            lng: userData.residence_lng
          });
        }
      } catch (e) {
        // Not logged in
      }
    };
    loadUser();
  }, []);

  // Obter localização atual do usuário (se não tiver residence configurado)
  useEffect(() => {
    if (userLocation) return; // Já tem localização

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Não foi possível obter localização:', error);
          // Continua sem localização - mostra todos os produtos
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, [userLocation]);

  // Fetch products - otimizado com staleTime
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => polysApi.entities.Product.list('-createdAt', 100),
    staleTime: 2 * 60 * 1000, // 2 minutos - produtos não mudam tão frequentemente
  });

  // Filter by proximity (ou zona para condomínios privados)
  const proximityFiltered = useProximityFilter(
    products,
    userLocation,
    radiusKm,
    'zoneId',
    'lat',
    'lng'
  );

  // Filter and sort products
  const filteredProducts = proximityFiltered
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
        default: return new Date(b.createdAt || b.created_date || 0) - new Date(a.createdAt || a.created_date || 0);
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
    if (product.quantityAvailable <= 0) {
      toast.error('Produto indisponível');
      return;
    }
    // Navega para a tela de detalhes do produto (fluxo de compra)
    window.location.href = `${createPageUrl('ProductDetail')}?id=${product.id}`;
  };

  const availableCount = products.filter(p => (p.quantityAvailable || p.quantity_available || 0) > 0 && p.active).length;

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
        
        <Button 
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => {
            if (!user) {
              toast.error('Faça login para vender produtos');
              return;
            }
            setCreateProductModalOpen(true);
          }}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          Vender Produto
        </Button>
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
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-teal-500" />
                          Raio de busca
                        </label>
                        <span className="text-sm font-semibold text-teal-600">{radiusKm} km</span>
                      </div>
                      <Slider
                        value={[radiusKm]}
                        onValueChange={([v]) => setRadiusKm(v)}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>1 km</span>
                        <span>50 km</span>
                      </div>
                    </div>

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
                        setRadiusKm(5);
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
          {(selectedZone || categoryFilter !== 'all' || conditionFilter !== 'all' || priceRange[1] < 10000 || radiusKm !== 5) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {selectedZone && (
                <Badge className="gap-1 bg-teal-600">
                  <MapPin className="w-3 h-3" />
                  Condomínio: {selectedZone.name}
                </Badge>
              )}
              {userLocation && !selectedZone && (
                <Badge className="gap-1 bg-blue-600">
                  <MapPin className="w-3 h-3" />
                  Raio: {radiusKm} km
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setRadiusKm(5)} />
                </Badge>
              )}
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
            <ProductCardSkeleton key={i} />
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
            <Button
              onClick={() => {
                if (!user) {
                  toast.error('Faça login para vender produtos');
                  return;
                }
                setCreateProductModalOpen(true);
              }}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Seja o primeiro a vender
            </Button>
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

      {/* Create Product Modal */}
      <CreateProductModal
        open={createProductModalOpen}
        onClose={() => setCreateProductModalOpen(false)}
        user={user}
        onSuccess={() => {
          // Query invalidation is handled inside the modal
        }}
      />

      {/* Full Screen Loading - apenas no carregamento inicial */}
      <FullScreenLoading isLoading={false} />
    </div>
  );
}