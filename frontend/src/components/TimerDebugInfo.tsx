import React, { useState, useEffect } from 'react';
import { Info, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';

const TimerDebugInfo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [timerPermissions, setTimerPermissions] = useState<any>(null);
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  useEffect(() => {
    if (selectedCompany && isVisible) {
      checkPermissions();
    }
  }, [selectedCompany, isVisible]);

  const checkPermissions = async () => {
    if (!selectedCompany) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timer-permissions/company/${selectedCompany._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTimerPermissions(data.permission);
      } else {
        setTimerPermissions({ error: `HTTP ${response.status}` });
      }
    } catch (error) {
      setTimerPermissions({ error: String(error) });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600"
        title="Debug Timer Permissions"
      >
        {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-card border rounded-lg p-4 shadow-xl w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-foreground">Debug Timer Permissions</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <strong className="text-foreground">Utilisateur:</strong>
              <div className="ml-2 text-muted-foreground">
                <div>Nom: {user?.username || 'Non connecté'}</div>
                <div>Rôle: {user?.systemRole || 'Aucun'}</div>
                <div>ID: {user?._id || 'Aucun'}</div>
              </div>
            </div>
            
            <div>
              <strong className="text-foreground">Entreprise:</strong>
              <div className="ml-2 text-muted-foreground">
                <div>Nom: {selectedCompany?.name || 'Aucune'}</div>
                <div>ID: {selectedCompany?._id || 'Aucun'}</div>
              </div>
            </div>
            
            <div>
              <strong className="text-foreground">Permissions Timer:</strong>
              <div className="ml-2 text-muted-foreground">
                {timerPermissions ? (
                  timerPermissions.error ? (
                    <div className="text-red-500">Erreur: {timerPermissions.error}</div>
                  ) : (
                    <div>
                      <div>Autorisé: {timerPermissions.isAuthorized ? '✅ Oui' : '❌ Non'}</div>
                      <div>Autorisé par: {timerPermissions.authorizedBy?.username || 'Personne'}</div>
                      <div>Date: {timerPermissions.authorizedAt ? new Date(timerPermissions.authorizedAt).toLocaleString() : 'Jamais'}</div>
                    </div>
                  )
                ) : (
                  <div>Cliquez pour vérifier...</div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={checkPermissions}
                className="w-full bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
              >
                Rafraîchir
              </button>
              
              <button
                onClick={() => {
                  localStorage.setItem('forceShowTimers', 'true');
                  window.location.reload();
                }}
                className="w-full bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
              >
                Forcer Affichage Timers
              </button>
              
              <button
                onClick={() => {
                  localStorage.removeItem('forceShowTimers');
                  window.location.reload();
                }}
                className="w-full bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
              >
                Mode Normal
              </button>
              
              <button
                onClick={() => {
                  // Déclencher un événement de rafraîchissement
                  window.dispatchEvent(new CustomEvent('timerPermissionChanged'));
                  setTimeout(() => window.location.reload(), 500);
                }}
                className="w-full bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600"
              >
                Forcer Rafraîchissement
              </button>
              
              <button
                onClick={() => {
                  if (selectedCompany) {
                    const authorized = JSON.parse(localStorage.getItem('authorizedCompanies') || '[]');
                    if (!authorized.includes(selectedCompany._id)) {
                      authorized.push(selectedCompany._id);
                      localStorage.setItem('authorizedCompanies', JSON.stringify(authorized));
                      
                      // Déclencher l'événement de changement
                      window.dispatchEvent(new CustomEvent('timerPermissionChanged', {
                        detail: {
                          companyId: selectedCompany._id,
                          companyName: selectedCompany.name,
                          isAuthorized: true,
                          timestamp: Date.now()
                        }
                      }));
                    }
                  }
                }}
                className="w-full bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600"
              >
                Autoriser Cette Entreprise (Local)
              </button>
              
              <button
                onClick={() => {
                  if (selectedCompany) {
                    const authorized = JSON.parse(localStorage.getItem('authorizedCompanies') || '[]');
                    const index = authorized.indexOf(selectedCompany._id);
                    if (index > -1) {
                      authorized.splice(index, 1);
                      localStorage.setItem('authorizedCompanies', JSON.stringify(authorized));
                      
                      // Déclencher l'événement de changement
                      window.dispatchEvent(new CustomEvent('timerPermissionChanged', {
                        detail: {
                          companyId: selectedCompany._id,
                          companyName: selectedCompany.name,
                          isAuthorized: false,
                          timestamp: Date.now()
                        }
                      }));
                    }
                  }
                }}
                className="w-full bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
              >
                Révoquer Cette Entreprise (Local)
              </button>
              
              <button
                onClick={() => {
                  localStorage.removeItem('authorizedCompanies');
                  localStorage.removeItem('forceShowTimers');
                  window.location.reload();
                }}
                className="w-full bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
              >
                🧹 Nettoyer Toutes les Autorisations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerDebugInfo;
