import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Plus, 
  Timer, 
  Car,
  Clock,
  DollarSign,
  Trash2,
  Edit3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

import Layout from '../components/Layout';
import VehicleModal from '../components/VehicleModal';
import { useAuth } from '../contexts/AuthContext';
import { useService } from '../contexts/ServiceContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { useCompany } from '../contexts/CompanyContext';
import { alertService } from '../services/alertService';
import toast from 'react-hot-toast';

interface Vehicle {
  _id: string;
  nom: string;
  marque: string;
  modele: string;
  plaque: string;
  couleur?: string;
  annee?: number;
  image?: string;
  description?: string;
  tarifParMinute: number;
  proprietaire?: {
    nom?: string;
    telephone?: string;
    email?: string;
  };
  stats: {
    totalSessions: number;
    totalMinutes: number;
    totalRevenu: number;
    dernierUtilisation?: string;
  };
}

interface TimerSession {
  _id: string;
  vehicle: Vehicle;
  heureDebut: string;
  heureFin?: string;
  dureeMinutes: number;
  dureeSecondes?: number; // Ajouté pour le chronométrage précis
  coutCalcule: number;
  statut: 'en_cours' | 'termine' | 'pause' | 'annule' | 'expire';
  partenariat: string;
  notes?: string;
  pausesTotales: number;
  utilisateur: {
    _id: string;
    username: string;
    nom?: string;
    prenom?: string;
  };
  // Nouveaux champs pour le décompte
  durationMinutes?: number; // Durée totale définie (si mode décompte)
  remainingSeconds?: number; // Temps restant en secondes
  isCountdown?: boolean; // Mode décompte activé
}

const ModernTimersPage: React.FC = () => {
  const { isInService, isLoading: serviceLoading } = useService();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sessions, setSessions] = useState<TimerSession[]>([]);
  // const [loading, setLoading] = useState(true); // Supprimé car non utilisé
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedPartnership] = useState('Aucun partenaire');
  
  // États pour le timer avec décompte
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedVehicleForTimer, setSelectedVehicleForTimer] = useState<Vehicle | null>(null);
  const [timerDuration, setTimerDuration] = useState(5); // durée en minutes
  
  // État local pour les sessions en mode décompte
  const [countdownSessions, setCountdownSessions] = useState<{[sessionId: string]: {durationMinutes: number, remainingSeconds: number, expiredAt?: number}}>({});

  const { selectedCompany } = useCompany();
  const { hasPermission } = useUserPermissions();
  const { user } = useAuth();

  // États pour les permissions
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Sauvegarder l'état des timers expirés dans localStorage
  const saveExpiredTimerToStorage = (sessionId: string, timerData: {durationMinutes: number, remainingSeconds: number, expiredAt?: number}) => {
    if (!selectedCompany) return;
    
    try {
      const savedExpiredTimers = localStorage.getItem('expiredTimers');
      const expiredTimers = savedExpiredTimers ? JSON.parse(savedExpiredTimers) : {};
      
      if (!expiredTimers[selectedCompany._id]) {
        expiredTimers[selectedCompany._id] = {};
      }
      
      expiredTimers[selectedCompany._id][sessionId] = timerData;
      localStorage.setItem('expiredTimers', JSON.stringify(expiredTimers));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du timer expiré:', error);
    }
  };

  // Supprimer un timer expiré du localStorage
  const removeExpiredTimerFromStorage = (sessionId: string) => {
    if (!selectedCompany) return;
    
    try {
      const savedExpiredTimers = localStorage.getItem('expiredTimers');
      if (savedExpiredTimers) {
        const expiredTimers = JSON.parse(savedExpiredTimers);
        if (expiredTimers[selectedCompany._id]) {
          delete expiredTimers[selectedCompany._id][sessionId];
          localStorage.setItem('expiredTimers', JSON.stringify(expiredTimers));
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du timer expiré:', error);
    }
  };

  // Charger l'état des timers expirés depuis localStorage au démarrage
  useEffect(() => {
    const savedExpiredTimers = localStorage.getItem('expiredTimers');
    if (savedExpiredTimers && selectedCompany) {
      try {
        const expiredTimers = JSON.parse(savedExpiredTimers);
        const companyExpiredTimers = expiredTimers[selectedCompany._id] || {};
        setCountdownSessions(prev => ({
          ...prev,
          ...companyExpiredTimers
        }));
      } catch (error) {
        console.error('Erreur lors du chargement des timers expirés:', error);
      }
    }
  }, [selectedCompany]);

  // Vérifier les permissions timer
  useEffect(() => {
    const checkTimerPermissions = async () => {
      if (!selectedCompany || !user) {
        setPermissionChecked(true);
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
        } else if (response.status === 404) {
          
          setIsAuthorized(false);
        } else {
          
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('❌ ModernTimersPage - Erreur lors de la vérification:', error);
        setIsAuthorized(false);
      }
      
      // Pour les autres entreprises, on refuse l'accès pour l'instant
      // (En attendant que l'API soit prête)
      setIsAuthorized(false);
      setPermissionChecked(true);
      setInitialLoading(false);
    };
    
    checkTimerPermissions();

    // Écouter les changements d'autorisation (même logique que la Sidebar)
    const handlePermissionChange = (event: any) => {
      
      
      // Vérifier si c'est pour l'entreprise actuellement sélectionnée
      if (event.detail && event.detail.companyId === selectedCompany?._id) {
        
        setIsAuthorized(event.detail.isAuthorized);
        setPermissionChecked(true);
        setInitialLoading(false);
      } else {
        // Sinon, refaire la vérification complète
        
        checkTimerPermissions();
      }
    };

    window.addEventListener('timerPermissionChanged', handlePermissionChange);
    
    return () => {
      window.removeEventListener('timerPermissionChanged', handlePermissionChange);
    };
  }, [selectedCompany, user]);

  // Charger les données
  useEffect(() => {
    if (selectedCompany && isAuthorized && permissionChecked) {
      loadVehicles();
      loadSessions();
    }
  }, [selectedCompany, isAuthorized, permissionChecked]);

  // Mettre à jour les timers actifs chaque seconde
  useEffect(() => {
    // Ne démarrer l'interval que si on a des sessions et qu'on est autorisé
    if (!isAuthorized || !permissionChecked) return;
    
    const interval = setInterval(() => {
      // Mettre à jour le temps côté client en temps réel
      setSessions(prevSessions => 
        prevSessions.map(session => {
          if (session.statut === 'en_cours' || session.statut === 'expire') {
            // Récupérer l'info de countdown depuis l'état actuel
            setCountdownSessions(currentCountdown => {
              const countdownInfo = currentCountdown[session._id];
              
              if (countdownInfo) {
                // Vérifier si ce timer est déjà marqué comme expiré dans le service d'alerte
                const isAlreadyExpired = alertService.hasAlert(session._id);
                
                // Mode décompte - utiliser l'état local
                const newRemainingSeconds = isAlreadyExpired ? 0 : Math.max(0, countdownInfo.remainingSeconds - 1);
                
                // Si le timer expire pour la première fois
                if (newRemainingSeconds === 0 && countdownInfo.remainingSeconds > 0 && !isAlreadyExpired) {
                  // Marquer le moment d'expiration
                  const expiredTimerData = {
                    ...countdownInfo,
                    remainingSeconds: 0,
                    expiredAt: Date.now()
                  };
                  
                  // Sauvegarder dans localStorage pour persistance
                  saveExpiredTimerToStorage(session._id, expiredTimerData);
                  
                  // Démarrer l'alerte sonore globale
                  alertService.startAlert(session._id, session.vehicle.nom);
                  
                  return {
                    ...currentCountdown,
                    [session._id]: expiredTimerData
                  };
                }
                
                // Mettre à jour l'état local seulement si pas encore expiré
                if (newRemainingSeconds > 0) {
                  return {
                    ...currentCountdown,
                    [session._id]: {
                      ...countdownInfo,
                      remainingSeconds: newRemainingSeconds
                    }
                  };
                }
              }
              
              return currentCountdown;
            });
            
            // Récupérer à nouveau pour le calcul (après mise à jour)
            const countdownInfo = countdownSessions[session._id];
            
            if (countdownInfo) {
              const isAlreadyExpired = alertService.hasAlert(session._id);
              const newRemainingSeconds = isAlreadyExpired ? 0 : Math.max(0, countdownInfo.remainingSeconds - 1);
              
              // Calculer le coût pour le mode décompte - figer à la durée max si expiré
              const tempsEcouleMinutes = session.statut === 'expire' 
                ? countdownInfo.durationMinutes 
                : (countdownInfo.durationMinutes * 60 - newRemainingSeconds) / 60;
              const tarifParMinute = session.vehicle?.tarifParMinute || 0;
              const coutCalcule = Math.max(0, tempsEcouleMinutes * tarifParMinute);
              
              return {
                ...session,
                isCountdown: true,
                durationMinutes: countdownInfo.durationMinutes,
                remainingSeconds: (countdownInfo.expiredAt || isAlreadyExpired || session.statut === 'expire') ? 0 : newRemainingSeconds,
                statut: (countdownInfo.expiredAt || isAlreadyExpired || newRemainingSeconds === 0 || session.statut === 'expire') ? 'expire' as const : session.statut,
                coutCalcule: coutCalcule,
                dureeMinutes: session.statut === 'expire' ? countdownInfo.durationMinutes : Math.floor(tempsEcouleMinutes),
                dureeSecondes: session.statut === 'expire' ? 0 : Math.floor((tempsEcouleMinutes % 1) * 60)
              };
            } else {
              // Mode normal (chronométrage) - ne pas mettre à jour si expiré
              if (session.statut === 'expire') {
                return session; // Garder les valeurs existantes
              }
              
              const now = new Date();
              const debut = new Date(session.heureDebut);
              const dureeMs = now.getTime() - debut.getTime();
              const dureeMinutes = Math.floor(dureeMs / (1000 * 60));
              const dureeSecondes = Math.floor((dureeMs % (1000 * 60)) / 1000);
              const dureeEffectiveMinutes = Math.max(0, dureeMinutes - session.pausesTotales);
              
              const tarifParMinute = session.vehicle?.tarifParMinute || 0;
              const coutCalcule = (dureeEffectiveMinutes + dureeSecondes / 60) * tarifParMinute;
              
              return {
                ...session,
                dureeMinutes: dureeEffectiveMinutes,
                dureeSecondes: dureeSecondes,
                coutCalcule: coutCalcule
              };
            }
          }
          return session;
        })
      );
    }, 1000); // Chaque seconde pour un chronométrage précis

    // Nettoyage OBLIGATOIRE quand le composant se démonte ou que les dépendances changent
    return () => {
      clearInterval(interval);
    };
  }, [isAuthorized, permissionChecked, countdownSessions]);

  // Nettoyer les alertes au démontage du composant
  useEffect(() => {
    return () => {
      alertService.clearAllAlerts();
    };
  }, []);

  // Recharger depuis le serveur toutes les 30 secondes pour synchroniser
  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions();
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [selectedCompany]);

  const loadVehicles = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/vehicles/company/${selectedCompany?._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      } else {
        // Mode démo : créer des véhicules factices si l'API n'existe pas
        
        setVehicles([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des véhicules:', error);
      // Mode démo en cas d'erreur
      setVehicles([]);
    }
  };

  const loadSessions = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timers/sessions/active/${selectedCompany?._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Calculer le coût initial pour chaque session et gérer les timers expirés
        const sessionsWithCost = (data.sessions || []).map((session: TimerSession) => {
          if (session.statut === 'en_cours' || session.statut === 'expire') {
            // Vérifier s'il y a un état local de décompte pour cette session
            const localCountdown = countdownSessions[session._id];
            
            if (localCountdown) {
              // Session avec décompte - vérifier si expirée
              const tarifParMinute = session.vehicle?.tarifParMinute || 0;
              const isExpired = localCountdown.expiredAt || session.statut === 'expire';
              const coutCalcule = localCountdown.durationMinutes * tarifParMinute;
              
              return {
                ...session,
                isCountdown: true,
                durationMinutes: localCountdown.durationMinutes,
                remainingSeconds: isExpired ? 0 : localCountdown.remainingSeconds,
                statut: isExpired ? 'expire' as const : session.statut,
                coutCalcule: coutCalcule,
                dureeMinutes: localCountdown.durationMinutes,
                dureeSecondes: 0
              };
            } else if (session.statut === 'en_cours') {
              // Session en cours - calculer normalement
              const now = new Date();
              const debut = new Date(session.heureDebut);
              const dureeMs = now.getTime() - debut.getTime();
              const dureeMinutes = Math.floor(dureeMs / (1000 * 60));
              const dureeSecondes = Math.floor((dureeMs % (1000 * 60)) / 1000);
              const dureeEffectiveMinutes = Math.max(0, dureeMinutes - (session.pausesTotales || 0));
              
              const tarifParMinute = session.vehicle?.tarifParMinute || 0;
              const coutCalcule = (dureeEffectiveMinutes + dureeSecondes / 60) * tarifParMinute;
              
              return {
                ...session,
                dureeMinutes: dureeEffectiveMinutes,
                dureeSecondes: dureeSecondes,
                coutCalcule: coutCalcule
              };
            }
          }
          return session;
        });
        
        setSessions(sessionsWithCost);
      } else {
        // Mode démo : pas de sessions actives
        
        setSessions([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
      // Mode démo en cas d'erreur
      setSessions([]);
    } finally {
      // setLoading(false); // Supprimé car loading n'est plus utilisé
    }
  };


  const openTimerModal = (vehicle: Vehicle) => {
    setSelectedVehicleForTimer(vehicle);
    setShowTimerModal(true);
  };

  const handleStartTimer = async (vehicleId: string, durationMinutes?: number) => {
    // Vérifier si l'utilisateur est en service
    if (!isInService) {
      toast.error('Vous devez être en service pour démarrer un timer');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      // Démarrer le timer normalement côté serveur
      const response = await fetch(`${apiUrl}/api/timers/sessions/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicleId,
          companyId: selectedCompany?._id,
          partenariat: selectedPartnership,
          utilisateur: {
            _id: user?._id,
            username: user?.username,
            firstName: user?.firstName,
            lastName: user?.lastName
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Si c'est un mode décompte, enregistrer dans l'état local
        if (durationMinutes) {
          setCountdownSessions(prev => ({
            ...prev,
            [data.session._id]: {
              durationMinutes: durationMinutes,
              remainingSeconds: durationMinutes * 60
            }
          }));
          toast.success(`Timer décompte de ${durationMinutes} minutes démarré`);
        } else {
          toast.success('Timer démarré avec succès');
        }
        loadSessions();
        setShowTimerModal(false);
      } else {
        toast.error(data.error || 'Erreur lors du démarrage du timer');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du démarrage du timer');
    }
  };

  const handleStopTimer = async (sessionId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timers/sessions/${sessionId}/stop`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          quantite: 1,
          utilisateur: {
            _id: user?._id,
            username: user?.username,
            firstName: user?.firstName,
            lastName: user?.lastName
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const session = sessions.find(s => s._id === sessionId);
        if (session) {
          const cost = data.session.coutCalcule || 0;
          const minutes = data.session.dureeMinutes || 0;
          toast.success(`Timer arrêté! Coût total: $${cost.toFixed(2)} pour ${minutes} minutes`);
        }
        
        // Nettoyer l'état local du décompte
        setCountdownSessions(prev => {
          const newState = { ...prev };
          delete newState[sessionId];
          return newState;
        });
        
        // Supprimer du localStorage
        removeExpiredTimerFromStorage(sessionId);
        
        // Arrêter l'alerte sonore globale
        alertService.stopAlert(sessionId);
        
        loadSessions();
      } else {
        toast.error(data.error || 'Erreur lors de l\'arrêt du timer');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'arrêt du timer');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Véhicule supprimé avec succès');
        loadVehicles();
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression du véhicule');
    }
  };


  const formatTime = (minutes: number, seconds?: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = seconds || 0;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCountdownTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Fonction utilitaire pour vérifier si les données véhicule sont valides
  const isValidVehicleInfo = (marque?: string, modele?: string) => {
    return marque && modele && 
           marque.trim() && modele.trim() &&
           marque !== 'Non spécifié' && modele !== 'Non spécifié' &&
           marque !== '' && modele !== '';
  };


  const isVehicleInUse = (vehicleId: string) => {
    return sessions.some(session => 
      session.vehicle._id === vehicleId && 
      (session.statut === 'en_cours' || session.statut === 'pause' || session.statut === 'expire')
    );
  };

  const hasExpiredTimer = () => {
    return sessions.some(session => session.statut === 'expire');
  };

  if (initialLoading || (!permissionChecked && !selectedCompany)) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (isAuthorized === false) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <Timer className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Timers non disponibles</h2>
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

  return (
    <Layout>
      <div className="p-4">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Timer className="w-6 h-6 text-primary" />
              Timers Modernes
            </h1>
            <p className="text-muted-foreground">Chronométrage avec sélection visuelle des véhicules</p>
          </div>
          
          {(user?.systemRole === 'Technicien' || hasPermission('MANAGE_VEHICLES') || hasPermission('MANAGE_GESTION')) && (
            <button
              onClick={() => setShowVehicleModal(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Nouveau véhicule
            </button>
          )}
        </div>

        {/* Avertissement si pas en service */}
        {!serviceLoading && !isInService && (
          <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Vous n'êtes pas en service
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Vous devez démarrer votre service pour lancer de nouveaux timers. Utilisez le bouton "Démarrer le service" dans la barre latérale.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filtre partenariat */}
      
        {/* Alerte timer expiré */}
        {hasExpiredTimer() && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">Timer expiré - Arrêtez-le avant de continuer</span>
            </div>
          </div>
        )}

        {/* Sessions actives */}
        {sessions.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              Sessions actives ({sessions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {sessions.map((session) => (
                <div key={session._id} className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  {/* En-tête avec icône et nom */}
                  <div className="flex items-center gap-2 mb-2">
                    {session.vehicle.image ? (
                      <img 
                        src={session.vehicle.image} 
                        alt={session.vehicle.nom}
                        className="w-5 h-5 object-cover rounded"
                      />
                    ) : (
                      <Car className="w-5 h-5 text-green-600" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-green-900 dark:text-green-100 truncate">
                        {session.vehicle.nom}
                      </h3>
                      <p className="text-xs text-green-700 dark:text-green-300 truncate">
                        {session.vehicle.plaque}
                      </p>
                    </div>
                  </div>

                  {/* Affichage du temps et coût */}
                  <div className="space-y-2 mb-2">
                    {/* Temps écoulé ou restant */}
                    <div className="text-center">
                      {session.isCountdown ? (
                        <div className="space-y-2">
                          <div className={`text-lg font-mono font-bold text-center ${
                            session.statut === 'expire' 
                              ? 'text-red-600 dark:text-red-400 animate-pulse' 
                              : 'text-green-800 dark:text-green-200'
                          }`}>
                            {session.remainingSeconds !== undefined 
                              ? formatCountdownTime(session.remainingSeconds)
                              : '00:00'
                            }
                          </div>
                          <div className="text-xs text-center text-green-700 dark:text-green-300 hidden">
                            {session.statut === 'expire' ? 'TEMPS ÉCOULÉ!' : 'Temps restant'}
                          </div>
                          {/* Barre de progression améliorée pour décompte */}
                          {session.durationMinutes && session.remainingSeconds !== undefined && (
                            <div className="relative">
                              <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2 overflow-hidden shadow-inner">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                                    session.statut === 'expire' 
                                      ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse' 
                                      : session.remainingSeconds <= 5
                                        ? 'bg-gradient-to-r from-red-400 to-red-600'
                                        : session.remainingSeconds <= 15
                                          ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                                          : 'bg-gradient-to-r from-green-400 to-green-600'
                                  }`}
                                  style={{
                                    width: `${Math.max(0, (session.remainingSeconds / (session.durationMinutes * 60)) * 100)}%`
                                  }}
                                >
                                  <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-lg font-mono font-bold text-center text-green-800 dark:text-green-200">
                            {formatTime(session.dureeMinutes || 0, session.dureeSecondes || 0)}
                          </div>
                          <div className="text-xs text-center text-green-700 dark:text-green-300 hidden">
                            Temps écoulé
                          </div>
                          {/* Barre de progression améliorée pour chronométrage normal */}
                          <div className="relative">
                            <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2 overflow-hidden shadow-inner">
                              <div 
                                className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-1000 ease-out relative"
                                style={{
                                  width: `${Math.min(100, ((session.dureeMinutes || 0) / 60) * 100)}%`
                                }}
                              >
                                <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tarif et coût actuel */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-700 dark:text-green-300">Tarif/min:</span>
                        <span className="text-xs font-semibold text-green-800 dark:text-green-200">
                          ${(session.vehicle?.tarifParMinute || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-700 dark:text-green-300">Coût actuel:</span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          ${(session.coutCalcule || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bouton d'arrêt */}
                  <button
                    onClick={() => handleStopTimer(session._id)}
                    className="w-full bg-green-600 text-white px-2 py-1.5 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-1 font-medium"
                  >
                    <Square className="w-3 h-3" />
                    Arrêter
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Véhicules disponibles */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Véhicules disponibles ({vehicles.length})
          </h2>
          
          {vehicles.length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun véhicule</h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez votre premier véhicule pour commencer à chronométrer
              </p>
              {(user?.systemRole === 'Technicien' || hasPermission('MANAGE_VEHICLES') || hasPermission('MANAGE_GESTION')) && (
                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 mx-auto hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un véhicule
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {vehicles.map((vehicle) => {
                const inUse = isVehicleInUse(vehicle._id);
                return (
                  <div key={vehicle._id} className={`bg-card rounded-lg overflow-hidden border transition-all hover:shadow-lg ${
                    inUse ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-border hover:border-primary'
                  }`}>
                    {/* Image du véhicule */}
                    <div className="relative h-24 bg-muted">
                      {vehicle.image ? (
                        <img 
                          src={vehicle.image} 
                          alt={vehicle.nom}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      {inUse && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                          En cours
                        </div>
                      )}
                      
                      {(user?.systemRole === 'Technicien' || hasPermission('MANAGE_VEHICLES') || hasPermission('MANAGE_GESTION')) && (
                        <div className="absolute top-2 left-2 flex gap-1">
                          <button
                            onClick={() => setEditingVehicle(vehicle)}
                            className="bg-black/50 text-white p-1 rounded hover:bg-black/70"
                            title="Modifier"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(vehicle._id)}
                            className="bg-black/50 text-white p-1 rounded hover:bg-red-500"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Informations du véhicule */}
                    <div className="p-3">
                      <div className="mb-2">
                        <h3 className="font-semibold text-foreground text-sm">{vehicle.nom}</h3>
                        <p className="text-xs text-muted-foreground">
                          {isValidVehicleInfo(vehicle.marque, vehicle.modele) ? `${vehicle.marque} ${vehicle.modele} • ` : ''}{vehicle.plaque}
                        </p>
                        {vehicle.couleur && vehicle.annee && (
                          <p className="text-xs text-muted-foreground">
                            {vehicle.couleur} • {vehicle.annee}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Tarif/min:
                          </span>
                          <span className="text-sm font-semibold text-green-600">
                            ${vehicle.tarifParMinute.toFixed(2)}
                          </span>
                        </div>
                        
                        {vehicle.stats.totalSessions > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Sessions:
                            </span>
                            <span className="text-xs font-medium">
                              {vehicle.stats.totalSessions}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => openTimerModal(vehicle)}
                        disabled={inUse || hasExpiredTimer()}
                        className={`w-full px-3 py-2 rounded text-sm flex items-center justify-center gap-1 font-medium ${
                          inUse || hasExpiredTimer()
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                        title={hasExpiredTimer() ? 'Arrêtez d\'abord les timers expirés' : (inUse ? 'Véhicule en cours d\'utilisation' : 'Démarrer un nouveau timer')}
                      >
                        <Play className="w-3 h-3" />
                        {inUse ? 'En cours' : (hasExpiredTimer() ? 'Timer expiré actif' : 'Démarrer Timer')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de véhicule */}
        <VehicleModal
          isOpen={showVehicleModal || !!editingVehicle}
          onClose={() => {
            setShowVehicleModal(false);
            setEditingVehicle(null);
          }}
          onSuccess={() => {
            loadVehicles();
          }}
          vehicle={editingVehicle}
          companyId={selectedCompany?._id}
        />

        {/* Modal de sélection de durée du timer */}
        {showTimerModal && selectedVehicleForTimer && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg border border-border max-w-md w-full">
              {/* En-tête */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Timer className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Configurer Timer</h2>
                    <p className="text-sm text-muted-foreground">
                      {isValidVehicleInfo(selectedVehicleForTimer.marque, selectedVehicleForTimer.modele)
                        ? `${selectedVehicleForTimer.marque} ${selectedVehicleForTimer.modele} (${selectedVehicleForTimer.nom})`
                        : selectedVehicleForTimer.nom
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTimerModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Corps */}
              <div className="p-6 space-y-6">
                {/* Choix du mode */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Mode de timer
                  </label>
                  <div className="space-y-3">
                    {/* Mode décompte */}
                    <div className="border border-border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="radio"
                          id="countdown"
                          name="timerMode"
                          checked={true}
                          onChange={() => {}}
                          className="text-primary"
                        />
                        <label htmlFor="countdown" className="font-medium text-foreground">
                          Timer avec décompte
                        </label>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Définissez une durée et le timer décomptera jusqu'à 0
                      </p>
                      
                      {/* Durées prédéfinies */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[1, 5, 10, 15, 30, 60].map((duration) => (
                          <button
                            key={duration}
                            onClick={() => setTimerDuration(duration)}
                            className={`p-2 rounded border transition-colors text-center ${
                              timerDuration === duration
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-foreground hover:bg-muted'
                            }`}
                          >
                            <div className="font-medium">{duration}min</div>
                            <div className="text-xs text-muted-foreground">
                              ${(duration * selectedVehicleForTimer.tarifParMinute).toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {/* Durée personnalisée */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={timerDuration}
                          onChange={(e) => setTimerDuration(parseInt(e.target.value) || 1)}
                          min="1"
                          max="1440"
                          className="flex-1 px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="Durée personnalisée"
                        />
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Résumé */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Durée</span>
                    <span className="font-medium text-foreground">{timerDuration} minutes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Coût estimé</span>
                    <span className="font-medium text-primary">
                      ${(timerDuration * selectedVehicleForTimer.tarifParMinute).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Le timer décomptera de {timerDuration}:00 à 00:00
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 border-t border-border">
                <button
                  onClick={() => setShowTimerModal(false)}
                  className="flex-1 px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleStartTimer(selectedVehicleForTimer._id, timerDuration)}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Démarrer Timer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ModernTimersPage;
