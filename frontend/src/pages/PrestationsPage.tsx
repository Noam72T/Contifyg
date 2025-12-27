import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Minus, 
  Search,
  Trash2,
  Car,
  Users,
  ShoppingCart,
  ChevronDown,
  FileText,
  Settings,
  BarChart3,
  TrendingDown,
  Receipt,
  Banknote,
  Shield,
  Package,
  Handshake,
  Building,
  UserCheck,
  X,
  AlertCircle,
  GripVertical,
} from 'lucide-react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useService } from '../contexts/ServiceContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { showToast } from '../utils/toastDeduplicator';

const PrestationsPage: React.FC = () => {
  const { isInService, isLoading: serviceLoading } = useService();
  const { selectedCompany } = useCompany();
  
  // Charger le panier depuis localStorage au démarrage (spécifique à l'entreprise)
  const loadCartFromStorage = (companyId: string) => {
    try {
      const savedCart = localStorage.getItem(`prestations-cart-${companyId}`);
      if (!savedCart) return [];
      
      const parsedCart = JSON.parse(savedCart);
      
      // Filtrer les items invalides (sans _id ou sans nom)
      const validCart = parsedCart.filter((item: any) => {
        if (!item || !item._id) {
          console.warn('Item invalide supprimé du panier:', item);
          return false;
        }
        if (!item.nom && !item.name) {
          console.warn('Item sans nom supprimé du panier:', item);
          return false;
        }
        return true;
      });
      
      return validCart;
    } catch (error) {
      console.error('Erreur lors du chargement du panier:', error);
      return [];
    }
  };

  const [cart, setCart] = useState<any[]>([]);
  const isInitialMount = useRef(true);
  
  // Sauvegarder le panier dans localStorage (spécifique à l'entreprise)
  const saveCartToStorage = (cartData: any[], companyId: string) => {
    try {
      localStorage.setItem(`prestations-cart-${companyId}`, JSON.stringify(cartData));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du panier:', error);
    }
  };

  // Charger le panier quand l'entreprise change
  useEffect(() => {
    if (selectedCompany?._id) {
      // Réinitialiser le flag pour permettre le chargement
      isInitialMount.current = true;
      
      const savedCart = loadCartFromStorage(selectedCompany._id);
      
      console.log('🛒 Panier chargé depuis localStorage:', savedCart);
      console.log('🛒 Nombre d\'items:', savedCart.length);
      console.log('🛒 Contenu brut:', JSON.stringify(savedCart, null, 2));
      
      // Vérifier que le panier contient des items valides
      const validItems = savedCart.filter((item: any) => {
        const isValid = item && item._id && (item.nom || item.name);
        if (!isValid) {
          console.warn('❌ Item invalide filtré:', item);
        }
        return isValid;
      });
      
      console.log('✅ Items valides après filtrage:', validItems);
      console.log('✅ Nombre d\'items valides:', validItems.length);
      console.log('✅ Contenu validé:', JSON.stringify(validItems, null, 2));
      
      setCart(validItems);
      
      if (validItems.length > 0) {
        showToast.success(`Panier restauré avec ${validItems.length} article${validItems.length > 1 ? 's' : ''}`, {
          duration: 3000,
          icon: '🛒'
        });
      }
      
      // Marquer que le chargement initial est terminé après un court délai
      setTimeout(() => {
        isInitialMount.current = false;
        console.log('✅ Chargement initial terminé, sauvegarde automatique activée');
      }, 100);
    }
  }, [selectedCompany?._id]);

  // Sauvegarder automatiquement le panier à chaque changement (sauf au premier chargement)
  useEffect(() => {
    // Ne pas sauvegarder lors du premier chargement pour éviter d'écraser le panier existant
    if (!isInitialMount.current && selectedCompany?._id) {
      console.log('💾 Sauvegarde du panier:', cart);
      saveCartToStorage(cart, selectedCompany._id);
    }
  }, [cart, selectedCompany?._id]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('');
  
  // Charger le partenariat sélectionné depuis localStorage (spécifique à l'entreprise)
  const loadPartnershipFromStorage = (companyId: string) => {
    try {
      const savedPartnership = localStorage.getItem(`prestations-partnership-${companyId}`);
      return savedPartnership || 'Aucun partenaire';
    } catch (error) {
      return 'Aucun partenaire';
    }
  };

  const [selectedPartnership, setSelectedPartnership] = useState('Aucun partenaire');

  // Charger le partenariat quand l'entreprise change
  useEffect(() => {
    if (selectedCompany?._id) {
      const savedPartnership = loadPartnershipFromStorage(selectedCompany._id);
      setSelectedPartnership(savedPartnership);
    }
  }, [selectedCompany?._id]);

  // Sauvegarder le partenariat sélectionné (spécifique à l'entreprise)
  useEffect(() => {
    if (selectedCompany?._id) {
      localStorage.setItem(`prestations-partnership-${selectedCompany._id}`, selectedPartnership);
    }
  }, [selectedPartnership, selectedCompany?._id]);
  const [partenariats, setPartenariats] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [selectedCustomCategory, setSelectedCustomCategory] = useState('cat1');
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Package');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [newCategoryVehicleType, setNewCategoryVehicleType] = useState('');
  const [draggedCategory, setDraggedCategory] = useState<any>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Effet pour réinitialiser l'onglet actif quand le partenariat change
  useEffect(() => {
    if (selectedPartnership !== 'Aucun partenaire') {
      const partenaireSelectionne = partenariats.find(p => 
        (p.nom || p.entreprisePartenaire) === selectedPartnership
      );
      
      // Si le partenariat a des restrictions de catégories, basculer sur la première catégorie autorisée
      if (partenaireSelectionne && partenaireSelectionne.categoriesVisibles && partenaireSelectionne.categoriesVisibles.length > 0) {
        setActiveTab(partenaireSelectionne.categoriesVisibles[0].name);
      }
    }
  }, [selectedPartnership, partenariats]);

  // Effet pour reset les informations véhicule quand on change vers une catégorie sans customVehicleCategory
  useEffect(() => {
    const activeCategory = categories.find(cat => cat.name === activeTab);
    const hasVehicleCategory = activeCategory?.customVehicleCategory;
    
    // Si la catégorie active n'a pas de customVehicleCategory, reset les infos véhicule
    if (!hasVehicleCategory) {
      setVehicleInfo(null);
      setVehiclePlate('');
    }
  }, [activeTab, categories]);


  // Fonction pour récupérer les informations du véhicule
  const fetchVehicleInfo = async (plate: string) => {
    if (!plate.trim()) {
      setVehicleInfo(null);
      return;
    }

    try {
      setLoadingVehicle(true);
      
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const proxyUrl = `${apiUrl}/api/vehicles/search/${encodeURIComponent(plate)}`;
      
      
      const token = localStorage.getItem('token');
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      
      
      if (response.ok) {
        const result = await response.json();
        
        
        if (result.success && result.data) {
          setVehicleInfo(result.data);
          showToast.success(`Véhicule trouvé: ${result.data.model}`);
        } else {
          setVehicleInfo(null);
          showToast.error('Erreur dans la réponse du serveur');
        }
      } else if (response.status === 404) {
        
        
        // MODE TEST : Utiliser des données fictives pour tester l'interface
        if (plate.toLowerCase().includes('test') || plate === '1234AB01') {
          
          const testData = {
            id: 1,
            model: "blista",
            name: "Blista",
            plate: plate,
            illegal: 0,
            buyer: "Test User",
            owner: {
              id: 1,
              name: "John Doe",
              type: 1
            }
          };
          setVehicleInfo(testData);
          showToast.success(`Véhicule test trouvé: ${testData.name} (${testData.model})`);
        } else {
          setVehicleInfo(null);
          showToast.error(`Véhicule avec la plaque "${plate}" non trouvé. Essayez "TEST" ou "1234AB01" pour tester l'interface.`);
        }
      } else {
        
        setVehicleInfo(null);
        showToast.error(`Erreur API: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('💥 Erreur lors de la récupération du véhicule:', error);
      setVehicleInfo(null);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showToast.error('Impossible de contacter l\'API véhicules. Vérifiez votre connexion internet.');
      } else {
        showToast.error('Erreur lors de la recherche du véhicule. Consultez la console pour plus de détails.');
      }
    } finally {
      setLoadingVehicle(false);
    }
  };
  // Plus besoin de hiddenTabs car on n'affiche que les catégories créées
  const { user } = useAuth();
  const { hasPermission } = useUserPermissions();

  // Charger les catégories et items de l'entreprise
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCompany) {
        setCategories([]);
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL;
        
        // Charger les catégories personnalisées
        const categoriesResponse = await fetch(`${apiUrl}/api/categories/${selectedCompany._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const categoriesData = await categoriesResponse.json();
        if (categoriesData.success) {
          // Trier les catégories par ordre (ou par date de création si pas d'ordre)
          const sortedCategories = categoriesData.categories.sort((a: any, b: any) => {
            // Si les deux ont un ordre défini, trier par ordre
            if (a.order !== undefined && a.order !== null && b.order !== undefined && b.order !== null) {
              return a.order - b.order;
            }
            // Si seulement a a un ordre, a vient en premier
            if (a.order !== undefined && a.order !== null) return -1;
            // Si seulement b a un ordre, b vient en premier
            if (b.order !== undefined && b.order !== null) return 1;
            // Sinon, trier par date de création
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
          setCategories(sortedCategories);
        }

        // Charger les items
        const itemsResponse = await fetch(`${apiUrl}/api/items?companyId=${selectedCompany._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          setItems(itemsData);
        }

        // Charger les partenariats
        const partenariatsResponse = await fetch(`${apiUrl}/api/partenariats?companyId=${selectedCompany._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (partenariatsResponse.ok) {
          const partenariatsData = await partenariatsResponse.json();
          setPartenariats(partenariatsData.partenariats || []);
        }

        // Charger les stocks
        const stocksResponse = await fetch(`${apiUrl}/api/stock?companyId=${selectedCompany._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (stocksResponse.ok) {
          const stocksData = await stocksResponse.json();
          setStocks(stocksData.stocks || []);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCompany]);

  // Fonction pour obtenir l'icône selon le nom
  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      FileText, Settings, BarChart3, TrendingDown, Receipt, UserCheck, 
      Banknote, Shield, Package, Handshake, Building, Car, Users
    };
    return iconMap[iconName] || Package;
  };

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'Car': return Car;
      case 'Users': return Users;
      default: return Package;
    }
  };

  // Ajouter au panier
  const addToCart = (item: any) => {
    // Vérifier le stock avant d'ajouter
    const itemStock = stocks.find(stock => stock.item?._id === item._id);
    
    // Si pas de stock défini, le produit est illimité
    if (!itemStock) {
      setCart(prev => {
        const existingItem = prev.find(cartItem => cartItem._id === item._id);
        if (existingItem) {
          return prev.map(cartItem =>
            cartItem._id === item._id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          );
        }
        return [...prev, { ...item, quantity: 1, price: item.prixVente }];
      });
      return;
    }
    
    const stockQuantite = itemStock.quantite;
    
    // Vérifier la quantité déjà dans le panier
    const cartItem = cart.find(cartItem => cartItem._id === item._id);
    const quantiteEnPanier = cartItem ? cartItem.quantity : 0;
    
    if (stockQuantite <= 0) {
      showToast.error('Cet article est en rupture de stock');
      return;
    }
    
    if (quantiteEnPanier >= stockQuantite) {
      showToast.error(`Stock insuffisant. Disponible: ${stockQuantite}, Déjà dans le panier: ${quantiteEnPanier}`);
      return;
    }
    
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem._id === item._id);
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1, price: item.prixVente }];
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

  // Calculer le "Prix usine" affiché (qui correspond à la marge brute)
  // Prix usine = ce que l'entreprise gagne (margeBrute)
  const getTotalCommission = () => {
    return cart.reduce((total, item) => {
      const margeBrute = item.margeBrute || 0;
      return total + (margeBrute * item.quantity);
    }, 0);
  };

  // Calculer la "Commission" affichée (qui correspond au coût de revient)
  // Commission = ce que l'entreprise paie (coutRevient)
  const getTotalFactoryPrice = () => {
    return cart.reduce((total, item) => {
      const coutRevient = item.coutRevient || 0;
      return total + (coutRevient * item.quantity);
    }, 0);
  };

  // Vider le panier
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('prestations-cart');
    setSelectedPartnership('Aucun partenaire');
  };

  // Définir l'onglet actif par défaut
  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].name);
    }
  }, [categories, activeTab]);

  // Supprimer une catégorie
  const handleDeleteCategory = async (categoryId: string) => {
    if (!selectedCompany) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Recharger les catégories
        const categoriesResponse = await fetch(`${apiUrl}/api/categories/${selectedCompany._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const categoriesData = await categoriesResponse.json();
        if (categoriesData.success) {
          setCategories(categoriesData.categories);
        }
        
        // Si l'onglet actif était la catégorie supprimée, revenir aux Prestations
        const deletedCategory = categories.find(cat => cat._id === categoryId);
        if (deletedCategory && activeTab === deletedCategory.name) {
          setActiveTab('Prestations');
        }
        
        showToast.success('Catégorie supprimée avec succès!');
      } else {
        showToast.error(data.error || 'Erreur lors de la suppression de la catégorie');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast.error('Erreur lors de la suppression de la catégorie');
    }
  };

  // Créer une nouvelle catégorie
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !selectedCompany) {
      showToast.error('Veuillez saisir un nom de catégorie');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newCategoryName,
          icon: newCategoryIcon,
          color: newCategoryColor,
          company: selectedCompany._id,
          customVehicleCategory: newCategoryVehicleType.trim() || null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Recharger les catégories
        const categoriesResponse = await fetch(`${apiUrl}/api/categories/${selectedCompany._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const categoriesData = await categoriesResponse.json();
        if (categoriesData.success) {
          setCategories(categoriesData.categories);
        }
        
        // Réinitialiser le formulaire
        setNewCategoryName('');
        setNewCategoryIcon('Package');
        setNewCategoryColor('#3b82f6');
        setNewCategoryVehicleType('');
        setShowCategoryModal(false);
        
        showToast.success('Catégorie créée avec succès!');
      } else {
        showToast.error(data.error || 'Erreur lors de la création de la catégorie');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast.error('Erreur lors de la création de la catégorie');
    }
  };

  // Fonctions de drag & drop pour réorganiser les catégories
  const handleDragStart = (e: React.DragEvent, category: any) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedCategory) return;

    const dragIndex = categories.findIndex(cat => cat._id === draggedCategory._id);
    if (dragIndex === dropIndex) return;

    // Réorganiser les catégories localement
    const newCategories = [...categories];
    const [removed] = newCategories.splice(dragIndex, 1);
    newCategories.splice(dropIndex, 0, removed);

    // Mettre à jour l'ordre avec les nouveaux index
    const updatedCategories = newCategories.map((cat, idx) => ({
      ...cat,
      order: idx
    }));

    setCategories(updatedCategories);
    setDraggedCategory(null);

    // Sauvegarder l'ordre sur le serveur
    if (!selectedCompany) return;

    console.log('💾 Sauvegarde de l\'ordre des catégories:', updatedCategories.map(c => ({ name: c.name, order: c.order })));

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiUrl}/api/categories/reorder`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: selectedCompany._id,
          categories: updatedCategories.map(cat => ({ id: cat._id, order: cat.order }))
        })
      });

      const result = await response.json();
      console.log('✅ Réponse serveur:', result);

      if (!response.ok) {
        console.error('❌ Erreur lors de la sauvegarde:', result);
        showToast.error('Erreur lors de la sauvegarde de l\'ordre');
      }
      
      // Pas de toast pour ne pas polluer l'interface
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'ordre:', error);
      showToast.error('Erreur lors de la sauvegarde de l\'ordre');
    }
  };

  // Enregistrer la vente
  const handleSaveVente = async () => {
    // Vérifier si l'utilisateur est en service
    if (!isInService) {
      showToast.error('Vous devez être en service pour créer une vente');
      return;
    }

    if (cart.length === 0) {
      
      showToast.error('Le panier est vide');
      return;
    }

    if (!selectedCompany) {
      
      showToast.error('Aucune entreprise sélectionnée');
      return;
    }

    if (!user) {
      
      showToast.error('Utilisateur non connecté');
      return;
    }

    

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
     

      // Convertir le panier au format attendu par l'API
      const prestations = cart.map(item => ({
        _id: item._id,
        nom: item.name || item.nom,
        quantite: item.quantity,
        prixUnitaire: item.price,
        prixUsine: item.coutRevient || 0,
        commission: item.margeBrute || 0,
        total: item.price * item.quantity,
        categorie: item.categorie || 'Non définie',
        partenaire: selectedPartnership === 'Aucun partenaire' ? 'Aucun' : selectedPartnership
      }));

      const requestBody = {
        prestations: prestations,
        plaque: vehiclePlate || '',
        customCategory: selectedCustomCategory || 'N/A',
        company: selectedCompany._id,
        notes: '',
        partenariat: selectedPartnership === 'Aucun partenaire' ? null : selectedPartnership
      };

      

      const response = await fetch(`${apiUrl}/api/ventes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      

      const data = await response.json();
      

      if (!response.ok) {
        console.error('❌ Erreur HTTP:', response.status, data);
        throw new Error(data.message || `Erreur HTTP ${response.status}`);
      }

      if (data.success) {
        
        
        // Décrémenter le stock pour chaque item vendu (seulement si stock géré)
        for (const item of cart) {
          const itemStock = stocks.find(stock => stock.item?._id === item._id);
          if (itemStock) { // Seulement si le stock est géré
            try {
              await fetch(`${apiUrl}/api/stock/decrement`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  itemId: item._id,
                  companyId: selectedCompany._id,
                  quantite: item.quantity,
                  motif: `Vente - ${data.vente.numero || 'N/A'}`
                })
              });
            } catch (stockError) {
              console.warn('Erreur lors de la décrémentation du stock pour', item.nom, ':', stockError);
            }
          }
        }
        
        // Recharger les stocks après la vente
        try {
          const stocksResponse = await fetch(`${apiUrl}/api/stock?companyId=${selectedCompany._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (stocksResponse.ok) {
            const stocksData = await stocksResponse.json();
            setStocks(stocksData.stocks || []);
          }
        } catch (stockError) {
          console.warn('Erreur lors du rechargement des stocks:', stockError);
        }
        
        // Vider le panier IMMÉDIATEMENT
        setCart([]);
        localStorage.removeItem('prestations-cart');
        
        // Remettre le partenariat par défaut
        setSelectedPartnership('Aucun partenaire');
        
        
      } else {
        console.error('❌ Échec de l\'enregistrement:', data);
        throw new Error(data.message || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('💥 Erreur complète:', error);
      console.error('💥 Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
      showToast.error('Erreur lors de l\'enregistrement de la vente: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  return (
    <Layout>
      <div className="flex h-screen">  
        {/* Zone principale */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Avertissement si pas en service */}
          {!serviceLoading && !isInService && (
            <div className="mx-6 mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
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
         
          
          {/* Section titre de la page */}
          <div className="py-4">
            <div className="flex items-center justify-between px-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Point de vente - Prestations</h2>
                <p className="text-sm text-muted-foreground">Gestion des prestations de service</p>
              </div>
              
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-medium">Panier</span>
                {cart.length > 0 && (
                  <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    1
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Onglets - Catégories personnalisées */}
          <div className="pt-4 px-6">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Plus d'onglets par défaut - seulement les catégories créées */}
              
              {/* Catégories personnalisées */}
              {categories
                .filter((category) => {
                  // Si "Aucun partenaire" est sélectionné, afficher toutes les catégories
                  if (selectedPartnership === 'Aucun partenaire') return true;
                  
                  // Trouver le partenariat sélectionné
                  const partenaireSelectionne = partenariats.find(p => 
                    (p.nom || p.entreprisePartenaire) === selectedPartnership
                  );
                  
                  // Si le partenariat n'a pas de restriction de catégories, afficher toutes les catégories
                  if (!partenaireSelectionne || !partenaireSelectionne.categoriesVisibles || partenaireSelectionne.categoriesVisibles.length === 0) return true;
                  
                  // Sinon, afficher seulement les catégories autorisées pour ce partenariat
                  return partenaireSelectionne.categoriesVisibles.some((catVisible: any) => 
                    catVisible._id === category._id || catVisible.name === category.name
                  );
                })
                .map((category, index) => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <div 
                    key={category._id} 
                    className={`relative group ${dragOverIndex === index ? 'border-l-4 border-primary' : ''}`}
                    draggable={hasPermission('CREATE_PRESTATION_CATEGORIES') || user?.systemRole === 'Technicien'}
                    onDragStart={(e) => handleDragStart(e, category)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <button
                      onClick={() => setActiveTab(category.name)}
                      className={`relative px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                        activeTab === category.name
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                      style={{ color: activeTab === category.name ? category.color : undefined }}
                    >
                      {/* Icône grip pour drag & drop - visible au hover, positionnée en absolu */}
                      {(hasPermission('CREATE_PRESTATION_CATEGORIES') || user?.systemRole === 'Technicien') && (
                        <GripVertical className="absolute left-1 w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab active:cursor-grabbing" />
                      )}
                      <IconComponent className="w-4 h-4" />
                      <span>{category.name}</span>
                    </button>
                    {/* Bouton de suppression visible au hover - seulement si permission */}
                    {(hasPermission('CREATE_PRESTATION_CATEGORIES') || user?.systemRole === 'Technicien') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
                            handleDeleteCategory(category._id);
                          }
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Supprimer cette catégorie"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              
              {/* Bouton pour ajouter une catégorie - seulement si permission */}
              {(hasPermission('CREATE_PRESTATION_CATEGORIES') || user?.systemRole === 'Technicien') && (
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-3 py-2 text-sm font-medium border border-dashed border-muted-foreground text-muted-foreground hover:text-foreground hover:border-foreground transition-colors flex items-center space-x-2 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter une catégorie</span>
                </button>
              )}
            </div>
          </div>


          {/* Barre de recherche et filtres */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher une prestation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm w-80"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={selectedPartnership}
                  onChange={(e) => setSelectedPartnership(e.target.value)}
                  className="appearance-none bg-background border border-input rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm min-w-[180px]"
                >
                  <option value="Aucun partenaire">Aucun partenaire</option>
                  {partenariats
                    .filter(partenariat => {
                      // Filtrer les partenariats stoppés (seulement les actifs)
                      if (partenariat.statut !== 'actif') return false;
                      
                      // Si aucune catégorie active, afficher tous les partenariats actifs
                      if (!activeTab) return true;
                      // Si le partenariat n'a pas de catégories visibles, il a accès à tout
                      if (!partenariat.categoriesVisibles || partenariat.categoriesVisibles.length === 0) return true;
                      // Sinon, vérifier si une des catégories visibles correspond à l'onglet actif
                      return partenariat.categoriesVisibles.some((catVisible: any) => 
                        catVisible.name === activeTab
                      );
                    })
                    .map((partenariat) => (
                      <option key={partenariat._id} value={partenariat.nom || partenariat.entreprisePartenaire}>
                        {partenariat.nom || partenariat.entreprisePartenaire}
                        {partenariat.categoriesVisibles && partenariat.categoriesVisibles.length > 0 && 
                          ` (${partenariat.categoriesVisibles.map((cat: any) => cat.name).join(', ')})`
                        }
                      </option>
                    ))
                  }
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              </div>

              {/* Input plaque d'immatriculation et menu catégorie - affichés seulement si la catégorie active a customVehicleCategory */}
              {(() => {
                const activeCategory = categories.find(cat => cat.name === activeTab);
                const activeVehicleType = activeCategory?.customVehicleCategory;
                
                return activeVehicleType ? (
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center">
                      <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type="text"
                        placeholder={`Plaque d'immatriculation (${activeVehicleType})`}
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        onBlur={() => fetchVehicleInfo(vehiclePlate)}
                        onKeyPress={(e) => e.key === 'Enter' && fetchVehicleInfo(vehiclePlate)}
                        className="pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm w-48"
                      />
                      {loadingVehicle && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Menu déroulant pour sélectionner cat1 à cat5 */}
                    <div className="relative">
                      <select
                        value={selectedCustomCategory}
                        onChange={(e) => setSelectedCustomCategory(e.target.value)}
                        className="appearance-none bg-background border border-input rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm min-w-[120px]"
                      >
                        <option value="cat1">Cat 1</option>
                        <option value="cat2">Cat 2</option>
                        <option value="cat3">Cat 3</option>
                        <option value="cat4">Cat 4</option>
                        <option value="cat5">Cat 5</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* Affichage des informations du véhicule */}
          {vehicleInfo && (
            <div className="mx-6 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Informations véhicule
                  </h3>
                  <div className="flex gap-6 text-sm text-blue-700 dark:text-blue-300 mt-1">
                    <span>Modèle: <strong>{vehicleInfo.model}</strong></span>
                    <span>Plaque: <strong>{vehicleInfo.plate}</strong></span>
                    {vehicleInfo.owner && vehicleInfo.owner.type && (
                      <span>Type: <strong>{vehicleInfo.owner.type === 1 ? 'Particulier' : vehicleInfo.owner.type === 2 ? 'Entreprise' : `Type ${vehicleInfo.owner.type}`}</strong></span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setVehicleInfo(null);
                    setVehiclePlate('');
                  }}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Contenu selon l'onglet actif */}
          <div className="flex-1 px-6 pb-6 overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg h-32"></div>
                  </div>
                ))}
              </div>
            ) : selectedCompany ? (
              <div className="space-y-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
                    {(() => {
                      const category = categories.find(cat => cat.name === activeTab);
                      if (category) {
                        const IconComponent = getIconComponent(category.icon);
                        return <IconComponent className="w-5 h-5" />;
                      }
                      return null;
                    })()}
                    <span>{activeTab || 'Aucune catégorie'}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab ? `Articles de la catégorie ${activeTab}` : 'Créez une catégorie pour commencer'}
                  </p>
                </div>

                {(() => {
                  const activeCategory = categories.find(cat => cat.name === activeTab);
                  const hasCustomVehicleCategory = activeCategory?.customVehicleCategory;
                  
                  const filteredItems = items.filter(item => {
                    // Seulement les catégories personnalisées
                    const category = categories.find(cat => cat.name === activeTab);
                    if (category) {
                      // item.type est un tableau, donc on utilise .includes() ou .some()
                      const matchesCategory = (Array.isArray(item.type) && item.type.includes(category.name)) || item.categorie === category.name;
                      
                      // Si la catégorie a un customVehicleCategory, filtrer aussi par selectedCustomCategory
                      if (hasCustomVehicleCategory && matchesCategory) {
                        // L'item doit avoir une customCategory qui correspond
                        return item.customCategory === selectedCustomCategory;
                      }
                      
                      return matchesCategory;
                    }
                    
                    return false;
                  }).filter(item => 
                    searchTerm === '' || item.nom.toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  return activeTab ? (
                    filteredItems.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {filteredItems.map((item: any) => {
                          // Trouver le stock pour cet item
                          const itemStock = stocks.find(stock => stock.item?._id === item._id);
                          const hasStockManagement = !!itemStock;
                          const stockQuantite = itemStock ? itemStock.quantite : null;
                          const isOutOfStock = hasStockManagement && stockQuantite <= 0;
                          
                          return (
                          <div
                            key={item._id}
                            className={`group bg-card rounded-lg overflow-hidden border transition-all hover:shadow-lg ${
                              isOutOfStock 
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/10 cursor-not-allowed opacity-60' 
                                : 'border-border hover:border-primary cursor-pointer'
                            }`}
                            onClick={() => !isOutOfStock && addToCart(item)}
                          >
                            {/* Image du produit */}
                            <div className="relative h-24 bg-muted">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.nom}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                              
                              {/* Plus icon on hover - top right */}
                              {!isOutOfStock && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  <Plus className="w-3 h-3" />
                                </div>
                              )}
                              
                              {isOutOfStock && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                                  Rupture
                                </div>
                              )}
                            </div>

                            {/* Informations du produit */}
                            <div className="p-3">
                              <div className="mb-2">
                                <h3 className="font-semibold text-foreground text-sm">{item.nom}</h3>
                                <p className="text-xs text-muted-foreground">
                                  {item.description || 'Aucune description'}
                                </p>
                              </div>

                              <div className="space-y-1 mb-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Banknote className="w-3 h-3" />
                                    Prix:
                                  </span>
                                  <span className="text-sm font-semibold text-green-600">
                                    ${item.prixVente}
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Package className="w-3 h-3" />
                                    Stock:
                                  </span>
                                  <span className="text-xs font-medium">
                                    {!hasStockManagement ? (
                                      <span className="text-blue-600 font-medium">∞</span>
                                    ) : isOutOfStock ? (
                                      <span className="text-red-600 font-medium">0</span>
                                    ) : (
                                      <span className={`font-medium ${
                                        stockQuantite <= (itemStock?.quantiteMinimale || 5)
                                          ? 'text-yellow-600'
                                          : 'text-green-600'
                                      }`}>
                                        {stockQuantite}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isOutOfStock) addToCart(item);
                                }}
                                disabled={isOutOfStock}
                                className={`w-full px-3 py-2 rounded text-sm flex items-center justify-center gap-1 font-medium ${
                                  isOutOfStock
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                }`}
                              >
                                <Plus className="w-3 h-3" />
                                {isOutOfStock ? 'Rupture' : 'Ajouter au panier'}
                              </button>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-muted-foreground">
                          {searchTerm ? `Aucun résultat pour "${searchTerm}"` : `Aucun item disponible dans ${activeTab}`}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-muted-foreground mb-4">
                        Aucune catégorie créée
                      </div>
                      {(hasPermission('CREATE_PRESTATION_CATEGORIES') || user?.systemRole === 'Technicien') && (
                        <button
                          onClick={() => setShowCategoryModal(true)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Créer votre première catégorie
                        </button>
                      )}
                    </div>
                  );
                })()
              }
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  Sélectionnez une entreprise pour accéder aux prestations
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal pour créer une catégorie */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-96 max-w-md">
              <h3 className="text-lg font-semibold text-foreground mb-4">Créer une nouvelle catégorie</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nom de la catégorie</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ex: Boissons, Nourriture, Services..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Icône</label>
                  <select
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="Package">📦 Package</option>
                    <option value="Car">🚗 Voiture</option>
                    <option value="Users">👥 Utilisateurs</option>
                    <option value="ShoppingCart">🛒 Panier</option>
                    <option value="Settings">⚙️ Paramètres</option>
                    <option value="Building">🏢 Bâtiment</option>
                    <option value="Handshake">🤝 Partenariat</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Couleur</label>
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-full h-10 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Catégorie personnalisée véhicule (optionnel)
                  </label>
                  <input
                    type="text"
                    value={newCategoryVehicleType}
                    onChange={(e) => setNewCategoryVehicleType(e.target.value)}
                    placeholder="Ex: Berline, SUV, Sportive, Moto..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si rempli, cette catégorie permettra la recherche de véhicules par plaque d'immatriculation
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    // Réinitialiser le formulaire
                    setNewCategoryName('');
                    setNewCategoryIcon('Package');
                    setNewCategoryColor('#3b82f6');
                    setNewCategoryVehicleType('');
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateCategory}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panier sidebar - prend toute la hauteur */}
        <div className="w-80 bg-card flex flex-col min-h-0">
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Panier</h2>
              <div className="text-xs text-muted-foreground">Nouvelle commande</div>
            </div>

            {(() => {
              console.log('🎨 Rendu du panier - Nombre d\'items:', cart.length);
              console.log('🎨 Contenu du panier:', cart);
              return cart.length === 0;
            })() ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Votre panier est vide</p>
                  <p className="text-xs text-muted-foreground mt-1">Nouvelle commande</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Articles du panier */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {cart.map((item) => {
                    // Vérifier que l'item a les propriétés nécessaires
                    if (!item || !item._id) {
                      console.warn('Item invalide dans le panier:', item);
                      return null;
                    }

                    const IconComponent = getIcon(item.icon || 'Package');

                    return (
                      <div key={item._id} className="flex items-center space-x-3 p-3 bg-card border border-border rounded-xl hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex-shrink-0 overflow-hidden ring-1 ring-primary/20">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name || item.nom || 'Article'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <IconComponent className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center">
                          <h4 className="font-semibold text-foreground text-base leading-tight">
                            {item.nom || item.name || 'Article sans nom'}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium min-w-[20px] text-center">
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

                {/* Résumé des prix - en bas du panier */}
                <div className="border-t border-border pt-4 space-y-2 mt-4">
                  <div className="flex justify-between text-base font-semibold text-foreground">
                    <span>Total:</span>
                    <span>${getTotalPrice().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prix usine:</span>
                    <span className="text-foreground">${getTotalCommission().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commission:</span>
                    <span className="text-foreground">${getTotalFactoryPrice().toLocaleString()}</span>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="space-y-2 pt-4">
                  <button
                    onClick={clearCart}
                    className="w-full px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg text-sm transition-colors"
                  >
                    Vider le panier
                  </button>
                  <button 
                    onClick={handleSaveVente}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                  >
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
