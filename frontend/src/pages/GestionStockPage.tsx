import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  AlertTriangle,
  History,
  Save,
  X
} from 'lucide-react';

import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import WeekFilter from '../components/WeekFilter';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import toast from 'react-hot-toast';

const GestionStockPage: React.FC = () => {
  const [stocks, setStocks] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const date = new Date();
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    // Jeudi de cette semaine
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    // Premier jeudi de janvier = semaine 1
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [quantite, setQuantite] = useState('');
  const [quantiteMinimale, setQuantiteMinimale] = useState('5');
  const [motif, setMotif] = useState('');
  const [historique, setHistorique] = useState<any[]>([]);

  const itemsPerPage = 9;

  const { } = useAuth();
  const { selectedCompany } = useCompany();

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Charger les stocks
      const stocksResponse = await fetch(`${apiUrl}/api/stock?companyId=${selectedCompany?._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (stocksResponse.ok) {
        const stocksData = await stocksResponse.json();
        setStocks(stocksData.stocks || []);
      }

      // Charger les items
      const itemsResponse = await fetch(`${apiUrl}/api/items?companyId=${selectedCompany?._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        // Filtrer seulement les items avec gestion de stock activée
        const itemsWithStock = itemsData.filter((item: any) => item.gestionStock === true);
        setItems(itemsWithStock);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/stock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: selectedItem,
          companyId: selectedCompany?._id,
          quantite: Number(quantite),
          quantiteMinimale: Number(quantiteMinimale),
          motif
        })
      });

      if (response.ok) {
        await fetchData();
        setShowAddModal(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de l\'ajout du stock');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du stock:', error);
      toast.error('Erreur lors de l\'ajout du stock');
    }
  };

  const handleEditStock = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/stock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: selectedStock.item._id,
          companyId: selectedCompany?._id,
          quantite: Number(quantite),
          quantiteMinimale: Number(quantiteMinimale),
          motif
        })
      });

      if (response.ok) {
        await fetchData();
        setShowEditModal(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la modification du stock');
      }
    } catch (error) {
      console.error('Erreur lors de la modification du stock:', error);
      toast.error('Erreur lors de la modification du stock');
    }
  };

  const handleDeleteStock = async (stockId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce stock ?')) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/stock/${stockId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la suppression du stock');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du stock:', error);
      toast.error('Erreur lors de la suppression du stock');
    }
  };

  const handleShowHistory = async (stock: any) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/stock/historique/${stock._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistorique(data.historique || []);
        setSelectedStock(stock);
        setShowHistoryModal(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const resetForm = () => {
    setSelectedItem('');
    setQuantite('');
    setQuantiteMinimale('5');
    setMotif('');
    setSelectedStock(null);
  };

  const openEditModal = (stock: any) => {
    setSelectedStock(stock);
    setQuantite(stock.quantite.toString());
    setQuantiteMinimale(stock.quantiteMinimale.toString());
    setMotif('');
    setShowEditModal(true);
  };


  // Filtrer les stocks (l'API filtre déjà par semaine courante)
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.item?.nom?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Filtrer les items sans stock (afficher tous les items sans stock défini pour la semaine courante)
  const filteredUnlimitedItems = items
    .filter(item => !stocks.some(stock => stock.item?._id === item._id))
    .filter(item => {
      const matchesSearch = searchTerm === '' || item.nom.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

  // Combiner tous les éléments filtrés
  const allFilteredItems = [...filteredStocks, ...filteredUnlimitedItems];

  // Pagination
  const totalPages = Math.ceil(allFilteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStocks = filteredStocks.slice(startIndex, Math.min(startIndex + itemsPerPage, filteredStocks.length));
  const remainingSlots = itemsPerPage - paginatedStocks.length;
  const paginatedUnlimitedItems = remainingSlots > 0 
    ? filteredUnlimitedItems.slice(Math.max(0, startIndex - filteredStocks.length), Math.max(0, startIndex - filteredStocks.length) + remainingSlots)
    : [];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedWeek, selectedYear]);

  const availableItems = items.filter(item => 
    !stocks.some(stock => stock.item?._id === item._id)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'ajout': return 'text-green-600';
      case 'retrait': return 'text-red-600';
      case 'vente': return 'text-blue-600';
      case 'correction': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ajout': return '+';
      case 'retrait': return '-';
      case 'vente': return '🛒';
      case 'correction': return '✏️';
      default: return '•';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des stocks...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-8 h-8" />
              Gestion des Stocks
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les quantités de vos produits et services
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un stock
          </button>
        </div>

        {/* Message informatif */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Package className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Gestion automatique du stock
              </h3>
              <p className="text-sm text-blue-700">
                Seuls les articles avec l'option "Gérer le stock" activée dans la <strong>Gestion des Items</strong> apparaissent ici. 
                Pour ajouter un article au système de stock, modifiez-le dans Gestion → Items et cochez "Gérer le stock de cet article".
              </p>
            </div>
          </div>
        </div>

        {/* Filtre par semaine */}
        <WeekFilter
          selectedWeek={selectedWeek}
          selectedYear={selectedYear}
          onWeekChange={(week, year) => {
            setSelectedWeek(week);
            setSelectedYear(year);
          }}
        />

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm w-full"
            />
          </div>
        </div>


        {/* Tableau des stocks */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {allFilteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Aucun stock trouvé pour la semaine {selectedWeek}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-foreground">Produit</th>
                      <th className="text-left p-4 font-medium text-foreground">Type</th>
                      <th className="text-center p-4 font-medium text-foreground">Stock actuel</th>
                      <th className="text-center p-4 font-medium text-foreground">Stock minimal</th>
                      <th className="text-center p-4 font-medium text-foreground">Statut</th>
                      <th className="text-center p-4 font-medium text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Afficher d'abord les items avec stock géré */}
                    {paginatedStocks.map((stock) => (
                      <tr key={stock._id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {stock.item?.image ? (
                              <img
                                src={stock.item.image}
                                alt={stock.item.nom}
                                className="w-10 h-10 object-contain rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-foreground">{stock.item?.nom}</h3>
                              <p className="text-sm text-muted-foreground">{stock.item?.prixVente}€</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{stock.item?.type}</td>
                        <td className="p-4 text-center">
                          <span className={`font-bold ${
                            stock.quantite <= stock.quantiteMinimale ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {stock.quantite}
                          </span>
                        </td>
                        <td className="p-4 text-center text-muted-foreground">{stock.quantiteMinimale}</td>
                        <td className="p-4 text-center">
                          {stock.quantite <= 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3" />
                              Rupture
                            </span>
                          ) : stock.quantite <= stock.quantiteMinimale ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              <AlertTriangle className="w-3 h-3" />
                              Stock faible
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              En stock
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(stock)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleShowHistory(stock)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Historique"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStock(stock._id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Afficher ensuite les items sans stock (illimités) */}
                    {paginatedUnlimitedItems.map((item) => (
                      <tr key={`unlimited-${item._id}`} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.nom}
                                className="w-10 h-10 object-contain rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-foreground">{item.nom}</h3>
                              <p className="text-sm text-muted-foreground">{item.prixVente}€</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{item.type}</td>
                        <td className="p-4 text-center">
                          <span className="text-blue-600 font-medium">∞</span>
                        </td>
                        <td className="p-4 text-center text-muted-foreground">-</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Illimité
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedItem(item._id);
                                setQuantite('0');
                                setQuantiteMinimale('5');
                                setMotif('');
                                setShowAddModal(true);
                              }}
                              className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                              title="Gérer le stock"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
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
                totalItems={allFilteredItems.length}
              />
            </>
          )}
        </div>


        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Ajouter un stock</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Produit</label>
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Sélectionner un produit</option>
                    {availableItems.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.nom} ({item.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Quantité</label>
                  <input
                    type="number"
                    value={quantite}
                    onChange={(e) => setQuantite(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ex: 300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Quantité minimale</label>
                  <input
                    type="number"
                    value={quantiteMinimale}
                    onChange={(e) => setQuantiteMinimale(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ex: 5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Motif (optionnel)</label>
                  <input
                    type="text"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ex: Stock initial"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddStock}
                  disabled={!selectedItem || !quantite}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de modification */}
        {showEditModal && selectedStock && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Modifier le stock</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedStock.item?.nom}</p>
                <p className="text-sm text-muted-foreground">Stock actuel: {selectedStock.quantite}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nouvelle quantité</label>
                  <input
                    type="number"
                    value={quantite}
                    onChange={(e) => setQuantite(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Quantité minimale</label>
                  <input
                    type="number"
                    value={quantiteMinimale}
                    onChange={(e) => setQuantiteMinimale(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Motif de modification</label>
                  <input
                    type="text"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ex: Correction d'inventaire"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditStock}
                  disabled={!quantite}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Modifier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'historique */}
        {showHistoryModal && selectedStock && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Historique - {selectedStock.item?.nom}</h2>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {historique.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun historique disponible</p>
                ) : (
                  <div className="space-y-3">
                    {historique.map((entry, index) => (
                      <div key={index} className="border border-border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${getActionColor(entry.action)}`}>
                              {getActionIcon(entry.action)} {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              par {entry.utilisateur?.firstName} {entry.utilisateur?.lastName}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(entry.date)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span>Quantité: </span>
                          <span className={entry.quantite >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {entry.quantite >= 0 ? '+' : ''}{entry.quantite}
                          </span>
                          <span className="text-muted-foreground"> ({entry.quantiteAvant} → {entry.quantiteApres})</span>
                        </div>
                        {entry.motif && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Motif: {entry.motif}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GestionStockPage;
