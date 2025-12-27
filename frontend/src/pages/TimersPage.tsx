import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Timer, 
  Car,
  Clock,
  DollarSign,
  Trash2,
  Edit3,
  X,
  ChevronDown
} from 'lucide-react';

import Layout from '../components/Layout';
import TimerPrestationModal from '../components/TimerPrestationModal';
import { useCompany } from '../contexts/CompanyContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import TimerCartService from '../services/timerCartService';
import toast from 'react-hot-toast';

interface TimerPrestation {
  _id: string;
  nom: string;
  description?: string;
  tarifParMinute: number;
  couleur: string;
  icone: string;
  company: string;
  isActive: boolean;
}

interface TimerSession {
  _id: string;
  timerPrestation: TimerPrestation;
  vehiculePlaque: string;
  vehiculeInfo?: any;
  heureDebut: string;
  heureFin?: string;
  dureeMinutes: number;
  coutCalcule: number;
  statut: 'en_cours' | 'termine' | 'pause' | 'annule';
  partenariat: string;
  notes?: string;
  pausesTotales: number;
}

const TimersPage: React.FC = () => {
  const [prestations, setPrestations] = useState<TimerPrestation[]>([]);
  const [sessions, setSessions] = useState<TimerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrestation, setEditingPrestation] = useState<TimerPrestation | null>(null);
  const [selectedPartnership, setSelectedPartnership] = useState('Aucun partenaire');
  const [partenariats, setPartenariats] = useState<any[]>([]);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);


  // États pour les timers en cours
  const [activeTimers, setActiveTimers] = useState<{ [key: string]: number }>({});

  const { selectedCompany } = useCompany();
  const { hasPermission } = useUserPermissions();

  // Charger les données
  useEffect(() => {
    if (selectedCompany) {
      loadPrestations();
      loadSessions();
      loadPartenariats();
    }
  }, [selectedCompany]);

  // Mettre à jour les timers actifs chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prevSessions => 
        prevSessions.map(session => {
          if (session.statut === 'en_cours') {
            const now = new Date();
            const debut = new Date(session.heureDebut);
            const dureeMinutes = Math.floor((now.getTime() - debut.getTime()) / (1000 * 60));
            const dureeEffective = Math.max(0, dureeMinutes - session.pausesTotales);
            
            setActiveTimers(prev => ({
              ...prev,
              [session._id]: dureeEffective
            }));

            return {
              ...session,
              dureeMinutes: dureeEffective,
              coutCalcule: session.timerPrestation.tarifParMinute * dureeEffective
            };
          }
          return session;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [sessions]);

  const loadPrestations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL ;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timers/prestations/${selectedCompany?._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPrestations(data.prestations || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des prestations timer:', error);
      toast.error('Erreur lors du chargement des prestations timer');
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
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
      toast.error('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadPartenariats = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/partenariats?companyId=${selectedCompany?._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPartenariats(data.partenariats || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des partenariats:', error);
    }
  };

  const fetchVehicleInfo = async (plate: string) => {
    if (!plate.trim()) {
      setVehicleInfo(null);
      return;
    }

    try {
      setLoadingVehicle(true);
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/vehicles/search/${encodeURIComponent(plate)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setVehicleInfo(result.data);
          toast.success(`Véhicule trouvé: ${result.data.model}`);
        } else {
          setVehicleInfo(null);
        }
      } else if (response.status === 404) {
        // Mode test pour développement
        if (plate.toLowerCase().includes('test') || plate === '1234AB01') {
          const testData = {
            id: 1,
            model: "blista",
            name: "Blista",
            plate: plate,
            owner: { id: 1, name: "John Doe", type: 1 }
          };
          setVehicleInfo(testData);
          toast.success(`Véhicule test trouvé: ${testData.name}`);
        } else {
          setVehicleInfo(null);
          toast.error(`Véhicule non trouvé. Essayez "TEST" pour tester.`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la recherche du véhicule:', error);
      setVehicleInfo(null);
      toast.error('Erreur lors de la recherche du véhicule');
    } finally {
      setLoadingVehicle(false);
    }
  };

  const handleStartTimer = async (prestationId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timers/sessions/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timerPrestationId: prestationId,
          vehiculePlaque: vehiclePlate,
          vehiculeInfo: vehicleInfo,
          partenariat: selectedPartnership
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Timer démarré avec succès');
        loadSessions();
        // Réinitialiser les infos véhicule
        setVehiclePlate('');
        setVehicleInfo(null);
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
        body: JSON.stringify({ quantite: 1 })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Timer arrêté avec succès');
        loadSessions();
        
        // Créer un item formaté pour le panier
        const timerCartItem = TimerCartService.convertTimerToCartItem(data.itemPanier);
        
        // Afficher les détails du timer terminé
        const formattedDisplay = TimerCartService.formatTimerForDisplay(timerCartItem);
        toast.success(`Timer terminé: ${formattedDisplay} - Coût: ${formatCurrency(timerCartItem.price)}`);
        
        
      } else {
        toast.error(data.error || 'Erreur lors de l\'arrêt du timer');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'arrêt du timer');
    }
  };

  const handleDeletePrestation = async (prestationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette prestation timer ?')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timers/prestations/${prestationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Prestation timer supprimée avec succès');
        loadPrestations();
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression de la prestation timer');
    }
  };

  const handlePauseResumeTimer = async (sessionId: string, action: 'pause' | 'resume') => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timers/sessions/${sessionId}/pause`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(action === 'pause' ? 'Timer mis en pause' : 'Timer repris');
        loadSessions();
      } else {
        toast.error(data.error || `Erreur lors de la ${action}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(`Erreur lors de la ${action}`);
    }
  };

  const handleCancelTimer = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce timer ?')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timers/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Timer annulé avec succès');
        loadSessions();
      } else {
        toast.error(data.error || 'Erreur lors de l\'annulation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'annulation du timer');
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Timer className="w-6 h-6 text-primary" />
              Timers
            </h1>
            <p className="text-muted-foreground">Chronométrage avec tarification automatique</p>
          </div>
          
          {hasPermission('CREATE_PRESTATION_CATEGORIES') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Nouvelle prestation timer
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="bg-card rounded-lg p-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="relative">
              <select
                value={selectedPartnership}
                onChange={(e) => setSelectedPartnership(e.target.value)}
                className="appearance-none bg-background border border-input rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="Aucun partenaire">Aucun partenaire</option>
                {partenariats.filter(p => p.statut === 'actif').map((partenariat) => (
                  <option key={partenariat._id} value={partenariat.nom || partenariat.entreprisePartenaire}>
                    {partenariat.nom || partenariat.entreprisePartenaire}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            </div>

            <div className="relative flex items-center">
              <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Plaque d'immatriculation"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                onBlur={() => fetchVehicleInfo(vehiclePlate)}
                onKeyPress={(e) => e.key === 'Enter' && fetchVehicleInfo(vehiclePlate)}
                className="pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground w-48"
              />
              {loadingVehicle && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>

          {/* Affichage des informations du véhicule */}
          {vehicleInfo && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Véhicule sélectionné
                  </h3>
                  <div className="flex gap-6 text-sm text-blue-700 dark:text-blue-300 mt-1">
                    <span>Modèle: <strong>{vehicleInfo.model}</strong></span>
                    <span>Plaque: <strong>{vehicleInfo.plate}</strong></span>
                    {vehicleInfo.owner && (
                      <span>Propriétaire: <strong>{vehicleInfo.owner.name}</strong></span>
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
        </div>

        {/* Sessions actives */}
        {sessions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              Sessions actives ({sessions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <div key={session._id} className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{session.timerPrestation.nom}</h3>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      session.statut === 'en_cours' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {session.statut === 'en_cours' ? 'En cours' : 'En pause'}
                    </div>
                  </div>

                  {session.vehiculePlaque && (
                    <div className="text-sm text-muted-foreground mb-2">
                      <Car className="w-4 h-4 inline mr-1" />
                      {session.vehiculePlaque}
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Durée:</span>
                      <span className="font-mono text-lg font-bold text-primary">
                        {formatTime(activeTimers[session._id] || session.dureeMinutes)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tarif/min:</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(session.timerPrestation.tarifParMinute)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Coût actuel:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(session.coutCalcule)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {session.statut === 'en_cours' ? (
                      <button
                        onClick={() => handlePauseResumeTimer(session._id, 'pause')}
                        className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded text-sm hover:bg-yellow-600 flex items-center justify-center gap-1"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePauseResumeTimer(session._id, 'resume')}
                        className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 flex items-center justify-center gap-1"
                      >
                        <Play className="w-4 h-4" />
                        Reprendre
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleStopTimer(session._id)}
                      className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 flex items-center justify-center gap-1"
                    >
                      <Square className="w-4 h-4" />
                      Arrêter
                    </button>
                    
                    <button
                      onClick={() => handleCancelTimer(session._id)}
                      className="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prestations timer disponibles */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Prestations timer disponibles
          </h2>
          
          {prestations.length === 0 ? (
            <div className="text-center py-12">
              <Timer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucune prestation timer</h3>
              <p className="text-muted-foreground mb-4">
                Créez votre première prestation timer pour commencer à chronométrer
              </p>
              {hasPermission('CREATE_PRESTATION_CATEGORIES') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 mx-auto hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Créer votre première prestation timer
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prestations.map((prestation) => (
                <div key={prestation._id} className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{prestation.nom}</h3>
                    {hasPermission('CREATE_PRESTATION_CATEGORIES') && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingPrestation(prestation)}
                          className="text-muted-foreground hover:text-foreground p-1"
                          title="Modifier cette prestation"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePrestation(prestation._id)}
                          className="text-muted-foreground hover:text-red-500 p-1"
                          title="Supprimer cette prestation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {prestation.description && (
                    <p className="text-sm text-muted-foreground mb-3">{prestation.description}</p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Tarif/min:</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(prestation.tarifParMinute)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleStartTimer(prestation._id)}
                    className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90"
                  >
                    <Play className="w-4 h-4" />
                    Démarrer le timer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de création/édition */}
        <TimerPrestationModal
          isOpen={showCreateModal || !!editingPrestation}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPrestation(null);
          }}
          onSuccess={() => {
            loadPrestations();
          }}
          prestation={editingPrestation}
          companyId={selectedCompany?._id || ''}
        />
      </div>
    </Layout>
  );
};

export default TimersPage;
