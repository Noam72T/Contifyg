import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { useService } from '../contexts/ServiceContext';
import api from '../utils/api';

interface Prestation {
  prestationId: string;
  nom: string;
  quantite: number;
  prixUnitaire: number;
  prixUsine: number;
  commission: number;
  total: number;
  category: string;
  partner?: string;
}

interface Vente {
  _id?: string;
  numeroCommande?: string;
  plaque?: string;
  customCategory?: string;
  partenariat?: string;
  client?: {
    nom?: string;
    email?: string;
    telephone?: string;
  };
  prestations?: Prestation[];
  sousTotal?: number;
  totalCommission?: number;
  totalPrixUsine?: number;
  montantTotal?: number;
  dateVente?: string;
  heureVente?: string;
  vendeur?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  vendeurNom?: string;
  statut?: 'confirmee' | 'annulee';
  modePaiement?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Champs pour les ventes API GLife
  source?: 'glife_api' | 'timer_auto' | string;
  type?: 'production' | 'invoice';
  amount?: number;
  // Champs spécifiques API GLife
  id?: number;
  name?: string;
  total?: number;
  revenue?: string;
  [key: string]: any; // Pour les autres champs de l'API GLife
}

const VentesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { isInService, isLoading: serviceLoading } = useService();
  // Permissions supprimées car tous les utilisateurs voient seulement leurs ventes personnelles
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Calculer la semaine courante selon ISO 8601 (calcul correct)
  const getCurrentWeek = () => {
    const now = new Date();
    const year = now.getFullYear();
    
    // Calcul ISO 8601 correct (même logique que les autres pages)
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
    
    console.log('🗓️ Calcul semaine courante (Ventes):', {
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
  const itemsPerPage = 9; // Réduire à 5 pour voir la pagination avec 10 ventes
  

  useEffect(() => {
    if (selectedCompany) {
      fetchVentes();
    }
  }, [selectedCompany, selectedWeek, selectedYear]);

  // Réinitialiser la page courante quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWeek, selectedYear]);

  // Pagination
  const totalPages = Math.ceil(ventes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVentes = ventes.slice(startIndex, endIndex);

  const fetchVentes = async () => {
    try {
      setLoading(true);
      
      // TOUS les utilisateurs voient seulement leurs propres ventes dans l'historique
      // Peu importe les permissions, cette page affiche uniquement les ventes personnelles
      const userOnlyParam = '&userOnly=true';
      
      console.log('� Chargement historique des ventes personnelles:', {
        userId: user?._id,
        username: user?.username,
        systemRole: user?.systemRole,
        userOnlyParam,
        url: `/ventes?companyId=${selectedCompany?._id}&week=${selectedWeek}&year=${selectedYear}${userOnlyParam}`
      });
      
      const response = await api.get(`/ventes?companyId=${selectedCompany?._id}&week=${selectedWeek}&year=${selectedYear}${userOnlyParam}`);
      
      console.log('📊 Réponse API ventes historique:', {
        totalVentes: response.data.ventes?.length || 0,
        ventes: response.data.ventes?.map((v: Vente) => ({
          id: v._id,
          vendeur: v.vendeurNom,
          vendeurId: v.vendeur?._id
        })) || []
      });
      
      setVentes(response.data.ventes || []);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error);
      setVentes([]);
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





  if (!selectedCompany) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour voir les ventes.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Avertissement si pas en service */}
        {!serviceLoading && !isInService && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Vous n'êtes pas en service
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Vous devez démarrer votre service pour créer de nouvelles ventes. Utilisez le bouton "Démarrer le service" dans la barre latérale.
                </p>
              </div>
            </div>
          </div>
        )}

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
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Ventes</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Ventes</h1>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground">Ventes de la semaine {selectedWeek} - {selectedYear}</p>
                {/* Badge d'indication - Tous les utilisateurs voient seulement leurs ventes personnelles
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  👤 Mes ventes uniquement
                </span> */}
              </div>
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
        </div>

        {/* Tableau */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : ventes.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground">Aucune vente trouvée pour la semaine S{selectedWeek} {selectedYear}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Vérifier si on a des ventes API ou normales */}
              {paginatedVentes.length > 0 && paginatedVentes[0].source === 'glife_api' ? (
                // Tableau pour les ventes API GLife
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left p-4 font-medium text-foreground">Char ID</th>
                      <th className="text-left p-4 font-medium text-foreground">Nom du Vendeur</th>
                      <th className="text-right p-4 font-medium text-foreground">Total Factures</th>
                      <th className="text-right p-4 font-medium text-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVentes.map((vente, index) => (
                      <tr key={vente.id || index} className={`border-b border-border hover:bg-muted/20 transition-colors ${
                        index === paginatedVentes.length - 1 ? 'border-b-0' : ''
                      }`}>
                        <td className="p-4">
                          <div className="font-medium text-sm">{vente.id || 'N/A'}</div>
                        </td>
                        <td className="p-4 text-sm">{vente.name || 'N/A'}</td>
                        <td className="p-4 text-right text-sm font-medium">
                          {vente.total || 0}
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-green-600">
                          {formatCurrency(parseInt(vente.revenue || '0'))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Tableau pour les ventes normales
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left p-4 font-medium text-foreground">N° Commande</th>
                      <th className="text-left p-4 font-medium text-foreground">Date/Heure</th>
                      <th className="text-left p-4 font-medium text-foreground">Partenariat</th>
                      <th className="text-left p-4 font-medium text-foreground">Plaque</th>
                      <th className="text-right p-4 font-medium text-foreground">Prix usine</th>
                      <th className="text-right p-4 font-medium text-foreground">Commission</th>
                      <th className="text-right p-4 font-medium text-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVentes.map((vente, index) => (
                      <tr key={vente._id || index} className={`border-b border-border hover:bg-muted/20 transition-colors ${
                        index === paginatedVentes.length - 1 ? 'border-b-0' : ''
                      }`}>
                        <td className="p-4">
                          <div className="font-medium text-sm">{vente.numeroCommande || 'N/A'}</div>
                        </td>
                        <td className="p-4 text-sm">
                          {vente.dateVente ? new Date(vente.dateVente).toLocaleDateString('fr-FR') : 'N/A'}
                          {vente.heureVente && <div className="text-xs text-muted-foreground">{vente.heureVente}</div>}
                        </td>
                        <td className="p-4 text-sm">{vente.partenariat || '-'}</td>
                        <td className="p-4 text-sm">{vente.plaque || 'N/A'}</td>
                        <td className="p-4 text-right text-sm">
                          {formatCurrency(vente.totalPrixUsine || 0)}
                        </td>
                        <td className="p-4 text-right text-sm">
                          {formatCurrency(vente.totalCommission || 0)}
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-green-600">
                          {formatCurrency(vente.montantTotal || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Pagination standard comme les autres pages */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={ventes.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />

      </div>
    </Layout>
  );
};

export default VentesPage;
