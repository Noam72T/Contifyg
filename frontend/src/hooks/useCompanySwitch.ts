import { useEffect, useRef } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook personnalisé pour gérer le rechargement des données lors du switch d'entreprise
 * Utilise ce hook dans les pages qui ont besoin de recharger leurs données quand l'entreprise change
 */
export const useCompanySwitch = (onCompanyChange?: () => void) => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const previousCompanyId = useRef<string | null>(null);

  useEffect(() => {
    // Vérifier si l'entreprise a vraiment changé
    const currentCompanyId = selectedCompany?._id || null;
    
    if (previousCompanyId.current !== null && previousCompanyId.current !== currentCompanyId) {
      console.log('🔄 Détection du changement d\'entreprise:', {
        from: previousCompanyId.current,
        to: currentCompanyId,
        companyName: selectedCompany?.name
      });
      
      // Déclencher le callback de rechargement avec un délai pour s'assurer que le backend est synchronisé
      setTimeout(() => {
        if (onCompanyChange) {
          onCompanyChange();
        }
      }, 500);
    }
    
    // Mettre à jour la référence
    previousCompanyId.current = currentCompanyId;
  }, [selectedCompany, onCompanyChange]);

  return {
    selectedCompany,
    user,
    isCompanyChanged: previousCompanyId.current !== selectedCompany?._id
  };
};
