import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, RefreshCw, Settings, DollarSign } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Layout from '../components/Layout';
import WeekFilter from '../components/WeekFilter';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import api from '../utils/api';
import toast from 'react-hot-toast';
// Import supprimé - Score social géré depuis la page des employés
import { calculateEmployeeSalary } from '../services/salaryService';
// import { recalculateAllVentes } from '../services/ventesService';

interface Employe {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  compteBancaire: string;
  discordId: string;
  discordUsername: string;
  avatar?: string; // Photo de profil de l'utilisateur
  role: any;
  createdAt: string;
  isActive: boolean;
  // Données calculées
  taux?: number;
  lettres?: number;
  avantages?: number;
  avances?: number;
  coutRevient?: number;
  primes?: number;
  salaire?: number;
  salaireAVerser?: number;
  // Champs pour les salaires
  // Données pour le calcul
  margeGeneree?: number;
  chiffreAffaires?: number;
  chiffreAffairesVentes?: number;
  chiffreAffairesTimer?: number;
  sessionsTimerCount?: number;
  salaireCalcule?: number; // Salaire calculé automatiquement
  limiteSalaire?: number; // Limite maximale de salaire du rôle
  salaireBloque?: boolean; // Indique si le salaire a atteint la limite
  montantRetenuEntreprise?: number; // Montant retenu par l'entreprise si limite atteinte
}



const SalairesPage: React.FC = () => {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { user } = useAuth();
  const { hasPermission, canViewCategory } = useUserPermissions();
  
  // Debug pour vérifier selectedCompanyId
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [showEditSalaireModal, setShowEditSalaireModal] = useState(false);
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);
  const [editSalaireMontant, setEditSalaireMontant] = useState('');
  
  // États pour le modal de primes/avances
  const [showPrimesAvancesModal, setShowPrimesAvancesModal] = useState(false);
  const [editPrimes, setEditPrimes] = useState('');
  const [editAvances, setEditAvances] = useState('');
  
  // États pour la gestion des colonnes visibles
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    role: true,
    taux: true,
    compteBancaire: true,
    ca: true,
    coutRevient: true,
    avances: true,
    primes: true,
    salaire: true,
    salaireAVerser: true
  });
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 6 éléments par page comme demandé
  
  // Réinitialiser la page courante quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWeek, selectedYear, searchTerm]);
  
  // Pagination côté client
  const filteredEmployes = employes.filter(employe => 
    employe.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employe.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employe.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredEmployes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployes = filteredEmployes.slice(startIndex, endIndex);

  // Vérifier les permissions
  const canViewSalaires = canViewCategory('ADMINISTRATION') || hasPermission('VIEW_ADMINISTRATION_CATEGORY') || canViewCategory('GENERALE') || hasPermission('VIEW_GENERALE_CATEGORY');
  const canManageSalaires = hasPermission('MANAGE_SALAIRES');

  // Charger les employés avec leurs données de ventes
  const fetchEmployees = async () => {
    if (!user || !selectedCompanyId || !canViewSalaires) {
      
      return;
    }

    try {
      setLoading(true);
      
      
      // Récupérer les employés
      const usersResponse = await api.get(`/users?company=${selectedCompanyId}`);
      
      
      
      
      // Récupérer les ventes pour la semaine sélectionnée (TOUTES les ventes, pas de limite)
      const ventesResponse = await api.get(`/ventes?companyId=${selectedCompanyId}&week=${selectedWeek}&year=${selectedYear}&limit=9999`);
      const ventes = ventesResponse?.data?.ventes || [];
      
      // Récupérer les sessions de timer pour la semaine sélectionnée
      let timerSessions = [];
      try {
        // Récupérer les sessions timer avec filtre de semaine
        const timerResponse = await api.get(`/timers/sessions/history/${selectedCompanyId}?week=${selectedWeek}_${selectedYear}&limit=9999`);
        timerSessions = timerResponse?.data?.sessions || timerResponse?.data || [];
        
        // Si pas de sessions cette semaine, c'est normal - on garde un tableau vide
        // Ne PAS récupérer toutes les sessions sans filtre !
      } catch (error) {
        console.error('Erreur récupération timers:', error);
        timerSessions = [];
      }
      
      // TEMPORAIRE : Si aucune session récupérée, utiliser les données visibles dans l'historique
      if (timerSessions.length === 0) {
        
      }
      
      if (usersResponse && usersResponse.data.success) {
        const allUsers = usersResponse.data.users || [];
        
        
       
        
        const adaptedEmployes = allUsers.map((user: any) => {
         
          // Calculer la marge générée par cet employé
          const ventesEmploye = ventes.filter((vente: any) => {
            // Pour les ventes API GLife, filtrer par charId de l'utilisateur
            if (vente.source === 'glife_api') {
              // L'API GLife retourne déjà les ventes filtrées par utilisateur si userOnly=true
              // Mais si on récupère toutes les ventes, il faut filtrer par nom
              const userName = `${user.firstName} ${user.lastName}`.trim();
              return vente.name === userName || 
                     vente.name === user.username ||
                     (user.charId && vente.id && user.charId.toString() === vente.id.toString());
            }
            
            // Pour les ventes normales, utiliser les champs habituels
            return vente.vendeur?._id === user._id || 
                   vente.vendeur?.username === user.username ||
                   vente.vendeurNom === user.username ||
                   vente.vendeurNom === `${user.firstName} ${user.lastName}`;
          });
          
         
          
          // Calculer le CA des ventes (gérer API GLife et ventes normales)
          const chiffreAffairesVentes = ventesEmploye.reduce((total: number, vente: any) => {
            // Si c'est une vente de l'API GLife, utiliser le revenue
            if (vente.source === 'glife_api' && vente.revenue) {
              return total + parseInt(vente.revenue || '0');
            }
            // Sinon utiliser totalCommission (ventes normales)
            return total + (vente.totalCommission || 0);
          }, 0);
          
          // Calculer le CA des sessions timer de la semaine sélectionnée
          const timerSessionsEmploye = timerSessions.filter((session: any) => {
            // Filtrer uniquement les sessions de cet utilisateur
            return session.utilisateur?._id === user._id || 
                   session.utilisateur?.username === user.username ||
                   session.utilisateurNom === user.username ||
                   session.utilisateurNom === `${user.firstName} ${user.lastName}`;
          });
          
          
          
          
          const chiffreAffairesTimer = timerSessionsEmploye.reduce((total: number, session: any) => {
            // Utiliser les données réelles du backend (coutCalcule ou coutTotal)
            let coutSession = session.coutCalcule || session.coutTotal || 0;
            
            return total + coutSession;
          }, 0);
          
          
          
          // Chiffre d'affaires total = ventes + timer
          const chiffreAffaires = chiffreAffairesVentes + chiffreAffairesTimer;
          
          // Calculer le coût de revient réel basé sur les prix usine des ventes
          const coutRevientReel = ventesEmploye.reduce((total: number, vente: any) => {
            const coutVente = vente.totalPrixUsine || 0; // Utiliser le prix usine réel
            return total + coutVente;
          }, 0);
          
          const coutRevient = Math.round(coutRevientReel);
         
          
          // La marge est déjà dans chiffreAffaires (totalCommission)
          
          
          // Récupérer la norme salariale et la limite de salaire du rôle
          // Priorité : rôle par entreprise > rôle global
          const companyRole = user.companies?.find((c: any) => c.company === selectedCompanyId)?.role;
          const normeSalariale = companyRole?.normeSalariale || user.role?.normeSalariale || 0;
          const limiteSalaire = companyRole?.limiteSalaire || user.role?.limiteSalaire || 0;
          
          // Utiliser le service de calcul de salaire simplifié avec limite
          const salaryResult = calculateEmployeeSalary(chiffreAffaires, normeSalariale, limiteSalaire);
          const salaireCalcule = salaryResult.salaireCalculeFinal;
          
          // DEBUG: Afficher les valeurs pour comprendre pourquoi le salaire est 0
          console.log(`🔍 DEBUG SALAIRE pour ${user.firstName} ${user.lastName}:`, {
            chiffreAffaires,
            normeSalariale,
            salaireCalcule,
            salaireManuel: user.salaire,
            salaryResult
          });
          
          // Récupérer les avances et primes actuelles
          const avances = user.avances || 0;
          const primes = user.primes || 0;
          
          // Récupérer le salaire manuel s'il existe (depuis le modèle Employe)
          // Si un salaire manuel a été défini ET qu'il est > 0, l'utiliser en priorité
          // Sinon utiliser le salaire calculé automatiquement
          const salaireManuel = user.salaire;
          // CORRECTION: Utiliser le salaire manuel SEULEMENT s'il est défini ET > 0
          let salaireFinal = (salaireManuel !== undefined && salaireManuel !== null && salaireManuel > 0) 
            ? salaireManuel 
            : salaireCalcule;
          
          // Ajouter les primes au salaire final
          salaireFinal = salaireFinal + primes;
          
          console.log(`💰 Salaire final pour ${user.firstName}:`, {
            salaireManuel,
            salaireCalcule,
            primes,
            salaireFinal,
            condition: (salaireManuel !== undefined && salaireManuel !== null && salaireManuel > 0)
          });
          
          // Calculer le salaire à verser : salaire final + primes - avances
          const salaireAVerser = salaireFinal - avances;
        
          return {
            _id: user._id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email || 'N/A',
            phoneNumber: user.phoneNumber || '',
            compteBancaire: user.compteBancaire || '',
            discordId: user.discordId || '',
            discordUsername: user.discordUsername || '',
            avatar: user.avatar, // Inclure la photo de profil
            role: companyRole || user.role,
            createdAt: user.createdAt || new Date().toISOString(),
            isActive: user.isActive !== false,
            // Données calculées
            chiffreAffaires,
            chiffreAffairesVentes,
            chiffreAffairesTimer,
            sessionsTimerCount: timerSessionsEmploye.length,
            // Valeurs pour les salaires
            taux: normeSalariale,
            lettres: 0,
            avantages: 0,
            coutRevient,
            avances,
            primes: user.primes || 0,
            salaire: salaireFinal, // Utiliser le salaire manuel si défini, sinon le calculé
            salaireCalcule, // NOUVEAU: Toujours garder le salaire calculé automatiquement
            salaireAVerser,
            limiteSalaire: salaryResult.limiteSalaire,
            salaireBloque: salaryResult.salaireBloque,
            montantRetenuEntreprise: salaryResult.montantRetenuEntreprise
          };
        });
        setEmployes(adaptedEmployes);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des employés:', error);
      setEmployes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [selectedCompanyId, user, canViewSalaires, selectedWeek, selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      useGrouping: false
    }).format(amount);
  };

  const handleEditSalaire = (employe: Employe) => {
    if (!canManageSalaires) {
      toast.error('Vous n\'avez pas les permissions pour modifier les salaires');
      return;
    }
    setSelectedEmploye(employe);
    setEditSalaireMontant((employe.salaire || 0).toString());
    setShowEditSalaireModal(true);
  };

  const handleDelete = (id: string) => {
    if (!canManageSalaires) {
      toast.error('Vous n\'avez pas les permissions pour supprimer les données de salaires');
      return;
    }
    // Afficher un toast de confirmation
    toast((t) => (
      <div className="flex flex-col gap-2">
        <div className="font-medium">Confirmer la suppression</div>
        <div className="text-sm text-muted-foreground">
          Êtes-vous sûr de vouloir supprimer cet employé ? Cette action est irréversible.
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              setEmployes(prev => prev.filter(emp => emp._id !== id));
              toast.success('Employé supprimé avec succès');
            }}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
          >
            Supprimer
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
    });
  };

  const handleRecalculateVentes = async () => {
    try {
      setLoading(true);
      // Simplement recharger les données
      await fetchEmployees();
      toast.success('Données des salaires rechargées avec succès');
    } catch (error) {
      console.error('Erreur lors du rechargement:', error);
      toast.error('Erreur lors du rechargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSalaireSave = async () => {
    if (!selectedEmploye) return;
    
    if (!selectedCompanyId) {
      toast.error('Aucune entreprise sélectionnée');
      return;
    }
    
    try {
      setLoading(true);
      
      // Modifier le salaire directement
      const response = await api.put(`/salaires/edit/${selectedEmploye._id}`, {
        salaire: parseFloat(editSalaireMontant) || 0,
        companyId: selectedCompanyId
      });
      
      if (response.data.success) {
        toast.success('Salaire modifié avec succès');
        setShowEditSalaireModal(false);
        setEditSalaireMontant('');
        setSelectedEmploye(null);
        // Forcer le rechargement
        setEmployes([]);
        setTimeout(async () => {
          await fetchEmployees();
        }, 500);
      }
    } catch (error) {
      console.error('Erreur lors de la modification du salaire:', error);
      toast.error('Erreur lors de la modification du salaire');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrimesAvances = (employe: Employe) => {
    if (!canManageSalaires) {
      toast.error('Vous n\'avez pas les permissions pour modifier les primes et avances');
      return;
    }
    setSelectedEmploye(employe);
    setEditPrimes(employe.primes?.toString() || '0');
    setEditAvances(employe.avances?.toString() || '0');
    setShowPrimesAvancesModal(true);
  };

  const handleSavePrimesAvances = async () => {
    if (!selectedEmploye || !selectedCompanyId) return;
    
    try {
      setLoading(true);
      
      const response = await api.put(`/users/${selectedEmploye._id}`, {
        primes: parseFloat(editPrimes) || 0,
        avances: parseFloat(editAvances) || 0,
        companyId: selectedCompanyId
      });
      
      if (response.data.success) {
        toast.success('Primes et avances modifiées avec succès');
        setShowPrimesAvancesModal(false);
        setEditPrimes('');
        setEditAvances('');
        setSelectedEmploye(null);
        // Forcer le rechargement
        setEmployes([]);
        setTimeout(async () => {
          await fetchEmployees();
        }, 500);
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error('Erreur lors de la modification des primes et avances');
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  if (!canViewSalaires) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions pour voir les salaires.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!selectedCompany) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Aucune entreprise sélectionnée</h2>
            <p className="text-muted-foreground">
              Veuillez sélectionner une entreprise pour voir les salaires.
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
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Salaires</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header avec filtres */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Salaires</h1>
              <p className="text-muted-foreground">Gestion des salaires des employés</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button 
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Settings className="h-4 w-4" />
                  Colonnes
                </Button>
                
                {/* Menu déroulant pour sélectionner les colonnes */}
                {showColumnSelector && (
                  <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-4">
                    <h3 className="font-semibold text-sm mb-3">Afficher les colonnes</h3>
                    <div className="space-y-2">
                      {Object.entries(visibleColumns).map(([key, value]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button 
                onClick={handleRecalculateVentes}
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
                Recalculer les ventes
              </Button>
            </div>
          </div>
          
          {/* Filtres */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <WeekFilter
              selectedWeek={selectedWeek}
              selectedYear={selectedYear}
              onWeekChange={(week, year) => {
                setSelectedWeek(week);
                setSelectedYear(year);
              }}
            />
          </div>
        </div>

        {/* Récapitulatif des montants retenus */}
        {(() => {
          const totalRetenu = employes.reduce((sum, emp) => sum + (emp.montantRetenuEntreprise || 0), 0);
          const employesPlafonnés = employes.filter(emp => emp.salaireBloque).length;
          
          if (totalRetenu > 0) {
            return (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <span className="text-xl">🔒</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-900 dark:text-orange-100">Montant retenu par l'entreprise</h3>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        {employesPlafonnés} employé{employesPlafonnés > 1 ? 's' : ''} plafonné{employesPlafonnés > 1 ? 's' : ''} par limite de salaire
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(totalRetenu)}
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">
                      Reste dans le CA
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Tableau */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : employes.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground">Aucun employé trouvé</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left p-4 font-medium text-foreground">Employé</th>
                    {visibleColumns.role && <th className="text-left p-4 font-medium text-foreground">Rôle</th>}
                    {visibleColumns.taux && <th className="text-center p-4 font-medium text-foreground">Taux</th>}
                    {visibleColumns.compteBancaire && <th className="text-left p-4 font-medium text-foreground">Compte bancaire</th>}
                    {visibleColumns.ca && <th className="text-center p-4 font-medium text-foreground">CA</th>}
                    {visibleColumns.coutRevient && <th className="text-center p-4 font-medium text-foreground">Coût de revient</th>}
                    {visibleColumns.avances && <th className="text-center p-4 font-medium text-foreground">Avances</th>}
                    {visibleColumns.primes && <th className="text-center p-4 font-medium text-foreground">Primes</th>}
                    {visibleColumns.salaire && <th className="text-center p-4 font-medium text-foreground">Salaire</th>}
                    {visibleColumns.salaireAVerser && <th className="text-center p-4 font-medium text-foreground">Salaire à verser</th>}
                    <th className="text-center p-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployes.map((employe, index) => (
                    <tr key={employe._id} className={`border-b border-border hover:bg-muted/20 transition-colors ${
                      index === paginatedEmployes.length - 1 ? 'border-b-0' : ''
                    }`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                            {employe.avatar ? (
                              <img 
                                src={employe.avatar} 
                                alt={`${employe.firstName} ${employe.lastName}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // En cas d'erreur de chargement, cacher l'image et afficher les initiales
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.style.display = 'none';
                                  const sibling = target.nextElementSibling as HTMLElement;
                                  if (sibling) {
                                    sibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <span 
                              className={`text-sm font-medium text-primary items-center justify-center ${employe.avatar ? 'hidden' : 'flex'}`}
                            >
                              {employe.firstName.charAt(0)}{employe.lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {employe.firstName} {employe.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @{employe.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      {visibleColumns.role && (
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {employe.role?.nom || employe.role?.name || 'Aucun rôle'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.taux && <td className="p-4 text-center text-sm">{employe.taux || 0}%</td>}
                      {visibleColumns.compteBancaire && (
                        <td className="p-4 text-left text-sm font-mono">
                          {employe.compteBancaire || 'Non renseigné'}
                        </td>
                      )}
                      {visibleColumns.ca && (
                        <td className="p-4 text-center text-sm">
                          <div className="flex flex-col items-center">
                            <span className="font-medium text-cyan-600">{formatCurrency(employe.chiffreAffaires || 0)}</span>
                            <div className="text-xs text-gray-500 mt-1">
                              <div>Ventes: {formatCurrency(employe.chiffreAffairesVentes || 0)}</div>
                              <div>Timers: {formatCurrency(employe.chiffreAffairesTimer || 0)} ({employe.sessionsTimerCount || 0})</div>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.coutRevient && <td className="p-4 text-center text-sm">{formatCurrency(employe.coutRevient || 0)}</td>}
                      {visibleColumns.avances && <td className="p-4 text-center text-sm font-medium text-orange-600">{formatCurrency(employe.avances || 0)}</td>}
                      {visibleColumns.primes && <td className="p-4 text-center text-sm font-medium text-purple-600">{formatCurrency(employe.primes || 0)}</td>}
                      {visibleColumns.salaire && (
                        <td className="p-4 text-center text-sm">
                        <div className="flex flex-col items-center">
                          <span className={`font-medium ${employe.salaireBloque ? 'text-orange-600' : 'text-green-600'}`}>
                            {formatCurrency(employe.salaireCalcule || 0)}
                          </span>
                          {employe.salaireBloque && employe.montantRetenuEntreprise && employe.montantRetenuEntreprise > 0 && (
                            <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                              <span title="Salaire plafonné - Excédent retenu par l'entreprise">
                                🔒 Limite: {formatCurrency(employe.limiteSalaire || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                        </td>
                      )}
                      {visibleColumns.salaireAVerser && (
                        <td className="p-4 text-center text-sm">
                          <div className="flex flex-col items-center">
                            <span className="font-medium text-blue-600">{formatCurrency(employe.salaireAVerser || 0)}</span>
                            {employe.salaireBloque && employe.montantRetenuEntreprise && employe.montantRetenuEntreprise > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Retenu: {formatCurrency(employe.montantRetenuEntreprise)}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-1">
                          {canManageSalaires ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditPrimesAvances(employe)}
                                title="Modifier primes et avances"
                              >
                                <DollarSign className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditSalaire(employe)}
                                title="Modifier le salaire"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(employe._id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Lecture seule</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredEmployes.length}
        />

        {/* Modal Modifier Salaire */}
        {showEditSalaireModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card/20 backdrop-blur-sm border border-border rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Modifier le salaire</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Employé: {selectedEmploye?.firstName} {selectedEmploye?.lastName}
              </p>
              
              <div className="mb-4">
                <Label htmlFor="editSalaireMontant" className="mb-2 block">Salaire ($)</Label>
                <Input
                  id="editSalaireMontant"
                  type="number"
                  value={editSalaireMontant}
                  onChange={(e) => setEditSalaireMontant(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleEditSalaireSave} disabled={loading}>
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowEditSalaireModal(false);
                  setEditSalaireMontant('');
                  setSelectedEmploye(null);
                }}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifier Primes et Avances */}
        {showPrimesAvancesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card/20 backdrop-blur-sm border border-border rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Modifier Primes et Avances</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Employé: {selectedEmploye?.firstName} {selectedEmploye?.lastName}
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editPrimes" className="mb-2 block">Primes ($)</Label>
                  <Input
                    id="editPrimes"
                    type="number"
                    value={editPrimes}
                    onChange={(e) => setEditPrimes(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="editAvances" className="mb-2 block">Avances ($)</Label>
                  <Input
                    id="editAvances"
                    type="number"
                    value={editAvances}
                    onChange={(e) => setEditAvances(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button onClick={handleSavePrimesAvances} disabled={loading}>
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowPrimesAvancesModal(false);
                  setEditPrimes('');
                  setEditAvances('');
                  setSelectedEmploye(null);
                }}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default SalairesPage;
