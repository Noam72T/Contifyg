import React, { useState, useEffect } from 'react';
import { Send, Plus, Trash2, Upload, Building2, Palette, Type, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
// import { Card } from '../components/ui/card'; // Non utilisé
// import { useAuth } from '../contexts/AuthContext'; // Non utilisé
import { useCompany } from '../contexts/CompanyContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Article {
  description: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
}

interface Facture {
  _id?: string;
  numero?: string;
  numeroFacture?: string;
  partenariat?: string;
  destinataire: {
    nom: string;
    entreprise: string;
  };
  payableA: string;
  numeroCompte: string;
  projet: string;
  dateEcheance: string;
  articles: Article[];
  sousTotal: number;
  tva: number;
  montantTotal: number;
  statut: string;
  notes?: string;
  configuration: {
    couleurPrimaire: string;
    couleurSecondaire: string;
    couleurAccent: string;
    couleurPrix: string;
    couleurTotal: string;
    couleurFondFacture: string;
    couleurFondLogo: string;
    couleurTitrePrincipal: string;
    couleurAdresseExpediteur: string;
    couleurAdresseDestinataire: string;
    couleurTexteInfos: string;
    couleurBordures: string;
    couleurBorduresTableau?: string;
    couleurFondEnTetes?: string;
    couleurTexteEnTetes?: string;
    styleHeader: 'gradient' | 'solid' | 'minimal';
    positionLogo: 'left' | 'right' | 'center';
    tailleHeader: 'small' | 'medium' | 'large';
    afficherAdresse: boolean;
    adressePersonnalisee?: string;
    titrePersonnalise?: string;
    adresseExpediteurPersonnalisee?: string;
    styleTableau: 'moderne' | 'classique' | 'minimal';
    borduresTableau: boolean;
    logo?: string;
    template?: string;
    footer: {
      afficher: boolean;
      texte: string;
      couleur: string;
      taille: 'small' | 'medium' | 'large';
    };
  };
}

const FacturesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { hasPermission, canViewCategory, canManageCategory } = useUserPermissions();
  const [loading, setLoading] = useState(false);

  // Vérifier les permissions
  const canViewFactures = canViewCategory('PAPERASSE') || hasPermission('VIEW_PAPERASSE_CATEGORY');
  const canManageFactures = hasPermission('MANAGE_FACTURES') || canManageCategory('PAPERASSE') || canViewCategory('PAPERASSE') || hasPermission('VIEW_PAPERASSE_CATEGORY');
  const [partenariats, setPartenariats] = useState<any[]>([]);
  const [selectedPartenariat, setSelectedPartenariat] = useState('');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [activeCustomSection, setActiveCustomSection] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // État de la facture
  // Fonction pour générer le numéro de facture automatique
  const generateInvoiceNumber = () => {
    const now = new Date();
    
    // Calcul du numéro de semaine ISO 8601 correct (même logique que les autres pages)
    const getWeekNumber = (date: Date) => {
      const year = date.getFullYear();
      
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
      const daysSinceFirstMonday = Math.floor((date.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000));
      
      // Calculer le numéro de semaine
      const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;
      
      console.log('🗓️ Génération numéro facture - Semaine:', {
        date: date.toLocaleDateString('fr-FR'),
        weekNumber,
        firstThursday: firstThursday.toLocaleDateString('fr-FR'),
        firstMonday: firstMonday.toLocaleDateString('fr-FR')
      });
      
      return Math.max(1, Math.min(53, weekNumber));
    };
    
    const weekNumber = getWeekNumber(now);
    return `S${weekNumber.toString().padStart(2, '0')}`;
  };

  const [facture, setFacture] = useState<Facture>({
    destinataire: { nom: '', entreprise: '' },
    payableA: '',
    numeroCompte: '',
    projet: 'Partenariat',
    dateEcheance: '',
    numeroFacture: generateInvoiceNumber(),
    articles: [{ description: '', quantite: 1, prixUnitaire: 0, prixTotal: 0 }],
    sousTotal: 0,
    tva: 0,
    montantTotal: 0,
    statut: 'brouillon',
    configuration: {
      couleurPrimaire: '#1e293b',
      couleurSecondaire: '#475569',
      couleurAccent: '#ef4444',
      couleurPrix: '#22c55e',
      couleurTotal: '#ef4444',
      couleurFondFacture: '#ffffff',
      couleurFondLogo: '#ffffff',
      couleurTitrePrincipal: '#ffffff',
      couleurAdresseExpediteur: '#ffffff',
      couleurAdresseDestinataire: '#374151',
      couleurTexteInfos: '#374151',
      couleurBordures: '#e5e7eb',
      styleHeader: 'gradient',
      positionLogo: 'right',
      tailleHeader: 'large',
      afficherAdresse: true,
      adressePersonnalisee: '',
      titrePersonnalise: '',
      adresseExpediteurPersonnalisee: '',
      styleTableau: 'moderne',
      borduresTableau: true,
      template: 'moderne',
      footer: {
        afficher: false,
        texte: 'Merci pour votre confiance',
        couleur: '#6b7280',
        taille: 'medium'
      },
      logo: ''
    }
  });

  useEffect(() => {
    if (selectedCompany) {
      // Réinitialiser la configuration à chaque changement d'entreprise
      setFacture(prev => ({
        ...prev,
        configuration: {
          couleurPrimaire: '#1e293b',
          couleurSecondaire: '#475569',
          couleurAccent: '#3b82f6',
          couleurPrix: '#22c55e',
          couleurTotal: '#ef4444',
          couleurFondFacture: '#ffffff',
          couleurFondLogo: '#ffffff',
          couleurTitrePrincipal: '#ffffff',
          couleurAdresseExpediteur: '#ef4444',
          couleurAdresseDestinataire: '#3b82f6',
          couleurTexteInfos: '#374151',
          couleurBordures: '#e5e7eb',
          styleHeader: 'gradient',
          positionLogo: 'right',
          tailleHeader: 'large',
          afficherAdresse: true,
          adressePersonnalisee: '',
          titrePersonnalise: '',
          adresseExpediteurPersonnalisee: '',
          styleTableau: 'moderne',
          borduresTableau: true,
          logo: '',
          template: 'moderne',
          footer: {
            afficher: true,
            texte: 'Merci pour votre confiance',
            couleur: '#6b7280',
            taille: 'medium'
          }
        }
      }));
      
      const initializeData = async () => {
        await fetchPartenariats();
        await fetchCompanyInfo();
        // Charger les paramètres globaux en dernier pour s'assurer qu'ils écrasent les valeurs par défaut
        await loadGlobalSettings();
      };
      
      initializeData();
    }
  }, [selectedCompany]);

  const loadGlobalSettings = async () => {
    try {
      // Charger directement depuis la base de données pour avoir les données les plus fraîches
      const response = await api.get(`/factures/global-settings/${selectedCompany?._id}`);
      if (response.data.success && response.data.configuration) {
        console.log('🔄 Chargement depuis BDD:', { hasLogo: !!response.data.configuration.logo, logoLength: response.data.configuration.logo?.length });
        setFacture(prev => ({
          ...prev,
          configuration: {
            ...prev.configuration,
            ...response.data.configuration
          }
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  };

  const fetchPartenariats = async () => {
    try {
      const response = await api.get(`/factures/partenariats/${selectedCompany?._id}`);
      if (response.data.success) {
        setPartenariats(response.data.partenariats);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des partenariats:', error);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const response = await api.get(`/factures/company-info/${selectedCompany?._id}`);
      if (response.data.success) {
        setCompanyInfo(response.data.company);
        // Auto-remplir les informations de l'entreprise
        setFacture(prev => ({
          ...prev,
          payableA: response.data.company.pdg || response.data.company.name,
          numeroCompte: response.data.company.compteBancaire || '',
          configuration: {
            ...prev.configuration,
            // Ne pas écraser le logo s'il existe déjà dans la configuration
            logo: prev.configuration.logo || response.data.company.logo || '',
            couleurPrix: prev.configuration.couleurPrix || '#22c55e',
            couleurTotal: prev.configuration.couleurTotal || '#ef4444',
            template: prev.configuration.template || 'moderne',
            footer: prev.configuration.footer || {
              afficher: true,
              texte: 'Merci pour votre confiance',
              couleur: '#6b7280',
              taille: 'medium'
            }
          }
        }));
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des informations d\'entreprise:', error);
    }
  };

  const handlePartenaritSelect = async (partenaritId: string) => {
    setSelectedPartenariat(partenaritId);
    const partenariat = partenariats.find(p => p._id === partenaritId);
    if (partenariat) {
      // Charger les données sauvegardées pour ce partenariat
      await loadPartenaritData(partenaritId);
      
      // Charger les ventes du partenariat pour auto-remplir le tableau
      await loadPartenaritVentes(partenariat.nom);
      
      setFacture(prev => ({
        ...prev,
        partenariat: partenaritId,
        destinataire: {
          nom: partenariat.nom,
          entreprise: partenariat.entreprisePartenaire
        }
      }));
      
      // Calculer la date d'échéance (5 jours après aujourd'hui)
      const dateEcheance = new Date();
      dateEcheance.setDate(dateEcheance.getDate() + 5);
      setFacture(prev => ({
        ...prev,
        dateEcheance: dateEcheance.toISOString().split('T')[0]
      }));
    }
  };

  const loadPartenaritData = async (partenaritId: string) => {
    try {
      const response = await api.get(`/factures/partenariat-data/${partenaritId}`);
      if (response.data.success && response.data.facture) {
        const savedData = response.data.facture;
        // Ne pas écraser la configuration globale, juste les données spécifiques
        setFacture(prev => ({
          ...prev,
          ...savedData,
          // Garder la configuration globale
          configuration: prev.configuration,
          notes: savedData.notes || prev.notes
        }));
      }
    } catch (error) {
      
    }
  };

  const loadPartenaritVentes = async (partenaireNom: string) => {
    try {
      
      
      const response = await api.get(`/ventes/by-partenariat/${encodeURIComponent(partenaireNom)}?companyId=${selectedCompany?._id}`);
      
      if (response.data.success && response.data.items && response.data.items.length > 0) {
        
        
        // Convertir les items en format Article pour la facture
        const articlesFromVentes: Article[] = response.data.items.map((item: any) => ({
          description: item.description,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
          prixTotal: item.total
        }));

        // Calculer les totaux
        const sousTotal = articlesFromVentes.reduce((sum, article) => sum + article.prixTotal, 0);
        const montantTotal = sousTotal + facture.tva;

        // Mettre à jour la facture avec les articles auto-remplis
        setFacture(prev => ({
          ...prev,
          articles: articlesFromVentes,
          sousTotal,
          montantTotal
        }));

        
      } else {
        
        // Garder un article vide par défaut si aucune vente
        setFacture(prev => ({
          ...prev,
          articles: [{ description: '', quantite: 1, prixUnitaire: 0, prixTotal: 0 }],
          sousTotal: 0,
          montantTotal: 0
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des ventes du partenariat:', error);
      // En cas d'erreur, garder un article vide
      setFacture(prev => ({
        ...prev,
        articles: [{ description: '', quantite: 1, prixUnitaire: 0, prixTotal: 0 }],
        sousTotal: 0,
        montantTotal: 0
      }));
    }
  };

  const updateArticle = (index: number, field: keyof Article, value: string | number) => {
    const newArticles = [...facture.articles];
    newArticles[index] = { ...newArticles[index], [field]: value };
    
    // Recalculer le prix total de l'article
    if (field === 'quantite' || field === 'prixUnitaire') {
      newArticles[index].prixTotal = newArticles[index].quantite * newArticles[index].prixUnitaire;
    }
    
    // Recalculer les totaux
    const sousTotal = newArticles.reduce((sum, article) => sum + article.prixTotal, 0);
    const montantTotal = sousTotal + facture.tva;
    
    setFacture(prev => ({
      ...prev,
      articles: newArticles,
      sousTotal,
      montantTotal
    }));
  };

  const addArticle = () => {
    setFacture(prev => ({
      ...prev,
      articles: [...prev.articles, { description: '', quantite: 1, prixUnitaire: 0, prixTotal: 0 }]
    }));
  };

  const removeArticle = (index: number) => {
    if (facture.articles.length > 1) {
      const newArticles = facture.articles.filter((_, i) => i !== index);
      const sousTotal = newArticles.reduce((sum, article) => sum + article.prixTotal, 0);
      const montantTotal = sousTotal + facture.tva;
      
      setFacture(prev => ({
        ...prev,
        articles: newArticles,
        sousTotal,
        montantTotal
      }));
    }
  };

  const sendInvoice = async () => {
    // Vérifier les permissions de gestion
    if (!canManageFactures) {
      toast.error('Vous n\'avez pas les permissions pour envoyer des factures');
      return;
    }
    
    try {
      setLoading(true);
      const factureData = {
        company: selectedCompany?._id,
        type: 'emission',
        client: {
          nom: facture.destinataire.nom || facture.destinataire.entreprise || 'Client',
          email: '',
          telephone: '',
          adresse: {
            rue: '',
            ville: '',
            codePostal: '',
            pays: ''
          }
        },
        articles: facture.articles.map(article => ({
          designation: article.description || 'Service',
          quantite: article.quantite || 1,
          prixUnitaire: article.prixUnitaire || 0,
          tva: 20,
          total: article.prixTotal || 0
        })),
        montantHT: facture.sousTotal || 0,
        montantTVA: facture.tva || 0,
        montantTTC: facture.montantTotal || 0,
        dateEmission: new Date(),
        dateEcheance: facture.dateEcheance ? new Date(facture.dateEcheance) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        statut: 'envoyee',
        modePaiement: 'virement',
        notes: facture.projet || '',
        payableA: facture.payableA || '',
        numeroCompte: facture.numeroCompte || '',
        partenariat: selectedPartenariat || null,
        configuration: facture.configuration
      };
      
      const response = await api.post('/factures', factureData);
      if (response.data.success) {
        toast.success('Facture envoyée et sauvegardée avec succès ! Vous pouvez la retrouver dans "Listes des factures".');
        // Réinitialiser le formulaire
        setFacture({
          destinataire: { nom: '', entreprise: '' },
          payableA: companyInfo?.pdg || companyInfo?.name || '',
          numeroCompte: companyInfo?.compteBancaire || '',
          projet: 'Partenariat',
          dateEcheance: '',
          numeroFacture: generateInvoiceNumber(),
          articles: [{ description: '', quantite: 1, prixUnitaire: 0, prixTotal: 0 }],
          sousTotal: 0,
          tva: 0,
          montantTotal: 0,
          statut: 'brouillon',
          configuration: facture.configuration // Garder la configuration personnalisée
        });
        setSelectedPartenariat('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      toast.error('Erreur lors de l\'envoi de la facture');
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
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour créer des factures.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Fonction de compression d'image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculer les nouvelles dimensions (max 800px de largeur)
        const maxWidth = 800;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Dessiner l'image redimensionnée
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convertir en base64 avec compression (qualité 0.8)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => {
        // En cas d'erreur, utiliser l'image originale
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérification basique du type de fichier
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image valide');
        return;
      }

      // Message informatif pour les gros fichiers
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.loading('Image volumineuse détectée, compression en cours...');
      }

      try {
        // Compresser l'image
        const compressedImage = await compressImage(file);
        
        setFacture(prev => ({
          ...prev,
          configuration: {
            ...prev.configuration,
            logo: compressedImage
          }
        }));
        
        toast.success('Logo uploadé et optimisé avec succès');
      } catch (error) {
        console.error('Erreur lors de la compression:', error);
        toast.error('Erreur lors du traitement de l\'image');
      }
    }
  };

  // Templates prédéfinis
  const applyTemplate = (templateName: 'moderne' | 'classique' | 'minimal' | 'corporate') => {
    const templates = {
      moderne: {
        couleurPrimaire: '#1e293b',
        couleurSecondaire: '#475569',
        couleurAccent: '#ef4444',
        couleurPrix: '#22c55e',
        couleurTotal: '#ef4444',
        couleurFondFacture: '#ffffff',
        couleurFondLogo: '#ffffff',
        couleurTitrePrincipal: '#ffffff',
        couleurAdresseExpediteur: '#ffffff',
        couleurAdresseDestinataire: '#374151',
        couleurTexteInfos: '#374151',
        couleurBordures: '#e5e7eb',
        styleHeader: 'gradient' as const,
        positionLogo: 'right' as const,
        tailleHeader: 'large' as const,
        styleTableau: 'moderne' as const,
        borduresTableau: true
      },
      classique: {
        couleurPrimaire: '#374151',
        couleurSecondaire: '#6b7280',
        couleurAccent: '#1f2937',
        couleurPrix: '#059669',
        couleurTotal: '#dc2626',
        couleurFondFacture: '#f9fafb',
        couleurFondLogo: '#ffffff',
        couleurTitrePrincipal: '#ffffff',
        couleurAdresseExpediteur: '#ffffff',
        couleurAdresseDestinataire: '#1f2937',
        couleurTexteInfos: '#1f2937',
        couleurBordures: '#d1d5db',
        styleHeader: 'solid' as const,
        positionLogo: 'left' as const,
        tailleHeader: 'medium' as const,
        styleTableau: 'classique' as const,
        borduresTableau: true
      },
      minimal: {
        couleurPrimaire: '#000000',
        couleurSecondaire: '#404040',
        couleurAccent: '#666666',
        couleurPrix: '#000000',
        couleurTotal: '#000000',
        couleurFondFacture: '#ffffff',
        couleurFondLogo: '#f3f4f6',
        couleurTitrePrincipal: '#000000',
        couleurAdresseExpediteur: '#000000',
        couleurAdresseDestinataire: '#000000',
        couleurTexteInfos: '#000000',
        couleurBordures: '#e5e7eb',
        styleHeader: 'minimal' as const,
        positionLogo: 'center' as const,
        tailleHeader: 'small' as const,
        styleTableau: 'minimal' as const,
        borduresTableau: false
      },
      corporate: {
        couleurPrimaire: '#1e40af',
        couleurSecondaire: '#3b82f6',
        couleurAccent: '#f59e0b',
        couleurPrix: '#10b981',
        couleurTotal: '#ef4444',
        couleurFondFacture: '#f8fafc',
        couleurFondLogo: '#ffffff',
        couleurTitrePrincipal: '#ffffff',
        couleurAdresseExpediteur: '#ffffff',
        couleurAdresseDestinataire: '#1e40af',
        couleurTexteInfos: '#1e40af',
        couleurBordures: '#cbd5e1',
        styleHeader: 'gradient' as const,
        positionLogo: 'right' as const,
        tailleHeader: 'large' as const,
        styleTableau: 'moderne' as const,
        borduresTableau: true
      }
    };
    
    setFacture(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        ...templates[templateName],
        template: templateName
      }
    }));
  };

  const toggleCustomSection = (section: string) => {
    setActiveCustomSection(activeCustomSection === section ? null : section);
  };

  const saveSettings = async () => {
    // Vérifier les permissions de gestion
    if (!canManageFactures) {
      toast.error('Vous n\'avez pas les permissions pour sauvegarder les paramètres');
      return;
    }
    
    try {
      setSavingSettings(true);
      console.log('💾 Sauvegarde des paramètres:', { hasLogo: !!facture.configuration.logo, logoLength: facture.configuration.logo?.length });
      const settingsData = {
        companyId: selectedCompany?._id,
        configuration: facture.configuration
      };
      
      // Sauvegarder dans la base de données
      const response = await api.post('/factures/save-global-settings', settingsData);
      if (response.data.success) {
        console.log('✅ Paramètres sauvegardés avec succès');
        toast.success('Paramètres sauvegardés avec succès ! Ils s\'appliqueront à toutes vos factures.');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSavingSettings(false);
    }
  };

  const saveAccountNumber = async (numeroCompte: string) => {
    // Vérifier les permissions de gestion
    if (!canManageFactures) {
      toast.error('Vous n\'avez pas les permissions pour modifier les informations de l\'entreprise');
      return;
    }
    
    try {
      // Sauvegarder le numéro de compte au niveau de l'entreprise
      const response = await api.put(`/companies/${selectedCompany?._id}`, {
        compteBancaire: numeroCompte
      });
      
      if (response.data.success) {
        toast.success('Numéro de compte sauvegardé pour l\'entreprise');
        // Mettre à jour les informations de l'entreprise localement
        setCompanyInfo((prev: any) => ({
          ...prev,
          compteBancaire: numeroCompte
        }));
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du numéro de compte:', error);
      toast.error('Erreur lors de la sauvegarde du numéro de compte');
    }
  };

  // Vérification des permissions d'accès
  if (!canViewFactures) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Accès Refusé</h1>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à la gestion des factures.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          {/* Panneau de gauche - Gestion de Factures */}
          <div className="w-80 bg-card border-r p-6 space-y-6 overflow-y-auto">
            <div className="text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Gestion de Factures</h2>
              <p className="text-muted-foreground text-sm">{selectedCompany.name}</p>
            </div>

            {/* Menu déroulant des partenariats */}
            <div className="space-y-4">
              <Label className="text-foreground font-medium">Sélectionner un partenariat :</Label>
              <select
                value={selectedPartenariat}
                onChange={(e) => handlePartenaritSelect(e.target.value)}
                className="w-full p-3 rounded-lg bg-input text-foreground border border-border focus:border-primary focus:outline-none"
              >
                <option value="">-- Choisir un partenariat --</option>
                {partenariats.map((partenariat) => (
                  <option key={partenariat._id} value={partenariat._id}>
                    {partenariat.nom} - {partenariat.entreprisePartenaire}
                  </option>
                ))}
              </select>
            </div>

            {/* Informations de facturation */}
            <div className="space-y-4">
              <div>
                <Label className="text-foreground text-sm">Numéro de la Facture :</Label>
                <Input
                  value={facture.numeroFacture || generateInvoiceNumber()}
                  readOnly
                  className="w-full mt-1 p-2 rounded bg-muted text-foreground border border-border cursor-not-allowed"
                />
              </div>

              <div>
                <Label className="text-foreground text-sm">Payable à :</Label>
                <Input
                  value={facture.payableA}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFacture(prev => ({ ...prev, payableA: e.target.value }))}
                  className="w-full mt-1 p-2 rounded bg-input text-foreground border border-border focus:border-primary"
                />
              </div>

              {/* Section Logo modifiable */}
              <div>
                <Label className="text-foreground text-sm">Logo de l'entreprise :</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded cursor-pointer hover:bg-primary/90"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Changer logo</span>
                  </label>
                  {facture.configuration.logo && (
                    <img
                      src={facture.configuration.logo}
                      alt="Logo"
                      className="h-8 w-8 object-contain rounded"
                    />
                  )}
                </div>
              </div>

              {/* Section Personnalisation */}

              <div>
                <Label className="text-foreground text-sm">N° de compte :</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={facture.numeroCompte}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFacture(prev => ({ ...prev, numeroCompte: e.target.value }))}
                    className="flex-1 p-2 rounded bg-input text-foreground border border-border focus:border-primary"
                  />
                  <Button
                    onClick={() => saveAccountNumber(facture.numeroCompte)}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    disabled={!facture.numeroCompte || !canManageFactures}
                  >
                    Sauvegarder
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-foreground text-sm">Date d'échéance :</Label>
                <Input
                  type="date"
                  value={facture.dateEcheance}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFacture(prev => ({ ...prev, dateEcheance: e.target.value }))}
                  className="w-full mt-1 p-2 rounded bg-input text-foreground border border-border focus:border-primary"
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="space-y-3">
              <Button 
                onClick={sendInvoice}
                disabled={!selectedPartenariat || loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Envoi...' : 'ENVOYER AU WEBHOOK'}
              </Button>
            </div>
          </div>

          {/* Panneau central - Aperçu de la facture */}
          <div className="flex-1 p-8 overflow-auto">
            <div className="max-w-4xl mx-auto shadow-2xl rounded-lg overflow-hidden" style={{ backgroundColor: facture.configuration.couleurFondFacture, borderColor: facture.configuration.couleurBordures, borderWidth: '1px', borderStyle: 'solid' }}>
              {/* En-tête de la facture */}
              <div 
                className={`text-white p-8 ${
                  facture.configuration.tailleHeader === 'small' ? 'p-4' :
                  facture.configuration.tailleHeader === 'medium' ? 'p-6' : 'p-8'
                } ${
                  facture.configuration.styleHeader === 'gradient' ? 'bg-gradient-to-r' :
                  facture.configuration.styleHeader === 'solid' ? '' : 'bg-transparent border-b-2'
                }`}
                style={{
                  background: facture.configuration.styleHeader === 'gradient' 
                    ? `linear-gradient(to right, ${facture.configuration.couleurPrimaire}, ${facture.configuration.couleurSecondaire})`
                    : facture.configuration.styleHeader === 'solid'
                    ? facture.configuration.couleurPrimaire
                    : 'transparent',
                  borderColor: facture.configuration.styleHeader === 'minimal' ? facture.configuration.couleurPrimaire : 'transparent',
                  color: facture.configuration.styleHeader === 'minimal' ? facture.configuration.couleurPrimaire : 'white'
                }}
              >
                <div className={`flex items-start ${
                  facture.configuration.positionLogo === 'center' ? 'flex-col items-center text-center' :
                  facture.configuration.positionLogo === 'left' ? 'flex-row' : 'justify-between'
                }`}>
                  {/* Logo à gauche */}
                  {facture.configuration.positionLogo === 'left' && (facture.configuration.logo || companyInfo?.logo) && (
                    <div className={`rounded-lg p-2 mr-6 ${
                      facture.configuration.tailleHeader === 'small' ? 'w-16 h-16' :
                      facture.configuration.tailleHeader === 'medium' ? 'w-20 h-20' : 'w-24 h-24'
                    }`} style={{ backgroundColor: facture.configuration.couleurFondLogo }}>
                      <img 
                        src={facture.configuration.logo || companyInfo?.logo} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  
                  {/* Logo centré */}
                  {facture.configuration.positionLogo === 'center' && (facture.configuration.logo || companyInfo?.logo) && (
                    <div className={`rounded-lg p-2 mb-4 ${
                      facture.configuration.tailleHeader === 'small' ? 'w-16 h-16' :
                      facture.configuration.tailleHeader === 'medium' ? 'w-20 h-20' : 'w-24 h-24'
                    }`} style={{ backgroundColor: facture.configuration.couleurFondLogo }}>
                      <img 
                        src={facture.configuration.logo || companyInfo?.logo} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  
                  <div className={facture.configuration.positionLogo === 'center' ? '' : 'flex-1'}>
                    <h1 className={`font-bold tracking-wide ${
                      facture.configuration.tailleHeader === 'small' ? 'text-2xl' :
                      facture.configuration.tailleHeader === 'medium' ? 'text-3xl' : 'text-4xl'
                    }`} style={{ color: facture.configuration.couleurTitrePrincipal }}>
                      {facture.configuration.titrePersonnalise || selectedCompany.name}
                      <span className={facture.configuration.tailleHeader === 'small' ? 'text-lg' : 'text-2xl'}>™</span>
                    </h1>
                    {facture.configuration.afficherAdresse && (
                      <div className={`mt-2 opacity-80 ${
                        facture.configuration.styleHeader === 'minimal' ? 'opacity-60' : ''
                      }`} style={{ color: facture.configuration.couleurAdresseExpediteur }}>
                        {facture.configuration.adresseExpediteurPersonnalisee ? (
                          <div dangerouslySetInnerHTML={{ __html: facture.configuration.adresseExpediteurPersonnalisee.replace(/\n/g, '<br>') }} />
                        ) : facture.configuration.adressePersonnalisee ? (
                          <div dangerouslySetInnerHTML={{ __html: facture.configuration.adressePersonnalisee.replace(/\n/g, '<br>') }} />
                        ) : (
                          <>
                            <p>Mirror Park</p>
                            <p>Los Santos</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Logo à droite */}
                  {facture.configuration.positionLogo === 'right' && (facture.configuration.logo || companyInfo?.logo) && (
                    <div className={`rounded-lg p-2 ${
                      facture.configuration.tailleHeader === 'small' ? 'w-16 h-16' :
                      facture.configuration.tailleHeader === 'medium' ? 'w-20 h-20' : 'w-24 h-24'
                    }`} style={{ backgroundColor: facture.configuration.couleurFondLogo }}>
                      <img 
                        src={facture.configuration.logo || companyInfo?.logo} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bande de prix */}
              <div 
                className="text-white text-center py-4"
                style={{ backgroundColor: facture.configuration.couleurPrimaire }}
              >
                <h2 className="text-3xl font-bold">
                  <span style={{ color: facture.configuration.couleurTotal }}>{formatCurrency(facture.montantTotal)}</span>
                </h2>
                <p className="text-lg mt-2 opacity-90">
                  {facture.numeroFacture || generateInvoiceNumber()}
                </p>
              </div>

              {/* Informations de la facture */}
              <div className="p-8" style={{ backgroundColor: `${facture.configuration.couleurFondFacture}dd` }}>
                <div className="grid grid-cols-2 gap-8">
                  <div style={{ color: facture.configuration.couleurAdresseDestinataire }}>
                    <p><span className="font-semibold">Destinataire:</span> {facture.destinataire.entreprise || 'Sélectionnez un partenariat'}</p>
                    <p><span className="font-semibold">Payable à:</span> {facture.payableA}</p>
                  </div>
                  <div style={{ color: facture.configuration.couleurTexteInfos }}>
                    <p><span className="font-semibold">N° de compte:</span> {facture.numeroCompte}</p>
                    <p><span className="font-semibold">Projet:</span> {facture.projet}</p>
                    <p><span className="font-semibold">Date d'échéance:</span> {facture.dateEcheance ? new Date(facture.dateEcheance).toLocaleDateString('fr-FR') : '5 jours après envoi de la facture'}</p>
                  </div>
                </div>
              </div>

              {/* Tableau des articles */}
              <div className="p-8">
                <table className={`w-full ${
                  facture.configuration.styleTableau === 'minimal' ? '' : 'border-collapse'
                }`}>
                  <thead>
                    <tr 
                      className="text-white"
                      style={{ backgroundColor: facture.configuration.couleurPrimaire }}
                    >
                      <th className={`p-3 text-left ${
                        facture.configuration.borduresTableau ? 'border' : ''
                      } ${
                        facture.configuration.styleTableau === 'minimal' ? 'border-b-2 bg-transparent' : ''
                      }`} 
                      style={facture.configuration.styleTableau === 'minimal' ? 
                        { borderColor: facture.configuration.couleurBordures, color: facture.configuration.couleurPrimaire } : 
                        { borderColor: facture.configuration.couleurBordures }
                      }>
                        Description
                      </th>
                      <th className={`p-3 text-center ${
                        facture.configuration.borduresTableau ? 'border' : ''
                      } ${
                        facture.configuration.styleTableau === 'minimal' ? 'border-b-2 bg-transparent' : ''
                      }`}
                      style={facture.configuration.styleTableau === 'minimal' ? 
                        { borderColor: facture.configuration.couleurBordures, color: facture.configuration.couleurPrimaire } : 
                        { borderColor: facture.configuration.couleurBordures }
                      }>
                        Quantité
                      </th>
                      <th className={`p-3 text-center ${
                        facture.configuration.borduresTableau ? 'border' : ''
                      } ${
                        facture.configuration.styleTableau === 'minimal' ? 'border-b-2 bg-transparent' : ''
                      }`}
                      style={facture.configuration.styleTableau === 'minimal' ? 
                        { borderColor: facture.configuration.couleurBordures, color: facture.configuration.couleurPrimaire } : 
                        { borderColor: facture.configuration.couleurBordures }
                      }>
                        Prix unitaire
                      </th>
                      <th className={`p-3 text-center font-semibold ${
                        facture.configuration.borduresTableau ? 'border' : ''
                      } ${
                        facture.configuration.styleTableau === 'minimal' ? 'border-b-2 bg-transparent' : ''
                      }`} style={{ 
                        color: facture.configuration.couleurPrix,
                        borderColor: facture.configuration.couleurBordures
                      }}>
                        Prix total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {facture.articles.map((article, index) => (
                      <tr key={index} className={`hover:bg-gray-50 ${
                        facture.configuration.styleTableau === 'classique' ? 'even:bg-gray-50' : ''
                      }`}>
                        <td className={`p-3 text-center ${
                          facture.configuration.borduresTableau ? 'border' : ''
                        } ${
                          facture.configuration.styleTableau === 'minimal' ? 'border-b' : ''
                        }`} style={{ borderColor: facture.configuration.couleurBordures }}>
                          <Input
                            value={article.description}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateArticle(index, 'description', e.target.value)}
                            placeholder="Description du service/produit"
                            className="border-0 bg-transparent w-full text-black"
                            style={{ color: '#000000' }}
                          />
                        </td>
                        <td className={`p-3 text-center ${
                          facture.configuration.borduresTableau ? 'border border-gray-300' : ''
                        } ${
                          facture.configuration.styleTableau === 'minimal' ? 'border-b border-gray-200' : ''
                        }`}>
                          <Input
                            type="number"
                            value={article.quantite}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateArticle(index, 'quantite', parseInt(e.target.value) || 0)}
                            className="border-0 bg-transparent w-20 mx-auto text-center text-black"
                            style={{ color: '#000000' }}
                          />
                        </td>
                        <td className={`p-3 text-center ${
                          facture.configuration.borduresTableau ? 'border border-gray-300' : ''
                        } ${
                          facture.configuration.styleTableau === 'minimal' ? 'border-b border-gray-200' : ''
                        }`}>
                          <Input
                            type="number"
                            step="0.01"
                            value={article.prixUnitaire}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateArticle(index, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                            className="border-0 bg-transparent w-24 mx-auto text-center text-black"
                            style={{ color: '#000000' }}
                          />
                        </td>
                        <td className={`p-3 text-center font-semibold ${
                          facture.configuration.borduresTableau ? 'border' : ''
                        } ${
                          facture.configuration.styleTableau === 'minimal' ? 'border-b' : ''
                        }`} style={{ color: facture.configuration.couleurPrix, borderColor: facture.configuration.couleurBordures }}>
                          {formatCurrency(article.prixTotal)}
                        </td>
                        {facture.articles.length > 1 && (
                          <td className="p-2">
                            <Button
                              onClick={() => removeArticle(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 flex justify-between items-center">
                  <Button
                    onClick={addArticle}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une ligne
                  </Button>
                </div>

                <div className="mt-8 text-right">
                  <p className="text-2xl font-bold" style={{ color: facture.configuration.couleurTotal }}>
                    Total: {formatCurrency(facture.montantTotal)}
                  </p>
                </div>
                
                {/* Footer personnalisable */}
                {facture.configuration.footer.afficher && (
                  <div 
                    className={`mt-8 text-center border-t pt-4 ${
                      facture.configuration.footer.taille === 'small' ? 'text-sm' :
                      facture.configuration.footer.taille === 'large' ? 'text-lg' : 'text-base'
                    }`}
                    style={{ color: facture.configuration.footer.couleur }}
                  >
                    {facture.configuration.footer.texte}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Panneau de droite - Personnalisation */}
          <div className="w-80 bg-card border-l p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Personnalisation
                </h3>
                <Button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {savingSettings ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
              
              {/* Textes personnalisables */}
              <div>
                <Button
                  type="button"
                  onClick={() => toggleCustomSection('textes')}
                  variant="ghost"
                  className="w-full justify-between p-2"
                >
                  <span className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Textes du Header
                  </span>
                  {activeCustomSection === 'textes' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                
                {activeCustomSection === 'textes' && (
                  <div className="mt-2 space-y-3 pl-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Titre personnalisé</Label>
                      <Input
                        value={facture.configuration.titrePersonnalise || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFacture(prev => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            titrePersonnalise: e.target.value
                          }
                        }))}
                        placeholder={selectedCompany.name}
                        className="text-xs h-6"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Adresse expéditeur personnalisée</Label>
                      <textarea
                        value={facture.configuration.adresseExpediteurPersonnalisee || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFacture(prev => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            adresseExpediteurPersonnalisee: e.target.value
                          }
                        }))}
                        placeholder="Mirror Park\nLos Santos"
                        className="w-full mt-1 p-1 rounded bg-input text-foreground border border-border text-xs"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Templates */}
              <div>
                <Button
                  type="button"
                  onClick={() => toggleCustomSection('templates')}
                  variant="ghost"
                  className="w-full justify-between p-2"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Templates
                  </span>
                  {activeCustomSection === 'templates' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                
                {activeCustomSection === 'templates' && (
                  <div className="mt-2 space-y-2 pl-4">
                    <Button onClick={() => applyTemplate('moderne')} variant="outline" size="sm" className="w-full justify-start">
                      Moderne
                    </Button>
                    <Button onClick={() => applyTemplate('classique')} variant="outline" size="sm" className="w-full justify-start">
                      Classique
                    </Button>
                    <Button onClick={() => applyTemplate('minimal')} variant="outline" size="sm" className="w-full justify-start">
                      Minimal
                    </Button>
                    <Button onClick={() => applyTemplate('corporate')} variant="outline" size="sm" className="w-full justify-start">
                      Corporate
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Couleurs */}
              <div>
                <Button
                  type="button"
                  onClick={() => toggleCustomSection('colors')}
                  variant="ghost"
                  className="w-full justify-between p-2"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Couleurs
                  </span>
                  {activeCustomSection === 'colors' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                
                {activeCustomSection === 'colors' && (
                  <div className="mt-2 space-y-3 pl-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Header</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurPrimaire}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurPrimaire: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurPrimaire}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurPrimaire: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Prix articles</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurPrix}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurPrix: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurPrix}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurPrix: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Total</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurTotal}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurTotal: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurTotal}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurTotal: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Fond de facture</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurFondFacture}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurFondFacture: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurFondFacture}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurFondFacture: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Fond du logo</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurFondLogo}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurFondLogo: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurFondLogo}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurFondLogo: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Titre principal</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurTitrePrincipal}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurTitrePrincipal: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurTitrePrincipal}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurTitrePrincipal: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Adresse expéditeur</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurAdresseExpediteur}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurAdresseExpediteur: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurAdresseExpediteur}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurAdresseExpediteur: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Adresse destinataire</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurAdresseDestinataire}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurAdresseDestinataire: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurAdresseDestinataire}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurAdresseDestinataire: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Texte informations</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurTexteInfos}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurTexteInfos: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurTexteInfos}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurTexteInfos: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Bordures générales</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurBordures}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurBordures: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurBordures}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurBordures: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Bordures du tableau</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurBorduresTableau || facture.configuration.couleurBordures}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurBorduresTableau: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurBorduresTableau || facture.configuration.couleurBordures}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurBorduresTableau: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Fond des en-têtes</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurFondEnTetes || facture.configuration.couleurPrimaire}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurFondEnTetes: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurFondEnTetes || facture.configuration.couleurPrimaire}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurFondEnTetes: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Texte des en-têtes</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={facture.configuration.couleurTexteEnTetes || '#ffffff'}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurTexteEnTetes: e.target.value }
                          }))}
                          className="w-6 h-6 rounded border cursor-pointer"
                        />
                        <Input
                          value={facture.configuration.couleurTexteEnTetes || '#ffffff'}
                          onChange={(e) => setFacture(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, couleurTexteEnTetes: e.target.value }
                          }))}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Header */}
              <div>
                <Button
                  type="button"
                  onClick={() => toggleCustomSection('header')}
                  variant="ghost"
                  className="w-full justify-between p-2"
                >
                  <span className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Header
                  </span>
                  {activeCustomSection === 'header' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                
                {activeCustomSection === 'header' && (
                  <div className="mt-2 space-y-3 pl-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Style</Label>
                      <select
                        value={facture.configuration.styleHeader}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFacture(prev => ({
                          ...prev,
                          configuration: { ...prev.configuration, styleHeader: e.target.value as 'gradient' | 'solid' | 'minimal' }
                        }))}
                        className="w-full mt-1 p-1 rounded bg-input text-foreground border border-border text-xs"
                      >
                        <option value="gradient">Dégradé</option>
                        <option value="solid">Couleur unie</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Position logo</Label>
                      <select
                        value={facture.configuration.positionLogo}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFacture(prev => ({
                          ...prev,
                          configuration: { ...prev.configuration, positionLogo: e.target.value as 'left' | 'right' | 'center' }
                        }))}
                        className="w-full mt-1 p-1 rounded bg-input text-foreground border border-border text-xs"
                      >
                        <option value="left">Gauche</option>
                        <option value="right">Droite</option>
                        <option value="center">Centre</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Taille</Label>
                      <select
                        value={facture.configuration.tailleHeader}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFacture(prev => ({
                          ...prev,
                          configuration: { ...prev.configuration, tailleHeader: e.target.value as 'small' | 'medium' | 'large' }
                        }))}
                        className="w-full mt-1 p-1 rounded bg-input text-foreground border border-border text-xs"
                      >
                        <option value="small">Petit</option>
                        <option value="medium">Moyen</option>
                        <option value="large">Grand</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div>
                <Button
                  type="button"
                  onClick={() => toggleCustomSection('footer')}
                  variant="ghost"
                  className="w-full justify-between p-2"
                >
                  <span className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Footer
                  </span>
                  {activeCustomSection === 'footer' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                
                {activeCustomSection === 'footer' && (
                  <div className="mt-2 space-y-3 pl-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="afficherFooter"
                        checked={facture.configuration.footer.afficher}
                        onChange={(e) => setFacture(prev => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            footer: { ...prev.configuration.footer, afficher: e.target.checked }
                          }
                        }))}
                      />
                      <Label htmlFor="afficherFooter" className="text-xs">Afficher le footer</Label>
                    </div>
                    
                    {facture.configuration.footer.afficher && (
                      <>
                        <div>
                          <Label className="text-xs text-muted-foreground">Texte</Label>
                          <Input
                            value={facture.configuration.footer.texte}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFacture(prev => ({
                              ...prev,
                              configuration: {
                                ...prev.configuration,
                                footer: { ...prev.configuration.footer, texte: e.target.value }
                              }
                            }))}
                            className="text-xs h-6"
                            placeholder="Texte du footer"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground">Couleur</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={facture.configuration.footer.couleur}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFacture(prev => ({
                                ...prev,
                                configuration: {
                                  ...prev.configuration,
                                  footer: { ...prev.configuration.footer, couleur: e.target.value }
                                }
                              }))}
                              className="w-6 h-6 rounded border cursor-pointer"
                            />
                            <Input
                              value={facture.configuration.footer.couleur}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFacture(prev => ({
                                ...prev,
                                configuration: {
                                  ...prev.configuration,
                                  footer: { ...prev.configuration.footer, couleur: e.target.value }
                                }
                              }))}
                              className="flex-1 text-xs h-6"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground">Taille</Label>
                          <select
                            value={facture.configuration.footer.taille}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFacture(prev => ({
                              ...prev,
                              configuration: {
                                ...prev.configuration,
                                footer: { ...prev.configuration.footer, taille: e.target.value as 'small' | 'medium' | 'large' }
                              }
                            }))}
                            className="w-full mt-1 p-1 rounded bg-input text-foreground border border-border text-xs"
                          >
                            <option value="small">Petit</option>
                            <option value="medium">Moyen</option>
                            <option value="large">Grand</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FacturesPage;
