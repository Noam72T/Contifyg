import React, { useEffect, useState } from 'react';
import { Power, Clock } from 'lucide-react';
import { useService } from '../contexts/ServiceContext';

const ServiceStatusButton: React.FC = () => {
  const { isInService, currentSession, isLoading, startService, stopService } = useService();
  const [currentDuration, setCurrentDuration] = useState<string>('0h 0min 0s');

  // Calculer la durée actuelle en temps réel avec les secondes
  useEffect(() => {
    if (!isInService || !currentSession) {
      setCurrentDuration('0h 0min 0s');
      return;
    }

    const updateDuration = () => {
      const startTime = new Date(currentSession.startTime);
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setCurrentDuration(`${hours}h ${minutes}min ${seconds}s`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000); // Mise à jour chaque seconde

    return () => clearInterval(interval);
  }, [isInService, currentSession]);

  const handleToggle = async () => {
    if (isInService) {
      await stopService();
    } else {
      await startService();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Bouton de bascule - Design moderne */}
      <button
        onClick={handleToggle}
        className={`
          w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-semibold 
          transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
          ${isInService
            ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
            : 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40'
          }
        `}
      >
        <Power className={`w-5 h-5 ${isInService ? 'animate-pulse' : ''}`} />
        <div className="flex flex-col items-start">
          <span className="text-sm leading-tight">
            {isInService ? 'Terminer le service' : 'Démarrer le service'}
          </span>
          {isInService && (
            <span className="text-xs opacity-90 font-normal flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {currentDuration}
            </span>
          )}
        </div>
      </button>
    </div>
  );
};

export default ServiceStatusButton;
