import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, MapPin, Package, Eye, User, ImageOff, ShieldCheck, AlertTriangle, Sparkles, Megaphone, Ban, CheckCircle2, Truck, Store } from 'lucide-react';
import { cn } from "@/lib/utils";

const conditionLabels: Record<string, string> = {
  novo: "Novo",
  usado_otimo: "Usado - Ótimo",
  usado_bom: "Usado - Bom",
  usado_regular: "Usado - Regular"
};


import verificadoImg from '@/assets/verificado.png';
import aprovadoImg from '@/assets/aprovado.png';

function VerifiedBadge() {
  return (
    <img src={verificadoImg} alt="Vendedor verificado" title="Vendedor verificado" className="w-4 h-4 inline-block shrink-0 object-contain" />
  );
}

function ApprovalSealSmall() {
  return (
    <img src={aprovadoImg} alt="Aprovado pela gestão" title="Aprovado pela gestão" className="w-12 h-12 shrink-0 object-contain drop-shadow-md select-none" />
  );
}

interface ProductCardProps {
  product: any;
  onAddToCart?: (product: any) => void;
  isOwner?: boolean;
}

export default function ProductCard({ product, onAddToCart, isOwner }: ProductCardProps) {
  const isAvailable = product.quantityAvailable > 0 && product.active;
  const mod = product._moderation;
  const modStatus = mod?.status ?? 'active';
  const isRestricted = modStatus === 'restricted';
  const isRemoved = modStatus === 'removed';
  const isHighlighted = modStatus === 'highlighted';
  const isApproved = modStatus === 'approved';

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Restricted products: owner sees with warning, others shouldn't see (filtered by backend)
  // But if somehow visible, blur it
  const showBlurred = isRestricted && !isOwner;

  return (
    <Card className={cn(
      "overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900 relative flex flex-col",
      !isAvailable && "opacity-75",
      isHighlighted && "ring-2 ring-purple-400 dark:ring-purple-500 border-purple-300 dark:border-purple-600 shadow-purple-100 dark:shadow-purple-900/20",
      isApproved && "ring-1 ring-teal-300 dark:ring-teal-600 border-teal-200 dark:border-teal-700",
      isRestricted && "border-amber-300 dark:border-amber-700 opacity-80",
      isRemoved && "border-red-300 dark:border-red-700 opacity-50",
      !isHighlighted && !isApproved && !isRestricted && !isRemoved && "border-0",
    )}>
      <div className={cn(
        "relative aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-slate-700",
        showBlurred && "blur-sm"
      )}>
        {product.images?.[0] ? (
          <>
            <img
              src={product.images[0]}
              alt={product.title}
              className={cn(
                "w-full h-full object-cover transition-transform duration-500",
                isAvailable && !isRestricted ? "group-hover:scale-105" : "grayscale"
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <ImageOff className="w-12 h-12 mb-2" />
            <span className="text-sm font-medium">Sem imagem</span>
          </div>
        )}

        {!isAvailable && !isRestricted && !isRemoved && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <span className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg text-lg">
              INDISPONÍVEL
            </span>
          </div>
        )}

        {/* Restricted overlay */}
        {isRestricted && (
          <div className="absolute inset-0 bg-amber-900/70 flex flex-col items-center justify-center gap-2 z-10">
            <AlertTriangle className="w-8 h-8 text-amber-300" />
            <span className="px-3 py-1 bg-amber-500 text-white font-bold rounded-lg text-sm">
              RESTRITO
            </span>
          </div>
        )}

        {/* Removed overlay (only visible to owner) */}
        {isRemoved && (
          <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center gap-2 z-10">
            <Ban className="w-8 h-8 text-red-300" />
            <span className="px-3 py-1 bg-red-500 text-white font-bold rounded-lg text-sm">
              REMOVIDO
            </span>
          </div>
        )}

        {/* Highlighted badge */}
        {isHighlighted && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-purple-500 text-white shadow-lg gap-1">
              <Sparkles className="w-3 h-3" />Destaque
            </Badge>
          </div>
        )}

        {/* Approved seal */}
        {isApproved && (
          <div className="absolute top-2 right-2 z-10">
            <ApprovalSealSmall />
          </div>
        )}

        {product.condition && isAvailable && !isRestricted && !isRemoved && (
          <div className="absolute top-4 left-4">
            <Badge variant="secondary" className="bg-white/90 text-slate-700">
              {conditionLabels[product.condition]}
            </Badge>
          </div>
        )}

        {isAvailable && product.quantityAvailable <= 3 && !isRestricted && !isRemoved && (
          <div className={cn("absolute top-4 right-4", (isHighlighted || isApproved) && "top-12")}>
            <Badge className="bg-orange-500 text-white">
              Últimas {product.quantityAvailable}!
            </Badge>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-white text-sm">
            <User className="w-4 h-4" />
            <span>
              {product.sellerName || 'Vendedor'}
            </span>
            {product._sellerVerified && <VerifiedBadge />}
          </div>
        </div>
      </div>

      {/* Manager notice banner (only if noticeVisible) */}
      {mod?.managerNotice && (mod?.noticeVisible !== false) && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <Megaphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">{mod.managerNotice}</span>
        </div>
      )}

      <CardContent className="p-5 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
            {product.title}
          </h3>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
          {product.description}
        </p>

        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-3">
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            <span>{product.quantityAvailable} {product.unitType === 'kg' ? 'kg' : product.unitType === 'litro' ? 'L' : 'un'}</span>
          </div>
          {product.deliveryTypes?.length > 0 && (
            <div className="flex items-center gap-1.5">
              {product.deliveryTypes.some((t: string) => t !== 'retirada') && (
                <span className="flex items-center gap-0.5 text-xs text-teal-600 dark:text-teal-400">
                  <Truck className="w-3.5 h-3.5" />
                  {product.shippingPaidBy === 'seller' || product.deliveryTypes.includes('entrega_propria')
                    ? <span className="font-medium text-green-600 dark:text-green-400">Frete gratis</span>
                    : 'Entrega'}
                </span>
              )}
              {product.deliveryTypes.includes('retirada') && (
                <span className="flex items-center gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <Store className="w-3.5 h-3.5" /> Retirada
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
            {formatCurrency(product.price)}
          </p>
          <span className="text-xs text-slate-400">/{product.unitType || 'unidade'}</span>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0 flex gap-2">
        <Link
          to={`${createPageUrl('ProductDetail')}?id=${product.id}`}
          className="flex-1"
        >
          <Button
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Ver Detalhes
          </Button>
        </Link>

        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => onAddToCart && onAddToCart(product)}
          disabled={!isAvailable || isRestricted || isRemoved}
        >
          <ShoppingCart className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
