import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { showToast } from '../utils/toastDeduplicator';
import { canViewAllCompanies } from '../utils/roleHelpers';
import api from '../utils/api';

interface Company {
  _id: string;
  name: string;
  description?: string;
  category: string;
  owner: string;
  createdAt: string;
  logo?: string;
  compteBancaire?: string;
  pdg?: string;
  nombreEmployes?: number;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  selectedCompanyId: string | null;
  setSelectedCompany: (company: Company | null) => Promise<void>;
  setSelectedCompanyById: (companyId: string | null) => Promise<void>;
  companyData: any;
  isLoading: boolean;
  fetchCompanyData: (companyId: string | null) => Promise<void>;
  resetToDefault: () => void;
  userCompanies: Company[];
  fetchUserCompanies: () => Promise<void>;
  refreshAfterSwitch: () => Promise<void>;
  forceUserCompanySync: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => {
    // Pour les techniciens, récupérer l'entreprise sélectionnée depuis localStorage
    if (typeof window !== 'undefined') {
      const savedCompany = localStorage.getItem('technicianSelectedCompany');
      if (savedCompany) {
        try {
          return JSON.parse(savedCompany);
        } catch (error) {
          // Erreur silencieuse
        }
      }
    }
    return null;
  });
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => {
    // Pour les techniciens, récupérer l'ID d'entreprise depuis localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('technicianSelectedCompanyId');
    }
    return null;
  });
  
  const [companyData, setCompanyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
  const isAutoLoadingRef = useRef(false);
  const isFetchingCompaniesRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);


  const fetchUserCompanies = async () => {
    if (!user || !isAuthenticated) return;
    
    // Éviter les appels multiples avec un système de cache
    const now = Date.now();
    if (isFetchingCompaniesRef.current || (now - lastFetchTimeRef.current < 5000)) {
      return; // Éviter les appels si déjà en cours ou fait il y a moins de 5 secondes
    }
    
    isFetchingCompaniesRef.current = true;
    lastFetchTimeRef.current = now;
    
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      // Pour les techniciens, SuperAdmin et IRS, récupérer toutes les entreprises
      if (canViewAllCompanies(user)) {
        const response = await fetch(`${apiUrl}/api/companies`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setUserCompanies(data.companies);
        }
      } else {
        // Pour les utilisateurs normaux, utiliser l'API optimisée
        try {
          const userCompaniesResponse = await fetch(`${apiUrl}/api/users/my-companies`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const userCompaniesData = await userCompaniesResponse.json();
          
          if (userCompaniesData.success && userCompaniesData.companies && userCompaniesData.companies.length > 0) {
            setUserCompanies(userCompaniesData.companies);
          } else if (user.company) {
            // Fallback: Utiliser l'entreprise actuelle
            const response = await fetch(`${apiUrl}/api/companies/${user.company}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
              setUserCompanies([data.company]);
            }
          }
        } catch (error) {
          setUserCompanies([]);
        }
      }
    } catch (error) {
      setUserCompanies([]);
    } finally {
      isFetchingCompaniesRef.current = false;
    }
  };

  const fetchCompanyData = async (companyId: string | null) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;

      if (!companyId) {
        const [usersRes, companiesRes] = await Promise.all([
          fetch(`${apiUrl}/api/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${apiUrl}/api/companies`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const [usersData, companiesData] = await Promise.all([
          usersRes.json(),
          companiesRes.json()
        ]);

        setCompanyData({
          type: 'global',
          users: usersData.success ? usersData.users : [],
          companies: companiesData.success ? companiesData.companies : [],
          stats: {
            totalUsers: usersData.success ? usersData.users.length : 0,
            totalCompanies: companiesData.success ? companiesData.companies.length : 0,
          }
        });
      } else {
        const [companyRes, usersRes] = await Promise.all([
          fetch(`${apiUrl}/api/companies/${companyId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${apiUrl}/api/users?company=${companyId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const [companyData, usersData] = await Promise.all([
          companyRes.json(),
          usersRes.json()
        ]);

        setCompanyData({
          type: 'company',
          company: companyData.success ? companyData.company : null,
          users: usersData.success ? usersData.users : [],
          stats: {
            totalUsers: usersData.success ? usersData.users.length : 0,
            activeUsers: usersData.success ? usersData.users.filter((u: any) => u.isActive).length : 0,
          }
        });

        // Mettre à jour selectedCompany avec les données fraîches de la BDD
        if (companyData.success && companyData.company) {
          setSelectedCompany(companyData.company);
        }
      }
    } catch (error) {
      setCompanyData({ error: 'Erreur lors du chargement des données' });
    } finally {
      setIsLoading(false);
    }
  };


  // Auto-load user company on authentication or when user.currentCompany changes
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) {
      return;
    }

    if (isAutoLoadingRef.current) {
      return; // Éviter les appels multiples
    }

    // Pour les techniciens, toujours permettre le rechargement
    // Pour les autres, recharger si pas d'entreprise sélectionnée OU si user.currentCompany a changé
    const userCurrentCompanyId = typeof user.currentCompany === 'string' 
      ? user.currentCompany 
      : (user.currentCompany as any)?._id;
    
    // Vérifier aussi user.company comme fallback
    const userCompanyId = userCurrentCompanyId || (typeof user.company === 'string' ? user.company : (user.company as any)?._id);
    
    const shouldReload = !selectedCompany || 
                        canViewAllCompanies(user) || 
                        (userCompanyId && selectedCompanyId !== userCompanyId);

    if (!shouldReload) {
      return;
    }


    isAutoLoadingRef.current = true;

    const autoSelectUserCompany = async () => {
      try {
        // Pour les techniciens, SuperAdmin et IRS, vérifier d'abord s'il y a une entreprise sauvegardée
        if (canViewAllCompanies(user)) {
          const savedCompanyId = localStorage.getItem('technicianSelectedCompanyId');
          if (savedCompanyId && selectedCompanyId === savedCompanyId) {
            // L'entreprise est déjà chargée depuis l'état initial
            await fetchCompanyData(savedCompanyId);
            return;
          } else if (savedCompanyId) {
            // Charger l'entreprise sauvegardée
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL;
            
            const response = await fetch(`${apiUrl}/api/companies/${savedCompanyId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.company) {
                setSelectedCompany(data.company);
                setSelectedCompanyId(savedCompanyId);
                await fetchCompanyData(savedCompanyId);
                return;
              }
            }
          }
          // Si pas d'entreprise sauvegardée ou erreur, charger toutes les entreprises
          fetchCompanyData(null);
          return;
        }

        // Pour les utilisateurs normaux, priorité absolue à user.currentCompany
        let userCompanyId = null;
        
        // Priorité 1: currentCompany de l'utilisateur (toujours en premier)
        if (user.currentCompany) {
          userCompanyId = typeof user.currentCompany === 'string' ? user.currentCompany : (user.currentCompany as any)?._id;
        }
        // Priorité 2: company de l'utilisateur
        else if (user.company) {
          userCompanyId = typeof user.company === 'string' ? user.company : (user.company as any)?._id;
        }
        // Priorité 3: Entreprise sauvegardée dans localStorage (selectedCompanyId)
        else {
          const savedCompanyId = localStorage.getItem('selectedCompanyId');
          if (savedCompanyId) {
            userCompanyId = savedCompanyId;
          }
          // Priorité 4: Vérifier aussi selectedCompany si selectedCompanyId n'existe pas
          else {
            const savedCompany = localStorage.getItem('selectedCompany');
            if (savedCompany) {
              try {
                const companyObj = JSON.parse(savedCompany);
                if (companyObj && (companyObj._id || companyObj.id)) {
                  userCompanyId = companyObj._id || companyObj.id;
                }
              } catch (error) {
                console.error('Erreur lors du parsing de selectedCompany:', error);
              }
            }
            // Priorité 5: première entreprise de la liste
            else if (user.companies && user.companies.length > 0) {
              const firstCompany = user.companies[0] as any;
              userCompanyId = firstCompany.company ? 
                (typeof firstCompany.company === 'string' ? firstCompany.company : firstCompany.company._id) :
                firstCompany._id;
            }
          }
        }

        if (userCompanyId) {
          const token = localStorage.getItem('token');
          const apiUrl = import.meta.env.VITE_API_URL;
          
          const response = await fetch(`${apiUrl}/api/companies/${userCompanyId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.company) {
              setSelectedCompany(data.company);
              setSelectedCompanyId(userCompanyId);
              
              // Charger les données de l'entreprise
              await fetchCompanyData(userCompanyId);
            }
          }
        } else if (canViewAllCompanies(user)) {
          fetchCompanyData(null);
        }
      } catch (error) {
        console.error('Erreur lors de l\'auto-sélection:', error);
      } finally {
        isAutoLoadingRef.current = false;
      }
    };

    autoSelectUserCompany();
  }, [authLoading, isAuthenticated, user, user?.currentCompany, user?.company]);

  // Charger les entreprises de l'utilisateur quand il est authentifié
  useEffect(() => {
    if (isAuthenticated && user && !authLoading && !isFetchingCompaniesRef.current) {
      // Debounce: minimum 5 secondes entre chaque appel
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 5000) {
        return;
      }
      
      isFetchingCompaniesRef.current = true;
      lastFetchTimeRef.current = now;
      
      fetchUserCompanies().finally(() => {
        isFetchingCompaniesRef.current = false;
      });
    }
  }, [isAuthenticated, user, authLoading]);

  // Écouter les changements dans localStorage pour détecter les nouvelles assignations d'entreprise
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedCompany' || e.key === 'selectedCompanyId') {
        // Vérifier si une nouvelle entreprise a été assignée
        const newCompanyId = localStorage.getItem('selectedCompanyId');
        const newCompanyData = localStorage.getItem('selectedCompany');
        
        if (newCompanyId && newCompanyId !== selectedCompanyId) {
          if (newCompanyData) {
            try {
              const company = JSON.parse(newCompanyData);
              setSelectedCompany(company);
              setSelectedCompanyId(newCompanyId);
              fetchCompanyData(newCompanyId);
            } catch (error) {
              // Erreur silencieuse
            }
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedCompanyId]);

  // Clean up on logout
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      resetToDefault();
      setUserCompanies([]);
    }
  }, [isAuthenticated, authLoading]);

  const setSelectedCompanyById = async (companyId: string | null) => {
    // Vérifier si un service est actif avant de permettre le changement
    if (companyId && companyId !== selectedCompanyId) {
      try {
        const statusResponse = await api.get('/service-sessions/status');
        
        if (statusResponse.data.isInService) {
          showToast.error('Vous devez arrêter votre service avant de changer d\'entreprise');
          return;
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du service:', error);
      }
    }
    
    setSelectedCompanyId(companyId);
    
    if (companyId) {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL;
        
        // D'abord récupérer les données de l'entreprise pour l'affichage immédiat
        const companyResponse = await fetch(`${apiUrl}/api/companies/${companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          if (companyData.success && companyData.company) {
            setSelectedCompany(companyData.company);
            
            // Sauvegarder dans localStorage
            localStorage.setItem('selectedCompany', JSON.stringify(companyData.company));
            localStorage.setItem('selectedCompanyId', companyId);
          }
        }
        
        // Ensuite, synchronisation complète côté backend en parallèle
        const syncPromise = (async () => {
          try {
            // Essayer d'abord la synchronisation complète
            let response = await fetch(`${apiUrl}/api/users/sync-company-switch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ companyId })
            });
            
            // Si erreur 500, essayer la version simplifiée
            if (!response.ok && response.status === 500) {
              response = await fetch(`${apiUrl}/api/users/sync-company-switch-simple`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ companyId })
              });
            }
            
            const result = await response.json();
            if (!result.success) {
              console.error('Erreur synchronisation:', result.message);
            }
          } catch (error) {
            console.error('Erreur synchronisation switch entreprise:', error);
          }
        })();
        
        // Charger les données de l'entreprise immédiatement
        // fetchCompanyData gère déjà setIsLoading(true) et setIsLoading(false)
        await fetchCompanyData(companyId);
        
        // Attendre la synchronisation backend puis rafraîchir
        await syncPromise;
        await fetchUserCompanies();
        
      } catch (error) {
        console.error('Erreur lors du switch d\'entreprise:', error);
        setIsLoading(false);
      }
    } else {
      setSelectedCompany(null);
      setCompanyData(null);
      // Pas besoin de setIsLoading ici, on ne charge rien
    }
  };

  const updateSelectedCompany = async (company: Company | null) => {
    // Éviter les mises à jour inutiles si c'est exactement la même entreprise
    if (selectedCompany?._id === company?._id) {
      return;
    }
    
    // Vérifier si un service est actif avant de permettre le changement
    if (company && company._id !== selectedCompany?._id) {
      try {
        const statusResponse = await api.get('/service-sessions/status');
        
        if (statusResponse.data.isInService) {
          showToast.error('Vous devez arrêter votre service avant de changer d\'entreprise');
          return;
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du service:', error);
      }
    }
    
    // Réinitialiser les refs de chargement pour permettre le rechargement
    isAutoLoadingRef.current = false;
    
    // Forcer la réinitialisation complète des données
    setCompanyData(null);
    
    setSelectedCompany(company);
    if (company) {
      setSelectedCompanyId(company._id);
      
      // Sauvegarder l'entreprise sélectionnée pour tous les utilisateurs
      localStorage.setItem('selectedCompany', JSON.stringify(company));
      localStorage.setItem('selectedCompanyId', company._id);
      
      // Sauvegarder aussi pour les rôles avec accès global (compatibilité)
      if (canViewAllCompanies(user)) {
        localStorage.setItem('technicianSelectedCompany', JSON.stringify(company));
        localStorage.setItem('technicianSelectedCompanyId', company._id);
      }
      
      // Forcer le rechargement immédiat des données de l'entreprise
      // fetchCompanyData gère déjà setIsLoading(true) et setIsLoading(false)
      fetchCompanyData(company._id).then(() => {
        // Rafraîchir uniquement la liste des entreprises, pas les données (déjà chargées)
        fetchUserCompanies();
      }).catch(error => {
        console.error('Erreur lors du rechargement des données:', error);
        setIsLoading(false);
      });
      
    } else {
      setSelectedCompanyId(null);
      
      // Nettoyer le localStorage
      localStorage.removeItem('selectedCompany');
      localStorage.removeItem('selectedCompanyId');
      localStorage.removeItem('technicianSelectedCompany');
      localStorage.removeItem('technicianSelectedCompanyId');
      
      // Charger la vue globale
      fetchCompanyData(null).then(() => {
        // Vue globale chargée
      }).catch(error => {
        console.error('Erreur lors du chargement de la vue globale:', error);
        setIsLoading(false);
      });
    }
  };

  const resetToDefault = () => {
    setSelectedCompany(null);
    setSelectedCompanyId(null);
    setCompanyData(null);
    isAutoLoadingRef.current = false;
    // Nettoyer le localStorage
    localStorage.removeItem('technicianSelectedCompany');
    localStorage.removeItem('technicianSelectedCompanyId');
  };

  const refreshAfterSwitch = async () => {
    try {
      // Rafraîchir uniquement la liste des entreprises utilisateur
      // Les données de l'entreprise sont déjà chargées par fetchCompanyData
      await fetchUserCompanies();
      
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    }
  };

  // Fonction pour forcer la synchronisation avec l'entreprise de l'utilisateur
  const forceUserCompanySync = async () => {
    if (!user) {
      return;
    }
    
    // Réinitialiser les refs pour permettre le rechargement
    isAutoLoadingRef.current = false;
    
    // D'abord, vérifier s'il y a une entreprise dans localStorage (plus récent)
    const savedCompanyId = localStorage.getItem('selectedCompanyId');
    const savedCompany = localStorage.getItem('selectedCompany');
    
    // Récupérer l'ID de l'entreprise courante de l'utilisateur
    const userCurrentCompanyId = typeof user.currentCompany === 'string' 
      ? user.currentCompany 
      : (user.currentCompany as any)?._id;
    
    const userCompanyId = userCurrentCompanyId || (typeof user.company === 'string' ? user.company : (user.company as any)?._id);
    
    // Priorité au localStorage s'il est plus récent, sinon utiliser les données utilisateur
    const targetCompanyId = savedCompanyId || userCompanyId;
    
    if (targetCompanyId) {
      try {
        // Si on a déjà les données dans localStorage, les utiliser directement
        if (savedCompanyId === targetCompanyId && savedCompany) {
          try {
            const company = JSON.parse(savedCompany);
            setSelectedCompany(company);
            setSelectedCompanyId(targetCompanyId);
            await fetchCompanyData(targetCompanyId);
            await fetchUserCompanies();
            return;
          } catch (parseError) {
            // Erreur parsing localStorage, récupération via API
          }
        }
        
        // Sinon, récupérer via API
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL;
        
        const response = await fetch(`${apiUrl}/api/companies/${targetCompanyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.company) {
            setSelectedCompany(data.company);
            setSelectedCompanyId(targetCompanyId);
            
            // Sauvegarder dans localStorage
            localStorage.setItem('selectedCompany', JSON.stringify(data.company));
            localStorage.setItem('selectedCompanyId', targetCompanyId);
            
            // Charger les données de l'entreprise
            await fetchCompanyData(targetCompanyId);
            
            // Recharger les entreprises utilisateur
            await fetchUserCompanies();
          }
        } else {
          console.error('Erreur API:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Erreur lors de la synchronisation forcée:', error);
      }
    }
  };

  const value: CompanyContextType = {
    selectedCompany,
    selectedCompanyId,
    setSelectedCompany: updateSelectedCompany,
    setSelectedCompanyById,
    companyData,
    isLoading,
    fetchCompanyData,
    resetToDefault,
    userCompanies,
    fetchUserCompanies,
    refreshAfterSwitch,
    forceUserCompanySync
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export default CompanyContext;
