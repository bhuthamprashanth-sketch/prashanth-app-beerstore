import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('beerstore_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('beerstore_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (beer, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.beerId === beer.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > beer.stock) {
          toast.error(`Only ${beer.stock} in stock!`);
          return prev;
        }
        toast.success(`${beer.name} quantity updated!`);
        return prev.map(i => i.beerId === beer.id ? { ...i, quantity: newQty } : i);
      }
      if (quantity > beer.stock) {
        toast.error(`Only ${beer.stock} in stock!`);
        return prev;
      }
      toast.success(`${beer.name} added to cart! 🍺`);
      return [...prev, {
        beerId: beer.id,
        name: beer.name,
        brand: beer.brand,
        price: beer.price,
        stock: beer.stock,
        color: beer.color,
        emoji: beer.emoji,
        quantity
      }];
    });
  };

  const removeItem = (beerId) => {
    setItems(prev => prev.filter(i => i.beerId !== beerId));
    toast.success('Item removed from cart');
  };

  const updateQuantity = (beerId, quantity) => {
    if (quantity <= 0) {
      removeItem(beerId);
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.beerId !== beerId) return i;
      if (quantity > i.stock) {
        toast.error(`Only ${i.stock} in stock!`);
        return i;
      }
      return { ...i, quantity };
    }));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('beerstore_cart');
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
