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
  ImageOff, Minus, Plus, Shield, Truck, Star, CheckCircle2, HeartHandshake,
  AlertTriangle, Ban, Sparkles, Megaphone, Ticket, Bike, Car, TruckIcon,
  Container, Store, HandshakeIcon, QrCode, CreditCard, Banknote, Building2
} from 'lucide-react';
import verificadoImg from '@/assets/verificado.png';
import aprovadoImg from '@/assets/aprovado.png';
import CheckoutModal from '@/components/modals/CheckoutModal';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

const conditionLabels: Record<string, string> = {
  novo: 'Novo',
  usado_otimo: 'Usado - Ótimo',
  usado_bom: 'Usado - Bom',
  usado_regular: 'Usado - Regular',
};

const PAYMENT_ICONS: Record<string, { label: string; icon: React.ReactNode }> = {
  pix: { label: 'PIX', icon: <QrCode className="w-3.5 h-3.5" /> },
  credit_card: { label: 'Crédito', icon: <CreditCard className="w-3.5 h-3.5" /> },
  debit_card: { label: 'Débito', icon: <CreditCard className="w-3.5 h-3.5" /> },
  cash: { label: 'Dinheiro', icon: <Banknote className="w-3.5 h-3.5" /> },
  transfer: { label: 'Transferência', icon: <Building2 className="w-3.5 h-3.5" /> },
};

const DELIVERY_META: Record<string, { label: string; icon: React.ReactNode; free?: boolean }> = {
  retirada: { label: 'Retirada no Local', icon: <Store className="w-3.5 h-3.5" />, free: true },
  entrega_propria: { label: 'Entrega pelo Vendedor', icon: <HandshakeIcon className="w-3.5 h-3.5" />, free: true },
  moto: { label: 'Motoboy', icon: <Bike className="w-3.5 h-3.5" /> },
  carro: { label: 'Carro', icon: <Car className="w-3.5 h-3.5" /> },
  van: { label: 'Van', icon: <TruckIcon className="w-3.5 h-3.5" /> },
  caminhao: { label: 'Caminhão', icon: <Container className="w-3.5 h-3.5" /> },
};

const fmtBRL = (v: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function ProductDetail() {
  const [user, setUser] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);

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
          {(error as any)?.message || 'Produto não encontrado.'}
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

  const mod = product._moderation;
  const modStatus = mod?.status ?? 'active';
  const isHighlighted = modStatus === 'highlighted';
  const isApproved = modStatus === 'approved';
  const isRestricted = modStatus === 'restricted';
  const isRemoved = modStatus === 'removed';

  const generalDiscount = product.discountPercent || 0;
  const couponDiscount = appliedCoupon?.discountPercent || 0;
  const effectiveDiscount = Math.max(generalDiscount, couponDiscount);
  const discountedPrice = effectiveDiscount > 0
    ? product.price * (1 - effectiveDiscount / 100)
    : null;

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const coupons = product.coupons || [];
    const found = coupons.find((c: any) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
    if (!found) {
      toast.error('Cupom inválido ou não encontrado');
      return;
    }
    setAppliedCoupon({ code: found.code, discountPercent: found.discountPercent });
    if (found.discountPercent <= generalDiscount) {
      toast.info(`Cupom aplicado, mas o desconto geral de ${generalDiscount}% já é maior.`);
    } else {
      toast.success(`Cupom ${found.code} aplicado! ${found.discountPercent}% de desconto`);
    }
  };

  const maxQty = product.quantityAvailable || 1;
  const inStock = product.quantityAvailable > 0 && product.active;

  const categoryLabel = ({
    eletronicos: 'Eletrônicos',
    moveis: 'Móveis',
    vestuario: 'Vestuário',
    alimentos: 'Alimentos',
    artesanato: 'Artesanato',
    outros: 'Outros',
  } as Record<string, string>)[product.category] || product.category;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
        <Link to={createPageUrl('Store')} className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Loja
        </Link>
        {categoryLabel && (
          <>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <Link
              to={`${createPageUrl('Store')}?category=${product.category}`}
              className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              {categoryLabel}
            </Link>
          </>
        )}
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px]">{product.title}</span>
      </nav>

      {/* Moderation banners */}
      {isHighlighted && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
          <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Produto em Destaque</p>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/70">Este produto foi destacado pela gestão da plataforma</p>
          </div>
        </div>
      )}
      {isApproved && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
          <img src={aprovadoImg} alt="Aprovado" className="w-10 h-10 shrink-0 object-contain" />
          <div>
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Aprovado pela Gestão</p>
            <p className="text-xs text-teal-600/70 dark:text-teal-400/70">
              Este produto foi verificado e aprovado pela equipe de gestão
              {mod?.approvedByEmail && <span> por {mod.approvedByEmail}</span>}
            </p>
          </div>
        </div>
      )}
      {isRestricted && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Produto Restrito</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Este produto possui restrições aplicadas pela moderação</p>
          </div>
        </div>
      )}
      {isRemoved && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <Ban className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Produto Removido</p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70">Este produto foi removido pela moderação da plataforma</p>
          </div>
        </div>
      )}

      {/* Manager notice */}
      {mod?.managerNotice && mod?.noticeVisible !== false && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <Megaphone className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{mod.managerNotice}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden p-4">
            <ProductImageCarousel
              images={product.images || []}
              productTitle={product.title}
              currentIndex={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
            />
          </div>

          {product.description && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                Descrição completa
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          {product.sellerName && (
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Vendido por <span className="font-medium text-slate-700 dark:text-slate-300">{product.sellerName}</span>
              {product._sellerVerified && (
                <img src={verificadoImg} alt="Vendedor verificado" title="Vendedor verificado" className="w-4 h-4 inline-block shrink-0 object-contain" />
              )}
            </p>
          )}

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            {product.title}
          </h1>

          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400 opacity-30" />
            ))}
            <span className="text-xs text-slate-400 ml-1">Sem avaliações ainda</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2">
            {discountedPrice ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                    {fmtBRL(discountedPrice)}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold">
                    {effectiveDiscount}% OFF
                  </span>
                </div>
                <p className="text-sm text-slate-400 line-through">{fmtBRL(product.price)}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>por {product.unitType || 'unidade'}</span>
                  {appliedCoupon && couponDiscount > generalDiscount && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">cupom {appliedCoupon.code}</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                  {fmtBRL(product.price)}
                </span>
                <p className="text-xs text-slate-500">por {product.unitType || 'unidade'}</p>
              </>
            )}

            {/* Coupon input */}
            {product.coupons && product.coupons.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">{appliedCoupon.code}</span>
                      <span className="text-xs text-emerald-600">-{appliedCoupon.discountPercent}%</span>
                      {appliedCoupon.discountPercent <= generalDiscount && (
                        <span className="text-[10px] text-amber-500">(desconto geral já é maior)</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Ticket className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        placeholder="Código do cupom"
                        className="w-full h-9 pl-8 pr-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        maxLength={20}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs shrink-0"
                      onClick={handleApplyCoupon}
                      disabled={!couponCode.trim()}
                    >
                      Aplicar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {product.description.length > 150
                ? product.description.slice(0, 150) + '…'
                : product.description}
            </p>
          )}

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

          <div className={cn(
            'flex items-center gap-2 text-sm font-medium',
            inStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
          )}>
            <Package className="w-4 h-4" />
            {inStock
              ? `${product.quantityAvailable} ${product.unitType || 'unidade'}(s) disponível`
              : 'Indisponível'}
          </div>

          {product.deliveryTypes && product.deliveryTypes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Entrega</p>
              <div className="flex flex-wrap gap-2">
                {(product.deliveryTypes || []).map((dt: string) => {
                  const meta = DELIVERY_META[dt];
                  if (!meta) return null;
                  return (
                    <span key={dt} className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                      meta.free
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    )}>
                      {meta.icon}
                      {meta.label}
                      {meta.free && <span className="text-[10px] font-bold text-emerald-500">Grátis</span>}
                    </span>
                  );
                })}
                {product.shippingPaidBy === 'seller' && product.deliveryTypes.some((t: string) => !['retirada', 'entrega_propria'].includes(t)) && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium self-center">Frete incluso</span>
                )}
              </div>
            </div>
          )}

          {product.paymentMethods && product.paymentMethods.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Formas de Pagamento</p>
              <div className="flex flex-wrap gap-2">
                {product.paymentMethods.map((method: string) => {
                  const meta = PAYMENT_ICONS[method];
                  if (!meta) return null;
                  return (
                    <span key={method} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                      {meta.icon}
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

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

function ProductImageCarousel({ images, productTitle, currentIndex, onIndexChange }: {
  images: string[];
  productTitle: string;
  currentIndex: number;
  onIndexChange: (index: any) => void;
}) {
  const displayImages = images.length > 0 ? images : [];
  const hasMultipleImages = displayImages.length > 1;
  const hasNoImages = displayImages.length === 0;

  const goToPrevious = () => {
    onIndexChange((prev: number) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    onIndexChange((prev: number) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (!hasMultipleImages) return;
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndexChange((prev: number) => (prev === 0 ? displayImages.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onIndexChange((prev: number) => (prev === displayImages.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasMultipleImages, displayImages.length, onIndexChange]);

  return (
    <div className="relative w-full group">
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
