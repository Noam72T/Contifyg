import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/auth';
import authService from '../services/authService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: User) => void;
  refreshUser: (force?: boolean) => Promise<void>;
  loginWithDiscord: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<number>(0);

  const isAuthenticated = !!user;

  // Fonction pour vérifier le statut utilisateur avec throttling
  const checkUserStatus = async (force = false) => {
    // Throttling : ne pas vérifier plus d'une fois par minute (sauf si force=true)
    const now = Date.now();
    if (!force && now - lastCheck < 60000) {
      // Vérification ignorée (throttling)
      console.log('⏭️ Vérification ignorée (throttling) - utilisez force=true pour forcer');
      return;
    }
    setLastCheck(now);
    
    try {
      const response = await authService.getProfile();
      if (response.success && response.user) {
        
        // Vérifier si l'utilisateur a été viré (plus d'entreprise assignée)
        const wasValidated = user?.isCompanyValidated;
        const isNowInvalid = !response.user.isCompanyValidated && !response.user.company;
        
        if (wasValidated && isNowInvalid) {
          toast.error('Vous avez été retiré de l\'entreprise. Reconnectez-vous pour saisir un nouveau code d\'entreprise.');
          logout();
          return;
        }
        
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (error: any) {
      console.error('Erreur lors de la vérification du profil:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Votre session a expiré ou vous avez été retiré de l\'entreprise.');
        logout();
        return;
      }
    }
  };

  // Charger l'utilisateur depuis le localStorage au démarrage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = authService.getToken();
      const storedUser = authService.getCurrentUser();

      if (token && storedUser) {
        setUser(storedUser);
        
        // Vérifier immédiatement si l'utilisateur est toujours valide
        try {
          await checkUserStatus();
        } catch (error) {
          console.log('Erreur lors de la vérification initiale:', error);
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Vérifier périodiquement si l'utilisateur a été viré (beaucoup moins fréquent)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Vérifier toutes les 5 minutes (au lieu de 10 secondes)
    const interval = setInterval(checkUserStatus, 5 * 60 * 1000);

    // Vérifier seulement quand la fenêtre reprend le focus (pas à chaque clic)
    const handleFocus = () => {
      checkUserStatus();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ username, password });
      
      if (response.success && response.user) {
        setUser(response.user);
        toast.success(response.message || 'Connexion réussie !');
        return true;
      } else {
        toast.error(response.message || 'Erreur lors de la connexion');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de la connexion';
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const register = useCallback(async (data: any): Promise<boolean> => {
    try {
      const response = await authService.register(data);
      
      if (response.success && response.user) {
        // NE PAS stocker les données utilisateur ni connecter automatiquement
        // localStorage.setItem('tempUserData', JSON.stringify(response.user));
        // setUser(response.user); // Commenté pour éviter la connexion automatique
        toast.success('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        
        // Rediriger vers la page de connexion après inscription
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        
        return true;
      } else {
        if (response.errors && response.errors.length > 0) {
          response.errors.forEach(error => toast.error(error));
        } else {
          toast.error(response.message || 'Erreur lors de l\'inscription');
        }
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'inscription';
      const errors = error.response?.data?.errors;
      
      if (errors && Array.isArray(errors)) {
        errors.forEach(err => toast.error(err));
      } else {
        toast.error(errorMessage);
      }
      
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    authService.logout();
    toast.success('Déconnexion réussie');
    // Rediriger vers la page de connexion
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((userData: User) => {
    const wasLoggedOut = !user;
    // Log supprimé pour éviter le spam en console
    
    setUser(userData);
    // Mettre à jour aussi le localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Sauvegarder le accountFamilyId dans localStorage pour le réutiliser
    if ((userData as any).accountFamilyId) {
      localStorage.setItem('accountFamilyId', (userData as any).accountFamilyId);
      console.log('📌 AccountFamilyId sauvegardé dans localStorage:', (userData as any).accountFamilyId);
    }
    
    // Afficher notification seulement si c'était une nouvelle connexion Discord
    if (wasLoggedOut && userData.discordId) {
      toast.success('Connexion Discord réussie !');
    }
  }, [user]);

  const refreshUser = useCallback(async (force = false) => {
    await checkUserStatus(force);
  }, [checkUserStatus]);

  const loginWithDiscord = useCallback(() => {
    // Récupérer le accountFamilyId du localStorage s'il existe
    const accountFamilyId = localStorage.getItem('accountFamilyId');
    
    // Rediriger vers l'endpoint Discord OAuth du backend
    const baseUrl = import.meta.env.VITE_API_URL;
    let discordUrl = `${baseUrl}/api/discord/login`;
    
    // Ajouter le accountFamilyId en paramètre si disponible
    if (accountFamilyId) {
      discordUrl += `?accountFamilyId=${encodeURIComponent(accountFamilyId)}`;
      console.log('📌 Connexion Discord avec accountFamilyId:', accountFamilyId);
    }
    
    window.location.href = discordUrl;
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    loginWithDiscord
  }), [user, isAuthenticated, isLoading, login, register, logout, updateUser, refreshUser, loginWithDiscord]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
