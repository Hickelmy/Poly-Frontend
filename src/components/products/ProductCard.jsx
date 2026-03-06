import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, MapPin, Package, Eye, User, ImageOff } from 'lucide-react';
import { cn } from "@/lib/utils";

const conditionLabels = {
  novo: "Novo",
  usado_otimo: "Usado - Ótimo",
  usado_bom: "Usado - Bom",
  usado_regular: "Usado - Regular"
};

export default function ProductCard({ product, onAddToCart }) {
  const isAvailable = product.quantityAvailable > 0 && product.active;
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <Card className={cn(
      "overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900",
      !isAvailable && "opacity-75"
    )}>
      <div className="relative h-48 overflow-hidden bg-slate-200 dark:bg-slate-700">
        {product.images?.[0] ? (
        <img 
            src={product.images[0]}
          alt={product.title}
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            isAvailable ? "group-hover:scale-105" : "grayscale"
          )}
        />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <ImageOff className="w-12 h-12 mb-2" />
            <span className="text-sm font-medium">No image</span>
          </div>
        )}
        
        {!isAvailable && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <span className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg text-lg">
              INDISPONÍVEL
            </span>
          </div>
        )}

        {/* Condition Badge */}
        {product.condition && isAvailable && (
          <div className="absolute top-4 left-4">
            <Badge variant="secondary" className="bg-white/90 text-slate-700">
              {conditionLabels[product.condition]}
            </Badge>
          </div>
        )}

        {/* Stock Badge */}
        {isAvailable && product.quantityAvailable <= 3 && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-orange-500 text-white">
              Últimas {product.quantityAvailable}!
            </Badge>
          </div>
        )}

        {/* Seller name */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-white text-sm">
            <User className="w-4 h-4" />
            <span>
              {product.sellerName || 'Vendedor'}
            </span>
          </div>
        </div>
      </div>

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
            {product.title}
          </h3>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
          {product.description}
        </p>

        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-3">
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            <span>{product.quantityAvailable} disponíveis</span>
          </div>
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
          disabled={!isAvailable}
        >
          <ShoppingCart className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}