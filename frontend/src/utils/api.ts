import axios from 'axios';
import toast from 'react-hot-toast';
import { requestDeduplicator } from './requestDeduplicator';

// Configuration de base d'axios
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Augmenté à 30 secondes pour les requêtes lourdes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Map pour tracker les requêtes en cours et éviter les doublons
const pendingRequests = new Map<string, Promise<any>>();

// Intercepteur pour ajouter le token et gérer la déduplication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Générer une clé unique pour la requête
    const requestKey = `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
    
    // Vérifier si une requête identique est déjà en cours (seulement pour GET)
    if (config.method === 'get' && pendingRequests.has(requestKey)) {
      // Annuler cette requête car une identique est déjà en cours
      const cancelToken = axios.CancelToken.source();
      config.cancelToken = cancelToken.token;
      cancelToken.cancel('Requête dupliquée annulée');
    }
    
    // Stocker la clé de requête dans config pour la retrouver dans la réponse
    (config as any).requestKey = requestKey;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs
api.interceptors.response.use(
  (response) => {
    // Nettoyer la requête en attente
    const requestKey = (response.config as any).requestKey;
    if (requestKey) {
      pendingRequests.delete(requestKey);
    }
    return response;
  },
  (error) => {
    // Nettoyer la requête en attente
    if (error.config) {
      const requestKey = (error.config as any).requestKey;
      if (requestKey) {
        pendingRequests.delete(requestKey);
      }
    }
    
    // Ignorer les erreurs de requêtes annulées (doublons)
    if (axios.isCancel(error)) {
      return Promise.reject({ cancelled: true, message: 'Requête dupliquée' });
    }
    
    // Gestion des erreurs d'authentification
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Rediriger vers la page de connexion seulement si on est sur une page protégée
      const currentPath = window.location.pathname;
      const publicPaths = ['/login', '/register', '/activation'];
      
      if (!publicPaths.includes(currentPath)) {
        window.location.href = '/login';
        toast.error('Session expirée, veuillez vous reconnecter');
      }
    }
    
    // Gestion des erreurs de réseau (seulement si ce n'est pas une requête annulée)
    if (!error.response && !axios.isCancel(error)) {
      toast.error('Erreur de connexion au serveur');
    }
    
    return Promise.reject(error);
  }
);

// Fonction helper pour invalider le cache
export const invalidateCache = (urlPattern: string) => {
  requestDeduplicator.invalidateCache(urlPattern);
};

export default api;
