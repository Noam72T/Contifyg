import toast from 'react-hot-toast';

/**
 * Système de déduplication des toasts pour éviter les messages en double
 */

interface ToastCache {
  message: string;
  timestamp: number;
}

class ToastDeduplicator {
  private recentToasts: Map<string, ToastCache> = new Map();
  private readonly DUPLICATE_THRESHOLD = 1000; // 1 seconde

  /**
   * Génère une clé unique pour le toast
   */
  private generateKey(message: string, type: string): string {
    return `${type}:${message}`;
  }

  /**
   * Vérifie si un toast similaire a été affiché récemment
   */
  private isDuplicate(message: string, type: string): boolean {
    const key = this.generateKey(message, type);
    const cached = this.recentToasts.get(key);
    
    if (!cached) {
      return false;
    }
    
    const now = Date.now();
    const timeSinceLastToast = now - cached.timestamp;
    
    // Si le même message a été affiché il y a moins de 1 seconde, c'est un doublon
    return timeSinceLastToast < this.DUPLICATE_THRESHOLD;
  }

  /**
   * Enregistre un toast dans le cache
   */
  private cacheToast(message: string, type: string): void {
    const key = this.generateKey(message, type);
    this.recentToasts.set(key, {
      message,
      timestamp: Date.now()
    });
    
    // Nettoyer après le seuil
    setTimeout(() => {
      this.recentToasts.delete(key);
    }, this.DUPLICATE_THRESHOLD);
  }

  /**
   * Affiche un toast success sans doublon
   */
  success(message: string, options?: any): string | undefined {
    if (this.isDuplicate(message, 'success')) {
      return undefined;
    }
    
    this.cacheToast(message, 'success');
    return toast.success(message, options);
  }

  /**
   * Affiche un toast error sans doublon
   */
  error(message: string, options?: any): string | undefined {
    if (this.isDuplicate(message, 'error')) {
      return undefined;
    }
    
    this.cacheToast(message, 'error');
    return toast.error(message, options);
  }

  /**
   * Affiche un toast info sans doublon
   */
  info(message: string, options?: any): string | undefined {
    if (this.isDuplicate(message, 'info')) {
      return undefined;
    }
    
    this.cacheToast(message, 'info');
    return toast(message, options);
  }

  /**
   * Affiche un toast loading sans doublon
   */
  loading(message: string, options?: any): string | undefined {
    if (this.isDuplicate(message, 'loading')) {
      return undefined;
    }
    
    this.cacheToast(message, 'loading');
    return toast.loading(message, options);
  }

  /**
   * Affiche un toast custom sans doublon
   */
  custom(message: string, options?: any): string | undefined {
    if (this.isDuplicate(message, 'custom')) {
      return undefined;
    }
    
    this.cacheToast(message, 'custom');
    return toast.custom(message, options);
  }

  /**
   * Promise toast sans doublon
   */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: any
  ): Promise<T> {
    // Vérifier si le loading est un doublon
    if (this.isDuplicate(messages.loading, 'loading')) {
      return promise;
    }
    
    this.cacheToast(messages.loading, 'loading');
    return toast.promise(promise, messages, options);
  }

  /**
   * Dismiss un toast spécifique
   */
  dismiss(toastId?: string): void {
    toast.dismiss(toastId);
  }

  /**
   * Nettoie tous les toasts
   */
  clear(): void {
    this.recentToasts.clear();
  }
}

// Export d'une instance unique
export const toastDeduplicator = new ToastDeduplicator();

// Export des fonctions pour usage direct
export const showToast = {
  success: (message: string, options?: any) => toastDeduplicator.success(message, options),
  error: (message: string, options?: any) => toastDeduplicator.error(message, options),
  info: (message: string, options?: any) => toastDeduplicator.info(message, options),
  loading: (message: string, options?: any) => toastDeduplicator.loading(message, options),
  custom: (message: string, options?: any) => toastDeduplicator.custom(message, options),
  promise: <T>(promise: Promise<T>, messages: any, options?: any) => 
    toastDeduplicator.promise(promise, messages, options),
  dismiss: (toastId?: string) => toastDeduplicator.dismiss(toastId)
};
