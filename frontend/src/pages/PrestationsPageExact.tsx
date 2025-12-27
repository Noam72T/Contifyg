import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Minus, 
  Search,
  Trash2,
  Car,
  Users,
  ShoppingCart,
  ChevronDown
} from 'lucide-react';

import Layout from '../components/Layout';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';

interface Prestation {
  _id: string;
  name: string;
  price: number;
  category: string;
  icon: string;
  description: string;
  partner?: string;
  company: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CartItem extends Prestation {
  quantity: number;
}

const PrestationsPage: React.FC = () => {
  const { selectedCompanyId } = useCompany();
  const { user } = useAuth();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Prestation de service');
  const [selectedPartnership, setSelectedPartnership] = useState('Aucun partenaire');
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Liste des partenaires
  const partnerships = [
    'Aucun partenaire'
  ];

  // Charger les prestations depuis le backend
  const fetchPrestations = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const companyParam = selectedCompanyId || 'null';
      const response = await fetch(`${apiUrl}/api/prestations?company=${companyParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des prestations');
      }

      const data = await response.json();
      
      if (data.success) {
        setPrestations(data.prestations);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Error fetching prestations:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      setPrestations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrestations();
  }, [selectedCompanyId, user]);

  // Organiser les prestations par catégorie
  const prestationsByCategory = prestations.reduce((acc, prestation) => {
    if (!acc[prestation.category]) {
      acc[prestation.category] = [];
    }
    acc[prestation.category].push(prestation);
    return acc;
  }, {} as Record<string, Prestation[]>);

  // Filtrer les prestations selon les critères
  const getFilteredPrestations = (category: string) => {
    const categoryPrestations = prestationsByCategory[category] || [];
    
    return categoryPrestations.filter(prestation => {
      const matchesSearch = prestation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           prestation.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  };

  // Ajouter au panier
  const addToCart = (prestation: Prestation) => {
    setCart(prev => {
      const existingItem = prev.find(item => item._id === prestation._id);
      if (existingItem) {
        return prev.map(item =>
          item._id === prestation._id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...prestation, quantity: 1 }];
    });
  };

  // Retirer du panier
  const removeFromCart = (prestationId: string) => {
    setCart(prev => {
      const existingItem = prev.find(item => item._id === prestationId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item =>
          item._id === prestationId 
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item._id !== prestationId);
    });
  };

  // Supprimer complètement du panier
  const deleteFromCart = (prestationId: string) => {
    setCart(prev => prev.filter(item => item._id !== prestationId));
  };

  // Calculer le total
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Vider le panier
  const clearCart = () => {
    setCart([]);
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col">
        {/* Header compact - identique à l'image */}
        <div className="bg-background border-b border-border">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground">Point de vente - Prestations</h1>
                <p className="text-sm text-muted-foreground">Gestion des prestations de service</p>
              </div>
              
              {/* Panier header - exactement comme dans l'image */}
              <div className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-medium">Panier</span>
                {cart.length > 0 && (
                  <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {cart.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Zone principale des prestations */}
          <div className="flex-1 p-6 pr-0">
            {/* Barre de recherche et filtres */}
            <div className="mb-6 flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher une prestation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm"
                />
              </div>

              <div className="relative">
                <select
                  value={selectedPartnership}
                  onChange={(e) => setSelectedPartnership(e.target.value)}
                  className="appearance-none bg-background border border-input rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm min-w-[180px]"
                >
                  {partnerships.map(partnership => (
                    <option key={partnership} value={partnership}>
                      {partnership}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              </div>
            </div>

            {/* Onglets - exactement comme dans l'image avec style plus compact */}
            <div className="mb-6">
              <div className="flex border-b border-border">
                {['Prestation de service', 'Ventes', 'Customs'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu des prestations - grille comme dans l'image */}
            <div className="pr-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64 text-destructive">
                  <span>{error}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getFilteredPrestations(activeTab).map((prestation) => {
                    const cartItem = cart.find(item => item._id === prestation._id);
                    
                    // Icônes basées sur le nom de la prestation pour correspondre à l'image
                    const getIcon = (name: string) => {
                      if (name.toLowerCase().includes('sport')) return Car;
                      if (name.toLowerCase().includes('familial')) return Users;
                      return Car;
                    };
                    
                    const IconComponent = getIcon(prestation.name);

                    return (
                      <motion.div
                        key={prestation._id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <IconComponent className="w-8 h-8 text-primary" />
                          </div>
                          
                          <div>
                            <h3 className="font-medium text-foreground text-sm">{prestation.name}</h3>
                            <p className="text-muted-foreground text-xs mt-1">{prestation.description}</p>
                          </div>

                          <div className="text-lg font-bold text-primary">
                            ${prestation.price.toLocaleString()}
                          </div>

                          <div className="w-full">
                            {cartItem ? (
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => removeFromCart(prestation._id)}
                                  className="p-1.5 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-md font-medium text-sm min-w-[40px]">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() => addToCart(prestation)}
                                  className="p-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(prestation)}
                                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center space-x-1 text-sm"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Ajouter</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {getFilteredPrestations(activeTab).length === 0 && !loading && (
                    <div className="col-span-full flex items-center justify-center h-32">
                      <div className="text-center">
                        <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">
                          Aucune prestation trouvée
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Panier sidebar - exactement comme dans l'image */}
          <div className="w-80 bg-card border-l border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Panier</h2>
              <div className="text-xs text-muted-foreground">Nouvelle commande</div>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Votre panier est vide</p>
                <p className="text-xs text-muted-foreground mt-1">Nouvelle commande</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Articles du panier */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map((item) => {
                    const getIcon = (name: string) => {
                      if (name.toLowerCase().includes('sport')) return Car;
                      if (name.toLowerCase().includes('familial')) return Users;
                      return Car;
                    };
                    
                    const IconComponent = getIcon(item.name);

                    return (
                      <div key={item._id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            ${item.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 py-1 bg-background rounded text-xs font-medium min-w-[25px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteFromCart(item._id)}
                            className="p-1 text-destructive hover:text-destructive/80 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Résumé des prix - exactement comme dans l'image */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commission:</span>
                    <span className="text-foreground">$600</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prix usine:</span>
                    <span className="text-foreground">$0</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-foreground border-t border-border pt-2">
                    <span>Total:</span>
                    <span>${(getTotalPrice() + 600).toLocaleString()}</span>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={clearCart}
                    className="w-full px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg text-sm transition-colors"
                  >
                    Vider le panier
                  </button>
                  <button className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
                    Enregistrer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PrestationsPage;
