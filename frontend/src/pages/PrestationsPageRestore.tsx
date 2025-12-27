import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Minus, 
  Search, 
  Trash2,
  Car,
  Wrench,
  CircleDot,
  Settings,
  Cog,
  Ban,
  Zap,
  Palette,
  ShoppingCart,
  ChevronDown,
  Handshake,
  Lightbulb,
  Volume2,
  Wind,
  Gauge,
  CarFront
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
  const [selectedPartnership, setSelectedPartnership] = useState('Tous les partenaires');
  const [licensePlate, setLicensePlate] = useState('');
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Liste des partenaires
  const partnerships = [
    'Tous les partenaires',
    'Garage Central',
    'AutoPlus',
    'MecaExpert',
    'CarService Pro',
    'Atelier Premium'
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
      
      const matchesPartnership = selectedPartnership === 'Tous les partenaires' ||
                                prestation.partner === selectedPartnership ||
                                (!prestation.partner && selectedPartnership === 'Tous les partenaires');
      
      return matchesSearch && matchesPartnership;
    });
  };

  // Mapping des icônes
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Cog,
    CircleDot,
    Ban,
    Zap,
    Settings,
    Wrench,
    Palette,
    Car,
    Lightbulb,
    Volume2,
    Wind,
    Gauge,
    CarFront
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
    setLicensePlate('');
  };

  // Enregistrer la vente
  const handleSaveVente = async () => {
    

    if (cart.length === 0) {
      
      alert('Le panier est vide');
      return;
    }

    if (!selectedCompanyId) {
      console.log('❌ Pas d\'entreprise sélectionnée');
      alert('Aucune entreprise sélectionnée');
      return;
    }

    if (!user) {
      console.log('❌ Utilisateur non connecté');
      alert('Utilisateur non connecté');
      return;
    }

    console.log('✅ Toutes les vérifications passées, début de l\'appel API');

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      console.log('🌐 URL API:', `${apiUrl}/api/ventes`);
      console.log('🔑 Token présent:', !!token);

      const requestBody = {
        prestations: cart,
        plaque: licensePlate,
        company: selectedCompanyId,
        notes: ''
      };

      console.log('📤 Corps de la requête:', requestBody);

      const response = await fetch(`${apiUrl}/api/ventes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Statut de la réponse:', response.status);
      console.log('📥 Headers de la réponse:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('📥 Données de la réponse:', data);

      if (!response.ok) {
        console.error('❌ Erreur HTTP:', response.status, data);
        throw new Error(data.message || `Erreur HTTP ${response.status}`);
      }

      if (data.success) {
        console.log('✅ Vente enregistrée avec succès:', data.vente);
        console.log('🧹 AVANT clearCart - Panier actuel:', cart);
        
        // Vider le panier IMMÉDIATEMENT
        setCart([]);
        setLicensePlate('');
        
        console.log('🧹 APRÈS clearCart - Panier vidé');
        alert(`Vente enregistrée avec succès!\nN° de commande: ${data.vente.numeroCommande}`);
      } else {
        console.error('❌ Échec de l\'enregistrement:', data);
        throw new Error(data.message || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('💥 Erreur complète:', error);
      console.error('💥 Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
      alert('Erreur lors de l\'enregistrement de la vente: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Point de vente - Prestations</h1>
            <p className="text-muted-foreground">Gestion des prestations de service</p>
          </div>

          {/* Panier Button pour mobile */}
          <div className="lg:hidden">
            <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md">
              <ShoppingCart className="w-5 h-5" />
              <span>Panier ({cart.length})</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Prestations */}
          <div className="xl:col-span-3 space-y-6">
            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher une prestation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="relative">
                <select
                  value={selectedPartnership}
                  onChange={(e) => setSelectedPartnership(e.target.value)}
                  className="appearance-none bg-background border border-input rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
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

            {/* Onglets */}
            <div className="flex space-x-1 bg-muted rounded-lg p-1">
              {['Prestation de service', 'Ventes', 'Customs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Contenu des prestations */}
            <div className="min-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64 text-destructive">
                  <span>{error}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFilteredPrestations(activeTab).map((prestation) => {
                    const IconComponent = iconMap[prestation.icon] || Wrench;
                    const cartItem = cart.find(item => item._id === prestation._id);

                    return (
                      <motion.div
                        key={prestation._id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex flex-col items-center text-center space-y-4">
                          <div className="p-4 bg-primary/10 rounded-lg">
                            <IconComponent className="w-12 h-12 text-primary" />
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-foreground text-lg">{prestation.name}</h3>
                            <p className="text-muted-foreground text-sm mt-1">{prestation.description}</p>
                            {prestation.partner && (
                              <div className="flex items-center justify-center mt-2">
                                <Handshake className="w-4 h-4 text-muted-foreground mr-1" />
                                <span className="text-xs text-muted-foreground">{prestation.partner}</span>
                              </div>
                            )}
                          </div>

                          <div className="text-2xl font-bold text-primary">
                            ${prestation.price.toLocaleString()}
                          </div>

                          <div className="w-full">
                            {cartItem ? (
                              <div className="flex items-center justify-center space-x-3">
                                <button
                                  onClick={() => removeFromCart(prestation._id)}
                                  className="p-2 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-4 py-2 bg-primary/10 text-primary rounded-md font-medium min-w-[60px]">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() => addToCart(prestation)}
                                  className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(prestation)}
                                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
                              >
                                <Plus className="w-4 h-4" />
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
                        <p className="text-muted-foreground">
                          Aucune prestation trouvée
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Panier */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Panier
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-destructive hover:text-destructive/80 text-sm font-medium"
                  >
                    Vider le panier
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Votre panier est vide</p>
                  <p className="text-sm text-muted-foreground mt-1">Nouvelle commande</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Articles du panier */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item._id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {React.createElement(iconMap[item.icon] || Wrench, {
                              className: "w-6 h-6 text-primary"
                            })}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              ${item.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-2 py-1 bg-background rounded text-sm font-medium min-w-[30px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFromCart(item._id)}
                            className="p-1 text-destructive hover:text-destructive/80 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Résumé des prix */}
                  <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commission:</span>
                      <span className="text-foreground">$600</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prix usine:</span>
                      <span className="text-foreground">$0</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-foreground border-t border-border pt-2">
                      <span>Total:</span>
                      <span>${(getTotalPrice() + 600).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Bouton enregistrer */}
                  <button
                    onClick={handleSaveVente}
                    className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PrestationsPage;
