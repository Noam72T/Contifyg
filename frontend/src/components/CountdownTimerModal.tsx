import React, { useState } from 'react';
import { Timer, Clock, DollarSign, X } from 'lucide-react';

interface Vehicle {
  _id: string;
  nom: string;
  marque: string;
  modele: string;
  tarifParMinute: number;
  image?: string;
}

interface CountdownTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  onStartTimer: (durationMinutes: number) => void;
}

const CountdownTimerModal: React.FC<CountdownTimerModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  onStartTimer
}) => {
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [customDuration, setCustomDuration] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  if (!isOpen) return null;

  const presetDurations = [1, 5, 10, 15, 30, 60];
  
  const finalDuration = useCustom ? parseInt(customDuration) || 0 : durationMinutes;
  const estimatedCost = finalDuration * vehicle.tarifParMinute;

  const handleStart = () => {
    if (finalDuration > 0) {
      onStartTimer(finalDuration);
      onClose();
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border max-w-md w-full">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Timer className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Démarrer Timer</h2>
              <p className="text-sm text-muted-foreground">
                {vehicle.marque} {vehicle.modele} ({vehicle.nom})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6">
          {/* Véhicule */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
            {vehicle.image ? (
              <img
                src={vehicle.image}
                alt={vehicle.nom}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Timer className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h3 className="font-medium text-foreground">{vehicle.nom}</h3>
              <p className="text-sm text-muted-foreground">
                {vehicle.marque} {vehicle.modele}
              </p>
              <p className="text-sm font-medium text-primary">
                {vehicle.tarifParMinute}€/min
              </p>
            </div>
          </div>

          {/* Durées prédéfinies */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Durée du timer
            </label>
            <div className="grid grid-cols-3 gap-2">
              {presetDurations.map((duration) => (
                <button
                  key={duration}
                  onClick={() => {
                    setDurationMinutes(duration);
                    setUseCustom(false);
                  }}
                  className={`p-3 rounded-lg border transition-colors text-center ${
                    !useCustom && durationMinutes === duration
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{formatTime(duration)}</div>
                  <div className="text-xs text-muted-foreground">
                    {(duration * vehicle.tarifParMinute).toFixed(2)}€
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Durée personnalisée */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="custom"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="custom" className="text-sm font-medium text-foreground">
                Durée personnalisée
              </label>
            </div>
            {useCustom && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="Durée en minutes"
                  min="1"
                  max="1440"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            )}
          </div>

          {/* Résumé */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Durée</span>
              </div>
              <span className="font-medium text-foreground">
                {formatTime(finalDuration)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Coût estimé</span>
              </div>
              <span className="font-medium text-primary">
                {estimatedCost.toFixed(2)}€
              </span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              Le timer décomptera de {formatTime(finalDuration)} à 00:00
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleStart}
            disabled={finalDuration <= 0}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Démarrer Timer
          </button>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimerModal;
