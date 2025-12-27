import React, { useState, useEffect } from 'react';
import { Timer, Pause, Play, Square, Clock, DollarSign, AlertTriangle } from 'lucide-react';

interface Vehicle {
  _id: string;
  nom: string;
  marque: string;
  modele: string;
  tarifParMinute: number;
  image?: string;
}

interface CountdownSession {
  _id: string;
  vehicle: Vehicle;
  durationMinutes: number; // Durée totale définie
  remainingSeconds: number; // Temps restant en secondes
  elapsedSeconds: number; // Temps écoulé en secondes
  statut: 'en_cours' | 'pause' | 'termine' | 'expire';
  heureDebut: string;
  coutCalcule: number;
  pausesTotales: number;
}

interface CountdownTimerCardProps {
  session: CountdownSession;
  onPause: (sessionId: string) => void;
  onResume: (sessionId: string) => void;
  onStop: (sessionId: string) => void;
  onExpired: (sessionId: string) => void;
}

const CountdownTimerCard: React.FC<CountdownTimerCardProps> = ({
  session,
  onPause,
  onResume,
  onStop,
  onExpired
}) => {
  // const [currentTime, setCurrentTime] = useState(new Date()); // Non utilisé actuellement
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState(session.remainingSeconds);
  const [localElapsedSeconds, setLocalElapsedSeconds] = useState(session.elapsedSeconds);

  // Mettre à jour le timer chaque seconde
  useEffect(() => {
    if (session.statut !== 'en_cours') return;

    let isMounted = true;

    const interval = setInterval(() => {
      if (!isMounted) return; // Ne pas mettre à jour si le composant est démonté
      
      setLocalRemainingSeconds(prev => {
        const newRemaining = Math.max(0, prev - 1);
        
        // Si le timer expire
        if (newRemaining === 0 && prev > 0) {
          onExpired(session._id);
        }
        
        return newRemaining;
      });

      setLocalElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [session.statut, session._id, onExpired]);

  // Synchroniser avec les props quand elles changent
  useEffect(() => {
    setLocalRemainingSeconds(session.remainingSeconds);
    setLocalElapsedSeconds(session.elapsedSeconds);
  }, [session.remainingSeconds, session.elapsedSeconds]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Calculer le coût en temps réel basé sur le temps écoulé
  const elapsedMinutes = localElapsedSeconds / 60;
  const currentCost = elapsedMinutes * session.vehicle.tarifParMinute;
  
  // Calculer le pourcentage de progression
  const totalSeconds = session.durationMinutes * 60;
  const progressPercentage = ((totalSeconds - localRemainingSeconds) / totalSeconds) * 100;

  // Déterminer la couleur selon le temps restant
  const getTimeColor = () => {
    const remainingPercentage = (localRemainingSeconds / totalSeconds) * 100;
    if (remainingPercentage <= 10) return 'text-red-500';
    if (remainingPercentage <= 25) return 'text-orange-500';
    return 'text-foreground';
  };

  const getProgressColor = () => {
    const remainingPercentage = (localRemainingSeconds / totalSeconds) * 100;
    if (remainingPercentage <= 10) return 'bg-red-500';
    if (remainingPercentage <= 25) return 'bg-orange-500';
    return 'bg-primary';
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      {/* En-tête avec véhicule */}
      <div className="flex items-center gap-4">
        {session.vehicle.image ? (
          <img
            src={session.vehicle.image}
            alt={session.vehicle.nom}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
            <Timer className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{session.vehicle.nom}</h3>
          <p className="text-sm text-muted-foreground">
            {session.vehicle.marque} {session.vehicle.modele}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.vehicle.tarifParMinute}€/min
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-mono font-bold ${getTimeColor()}`}>
            {formatTime(localRemainingSeconds)}
          </div>
          <div className="text-xs text-muted-foreground">
            {session.statut === 'pause' ? 'EN PAUSE' : 'TEMPS RESTANT'}
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="space-y-2">
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Écoulé: {formatTime(localElapsedSeconds)}</span>
          <span>Total: {formatTime(totalSeconds)}</span>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Temps écoulé</span>
          </div>
          <div className="font-medium text-foreground">
            {Math.floor(elapsedMinutes)}min {Math.floor(localElapsedSeconds % 60)}s
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Coût actuel</span>
          </div>
          <div className="font-medium text-primary">
            {formatCurrency(currentCost)}
          </div>
        </div>
      </div>

      {/* Alertes */}
      {localRemainingSeconds <= 60 && localRemainingSeconds > 0 && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="text-sm text-orange-800 dark:text-orange-200">
            Moins d'une minute restante !
          </span>
        </div>
      )}

      {session.statut === 'expire' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-800 dark:text-red-200">
            Timer expiré ! Coût final: {formatCurrency(currentCost)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {session.statut === 'en_cours' && (
          <button
            onClick={() => onPause(session._id)}
            className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        )}
        
        {session.statut === 'pause' && (
          <button
            onClick={() => onResume(session._id)}
            className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Play className="w-4 h-4" />
            Reprendre
          </button>
        )}
        
        <button
          onClick={() => onStop(session._id)}
          className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <Square className="w-4 h-4" />
          Arrêter
        </button>
        
        <div className="flex-1 text-right text-xs text-muted-foreground self-center">
          Démarré: {new Date(session.heureDebut).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default CountdownTimerCard;
