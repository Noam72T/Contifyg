const axios = require('axios');
const NodeCache = require('node-cache');

// Cache avec TTL de 5 minutes pour éviter le spam de requêtes
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Service pour interagir avec l'API GLife avec système de retry intelligent
 */
class GlifeApiService {
  constructor() {
    this.baseUrls = {
      productions: 'https://api.glife.fr/roleplay/company/productions',
      invoices: 'https://api.glife.fr/roleplay/company/invoices',
      orgInvoices: 'https://api.glife.fr/roleplay/org/invoices'
    };
    
    // Configuration retry
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 seconde
    this.maxDelay = 10000; // 10 secondes
    
    // Statistiques pour monitoring
    this.stats = {
      requests: 0,
      cacheHits: 0,
      retries: 0,
      errors: 0
    };
  }

  /**
   * Génère une clé de cache unique pour une requête
   */
  generateCacheKey(url, params = {}) {
    const paramString = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return `glife_api:${url}:${paramString}`;
  }

  /**
   * Calcule le délai pour le backoff exponentiel
   */
  calculateDelay(attempt) {
    const delay = this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Détermine si une erreur est récupérable (retry possible)
   */
  isRetryableError(error) {
    if (!error.response) return true; // Erreur réseau
    
    const status = error.response.status;
    // Retry sur 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
    return status === 502 || status === 503 || status === 504 || status >= 500;
  }

  /**
   * Effectue une requête HTTP avec retry intelligent et cache
   */
  async makeRequest(url, options = {}) {
    const cacheKey = this.generateCacheKey(url, options.params || {});
    
    // Vérifier le cache d'abord
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      this.stats.cacheHits++;
      console.log(`📦 [GLife API] Cache HIT pour: ${url}`);
      return { data: cachedData };
    }
    
    this.stats.requests++;
    
    const requestOptions = {
      timeout: 30000, // 30 secondes au lieu de 10
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GLife-Integration/1.0'
      },
      ...options
    };

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`📡 [GLife API] Tentative ${attempt + 1}/${this.maxRetries + 1}: ${url}`);
        
        const response = await axios.get(url, requestOptions);
        
        // Mettre en cache le résultat
        if (response.data) {
          apiCache.set(cacheKey, response.data);
          console.log(`💾 [GLife API] Mise en cache: ${url}`);
        }
        
        return response;
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;
        const isRetryable = this.isRetryableError(error);
        
        if (error.response) {
          console.error(`❌ [GLife API] Erreur ${error.response.status}: ${error.message}`);
          
          // Gestion spéciale pour 502 Bad Gateway
          if (error.response.status === 502) {
            console.warn(`🚧 [GLife API] Serveur GLife temporairement indisponible (502)`);
          }
        } else {
          console.error(`❌ [GLife API] Erreur réseau: ${error.message}`);
        }
        
        if (isLastAttempt || !isRetryable) {
          this.stats.errors++;
          
          // Retourner des données vides au lieu de faire planter l'application
          if (error.response?.status === 502) {
            console.warn(`⚠️ [GLife API] Retour de données vides pour éviter le crash`);
            return { data: [] };
          }
          
          throw error;
        }
        
        // Attendre avant le prochain essai
        const delay = this.calculateDelay(attempt);
        console.log(`⏳ [GLife API] Attente ${delay}ms avant retry...`);
        this.stats.retries++;
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Obtient les statistiques du service
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: apiCache.keys().length,
      cacheHitRate: this.stats.requests > 0 ? (this.stats.cacheHits / (this.stats.requests + this.stats.cacheHits) * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Vide le cache (utile pour forcer le rafraîchissement)
   */
  clearCache() {
    apiCache.flushAll();
    console.log('🗑️ [GLife API] Cache vidé');
  }

  /**
   * Récupère les productions d'une entreprise
   * @param {number} companyId - ID de l'entreprise sur GLife
   * @param {number} startDate - Timestamp Unix de début (optionnel)
   * @param {number} endDate - Timestamp Unix de fin (optionnel)
   * @param {number} characterId - ID du personnage pour filtrer (optionnel)
   * @returns {Promise<Array>} Liste des productions
   */
  async getProductions(companyId, startDate = null, endDate = null, characterId = null) {
    try {
      let url = `${this.baseUrls.productions}?id=${companyId}`;
      const params = { id: companyId };
      
      // Ajouter le characterId si fourni
      if (characterId) {
        url += `&characterId=${characterId}`;
        params.characterId = characterId;
      }
      
      // Ajouter les paramètres start et end si fournis
      if (startDate) {
        url += `&start=${startDate}`;
        params.start = startDate;
      }
      if (endDate) {
        url += `&end=${endDate}`;
        params.end = endDate;
      }
      
      console.log(`📡 [GLife API] Récupération productions pour entreprise ${companyId}`);
      if (startDate || endDate) {
        console.log(`📅 Filtrage par date: ${startDate ? new Date(startDate * 1000).toISOString() : 'début'} → ${endDate ? new Date(endDate * 1000).toISOString() : 'fin'}`);
      }
      if (characterId) {
        console.log(`👤 Filtrage par personnage: ${characterId}`);
      }
      
      const response = await this.makeRequest(url, { params });
      let data = response.data || [];
      
      console.log(`📦 [GLife API] ${data.length} productions récupérées`);
      
      return data;
    } catch (error) {
      console.error(`❌ Erreur API GLife: Impossible de récupérer les productions: ${error.message}`);
      // Retourner un tableau vide au lieu de faire planter l'application
      return [];
    }
  }

  /**
   * Récupère les factures d'une entreprise
   * @param {number} companyId - ID de l'entreprise sur GLife
   * @param {number} startDate - Timestamp Unix de début (optionnel)
   * @param {number} endDate - Timestamp Unix de fin (optionnel)
   * @param {number} characterId - ID du personnage pour filtrer (optionnel)
   * @returns {Promise<Array>} Liste des factures
   */
  async getInvoices(companyId, startDate = null, endDate = null, characterId = null) {
    try {
      let url = `${this.baseUrls.invoices}?id=${companyId}`;
      const params = { id: companyId };
      
      // Ajouter le characterId si fourni
      if (characterId) {
        url += `&characterId=${characterId}`;
        params.characterId = characterId;
      }
      
      // Ajouter les paramètres start et end si fournis
      if (startDate) {
        url += `&start=${startDate}`;
        params.start = startDate;
      }
      if (endDate) {
        url += `&end=${endDate}`;
        params.end = endDate;
      }
      
      console.log(`📡 [GLife API] Récupération factures pour entreprise ${companyId}`);
      if (startDate || endDate) {
        console.log(`📅 Filtrage par date: ${startDate ? new Date(startDate * 1000).toISOString() : 'début'} → ${endDate ? new Date(endDate * 1000).toISOString() : 'fin'}`);
      }
      if (characterId) {
        console.log(`👤 Filtrage par personnage: ${characterId}`);
      }
      
      const response = await this.makeRequest(url, { params });
      let data = response.data || [];
      
      console.log(`📦 [GLife API] ${data.length} factures récupérées`);
      
      return data;
    } catch (error) {
      console.error(`❌ [GLife API] Erreur récupération factures: ${error.message}`);
      // Retourner un tableau vide au lieu de faire planter l'application
      return [];
    }
  }

  /**
   * Récupère les factures d'une organisation
   * @param {number} orgId - ID de l'organisation sur GLife
   * @param {number} startDate - Timestamp Unix de début (optionnel)
   * @param {number} endDate - Timestamp Unix de fin (optionnel)
   * @returns {Promise<Array>} Liste des factures
   */
  async getOrgInvoices(orgId, startDate = null, endDate = null) {
    try {
      let url = `${this.baseUrls.orgInvoices}?id=${orgId}`;
      const params = { id: orgId };
      
      if (startDate) {
        url += `&startDate=${startDate}`;
        params.startDate = startDate;
      }
      if (endDate) {
        url += `&endDate=${endDate}`;
        params.endDate = endDate;
      }

      console.log(`📡 [GLife API] Récupération factures org pour organisation ${orgId}`);
      const response = await this.makeRequest(url, { params });

      console.log(`✅ [GLife API] ${response.data?.length || 0} factures org récupérées`);
      return response.data || [];
    } catch (error) {
      console.error(`❌ [GLife API] Erreur récupération factures org: ${error.message}`);
      // Retourner un tableau vide au lieu de faire planter l'application
      return [];
    }
  }

  /**
   * Récupère toutes les ventes (productions + factures) pour une période
   * @param {number} companyId - ID de l'entreprise sur GLife
   * @param {number} startDate - Timestamp Unix de début
   * @param {number} endDate - Timestamp Unix de fin
   * @returns {Promise<Object>} Objet contenant productions et factures
   */
  async getAllSales(companyId, startDate, endDate) {
    try {
      // ⚠️ IMPORTANT: L'API GLife rejette les timestamps dans le futur
      const nowTimestamp = Math.floor(Date.now() / 1000);
      if (endDate > nowTimestamp) {
        console.log(`⚠️ [GLife API] Timestamp de fin dans le futur (${endDate}), ajustement à maintenant (${nowTimestamp})`);
        endDate = nowTimestamp;
      }

      console.log(`📊 [GLife API] Récupération de toutes les ventes pour entreprise ${companyId}`);
      console.log(`📅 Période: ${new Date(startDate * 1000).toLocaleString()} - ${new Date(endDate * 1000).toLocaleString()}`);

      const [productions, invoices] = await Promise.all([
        this.getProductions(companyId, startDate, endDate),
        this.getInvoices(companyId, startDate, endDate)
      ]);

      const totalProductions = productions.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalInvoices = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
      const total = totalProductions + totalInvoices;

      console.log(`💰 [GLife API] Total ventes: ${total}$ (Productions: ${totalProductions}$, Factures: ${totalInvoices}$)`);

      return {
        productions,
        invoices,
        totals: {
          productions: totalProductions,
          invoices: totalInvoices,
          total
        }
      };
    } catch (error) {
      console.error(`❌ [GLife API] Erreur récupération ventes:`, error.message);
      throw error;
    }
  }

  /**
   * Récupère les ventes d'un utilisateur spécifique par son charId
   * @param {number} companyId - ID de l'entreprise sur GLife
   * @param {number} charId - ID du personnage GLife
   * @param {number} startDate - Timestamp Unix de début
   * @param {number} endDate - Timestamp Unix de fin
   * @returns {Promise<Object>} Ventes filtrées par utilisateur
   */
  async getUserSales(companyId, charId, startDate, endDate) {
    try {
      // ⚠️ IMPORTANT: L'API GLife rejette les timestamps dans le futur
      const nowTimestamp = Math.floor(Date.now() / 1000);
      if (endDate > nowTimestamp) {
        console.log(`⚠️ [GLife API] Timestamp de fin dans le futur (${endDate}), ajustement à maintenant (${nowTimestamp})`);
        endDate = nowTimestamp;
      }

      console.log(`👤 [GLife API] Récupération ventes pour charId ${charId}`);
      
      // Utiliser le paramètre characterId de l'API pour filtrer directement
      const [productions, invoices] = await Promise.all([
        this.getProductions(companyId, startDate, endDate, charId),
        this.getInvoices(companyId, startDate, endDate, charId)
      ]);
      
      const totalProductions = productions.reduce((sum, p) => sum + (parseInt(p.revenue) || 0), 0);
      const totalInvoices = invoices.reduce((sum, i) => sum + (parseInt(i.revenue) || 0), 0);
      const total = totalProductions + totalInvoices;
      
      console.log(`✅ [GLife API] Ventes utilisateur: ${total}$ (${productions.length} productions, ${invoices.length} factures)`);
      
      return {
        productions,
        invoices,
        totals: {
          productions: totalProductions,
          invoices: totalInvoices,
          total
        }
      };
    } catch (error) {
      console.error(`❌ [GLife API] Erreur récupération ventes utilisateur:`, error.message);
      throw error;
    }
  }

  /**
   * Convertit une date en timestamp Unix
   * @param {Date|string} date - Date à convertir
   * @returns {number} Timestamp Unix
   */
  dateToUnixTimestamp(date) {
    return Math.floor(new Date(date).getTime() / 1000);
  }

  /**
   * Récupère les ventes pour une semaine spécifique
   * @param {number} companyId - ID de l'entreprise sur GLife
   * @param {number} year - Année
   * @param {number} week - Numéro de semaine
   * @returns {Promise<Object>} Ventes de la semaine
   */
  async getSalesForWeek(companyId, year, week) {
    // Calculer les dates de début et fin de la semaine
    const { startDate, endDate } = this.getWeekDates(year, week);
    
    const startTimestamp = this.dateToUnixTimestamp(startDate);
    const endTimestamp = this.dateToUnixTimestamp(endDate);

    console.log(`📅 [GLife API] Semaine ${week}/${year}:`);
    console.log(`   Début: ${startDate.toLocaleString('fr-FR')} (timestamp: ${startTimestamp})`);
    console.log(`   Fin: ${endDate.toLocaleString('fr-FR')} (timestamp: ${endTimestamp})`);

    return this.getAllSales(companyId, startTimestamp, endTimestamp);
  }

  /**
   * Récupère les ventes d'un utilisateur pour une semaine spécifique
   * @param {number} companyId - ID de l'entreprise sur GLife
   * @param {number} charId - ID du personnage GLife
   * @param {number} year - Année
   * @param {number} week - Numéro de semaine
   * @returns {Promise<Object>} Ventes de l'utilisateur pour la semaine
   */
  async getUserSalesForWeek(companyId, charId, year, week) {
    // Calculer les dates de début et fin de la semaine
    const { startDate, endDate } = this.getWeekDates(year, week);
    
    const startTimestamp = this.dateToUnixTimestamp(startDate);
    const endTimestamp = this.dateToUnixTimestamp(endDate);

    return this.getUserSales(companyId, charId, startTimestamp, endTimestamp);
  }

  /**
   * Calcule les dates de début et fin d'une semaine
   * @param {number} year - Année
   * @param {number} week - Numéro de semaine
   * @returns {Object} Objet avec startDate et endDate
   */
  getWeekDates(year, week) {
    // Calcul ISO 8601 en UTC pour éviter les problèmes de timezone
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const jan1Day = jan1.getUTCDay() || 7; // Dimanche = 7
    
    // Trouver le premier jeudi de l'année (définit la semaine 1 ISO 8601)
    const firstThursday = new Date(jan1.getTime() + (4 - jan1Day) * 24 * 60 * 60 * 1000);
    
    // Le lundi de la semaine 1 est 3 jours avant le premier jeudi
    const firstMonday = new Date(firstThursday.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    // Calculer le lundi de la semaine demandée
    const startDate = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    startDate.setUTCHours(0, 0, 0, 0);
    
    // Le dimanche est 6 jours après le lundi
    // Note: On met 23:59:59 sans millisecondes pour éviter les erreurs 502 de l'API
    let endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    endDate.setUTCHours(23, 59, 59, 0);

    // ⚠️ IMPORTANT: L'API GLife rejette les timestamps dans le futur
    // Si endDate est dans le futur, utiliser la date/heure actuelle
    const now = new Date();
    if (endDate > now) {
      console.log(`⚠️ [GLife API] Date de fin dans le futur détectée, ajustement à maintenant`);
      endDate = now;
      // Arrondir à la seconde précédente pour éviter les problèmes de millisecondes
      endDate.setMilliseconds(0);
    }

    return { startDate, endDate };
  }
}

module.exports = new GlifeApiService();
