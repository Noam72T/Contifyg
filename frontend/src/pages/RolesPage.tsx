import React, { useState, useEffect } from 'react';
import { Shield, Plus, UserCog, Users, Settings } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import Layout from '../components/Layout';
import RolePermissionsModal from './RolePermissionsModal';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Permission {
  _id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
}

interface Role {
  _id: string;
  nom: string;
  typeContrat: string;
  description?: string;
  permissions?: Permission[];
  userCount?: number;
  company?: {
    _id: string;
    name: string;
  };
  creePar?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  dateCreation?: string;
}

const RolesPage: React.FC = () => {
  const { selectedCompanyId } = useCompany();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchRoles();
    }
  }, [selectedCompanyId]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      
      
      const response = await api.get(`/roles?companyId=${selectedCompanyId}`);
      
      
      if (Array.isArray(response.data)) {
        setRoles(response.data);
      } else {
        console.error('Format de réponse inattendu:', response.data);
        setRoles([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des rôles:', error);
      toast.error('Erreur lors du chargement des rôles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.typeContrat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    const colors = {
      'GENERALE': 'bg-blue-100 text-blue-800',
      'PAPERASSE': 'bg-green-100 text-green-800',
      'ADMINISTRATION': 'bg-yellow-100 text-yellow-800',
      'GESTION': 'bg-purple-100 text-purple-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getUniqueCategories = (permissions: Permission[] = []) => {
    const categories = new Set(permissions.map(p => p.category));
    return Array.from(categories);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                Gestion des Rôles
              </h1>
              <p className="text-muted-foreground mt-1">
                Gérez les rôles et permissions de votre entreprise
              </p>
            </div>
            <Button
              onClick={() => toast('Fonctionnalité en cours de développement')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau rôle
            </Button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un rôle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredRoles.length} rôle{filteredRoles.length > 1 ? 's' : ''} trouvé{filteredRoles.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <div key={role._id} className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
              {/* Role Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg">{role.nom}</h3>
                    <p className="text-sm text-muted-foreground">{role.typeContrat}</p>
                  </div>
                  <Shield className="h-6 w-6 text-blue-600 flex-shrink-0" />
                </div>
                
                {role.description && (
                  <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    {role.permissions?.length || 0} permissions
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {role.userCount || 0} utilisateurs
                  </span>
                </div>
              </div>

              {/* Permissions Preview */}
              <div className="p-6">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">Catégories d'accès</h4>
                  <div className="flex flex-wrap gap-2">
                    {getUniqueCategories(role.permissions).length > 0 ? (
                      getUniqueCategories(role.permissions).map((category) => (
                        <span
                          key={category}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}
                        >
                          {category}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Aucune permission assignée</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRole(role);
                      setShowPermissionsModal(true);
                    }}
                    className="flex-1"
                  >
                    <UserCog className="h-3 w-3 mr-1" />
                    Gérer permissions
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-3"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Footer */}
              {role.creePar && (
                <div className="px-6 py-3 bg-muted/20 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Créé par {role.creePar.firstName} {role.creePar.lastName}
                    {role.dateCreation && (
                      <span> • {new Date(role.dateCreation).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredRoles.length === 0 && !loading && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
            <Shield className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? 'Aucun rôle trouvé' : 'Aucun rôle configuré'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm 
                ? 'Essayez de modifier votre recherche ou créez un nouveau rôle.'
                : 'Créez des rôles pour organiser les permissions de vos employés.'
              }
            </p>
            <Button 
              onClick={() => toast('Fonctionnalité en cours de développement')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier rôle
            </Button>
          </div>
        )}

        {/* Modal de gestion des permissions */}
        <RolePermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => setShowPermissionsModal(false)}
          role={selectedRole}
          onRoleUpdated={() => {
            fetchRoles();
            setShowPermissionsModal(false);
          }}
        />
      </div>
    </Layout>
  );
};

export default RolesPage;
