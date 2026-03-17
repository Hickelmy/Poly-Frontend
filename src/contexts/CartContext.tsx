import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  discountPercent: number | null;
  image: string | null;
  sellerName: string | null;
  unitType: string;
  quantityAvailable: number;
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (product: any, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('polys_cart') || '[]');
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('polys_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: any, quantity: number = 1): void => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id
          ? { ...i, quantity: Math.min(i.quantity + quantity, product.quantityAvailable || 99) }
          : i
        );
      }
      return [...prev, {
        id: product.id,
        title: product.title,
        price: product.price,
        discountPercent: product.discountPercent ?? null,
        image: product.images?.[0] ?? null,
        sellerName: product.sellerName ?? null,
        unitType: product.unitType ?? 'unidade',
        quantityAvailable: product.quantityAvailable ?? 99,
        quantity,
      }];
    });
  };

  const removeItem = (productId: string): void => setItems(prev => prev.filter(i => i.id !== productId));

  const updateQuantity = (productId: string, quantity: number): void => {
    if (quantity <= 0) { removeItem(productId); return; }
    setItems(prev => prev.map(i => i.id === productId ? { ...i, quantity } : i));
  };

  const clearCart = (): void => setItems([]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => {
    const disc = i.discountPercent ? i.price * (1 - i.discountPercent / 100) : i.price;
    return s + disc * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
