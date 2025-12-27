import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, Building2, Trash2, Edit2, UserX, Key, RefreshCw, BarChart3, CheckCircle, Package, Plus, X, Upload, Link as LinkIcon, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';

interface User {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  systemRole: string;
  isActive: boolean;
  isCompanyValidated: boolean;
  company?: { _id: string; name: string };
  role?: { _id: string; nom: string };
}

interface Company {
  _id: string;
  name: string;
  code: string;
  members: Array<{ _id: string; username: string; firstName?: string; lastName?: string; email?: string }>;
  tauxImpot?: number;
  invitationCode?: string;
}

interface Stats {
  totalUsers: number;
  totalCompanies: number;
  activeUsers: number;
  validatedUsers: number;
  technicians: number;
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
  dateCreation: string;
}

const TechnicianAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'stats' | 'packs'>('stats');
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Pagination
  const [currentPageUsers, setCurrentPageUsers] = useState(1);
  const [currentPageCompanies, setCurrentPageCompanies] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // États pour les packs d'items
  const [itemPacks, setItemPacks] = useState<ItemPack[]>([]);
  const [showPackForm, setShowPackForm] = useState(false);
  const [editingPack, setEditingPack] = useState<ItemPack | null>(null);
  const [packFormData, setPackFormData] = useState({
    nom: '',
    description: '',
    items: [] as PackItem[]
  });
  const [currentPackItem, setCurrentPackItem] = useState<PackItem>({
    nom: '',
    image: '',
    prixVente: 0,
    coutRevient: 0,
    gestionStock: false,
    customCategory: ''
  });
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [importingPdf, setImportingPdf] = useState(false);

  useEffect(() => {
    loadStats();
    
    // Ajuster itemsPerPage selon la taille d'écran
    const updateItemsPerPage = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(5); // Mobile
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(8); // Tablet
      } else {
        setItemsPerPage(10); // Desktop
      }
    };
    
    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
      setCurrentPageUsers(1);
    } else if (activeTab === 'companies') {
      loadCompanies();
      setCurrentPageCompanies(1);
    } else if (activeTab === 'packs') {
      loadItemPacks();
    }
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const response = await api.get('/technician-admin/stats');
      setStats(response.data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des statistiques');
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/technician-admin/users');
      setUsers(response.data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/technician-admin/companies');
      console.log('📦 Données entreprises reçues:', response.data);
      
      // Charger les codes d'invitation pour chaque entreprise
      const companiesWithCodes = await Promise.all(
        response.data.map(async (company: Company) => {
          try {
            const codeResponse = await api.get(`/technician-admin/companies/${company._id}/invitation-code`);
            return { ...company, invitationCode: codeResponse.data.code };
          } catch (error) {
            return { ...company, invitationCode: null };
          }
        })
      );
      
      setCompanies(companiesWithCodes);
    } catch (error: any) {
      console.error('Erreur chargement entreprises:', error);
      toast.error('Erreur lors du chargement des entreprises');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Générer un nouveau code d'invitation pour ${companyName} ?`)) return;
    
    try {
      const response = await api.post(`/technician-admin/companies/${companyId}/generate-code`, {
        maxUses: null, // Illimité
        expiresAt: null // N'expire jamais
      });
      
      toast.success(`Nouveau code généré: ${response.data.code}`);
      
      // Mettre à jour le code dans la liste
      setCompanies(companies.map(c => 
        c._id === companyId ? { ...c, invitationCode: response.data.code } : c
      ));
    } catch (error: any) {
      console.error('Erreur génération code:', error);
      toast.error('Erreur lors de la génération du code');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Supprimer ${username} ?`)) return;
    try {
      await api.delete(`/technician-admin/users/${userId}`);
      toast.success(`${username} supprimé`);
      loadUsers();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Supprimer ${companyName} ?`)) return;
    try {
      await api.delete(`/technician-admin/companies/${companyId}`);
      toast.success(`${companyName} supprimée`);
      loadCompanies();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      await api.put(`/technician-admin/users/${editingUser._id}`, editingUser);
      toast.success('Utilisateur modifié');
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany) return;
    try {
      await api.put(`/technician-admin/companies/${editingCompany._id}`, editingCompany);
      toast.success('Entreprise modifiée');
      setEditingCompany(null);
      loadCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword || newPassword.length < 6) {
      toast.error('Mot de passe invalide (min 6 caractères)');
      return;
    }
    try {
      await api.post(`/technician-admin/users/${resetPasswordUser._id}/reset-password`, { newPassword });
      toast.success(`Mot de passe réinitialisé pour ${resetPasswordUser.username}`);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleRemoveMember = async (companyId: string, userId: string, username: string, companyName: string) => {
    if (!window.confirm(`Retirer ${username} de ${companyName} ?`)) return;
    try {
      await api.post(`/technician-admin/companies/${companyId}/remove-member/${userId}`);
      toast.success(`${username} retiré`);
      loadCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  // Fonctions pour les packs d'items
  const loadItemPacks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/item-packs');
      setItemPacks(response.data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des packs');
    } finally {
      setLoading(false);
    }
  };

  const resetPackForm = () => {
    setPackFormData({ nom: '', description: '', items: [] });
    setCurrentPackItem({
      nom: '',
      image: '',
      prixVente: 0,
      coutRevient: 0,
      gestionStock: false,
      customCategory: ''
    });
    setImageUrl('');
    setImageInputMode('upload');
    setEditingPack(null);
    setShowPackForm(false);
  };

  const handleAddItemToPack = () => {
    if (!currentPackItem.nom) {
      toast.error('Le nom de l\'item est requis');
      return;
    }
    
    const newItem = {
      ...currentPackItem,
      margeBrute: currentPackItem.coutRevient === 0 
        ? currentPackItem.prixVente 
        : currentPackItem.prixVente - currentPackItem.coutRevient
    };
    
    setPackFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    // Reset l'item courant
    setCurrentPackItem({
      nom: '',
      image: '',
      prixVente: 0,
      coutRevient: 0,
      gestionStock: false,
      customCategory: ''
    });
    setImageUrl('');
    setImageInputMode('upload');
  };

  const handleRemoveItemFromPack = (index: number) => {
    setPackFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSavePack = async () => {
    if (!packFormData.nom) {
      toast.error('Le nom du pack est requis');
      return;
    }
    if (packFormData.items.length === 0) {
      toast.error('Le pack doit contenir au moins un item');
      return;
    }

    try {
      if (editingPack) {
        await api.put(`/item-packs/${editingPack._id}`, packFormData);
        toast.success('Pack modifié avec succès');
      } else {
        await api.post('/item-packs', packFormData);
        toast.success('Pack créé avec succès');
      }
      resetPackForm();
      loadItemPacks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEditPack = (pack: ItemPack) => {
    setEditingPack(pack);
    setPackFormData({
      nom: pack.nom,
      description: pack.description,
      items: pack.items
    });
    setShowPackForm(true);
  };

  const handleDeletePack = async (packId: string, packName: string) => {
    if (!window.confirm(`Supprimer le pack "${packName}" ?`)) return;
    try {
      await api.delete(`/item-packs/${packId}`);
      toast.success('Pack supprimé');
      loadItemPacks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  // Gestion de l'image
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
        setCurrentPackItem(prev => ({ ...prev, image: result }));
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

  // Fonction pour envoyer un PDF en chunks (morceaux)
  const uploadPdfInChunks = async (base64Data: string, filename: string, fileSize: number) => {
    const chunkSize = 5 * 1024 * 1024; // 5MB par chunk (après config nginx)
    const totalChunks = Math.ceil(base64Data.length / chunkSize);
    const uploadId = Date.now().toString(); // ID unique pour cet upload
    
    console.log(`📦 Upload en ${totalChunks} chunks de ${chunkSize} caractères`);
    
    // Envoyer chaque chunk
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, base64Data.length);
      const chunk = base64Data.slice(start, end);
      
      const chunkData = {
        uploadId,
        chunkIndex: i,
        totalChunks,
        chunk,
        filename,
        fileSize,
        isLastChunk: i === totalChunks - 1
      };
      
      console.log(`📤 Envoi chunk ${i + 1}/${totalChunks}`);
      
      const response = await api.post('/item-packs/upload-chunk', chunkData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (!response.data.success) {
        throw new Error(`Erreur chunk ${i + 1}: ${response.data.message}`);
      }
      
      // Petit délai entre les chunks pour éviter de surcharger le serveur
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms de pause
      }
    }
    
    // Une fois tous les chunks envoyés, demander le parsing
    console.log('✅ Tous les chunks envoyés, demande de parsing...');
    const parseResponse = await api.post('/item-packs/parse-chunks', {
      uploadId,
      filename,
      fileSize
    }, {
      timeout: 60000
    });
    
    return parseResponse;
  };

  // Import PDF avec fallback compression
  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner un fichier PDF');
      return;
    }

    setImportingPdf(true);

    try {
      let response;
      
      // Si le fichier fait plus de 10MB, utiliser le chunking
      if (file.size > 10 * 1024 * 1024) {
        console.log('📄 Fichier volumineux détecté (>10MB), utilisation du chunking');
        toast('Fichier volumineux détecté, découpage en cours...', { icon: '📦' });
        
        const base64Data = await compressFileToBase64(file);
        response = await uploadPdfInChunks(base64Data, file.name, file.size);
      } else {
        // Pour les petits fichiers, essayer l'upload normal d'abord
        try {
          const formData = new FormData();
          formData.append('pdf', file);

          response = await api.post('/item-packs/parse-pdf', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 30000 // 30 secondes
          });
        } catch (uploadError: any) {
          // Fallback vers base64 même pour les petits fichiers
          console.log('🔄 Erreur upload normal, basculement vers base64:', uploadError);
          toast('Problème d\'upload, utilisation de la compression...', { icon: 'ℹ️' });
          
          const base64Data = await compressFileToBase64(file);
          
          response = await api.post('/item-packs/parse-pdf-base64', {
            pdfData: base64Data,
            filename: file.name,
            size: file.size
          }, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 60000
          });
        }
      }

      if (response.data.success) {
        toast.success(`${response.data.items.length} items importés du PDF!`);
        
        // Ajouter les items au pack en cours
        setPackFormData(prev => ({
          ...prev,
          items: [...prev.items, ...response.data.items]
        }));
      } else {
        toast.error(response.data.message || 'Erreur lors de l\'import');
        console.log('Debug PDF:', response.data.debug);
      }
    } catch (error: any) {
      console.error('Erreur import PDF:', error);
      if (error.response?.data?.debug) {
        console.log('Debug PDF:', error.response.data.debug);
      }
      
      if (error.response?.status === 413) {
        toast.error('Fichier trop volumineux pour le serveur. Essayez de compresser le PDF ou contactez l\'administrateur.');
      } else if (error.response?.status === 500) {
        toast.error('Erreur serveur lors du traitement du PDF. Vérifiez les logs serveur pour plus de détails.');
        console.error('Erreur 500 détails:', error.response?.data);
      } else if (error.message?.includes('Erreur chunk')) {
        toast.error('Erreur lors de l\'envoi des données. Réessayez.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'import du PDF');
      }
    } finally {
      setImportingPdf(false);
      // Reset l'input file
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination pour utilisateurs
  const indexOfLastUser = currentPageUsers * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPagesUsers = Math.ceil(filteredUsers.length / itemsPerPage);

  // Pagination pour entreprises
  const indexOfLastCompany = currentPageCompanies * itemsPerPage;
  const indexOfFirstCompany = indexOfLastCompany - itemsPerPage;
  const currentCompanies = filteredCompanies.slice(indexOfFirstCompany, indexOfLastCompany);
  const totalPagesCompanies = Math.ceil(filteredCompanies.length / itemsPerPage);

  const PaginationControls = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center space-x-2 mt-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Précédent
        </button>
        <div className="flex space-x-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded-lg transition-colors ${
                currentPage === page
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Suivant
        </button>
      </div>
    );
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <Shield className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Administration Technicien</h1>
                <p className="text-sm text-muted-foreground">Gestion complète des utilisateurs et entreprises</p>
              </div>
            </div>
            <button
              onClick={() => {
                loadStats();
                if (activeTab === 'users') loadUsers();
                if (activeTab === 'companies') loadCompanies();
                if (activeTab === 'packs') loadItemPacks();
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualiser</span>
            </button>
          </div>
        </motion.div>

      <div className="flex space-x-2 border-b border-border">
        {[
          { key: 'stats', icon: BarChart3, label: 'Statistiques' },
          { key: 'users', icon: Users, label: 'Utilisateurs' },
          { key: 'companies', icon: Building2, label: 'Entreprises' },
          { key: 'packs', icon: Package, label: 'Packs d\'Items' }
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </div>
          </button>
        ))}
      </div>

      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Utilisateurs', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
            { label: 'Total Entreprises', value: stats.totalCompanies, icon: Building2, color: 'text-green-500' },
            { label: 'Utilisateurs Actifs', value: stats.activeUsers, icon: CheckCircle, color: 'text-green-500' },
            { label: 'Techniciens', value: stats.technicians, icon: Shield, color: 'text-red-500' }
          ].map(({ label, value, icon: Icon, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-card p-6 rounded-lg shadow-md border border-border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-3xl font-bold text-foreground">{value}</p>
                </div>
                <Icon className={`w-12 h-12 ${color}`} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          />

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            </div>
          ) : (
            <>
            <div className="bg-card rounded-lg shadow-md border border-border">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-1/5">Utilisateur</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-1/5 hidden md:table-cell">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-1/5">Entreprise</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-1/6">Rôle</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-1/6 hidden lg:table-cell">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-1/6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {currentUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-foreground truncate">
                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground truncate hidden md:table-cell">{user.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground truncate">{user.company?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                            user.systemRole === 'Technicien' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.systemRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-1">
                            <button onClick={() => setEditingUser(user)} className="text-primary hover:text-primary/80 transition-colors p-1" title="Modifier">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setResetPasswordUser(user)} className="text-orange-500 hover:text-orange-600 transition-colors p-1" title="Réinitialiser mot de passe">
                              <Key className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteUser(user._id, user.username)} className="text-destructive hover:text-destructive/80 transition-colors p-1" title="Supprimer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls 
              currentPage={currentPageUsers} 
              totalPages={totalPagesUsers} 
              onPageChange={setCurrentPageUsers} 
            />
            </>
          )}
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          />

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentCompanies.map((company) => (
                <motion.div
                  key={company._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card rounded-lg shadow-md border border-border p-6"
                >
                  <div className="flex justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">{company.name}</h3>
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-muted-foreground">
                            Code invitation: 
                          </p>
                          {company.invitationCode ? (
                            <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {company.invitationCode}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Aucun code actif</span>
                          )}
                          <button
                            onClick={() => handleGenerateCode(company._id, company.name)}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            title="Générer un nouveau code"
                          >
                            {company.invitationCode ? 'Régénérer' : 'Générer'}
                          </button>
                        </div>
                        {company.tauxImpot !== undefined && company.tauxImpot > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full inline-block">
                            Impôt: {company.tauxImpot}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => setEditingCompany(company)} className="text-primary hover:text-primary/80 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCompany(company._id, company.name)} className="text-destructive hover:text-destructive/80 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-sm font-medium text-foreground mb-3">Membres ({company.members.length})</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                      {company.members.length > 0 ? (
                        company.members.map((m) => {
                          const displayName = (m.firstName && m.lastName) 
                            ? `${m.firstName} ${m.lastName}` 
                            : (m.username || m.email || 'Utilisateur');
                          const initials = (m.firstName && m.lastName)
                            ? `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase()
                            : (m.username ? m.username.substring(0, 2).toUpperCase() : (m.email ? m.email.substring(0, 2).toUpperCase() : 'U'));
                          
                          return (
                            <div key={m._id} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded hover:bg-muted/70 transition-colors">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-primary">
                                    {initials}
                                  </span>
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-foreground font-medium truncate">
                                    {displayName}
                                  </span>
                                  {m.email && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {m.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button 
                                onClick={() => handleRemoveMember(company._id, m._id, m.username || displayName, company.name)} 
                                className="text-destructive hover:text-destructive/80 transition-colors p-1 hover:bg-destructive/10 rounded flex-shrink-0 ml-2"
                                title="Retirer ce membre"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Aucun membre</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <PaginationControls 
              currentPage={currentPageCompanies} 
              totalPages={totalPagesCompanies} 
              onPageChange={setCurrentPageCompanies} 
            />
            </>
          )}
        </div>
      )}

      {activeTab === 'packs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Packs d'Items</h2>
            <button
              onClick={() => setShowPackForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un Pack</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            </div>
          ) : itemPacks.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun pack d'items créé</p>
              <p className="text-sm text-muted-foreground mt-2">Créez un pack pour que les entreprises puissent charger des items prédéfinis</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itemPacks.map((pack) => (
                <motion.div
                  key={pack._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card rounded-lg shadow-md border border-border p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{pack.nom}</h3>
                      {pack.description && (
                        <p className="text-sm text-muted-foreground mt-1">{pack.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditPack(pack)} className="text-primary hover:text-primary/80 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePack(pack._id, pack.nom)} className="text-destructive hover:text-destructive/80 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {pack.items.length} item{pack.items.length > 1 ? 's' : ''}
                    </span>
                    {pack.creePar && (
                      <span className="text-xs text-muted-foreground">
                        par {pack.creePar.firstName || pack.creePar.username}
                      </span>
                    )}
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground mb-2">Items inclus :</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                      {pack.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                          <div className="flex items-center space-x-2">
                            {item.image ? (
                              <img src={item.image} alt={item.nom} className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-foreground">{item.nom}</span>
                          </div>
                          <span className="text-green-500 font-medium">${item.prixVente}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de création/édition de pack */}
      {showPackForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl p-6 max-w-4xl w-full border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {editingPack ? 'Modifier le Pack' : 'Créer un Pack d\'Items'}
                  </h3>
                  <p className="text-sm text-muted-foreground">Les entreprises pourront charger ce pack</p>
                </div>
              </div>
              <button onClick={resetPackForm} className="text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Bouton Import PDF */}
            <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-dashed border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Importer depuis un PDF</p>
                    <p className="text-xs text-muted-foreground">
                      Format: Description | Prix Entreprise | Prix Orga | Lien Image
                    </p>
                  </div>
                </div>
                <div>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfImport}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={importingPdf}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                  >
                    {importingPdf ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Import en cours...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Importer PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colonne gauche - Infos du pack et ajout d'item */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nom du Pack *</label>
                  <input
                    type="text"
                    placeholder="Ex: Pack Coiffure Premium"
                    value={packFormData.nom}
                    onChange={(e) => setPackFormData(prev => ({ ...prev, nom: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    placeholder="Description du pack..."
                    value={packFormData.description}
                    onChange={(e) => setPackFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring resize-none"
                    rows={2}
                  />
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Ajouter un Item au Pack</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Nom de l'item *</label>
                      <input
                        type="text"
                        placeholder="Ex: Shampoing Pro"
                        value={currentPackItem.nom}
                        onChange={(e) => setCurrentPackItem(prev => ({ ...prev, nom: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Prix de vente ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={currentPackItem.prixVente}
                          onChange={(e) => setCurrentPackItem(prev => ({ ...prev, prixVente: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Coût de revient ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={currentPackItem.coutRevient}
                          onChange={(e) => setCurrentPackItem(prev => ({ ...prev, coutRevient: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    {/* Image */}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Image (optionnel)</label>
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setImageInputMode('upload');
                            setImageUrl('');
                            setCurrentPackItem(prev => ({ ...prev, image: '' }));
                          }}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                            imageInputMode === 'upload'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          <Upload className="w-3 h-3" />
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageInputMode('url');
                            setCurrentPackItem(prev => ({ ...prev, image: '' }));
                          }}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                            imageInputMode === 'url'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          <LinkIcon className="w-3 h-3" />
                          URL
                        </button>
                      </div>

                      {imageInputMode === 'upload' ? (
                        <div
                          className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
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
                          {currentPackItem.image && !currentPackItem.image.startsWith('http') ? (
                            <img src={currentPackItem.image} alt="Aperçu" className="w-16 h-16 object-cover rounded mx-auto" />
                          ) : (
                            <div className="space-y-1">
                              <Upload className="w-6 h-6 text-muted-foreground mx-auto" />
                              <p className="text-xs text-muted-foreground">Glissez ou cliquez</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="url"
                            placeholder="https://exemple.com/image.jpg"
                            value={imageUrl}
                            onChange={(e) => {
                              setImageUrl(e.target.value);
                              setCurrentPackItem(prev => ({ ...prev, image: e.target.value }));
                            }}
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring"
                          />
                          {imageUrl && (
                            <img src={imageUrl} alt="Aperçu" className="w-16 h-16 object-cover rounded mx-auto" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="gestionStock"
                        checked={currentPackItem.gestionStock}
                        onChange={(e) => setCurrentPackItem(prev => ({ ...prev, gestionStock: e.target.checked }))}
                        className="rounded border-input"
                      />
                      <label htmlFor="gestionStock" className="text-sm text-foreground">Gestion du stock</label>
                    </div>

                    <button
                      onClick={handleAddItemToPack}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter l'item au pack</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Colonne droite - Liste des items du pack */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Items dans le pack ({packFormData.items.length})</h4>
                </div>

                {packFormData.items.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Aucun item dans le pack</p>
                    <p className="text-xs text-muted-foreground mt-1">Ajoutez des items avec le formulaire à gauche</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {packFormData.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {item.image ? (
                            <img src={item.image} alt={item.nom} className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.nom}</p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>Vente: ${item.prixVente}</span>
                              <span>•</span>
                              <span>Coût: ${item.coutRevient}</span>
                              <span>•</span>
                              <span className="text-green-500">Marge: ${item.margeBrute || (item.prixVente - item.coutRevient)}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveItemFromPack(idx)}
                          className="text-destructive hover:text-destructive/80 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-4 flex justify-end space-x-3">
                  <button
                    onClick={resetPackForm}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSavePack}
                    disabled={!packFormData.nom || packFormData.items.length === 0}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingPack ? 'Modifier le Pack' : 'Créer le Pack'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl p-6 max-w-2xl w-full border border-border shadow-2xl"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Modifier l'utilisateur</h3>
                <p className="text-sm text-muted-foreground">@{editingUser.username}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Username</label>
                <input
                  type="text"
                  placeholder="Username"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Prénom</label>
                <input
                  type="text"
                  placeholder="Prénom"
                  value={editingUser.firstName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nom</label>
                <input
                  type="text"
                  placeholder="Nom"
                  value={editingUser.lastName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Rôle système</label>
                <div className="relative">
                  <select
                    value={editingUser.systemRole}
                    onChange={(e) => setEditingUser({ ...editingUser, systemRole: e.target.value })}
                    disabled={editingUser._id === users.find(u => u.systemRole === 'Technicien')?._id}
                    className="w-full px-4 py-3 pl-12 pr-10 border-2 border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer font-medium hover:border-primary/50"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.25em 1.25em'
                    }}
                  >
                    <option value="Utilisateur">Utilisateur - Accès standard</option>
                    <option value="Technicien">Technicien - Accès administrateur</option>
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {editingUser.systemRole === 'Utilisateur' ? (
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <Shield className="w-4 h-4 text-red-600" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground flex items-center space-x-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-primary"></span>
                  <span>
                    {editingUser.systemRole === 'Utilisateur' 
                      ? 'Accès aux fonctionnalités standard de l\'application'
                      : 'Accès complet à toutes les fonctionnalités d\'administration'}
                  </span>
                </p>
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    editingUser.isActive ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {editingUser.isActive ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Users className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Statut du compte</p>
                    <p className="text-xs text-muted-foreground">
                      {editingUser.isActive ? 'Le compte est actif et peut se connecter' : 'Le compte est désactivé'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.isActive}
                    onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-border">
              <button 
                onClick={() => setEditingUser(null)} 
                className="px-6 py-2.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
              >
                Annuler
              </button>
              <button 
                onClick={handleUpdateUser} 
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20"
              >
                Enregistrer les modifications
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingCompany && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg p-6 max-w-md w-full border border-border shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-4 text-foreground">Modifier l'entreprise</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nom"
                value={editingCompany.name}
                onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                placeholder="Code"
                value={editingCompany.code}
                onChange={(e) => setEditingCompany({ ...editingCompany, code: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
              />
              <input
                type="number"
                placeholder="Taux d'impôt (%)"
                value={editingCompany.tauxImpot || 0}
                onChange={(e) => setEditingCompany({ ...editingCompany, tauxImpot: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setEditingCompany(null)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                Annuler
              </button>
              <button onClick={handleUpdateCompany} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Enregistrer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg p-6 max-w-md w-full border border-border shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-4 text-foreground">Réinitialiser le mot de passe</h3>
            <p className="text-sm text-muted-foreground mb-4">Utilisateur: {resetPasswordUser.username}</p>
            <input
              type="password"
              placeholder="Nouveau mot de passe (min 6 caractères)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                Annuler
              </button>
              <button onClick={handleResetPassword} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Réinitialiser
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default TechnicianAdminPage;
