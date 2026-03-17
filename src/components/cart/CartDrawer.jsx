import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import CartCheckoutModal from './CartCheckoutModal';

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function CartDrawer({ open, onClose, user }) {
  const { items, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <>
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-teal-600" />
            Carrinho ({totalItems} {totalItems === 1 ? 'item' : 'itens'})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <ShoppingCart className="w-12 h-12 opacity-30" />
            <p className="text-sm">Carrinho vazio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
              {items.map(item => {
                const discounted = item.discountPercent ? item.price * (1 - item.discountPercent / 100) : item.price;
                return (
                  <div key={item.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-teal-600">{fmtBRL(discounted)}</span>
                        {item.discountPercent && (
                          <span className="text-xs text-slate-400 line-through">{fmtBRL(item.price)}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                          <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t px-5 py-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-lg font-bold text-teal-600">{fmtBRL(totalPrice)}</span>
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700 h-11"
                onClick={() => { onClose(); setCheckoutOpen(true); }}>
                Finalizar Compra
              </Button>
              <button onClick={clearCart} className="flex items-center justify-center w-full gap-1.5 text-red-400 hover:text-red-600 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>

    <CartCheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} user={user} />
    </>
  );
}
