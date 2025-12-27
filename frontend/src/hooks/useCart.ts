import { useState, useCallback } from 'react';
import TimerCartService, { type TimerCartItem } from '../services/timerCartService';
import toast from 'react-hot-toast';

export interface CartItem {
  _id: string;
  nom: string;
  description?: string;
  price: number;
  quantity: number;
  type?: 'item' | 'timer';
  icon?: string;
  margeBrute?: number;
  coutRevient?: number;
  // Propriétés spécifiques aux timers
  dureeMinutes?: number;
  tarifParMinute?: number;
  vehiculePlaque?: string;
  vehiculeInfo?: any;
  partenariat?: string;
  sessionId?: string;
}

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Ajouter un item normal au panier
  const addItem = useCallback((item: any) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem._id === item._id && cartItem.type !== 'timer');
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem._id === item._id && cartItem.type !== 'timer'
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { 
        ...item, 
        quantity: 1, 
        price: item.prixVente || item.price,
        type: 'item'
      }];
    });
  }, []);

  // Ajouter un item timer au panier
  const addTimerItem = useCallback((timerData: any) => {
    const validation = TimerCartService.validateTimerItem(timerData);
    if (!validation.valid) {
      toast.error(validation.error || 'Item timer invalide');
      return false;
    }

    const timerItem = TimerCartService.convertTimerToCartItem(timerData);
    
    setCart(prev => TimerCartService.addTimerToCart(prev, timerItem));
    
    toast.success(`Timer ajouté au panier: ${TimerCartService.formatTimerForDisplay(timerItem)}`);
    return true;
  }, []);

  // Retirer un item du panier
  const removeItem = useCallback((itemId: string, isTimer: boolean = false) => {
    setCart(prev => {
      if (isTimer) {
        return TimerCartService.removeTimerFromCart(prev, itemId);
      } else {
        const existingItem = prev.find(item => item._id === itemId && item.type !== 'timer');
        if (existingItem && existingItem.quantity > 1) {
          return prev.map(item =>
            item._id === itemId && item.type !== 'timer'
              ? { ...item, quantity: item.quantity - 1 }
              : item
          );
        }
        return prev.filter(item => !(item._id === itemId && item.type !== 'timer'));
      }
    });
  }, []);

  // Supprimer complètement un item du panier
  const deleteItem = useCallback((itemId: string, isTimer: boolean = false) => {
    setCart(prev => {
      if (isTimer) {
        return TimerCartService.removeTimerFromCart(prev, itemId);
      } else {
        return prev.filter(item => !(item._id === itemId && item.type !== 'timer'));
      }
    });
  }, []);

  // Vider le panier
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Calculer le total du panier
  const getTotalPrice = useCallback(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  // Calculer la commission totale
  const getTotalCommission = useCallback(() => {
    return cart.reduce((total, item) => {
      const margeBrute = item.margeBrute || 0;
      return total + (margeBrute * item.quantity);
    }, 0);
  }, [cart]);

  // Calculer le prix d'usine total
  const getTotalFactoryPrice = useCallback(() => {
    return cart.reduce((total, item) => {
      const coutRevient = item.coutRevient || 0;
      return total + (coutRevient * item.quantity);
    }, 0);
  }, [cart]);

  // Obtenir les items timer du panier
  const getTimerItems = useCallback(() => {
    return TimerCartService.getTimerItemsFromCart(cart);
  }, [cart]);

  // Obtenir le total des timers
  const getTimerTotal = useCallback(() => {
    return TimerCartService.getTimerTotal(cart);
  }, [cart]);

  // Préparer les données pour l'API de vente
  const prepareForSale = useCallback(() => {
    return cart.map(item => {
      if (item.type === 'timer') {
        return TimerCartService.prepareTimerForSale(item as TimerCartItem);
      } else {
        return {
          _id: item._id,
          nom: item.nom,
          quantite: item.quantity,
          prixUnitaire: item.price,
          prixUsine: item.coutRevient || 0,
          commission: item.margeBrute || 0,
          total: item.price * item.quantity,
          categorie: item.type || 'Non définie',
          partenaire: item.partenariat || 'Aucun partenaire'
        };
      }
    });
  }, [cart]);

  return {
    cart,
    setCart,
    addItem,
    addTimerItem,
    removeItem,
    deleteItem,
    clearCart,
    getTotalPrice,
    getTotalCommission,
    getTotalFactoryPrice,
    getTimerItems,
    getTimerTotal,
    prepareForSale
  };
};

export default useCart;
