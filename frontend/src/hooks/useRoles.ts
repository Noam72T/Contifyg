import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import authService from '../services/authService';

interface Permission {
  _id: string;
  name: string;
  code: string;
  description: string;
  category: string;
}

interface Role {
  _id: string;
  nom: string;
  permissions: Permission[];
  typeContrat: string;
  normeSalariale: number;
  limiteSalaire: number;
  isDefault: boolean;
}

export const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRolesRef = useRef(false);
  const isLoadingPermissionsRef = useRef(false);
  const permissionsLoadedRef = useRef(false);
  
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  // Charger les rôles de l'entreprise
  const loadRoles = async () => {
    if (!selectedCompany?._id || isLoadingRolesRef.current) return;

    const token = authService.getToken();
    if (!token) return;

    isLoadingRolesRef.current = true;
    try {
      setLoading(true);
      const response = await fetch(`/api/roles?companyId=${selectedCompany._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        // Le backend peut renvoyer soit un array directement, soit un objet avec success et roles
        const rolesArray = Array.isArray(data) ? data : (data.roles || data.data || []);
        console.log('🎭 Rôles reçus du backend:', rolesArray);
        setRoles(rolesArray);
      } else {
        setError(data.message || 'Erreur lors du chargement des rôles');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur lors du chargement des rôles:', err);
    } finally {
      setLoading(false);
      isLoadingRolesRef.current = false;
    }
  };

  // Charger toutes les permissions disponibles
  const loadPermissions = async () => {
    // Charger les permissions une seule fois
    if (permissionsLoadedRef.current || isLoadingPermissionsRef.current) return;
    
    const token = authService.getToken();
    if (!token) return;

    isLoadingPermissionsRef.current = true;
    try {
      const response = await fetch('/api/permissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        // Grouper les permissions par catégorie
        const groupedPermissions: Record<string, Permission[]> = {};
        if (Array.isArray(data)) {
          data.forEach((permission: Permission) => {
            if (!groupedPermissions[permission.category]) {
              groupedPermissions[permission.category] = [];
            }
            groupedPermissions[permission.category].push(permission);
          });
        }
        setPermissions(groupedPermissions);
        permissionsLoadedRef.current = true;
      } else {
        setError(data.message || 'Erreur lors du chargement des permissions');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur lors du chargement des permissions:', err);
    } finally {
      isLoadingPermissionsRef.current = false;
    }
  };

  // Créer un nouveau rôle
  const createRole = async (roleData: {
    nom: string;
    description?: string;
    normeSalariale: number;
    limiteSalaire: number;
    typeContrat: string;
    isDefault: boolean;
    permissions: string[];
  }) => {
    if (!selectedCompany?._id) return { success: false, message: 'Entreprise non sélectionnée' };

    const token = authService.getToken();
    if (!token) return { success: false, message: 'Token manquant' };

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...roleData,
          company: selectedCompany._id
        })
      });

      const data = await response.json();
      if (data.success && data.role) {
        console.log('✅ Rôle créé avec succès:', data.role);
        // Ajouter le nouveau rôle à la liste locale
        setRoles(prev => [data.role, ...prev]);
        // Rafraîchir la liste complète pour être sûr
        setTimeout(() => loadRoles(), 500);
        return { success: true, role: data.role };
      }
      return data;
    } catch (err) {
      console.error('Erreur lors de la création du rôle:', err);
      return { success: false, message: 'Erreur de connexion' };
    }
  };

  // Modifier un rôle existant
  const updateRole = async (roleId: string, roleData: {
    nom: string;
    description?: string;
    normeSalariale: number;
    limiteSalaire: number;
    typeContrat: string;
    isDefault: boolean;
    permissions: string[];
  }) => {
    const token = authService.getToken();
    if (!token) return { success: false, message: 'Token manquant' };

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleData)
      });

      const data = await response.json();
      if (data.success && data.role) {
        setRoles(prev => prev.map(role => 
          role._id === roleId ? data.role : role
        ));
        return { success: true, role: data.role };
      }
      return data;
    } catch (err) {
      console.error('Erreur lors de la modification du rôle:', err);
      return { success: false, message: 'Erreur de connexion' };
    }
  };

  // Supprimer un rôle
  const deleteRole = async (roleId: string) => {
    const token = authService.getToken();
    if (!token) return { success: false, message: 'Token manquant' };

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRoles(prev => prev.filter(role => role._id !== roleId));
        return { success: true, message: data.message };
      }
      return data;
    } catch (err) {
      console.error('Erreur lors de la suppression du rôle:', err);
      return { success: false, message: 'Erreur de connexion' };
    }
  };

  // Mettre à jour les permissions d'un rôle spécifiquement
  const updateRolePermissions = async (roleId: string, permissions: string[]) => {
    const token = authService.getToken();
    if (!token) return { success: false, message: 'Token manquant' };

    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissions })
      });

      const data = await response.json();
      if (data.success && data.role) {
        setRoles(prev => prev.map(role => 
          role._id === roleId ? data.role : role
        ));
        return { success: true, role: data.role, message: data.message };
      }
      return data;
    } catch (err) {
      console.error('Erreur lors de la mise à jour des permissions:', err);
      return { success: false, message: 'Erreur de connexion' };
    }
  };

  // Vérifier si l'utilisateur actuel a une permission spécifique
  const hasPermission = (permissionCode: string): boolean => {
    if (!user || !selectedCompany) return false;

    const userCompany = user.companies?.find(c => c.company === selectedCompany._id);
    if (!userCompany) return false;

    const userRole = roles.find(role => role._id === userCompany.role);
    if (!userRole) return false;

    return userRole.permissions.some(permission => permission.code === permissionCode);
  };

  // Obtenir le rôle de l'utilisateur actuel dans l'entreprise sélectionnée
  const getCurrentUserRole = (): Role | null => {
    if (!user || !selectedCompany) return null;

    const userCompany = user.companies?.find(c => c.company === selectedCompany._id);
    if (!userCompany) return null;

    return roles.find(role => role._id === userCompany.role) || null;
  };

  // Charger les permissions une seule fois au montage
  useEffect(() => {
    loadPermissions();
  }, []);
  
  // Charger les rôles quand l'entreprise change
  useEffect(() => {
    if (selectedCompany?._id) {
      loadRoles();
    }
  }, [selectedCompany?._id]);

  return {
    roles,
    permissions,
    loading,
    error,
    loadRoles,
    loadPermissions,
    createRole,
    updateRole,
    deleteRole,
    updateRolePermissions,
    hasPermission,
    getCurrentUserRole
  };
};
