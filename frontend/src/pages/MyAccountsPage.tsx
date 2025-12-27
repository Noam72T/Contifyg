import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Building2, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../utils/toastDeduplicator';
import Layout from '../components/Layout';
import AddAccountModal from '../components/AddAccountModal';
import api from '../utils/api';

interface Account {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  company: {
    id: string;
    name: string;
    logo?: string;
    category?: string;
  } | null;
  role: {
    id: string;
    name: string;
    level: number;
  } | null;
  systemRole: string;
  isActivated: boolean;
  isCompanyValidated: boolean;
  createdAt: string;
  isCurrent: boolean;
}

const MyAccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user-accounts');
      
      if (response.data.success) {
        setAccounts(response.data.accounts);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des comptes:', error);
      showToast.error('Erreur lors du chargement des comptes');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async (accountId: string) => {
    try {
      setSwitching(accountId);
      
      const response = await api.post('/user-accounts/switch', { accountId });
      
      if (response.data.success) {
        // Mettre à jour le token
        localStorage.setItem('token', response.data.token);
        
        // Mettre à jour l'utilisateur dans le contexte
        updateUser(response.data.user);
        
        showToast.success('Changement de compte réussi !');
        
        // Rediriger vers le dashboard
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
      }
    } catch (error: any) {
      console.error('Erreur lors du changement de compte:', error);
      showToast.error(error.response?.data?.message || 'Erreur lors du changement de compte');
    } finally {
      setSwitching(null);
    }
  };

  const handleAddAccount = () => {
    setShowAddModal(true);
  };

  const getInitials = (firstName?: string, lastName?: string, username?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de vos comptes...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Mes Comptes
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-13">
            Sélectionnez le compte avec lequel vous souhaitez vous connecter
          </p>
        </div>

        {/* Liste des comptes */}
        <div className="space-y-2 mb-4">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleSwitchAccount(account.id)}
              disabled={switching !== null || account.isCurrent}
              className={`group w-full bg-card border border-border rounded-lg p-4 transition-all hover:border-primary/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                account.isCurrent ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    {account.avatar ? (
                      <img
                        src={account.avatar}
                        alt={account.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-base font-semibold text-primary">
                          {getInitials(account.firstName, account.lastName, account.username)}
                        </span>
                      </div>
                    )}
                    {account.isCurrent && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  {/* Informations */}
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {account.firstName && account.lastName
                          ? `${account.firstName} ${account.lastName}`
                          : account.username}
                      </h3>
                      {account.isCurrent && (
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium rounded">
                          Actuel
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      @{account.username}
                    </p>
                    
                    {/* Entreprise */}
                    {account.company && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {account.company.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bouton/Loader */}
                <div>
                  {switching === account.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : !account.isCurrent && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Bouton Ajouter un compte */}
        <button
          onClick={handleAddAccount}
          className="group w-full border-2 border-dashed border-border rounded-lg p-4 transition-all hover:border-primary hover:bg-primary/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-foreground">
                Ajouter un compte
              </h3>
              <p className="text-xs text-muted-foreground">
                Rejoindre une nouvelle entreprise
              </p>
            </div>
          </div>
        </button>

        {/* Note */}
        <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground text-center">
            <span className="mr-1.5">💡</span>
            Vous pouvez gérer plusieurs comptes pour différentes entreprises
          </p>
        </div>
      </div>

      {/* Modal Ajouter un compte */}
      <AddAccountModal 
        open={showAddModal} 
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) {
            // Rafraîchir la liste des comptes quand la modal se ferme
            fetchAccounts();
          }
        }} 
      />
    </Layout>
  );
};

export default MyAccountsPage;
