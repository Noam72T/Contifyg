import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import api from '../utils/api';

interface UserPermissions {
  permissions: string[];
  categories: string[];
  loading: boolean;
  error: string | null;
}

export const useUserPermissions = () => {
  const { user, isAuthenticated } = useAuth();
  const { selectedCompany } = useCompany();
  const [permissionsData, setPermissionsData] = useState<UserPermissions>({
    permissions: [],
    categories: [],
    loading: true,
    error: null
  });
  const isFetchingRef = useRef(false);

  const fetchUserPermissions = useCallback(async () => {
      // Protection contre les appels multiples simultanés
      if (isFetchingRef.current) {
        console.log('🛑 useUserPermissions - Appel déjà en cours, ignoré');
        return;
      }
      
      if (!isAuthenticated || !user) {
        
        setPermissionsData({
          permissions: [],
          categories: [],
          loading: false,
          error: null
        });
        return;
      }
      
      // IMPORTANT: Ne pas récupérer les permissions si pas d'entreprise sélectionnée
      if (!selectedCompany?._id) {
        
        setPermissionsData({
          permissions: ['VIEW_GENERALE_CATEGORY'],
          categories: ['GENERALE'],
          loading: false,
          error: null
        });
        return;
      }

      // Si l'utilisateur existe mais n'a pas d'ID, essayer quand même l'API avec username
      if (!user._id && user.username) {
        
        try {
          // Passer l'ID de l'entreprise sélectionnée pour récupérer les permissions spécifiques
          
          
          const companyParam = selectedCompany?._id ? `?companyId=${selectedCompany._id}` : '';
          
          
          const response = await api.get(`/permissions/user/${user.username}${companyParam}`);
          
          
          if (response.data.success) {
            const { permissions, categories } = response.data;
            
            
            setPermissionsData({
              permissions: permissions || [],
              categories: categories || [],
              loading: false,
              error: null
            });
            return;
          }
        } catch (error) {
          
        }
        
        // Plus de fallback - utilisateur doit avoir des permissions explicites
      
        setPermissionsData({
          permissions: [],
          categories: [],
          loading: false,
          error: 'Permissions non définies'
        });
        return;
      }

      // Techniciens ont accès à toutes les catégories
      if (user.systemRole === 'Technicien') {
        
        setPermissionsData({
          permissions: ['VIEW_GENERAL_CATEGORY', 'VIEW_PAPERASSE_CATEGORY', 'VIEW_ADMINISTRATION_CATEGORY', 'VIEW_GESTION_CATEGORY'],
          categories: ['GENERALE', 'PAPERASSE', 'ADMINISTRATION', 'GESTION'],
          loading: false,
          error: null
        });
        return;
      }

      // Récupérer les permissions basées sur le rôle de l'utilisateur
      isFetchingRef.current = true;
      try {
        
        
        // Vérification supplémentaire de sécurité
        if (!user._id) {
          throw new Error('User ID is undefined');
        }
        
        // Passer l'ID de l'entreprise sélectionnée pour récupérer les permissions spécifiques
        
        
        const companyParam = selectedCompany?._id ? `?companyId=${selectedCompany._id}` : '';
        
        
        const response = await api.get(`/permissions/user/${user._id}${companyParam}`);
        
        
        
        if (response.data.success) {
          const { permissions, categories } = response.data;
          
          
          setPermissionsData({
            permissions: permissions || [],
            categories: categories || [],
            loading: false,
            error: null
          });
        } else {
          throw new Error('Erreur lors de la récupération des permissions');
        }
      } catch (error) {
        console.error('❌ Erreur API permissions:', error);
        
        // Plus de fallback automatique - l'utilisateur doit avoir des permissions explicites
        
        setPermissionsData({
          permissions: [],
          categories: [],
          loading: false,
          error: 'Erreur lors du chargement des permissions'
        });
      } finally {
        isFetchingRef.current = false;
      }
  }, [isAuthenticated, user, selectedCompany?._id]);

  // Charger les permissions une seule fois (pas de double appel)
  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  // Fonction pour forcer le rafraîchissement des permissions
  const refreshPermissions = useCallback(async () => {
    
    await fetchUserPermissions();
  }, [fetchUserPermissions]);

  const hasPermission = (permission: string) => {
   
    
    // Les Techniciens ont toutes les permissions
    if (user?.systemRole === 'Technicien') {
     
      return true;
    }
    
    const hasAccess = permissionsData.permissions.includes(permission);
    
    return hasAccess;
  };

  const hasCategoryAccess = (category: string) => {
    // Les Techniciens ont accès à toutes les catégories
    if (user?.systemRole === 'Technicien') {
      return true;
    }
    return permissionsData.categories.includes(category);
  };

  const canViewCategory = (category: 'GENERALE' | 'PAPERASSE' | 'ADMINISTRATION' | 'GESTION') => {
    
    
    // Les Techniciens ont accès à toutes les catégories
    if (user?.systemRole === 'Technicien') {
      console.log(`🔧 Technicien - accès autorisé`);
      return true;
    }
    
    // Vérifier d'abord si l'utilisateur a accès à la catégorie directement
    const directAccess = hasCategoryAccess(category);
    if (directAccess) {
      return true;
    }
    
    // Vérifier les permissions avec les codes réels utilisés dans la base
    const viewPermissions = [
      `VIEW_${category}_CATEGORY`,  // Ex: VIEW_PAPERASSE_CATEGORY (code principal)
      `MANAGE_${category}`,         // Ex: MANAGE_PAPERASSE (si on peut gérer, on peut voir)
      `${category}_MANAGE`          // Ex: PAPERASSE_MANAGE (code alternatif)
    ];
    
    
    
    const hasAnyPermission = viewPermissions.some(permission => {
      const has = hasPermission(permission);
      
      return has;
    });
    
    
    return hasAnyPermission;
  };

  // Fonction pour vérifier si l'utilisateur peut gérer une catégorie
  const canManageCategory = (category: 'GENERALE' | 'PAPERASSE' | 'ADMINISTRATION' | 'GESTION') => {
    // Les Techniciens ont tous les droits de gestion
    if (user?.systemRole === 'Technicien') {
      return true;
    }
    
    // Vérifier les permissions avec les codes réels utilisés dans la base
    const managePermissions = [
      `MANAGE_${category}`,           // Ex: MANAGE_PAPERASSE (code principal)
      `${category}_MANAGE`            // Ex: PAPERASSE_MANAGE (code alternatif)
    ];
    
    return managePermissions.some(permission => hasPermission(permission));
  };

  return {
    ...permissionsData,
    hasPermission,
    hasCategoryAccess,
    canViewCategory,
    canManageCategory,
    refreshPermissions
  };
};
