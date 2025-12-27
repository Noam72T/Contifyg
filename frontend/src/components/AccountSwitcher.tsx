import { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Plus, 
  Building, 
  AlertCircle,
  Loader2,
  Settings,
  Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AddAccountModal from './AddAccountModal';
import MyAccountsModal from './MyAccountsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface UserAccount {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  company?: {
    id: string;
    name: string;
    logo?: string;
    category: string;
  } | null;
  role?: {
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

export default function AccountSwitcher() {
  const { user, updateUser } = useAuth();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const hasLoadedRef = useRef(false);

  // Charger les comptes de l'utilisateur
  const fetchAccounts = async () => {
    if (!user || hasLoadedRef.current) return;
    
    hasLoadedRef.current = true;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/user-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
      } else {
        console.error('Erreur lors du chargement des comptes:', data.message);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des comptes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Changer de compte
  const switchAccount = async (accountId: string) => {
    if (!user || accountId === user._id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/user-accounts/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      });

      const data = await response.json();
      if (data.success) {
        // 1. Mettre à jour le token
        localStorage.setItem('token', data.token);
        
        // 2. Nettoyer le localStorage des anciennes données d'entreprise
        localStorage.removeItem('selectedCompany');
        localStorage.removeItem('selectedCompanyId');
        
        // 3. Mettre à jour les données utilisateur
        updateUser(data.user);
        
        // 4. Attendre un peu pour que les contextes se mettent à jour
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 5. Rediriger vers le dashboard ou la page de code si pas d'entreprise
        if (!data.user.company) {
          window.location.href = '/company-code';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        console.error(data.message || 'Erreur lors du changement de compte');
      }
    } catch (error) {
      console.error('Erreur lors du changement de compte:', error);
      console.error('Erreur lors du changement de compte');
    } finally {
      setLoading(false);
    }
  };

  // Charger les comptes au montage
  useEffect(() => {
    fetchAccounts();
  }, [user]);

  // Écouter les mises à jour du profil utilisateur
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('🔄 AccountSwitcher - Profil mis à jour, rafraîchissement...');
      // Réinitialiser le flag pour permettre un nouveau chargement
      hasLoadedRef.current = false;
      fetchAccounts();
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  if (!user) return null;

  const currentAccount = accounts.find(account => account.isCurrent);
  const otherAccounts = accounts.filter(account => !account.isCurrent);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors min-w-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="Avatar"
                className="h-8 w-8 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-foreground whitespace-nowrap">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                @{user.username}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80" align="end">
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
            </div>
          ) : (
            <>
              {/* En-tête avec nombre de comptes */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    COMPTES DISPONIBLES
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {accounts.length}
                  </span>
                </div>
              </div>

              {/* Liste de tous les comptes */}
              <div className="p-3 space-y-2">
                {/* Compte actuel */}
                {currentAccount && (
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-muted/30">
                    <div className="relative">
                      {currentAccount.avatar ? (
                        <img
                          src={currentAccount.avatar}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {currentAccount.firstName} {currentAccount.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{currentAccount.username} • Compte actuel
                      </p>
                      {currentAccount.company && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Building className="h-3 w-3 text-muted-foreground/70" />
                          <p className="text-xs text-muted-foreground/70">
                            {currentAccount.company.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Autres comptes */}
                {otherAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => switchAccount(account.id)}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      {account.avatar ? (
                        <img
                          src={account.avatar}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      {account.company && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-background"></div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {account.firstName} {account.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{account.username}
                      </p>
                      {account.company ? (
                        <div className="flex items-center space-x-1 mt-1">
                          <Building className="h-3 w-3 text-muted-foreground/70" />
                          <p className="text-xs text-muted-foreground/70">
                            {account.company.name}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 mt-1">
                          <AlertCircle className="h-3 w-3 text-orange-500" />
                          <p className="text-xs text-orange-500">
                            Aucune entreprise
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}

                {/* Message si aucun autre compte */}
                {otherAccounts.length === 0 && (
                  <div className="p-4 text-center border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground text-sm mb-1">Aucun autre compte</p>
                    <p className="text-muted-foreground/70 text-xs">Créez un compte supplémentaire</p>
                  </div>
                )}
              </div>

              {/* Séparateur */}
              <div className="px-3 py-2">
                <div className="border-t border-border"></div>
              </div>

              {/* Section Mes comptes */}
              <div className="px-3 pb-2">
                <button
                  onClick={() => setShowAccountsModal(true)}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">
                      Mes comptes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Gérer tous mes comptes
                    </p>
                  </div>
                </button>
              </div>

              {/* Section Mon profil */}
              <div className="px-3 pb-2">
                <a
                  href="/profile"
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">
                      Mon profil
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Modifier mes informations
                    </p>
                  </div>
                </a>
              </div>

              {/* Section Ajouter un compte */}
              <div className="px-3 pb-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">
                      Ajouter un compte
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Créer un nouveau compte
                    </p>
                  </div>
                </button>
              </div>

            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal Mes comptes */}
      <MyAccountsModal 
        open={showAccountsModal} 
        onOpenChange={setShowAccountsModal}
        onAddAccount={() => setShowAddModal(true)}
      />

      {/* Modal Ajouter un compte */}
      <AddAccountModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal}
      />
    </>
  );
}
