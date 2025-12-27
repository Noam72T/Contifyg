const NodeCache = require('node-cache');

// Cache avec TTL de 5 minutes par défaut
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Vérification toutes les minutes
  useClones: false // Performance - pas de clonage
});

class CacheService {
  /**
   * Obtenir une valeur du cache
   * @param {string} key - Clé du cache
   * @returns {any|null} - Valeur ou null si pas trouvée
   */
  get(key) {
    return cache.get(key) || null;
  }

  /**
   * Définir une valeur dans le cache
   * @param {string} key - Clé du cache
   * @param {any} value - Valeur à stocker
   * @param {number} ttl - Temps de vie en secondes (optionnel)
   */
  set(key, value, ttl = null) {
    if (ttl) {
      cache.set(key, value, ttl);
    } else {
      cache.set(key, value);
    }
  }

  /**
   * Supprimer une clé du cache
   * @param {string} key - Clé à supprimer
   */
  del(key) {
    cache.del(key);
  }

  /**
   * Supprimer plusieurs clés avec un pattern
   * @param {string} pattern - Pattern à matcher
   */
  delPattern(pattern) {
    const keys = cache.keys();
    const keysToDelete = keys.filter(key => key.includes(pattern));
    cache.del(keysToDelete);
  }

  /**
   * Vider tout le cache
   */
  flush() {
    cache.flushAll();
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats() {
    return cache.getStats();
  }

  /**
   * Cache avec fonction de récupération
   * @param {string} key - Clé du cache
   * @param {Function} fetchFunction - Fonction pour récupérer les données si pas en cache
   * @param {number} ttl - Temps de vie en secondes
   */
  async getOrSet(key, fetchFunction, ttl = null) {
    let value = this.get(key);
    
    if (value === null) {
      try {
        value = await fetchFunction();
        this.set(key, value, ttl);
      } catch (error) {
        console.error(`Erreur lors de la récupération des données pour la clé ${key}:`, error);
        return null;
      }
    }
    
    return value;
  }

  /**
   * Générer une clé de cache pour les utilisateurs d'une entreprise
   * @param {string} companyId - ID de l'entreprise
   * @param {number} page - Numéro de page
   * @param {number} limit - Limite par page
   */
  generateUsersCacheKey(companyId, page = 1, limit = 50) {
    return `users:${companyId}:${page}:${limit}`;
  }

  /**
   * Générer une clé de cache pour les prestations
   * @param {string} companyId - ID de l'entreprise
   * @param {string} category - Catégorie (optionnel)
   * @param {number} page - Numéro de page
   */
  generatePrestationsCacheKey(companyId, category = null, page = 1) {
    return `prestations:${companyId}:${category || 'all'}:${page}`;
  }

  /**
   * Générer une clé de cache pour les employés
   * @param {string} companyId - ID de l'entreprise
   * @param {string} statut - Statut (optionnel)
   * @param {number} page - Numéro de page
   */
  generateEmployesCacheKey(companyId, statut = null, page = 1) {
    return `employes:${companyId}:${statut || 'all'}:${page}`;
  }

  /**
   * Invalider le cache pour une entreprise spécifique
   * @param {string} companyId - ID de l'entreprise
   */
  invalidateCompanyCache(companyId) {
    this.delPattern(`users:${companyId}`);
    this.delPattern(`prestations:${companyId}`);
    this.delPattern(`employes:${companyId}`);
    this.delPattern(`roles:${companyId}`);
  }

  /**
   * Invalider le cache utilisateur
   * @param {string} userId - ID de l'utilisateur
   */
  invalidateUserCache(userId) {
    this.del(`user:profile:${userId}`);
    this.del(`user:permissions:${userId}`);
  }
}

module.exports = new CacheService();
