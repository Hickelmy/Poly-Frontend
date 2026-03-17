import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { polysApi } from '@/api/polysClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Package, ShoppingCart, User, ChevronLeft, ChevronRight,
  ImageOff, Minus, Plus, Shield, Truck, Star, CheckCircle2, HeartHandshake
} from 'lucide-react';
import CheckoutModal from '@/components/modals/CheckoutModal';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

const conditionLabels = {
  novo: 'Novo',
  usado_otimo: 'Usado - Ótimo',
  usado_bom: 'Usado - Bom',
  usado_regular: 'Usado - Regular',
};

const PAYMENT_ICONS = {
  pix: { label: 'PIX', icon: '◈' },
  credit_card: { label: 'Crédito', icon: '💳' },
  debit_card: { label: 'Débito', icon: '💳' },
  cash: { label: 'Dinheiro', icon: '💵' },
  transfer: { label: 'Transferência', icon: '🏦' },
};

const DELIVERY_META = {
  moto: { label: 'Motoboy', icon: '🛵' },
  carro: { label: 'Carro', icon: '🚗' },
  van: { label: 'Van', icon: '🚐' },
  caminhao: { label: 'Caminhão', icon: '🚛' },
};

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function ProductDetail() {
  const [user, setUser] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [qty, setQty] = useState(1);

  const { addItem } = useCart();

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

  useEffect(() => {
    if (paymentStatusParam) {
      setPaymentStatus(paymentStatusParam);
      setCheckoutOpen(true);
      const newUrl = window.location.pathname + (productId ? `?id=${productId}` : '');
      window.history.replaceState({}, '', newUrl);
      if (paymentStatusParam === 'approved') {
        toast.success('Obrigado pela sua compra!', {
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

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, qty);
    toast.success('Adicionado ao carrinho!', {
      description: `${qty}x ${product.title}`,
    });
  };

  if (!productId) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300">ID do produto não informado.</p>
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
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300">
          {error?.message || 'Produto não encontrado.'}
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

  const discountedPrice = product.discountPercent
    ? product.price * (1 - product.discountPercent / 100)
    : null;

  const maxQty = product.quantityAvailable || 1;
  const inStock = product.quantityAvailable > 0 && product.active;

  const categoryLabel = {
    eletronicos: 'Eletrônicos',
    moveis: 'Móveis',
    vestuario: 'Vestuário',
    alimentos: 'Alimentos',
    artesanato: 'Artesanato',
    outros: 'Outros',
  }[product.category] || product.category;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link to={createPageUrl('Store')} className="hover:text-teal-600 transition">
          <ArrowLeft className="w-4 h-4 inline mr-1" />
          Categorias
        </Link>
        {categoryLabel && (
          <>
            <span>/</span>
            <span className="text-slate-400">{categoryLabel}</span>
          </>
        )}
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[200px]">{product.title}</span>
      </nav>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

        {/* Left: Image Carousel */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden p-4">
            <ProductImageCarousel
              images={product.images || []}
              productTitle={product.title}
              currentIndex={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
            />
          </div>
        </div>

        {/* Right: Product details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Seller name */}
          {product.sellerName && (
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Vendido por <span className="font-medium text-slate-700 dark:text-slate-300">{product.sellerName}</span>
            </p>
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            {product.title}
          </h1>

          {/* Star rating placeholder */}
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400 opacity-30" />
            ))}
            <span className="text-xs text-slate-400 ml-1">Sem avaliações ainda</span>
          </div>

          {/* Price block */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-1">
            {discountedPrice ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                    {fmtBRL(discountedPrice)}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold">
                    {product.discountPercent}% OFF
                  </span>
                </div>
                <p className="text-sm text-slate-400 line-through">{fmtBRL(product.price)}</p>
                <p className="text-xs text-slate-500">por {product.unitType || 'unidade'}</p>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                  {fmtBRL(product.price)}
                </span>
                <p className="text-xs text-slate-500">por {product.unitType || 'unidade'}</p>
              </>
            )}
          </div>

          {/* Short description */}
          {product.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {product.description.length > 150
                ? product.description.slice(0, 150) + '…'
                : product.description}
            </p>
          )}

          {/* Condition & category badges */}
          <div className="flex flex-wrap gap-2">
            {product.condition && (
              <Badge variant="secondary" className="text-xs">
                {conditionLabels[product.condition] || product.condition}
              </Badge>
            )}
            {product.category && (
              <Badge variant="outline" className="text-xs">{categoryLabel}</Badge>
            )}
          </div>

          {/* Stock */}
          <div className={cn(
            'flex items-center gap-2 text-sm font-medium',
            inStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
          )}>
            <Package className="w-4 h-4" />
            {inStock
              ? `${product.quantityAvailable} ${product.unitType || 'unidade'}(s) disponível`
              : 'Indisponível'}
          </div>

          {/* Delivery types */}
          {((product.deliveryTypes && product.deliveryTypes.length > 0) || product.sellerDelivery) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Entrega</p>
              <div className="flex flex-wrap gap-2">
                {(product.deliveryTypes || []).map(dt => {
                  const meta = DELIVERY_META[dt];
                  if (!meta) return null;
                  return (
                    <span key={dt} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                      <span>{meta.icon}</span>
                      {meta.label}
                    </span>
                  );
                })}
                {product.sellerDelivery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xs font-medium">
                    <span>🤝</span>
                    Entrega pessoal
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Payment methods */}
          {product.paymentMethods && product.paymentMethods.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Formas de Pagamento</p>
              <div className="flex flex-wrap gap-2">
                {product.paymentMethods.map(method => {
                  const meta = PAYMENT_ICONS[method];
                  if (!meta) return null;
                  return (
                    <span key={method} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                      <span>{meta.icon}</span>
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity selector */}
          {inStock && (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantidade:</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <Button
              variant="outline"
              className="w-full h-11 border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 font-semibold"
              onClick={handleAddToCart}
              disabled={!inStock}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Adicionar ao Carrinho
            </Button>
            <Button
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 font-semibold"
              onClick={handleBuy}
              disabled={!inStock}
            >
              Comprar Agora
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {[
              { icon: Truck, label: 'Entrega segura' },
              { icon: CheckCircle2, label: 'Produto verificado' },
              { icon: HeartHandshake, label: 'Suporte disponível' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center p-2">
                <Icon className="w-5 h-5 text-teal-500" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full description */}
      {product.description && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            Descrição completa
          </h2>
          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
            {product.description}
          </p>
        </div>
      )}

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

// Image Carousel component (kept from original with minor style tweaks)
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
      {/* Main image */}
      <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
        {hasNoImages ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <ImageOff className="w-16 h-16 mb-3" />
            <span className="text-base font-medium">Sem imagem</span>
          </div>
        ) : (
          <img
            src={displayImages[currentIndex]}
            alt={`${productTitle} - Imagem ${currentIndex + 1}`}
            className="w-full h-full object-contain transition-opacity duration-300"
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
          />
        )}

        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-lg hover:bg-white dark:hover:bg-slate-700 opacity-80 hover:opacity-100 active:scale-95 transition-all"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-5 h-5 text-slate-900 dark:text-white" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-lg hover:bg-white dark:hover:bg-slate-700 opacity-80 hover:opacity-100 active:scale-95 transition-all"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="w-5 h-5 text-slate-900 dark:text-white" />
            </button>
            <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
              {currentIndex + 1} / {displayImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultipleImages && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => onIndexChange(index)}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all hover:opacity-100 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',
                currentIndex === index
                  ? 'border-teal-500 dark:border-teal-400 opacity-100 scale-105'
                  : 'border-transparent opacity-60'
              )}
              aria-label={`Ver imagem ${index + 1}`}
            >
              <img
                src={image}
                alt={`${productTitle} - Miniatura ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
