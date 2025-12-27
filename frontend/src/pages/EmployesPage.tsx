import React, { useState, useEffect } from 'react';
import { Edit, Trash2, UserPlus, Shield, Users, Plus, X, UserCog } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import InviteEmployeeModal from '../components/InviteEmployeeModal';
import { useAuth } from '../contexts/AuthContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
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
}

interface Employe {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  compteBancaire?: string;
  discordId?: string;
  discordUsername?: string;
  avatar?: string; // Photo de profil de l'utilisateur
  role?: {
    _id?: string;
    nom?: string;
    name?: string;
  } | null;
  createdAt: string;
  isActive: boolean;
}

const EmployesPage: React.FC = () => {
  const { selectedCompany, selectedCompanyId, companyData } = useCompany();
  const { user } = useAuth();
  const { hasPermission } = useUserPermissions();
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employe | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    compteBancaire: '',
    discordId: '',
    discordUsername: ''
  });

  const itemsPerPage = 8;

  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmployees();
      fetchRoles();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    // Ne pas recharger si on vient de faire une assignation de rôle
    // pour éviter d'écraser les changements locaux
  }, [companyData]);

  const fetchRoles = async () => {
    if (!selectedCompanyId) return;
    
    try {
      const response = await api.get(`/roles?companyId=${selectedCompanyId}`);
      const rolesData = response.data.roles || response.data;
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
      toast.error('Erreur lors du chargement des rôles');
    }
  };


  const assignRole = async (employeeId: string, roleId: string) => {
    try {
      console.log('🔄 Assignation du rôle:', { employeeId, roleId });
      
      // Appel API pour sauvegarder en base de données
      const response = await api.put(`/users/${employeeId}/role`, {
        roleId: roleId
      });
      
      console.log('✅ Réponse API assignation rôle:', response.data);
      
      // Trouver le rôle assigné pour la mise à jour immédiate
      const assignedRole = roles.find(role => role._id === roleId);
      
      // Mettre à jour immédiatement l'état local
      setEmployes(prevEmployes => 
        prevEmployes.map(emp => 
          emp._id === employeeId 
            ? { ...emp, role: assignedRole ? { _id: assignedRole._id, nom: assignedRole.nom } : null }
            : emp
        )
      );
      
      toast.success('Rôle assigné avec succès et sauvegardé');
      
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'assignation du rôle:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'assignation du rôle';
      toast.error(errorMessage);
      
      // En cas d'erreur, recharger les données pour éviter l'incohérence
      fetchEmployees();
    }
  };

  const handleEditEmployee = (employe: Employe) => {
    // Vérification des permissions - Techniciens OU permission MANAGE_EMPLOYES
    if (user?.systemRole !== 'Technicien' && !hasPermission('MANAGE_EMPLOYES')) {
      toast.error('Vous n\'avez pas les permissions pour modifier les employés');
      return;
    }
    
    setSelectedEmployee(employe);
    setEditFormData({
      firstName: employe.firstName,
      lastName: employe.lastName,
      phoneNumber: employe.phoneNumber || '',
      compteBancaire: employe.compteBancaire || '',
      discordId: employe.discordId || '',
      discordUsername: employe.discordUsername || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEmployee = async () => {
    if (!selectedEmployee) return;
    
    try {
      const response = await api.put(`/users/${selectedEmployee._id}`, editFormData);
      
      if (response.data.success) {
        // Mettre à jour l'employé dans la liste
        setEmployes(prev => 
          prev.map(emp => 
            emp._id === selectedEmployee._id 
              ? { ...emp, ...editFormData }
              : emp
          )
        );
        
        toast.success('Employé modifié avec succès');
        setShowEditModal(false);
        setSelectedEmployee(null);
      }
    } catch (error: any) {
      console.error('Erreur lors de la modification:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la modification de l\'employé';
      toast.error(errorMessage);
    }
  };

  const handleDeleteEmployee = async (employeId: string, employeName: string) => {
    if (user?.systemRole !== 'Technicien' && !hasPermission('MANAGE_EMPLOYES')) {
      toast.error('Seuls les techniciens peuvent virer les employés');
      return;
    }
    
    // Afficher un toast de confirmation
    toast((t) => (
      <div className="flex flex-col gap-2">
        <div className="font-medium">Confirmer le licenciement</div>
        <div className="text-sm text-muted-foreground">
          Êtes-vous sûr de vouloir virer <strong>{employeName}</strong> ? Cette action est irréversible.
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete(`/users/${employeId}`);
                setEmployes(prev => prev.filter(emp => emp._id !== employeId));
                toast.success(`${employeName} a été viré avec succès`);
              } catch (error: any) {
                console.error('Erreur lors de la suppression:', error);
                const errorMessage = error.response?.data?.message || 'Erreur lors de la suppression de l\'employé';
                toast.error(errorMessage);
              }
            }}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
          >
            Virer l'employé
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

  const handleOpenRoleModal = (employe: Employe) => {
    if (!hasPermission('ASSIGN_EMPLOYEE_ROLES')) {
      toast.error('Vous n\'avez pas les permissions pour assigner des rôles');
      return;
    }
    setSelectedEmployee(employe);
    setShowRoleModal(true);
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Vérifier si l'utilisateur est Technicien
      const isTechnician = user?.systemRole === 'Technicien';
      
      // Faire un appel API selon le contexte
      let response;
      if (selectedCompanyId) {
        response = await api.get(`/companies/${selectedCompanyId}/employees`);
      } else if (isTechnician) {
        // Pour les Techniciens sans entreprise sélectionnée, récupérer tous les utilisateurs
        response = await api.get('/users');
      } else {
        // Utilisateur normal sans entreprise sélectionnée
        setEmployes([]);
        setLoading(false);
        return;
      }
      
      if (response && response.data.success) {
        // Adapter le format des données pour correspondre à l'interface Employe
        const adaptedEmployes = (response.data.users || []).map((user: any) => {
         
          
          // Priorité : companies[0].role > role > systemRole comme fallback
          let finalRole = null;
          if (user.companies?.[0]?.role) {
            finalRole = user.companies[0].role;
          } else if (user.role) {
            finalRole = user.role;
          }
          
        
          
          return {
            _id: user._id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email || 'N/A',
            phoneNumber: user.phoneNumber || '',
            compteBancaire: user.compteBancaire || '',
            discordId: user.discordId || '',
            discordUsername: user.discordUsername || '',
            avatar: user.avatar, // Inclure la photo de profil
            role: finalRole,
            createdAt: user.createdAt || new Date().toISOString(),
            isActive: user.isActive !== false
          };
        });
        
        
        setEmployes(adaptedEmployes);
      } else {
        setEmployes([]);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des employés:', error);
      // Ne pas afficher d'erreur pour les erreurs 429 (trop de requêtes)
      if (error.response?.status !== 429) {
        toast.error('Erreur lors du chargement des employés');
      }
      setEmployes([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };


  // Filtrer les employés
  const filteredEmployes = employes.filter(employe => {
    const matchesSearch = 
      `${employe.firstName} ${employe.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employe.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employe.role?.nom || employe.role?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEmployes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployes = filteredEmployes.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pour les Techniciens, permettre l'affichage même sans entreprise sélectionnée
  const isTechnician = user?.systemRole === 'Technicien';
  
  if (!selectedCompany && !isTechnician) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour voir les employés.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chargement des employés...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
      <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
                Tableau de bord
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-3 h-3 text-muted-foreground mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Liste du personnel</span>
              </div>
            </li>
          </ol>
        </nav>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Liste du personnel</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Numéro</span>
              <Input 
                placeholder="Filtrer par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Colonnes</span>
              {(user?.systemRole === 'Technicien' || hasPermission('MANAGE_EMPLOYES')) && (
                <Button 
                  onClick={() => setShowInviteModal(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Inviter un employé
                </Button>
              )}
            </div>
          </div>
        </div>


        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total employés</p>
                    <p className="text-2xl font-bold text-foreground">{filteredEmployes.length}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Employés actifs</p>
                    <p className="text-2xl font-bold text-foreground">
                      {filteredEmployes.filter(emp => emp.isActive).length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <Users className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sans rôle assigné</p>
                    <p className="text-2xl font-bold text-foreground">
                      {filteredEmployes.filter(emp => !emp.role?.nom && !emp.role?.name).length}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <UserCog className="w-6 h-6 text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>

        {/* Tableau des employés */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              {filteredEmployes.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Aucun employé trouvé</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-medium text-foreground">Employé</th>
                          <th className="text-left p-4 font-medium text-foreground">Rôle</th>
                          <th className="text-left p-4 font-medium text-foreground">Contact</th>
                          <th className="text-left p-4 font-medium text-foreground">Discord</th>
                          <th className="text-left p-4 font-medium text-foreground">Compte bancaire</th>
                          <th className="text-left p-4 font-medium text-foreground">Date d'ajout</th>
                          <th className="text-center p-4 font-medium text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedEmployes.map((employe) => (
                          <tr key={employe._id} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                                  {employe.avatar ? (
                                    <img 
                                      src={employe.avatar} 
                                      alt={`${employe.firstName} ${employe.lastName}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // En cas d'erreur de chargement, cacher l'image et afficher l'icône
                                        const target = e.currentTarget as HTMLImageElement;
                                        target.style.display = 'none';
                                        const sibling = target.nextElementSibling as HTMLElement;
                                        if (sibling) {
                                          sibling.style.display = 'flex';
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <Users 
                                    className={`w-5 h-5 text-primary ${employe.avatar ? 'hidden' : 'flex'}`}
                                  />
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium text-foreground">
                                    {employe.firstName} {employe.lastName}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">@{employe.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">
                                  {employe.role?.nom || employe.role?.name || 'Aucun rôle'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">
                                <p className="text-foreground">{employe.email}</p>
                                {employe.phoneNumber && (
                                  <p className="text-muted-foreground">{employe.phoneNumber}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">
                                {employe.discordUsername ? (
                                  <div>
                                    <p className="text-foreground">@{employe.discordUsername}</p>
                                    {employe.discordId && (
                                      <p className="text-muted-foreground text-xs">ID: {employe.discordId}</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">Non renseigné</p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">
                                {employe.compteBancaire ? (
                                  <p className="text-foreground font-mono">{employe.compteBancaire}</p>
                                ) : (
                                  <p className="text-muted-foreground">Non renseigné</p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-muted-foreground">
                                {formatDate(employe.createdAt)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                {/* Bouton modifier - visible seulement pour les Techniciens */}
                                {(user?.systemRole === 'Technicien' || hasPermission('MANAGE_EMPLOYES')) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleEditEmployee(employe)}
                                    title="Modifier l'employé"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                                
                                {/* Bouton licencier - visible seulement pour les Techniciens */}
                                {(user?.systemRole === 'Technicien' || hasPermission('MANAGE_EMPLOYES')) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDeleteEmployee(employe._id, `${employe.firstName} ${employe.lastName}`)}
                                    title="Virer l'employé"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                                
                                {/* Bouton assigner rôle - visible si ASSIGN_EMPLOYEE_ROLES */}
                                {hasPermission('ASSIGN_EMPLOYEE_ROLES') && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleOpenRoleModal(employe)}
                                    title="Assigner un rôle"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <UserPlus className="h-3 w-3" />
                                  </Button>
                                )}
                                
                                {/* Si aucune permission, afficher juste le rôle */}
                                {user?.systemRole !== 'Technicien' && !hasPermission('MANAGE_EMPLOYES') && !hasPermission('ASSIGN_EMPLOYEE_ROLES') && (
                                  <span className="px-2 py-1 text-xs text-muted-foreground">
                                    {employe.role?.nom || 'Aucun rôle'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredEmployes.length}
                  />
                </>
              )}
            </div>
        </div>

        {employes.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">Aucun employé trouvé</p>
            <p className="text-muted-foreground">Commencez par inviter des employés à rejoindre votre entreprise.</p>
          </div>
        )}
        {/* Modal d'invitation */}
        <InviteEmployeeModal 
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />

        {/* Modal d'assignation de rôle */}
        {showRoleModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-card to-card/95 rounded-2xl shadow-2xl border border-border/50 max-w-lg w-full backdrop-blur-sm">
              {/* Header avec gradient */}
              <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 p-6 rounded-t-2xl border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        Assigner un rôle
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedEmployee(null);
                    }}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Rôle actuel:</span>
                  </div>
                  <span className="px-2 py-1 bg-muted/50 rounded-md text-foreground font-medium">
                    {selectedEmployee.role?.nom || 'Aucun rôle'}
                  </span>
                </div>
              </div>
              
              {/* Body avec custom scrollbar */}
              <div className="p-6">
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {roles.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted/30 rounded-full flex items-center justify-center">
                        <UserCog className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">Aucun rôle disponible</p>
                      <p className="text-xs text-muted-foreground mt-1">Contactez un administrateur</p>
                    </div>
                  ) : (
                    roles.map((role, index) => (
                      <button
                        key={role._id}
                        onClick={() => {
                          assignRole(selectedEmployee._id, role._id);
                          setShowRoleModal(false);
                          setSelectedEmployee(null);
                        }}
                        className={`group w-full p-4 text-left border rounded-xl transition-all duration-200 flex items-center justify-between hover:shadow-md ${
                          selectedEmployee.role?.nom === role.nom 
                            ? 'border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5 shadow-lg shadow-primary/10' 
                            : 'border-border/50 hover:border-primary/30 hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent'
                        }`}
                        style={{
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${
                            selectedEmployee.role?.nom === role.nom 
                              ? 'bg-primary/20' 
                              : 'bg-muted/30 group-hover:bg-primary/10'
                          }`}>
                            <Shield className={`h-4 w-4 ${
                              selectedEmployee.role?.nom === role.nom 
                                ? 'text-primary' 
                                : 'text-muted-foreground group-hover:text-primary'
                            }`} />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{role.nom}</div>
                            <div className="text-sm text-muted-foreground">{role.typeContrat}</div>
                            {role.description && (
                              <div className="text-xs text-muted-foreground mt-1 opacity-80">{role.description}</div>
                            )}
                          </div>
                        </div>
                        
                        {selectedEmployee.role?.nom === role.nom && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <span className="text-primary text-sm font-medium">Actuel</span>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-border/30">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedEmployee(null);
                    }}
                    className="w-full py-3 border-border/50 hover:bg-muted/50 transition-all duration-200"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de modification d'employé */}
        {showEditModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Edit className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Modifier l'employé
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEditModal(false)}
                    className="h-8 w-8 p-0 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Formulaire */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={editFormData.firstName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={editFormData.lastName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                      placeholder="Nom"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phoneNumber}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Compte bancaire
                  </label>
                  <input
                    type="text"
                    value={editFormData.compteBancaire}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permettre vide ou seulement des chiffres (max 7)
                      if (value === '' || (/^\d+$/.test(value) && value.length <= 7)) {
                        setEditFormData(prev => ({ ...prev, compteBancaire: value }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                    placeholder="Compte bancaire (chiffres uniquement, max 7)"
                    maxLength={7}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Discord ID
                    </label>
                    <input
                      type="text"
                      value={editFormData.discordId}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, discordId: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                      placeholder="123456789012345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Nom Discord
                    </label>
                    <input
                      type="text"
                      value={editFormData.discordUsername}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, discordUsername: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                      placeholder="username#1234"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border bg-muted/20">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveEmployee}
                    className="px-4 py-2 bg-primary hover:bg-primary/90"
                  >
                    Sauvegarder
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Custom scrollbar styles */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary))/0.5 100%);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary))/0.7 100%);
          }
        `}</style>
    </Layout>
  );
};

export default EmployesPage;
