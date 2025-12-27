import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, Activity, Edit2, Trash2, Settings, X, Save, ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { useCompany } from '../contexts/CompanyContext';
import { useService } from '../contexts/ServiceContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

interface ServiceSession {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  };
  company: string;
  startTime: string;
  endTime?: string;
  duration: number;
  isActive: boolean;
  currentDuration?: number;
}

interface UserStats {
  userId: string;
  userName: string;
  totalSessions: number;
  totalHours: number;
  averageSessionMinutes: number;
}

const ServiceMonitoringPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { isInService } = useService(); // Écouter les changements de statut
  const { hasPermission } = useUserPermissions();
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ServiceSession[]>([]);
  const [sessionHistory, setSessionHistory] = useState<ServiceSession[]>([]);
  const [userStats, setUserStats] = useState<Map<string, UserStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(false);
  
  // Vérifier si l'utilisateur peut gérer les sessions de service
  const canManageServiceSessions = user?.systemRole === 'Technicien' || hasPermission('MANAGE_SERVICE_SESSIONS');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  // Système de semaine (comme BilanPage)
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
  
  // Modal de gestion des sessions
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; userName: string } | null>(null);
  const [editingSession, setEditingSession] = useState<ServiceSession | null>(null);

  // Formater la durée en heures et minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  // Vérifier si un utilisateur est en service
  const isUserInService = (userId: string) => {
    return activeSessions.some(session => session.user._id === userId);
  };

  // Charger les sessions actives
  const loadActiveSessions = async () => {
    if (!selectedCompany || isLoadingRef.current) return;

    isLoadingRef.current = true;
    try {
      const response = await api.get(`/service-sessions/active/${selectedCompany._id}`);
      
      if (response.data.success) {
        setActiveSessions(response.data.sessions);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des sessions actives:', error);
      toast.error('Erreur lors du chargement des sessions actives');
    } finally {
      isLoadingRef.current = false;
    }
  };

  // Calculer les dates de début et fin de la semaine sélectionnée
  const getWeekDates = () => {
    // Calculer le premier jour de la semaine sélectionnée
    const simple = new Date(selectedYear, 0, 1 + (selectedWeek - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    const startOfWeek = new Date(ISOweekStart);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { startOfWeek, endOfWeek };
  };

  // Charger l'historique des sessions pour la semaine sélectionnée
  const loadSessionHistory = async () => {
    if (!selectedCompany) return;

    try {
      const { startOfWeek, endOfWeek } = getWeekDates();
      
      const response = await api.get(`/service-sessions/history/${selectedCompany._id}`, {
        params: { 
          limit: 1000,
          startDate: startOfWeek.toISOString(),
          endDate: endOfWeek.toISOString()
        }
      });
      
      if (response.data.success) {
        setSessionHistory(response.data.sessions);
        calculateUserStats(response.data.sessions);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement de l\'historique:', error);
    }
  };

  // Supprimer une session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) return;

    try {
      const response = await api.delete(`/service-sessions/${sessionId}`);
      
      if (response.data.success) {
        toast.success('✅ Session supprimée avec succès');
        loadSessionHistory();
        loadActiveSessions();
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Ouvrir la modal de gestion des sessions d'un utilisateur
  const handleManageSessions = (userId: string, userName: string) => {
    setSelectedUser({ userId, userName });
    setShowModal(true);
  };

  // Modifier une session
  const handleEditSession = (session: ServiceSession) => {
    setEditingSession(session);
  };

  // Sauvegarder la modification
  const handleSaveEdit = async () => {
    if (!editingSession) return;

    try {
      const response = await api.put(`/service-sessions/${editingSession._id}`, {
        startTime: editingSession.startTime,
        endTime: editingSession.endTime
      });

      if (response.data.success) {
        toast.success('✅ Session modifiée avec succès');
        setEditingSession(null);
        loadSessionHistory();
        loadActiveSessions();
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la modification:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  // Annuler l'édition
  const handleCancelEdit = () => {
    setEditingSession(null);
  };

  // Calculer les statistiques par utilisateur
  const calculateUserStats = (sessions: ServiceSession[]) => {
    const statsMap = new Map<string, UserStats>();

    sessions.forEach(session => {
      const userId = session.user._id;
      const userName = `${session.user.firstName} ${session.user.lastName}`;

      if (!statsMap.has(userId)) {
        statsMap.set(userId, {
          userId,
          userName,
          totalSessions: 0,
          totalHours: 0,
          averageSessionMinutes: 0
        });
      }

      const stats = statsMap.get(userId)!;
      stats.totalSessions++;
      stats.totalHours += session.duration / 60;
    });

    // Calculer les moyennes
    statsMap.forEach(stats => {
      const totalMinutes = stats.totalHours * 60;
      stats.averageSessionMinutes = Math.round(totalMinutes / stats.totalSessions);
      stats.totalHours = Math.round(stats.totalHours * 100) / 100;
    });

    setUserStats(statsMap);
  };

  // Charger les données au montage et quand la semaine change
  useEffect(() => {
    if (selectedCompany) {
      setIsLoading(true);
      setCurrentPage(1); // Reset à la page 1 quand on change de semaine
      Promise.all([loadActiveSessions(), loadSessionHistory()])
        .finally(() => setIsLoading(false));
    }
  }, [selectedCompany, selectedWeek, selectedYear]);

  // Rafraîchir les sessions actives toutes les 30 secondes pour mise à jour en temps réel
  useEffect(() => {
    if (!selectedCompany) return;

    const interval = setInterval(() => {
      loadActiveSessions();
    }, 30000); // 30 secondes - optimisé pour production

    return () => clearInterval(interval);
  }, [selectedCompany]);

  // Rafraîchir immédiatement quand le statut de service change
  const lastRefreshRef = useRef<number>(0);
  useEffect(() => {
    if (!selectedCompany) return;
    
    // Éviter les rafraîchissements trop fréquents (minimum 2 secondes entre chaque)
    const now = Date.now();
    if (now - lastRefreshRef.current < 2000) {
      return;
    }
    
    lastRefreshRef.current = now;
    loadActiveSessions();
  }, [isInService, selectedCompany]);

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des données...</p>
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
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Listes des Services</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* En-tête avec sélecteur de semaine */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-8 h-8 text-primary" />
              Listes des Services
            </h1>
            <p className="text-muted-foreground mt-1">
              Suivi en temps réel des employés
            </p>
            {!canManageServiceSessions && (
              <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                <AlertCircle className="w-4 h-4" />
                <span>Vous pouvez consulter les sessions mais pas les modifier</span>
              </div>
            )}
          </div>
          
          {/* Sélecteur de semaine */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <button
              onClick={() => {
                const newWeek = selectedWeek > 1 ? selectedWeek - 1 : 52;
                const newYear = selectedWeek > 1 ? selectedYear : selectedYear - 1;
                setSelectedWeek(newWeek);
                setSelectedYear(newYear);
              }}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            
            <div className="flex items-center gap-1 px-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                S{selectedWeek.toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-muted-foreground">
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
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

      {/* Statistiques par employé */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Statistiques par employé
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sessions totales
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Heures totales
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Durée moyenne
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {Array.from(userStats.values())
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((stats) => {
                const inService = isUserInService(stats.userId);
                const userSessions = sessionHistory.filter(s => s.user._id === stats.userId);
                
                return (
                  <tr key={stats.userId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {inService ? (
                          <div className="relative">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                          </div>
                        ) : (
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-foreground">
                        {stats.userName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {stats.totalSessions}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground font-medium">
                        {stats.totalHours}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {formatDuration(stats.averageSessionMinutes)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleManageSessions(stats.userId, stats.userName)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2 ml-auto"
                      >
                        <Settings className="w-4 h-4" />
                        Gérer ({userSessions.length})
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {userStats.size > itemsPerPage && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, userStats.size)} sur {userStats.size} employés
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>
              {Array.from({ length: Math.ceil(userStats.size / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-primary text-white'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === Math.ceil(userStats.size / itemsPerPage)}
                className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de gestion des sessions */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary" />
                Sessions de {selectedUser.userName}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                  setEditingSession(null);
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {sessionHistory
                  .filter(s => s.user._id === selectedUser.userId)
                  .map((session) => (
                    <div
                      key={session._id}
                      className="bg-muted/30 border border-border rounded-lg p-4"
                    >
                      {editingSession?._id === session._id ? (
                        // Mode édition
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Date et heure de début
                              </label>
                              <input
                                type="datetime-local"
                                value={new Date(editingSession.startTime).toISOString().slice(0, 16)}
                                onChange={(e) => setEditingSession({
                                  ...editingSession,
                                  startTime: new Date(e.target.value).toISOString()
                                })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Date et heure de fin
                              </label>
                              <input
                                type="datetime-local"
                                value={editingSession.endTime ? new Date(editingSession.endTime).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setEditingSession({
                                  ...editingSession,
                                  endTime: new Date(e.target.value).toISOString()
                                })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              Sauvegarder
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Mode affichage
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-xs text-muted-foreground">Début:</span>
                                <p className="text-sm font-medium text-foreground">
                                  {new Date(session.startTime).toLocaleString('fr-FR')}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Fin:</span>
                                <p className="text-sm font-medium text-foreground">
                                  {session.endTime ? new Date(session.endTime).toLocaleString('fr-FR') : 'En cours'}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Durée:</span>
                                <p className="text-sm font-medium text-foreground">
                                  {formatDuration(session.duration || 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                          {canManageServiceSessions && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditSession(session)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
                                    handleDeleteSession(session._id);
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default ServiceMonitoringPage;
