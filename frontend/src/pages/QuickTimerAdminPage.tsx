import React from 'react';
import { Shield, Timer } from 'lucide-react';
import Layout from '../components/Layout';
import TimerAuthorizationButton from '../components/TimerAuthorizationButton';
import TimerDebugInfo from '../components/TimerDebugInfo';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';

const QuickTimerAdminPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  // Vérifier que l'utilisateur est Technicien
  const isTechnician = user?.systemRole === 'Technicien';

  if (!isTechnician) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">Cette page est réservée aux Techniciens.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Timer className="w-6 h-6 text-primary" />
            Gestion Rapide des Timers
          </h1>
          <p className="text-muted-foreground">Autoriser ou révoquer l'accès aux timers pour l'entreprise sélectionnée</p>
        </div>

        {/* Informations sur l'entreprise sélectionnée */}
        {selectedCompany ? (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-foreground mb-2">Entreprise Sélectionnée</h2>
              <div className="flex items-center gap-4">
                {selectedCompany.logo && (
                  <img 
                    src={selectedCompany.logo} 
                    alt={`Logo ${selectedCompany.name}`}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h3 className="font-medium text-foreground">{selectedCompany.name}</h3>
                  {selectedCompany.description && (
                    <p className="text-sm text-muted-foreground">{selectedCompany.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bouton d'autorisation */}
            <TimerAuthorizationButton />

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Instructions</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>Autoriser</strong> : L'entreprise pourra créer des véhicules et utiliser les timers</li>
                <li>• <strong>Révoquer</strong> : L'entreprise perdra l'accès aux timers (option disparaît de la sidebar)</li>
                <li>• Les changements sont <strong>immédiats</strong> et visibles dans la sidebar des utilisateurs</li>
                <li>• Les Techniciens ont toujours accès, peu importe les autorisations</li>
              </ul>
            </div>

            {/* Fonctionnalités incluses */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Fonctionnalités Incluses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-800 dark:text-green-200">
                <div>✅ Création de véhicules avec images</div>
                <div>✅ Timers en temps réel</div>
                <div>✅ Calcul automatique des coûts</div>
                <div>✅ Création automatique des ventes</div>
                <div>✅ Limite de 10 véhicules par défaut</div>
                <div>✅ Sessions de 8h maximum</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Timer className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Aucune entreprise sélectionnée</h2>
            <p className="text-muted-foreground">
              Sélectionnez une entreprise dans la sidebar pour gérer ses permissions timer.
            </p>
          </div>
        )}
        
        {/* Composant de debug */}
        <TimerDebugInfo />
      </div>
    </Layout>
  );
};

export default QuickTimerAdminPage;
