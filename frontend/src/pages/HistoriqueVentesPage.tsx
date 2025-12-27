import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Eye,
  Download,
  DollarSign,
  User,
  Clock,
  TrendingUp,
  Edit,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';

import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { useCompany } from '../contexts/CompanyContext';
import api from '../utils/api';

interface Vente {
  _id: string;
  numeroCommande: string;
  plaque: string;
  customCategory?: string;
  prestations: {
    nom: string;
    quantite: number;
    prixUnitaire: number;
    total: number;
    partenaire?: string;
  }[];
  montantTotal: number;
  commission: number;
  dateVente: string;
  statut: string;
  vendeur: {
    firstName: string;
    lastName: string;
    username: string;
  };
  partenariat?: {
    _id: string;
    nom: string;
  };
}

const HistoriqueVentesPage: React.FC = () => {
  const { hasPermission } = useUserPermissions();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Calculer la semaine courante selon ISO 8601
  const getCurrentWeek = () => {
    const date = new Date();
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };
  
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Vérifier les permissions
  const canManageVentes = hasPermission('MANAGE_VENTES');

  // Charger les ventes avec filtre par semaine
  useEffect(() => {
    const fetchVentes = async () => {
      if (!selectedCompany) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        
        const response = await api.get(`/ventes?companyId=${selectedCompany._id}&week=${selectedWeek}&year=${selectedYear}`);
        
        if (response.data && response.data.ventes) {
          setVentes(response.data.ventes);
          
        } else {
          setVentes([]);
          
        }
      } catch (error) {
        console.error('Erreur lors du chargement des ventes:', error);
        setVentes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVentes();
  }, [selectedCompany, selectedWeek, selectedYear]);


  // Filtrer les ventes selon les critères de recherche et statut
  const filteredVentes = ventes.filter(vente => {
    const matchesSearch = vente.plaque.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vente.numeroCommande.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vente.prestations.some(prestation => prestation.nom.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || vente.statut === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredVentes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVentes = filteredVentes.slice(startIndex, endIndex);

  // Réinitialiser la page courante quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, selectedWeek, selectedYear]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const totalRevenue = filteredVentes
    .filter(vente => vente.statut === 'confirmee')
    .reduce((sum, vente) => sum + vente.montantTotal, 0);

  const totalSales = filteredVentes.filter(vente => vente.statut === 'confirmee').length;
  
  const totalCommission = filteredVentes
    .filter(vente => vente.statut === 'confirmee')
    .reduce((sum, vente) => sum + (vente.commission || 0), 0);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Historique des ventes
              </h1>
              <p className="text-muted-foreground">Ventes de la semaine {selectedWeek} - {selectedYear}</p>
            </div>
            
            {/* Sélecteur de semaine simple et visible */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2">
              <button
                onClick={() => {
                  const newWeek = selectedWeek > 1 ? selectedWeek - 1 : 52;
                  const newYear = selectedWeek > 1 ? selectedYear : selectedYear - 1;
                  setSelectedWeek(newWeek);
                  setSelectedYear(newYear);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Semaine précédente"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              
              <div className="flex items-center gap-1 px-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  S{selectedWeek.toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedYear}
                </span>
              </div>
              
              <button
                onClick={() => {
                  const newWeek = selectedWeek < 53 ? selectedWeek + 1 : 1;
                  const newYear = selectedWeek < 53 ? selectedYear : selectedYear + 1;
                  setSelectedWeek(newWeek);
                  setSelectedYear(newYear);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Semaine suivante"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
          
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary/90 transition-colors">
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-border"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-foreground">{totalRevenue.toFixed(2)}€</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-6 border border-border"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventes réalisées</p>
                <p className="text-2xl font-bold text-foreground">{totalSales}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg p-6 border border-border"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commission totale</p>
                <p className="text-2xl font-bold text-foreground">{totalCommission.toFixed(2)}€</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par client ou prestation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="completed">Terminé</option>
            <option value="pending">En attente</option>
            <option value="cancelled">Annulé</option>
          </select>

        </div>

        {/* Sales Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Chargement des ventes...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Prestations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Partenariat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedVentes.map((vente) => (
                  <motion.tr
                    key={vente._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{vente.plaque || 'Client inconnu'}</div>
                          <div className="text-xs text-muted-foreground">{vente.numeroCommande}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {vente.prestations.map((prestation, index) => (
                          <div key={index} className="text-sm text-foreground">
                            {prestation.quantite}x {prestation.nom} ({prestation.prixUnitaire}€)
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vente.partenariat ? (
                        <div className="flex items-center space-x-2">
                          <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {vente.partenariat.nom.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm text-foreground">{vente.partenariat.nom}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Aucun</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                        {vente.customCategory || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">{vente.montantTotal.toFixed(2)}€</div>
                      <div className="text-xs text-muted-foreground">Commission: {(vente.commission || 0).toFixed(2)}€</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(vente.dateVente)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vente.statut)}`}>
                        {getStatusText(vente.statut)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button className="text-primary hover:text-primary/80 p-1" title="Voir les détails">
                          <Eye className="h-4 w-4" />
                        </button>
                        {canManageVentes && (
                          <button className="text-blue-600 hover:text-blue-800 p-1" title="Modifier">
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination standard comme les autres pages */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredVentes.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />

        {!loading && filteredVentes.length === 0 && (
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground mb-1">Aucune vente cette semaine</p>
                <p className="text-muted-foreground">Aucune vente trouvée pour la semaine S{selectedWeek} {selectedYear}.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HistoriqueVentesPage;
