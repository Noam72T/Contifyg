import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

interface ServiceSession {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  company: string;
  startTime: string;
  endTime?: string;
  duration: number;
  isActive: boolean;
  currentDuration?: number;
}

interface ServiceContextType {
  isInService: boolean;
  currentSession: ServiceSession | null;
  isLoading: boolean;
  startService: () => Promise<void>;
  stopService: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isInService, setIsInService] = useState(false);
  const [currentSession, setCurrentSession] = useState<ServiceSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(false);

  // Récupérer le statut de service avec protection contre les appels multiples
  const refreshStatus = useCallback(async () => {
    if (!isAuthenticated || !user || isLoadingRef.current) return;
    
    // Ne pas faire d'appels si l'utilisateur n'a pas complété son profil
    const hasCompleteProfile = user.firstName && user.lastName && user.phoneNumber && user.compteBancaire;
    if (!hasCompleteProfile) {
      setIsLoading(false);
      return;
    }

    isLoadingRef.current = true;
    try {
      const response = await api.get('/service-sessions/status');
      
      if (response.data.success) {
        setIsInService(response.data.isInService);
        setCurrentSession(response.data.session);
      }
    } catch (error: any) {
      // Ignorer les erreurs d'annulation de requête (requêtes dupliquées)
      if (error.name !== 'CanceledError') {
        console.error('❌ Erreur lors de la récupération du statut de service:', error);
      }
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [isAuthenticated, user]);

  // Démarrer le service
  const startService = useCallback(async () => {
    try {
      const response = await api.post('/service-sessions/start');
      
      if (response.data.success) {
        setIsInService(true);
        setCurrentSession(response.data.session);
        toast.success('✅ Service démarré avec succès');
        console.log('✅ Service démarré:', response.data.session);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du démarrage du service:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du démarrage du service');
    }
  }, []);

  // Arrêter le service
  const stopService = useCallback(async () => {
    try {
      const response = await api.post('/service-sessions/stop');
      
      if (response.data.success) {
        setIsInService(false);
        const session = response.data.session;
        setCurrentSession(null);
        
        const durationMinutes = session.duration;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        
        toast.success(`✅ Service terminé - Durée: ${hours}h ${minutes}min`);
        console.log('✅ Service terminé:', session);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'arrêt du service:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'arrêt du service');
    }
  }, []);

  // Charger le statut au montage et à chaque changement d'utilisateur
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshStatus();
    } else {
      setIsInService(false);
      setCurrentSession(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]); // Suppression de refreshStatus des dépendances

  // Rafraîchir le statut toutes les 30 secondes
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const interval = setInterval(() => {
      // Vérifier si pas déjà en cours de chargement
      if (!isLoadingRef.current) {
        refreshStatus();
      }
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [isAuthenticated, user]); // Suppression de refreshStatus des dépendances

  return (
    <ServiceContext.Provider
      value={{
        isInService,
        currentSession,
        isLoading,
        startService,
        stopService,
        refreshStatus
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
};

export const useService = () => {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error('useService must be used within a ServiceProvider');
  }
  return context;
};
