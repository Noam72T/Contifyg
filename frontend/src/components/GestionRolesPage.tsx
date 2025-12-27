import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Crown,
  X,
  Check,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  FileText,
  Users,
  Settings,
  Clipboard
} from 'lucide-react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import api from '../utils/api';
import { useCompany } from '../contexts/CompanyContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import toast from 'react-hot-toast';

interface Permission {
  _id: string;
  name: string;
  code: string;
  description: string;
  module?: string;
  category: string;
}

interface Role {
  _id: string;
  nom: string;
  description?: string;
  normeSalariale: number;
  limiteSalaire: number;
  typeContrat: 'DIRECTION' | 'CDI' | 'CDD' | 'STAGIAIRE';
  isDefault: boolean;
  permissions: Permission[];
  userCount: number;
  creePar?: {
    firstName: string;
    lastName: string;
  };
  dateCreation?: string;
}

interface CreateRoleForm {
  nom: string;
  description: string;
  normeSalariale: number;
  limiteSalaire: number;
  typeContrat: 'DIRECTION' | 'CDI' | 'CDD' | 'STAGIAIRE';
  isDefault: boolean;
  permissions: string[];
}

const GestionRolesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { } = useUserPermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const itemsPerPage = 10;
  const [formData, setFormData] = useState<CreateRoleForm>({
    nom: '',
    description: '',
    normeSalariale: 35,
    limiteSalaire: 0,
    typeContrat: 'CDI',
    isDefault: false,
    permissions: []
  });

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (selectedCompany && isMounted) {
        
        setRoles([]); // Réinitialiser la liste des rôles
        setLoading(true);
        
        try {
          // Attendre un petit délai pour éviter le rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (isMounted) {
            await fetchRoles();
            await new Promise(resolve => setTimeout(resolve, 200)); // Petit délai entre les requêtes
            await fetchPermissions();
          }
        } catch (error) {
          console.error('Erreur lors du chargement:', error);
        }
      } else if (!selectedCompany) {
        
        setRoles([]);
        setLoading(false);
      }
    };
    
    loadData();
    
    // Cleanup function pour éviter les appels multiples
    return () => {
      isMounted = false;
    };
  }, [selectedCompany]);

  const fetchRoles = async () => {
    if (!selectedCompany?._id) {
      
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 fetchRoles - Début');
      console.log('🏢 Entreprise ID:', selectedCompany._id);
     
      const url = `/roles?companyId=${selectedCompany._id}`;
      console.log('🌐 URL de l\'API:', url);
      
      const response = await api.get(url);
      console.log('📥 Réponse brute de l\'API:', response.data);
      
      const rolesData = response.data.roles || response.data;
      console.log('📊 Données des rôles extraites:', rolesData);
      
      if (Array.isArray(rolesData)) {
        console.log(`📋 Nombre de rôles reçus: ${rolesData.length}`);
        rolesData.forEach((role, index) => {
          console.log(`  ${index + 1}. ${role.nom} (${role._id})`);
        });
      } else {
        console.warn('⚠️ Les données des rôles ne sont pas un tableau:', rolesData);
      }
      
      // Filtrer le rôle technicien qui est un rôle système caché
      const filteredRoles = Array.isArray(rolesData) ? rolesData.filter((role: Role) => {
        // Vérifier que le rôle a bien un nom avant de faire toLowerCase
        if (!role || !role.nom || typeof role.nom !== 'string') {
          console.warn('⚠️ Rôle invalide détecté:', role);
          return false;
        }
        return role.nom.toLowerCase() !== 'technicien';
      }) : [];
      
      console.log(`🔍 Après filtrage: ${filteredRoles.length} rôles`);
      filteredRoles.forEach((role, index) => {
        console.log(`  ${index + 1}. ${role.nom} (${role._id})`);
      });
      
      setRoles(filteredRoles);
      console.log('✅ fetchRoles - Rôles mis à jour dans l\'état');
    } catch (error: any) {
      console.error('Erreur de chargement des rôles:', error.response?.status, error.message);
      console.error('DEBUG: Erreur complète:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
     
      const response = await api.get('/permissions');
      
      
      // Vérifier le format de la réponse
      if (response.data.success && response.data.permissions) {
        
        setPermissions(response.data.permissions);
      } else if (Array.isArray(response.data)) {
        
        setPermissions(response.data);
      } else {
        console.error('Format de permissions inattendu:', response.data);
        setPermissions([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
      setPermissions([]);
    }
  };

  const handleEdit = (role: Role) => {
    
    setEditingRole(role);
    
    // Gérer les permissions selon leur format
    let permissionIds: string[] = [];
    if (role.permissions && Array.isArray(role.permissions)) {
      permissionIds = role.permissions.map(p => {
        if (typeof p === 'string') {
          return p; // Si c'est déjà un ID string
        } else if (p && typeof p === 'object' && p._id) {
          return p._id; // Si c'est un objet avec _id
        }
        return '';
      }).filter(id => id !== '');
    }
    
    setFormData({
      nom: role.nom || '',
      description: role.description || '',
      normeSalariale: role.normeSalariale || 35,
      limiteSalaire: role.limiteSalaire || 0,
      typeContrat: role.typeContrat || 'CDI',
      isDefault: role.isDefault || false,
      permissions: permissionIds
    });
    
   
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormData({
      nom: '',
      description: '',
      normeSalariale: 35,
      limiteSalaire: 0,
      typeContrat: 'CDI',
      isDefault: false,
      permissions: []
    });
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = getPermissionsByCategory()[category] || [];
    const categoryPermissionIds = categoryPermissions.map(p => p._id);
    
    const allSelected = categoryPermissionIds.every(id => formData.permissions.includes(id));
    
    if (allSelected) {
      // Désélectionner toute la catégorie
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => !categoryPermissionIds.includes(id))
      }));
    } else {
      // Sélectionner toute la catégorie
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions.filter(id => !categoryPermissionIds.includes(id)), ...categoryPermissionIds]
      }));
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🎯 handleSubmit appelé');
    
    if (!selectedCompany) {
      console.error('❌ Pas d\'entreprise sélectionnée');
      toast.error('Veuillez sélectionner une entreprise');
      return;
    }
    
    // Validation des champs requis
    if (!formData.nom.trim()) {
      console.error('❌ Nom du rôle manquant');
      toast.error('Le nom du rôle est requis');
      return;
    }

    if (saving) {
      console.log('⏳ Sauvegarde déjà en cours, ignore...');
      return; // Éviter les soumissions multiples
    }

    try {
      setSaving(true);
      
      console.log('🚀 Début de la soumission du rôle');
      console.log('📝 Données du formulaire:', formData);
      console.log('🏢 Entreprise sélectionnée:', selectedCompany);

      const roleData = {
        nom: formData.nom,
        description: formData.description,
        normeSalariale: formData.normeSalariale,
        limiteSalaire: formData.limiteSalaire,
        typeContrat: formData.typeContrat,
        isDefault: formData.isDefault,
        permissions: formData.permissions,
        companyId: selectedCompany._id
      };
      
      console.log('📦 Données à envoyer:', roleData);
      console.log('🔍 Vérifications:');
      console.log('  - nom:', roleData.nom, 'length:', roleData.nom?.length);
      console.log('  - companyId:', roleData.companyId, 'type:', typeof roleData.companyId);
      console.log('  - entreprise complète:', selectedCompany);

      if (editingRole) {
        // Modification d'un rôle existant
        console.log('✏️ Modification du rôle:', editingRole._id);
        const response = await api.put(`/roles/${editingRole._id}`, roleData);
        console.log('✅ Réponse modification:', response.data);
        toast.success('Rôle modifié avec succès !');
      } else {
        // Création d'un nouveau rôle
        console.log('🆕 Création d\'un nouveau rôle');
        const response = await api.post('/roles', roleData);
        console.log('✅ Réponse création:', response.data);
        toast.success('Rôle créé avec succès !');
      }
      
      handleCloseModal();
      
      console.log('🔄 Début du rafraîchissement des rôles...');
      // Forcer le rafraîchissement en mettant à jour l'état loading
      setLoading(true);
      await fetchRoles();
      setLoading(false);
      console.log('✅ Rafraîchissement terminé');
      
    } catch (error: any) {
      console.error('Erreur complète:', error);
      console.error('Réponse du serveur:', error.response?.data);
      
      let errorMessage = 'Erreur lors de la sauvegarde';
      
      if (error.response?.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Route non trouvée. Vérifiez que le serveur est démarré.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Données invalides. Vérifiez les champs requis.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Erreur serveur. ' + (error.response?.data?.message || 'Contactez l\'administrateur.');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    // Afficher un toast de confirmation
    toast((t) => (
      <div className="flex flex-col gap-2">
        <div className="font-medium">Confirmer la suppression</div>
        <div className="text-sm text-muted-foreground">
          Êtes-vous sûr de vouloir supprimer ce rôle ? Cette action est irréversible.
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete(`/roles/${roleId}`);
                toast.success('Rôle supprimé avec succès !');
                await fetchRoles();
              } catch (error: any) {
                console.error('Erreur lors de la suppression:', error);
                toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
              }
            }}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
          >
            Supprimer
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
    });
  };

  const getContractTypeColor = (type: string) => {
    const colors = {
      'DIRECTION': 'bg-purple-500',
      'CDI': 'bg-green-500',
      'CDD': 'bg-blue-500',
      'STAGIAIRE': 'bg-orange-500'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  const getPermissionsByCategory = () => {
    
    
    // Toujours utiliser les permissions de la base de données
    // Si aucune permission n'est chargée, retourner un objet vide
    if (permissions.length === 0) {
      
      return {};
    }

    const permissionsToUse = permissions;
    
    const categories = permissionsToUse.reduce((acc, permission) => {
      
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    
    return categories;
  };

  const filteredRoles = roles.filter(role =>
    (role?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role?.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  console.log(`🔍 Filtrage: ${roles.length} rôles totaux → ${filteredRoles.length} après recherche "${searchTerm}"`);

  // Pagination
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRoles = filteredRoles.slice(startIndex, startIndex + itemsPerPage);
  
  console.log(`📄 Pagination: page ${currentPage}/${totalPages}, affichage de ${paginatedRoles.length} rôles`);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement des rôles...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!selectedCompany) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Gestion des Rôles</h1>
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour continuer.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Rôles</h1>
            <p className="text-muted-foreground">Gérez les rôles et permissions de votre entreprise</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                
                fetchRoles();
              }}
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors flex items-center"
              title="Rafraîchir la liste des rôles"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Rôle
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Roles Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Rôle</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Type de contrat</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Norme salariale</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Limites salariales</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Permissions</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    {roles.length === 0 ? 'Aucun rôle trouvé' : 'Aucun rôle ne correspond à votre recherche'}
                  </td>
                </tr>
              ) : (
                paginatedRoles.map((role) => (
                  <tr key={role._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {role.isDefault && (
                          <Crown className="h-4 w-4 text-yellow-500 mr-2" />
                        )}
                        <span className="font-medium text-foreground">{role.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getContractTypeColor(role.typeContrat)}`}>
                        {role.typeContrat}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">{role.normeSalariale}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">
                        {role.limiteSalaire > 0 ? `$${role.limiteSalaire.toLocaleString()}` : 'Aucune limite'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions && role.permissions.length > 0 ? (
                          role.permissions.slice(0, 3).map((permission, index) => (
                            <span 
                              key={index} 
                              className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {typeof permission === 'string' ? permission : (permission.code || permission.name || 'Permission')}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Aucune permission</span>
                        )}
                        {role.permissions && role.permissions.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{role.permissions.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(role)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(role._id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRoles.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredRoles.length}
          />
        )}

        {/* Modal avec scrollbar masquée et CSS interne */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <style>{`
              .modal-content {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .modal-content::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            <div className="modal-content bg-card/95 backdrop-blur-md rounded-xl shadow-2xl border border-border/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    {editingRole ? 'Modifier le Rôle' : 'Créer un Nouveau Rôle'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nom du Rôle *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      placeholder="Ex: Directeur Général"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Type de Contrat *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['DIRECTION', 'CDI', 'CDD', 'STAGIAIRE'].map((type) => (
                        <label
                          key={type}
                          className={`relative flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 ${
                            formData.typeContrat === type
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background/30 text-muted-foreground'
                          }`}
                        >
                          <input
                            type="radio"
                            name="typeContrat"
                            value={type}
                            checked={formData.typeContrat === type}
                            onChange={(e) => setFormData({ ...formData, typeContrat: e.target.value as any })}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">{type}</span>
                          {formData.typeContrat === type && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Norme Salariale (heures/semaine) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="60"
                      value={formData.normeSalariale}
                      onChange={(e) => setFormData({ ...formData, normeSalariale: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-background/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Limite Salariale (€) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.limiteSalaire}
                      onChange={(e) => setFormData({ ...formData, limiteSalaire: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-background/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                    placeholder="Description du rôle..."
                  />
                </div>

                <div className="flex items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="sr-only"
                    />
                    <label
                      htmlFor="isDefault"
                      className={`flex items-center cursor-pointer ${
                        formData.isDefault ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <div className={`w-5 h-5 border-2 rounded-md mr-3 flex items-center justify-center transition-all ${
                        formData.isDefault 
                          ? 'border-primary bg-primary' 
                          : 'border-border bg-background'
                      }`}>
                        {formData.isDefault && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium">Rôle par défaut</span>
                        <p className="text-xs text-muted-foreground">
                          Ce rôle sera assigné automatiquement aux nouveaux utilisateurs
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Permissions par catégorie avec menus déroulants */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Permissions par Catégorie
                  </label>
                  {permissions.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Chargement des permissions...
                    </div>
                  ) : Object.keys(getPermissionsByCategory()).length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Aucune permission disponible
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => {
                        const allSelected = categoryPermissions.every(p => formData.permissions.includes(p._id));
                        const someSelected = categoryPermissions.some(p => formData.permissions.includes(p._id));
                        const isExpanded = expandedCategories.has(category);
                        
                        const getCategoryIcon = (cat: string) => {
                          switch(cat) {
                            case 'GENERALE': return <BarChart3 className="h-5 w-5" />;
                            case 'PAPERASSE': return <FileText className="h-5 w-5" />;
                            case 'ADMINISTRATION': return <Users className="h-5 w-5" />;
                            case 'GESTION': return <Settings className="h-5 w-5" />;
                            default: return <Clipboard className="h-5 w-5" />;
                          }
                        };
                        
                        const getCategoryName = (cat: string) => {
                          switch(cat) {
                            case 'GENERALE': return 'Général';
                            case 'PAPERASSE': return 'Paperasse';
                            case 'ADMINISTRATION': return 'Administration';
                            case 'GESTION': return 'Gestion';
                            default: return cat;
                          }
                        };

                        return (
                          <div key={category} className="border border-border/50 rounded-lg overflow-hidden">
                            {/* En-tête de catégorie */}
                            <div className="flex items-center justify-between p-3 hover:bg-background/50 transition-colors">
                              <div className="flex items-center space-x-3">
                                <div className="text-primary">{getCategoryIcon(category)}</div>
                                <div>
                                  <h4 className="font-medium text-foreground">{getCategoryName(category)}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {categoryPermissions.filter(p => formData.permissions.includes(p._id)).length}/{categoryPermissions.length} permissions
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {/* Toggle pour toute la catégorie */}
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={() => handleCategoryToggle(category)}
                                    className="sr-only peer"
                                  />
                                  <div className={`relative w-10 h-6 rounded-full peer transition-colors ${
                                    allSelected 
                                      ? 'bg-primary' 
                                      : someSelected 
                                        ? 'bg-primary/50' 
                                        : 'bg-muted'
                                  }`}>
                                    <div className={`absolute top-[2px] left-[2px] bg-white border border-border rounded-full h-5 w-5 transition-transform ${
                                      allSelected ? 'translate-x-full border-white' : ''
                                    }`}></div>
                                  </div>
                                </label>
                                
                                {/* Bouton pour dérouler */}
                                <button
                                  type="button"
                                  onClick={() => toggleCategoryExpansion(category)}
                                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            {/* Liste des permissions individuelles */}
                            {isExpanded && (
                              <div className="border-t border-border/50 bg-background/30 p-3">
                                <div className="space-y-2">
                                  {categoryPermissions.map((permission) => (
                                    <div
                                      key={permission._id}
                                      className="flex items-center justify-between p-2 rounded-lg hover:bg-background/50 transition-colors"
                                    >
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-foreground">{permission.name}</div>
                                        {permission.description && (
                                          <div className="text-xs text-muted-foreground mt-1">{permission.description}</div>
                                        )}
                                      </div>
                                      
                                      {/* Switch moderne pour chaque permission */}
                                      <label className="relative inline-flex items-center cursor-pointer ml-3">
                                        <input
                                          type="checkbox"
                                          checked={formData.permissions.includes(permission._id)}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handlePermissionToggle(permission._id);
                                          }}
                                          className="sr-only peer"
                                        />
                                        <div className={`relative w-8 h-5 rounded-full peer transition-colors ${
                                          formData.permissions.includes(permission._id) 
                                            ? 'bg-primary' 
                                            : 'bg-muted'
                                        }`}>
                                          <div className={`absolute top-[2px] left-[2px] bg-white border border-border rounded-full h-4 w-4 transition-transform ${
                                            formData.permissions.includes(permission._id) ? 'translate-x-3 border-white' : ''
                                          }`}></div>
                                        </div>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-border/50">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 text-muted-foreground bg-muted/50 hover:bg-muted/80 rounded-xl transition-all font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
                        {editingRole ? 'Modification...' : 'Création...'}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2 inline" />
                        {editingRole ? 'Modifier' : 'Créer'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GestionRolesPage;
