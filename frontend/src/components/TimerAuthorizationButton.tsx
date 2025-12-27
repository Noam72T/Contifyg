import React, { useState, useEffect, useRef } from 'react';
import { Shield, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import toast from 'react-hot-toast';

const TimerAuthorizationButton: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const isCheckingRef = useRef(false);
  
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  // Vérifier si l'utilisateur est Technicien
  const isTechnician = user?.systemRole === 'Technicien';

  // Vérifier les permissions au chargement
  useEffect(() => {
    // Éviter les vérifications multiples simultanées
    if (isCheckingRef.current) return;
    checkTimerPermissions();
  }, [selectedCompany]);

  const checkTimerPermissions = async () => {
    if (!selectedCompany || isCheckingRef.current) {
      setIsAuthorized(null);
      setChecking(false);
      return;
    }

    isCheckingRef.current = true;
    setChecking(true);
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
        setIsAuthorized(data.permission?.isAuthorized || false);
      } else if (response.status === 404) {
        setIsAuthorized(false);
      } else {
        setIsAuthorized(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      setIsAuthorized(false);
    } finally {
      isCheckingRef.current = false;
      setChecking(false);
    }
  };

  const toggleAuthorization = async () => {
    if (!selectedCompany || !isTechnician) return;

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/timer-permissions/authorize/${selectedCompany._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          isAuthorized: !isAuthorized,
          features: {
            canCreateVehicles: true,
            canUseTimers: true,
            autoCreateSales: true,
            maxVehicles: 10
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newAuthStatus = !isAuthorized;
        setIsAuthorized(newAuthStatus);
        
        // La synchronisation se fait maintenant via l'API et la base de données
        
        toast.success(data.message || 'Autorisation mise à jour avec succès');
        
        // Déclencher un événement personnalisé avec les détails
        window.dispatchEvent(new CustomEvent('timerPermissionChanged', {
          detail: {
            companyId: selectedCompany?._id,
            companyName: selectedCompany?.name,
            isAuthorized: newAuthStatus,
            timestamp: Date.now()
          }
        }));
        
        // Petit délai pour laisser la sidebar se mettre à jour
        setTimeout(() => {
          
        }, 100);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification des permissions');
    } finally {
      setLoading(false);
    }
  };

  // Ne pas afficher si pas de Technicien ou pas d'entreprise
  if (!isTechnician || !selectedCompany) {
    return null;
  }

  if (checking) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Vérification...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-card border rounded-lg">
      <Shield className="w-5 h-5 text-primary" />
      <div className="flex-1">
        <h3 className="font-medium text-foreground">Autorisation Timers</h3>
        <p className="text-sm text-muted-foreground">
          {selectedCompany.name} - {isAuthorized ? 'Autorisée' : 'Non autorisée'}
        </p>
      </div>
      
      <button
        onClick={toggleAuthorization}
        disabled={loading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          ${isAuthorized 
            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30' 
            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
          }
        `}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isAuthorized ? (
          <X className="w-4 h-4" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        {loading ? 'Modification...' : isAuthorized ? 'Révoquer' : 'Autoriser'}
      </button>
    </div>
  );
};

export default TimerAuthorizationButton;
