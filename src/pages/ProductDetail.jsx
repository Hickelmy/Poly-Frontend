import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { polysApi } from '@/api/polysClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, ShoppingCart, User, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import CheckoutModal from '@/components/modals/CheckoutModal';
import { cn } from '@/lib/utils';

const conditionLabels = {
  novo: 'Novo',
  usado_otimo: 'Usado - Ótimo',
  usado_bom: 'Usado - Bom',
  usado_regular: 'Usado - Regular',
};

export default function ProductDetail() {
  const [user, setUser] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const paymentStatusParam = urlParams.get('payment_status');

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

  // Verifica se há status de pagamento na URL e abre o checkout
  useEffect(() => {
    
    if (paymentStatusParam) {
      setPaymentStatus(paymentStatusParam);
      setCheckoutOpen(true);
      
      // Limpa a URL removendo os parâmetros de pagamento
      const newUrl = window.location.pathname + (productId ? `?id=${productId}` : '');
      window.history.replaceState({}, '', newUrl);
      
      // Mostra toast de agradecimento
      if (paymentStatusParam === 'approved') {
        toast.success('Obrigado pela sua compra! 🎉', {
          description: 'Seu pedido foi confirmado e será processado em breve.',
          duration: 5000,
        });
      }
    }
  }, [paymentStatusParam, productId]);

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
    if (!product || product.quantityAvailable <= 0) {
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
        {/* Carrossel de Imagens */}
        <Card className="lg:col-span-2 border-0 shadow-sm overflow-hidden">
          <ProductImageCarousel 
            images={product.images || []}
            productTitle={product.title}
            currentIndex={currentImageIndex}
            onIndexChange={setCurrentImageIndex}
          />
        </Card>

        {/* Painel lateral */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                {formatCurrency(product.price)}
              </p>
              <span className="text-xs text-slate-400">
                /{product.unitType || 'unidade'}
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
              <span>{product.quantityAvailable} em estoque</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <User className="w-4 h-4" />
              <span>Vendido por {product.sellerName || 'Vendedor'}</span>
            </div>

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              size="lg"
              onClick={handleBuy}
              disabled={!product.active || product.quantityAvailable <= 0}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Comprar
            </Button>
          </CardContent>
        </Card>

        {/* Descrição alinhada com a largura do carrossel */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Descrição do produto
            </h2>
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {product.description || 'Sem descrição informada.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          setPaymentStatus(null);
        }}
        product={product}
        user={user}
        paymentStatus={paymentStatus}
      />
    </div>
  );
}

// Componente de Carrossel de Imagens
function ProductImageCarousel({ images, productTitle, currentIndex, onIndexChange }) {
  const displayImages = images.length > 0 ? images : [];
  const hasMultipleImages = displayImages.length > 1;
  const hasNoImages = displayImages.length === 0;

  const goToPrevious = () => {
    onIndexChange((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    onIndexChange((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index) => {
    onIndexChange(index);
  };

  // Navegação por teclado
  useEffect(() => {
    if (!hasMultipleImages) return;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndexChange((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onIndexChange((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasMultipleImages, displayImages.length, onIndexChange]);

  return (
    <div className="relative w-full group">
      {/* Imagem Principal */}
      <div className="relative w-full max-w-xl mx-auto aspect-[4/3] sm:aspect-[3/2] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
        {hasNoImages ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <ImageOff className="w-16 h-16 mb-3" />
            <span className="text-base font-medium">No image</span>
          </div>
        ) : (
          <img
            src={displayImages[currentIndex]}
            alt={`${productTitle} - Imagem ${currentIndex + 1}`}
            className="w-full h-full max-h-[360px] sm:max-h-[420px] lg:max-h-[480px] object-contain transition-opacity duration-300"
            loading={currentIndex === 0 ? "eager" : "lazy"}
            fetchpriority={currentIndex === 0 ? "high" : "low"}
          />
        )}

        {/* Botões de Navegação Lateral */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className={cn(
                "absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10",
                "p-2 sm:p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90",
                "hover:bg-white dark:hover:bg-slate-700",
                "shadow-lg transition-all",
                "flex items-center justify-center",
                "opacity-80 hover:opacity-100 active:scale-95"
              )}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 dark:text-white" />
            </button>
            <button
              onClick={goToNext}
              className={cn(
                "absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10",
                "p-2 sm:p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90",
                "hover:bg-white dark:hover:bg-slate-700",
                "shadow-lg transition-all",
                "flex items-center justify-center",
                "opacity-80 hover:opacity-100 active:scale-95"
              )}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 dark:text-white" />
            </button>
          </>
        )}

        {/* Indicador de posição (topo direito) */}
        {hasMultipleImages && (
          <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
            {currentIndex + 1} / {displayImages.length}
          </div>
        )}
      </div>

      {/* Miniaturas na parte inferior */}
      {hasMultipleImages && (
        <div className="mt-3 relative">
          <style>{`
            .product-thumbnails::-webkit-scrollbar {
              height: 4px;
            }
            .product-thumbnails::-webkit-scrollbar-track {
              background: transparent;
            }
            .product-thumbnails::-webkit-scrollbar-thumb {
              background: rgba(148, 163, 184, 0.3);
              border-radius: 2px;
            }
            .product-thumbnails::-webkit-scrollbar-thumb:hover {
              background: rgba(148, 163, 184, 0.5);
            }
            @media (max-width: 640px) {
              .product-thumbnails::-webkit-scrollbar {
                display: none;
              }
            }
          `}</style>
          <div 
            className="product-thumbnails flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(148, 163, 184, 0.3) transparent',
            }}
          >
            {displayImages.map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden",
                  "border-2 transition-all",
                  "hover:opacity-100 hover:scale-105",
                  "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
                  currentIndex === index
                    ? "border-teal-500 dark:border-teal-400 opacity-100 scale-105"
                    : "border-transparent opacity-60"
                )}
                aria-label={`Ver imagem ${index + 1}`}
                aria-current={currentIndex === index ? "true" : "false"}
              >
                <img
                  src={image}
                  alt={`${productTitle} - Miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {currentIndex === index && (
                  <div className="absolute inset-0 bg-teal-500/20 ring-2 ring-teal-500/50" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


