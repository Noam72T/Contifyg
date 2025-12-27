import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Users, 
  Clock,
  DollarSign,
  Save,
  X
} from 'lucide-react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Company {
  _id: string;
  nom: string;
  email: string;
  createdAt: string;
  timerPermission: {
    isAuthorized: boolean;
    authorizedBy?: {
      username: string;
      nom?: string;
      prenom?: string;
    };
    authorizedAt?: string;
    features: {
      canCreateVehicles: boolean;
      canUseTimers: boolean;
      autoCreateSales: boolean;
      maxVehicles: number;
    };
    restrictions: {
      maxSessionDuration: number;
      requireApproval: boolean;
      approvalThreshold: number;
    };
    statistics: {
      totalSessions: number;
      totalRevenue: number;
      lastUsed?: string;
    };
    notes?: string;
  };
}

interface GlobalStats {
  totalCompanies: number;
  authorizedCompanies: number;
  totalSessions: number;
  totalRevenue: number;
}

const TimerAdminPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { user } = useAuth();

  // Vérifier que l'utilisateur est Technicien
  const isTechnician = user?.systemRole === 'Technicien';

  useEffect(() => {
    if (isTechnician) {
      loadCompanies();
      loadGlobalStats();
    }
  }, [isTechnician]);

  const loadCompanies = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timer-permissions/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      } else {
        toast.error('Erreur lors du chargement des entreprises');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des entreprises');
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalStats = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timer-permissions/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGlobalStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleToggleAuthorization = async (companyId: string, isAuthorized: boolean) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timer-permissions/authorize/${companyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAuthorized })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadCompanies();
        loadGlobalStats();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification des permissions');
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company._id);
    setEditForm({
      features: { ...company.timerPermission.features },
      restrictions: { ...company.timerPermission.restrictions },
      notes: company.timerPermission.notes || ''
    });
  };

  const handleSaveEdit = async (companyId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timer-permissions/authorize/${companyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        toast.success('Paramètres mis à jour avec succès');
        setEditingCompany(null);
        loadCompanies();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isTechnician) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">Cette page est réservée aux Techniciens.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Administration des Timers
          </h1>
          <p className="text-muted-foreground">Gérer les permissions et autorisations des entreprises</p>
        </div>

        {/* Statistiques globales */}
        {globalStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Entreprises totales</p>
                  <p className="text-2xl font-bold text-foreground">{globalStats.totalCompanies}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Autorisées</p>
                  <p className="text-2xl font-bold text-foreground">{globalStats.authorizedCompanies}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Sessions totales</p>
                  <p className="text-2xl font-bold text-foreground">{globalStats.totalSessions}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Revenus totaux</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(globalStats.totalRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des entreprises */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-foreground">Entreprises et Permissions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium text-foreground">Entreprise</th>
                  <th className="text-center p-4 font-medium text-foreground">Statut</th>
                  <th className="text-center p-4 font-medium text-foreground">Sessions</th>
                  <th className="text-center p-4 font-medium text-foreground">Revenus</th>
                  <th className="text-center p-4 font-medium text-foreground">Dernière utilisation</th>
                  <th className="text-center p-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company._id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">{company.nom}</p>
                        <p className="text-sm text-muted-foreground">{company.email}</p>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {company.timerPermission.isAuthorized ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Autorisé</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Non autorisé</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-sm font-medium text-foreground">
                        {company.timerPermission.statistics.totalSessions}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(company.timerPermission.statistics.totalRevenue)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(company.timerPermission.statistics.lastUsed)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleAuthorization(company._id, !company.timerPermission.isAuthorized)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            company.timerPermission.isAuthorized
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                          }`}
                        >
                          {company.timerPermission.isAuthorized ? 'Révoquer' : 'Autoriser'}
                        </button>
                        <button
                          onClick={() => handleEditCompany(company)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title="Paramètres"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal d'édition */}
        {editingCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-foreground">Paramètres de l'entreprise</h3>
                <button
                  onClick={() => setEditingCompany(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Fonctionnalités */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Fonctionnalités</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editForm.features?.canCreateVehicles || false}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          features: { ...editForm.features, canCreateVehicles: e.target.checked }
                        })}
                        className="rounded"
                      />
                      <span className="text-sm text-foreground">Peut créer des véhicules</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editForm.features?.canUseTimers || false}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          features: { ...editForm.features, canUseTimers: e.target.checked }
                        })}
                        className="rounded"
                      />
                      <span className="text-sm text-foreground">Peut utiliser les timers</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editForm.features?.autoCreateSales || false}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          features: { ...editForm.features, autoCreateSales: e.target.checked }
                        })}
                        className="rounded"
                      />
                      <span className="text-sm text-foreground">Créer automatiquement les ventes</span>
                    </label>
                  </div>
                </div>

                {/* Limites */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Limites</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-foreground mb-1">Véhicules max</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editForm.features?.maxVehicles || 10}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          features: { ...editForm.features, maxVehicles: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-foreground mb-1">Durée session max (min)</label>
                      <input
                        type="number"
                        min="60"
                        max="1440"
                        value={editForm.restrictions?.maxSessionDuration || 480}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          restrictions: { ...editForm.restrictions, maxSessionDuration: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm text-foreground mb-1">Notes</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    rows={3}
                    placeholder="Notes sur cette entreprise..."
                  />
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingCompany(null)}
                    className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleSaveEdit(editingCompany)}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TimerAdminPage;
