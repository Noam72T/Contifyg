import React, { useState, useEffect } from 'react';
import { Users, Building2, Loader2, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { showToast } from '../utils/toastDeduplicator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

interface MyAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAccount?: () => void;
}

const MyAccountsModal: React.FC<MyAccountsModalProps> = ({ open, onOpenChange, onAddAccount }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open]);

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
        // Mettre à jour le token et l'utilisateur dans localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Sauvegarder le accountFamilyId pour les futurs comptes
        if (response.data.user.accountFamilyId) {
          localStorage.setItem('accountFamilyId', response.data.user.accountFamilyId);
        }
        
        // Nettoyer les anciennes données d'entreprise
        localStorage.removeItem('selectedCompany');
        localStorage.removeItem('selectedCompanyId');
        
        showToast.success('Changement de compte réussi !');
        
        onOpenChange(false);
        
        // Forcer un rechargement complet pour réinitialiser tous les contextes
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      }
    } catch (error: any) {
      console.error('Erreur lors du changement de compte:', error);
      showToast.error(error.response?.data?.message || 'Erreur lors du changement de compte');
    } finally {
      setSwitching(null);
    }
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le compte "${accountName}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      setDeleting(accountId);
      
      const response = await api.delete(`/user-accounts/${accountId}`);
      
      if (response.data.success) {
        showToast.success('Compte supprimé avec succès');
        
        // Rafraîchir la liste des comptes
        await fetchAccounts();
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression du compte:', error);
      showToast.error(error.response?.data?.message || 'Erreur lors de la suppression du compte');
    } finally {
      setDeleting(null);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-primary" />
            Mes Comptes
            {!loading && accounts.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({accounts.length}/4)
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez le compte avec lequel vous souhaitez vous connecter
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Liste des comptes */}
            <div className="space-y-2 mb-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`group w-full bg-card border border-border rounded-lg p-4 transition-all ${
                    account.isCurrent ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/50 hover:shadow-md'
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

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Bouton de suppression (sauf pour le compte actuel) */}
                      {!account.isCurrent && accounts.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAccount(account.id, account.firstName && account.lastName ? `${account.firstName} ${account.lastName}` : account.username);
                          }}
                          disabled={deleting === account.id}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {deleting === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      
                      {/* Bouton de switch ou loader */}
                      {switching === account.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : !account.isCurrent ? (
                        <button
                          onClick={() => handleSwitchAccount(account.id)}
                          disabled={switching !== null || deleting !== null}
                          className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton Ajouter un compte */}
            <button
              onClick={() => {
                onOpenChange(false);
                onAddAccount?.();
              }}
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
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground text-center">
                <span className="mr-1.5">💡</span>
                Vous pouvez gérer plusieurs comptes pour différentes entreprises
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MyAccountsModal;
