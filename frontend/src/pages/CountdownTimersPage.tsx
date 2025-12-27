import React, { useState, useEffect } from 'react';
import { Timer, Plus, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import CountdownTimerModal from '../components/CountdownTimerModal';
import CountdownTimerCard from '../components/CountdownTimerCard';
import { useCompany } from '../contexts/CompanyContext';
// import { useUserPermissions } from '../hooks/useUserPermissions'; // Non utilisé pour l'instant
import { useAuth } from '../contexts/AuthContext';
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

interface CountdownSession {
  _id: string;
  vehicle: Vehicle;
  durationMinutes: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  statut: 'en_cours' | 'pause' | 'termine' | 'expire';
  heureDebut: string;
  coutCalcule: number;
  pausesTotales: number;
  utilisateur: {
    _id: string;
    username: string;
    nom?: string;
    prenom?: string;
  };
}

const CountdownTimersPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sessions, setSessions] = useState<CountdownSession[]>([]);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  const { selectedCompany } = useCompany();
  // const { hasPermission } = useUserPermissions(); // Non utilisé pour l'instant
  const { user } = useAuth();

  // États pour les permissions
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);

  // Vérifier les permissions timer
  useEffect(() => {
    const checkTimerPermissions = async () => {
      if (!selectedCompany || !user) {
        setPermissionChecked(true);
        return;
      }
      
      if (user.systemRole === 'Technicien') {
        setIsAuthorized(true);
        setPermissionChecked(true);
        return;
      }

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
          setIsAuthorized(data.hasPermission);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        setIsAuthorized(false);
      } finally {
        setPermissionChecked(true);
      }
    };

    checkTimerPermissions();
  }, [selectedCompany, user]);

  // Charger les véhicules
  useEffect(() => {
    if (selectedCompany && isAuthorized && permissionChecked) {
      loadVehicles();
      loadSessions();
    }
  }, [selectedCompany, isAuthorized, permissionChecked]);

  const loadVehicles = async () => {
    if (!selectedCompany) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/vehicles/${selectedCompany._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des véhicules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    if (!selectedCompany) return;

    try {
      // Pour l'instant, utilisons des données de test car l'API n'existe pas encore
      // const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      // const token = localStorage.getItem('token');
      
      const testSessions: CountdownSession[] = [
        {
          _id: 'session1',
          vehicle: vehicles[0] || {
            _id: 'v1',
            nom: 'Sultan Test',
            marque: 'Karin',
            modele: 'Sultan',
            plaque: 'TEST-001',
            tarifParMinute: 2.5,
            stats: { totalSessions: 0, totalMinutes: 0, totalRevenu: 0 }
          },
          durationMinutes: 5,
          remainingSeconds: 180, // 3 minutes restantes
          elapsedSeconds: 120, // 2 minutes écoulées
          statut: 'en_cours',
          heureDebut: new Date().toISOString(),
          coutCalcule: 5.0,
          pausesTotales: 0,
          utilisateur: {
            _id: user?._id || 'user1',
            username: user?.username || 'test',
            nom: 'Test',
            prenom: 'User'
          }
        }
      ];

      // Utiliser les données de test pour l'instant
      setSessions(testSessions);
    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
    }
  };

  const handleStartTimer = async (durationMinutes: number) => {
    if (!selectedVehicle || !selectedCompany) return;

    try {
      // Pour l'instant, créer une session de test
      const newSession: CountdownSession = {
        _id: `session_${Date.now()}`,
        vehicle: selectedVehicle,
        durationMinutes,
        remainingSeconds: durationMinutes * 60,
        elapsedSeconds: 0,
        statut: 'en_cours',
        heureDebut: new Date().toISOString(),
        coutCalcule: 0,
        pausesTotales: 0,
        utilisateur: {
          _id: user?._id || 'user1',
          username: user?.username || 'test',
          nom: 'Test',
          prenom: 'User'
        }
      };

      setSessions(prev => [...prev, newSession]);
      toast.success(`Timer de ${durationMinutes} minutes démarré pour ${selectedVehicle.nom}`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du démarrage du timer');
    }
  };

  const handlePauseTimer = async (sessionId: string) => {
    setSessions(prev => prev.map(session => 
      session._id === sessionId 
        ? { ...session, statut: 'pause' as const }
        : session
    ));
    toast.success('Timer mis en pause');
  };

  const handleResumeTimer = async (sessionId: string) => {
    setSessions(prev => prev.map(session => 
      session._id === sessionId 
        ? { ...session, statut: 'en_cours' as const }
        : session
    ));
    toast.success('Timer repris');
  };

  const handleStopTimer = async (sessionId: string) => {
    const session = sessions.find(s => s._id === sessionId);
    if (!session) return;

    const elapsedMinutes = session.elapsedSeconds / 60;
    const finalCost = elapsedMinutes * session.vehicle.tarifParMinute;

    setSessions(prev => prev.filter(s => s._id !== sessionId));
    toast.success(`Timer arrêté. Coût final: ${finalCost.toFixed(2)}€`);
  };

  const handleTimerExpired = async (sessionId: string) => {
    const session = sessions.find(s => s._id === sessionId);
    if (!session) return;

    const finalCost = session.durationMinutes * session.vehicle.tarifParMinute;
    
    setSessions(prev => prev.map(s => 
      s._id === sessionId 
        ? { ...s, statut: 'expire' as const, remainingSeconds: 0 }
        : s
    ));
    
    toast.error(`Timer expiré pour ${session.vehicle.nom}! Coût: ${finalCost.toFixed(2)}€`);
  };

  const openTimerModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowTimerModal(true);
  };

  // Calculer les statistiques
  const activeSessions = sessions.filter(s => s.statut === 'en_cours' || s.statut === 'pause');
  const totalActiveRevenue = activeSessions.reduce((sum, session) => {
    const elapsedMinutes = session.elapsedSeconds / 60;
    return sum + (elapsedMinutes * session.vehicle.tarifParMinute);
  }, 0);

  if (!permissionChecked) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!isAuthorized) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Timer className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Timers non disponibles</h2>
          <p className="text-muted-foreground mb-4">
            L'entreprise <strong>{selectedCompany?.name}</strong> n'est pas autorisée à utiliser les timers.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Timer className="w-8 h-8 text-primary" />
            Timers avec Décompte
          </h1>
          <p className="text-muted-foreground">
            Gérez vos sessions de timing avec décompte et calcul en temps réel
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Sessions actives</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{activeSessions.length}</p>
          </div>
          
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Revenus en cours</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalActiveRevenue.toFixed(2)}€</p>
          </div>
          
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Véhicules disponibles</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{vehicles.length}</p>
          </div>
        </div>

        {/* Sessions actives */}
        {activeSessions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Sessions en cours</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeSessions.map((session) => (
                <CountdownTimerCard
                  key={session._id}
                  session={session}
                  onPause={handlePauseTimer}
                  onResume={handleResumeTimer}
                  onStop={handleStopTimer}
                  onExpired={handleTimerExpired}
                />
              ))}
            </div>
          </div>
        )}

        {/* Véhicules disponibles */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Démarrer un nouveau timer</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun véhicule disponible</h3>
              <p className="text-muted-foreground">
                Ajoutez des véhicules pour pouvoir démarrer des timers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle._id}
                  className="bg-card rounded-lg border border-border p-4 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => openTimerModal(vehicle)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {vehicle.image ? (
                      <img
                        src={vehicle.image}
                        alt={vehicle.nom}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Timer className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{vehicle.nom}</h3>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.marque} {vehicle.modele}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {vehicle.tarifParMinute}€
                      </div>
                      <div className="text-xs text-muted-foreground">par minute</div>
                    </div>
                  </div>
                  
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" />
                    Démarrer Timer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de configuration du timer */}
        {showTimerModal && selectedVehicle && (
          <CountdownTimerModal
            isOpen={showTimerModal}
            onClose={() => {
              setShowTimerModal(false);
              setSelectedVehicle(null);
            }}
            vehicle={selectedVehicle}
            onStartTimer={handleStartTimer}
          />
        )}
      </div>
    </Layout>
  );
};

export default CountdownTimersPage;
