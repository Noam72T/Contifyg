import { useState, useEffect } from 'react';
import { requestManager } from '../utils/requestManager';
import type { RequestStats } from '../utils/requestManager';
import { Activity, Clock, Database, AlertTriangle, CheckCircle } from 'lucide-react';

export function RequestMonitor() {
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(requestManager.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const cacheHitRate = stats.totalRequests > 0 ? (stats.cacheHits / stats.totalRequests * 100).toFixed(1) : '0';
  const errorRate = stats.totalRequests > 0 ? (stats.errors / stats.totalRequests * 100).toFixed(1) : '0';

  return (
    <>
      {/* Bouton flottant pour ouvrir/fermer */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
        title="Monitoring des requêtes"
      >
        <Activity className="h-5 w-5" />
      </button>

      {/* Panel de monitoring */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Request Monitor
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {/* Status général */}
            <div className="flex items-center space-x-2">
              {stats.errors === 0 && stats.rateLimitHits === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm font-medium">
                {stats.errors === 0 && stats.rateLimitHits === 0 ? 'Système stable' : 'Attention requise'}
              </span>
            </div>

            {/* Statistiques principales */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <div className="flex items-center space-x-1">
                  <Activity className="h-3 w-3 text-blue-500" />
                  <span className="text-gray-600 dark:text-gray-300">Requêtes</span>
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {stats.totalRequests}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <div className="flex items-center space-x-1">
                  <Database className="h-3 w-3 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-300">Cache</span>
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {cacheHitRate}%
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-purple-500" />
                  <span className="text-gray-600 dark:text-gray-300">Temps moy.</span>
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {Math.round(stats.averageResponseTime)}ms
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-gray-600 dark:text-gray-300">Erreurs</span>
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {errorRate}%
                </div>
              </div>
            </div>

            {/* Détails avancés */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">File d'attente:</span>
                <span className="font-medium">{stats.queueLength}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Requêtes actives:</span>
                <span className="font-medium">{stats.currentRequests}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Taille cache:</span>
                <span className="font-medium">{stats.cacheSize} entrées</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rate limit:</span>
                <span className="font-medium">{stats.rateLimitDelay}ms</span>
              </div>
              {stats.rateLimitHits > 0 && (
                <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                  <span>Rate limits:</span>
                  <span className="font-medium">{stats.rateLimitHits}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
              <button
                onClick={() => {
                  requestManager.invalidateCache();
                  setStats(requestManager.getStats());
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded transition-colors"
              >
                Vider le cache
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


