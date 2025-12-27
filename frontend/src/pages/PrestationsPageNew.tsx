import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Minus, 
  Search, 
  Trash2
} from 'lucide-react';

import Layout from '../components/Layout';

interface Prestation {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  description: string;
}

interface CartItem extends Prestation {
  quantity: number;
}

const PrestationsPage: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Prestation de service');

  // Données des prestations par catégorie
  const prestationsData = {
    'Prestation de service': [
      {
        id: '1',
        name: 'Carrosserie',
        price: 50,
        category: 'Prestation de service',
        emoji: '🚗',
        description: 'Réparation complète de carrosserie'
      },
      {
        id: '2',
        name: 'Dépannage (/km)',
        price: 100,
        category: 'Prestation de service',
        emoji: '🔧',
        description: 'Service de dépannage automobile'
      },
      {
        id: '3',
        name: 'Fourrière',
        price: 150,
        category: 'Prestation de service',
        emoji: '🚛',
        description: 'Mise en fourrière de véhicule'
      },
      {
        id: '4',
        name: 'Fourrière bât/avt/héli',
        price: 300,
        category: 'Prestation de service',
        emoji: '🚁',
        description: 'Fourrière spécialisée véhicules spéciaux'
      },
      {
        id: '5',
        name: 'Nettoyage',
        price: 50,
        category: 'Prestation de service',
        emoji: '🧽',
        description: 'Nettoyage complet du véhicule'
      },
      {
        id: '6',
        name: 'Pneu',
        price: 100,
        category: 'Prestation de service',
        emoji: '🛞',
        description: 'Changement de pneus'
      },
      {
        id: '7',
        name: 'Répa Complète',
        price: 250,
        category: 'Prestation de service',
        emoji: '⚙️',
        description: 'Réparation complète du véhicule'
      },
      {
        id: '8',
        name: 'Répa. moteur',
        price: 200,
        category: 'Prestation de service',
        emoji: '🔩',
        description: 'Réparation moteur'
      },
      {
        id: '9',
        name: 'Stationnement Gênant',
        price: 200,
        category: 'Prestation de service',
        emoji: '🚫',
        description: 'Intervention stationnement gênant'
      }
    ],
    'Ventes': [
      {
        id: '10',
        name: 'Véhicule Sport',
        price: 50000,
        category: 'Ventes',
        emoji: '🏎️',
        description: 'Véhicule de sport haute performance'
      },
      {
        id: '11',
        name: 'Véhicule Familial',
        price: 25000,
        category: 'Ventes',
        emoji: '🚙',
        description: 'Véhicule familial spacieux'
      }
    ],
    'Customs': [
      {
        id: '12',
        name: 'Modification Moteur',
        price: 5000,
        category: 'Customs',
        emoji: '🔋',
        description: 'Modification et tuning moteur'
      },
      {
        id: '13',
        name: 'Kit Carrosserie',
        price: 3000,
        category: 'Customs',
        emoji: '🎨',
        description: 'Kit de carrosserie personnalisé'
      }
    ]
  };

  const tabs = ['Prestation de service', 'Ventes', 'Customs'];

  const currentPrestations = prestationsData[activeTab as keyof typeof prestationsData] || [];

  const filteredPrestations = currentPrestations.filter(prestation =>
    prestation.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (prestation: Prestation) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === prestation.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === prestation.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...prestation, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(id);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const clearCart = () => {
    setCart([]);
  };

  const processOrder = () => {
    alert(`Commande enregistrée pour un total de $${getTotalPrice()}`);
    clearCart();
  };

  return (
    <Layout>
      <div className="h-full flex bg-gray-900 text-white">
        {/* Section principale */}
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Point de vente - Prestations
            </h1>
            <p className="text-gray-400">Gestion des prestations de service</p>
          </div>

          {/* Onglets */}
          <div className="flex space-x-1 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Barre de recherche */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une prestation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Aucun partenaire dropdown (comme dans l'image) */}
          <div className="mb-6">
            <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500">
              <option>Aucun partenaire</option>
            </select>
          </div>

          {/* Grille des prestations */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredPrestations.map((prestation) => (
              <motion.div
                key={prestation.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer relative"
                onClick={() => addToCart(prestation)}
              >
                <div className="text-3xl mb-3 text-center">{prestation.emoji}</div>
                <h3 className="font-medium text-white text-sm mb-1">{prestation.name}</h3>
                <p className="text-xs text-gray-400 mb-3">{prestation.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-400">${prestation.price}</span>
                  <button className="bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Panier à droite */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              🛒 Panier
            </h2>
            {getTotalItems() > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                {getTotalItems()}
              </span>
            )}
          </div>

          <div className="mb-4">
            <p className="text-gray-400 text-sm">Nouvelle commande</p>
          </div>

          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Votre panier est vide</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{item.emoji}</span>
                      <div>
                        <h4 className="text-white text-sm font-medium">{item.name}</h4>
                        <p className="text-xs text-gray-400">${item.price}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.id);
                      }}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, item.quantity - 1);
                        }}
                        className="bg-gray-600 text-white p-1 rounded hover:bg-gray-500"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, item.quantity + 1);
                        }}
                        className="bg-gray-600 text-white p-1 rounded hover:bg-gray-500"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-blue-400 font-bold">${item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-400">
                  <span>Commission:</span>
                  <span>$600</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Prix usine:</span>
                  <span>$0</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg">
                  <span>Total:</span>
                  <span>${getTotalPrice() + 600}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={clearCart}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Vider le panier
                </button>
                <button
                  onClick={processOrder}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PrestationsPage;
