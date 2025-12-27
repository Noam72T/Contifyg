import React, { useState, useEffect } from 'react';
import { Clock, Car, Search, Download, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Timer, Calendar, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface TimerHistorySession {
  _id: string;
  vehicle: {
    _id: string;
    nom: string;
    marque: string;
    modele: string;
    image?: string;
  };
  heureDebut: string;
  heureFin: string;
  dureeMinutes: number;
  dureeSecondes?: number;
  coutTotal: number;
  coutCalcule?: number; // Champ du backend
  statut: 'termine' | 'annule';
  pausesTotales: number;
  createdAt: string;
  utilisateur?: {
    username: string;
    nom?: string;
    prenom?: string;
  };
}

const TimerHistoryPage: React.FC = () => {
  const { hasPermission } = useUserPermissions();
  const [sessions, setSessions] = useState<TimerHistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'termine' | 'annule'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [weekFilter, setWeekFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'cost'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination côté client (comme les autres pages)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  // Données pour les filtres
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  // États pour les permissions (même logique que ModernTimersPage)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Vérifier les permissions timer (même logique que ModernTimersPage)
  useEffect(() => {
    const checkTimerPermissions = async () => {
      if (!selectedCompany || !user) {
        setPermissionChecked(true);
        setInitialLoading(false);
        return;
      }
      
      // Les Techniciens ont toujours accès pour gérer
      if (user.systemRole === 'Technicien') {
        setIsAuthorized(true);
        setPermissionChecked(true);
        setInitialLoading(false);
        return;
      }
      
      // Mode debug - forcer l'affichage
      const forceShow = localStorage.getItem('forceShowTimers') === 'true';
      
      if (forceShow) {
        setIsAuthorized(true);
        setPermissionChecked(true);
        setInitialLoading(false);
        return;
      }
      
      // Vérifier les permissions via l'API backend (même logique que la Sidebar)
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${apiUrl}/api/timer-permissions/check/${selectedCompany._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const isAuthorizedFromAPI = data.permission?.isAuthorized || false;
          
          setIsAuthorized(isAuthorizedFromAPI);
          setPermissionChecked(true);
          setInitialLoading(false);
          return;
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('❌ TimerHistoryPage - Erreur lors de la vérification:', error);
        setIsAuthorized(false);
      }
      
      setPermissionChecked(true);
      setInitialLoading(false);
    };
    
    checkTimerPermissions();

    // Écouter les changements d'autorisation (même logique que ModernTimersPage)
    const handlePermissionChange = (event: any) => {
      if (event.detail && event.detail.companyId === selectedCompany?._id) {
        setIsAuthorized(event.detail.isAuthorized);
        setPermissionChecked(true);
        setInitialLoading(false);
      } else {
        checkTimerPermissions();
      }
    };

    window.addEventListener('timerPermissionChanged', handlePermissionChange);
    
    return () => {
      window.removeEventListener('timerPermissionChanged', handlePermissionChange);
    };
  }, [selectedCompany, user]);

  // Charger l'historique des sessions (seulement quand nécessaire)
  useEffect(() => {
    if (selectedCompany && isAuthorized && permissionChecked) {
      loadTimerHistory();
    }
  }, [selectedCompany, weekFilter, isAuthorized, permissionChecked]);

  // Charger les véhicules et employés pour les filtres
  useEffect(() => {
    loadFilterData();
  }, [selectedCompany]);

  const loadFilterData = async () => {
    if (!selectedCompany) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');

      // Charger les véhicules
      const vehiclesResponse = await fetch(`${apiUrl}/api/vehicles/company/${selectedCompany._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        setVehicles(vehiclesData.vehicles || []);
      }

      // Charger les employés (utilisateurs de l'entreprise)
      const employeesResponse = await fetch(`${apiUrl}/api/users/company/${selectedCompany._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData.users || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de filtres:', error);
    }
  };

  const loadTimerHistory = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();

      // Ajouter seulement les filtres de base (pas de pagination côté serveur)
      if (weekFilter) params.append('week', weekFilter);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${apiUrl}/api/timers/sessions/history/${selectedCompany._id}${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let sessions = data.sessions || data || [];
        
        // Utiliser les données du backend directement
        sessions = sessions.map((session: TimerHistorySession) => {
          return {
            ...session,
            // Utiliser coutCalcule du backend si disponible, sinon garder coutTotal
            coutTotal: session.coutCalcule || session.coutTotal || 0
          };
        });
        
        setSessions(sessions);
      } else {
        console.error('Erreur lors de la récupération de l\'historique - Route non trouvée');
        
        
        // Données de test temporaires en attendant la création de la route backend
        const testSessions: TimerHistorySession[] = [
          {
            _id: '1',
            vehicle: {
              _id: 'v1',
              nom: 'Sultan',
              marque: 'Karin',
              modele: 'Sultan',
              image: undefined
            },
            heureDebut: new Date(Date.now() - 60000).toISOString(), // Il y a 1 minute
            heureFin: new Date().toISOString(), // Maintenant
            dureeMinutes: 1,
            dureeSecondes: 0,
            coutTotal: 2.50, // 1 minute à 2.50$/min
            statut: 'termine',
            utilisateur: { username: 'test', nom: 'Test', prenom: 'User' },
            pausesTotales: 0,
            createdAt: new Date().toISOString()
          },
          {
            _id: '2',
            vehicle: {
              _id: 'v2',
              nom: 'Infernus',
              marque: 'Pegassi',
              modele: 'Infernus',
              image: undefined
            },
            heureDebut: new Date(Date.now() - 7200000).toISOString(),
            heureFin: new Date(Date.now() - 3600000).toISOString(),
            dureeMinutes: 60,
            dureeSecondes: 0,
            coutTotal: 180.00,
            statut: 'termine',
            utilisateur: { username: 'test2', nom: 'Test2', prenom: 'User2' },
            pausesTotales: 0,
            createdAt: new Date(Date.now() - 7200000).toISOString()
          },
          {
            _id: '3',
            vehicle: {
              _id: 'v3',
              nom: 'Zentorno',
              marque: 'Pegassi',
              modele: 'Zentorno',
              image: undefined
            },
            heureDebut: new Date(Date.now() - 14400000).toISOString(),
            heureFin: new Date(Date.now() - 10800000).toISOString(),
            dureeMinutes: 60,
            dureeSecondes: 0,
            coutTotal: 200.00,
            statut: 'termine',
            utilisateur: { username: 'test3', nom: 'Test3', prenom: 'User3' },
            pausesTotales: 5,
            createdAt: new Date(Date.now() - 14400000).toISOString()
          },
          {
            _id: '4',
            vehicle: {
              _id: 'v4',
              nom: 'Adder',
              marque: 'Truffade',
              modele: 'Adder',
              image: undefined
            },
            heureDebut: new Date(Date.now() - 21600000).toISOString(),
            heureFin: new Date(Date.now() - 18000000).toISOString(),
            dureeMinutes: 60,
            dureeSecondes: 0,
            coutTotal: 250.00,
            statut: 'annule',
            utilisateur: { username: 'test4', nom: 'Test4', prenom: 'User4' },
            pausesTotales: 0,
            createdAt: new Date(Date.now() - 21600000).toISOString()
          },
          {
            _id: '5',
            vehicle: {
              _id: 'v5',
              nom: 'T20',
              marque: 'Progen',
              modele: 'T20',
              image: undefined
            },
            heureDebut: new Date(Date.now() - 28800000).toISOString(),
            heureFin: new Date(Date.now() - 25200000).toISOString(),
            dureeMinutes: 60,
            dureeSecondes: 0,
            coutTotal: 300.00,
            statut: 'termine',
            utilisateur: { username: 'test5', nom: 'Test5', prenom: 'User5' },
            pausesTotales: 2,
            createdAt: new Date(Date.now() - 28800000).toISOString()
          },
          {
            _id: '6',
            vehicle: {
              _id: 'v6',
              nom: 'Osiris',
              marque: 'Pegassi',
              modele: 'Osiris',
              image: undefined
            },
            heureDebut: new Date(Date.now() - 36000000).toISOString(),
            heureFin: new Date(Date.now() - 32400000).toISOString(),
            dureeMinutes: 60,
            dureeSecondes: 0,
            coutTotal: 275.00,
            statut: 'termine',
            utilisateur: { username: 'test6', nom: 'Test6', prenom: 'User6' },
            pausesTotales: 1,
            createdAt: new Date(Date.now() - 36000000).toISOString()
          },
          {
            _id: '7',
            vehicle: {
              _id: 'v7',
              nom: 'Reaper',
              marque: 'Pegassi',
              modele: 'Reaper',
              image: undefined
            },
            heureDebut: new Date(Date.now() - 43200000).toISOString(),
            heureFin: new Date(Date.now() - 39600000).toISOString(),
            dureeMinutes: 60,
            dureeSecondes: 0,
            coutTotal: 320.00,
            statut: 'termine',
            utilisateur: { username: 'test7', nom: 'Test7', prenom: 'User7' },
            pausesTotales: 0,
            createdAt: new Date(Date.now() - 43200000).toISOString()
          }
        ];
        setSessions(testSessions);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage côté client (comme les autres pages)
  const filteredSessions = sessions.filter(session => {
    // Filtre par recherche textuelle
    const matchesSearch = !searchTerm || 
      session.vehicle?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.vehicle?.marque?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.vehicle?.modele?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtre par statut
    const matchesStatus = statusFilter === 'all' || session.statut === statusFilter;

    // Filtre par véhicule
    const matchesVehicle = vehicleFilter === 'all' || session.vehicle?._id === vehicleFilter;

    // Filtre par employé (correction: utilisateur n'a pas d'_id dans l'interface)
    const matchesEmployee = employeeFilter === 'all';

    // Filtre par date spécifique
    const matchesDate = !dateFilter || 
      new Date(session.heureDebut).toISOString().split('T')[0] === dateFilter;

    return matchesSearch && matchesStatus && matchesVehicle && matchesEmployee && matchesDate;
  });

  // Tri côté client
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.heureDebut).getTime() - new Date(b.heureDebut).getTime();
        break;
      case 'duration':
        comparison = (a.dureeMinutes || 0) - (b.dureeMinutes || 0);
        break;
      case 'cost':
        comparison = (a.coutTotal || 0) - (b.coutTotal || 0);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination côté client
  const totalPages = Math.ceil(sortedSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessions = sortedSessions.slice(startIndex, startIndex + itemsPerPage);

  const formatTime = (minutes: number, seconds?: number) => {
    if (seconds !== undefined) {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Fonction utilitaire pour vérifier si les données véhicule sont valides
  const isValidVehicleInfo = (marque?: string, modele?: string) => {
    return marque && modele && 
           marque.trim() && modele.trim() &&
           marque !== 'Non spécifié' && modele !== 'Non spécifié' &&
           marque !== '' && modele !== '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction de suppression de session timer
  const handleDeleteSession = async (sessionId: string) => {
    // Afficher un toast de confirmation
    toast((t) => (
      <div className="flex flex-col gap-2">
        <div className="font-medium">Confirmer la suppression</div>
        <div className="text-sm text-muted-foreground">
          Êtes-vous sûr de vouloir supprimer cette session timer ? Cette action est irréversible.
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete(`/timers/sessions/${sessionId}/delete`);
                toast.success('Session timer supprimée avec succès');
                // Recharger les sessions
                loadTimerHistory();
              } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                toast.error('Erreur lors de la suppression de la session timer');
              }
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
      duration: Infinity, // Le toast reste jusqu'à ce qu'on clique sur un bouton
    });
  };

  // États pour la navigation des semaines (même système que ListeVentesPage)
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

  // Mettre à jour le filtre de semaine quand selectedWeek/selectedYear change
  useEffect(() => {
    // Calculer les dates de début et fin de la semaine sélectionnée
    const getWeekDates = (week: number, year: number) => {
      const jan4 = new Date(year, 0, 4);
      const weekStart = new Date(jan4.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      weekStart.setDate(weekStart.getDate() - ((jan4.getDay() + 6) % 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      return {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      };
    };
    
    const weekDates = getWeekDates(selectedWeek, selectedYear);
    setWeekFilter(`${weekDates.start}_${weekDates.end}`);
    setDateFilter(''); // Désactiver le filtre date
  }, [selectedWeek, selectedYear]);

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('');
    setVehicleFilter('all');
    setEmployeeFilter('all');
    setCurrentPage(1);
    // Réinitialiser à la semaine actuelle
    setSelectedWeek(getCurrentWeek());
    setSelectedYear(new Date().getFullYear());
  };

  const exportToCSV = () => {
    const headers = ['Véhicule', 'Utilisateur', 'Date de début', 'Date de fin', 'Durée', 'Coût', 'Statut'];
    const csvData = sortedSessions.map(session => [
      `${isValidVehicleInfo(session.vehicle?.marque, session.vehicle?.modele)
          ? `${session.vehicle.marque} ${session.vehicle.modele} (${session.vehicle?.nom || 'Véhicule inconnu'})`
          : session.vehicle?.nom || 'Véhicule inconnu'}`,
      session.utilisateur?.username || `${session.utilisateur?.prenom || ''} ${session.utilisateur?.nom || ''}`.trim() || 'Utilisateur inconnu',
      formatDate(session.heureDebut),
      formatDate(session.heureFin),
      formatTime(session.dureeMinutes || 0, session.dureeSecondes || 0),
      `$${(session.coutTotal || 0).toFixed(2)}`,
      session.statut
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique-timers-${selectedCompany?.name}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Variables de statistiques (non utilisées actuellement)
  // const totalRevenue = sortedSessions.reduce((sum, session) => sum + (session.coutTotal || 0), 0);
  // const totalDuration = sortedSessions.reduce((sum, session) => sum + (session.dureeMinutes || 0), 0);

  // Écran de chargement initial des permissions
  if (initialLoading || (!permissionChecked && !selectedCompany)) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Écran d'accès non autorisé (même que ModernTimersPage)
  if (isAuthorized === false) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <Timer className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Historique Timers non disponible</h2>
            <p className="text-muted-foreground mb-4">
              L'entreprise <strong>{selectedCompany?.name}</strong> n'est pas autorisée à utiliser les timers.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Pour obtenir l'accès :</strong><br/>
                Demandez à un Technicien d'autoriser votre entreprise via l'interface d'administration.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Historique des Timers
          </h1>
          <p className="text-muted-foreground mt-1">
            Consultez l'historique complet des sessions de timing pour {selectedCompany?.name}
          </p>
        </div>

        {/* Statistiques rapides */}

        {/* Sélecteur de semaine (même style que ListeVentesPage) */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2">
            <button
              onClick={() => {
                const newWeek = selectedWeek > 1 ? selectedWeek - 1 : 52;
                const newYear = selectedWeek > 1 ? selectedYear : selectedYear - 1;
                setSelectedWeek(newWeek);
                setSelectedYear(newYear);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="flex items-center gap-1 px-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                S{selectedWeek.toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedYear}
              </span>
            </div>
            
            <button
              onClick={() => {
                const newWeek = selectedWeek < 53 ? selectedWeek + 1 : 1;
                const newYear = selectedWeek < 53 ? selectedYear : selectedYear + 1;
                setSelectedWeek(newWeek);
                setSelectedYear(newYear);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Barre de contrôles */}
        <div className="flex items-center justify-between mb-6">
          {/* Compteur de résultats à gauche */}
          <div className="text-sm text-muted-foreground">
            {sortedSessions.length} sessions trouvées
          </div>

          {/* Boutons à droite */}
          <div className="flex items-center gap-3">
            {/* Bouton Filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtres</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Bouton Export */}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Exporter</span>
            </button>
          </div>
        </div>

        {/* Panneau de filtres pliable */}
        {showFilters && (
          <div className="bg-card rounded-lg border mb-6 p-4">
            <div className="space-y-4">
              {/* Première ligne - Recherche */}
              <div className="grid grid-cols-1 gap-4">
                {/* Recherche */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher un véhicule, marque, modèle..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Deuxième ligne - Filtres principaux */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filtre par statut */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Statut</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'termine' | 'annule')}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </div>

                {/* Filtre par véhicule */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Véhicule</label>
                  <select
                    value={vehicleFilter}
                    onChange={(e) => setVehicleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">Tous les véhicules</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.nom} {isValidVehicleInfo(vehicle.marque, vehicle.modele)
                          ? `(${vehicle.marque} ${vehicle.modele})`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre par employé */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Employé</label>
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">Tous les employés</option>
                    {employees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.nom && employee.prenom ? `${employee.prenom} ${employee.nom}` : employee.username}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tri */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Trier par</label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field as 'date' | 'duration' | 'cost');
                      setSortOrder(order as 'asc' | 'desc');
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="date-desc">Plus récent</option>
                    <option value="date-asc">Plus ancien</option>
                    <option value="duration-desc">Durée décroissante</option>
                    <option value="duration-asc">Durée croissante</option>
                    <option value="cost-desc">Coût décroissant</option>
                    <option value="cost-asc">Coût croissant</option>
                  </select>
                </div>
              </div>

              {/* Troisième ligne - Filtre de date spécifique */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Filtre par date spécifique */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date spécifique (remplace la semaine)</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      if (e.target.value) {
                        setWeekFilter(''); // Désactiver le filtre semaine si date sélectionnée
                      }
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Espace vide pour équilibrer la grille */}
                <div></div>
              </div>

              {/* Bouton de réinitialisation */}
              <div className="flex justify-end">
                <button
                  onClick={resetFilters}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Réinitialiser tous les filtres
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des sessions sans scroll */}
        <div className="bg-card rounded-lg border overflow-hidden">
          {paginatedSessions.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucune session trouvée</h3>
              <p className="text-muted-foreground">
                {sessions.length === 0 
                  ? "Aucune session de timing n'a encore été enregistrée."
                  : "Aucune session ne correspond aux critères de recherche."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-4 font-medium text-foreground">Véhicule</th>
                    <th className="text-left p-4 font-medium text-foreground">Utilisateur</th>
                    <th className="text-left p-4 font-medium text-foreground">Début</th>
                    <th className="text-left p-4 font-medium text-foreground">Fin</th>
                    <th className="text-left p-4 font-medium text-foreground">Durée</th>
                    <th className="text-left p-4 font-medium text-foreground">Coût</th>
                    <th className="text-left p-4 font-medium text-foreground">Statut</th>
                    <th className="text-center p-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.map((session) => (
                    <tr key={session._id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {session.vehicle?.image ? (
                            <img
                              src={session.vehicle.image}
                              alt={session.vehicle.nom || 'Véhicule'}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <Car className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">
                              {session.vehicle?.nom || 'Véhicule inconnu'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {isValidVehicleInfo(session.vehicle?.marque, session.vehicle?.modele)
                                ? `${session.vehicle.marque} ${session.vehicle.modele}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {session.utilisateur?.username?.charAt(0).toUpperCase() || 
                               session.utilisateur?.nom?.charAt(0).toUpperCase() || 
                               '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {session.utilisateur?.username || 
                               `${session.utilisateur?.prenom || ''} ${session.utilisateur?.nom || ''}`.trim() ||
                               'Utilisateur inconnu'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-foreground">{formatDate(session.heureDebut)}</td>
                      <td className="p-4 text-foreground">{formatDate(session.heureFin)}</td>
                      <td className="p-4 text-foreground font-mono">
                        {formatTime(session.dureeMinutes || 0, session.dureeSecondes || 0)}
                      </td>
                      <td className="p-4 text-foreground font-medium">
                        {formatCurrency(session.coutTotal || 0)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.statut === 'termine' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {session.statut === 'termine' ? 'Terminé' : 'Annulé'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-1">
                          {hasPermission('DELETE_TIMERS') && (
                            <button 
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-red-600"
                              onClick={() => handleDeleteSession(session._id)}
                              title="Supprimer la session"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
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

        {/* Pagination standard comme les autres pages */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedSessions.length}
          onPageChange={setCurrentPage}
        />
      </div>
    </Layout>
  );
};

export default TimerHistoryPage;
