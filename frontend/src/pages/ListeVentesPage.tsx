import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  ChevronDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Trash2
} from 'lucide-react';

import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import api from '../utils/api';
import toast from 'react-hot-toast';

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
  partenariat?: string;
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

const ListeVentesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { canViewCategory, canManageCategory, hasPermission } = useUserPermissions();
  
  // Calculer la semaine courante
  const getCurrentWeek = () => {
    const now = new Date();
    const year = now.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay() || 7;
    const firstThursday = new Date(jan1.getTime() + (4 - jan1Day) * 24 * 60 * 60 * 1000);
    const firstMonday = new Date(firstThursday.getTime() - 3 * 24 * 60 * 60 * 1000);
    const daysSinceFirstMonday = Math.floor((now.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;
    return Math.max(1, Math.min(53, weekNumber));
  };
  
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('tous');
  const [selectedVendeur, setSelectedVendeur] = useState('tous');
  const [dateFilter, setDateFilter] = useState('tous');
  const [showFilters, setShowFilters] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVente, setEditingVente] = useState<Vente | null>(null);
  const [searchItem, setSearchItem] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editForm, setEditForm] = useState({
    plaque: '',
    prestations: [] as Prestation[]
  });

  const itemsPerPage = 8;

  // Vérifier les permissions
  const canView = canViewCategory('PAPERASSE') || canViewCategory('GENERALE');
  const canManage = user?.systemRole === 'Technicien' || 
                   hasPermission('MANAGE_VENTES') || 
                   canManageCategory('PAPERASSE') || 
                   canManageCategory('GENERALE') ||
                   canViewCategory('PAPERASSE') || // Les utilisateurs qui peuvent voir peuvent aussi gérer
                   canViewCategory('GENERALE');

  // Charger les ventes
  const fetchVentes = async () => {
    if (!user || !selectedCompany || !canView) return;

    setLoading(true);
    setError(null);

    try {
      // Récupérer TOUTES les ventes de la semaine (limit=1000 pour être sûr)
      const response = await api.get(`/ventes?companyId=${selectedCompany._id}&week=${selectedWeek}&year=${selectedYear}&page=1&limit=1000`);
      console.log('Ventes récupérées (semaine', selectedWeek, '/', selectedYear, '):', response.data);
      setVentes(response.data.ventes || []);
      
    } catch (error) {
      console.error('Error fetching ventes:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      setVentes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      fetchVentes();
    }
  }, [selectedCompany, selectedWeek, selectedYear]);

  // Modifier une prestation dans le formulaire
  const updatePrestation = (index: number, field: keyof Prestation, value: any) => {
    const newPrestations = [...editForm.prestations];
    newPrestations[index] = { ...newPrestations[index], [field]: value };
    
    // Recalculer le total de la prestation
    if (field === 'quantite' || field === 'prixUnitaire') {
      const prestation = newPrestations[index];
      prestation.total = prestation.quantite * prestation.prixUnitaire;
    }
    
    setEditForm({ ...editForm, prestations: newPrestations });
  };

  // Supprimer une prestation
  const removePrestation = (index: number) => {
    const newPrestations = editForm.prestations.filter((_, i) => i !== index);
    setEditForm({ ...editForm, prestations: newPrestations });
  };

  // Sauvegarder les modifications
  const handleSaveEdit = async () => {
    if (!editingVente || !canManage) {
      toast.error('Vous n\'avez pas les permissions pour modifier cette vente');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/api/ventes/${editingVente._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plaque: editForm.plaque,
          prestations: editForm.prestations
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la modification');
      }

      if (data.success) {
        // Recharger les ventes
        await fetchVentes();
        setShowEditModal(false);
        setEditingVente(null);
        toast.success('Vente modifiée avec succès');
      } else {
        throw new Error(data.message || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Error updating vente:', error);
      toast.error(`Erreur lors de la modification: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };



  // Filtrer les ventes (pas de filtre par semaine car déjà fait par l'API)
  const filteredVentes = ventes.filter(vente => {
    // Gérer les ventes API GLife qui peuvent avoir une structure différente
    const isApiVente = vente.source === 'glife_api';
    
    const matchesSearch = 
      (vente.numeroCommande?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vente.vendeurNom?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vente.plaque?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vente.client?.nom?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      // Pour les ventes API, chercher aussi dans d'autres champs possibles
      (isApiVente && JSON.stringify(vente).toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtre par item/produit - vérifier que prestations existe
    const matchesItem = !searchItem || 
      (vente.prestations && vente.prestations.some(prestation => 
        prestation.nom?.toLowerCase().includes(searchItem.toLowerCase())
      ));

    const matchesStatut = selectedStatut === 'tous' || vente.statut === selectedStatut;
    const matchesVendeur = selectedVendeur === 'tous' || vente.vendeur?._id === selectedVendeur;

    // Pas de filtre par semaine ici car l'API filtre déjà par semaine/année
    
    let matchesDate = true;
    if (dateFilter !== 'tous' && vente.dateVente) {
      const today = new Date();
      const venteDate = new Date(vente.dateVente);
      
      switch (dateFilter) {
        case 'aujourd_hui':
          matchesDate = venteDate.toDateString() === today.toDateString();
          break;
        case 'cette_semaine':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = venteDate >= weekAgo;
          break;
        case 'ce_mois':
          matchesDate = venteDate.getMonth() === today.getMonth() && 
                       venteDate.getFullYear() === today.getFullYear();
          break;
      }
    }

    return matchesSearch && matchesItem && matchesStatut && matchesVendeur && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredVentes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVentes = filteredVentes.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchItem, selectedStatut, selectedVendeur, dateFilter, selectedWeek, selectedYear]);

  // Obtenir la liste unique des vendeurs
  const vendeurs = Array.from(new Set(ventes.filter(v => v.vendeur).map(v => v.vendeur!._id)))
    .map(id => ventes.find(v => v.vendeur?._id === id)?.vendeur)
    .filter(Boolean) as NonNullable<Vente['vendeur']>[];

  if (!canView) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions pour voir les ventes.
            </p>
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
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Liste des ventes</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Liste des ventes</h1>
            <p className="text-muted-foreground">Historique des ventes de prestations</p>
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
            
            <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
          </div>
        </div>

        {/* Sélecteur de semaine */}
        <div className="flex items-center gap-4">
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

        {/* Filtres */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-lg border border-border p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Recherche générale</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="N° commande, vendeur, plaque..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Recherche par item</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="moteur, pneu, huile..."
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Statut</label>
                <select
                  value={selectedStatut}
                  onChange={(e) => setSelectedStatut(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="confirmee">Confirmée</option>
                  <option value="annulee">Annulée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Vendeur</label>
                <select
                  value={selectedVendeur}
                  onChange={(e) => setSelectedVendeur(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="tous">Tous les vendeurs</option>
                  {vendeurs.map(vendeur => (
                    <option key={vendeur!._id} value={vendeur!._id}>
                      {vendeur!.firstName} {vendeur!.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Période</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="tous">Toutes les dates</option>
                  <option value="aujourd_hui">Aujourd'hui</option>
                  <option value="cette_semaine">Cette semaine</option>
                  <option value="ce_mois">Ce mois</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}


        {/* Tableau des ventes */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-destructive">
              <span>{error}</span>
            </div>
          ) : filteredVentes.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Aucune vente trouvée pour la semaine {selectedWeek}</p>
              </div>
            </div>
          ) : (
            <>

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
                            ${parseInt(vente.revenue || '0').toLocaleString()}
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
                        <th className="text-left p-4 font-medium text-foreground">Vendeur</th>
                        <th className="text-left p-4 font-medium text-foreground">Partenariat</th>
                        <th className="text-left p-4 font-medium text-foreground">Plaque</th>
                        <th className="text-right p-4 font-medium text-foreground">Prix usine</th>
                        <th className="text-right p-4 font-medium text-foreground">Commission</th>
                        <th className="text-right p-4 font-medium text-foreground">Total</th>
                        <th className="text-center p-4 font-medium text-foreground">Actions</th>
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
                          <td className="p-4 text-sm">
                            {vente.vendeur ? `${vente.vendeur.firstName} ${vente.vendeur.lastName}` : vente.vendeurNom || 'N/A'}
                          </td>
                          <td className="p-4 text-sm">{vente.partenariat || '-'}</td>
                          <td className="p-4 text-sm">{vente.plaque || 'N/A'}</td>
                          <td className="p-4 text-right text-sm">
                            ${(vente.totalPrixUsine || 0).toLocaleString()}
                          </td>
                          <td className="p-4 text-right text-sm">
                            ${(vente.totalCommission || 0).toLocaleString()}
                          </td>
                          <td className="p-4 text-right text-sm font-bold text-green-600">
                            ${(vente.montantTotal || 0).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {canManage && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingVente(vente);
                                      setEditForm({
                                        plaque: vente.plaque || '',
                                        prestations: vente.prestations || []
                                      });
                                      setShowEditModal(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Modifier"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) {
                                        // Logique de suppression à implémenter
                                        toast.error('Fonctionnalité de suppression à implémenter');
                                      }
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredVentes.length}
              />
            </>
          )}
        </div>

        {/* Modal modification vente */}
        {showEditModal && editingVente && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border border-border shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Modifier la vente</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editingVente.numeroCommande} • {editingVente.dateVente ? new Date(editingVente.dateVente).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-muted hover:rotate-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Informations principales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plaque */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-foreground">Plaque d'immatriculation</label>
                      <input
                        type="text"
                        value={editForm.plaque}
                        onChange={(e) => setEditForm({ ...editForm, plaque: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Ex: AB-123-CD"
                      />
                    </div>

                    {/* Catégorie */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-muted-foreground">Catégorie</label>
                      <div className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                          {editingVente.customCategory || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Partenariat */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2 text-muted-foreground">Partenariat</label>
                      <div className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-muted-foreground">
                        {editingVente.partenariat || 'Aucun partenariat'}
                      </div>
                    </div>
                  </div>


                {/* Prestations */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Prestations vendues</label>
                  <div className="space-y-3">
                    {editForm.prestations.map((prestation, index) => (
                      <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-foreground">{prestation.nom}</h4>
                          <button
                            onClick={() => removePrestation(index)}
                            className="text-destructive hover:text-destructive/80 p-1"
                            title="Supprimer cette prestation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Quantité</label>
                            <input
                              type="number"
                              min="1"
                              value={prestation.quantite}
                              onChange={(e) => updatePrestation(index, 'quantite', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Prix unitaire</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={prestation.prixUnitaire}
                              onChange={(e) => updatePrestation(index, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Prix usine</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={prestation.prixUsine}
                              onChange={(e) => updatePrestation(index, 'prixUsine', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Commission</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={prestation.commission}
                              onChange={(e) => updatePrestation(index, 'commission', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                            />
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-sm font-medium text-foreground">
                            Total: ${(prestation.quantite * prestation.prixUnitaire).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {editForm.prestations.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Aucune prestation dans cette vente
                      </div>
                    )}
                  </div>
                  
                  {editForm.prestations.length > 0 && (
                    <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Sous-total:</span>
                          <div className="font-bold text-foreground">
                            ${editForm.prestations.reduce((sum, p) => sum + (p.quantite * p.prixUnitaire), 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Prix usine total:</span>
                          <div className="font-bold text-foreground">
                            ${editForm.prestations.reduce((sum, p) => sum + (p.quantite * p.prixUsine), 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Commission totale:</span>
                          <div className="font-bold text-foreground">
                            ${editForm.prestations.reduce((sum, p) => sum + (p.quantite * p.commission), 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Total général:</span>
                          <div className="font-bold text-lg text-primary">
                            ${editForm.prestations.reduce((sum, p) => sum + (p.quantite * p.prixUnitaire), 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2.5 rounded-lg font-medium transition-all bg-background border border-border text-foreground hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2.5 rounded-lg font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl"
              >
                Sauvegarder
              </button>
            </div>
          </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default ListeVentesPage;
