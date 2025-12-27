import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Package, X, Upload, Link as LinkIcon, Download, FileText, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import toast from 'react-hot-toast';

interface Item {
  _id: string;
  nom: string;
  image: string;
  type: string | string[];
  prixVente: number;
  coutRevient: number;
  margeBrute: number;
  gestionStock?: boolean;
  customCategory?: string;
  company?: any;
  creePar?: any;
  dateCreation?: Date;
  dateModification?: Date;
}

interface PackItem {
  nom: string;
  image: string;
  prixVente: number;
  coutRevient: number;
  margeBrute?: number;
  gestionStock: boolean;
  customCategory: string;
}

interface ItemPack {
  _id: string;
  nom: string;
  description: string;
  items: PackItem[];
  creePar?: { username: string; firstName?: string; lastName?: string };
  isActive: boolean;
}

const GestionItemsPage: React.FC = () => {
  const { hasPermission, canViewCategory } = useUserPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { } = useAuth();
  const { selectedCompany } = useCompany();

  // Vérifier les permissions
  const canViewItems = canViewCategory('GESTION') || hasPermission('VIEW_GESTION_CATEGORY');
  const canManageItems = hasPermission('MANAGE_ITEMS');

  const itemsPerPage = 6;
  const [formData, setFormData] = useState({
    nom: '',
    image: '',
    type: [] as string[],
    prixVente: 0,
    coutRevient: 0,
    gestionStock: false,
    customCategory: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États pour les packs d'items
  const [showPacksModal, setShowPacksModal] = useState(false);
  const [availablePacks, setAvailablePacks] = useState<ItemPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [importingPdf, setImportingPdf] = useState(false);

  const startEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      nom: item.nom,
      image: item.image,
      type: Array.isArray(item.type) ? item.type : [item.type],
      prixVente: item.prixVente,
      coutRevient: item.coutRevient,
      gestionStock: item.gestionStock || false,
      customCategory: item.customCategory || ''
    });
    // Détecter si l'image est une URL ou base64
    if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://'))) {
      setImageInputMode('url');
      setImageUrl(item.image);
    } else {
      setImageInputMode('upload');
      setImageUrl('');
    }
    setShowAddForm(true);
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [selectedCompany]);

  const fetchItems = async () => {
    if (!selectedCompany) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/items?companyId=${selectedCompany._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Items récupérés:', data);
        console.log('📦 Premier item:', data[0]);
        setItems(data);
      } else {
        toast.error('Erreur lors du chargement des items');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
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
      
      // Ajouter le paramètre type=product pour filtrer les catégories appropriées
      const response = await fetch(`${apiUrl}/api/prestations/categories/${selectedCompany._id}?type=product`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        // Si aucune catégorie de produit n'existe, créer les catégories par défaut
        if (data.categories.length === 0) {
          await createDefaultProductCategories();
        } else {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  };

  const createDefaultProductCategories = async () => {
    if (!selectedCompany) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/prestations/categories/${selectedCompany._id}/create-product-categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
        toast.success('Catégories de produits créées automatiquement');
      }
    } catch (error) {
      console.error('Erreur lors de la création des catégories par défaut:', error);
      toast.error('Erreur lors de la création des catégories par défaut');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier les permissions de gestion
    if (!canManageItems) {
      toast.error('Vous n\'avez pas les permissions pour gérer les items');
      return;
    }
    
    if (!selectedCompany) {
      toast.error('Veuillez sélectionner une entreprise');
      return;
    }

    // La sélection de catégorie est maintenant optionnelle
    // Pas de validation requise pour les catégories

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const url = editingItem 
        ? `${apiUrl}/api/items/${editingItem._id}` 
        : `${apiUrl}/api/items`;
      const method = editingItem ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        companyId: selectedCompany._id
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
        toast.success(editingItem ? 'Item modifié avec succès!' : 'Item créé avec succès!');
        await fetchItems();
        resetForm();
      } else {
        toast.error(result.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      image: '',
      type: [],
      prixVente: 0,
      coutRevient: 0,
      gestionStock: false,
      customCategory: ''
    });
    setImageUrl('');
    setImageInputMode('upload');
    setEditingItem(null);
    setShowAddForm(false);
  };

  const toggleCategory = (categoryName: string) => {
    setFormData(prev => {
      const newTypes = prev.type.includes(categoryName)
        ? prev.type.filter(t => t !== categoryName)
        : [...prev.type, categoryName];
      return { ...prev, type: newTypes };
    });
  };

  // Fonction temporaire pour initialiser gestionStock sur tous les items
  const initializeGestionStock = async () => {
    if (!confirm('Voulez-vous initialiser le champ "gestionStock" sur tous les items existants ? (Cela les mettra tous à "false" par défaut)')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/items/init-gestion-stock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(`${result.modifiedCount} items initialisés avec succès!`);
        await fetchItems(); // Recharger la liste
      } else {
        toast.error(result.message || 'Erreur lors de l\'initialisation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData({ ...formData, image: result });
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Veuillez sélectionner un fichier image');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDelete = async (id: string) => {
    // Vérifier les permissions de gestion
    if (!canManageItems) {
      toast.error('Vous n\'avez pas les permissions pour supprimer des items');
      return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet item ?')) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Item supprimé avec succès!');
        await fetchItems();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  // Fonctions pour les packs d'items
  const fetchAvailablePacks = async () => {
    setLoadingPacks(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/item-packs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailablePacks(data);
      } else {
        toast.error('Erreur lors du chargement des packs');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setLoadingPacks(false);
    }
  };

  const handleOpenPacksModal = () => {
    fetchAvailablePacks();
    setShowPacksModal(true);
  };

  const handleLoadPack = async (packId: string, packName: string) => {
    if (!selectedCompany) {
      toast.error('Veuillez sélectionner une entreprise');
      return;
    }

    if (!confirm(`Charger le pack "${packName}" ? Les items seront ajoutés à votre entreprise.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/item-packs/${packId}/load`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyId: selectedCompany._id })
      });

      const result = await response.json();
      
      if (response.ok) {
        if (result.skipped > 0) {
          toast.success(`${result.created} item(s) ajouté(s). ${result.skipped} item(s) ignoré(s) (déjà existants)`);
        } else {
          toast.success(`${result.created} item(s) ajouté(s) avec succès!`);
        }
        setShowPacksModal(false);
        await fetchItems();
      } else {
        toast.error(result.message || 'Erreur lors du chargement du pack');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  // Fonction pour compresser un fichier en base64
  const compressFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Enlever le préfixe data:application/pdf;base64,
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Import PDF direct pour les entreprises avec fallback compression
  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner un fichier PDF');
      return;
    }

    // Vérifier la taille du fichier (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error(`Le fichier est trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Taille maximum: 50MB`);
      return;
    }

    if (!selectedCompany) {
      toast.error('Veuillez sélectionner une entreprise');
      return;
    }

    setImportingPdf(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      let parseResult;
      
      // Si le fichier fait plus de 5MB, utiliser directement base64
      if (file.size > 5 * 1024 * 1024) {
        console.log('📄 Fichier volumineux détecté (>5MB), utilisation directe de base64');
        toast('Fichier volumineux détecté, compression en cours...', { icon: 'ℹ️' });
        
        const base64Data = await compressFileToBase64(file);
        
        const parseResponse = await fetch(`${apiUrl}/api/item-packs/parse-pdf-base64`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pdfData: base64Data,
            filename: file.name,
            size: file.size
          })
        });

        if (!parseResponse.ok) {
          throw new Error(`HTTP ${parseResponse.status}`);
        }

        parseResult = await parseResponse.json();
      } else {
        // Pour les petits fichiers, essayer l'upload normal d'abord
        try {
          const formData = new FormData();
          formData.append('pdf', file);
          
          const parseResponse = await fetch(`${apiUrl}/api/item-packs/parse-pdf`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!parseResponse.ok) {
            throw new Error(`HTTP ${parseResponse.status}`);
          }

          parseResult = await parseResponse.json();
        } catch (uploadError: any) {
          // Fallback vers base64 même pour les petits fichiers
          console.log('🔄 Erreur upload normal, basculement vers base64:', uploadError);
          toast('Problème d\'upload, utilisation de la compression...', { icon: 'ℹ️' });
          
          const base64Data = await compressFileToBase64(file);
          
          const parseResponse = await fetch(`${apiUrl}/api/item-packs/parse-pdf-base64`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              pdfData: base64Data,
              filename: file.name,
              size: file.size
            })
          });

          if (!parseResponse.ok) {
            throw new Error(`HTTP ${parseResponse.status}`);
          }

          parseResult = await parseResponse.json();
        }
      }

      if (!parseResult.success) {
        toast.error(parseResult.message || 'Erreur lors de la lecture du PDF');
        return;
      }

      const importedItems = parseResult.items;
      toast.success(`${importedItems.length} items trouvés dans le PDF`);

      // Créer les items directement pour l'entreprise
      let created = 0;
      let skipped = 0;

      for (const item of importedItems) {
        try {
          const createResponse = await fetch(`${apiUrl}/api/items`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              nom: item.nom,
              image: item.image || '',
              type: [], // Catégories vides - l'entreprise les définira
              prixVente: item.prixVente,
              coutRevient: item.coutRevient,
              gestionStock: item.gestionStock || false,
              customCategory: item.customCategory || '',
              company: selectedCompany._id
            })
          });

          if (createResponse.ok) {
            created++;
          } else {
            const error = await createResponse.json();
            if (error.message?.includes('existe déjà')) {
              skipped++;
            }
          }
        } catch (err) {
          console.error('Erreur création item:', err);
        }
      }

      if (skipped > 0) {
        toast.success(`${created} item(s) créé(s), ${skipped} ignoré(s) (déjà existants)`);
      } else {
        toast.success(`${created} item(s) créé(s) avec succès!`);
      }

      await fetchItems();

    } catch (error: any) {
      console.error('Erreur import PDF:', error);
      
      // Gestion spécifique de l'erreur 413
      if (error.message?.includes('413') || error.message?.includes('Request Entity Too Large')) {
        toast.error('Fichier trop volumineux. Réduisez la taille du PDF ou contactez l\'administrateur.');
      } else if (error.message?.includes('Unexpected token')) {
        toast.error('Erreur serveur. Le fichier est peut-être trop volumineux.');
      } else {
        toast.error(error.response?.data?.message || 'Erreur lors de l\'import du PDF');
      }
    } finally {
      setImportingPdf(false);
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  // Filtrer les items
  const filteredItems = items.filter(item => {
    return item.nom.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Vérification des permissions d'accès
  if (!canViewItems) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Accès Refusé</h1>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à la gestion des items.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Chargement...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-background text-foreground p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des produits</h1>
            <p className="text-muted-foreground">Gérer les produits et prestations</p>
          </div>
          <div className="flex gap-2">
            {/* Bouton pour importer depuis un PDF */}
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={handlePdfImport}
              className="hidden"
            />
            <Button 
              onClick={() => pdfInputRef.current?.click()}
              disabled={importingPdf}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs h-9 px-4 py-2 has-[>svg]:px-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {importingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Import...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Importer PDF
                </>
              )}
            </Button>
            {/* Bouton pour charger un pack d'items */}
            <Button 
              onClick={handleOpenPacksModal}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs h-9 px-4 py-2 has-[>svg]:px-3 bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Charger un Pack
            </Button>
            {/* Bouton temporaire pour initialiser gestionStock */}
            <Button 
              onClick={initializeGestionStock}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs h-9 px-4 py-2 has-[>svg]:px-3 bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Package className="w-4 h-4 mr-2" />
              Initialiser Stock
            </Button>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs h-9 px-4 py-2 has-[>svg]:px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un produit
            </Button>
          </div>
        </div>


        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher par nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total produits</p>
                <p className="text-2xl font-bold text-foreground">{filteredItems.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valeur totale stock</p>
                <p className="text-2xl font-bold text-foreground">
                  ${filteredItems.reduce((sum, item) => sum + item.prixVente, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Package className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commission moyenne</p>
                <p className="text-2xl font-bold text-foreground">
                  ${filteredItems.length > 0 ? (filteredItems.reduce((sum, item) => sum + item.margeBrute, 0) / filteredItems.length).toFixed(2) : '0'}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Aucun produit trouvé</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Image</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Coût de revient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prix de vente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Marge brute</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Gestion Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {paginatedItems.map((item) => (
                      <tr key={item._id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.nom}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{item.nom}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">${item.coutRevient}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">${item.prixVente}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500">${item.margeBrute}</td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {Array.isArray(item.type) ? (
                            item.type.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.type.map((t, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground italic">
                                Personnalisé
                              </span>
                            )
                          ) : item.type ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {item.type}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground italic">
                              Personnalisé
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {item.gestionStock ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Activé
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              ✗ Désactivé
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-primary hover:text-primary/80 mr-3"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                totalItems={filteredItems.length}
              />
            </>
          )}
        </div>

        {/* Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl p-8 w-full max-w-2xl mx-4 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-foreground">
                  {editingItem ? 'Modifier un produit' : 'Ajouter un produit'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-foreground mb-2 block">
                    Nom du produit
                  </Label>
                  <Input
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    className="w-full bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <Label className="text-foreground mb-2 block">
                    Image
                  </Label>
                  
                  {/* Onglets pour choisir le mode d'entrée */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setImageInputMode('upload');
                        setImageUrl('');
                        setFormData({ ...formData, image: '' });
                      }}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        imageInputMode === 'upload'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageInputMode('url');
                        setFormData({ ...formData, image: '' });
                      }}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        imageInputMode === 'url'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4" />
                      Lien URL
                    </button>
                  </div>

                  {/* Zone d'upload */}
                  {imageInputMode === 'upload' ? (
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                        dragActive
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                      {formData.image && !formData.image.startsWith('http') ? (
                        <div className="space-y-2">
                          <img
                            src={formData.image}
                            alt="Aperçu"
                            className="w-20 h-20 object-cover rounded mx-auto"
                          />
                          <p className="text-sm text-muted-foreground">Cliquez ou glissez pour changer</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground">
                            Glissez une image ici ou cliquez pour sélectionner
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Zone de lien URL */
                    <div className="space-y-3">
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="url"
                          placeholder="https://exemple.com/image.jpg"
                          value={imageUrl}
                          onChange={(e) => {
                            setImageUrl(e.target.value);
                            setFormData({ ...formData, image: e.target.value });
                          }}
                          className="pl-10 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      {imageUrl && (
                        <div className="border-2 border-border rounded-lg p-4 bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-2">Aperçu :</p>
                          <img
                            src={imageUrl}
                            alt="Aperçu"
                            className="w-20 h-20 object-cover rounded mx-auto"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              toast.error('Impossible de charger l\'image depuis cette URL');
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-foreground mb-2 block">
                    Catégories <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
                  </Label>
                  
                  {/* Badges des catégories sélectionnées */}
                  {formData.type.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 p-3 bg-muted/30 rounded-lg border border-border">
                      {formData.type.map((selectedType, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                        >
                          {selectedType}
                          <button
                            type="button"
                            onClick={() => toggleCategory(selectedType)}
                            className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Menu déroulant stylisé */}
                  <div className="relative">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !formData.type.includes(e.target.value)) {
                          toggleCategory(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer hover:border-primary/50"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="">
                        {formData.type.length === 0 
                          ? ' Sélectionner des catégories...' 
                          : ' Ajouter une catégorie...'}
                      </option>
                      {categories
                        .filter(cat => !formData.type.includes(cat.name))
                        .map((category) => (
                          <option key={category._id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Message d'aide */}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
                    {formData.type.length === 0 
                      ? 'Aucune catégorie (item personnalisé)' 
                      : `${formData.type.length} catégorie(s) sélectionnée(s)`}
                  </p>
                </div>

                {/* Menu déroulant pour customCategory - affiché seulement si au moins une catégorie sélectionnée a customVehicleCategory */}
                {(() => {
                  const selectedCategories = categories.filter(cat => formData.type.includes(cat.name));
                  const hasCustomVehicleCategory = selectedCategories.some(cat => cat.customVehicleCategory);
                  const firstCategoryWithCustom = selectedCategories.find(cat => cat.customVehicleCategory);
                  
                  return hasCustomVehicleCategory ? (
                    <div>
                      <Label className="text-foreground mb-2 block">
                        Catégorie personnalisée ({firstCategoryWithCustom?.customVehicleCategory}) <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
                      </Label>
                      <select
                        value={formData.customCategory}
                        onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Aucune sous-catégorie</option>
                        <option value="cat1">Cat 1</option>
                        <option value="cat2">Cat 2</option>
                        <option value="cat3">Cat 3</option>
                        <option value="cat4">Cat 4</option>
                        <option value="cat5">Cat 5</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Laissez vide si vous ne voulez pas de sous-catégorie spécifique
                      </p>
                    </div>
                  ) : null;
                })()}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground mb-2 block">
                      Prix de vente ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.prixVente}
                      onChange={(e) => {
                        const newPrixVente = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, prixVente: newPrixVente });
                      }}
                      required
                      className="w-full bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label className="text-foreground mb-2 block">
                      Coût de revient ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.coutRevient}
                      onChange={(e) => {
                        const newCoutRevient = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, coutRevient: newCoutRevient });
                      }}
                      required
                      className="w-full bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>


                {/* Checkbox pour la gestion de stock */}
                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="gestionStock"
                    checked={formData.gestionStock}
                    onChange={(e) => setFormData({ ...formData, gestionStock: e.target.checked })}
                    className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-primary focus:ring-2"
                  />
                  <Label htmlFor="gestionStock" className="text-sm font-medium text-foreground">
                    Gérer le stock de cet article
                  </Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {editingItem ? 'Modifier' : 'Créer'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1 border-border text-foreground hover:bg-muted"
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal pour charger un pack d'items */}
        {showPacksModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl p-8 w-full max-w-2xl mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Charger un Pack d'Items</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sélectionnez un pack pour ajouter ses items à votre entreprise
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPacksModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {loadingPacks ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-lg text-muted-foreground">Chargement des packs...</div>
                </div>
              ) : availablePacks.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun pack disponible</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Les techniciens peuvent créer des packs depuis l'administration
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availablePacks.map((pack) => (
                    <div
                      key={pack._id}
                      className="bg-muted/30 border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{pack.nom}</h3>
                          {pack.description && (
                            <p className="text-sm text-muted-foreground mt-1">{pack.description}</p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleLoadPack(pack._id, pack.nom)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Charger
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                          {pack.items.length} item{pack.items.length > 1 ? 's' : ''}
                        </span>
                        {pack.creePar && (
                          <span className="text-xs text-muted-foreground">
                            par {pack.creePar.firstName || pack.creePar.username}
                          </span>
                        )}
                      </div>

                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Aperçu des items :</p>
                        <div className="flex flex-wrap gap-2">
                          {pack.items.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="flex items-center space-x-2 bg-background px-2 py-1 rounded text-sm">
                              {item.image ? (
                                <img src={item.image} alt={item.nom} className="w-6 h-6 rounded object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="text-foreground">{item.nom}</span>
                              <span className="text-green-500">${item.prixVente}</span>
                            </div>
                          ))}
                          {pack.items.length > 5 && (
                            <span className="text-xs text-muted-foreground self-center">
                              +{pack.items.length - 5} autres
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GestionItemsPage;