// Service pour intégrer les timers avec le panier existant

export interface TimerCartItem {
  _id: string;
  nom: string;
  description: string;
  price: number;
  quantity: number;
  type: 'timer';
  dureeMinutes: number;
  tarifParMinute: number;
  vehiculePlaque?: string;
  vehiculeInfo?: any;
  partenariat: string;
  sessionId: string;
  icon?: string;
  margeBrute?: number;
  coutRevient?: number;
}

export class TimerCartService {
  // Convertir un item timer en item de panier
  static convertTimerToCartItem(timerData: any): TimerCartItem {
    return {
      _id: timerData._id || timerData.sessionId,
      nom: timerData.nom,
      description: `${timerData.description || ''} (${timerData.dureeMinutes} min)`,
      price: timerData.price || timerData.coutCalcule,
      quantity: timerData.quantity || 1,
      type: 'timer',
      dureeMinutes: timerData.dureeMinutes,
      tarifParMinute: timerData.tarifParMinute,
      vehiculePlaque: timerData.vehiculePlaque,
      vehiculeInfo: timerData.vehiculeInfo,
      partenariat: timerData.partenariat || 'Aucun partenaire',
      sessionId: timerData.sessionId || timerData._id,
      icon: 'Timer',
      // Pour les timers, la marge brute est le coût total (pas de coût de revient)
      margeBrute: timerData.price || timerData.coutCalcule,
      coutRevient: 0 // Les timers n'ont pas de coût de revient
    };
  }

  // Ajouter un item timer au panier existant
  static addTimerToCart(currentCart: any[], timerItem: TimerCartItem): any[] {
    // Vérifier si l'item existe déjà (même session ID)
    const existingItemIndex = currentCart.findIndex(item => 
      item.type === 'timer' && item.sessionId === timerItem.sessionId
    );

    if (existingItemIndex !== -1) {
      // Mettre à jour l'item existant (augmenter la quantité)
      return currentCart.map((item, index) => 
        index === existingItemIndex 
          ? { ...item, quantity: item.quantity + timerItem.quantity }
          : item
      );
    } else {
      // Ajouter le nouvel item
      return [...currentCart, timerItem];
    }
  }

  // Supprimer un item timer du panier
  static removeTimerFromCart(currentCart: any[], sessionId: string): any[] {
    return currentCart.filter(item => 
      !(item.type === 'timer' && item.sessionId === sessionId)
    );
  }

  // Obtenir tous les items timer du panier
  static getTimerItemsFromCart(cart: any[]): TimerCartItem[] {
    return cart.filter(item => item.type === 'timer') as TimerCartItem[];
  }

  // Calculer le total des timers dans le panier
  static getTimerTotal(cart: any[]): number {
    return cart
      .filter(item => item.type === 'timer')
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // Formater l'affichage d'un item timer pour le panier
  static formatTimerForDisplay(item: TimerCartItem): string {
    const vehicleInfo = item.vehiculePlaque ? ` - ${item.vehiculePlaque}` : '';
    const duration = ` (${item.dureeMinutes} min)`;
    return `${item.nom}${vehicleInfo}${duration}`;
  }

  // Valider qu'un item timer peut être ajouté au panier
  static validateTimerItem(timerItem: any): { valid: boolean; error?: string } {
    if (!timerItem.nom || timerItem.nom.trim() === '') {
      return { valid: false, error: 'Le nom de la prestation timer est requis' };
    }

    if (!timerItem.dureeMinutes || timerItem.dureeMinutes <= 0) {
      return { valid: false, error: 'La durée doit être supérieure à 0' };
    }

    if (!timerItem.tarifParMinute || timerItem.tarifParMinute <= 0) {
      return { valid: false, error: 'Le tarif par minute doit être supérieur à 0' };
    }

    if (!timerItem.price || timerItem.price <= 0) {
      return { valid: false, error: 'Le prix calculé doit être supérieur à 0' };
    }

    return { valid: true };
  }

  // Préparer les données timer pour l'API de vente
  static prepareTimerForSale(timerItem: TimerCartItem): any {
    return {
      _id: timerItem.sessionId, // Utiliser l'ID de session comme référence
      nom: timerItem.nom,
      quantite: timerItem.quantity,
      prixUnitaire: timerItem.price,
      prixUsine: timerItem.coutRevient || 0,
      commission: timerItem.margeBrute || timerItem.price,
      total: timerItem.price * timerItem.quantity,
      categorie: 'Timer',
      partenaire: timerItem.partenariat,
      // Métadonnées spécifiques aux timers
      metadata: {
        type: 'timer',
        dureeMinutes: timerItem.dureeMinutes,
        tarifParMinute: timerItem.tarifParMinute,
        vehiculePlaque: timerItem.vehiculePlaque,
        vehiculeInfo: timerItem.vehiculeInfo,
        sessionId: timerItem.sessionId
      }
    };
  }
}

export default TimerCartService;
