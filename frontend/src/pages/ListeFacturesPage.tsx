import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCompany } from '../contexts/CompanyContext';
import { Button } from '../components/ui/button';
import { Eye, Download, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Facture {
  _id: string;
  numero: string;
  numeroFacture?: string;
  client: {
    nom: string;
    email?: string;
  };
  destinataire?: {
    nom: string;
    entreprise: string;
  };
  montantTTC: number;
  montantTotal?: number;
  statut: string;
  createdAt: string;
  dateCreation?: string;
  dateEnvoi?: string;
  partenariat?: {
    nom: string;
    entreprisePartenaire: string;
  };
}

const ListeFacturesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Calculer la semaine courante selon ISO 8601 (calcul correct)
  const getCurrentWeek = () => {
    const now = new Date();
    const year = now.getFullYear();
    
    // Calcul ISO 8601 correct
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay() || 7; // Dimanche = 7, Lundi = 1
    
    // Calculer le premier jeudi de l'année
    const firstThursday = new Date(jan1);
    if (jan1Day <= 4) {
      // Si le 1er janvier est lundi, mardi, mercredi ou jeudi
      firstThursday.setDate(jan1.getDate() + (4 - jan1Day));
    } else {
      // Si le 1er janvier est vendredi, samedi ou dimanche
      firstThursday.setDate(jan1.getDate() + (11 - jan1Day));
    }
    
    // Le lundi de la semaine 1 est 3 jours avant le premier jeudi
    const firstMonday = new Date(firstThursday);
    firstMonday.setDate(firstThursday.getDate() - 3);
    
    // Calculer le nombre de jours depuis le premier lundi
    const daysSinceFirstMonday = Math.floor((now.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000));
    
    // Calculer le numéro de semaine
    const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;
    
    console.log('🗓️ Calcul semaine courante (Factures):', {
      date: now.toLocaleDateString('fr-FR'),
      weekNumber,
      firstThursday: firstThursday.toLocaleDateString('fr-FR'),
      firstMonday: firstMonday.toLocaleDateString('fr-FR'),
      daysSinceFirstMonday
    });
    
    return Math.max(1, Math.min(53, weekNumber));
  };
  
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Même valeur que VentesPage

  useEffect(() => {
    if (selectedCompany) {
      fetchFactures();
    }
  }, [selectedCompany, selectedWeek, selectedYear]);

  // Réinitialiser la page courante quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWeek, selectedYear]);

  // Pagination côté client comme VentesPage
  const totalPages = Math.ceil(factures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFactures = factures.slice(startIndex, endIndex);

  const fetchFactures = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/factures?companyId=${selectedCompany?._id}&week=${selectedWeek}&year=${selectedYear}`);
      if (response.data.success) {
        setFactures(response.data.factures || []);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      setFactures([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      useGrouping: false
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const handleViewFacture = (factureId: string) => {
    // Ouvrir l'aperçu de la facture dans un nouvel onglet
    window.open(`${api.defaults.baseURL}/factures/${factureId}/preview`, '_blank');
  };

  const handleDownloadFacture = async (factureId: string, numeroFacture: string) => {
    try {
      const response = await api.get(`/factures/${factureId}/download`, {
        responseType: 'blob'
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${numeroFacture}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Facture téléchargée avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error('Erreur lors du téléchargement de la facture');
    }
  };



  const filteredFactures = paginatedFactures.filter(facture => {
    const matchesSearch = 
      (facture.numero || facture.numeroFacture)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (facture.destinataire?.entreprise || facture.client?.nom)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facture.partenariat?.nom?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedWeek(getCurrentWeek());
    setSelectedYear(new Date().getFullYear());
    setCurrentPage(1);
  };


  if (!selectedCompany) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour voir les factures.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
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
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Liste des factures</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Liste des Factures</h1>
              <p className="text-muted-foreground">Factures de la semaine {selectedWeek} - {selectedYear}</p>
            </div>
            
            {/* Sélecteur de semaine */}
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
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filtres</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-lg border border-border p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Recherche générale</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Numéro, entreprise, partenariat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tableau des factures */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Chargement des factures...</p>
              </div>
            ) : factures.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Aucune facture trouvée pour cette semaine</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-foreground">Numéro</th>
                      <th className="text-left p-4 font-medium text-foreground">Destinataire</th>
                      <th className="text-left p-4 font-medium text-foreground">Partenariat</th>
                      <th className="text-left p-4 font-medium text-foreground">Montant</th>
                      <th className="text-left p-4 font-medium text-foreground">Date création</th>
                      <th className="text-left p-4 font-medium text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFactures.map((facture) => (
                      <tr key={facture._id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-sm font-medium">
                            {facture.numero || facture.numeroFacture}
                          </span>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{facture.destinataire?.entreprise || facture.client?.nom}</p>
                            {(facture.destinataire?.nom || facture.client?.email) && (
                              <p className="text-sm text-muted-foreground">{facture.destinataire?.nom || facture.client?.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {facture.partenariat ? (
                            <div>
                              <p className="font-medium">{facture.partenariat.nom}</p>
                              <p className="text-sm text-muted-foreground">{facture.partenariat.entreprisePartenaire}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-green-600">
                            {formatCurrency(facture.montantTTC || facture.montantTotal || 0)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatDate(facture.createdAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              title="Voir la facture"
                              onClick={() => handleViewFacture(facture._id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              title="Télécharger PDF"
                              onClick={() => handleDownloadFacture(facture._id, facture.numero || facture.numeroFacture || 'facture')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
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
          totalItems={factures.length}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </Layout>
  );
};

export default ListeFacturesPage;
