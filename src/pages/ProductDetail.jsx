import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { polysApi } from '@/api/polysClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, ShoppingCart, User } from 'lucide-react';
import CheckoutModal from '@/components/modals/CheckoutModal';

const conditionLabels = {
  novo: 'Novo',
  usado_otimo: 'Usado - Ótimo',
  usado_bom: 'Usado - Bom',
  usado_regular: 'Usado - Regular',
};

export default function ProductDetail() {
  const [user, setUser] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await polysApi.auth.isAuthenticated();
        if (!isAuth) return;
        const userData = await polysApi.auth.me();
        setUser(userData);
      } catch {
        // ignore
      }
    };
    loadUser();
  }, []);

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const items = await polysApi.entities.Product.filter({ id: productId });
      return items[0];
    },
    enabled: !!productId,
  });

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  const handleBuy = () => {
    if (!user) {
      toast.error('Faça login para comprar');
      polysApi.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }
    if (!product || product.quantity_available <= 0) {
      toast.error('Produto indisponível');
      return;
    }
    setCheckoutOpen(true);
  };

  if (!productId) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300">
          ID do produto não informado.
        </p>
        <Link to={createPageUrl('Store')}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para a loja
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300">
          Erro ao carregar o produto: {error?.message || 'Produto não encontrado.'}
        </p>
        <Link to={createPageUrl('Store')}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para a loja
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('Store')}>
            <Button variant="ghost" size="sm" className="px-0 text-slate-500">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {product.title}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Imagem principal */}
        <Card className="lg:col-span-2 border-0 shadow-sm overflow-hidden">
          <div className="relative w-full aspect-square lg:aspect-[4/3] min-h-[400px] lg:min-h-[600px]">
            <img
              src={
                product.images?.[0] ||
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=900&fit=crop&q=90'
              }
              alt={product.title}
              className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
              loading="eager"
              fetchPriority="high"
              style={{ imageRendering: 'high-quality' }}
            />
          </div>
        </Card>

        {/* Painel lateral */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                {formatCurrency(product.price)}
              </p>
              <span className="text-xs text-slate-400">
                /{product.unit_type || 'unidade'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {product.condition && (
                <Badge variant="secondary">
                  {conditionLabels[product.condition] || product.condition}
                </Badge>
              )}
              {product.category && (
                <Badge variant="outline">{product.category}</Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Package className="w-4 h-4" />
              <span>{product.quantity_available} em estoque</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <User className="w-4 h-4" />
              <span>Vendido por {product.seller_name || 'Vendedor'}</span>
            </div>

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              size="lg"
              onClick={handleBuy}
              disabled={!product.active || product.quantity_available <= 0}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Comprar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Descrição do produto
          </h2>
          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {product.description || 'Sem descrição informada.'}
          </p>
        </CardContent>
      </Card>

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        product={product}
        user={user}
      />
    </div>
  );
}


