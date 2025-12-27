import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Search, ChevronDown, X, MoreVertical, Play, Pause, Edit, Trash2, Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Partenariat {
  _id: string;
  nom: string;
  entreprisePartenaire: string;
  statut: string;
  dateCreation: string;
  categoriesVisibles: Array<{_id: string; name: string}>;
  webhookDiscord?: string;
  semaineActuelle?: number;
  gainsParSemaine?: Array<{semaine: number; montant: number; dateCreation?: string}>;
}

interface PrestationCategory {
  _id: string;
  name: string;
}

const GestionPartenariatsPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [partenariats, setPartenariats] = useState<Partenariat[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<PrestationCategory[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPartenariat, setEditingPartenariat] = useState<Partenariat | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  const itemsPerPage = 10;

  useEffect(() => {
    if (selectedCompany) {
      fetchPartenariats();
      fetchCategories();
    }
  }, [selectedCompany]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedWeek, selectedYear]);

  const fetchPartenariats = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/partenariats?companyId=${selectedCompany?._id}`);
      setPartenariats(response.data.partenariats || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des partenariats:', error);
      setPartenariats([]); // S'assurer que partenariats est toujours un tableau
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!selectedCompany) {
      setCategories([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/prestations/categories/${selectedCompany._id}?type=product`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany) {
      toast.error('Veuillez sélectionner une entreprise');
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error('Veuillez sélectionner au moins une catégorie visible');
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const entreprisePartenaire = formData.get('entreprisePartenaire') as string;
    const webhookDiscord = formData.get('webhookDiscord') as string;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const url = editingPartenariat 
        ? `${apiUrl}/api/partenariats/${editingPartenariat._id}` 
        : `${apiUrl}/api/partenariats`;
      const method = editingPartenariat ? 'PUT' : 'POST';
      
      const payload = {
        nom: entreprisePartenaire,
        entreprisePartenaire,
        companyId: selectedCompany._id,
        categoriesVisibles: selectedCategories,
        webhookDiscord: webhookDiscord || null
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(editingPartenariat ? 'Partenaire modifié avec succès!' : 'Partenaire créé avec succès!');
        await fetchPartenariats();
        setShowForm(false);
        setEditingPartenariat(null);
        setSelectedCategories([]);
      } else {
        toast.error(result.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleStatusChange = async (partenaritId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/partenariats/${partenaritId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statut: newStatus })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message);
        await fetchPartenariats();
        setActiveDropdown(null);
      } else {
        toast.error(result.message || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleDelete = async (partenaritId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce partenariat ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/partenariats/${partenaritId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success('Partenariat supprimé avec succès!');
        await fetchPartenariats();
        setActiveDropdown(null);
      } else {
        toast.error(result.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleEdit = (partenariat: Partenariat) => {
    setEditingPartenariat(partenariat);
    setSelectedCategories(partenariat.categoriesVisibles.map(cat => cat._id));
    setShowForm(true);
    setActiveDropdown(null);
  };

  // Recalculer les gains d'un partenariat
  const handleRecalculateGains = async (partenaritId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/partenariats/${partenaritId}/recalculate-gains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          weekNumber: selectedWeek, 
          year: selectedYear 
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Gains recalculés avec succès pour la semaine ${selectedWeek}/${selectedYear}`);
        await fetchPartenariats(); // Recharger les données
        setActiveDropdown(null);
      } else {
        toast.error(result.message || 'Erreur lors du recalcul des gains');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion lors du recalcul');
    }
  };

  // Recalculer tous les gains automatiquement
  const handleRecalculateAllGains = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir recalculer tous les gains pour la semaine ${selectedWeek}/${selectedYear} ?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/partenariats/recalculate-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          companyId: selectedCompany?._id,
          weekNumber: selectedWeek, 
          year: selectedYear 
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Recalcul automatique terminé: ${result.stats.successCount} succès, ${result.stats.errorCount} erreurs`);
        await fetchPartenariats(); // Recharger les données
      } else {
        toast.error(result.message || 'Erreur lors du recalcul automatique');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion lors du recalcul automatique');
    }
  };

  if (!selectedCompany) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour gérer les partenariats.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen p-6">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
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
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Gestion Partenariats</span>
              </div>
            </li>
          </ol>
        </nav>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion partenaires</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleRecalculateAllGains}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs h-9 px-4 py-2 has-[>svg]:px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalculer tous les gains S{selectedWeek}
            </Button>
            <Button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs h-9 px-4 py-2 has-[>svg]:px-3 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un partenaire
            </Button>
          </div>
        </div>
        
        {/* Search bar et filtre de semaine */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher un partenaire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 bg-background border-border text-foreground placeholder-muted-foreground"
            />
          </div>
          {/* Sélecteur de semaine */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (selectedWeek > 1) {
                  setSelectedWeek(selectedWeek - 1);
                } else {
                  setSelectedWeek(52);
                  setSelectedYear(selectedYear - 1);
                }
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium text-sm min-w-[60px] text-center">
              S{selectedWeek} {selectedYear}
            </span>
            <button
              onClick={() => {
                if (selectedWeek < 52) {
                  setSelectedWeek(selectedWeek + 1);
                } else {
                  setSelectedWeek(1);
                  setSelectedYear(selectedYear + 1);
                }
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">Nom: {partenariats.length}</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Chargement des partenaires...</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {(() => {
                // Filtrage par nom/entreprise
                let filteredPartenariats = partenariats.filter(partenariat =>
                  (partenariat.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (partenariat.entreprisePartenaire || '').toLowerCase().includes(searchTerm.toLowerCase())
                );

                // Filtrage par semaine sélectionnée
                // Note: Pour l'instant, on affiche tous les partenariats
                // Le filtrage par semaine pourrait être utilisé pour filtrer les gains/activités par semaine
                // mais les partenariats eux-mêmes restent visibles
                
                // Pagination
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedPartenariats = filteredPartenariats.slice(startIndex, startIndex + itemsPerPage);
                
                return paginatedPartenariats.length > 0 ? paginatedPartenariats.map((partenariat) => (
              <div key={partenariat._id} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    partenariat.statut === 'actif' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex flex-col">
                    <span className="text-foreground font-medium">{partenariat.entreprisePartenaire || partenariat.nom}</span>
                    {partenariat.categoriesVisibles && partenariat.categoriesVisibles.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Catégories: {partenariat.categoriesVisibles.map(cat => cat.name).join(', ')}
                      </span>
                    )}
                    {partenariat.webhookDiscord && (
                      <span className="text-xs text-green-600">✓ Webhook Discord configuré</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Gains display - uniquement pour la semaine sélectionnée */}
                  {partenariat.gainsParSemaine && partenariat.gainsParSemaine.length > 0 && (
                    <div className="text-right">
                      <span className="text-sm font-bold text-green-600">
                        ${(() => {
                          // Afficher uniquement les gains de la semaine sélectionnée
                          const gainsSemaine = partenariat.gainsParSemaine.find(gain => {
                            const gainYear = new Date(gain.dateCreation || partenariat.dateCreation).getFullYear();
                            return gain.semaine === selectedWeek && gainYear === selectedYear;
                          });
                          return gainsSemaine ? gainsSemaine.montant.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
                        })()}
                      </span>
                      <p className="text-xs text-gray-500">
                        Gains S{selectedWeek} {selectedYear}
                      </p>
                    </div>
                  )}
                  
                  <div className="relative">
                    <Button
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setActiveDropdown(activeDropdown === partenariat._id ? null : partenariat._id)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    
                    {activeDropdown === partenariat._id && (
                      <div className="absolute right-0 mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-20">
                        <div className="py-1">
                          {partenariat.statut === 'actif' ? (
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              onClick={() => handleStatusChange(partenariat._id, 'inactif')}
                            >
                              <Pause className="h-4 w-4" />
                              Stopper
                            </button>
                          ) : (
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              onClick={() => handleStatusChange(partenariat._id, 'actif')}
                            >
                              <Play className="h-4 w-4" />
                              Activer
                            </button>
                          )}
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            onClick={() => handleEdit(partenariat)}
                          >
                            <Edit className="h-4 w-4" />
                            Modifier
                          </button>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                            onClick={() => handleRecalculateGains(partenariat._id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Recalculer gains S{selectedWeek}
                          </button>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            onClick={() => handleDelete(partenariat._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                )) : (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {partenariats.length === 0 ? 'Aucun partenaire trouvé' : 'Aucun partenaire ne correspond à votre recherche'}
                    </p>
                  </div>
                );
              })()}
            </div>
            
            {/* Pagination */}
            {(() => {
              const filteredPartenariats = partenariats.filter(partenariat =>
                (partenariat.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (partenariat.entreprisePartenaire || '').toLowerCase().includes(searchTerm.toLowerCase())
              );
              const totalPages = Math.ceil(filteredPartenariats.length / itemsPerPage);
              
              return filteredPartenariats.length > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredPartenariats.length}
                />
              );
            })()}
          </>
        )}

        {/* Modal de création/modification */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-96 max-w-lg border border-border shadow-2xl">
              <h3 className="text-lg font-semibold mb-4 text-foreground">
                {editingPartenariat ? 'Modifier le partenaire' : 'Ajouter un partenaire'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Nom de l'entreprise</label>
                  <Input
                    name="entreprisePartenaire"
                    type="text"
                    placeholder="Nom de l'entreprise partenaire"
                    defaultValue={editingPartenariat?.entreprisePartenaire || editingPartenariat?.nom}
                    required
                    className="bg-background border-border text-foreground placeholder-muted-foreground focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Catégories visibles *</label>
                  <div className="relative">
                    <div 
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[42px] flex items-center justify-between"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <div className="flex flex-wrap gap-1">
                        {selectedCategories.length === 0 ? (
                          <span className="text-muted-foreground">Sélectionnez des catégories...</span>
                        ) : (
                          selectedCategories.map(categoryId => {
                            const category = categories.find(c => c._id === categoryId);
                            return category ? (
                              <span 
                                key={categoryId}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                              >
                                {category.name}
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-blue-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
                                  }}
                                />
                              </span>
                            ) : null;
                          })
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {categories.map((category) => (
                          <div
                            key={category._id}
                            className={`px-3 py-2 cursor-pointer hover:bg-muted transition-colors ${
                              selectedCategories.includes(category._id) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                            onClick={() => {
                              if (selectedCategories.includes(category._id)) {
                                setSelectedCategories(selectedCategories.filter(id => id !== category._id));
                              } else {
                                setSelectedCategories([...selectedCategories, category._id]);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span>{category.name}</span>
                              {selectedCategories.includes(category._id) && (
                                <span className="text-blue-600">✓</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cliquez pour ouvrir le menu et sélectionner plusieurs catégories
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Webhook Discord (optionnel)</label>
                  <Input
                    name="webhookDiscord"
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    defaultValue={editingPartenariat?.webhookDiscord || ''}
                    className="bg-background border-border text-foreground placeholder-muted-foreground focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL du webhook Discord pour recevoir les notifications
                  </p>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button 
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingPartenariat(null);
                      setSelectedCategories([]);
                      setIsDropdownOpen(false);
                    }}
                    variant="outline"
                    className="flex-1 border-border text-foreground hover:bg-muted"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                  >
                    {editingPartenariat ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GestionPartenariatsPage;
