import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Trash2, Save, X } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Permission {
  id: string;
  name: string;
  display: string;
  description?: string;
  category: string;
  createdAt?: string;
}

interface Category {
  id: string;
  name: string;
  display: string;
  color: string;
  icon: string;
  order: number;
}

interface PermissionData {
  companyId: string;
  companyName: string;
  permissionLevels: Record<string, { permissions: Permission[] }>;
  categories: Category[];
  availablePermissions: Permission[];
  permissionsByCategory: Record<string, { category: Category; permissions: Permission[] }>;
}

const PermissionConfigPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [permissionData, setPermissionData] = useState<PermissionData | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // États pour les modals
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // États pour les formulaires
  const [permissionForm, setPermissionForm] = useState({
    name: '',
    display: '',
    description: '',
    category: ''
  });
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    display: '',
    color: '#6B7280',
    icon: 'folder',
    customVehicleCategory: ''
  });

  useEffect(() => {
    if (!companyId) return;
    loadPermissionData();
  }, [companyId]);

  const loadPermissionData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/permissions/company/${companyId}`);
      if (response.data.success) {
        setPermissionData(response.data.data);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des permissions:', error);
      setError('Erreur lors du chargement des permissions');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLevelPermissions = (): Permission[] => {
    if (!permissionData?.permissionLevels[selectedLevel.toString()]) return [];
    return permissionData.permissionLevels[selectedLevel.toString()].permissions;
  };

  const togglePermission = (permission: Permission) => {
    if (!permissionData) return;

    const currentPermissions = getCurrentLevelPermissions();
    const isCurrentlySelected = currentPermissions.some(p => p.id === permission.id);
    
    let updatedPermissionIds;
    if (isCurrentlySelected) {
      updatedPermissionIds = currentPermissions.filter(p => p.id !== permission.id).map(p => p.id);
    } else {
      updatedPermissionIds = [...currentPermissions.map(p => p.id), permission.id];
    }

    // Mettre à jour l'état local
    const updatedPermissions = permissionData.availablePermissions.filter(p => 
      updatedPermissionIds.includes(p.id)
    );

    setPermissionData({
      ...permissionData,
      permissionLevels: {
        ...permissionData.permissionLevels,
        [selectedLevel.toString()]: {
          permissions: updatedPermissions
        }
      }
    });
  };

  const savePermissions = async () => {
    if (!permissionData || !companyId) return;

    try {
      setSaving(true);
      const permissionIds = getCurrentLevelPermissions().map(p => p.id);
      
      const response = await api.put(
        `/permissions/company/${companyId}/level/${selectedLevel}`,
        { permissions: permissionIds }
      );

      if (response.data.success) {
        toast.success('Permissions sauvegardées avec succès !');
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des permissions');
    } finally {
      setSaving(false);
    }
  };

  const createPermission = async () => {
    if (!companyId) return;

    try {
      const response = await api.post(`/permissions/company/${companyId}/permission`, permissionForm);
      if (response.data.success) {
        await loadPermissionData();
        setShowPermissionForm(false);
        resetPermissionForm();
        toast.success('Permission créée avec succès !');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la création de la permission');
    }
  };

  const createCategory = async () => {
    if (!companyId) return;

    try {
      const response = await api.post(`/permissions/company/${companyId}/category`, categoryForm);
      if (response.data.success) {
        await loadPermissionData();
        setShowCategoryForm(false);
        resetCategoryForm();
        toast.success('Catégorie créée avec succès !');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la création de la catégorie');
    }
  };

  const deletePermission = async (permissionId: string) => {
    if (!companyId || !confirm('Êtes-vous sûr de vouloir supprimer cette permission ?')) return;

    try {
      const response = await api.delete(`/permissions/company/${companyId}/permission/${permissionId}`);
      if (response.data.success) {
        await loadPermissionData();
        toast.success('Permission supprimée avec succès !');
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la permission');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!companyId || !confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    try {
      const response = await api.delete(`/permissions/company/${companyId}/category/${categoryId}`);
      if (response.data.success) {
        await loadPermissionData();
        toast.success('Catégorie supprimée avec succès !');
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la catégorie');
    }
  };

  const resetPermissionForm = () => {
    setPermissionForm({ name: '', display: '', description: '', category: '' });
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', display: '', color: '#6B7280', icon: 'folder', customVehicleCategory: '' });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Chargement...</div>
        </div>
      </Layout>
    );
  }

  if (error || !permissionData) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Erreur lors du chargement des données'}
          </div>
        </div>
      </Layout>
    );
  }

  const currentPermissions = getCurrentLevelPermissions();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Configuration des Permissions Personnalisées
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Entreprise: {permissionData.companyName} - Créez vos propres permissions et catégories
          </p>
        </div>

        {/* Section de gestion des catégories et permissions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gestion des catégories */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Catégories Personnalisées</h2>
              <Button 
                onClick={() => setShowCategoryForm(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Catégorie
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {permissionData.categories.map(category => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <div className="font-medium">{category.display}</div>
                      <div className="text-sm text-gray-500">{category.name}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteCategory(category.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Gestion des permissions */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Permissions Personnalisées</h2>
              <Button 
                onClick={() => setShowPermissionForm(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Permission
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {permissionData.availablePermissions.map(permission => (
                <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{permission.display}</div>
                    <div className="text-sm text-gray-500">{permission.name}</div>
                    {permission.description && (
                      <div className="text-xs text-gray-400">{permission.description}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deletePermission(permission.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Configuration par niveau */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sélection du niveau */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Niveau de Permission</h2>
            <div className="space-y-3">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    selectedLevel === level
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="font-medium">Niveau {level}</div>
                  <div className="text-sm text-gray-500">
                    {permissionData.permissionLevels[level.toString()]?.permissions?.length || 0} permissions
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Configuration des permissions */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                Permissions pour le Niveau {selectedLevel}
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={savePermissions}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {currentPermissions.length} permission(s) sélectionnée(s)
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(permissionData.permissionsByCategory).map(([categoryId, categoryData]) => (
                <div key={categoryId}>
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: categoryData.category.color }}
                    />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {categoryData.category.display}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryData.permissions.map(permission => {
                      const isSelected = currentPermissions.some(p => p.id === permission.id);
                      return (
                        <button
                          key={permission.id}
                          onClick={() => togglePermission(permission)}
                          className={`p-3 text-left rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-green-500 bg-green-50 dark:bg-green-950'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">
                                {permission.display}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {permission.name}
                              </div>
                              {permission.description && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {permission.description}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">
                                ✓
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Retour
          </Button>
          <div className="text-sm text-gray-500">
            Remarque: Le rôle "Technicien" a automatiquement toutes les permissions
          </div>
        </div>
      </div>

      {/* Modal pour créer une permission */}
      {showPermissionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nouvelle Permission</h3>
              <Button variant="outline" size="sm" onClick={() => {
                setShowPermissionForm(false);
                resetPermissionForm();
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="perm-name">Nom technique</Label>
                <Input
                  id="perm-name"
                  value={permissionForm.name}
                  onChange={(e) => setPermissionForm({...permissionForm, name: e.target.value})}
                  placeholder="ex: can_manage_invoices"
                />
              </div>
              
              <div>
                <Label htmlFor="perm-display">Nom affiché</Label>
                <Input
                  id="perm-display"
                  value={permissionForm.display}
                  onChange={(e) => setPermissionForm({...permissionForm, display: e.target.value})}
                  placeholder="ex: Gérer les factures"
                />
              </div>
              
              <div>
                <Label htmlFor="perm-description">Description (optionnel)</Label>
                <Input
                  id="perm-description"
                  value={permissionForm.description}
                  onChange={(e) => setPermissionForm({...permissionForm, description: e.target.value})}
                  placeholder="ex: Permet de créer, modifier et supprimer les factures"
                />
              </div>
              
              <div>
                <Label htmlFor="perm-category">Catégorie</Label>
                <select
                  id="perm-category"
                  value={permissionForm.category}
                  onChange={(e) => setPermissionForm({...permissionForm, category: e.target.value})}
                  className="w-full p-2 border rounded-lg bg-background"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {permissionData.categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.display}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={createPermission} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  Créer
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowPermissionForm(false);
                  resetPermissionForm();
                }}>
                  Annuler
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal pour créer une catégorie */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nouvelle Catégorie</h3>
              <Button variant="outline" size="sm" onClick={() => {
                setShowCategoryForm(false);
                resetCategoryForm();
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="cat-name">Nom technique</Label>
                <Input
                  id="cat-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  placeholder="ex: facturation"
                />
              </div>
              
              <div>
                <Label htmlFor="cat-display">Nom affiché</Label>
                <Input
                  id="cat-display"
                  value={categoryForm.display}
                  onChange={(e) => setCategoryForm({...categoryForm, display: e.target.value})}
                  placeholder="ex: Facturation"
                />
              </div>
              
              <div>
                <Label htmlFor="cat-color">Couleur</Label>
                <Input
                  id="cat-color"
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                />
              </div>

              {/* Champ catégorie personnalisée pour véhicules */}
              {categoryForm.name.toLowerCase().includes('vehicule') || categoryForm.name.toLowerCase().includes('voiture') || categoryForm.name.toLowerCase().includes('auto') ? (
                <div>
                  <Label htmlFor="cat-custom-vehicle">Catégorie personnalisée véhicule (optionnel)</Label>
                  <Input
                    id="cat-custom-vehicle"
                    value={categoryForm.customVehicleCategory}
                    onChange={(e) => setCategoryForm({...categoryForm, customVehicleCategory: e.target.value})}
                    placeholder="ex: Berline, SUV, Sportive..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cette catégorie sera utilisée pour filtrer les véhicules par type
                  </p>
                </div>
              ) : null}
              
              <div className="flex gap-2 pt-4">
                <Button onClick={createCategory} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  Créer
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowCategoryForm(false);
                  resetCategoryForm();
                }}>
                  Annuler
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default PermissionConfigPage;
