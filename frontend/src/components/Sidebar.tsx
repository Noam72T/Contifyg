import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  Check,
  Plus,
  FileText,
  BarChart3,
  Receipt,
  Users,
  DollarSign,
  ShieldCheck,
  Clock,
  Package,
  Handshake,
  Building,
  BaggageClaim,
  LogOut,
  Timer,
  Activity,
  Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { ModeToggle } from './mode-toggle';
import CreateCompanyModal from './CreateCompanyModal';
import AccountSwitcher from './AccountSwitcher';
import ServiceStatusButton from './ServiceStatusButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isTimerAuthorized, setIsTimerAuthorized] = useState<boolean | null>(null);
  const [userCompanyName, setUserCompanyName] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { selectedCompany, setSelectedCompany, setSelectedCompanyById, resetToDefault, userCompanies, fetchUserCompanies } = useCompany();
  const navigate = useNavigate();
  const { canViewCategory, loading: permissionsLoading } = useUserPermissions();
  const location = useLocation();

  // Récupérer le nom de l'entreprise de l'utilisateur si pas encore chargé
  useEffect(() => {
    const fetchUserCompanyName = async () => {
      if (!user || user.systemRole === 'Technicien' || selectedCompany || userCompanyName) {
        return; // Pas besoin si c'est un technicien, si l'entreprise est déjà chargée, ou si on a déjà le nom
      }

      const userCompanyId = typeof user.currentCompany === 'string' 
        ? user.currentCompany 
        : (user.currentCompany as any)?._id || (typeof user.company === 'string' ? user.company : (user.company as any)?._id);

      if (userCompanyId) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL;
          const token = localStorage.getItem('token');
          
          const response = await fetch(`${apiUrl}/api/companies/${userCompanyId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.company) {
              setUserCompanyName(data.company.name);
            }
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du nom de l\'entreprise:', error);
        }
      }
    };

    fetchUserCompanyName();
  }, [user, selectedCompany, userCompanyName]);

  // Vérifier les permissions timer quand l'entreprise change
  useEffect(() => {
    const checkTimerPermissions = async () => {
      if (!selectedCompany || !user) {
        setIsTimerAuthorized(null);
        return;
      }
      
      // Les Techniciens ont toujours accès
      if (user.systemRole === 'Technicien') {
        setIsTimerAuthorized(true);
        return;
      }
      
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
          
          const isAuthorized = data.permission?.isAuthorized || false;
          
          setIsTimerAuthorized(isAuthorized);
        } else if (response.status === 404) {
          
          setIsTimerAuthorized(false);
        } else {
          
          setIsTimerAuthorized(false);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification des permissions timer:', error);
        setIsTimerAuthorized(false);
      }
    };
    
    checkTimerPermissions();

    // Écouter les changements d'autorisation
    const handlePermissionChange = (event: any) => {
      
      
      // Vérifier si c'est pour l'entreprise actuellement sélectionnée
      if (event.detail && event.detail.companyId === selectedCompany?._id) {
        
        setIsTimerAuthorized(event.detail.isAuthorized);
        
        // Forcer un re-render en mettant à jour un état
        setTimeout(() => {
          
          setIsTimerAuthorized(event.detail.isAuthorized);
        }, 100);
      } else {
        
        // Sinon, refaire la vérification complète
        checkTimerPermissions();
      }
    };

    window.addEventListener('timerPermissionChanged', handlePermissionChange);
    
    return () => {
      window.removeEventListener('timerPermissionChanged', handlePermissionChange);
    };
  }, [selectedCompany, user]);

  // Charger l'état des catégories depuis localStorage au montage
  useEffect(() => {
    const savedExpandedCategories = localStorage.getItem('expandedCategories');
    
    
    if (savedExpandedCategories) {
      try {
        const parsed = JSON.parse(savedExpandedCategories);
        
        // Toujours inclure 'Général' dans les catégories ouvertes
        const categoriesWithGeneral = [...new Set([...parsed, 'Général'])];
        
        setExpandedCategories(categoriesWithGeneral);
      } catch (error) {
        
        setExpandedCategories(['Général']);
      }
    } else {
      
      setExpandedCategories(['Général']);
    }
  }, []);

  // Sauvegarder l'état des catégories dans localStorage à chaque changement
  useEffect(() => {
    if (expandedCategories.length > 0) {
      
      localStorage.setItem('expandedCategories', JSON.stringify(expandedCategories));
    }
  }, [expandedCategories]);


  // Recharger les entreprises de l'utilisateur quand nécessaire
  useEffect(() => {
    if (user && userCompanies.length === 0) {
      fetchUserCompanies();
    }
  }, [user]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleCompanyCreated = (company: any) => {
    setSelectedCompany(company);
    setShowCreateModal(false);
    // Recharger la liste des entreprises
    fetchUserCompanies();
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      if (categoryName === 'Général') {
        // La catégorie Général reste toujours ouverte
        return prev.includes('Général') ? prev : [...prev, 'Général'];
      }
      
      return prev.includes(categoryName)
        ? prev.filter(cat => cat !== categoryName)
        : [...prev, categoryName];
    });
  };

  const allMenuItems = [
    {
      category: 'Général',
      categoryCode: 'GENERALE',
      items: [
        { path: '/dashboard', icon: Home, label: 'Tableau de bord' },
        { path: '/prestations', icon: ShoppingBag, label: 'Prestations' },
        { path: '/timers', icon: Timer, label: 'Timers' },
        { path: '/timer-history', icon: Clock, label: 'Historique Timers' },
        { path: '/ventes', icon: BaggageClaim, label: 'Historique des ventes' }
      ]
    },
    {
      category: 'Paperasse',
      categoryCode: 'PAPERASSE',
      items: [
        { path: '/bilan', icon: BarChart3, label: 'Bilan' },
        { path: '/charges', icon: DollarSign, label: 'Charges' },
        { path: '/factures', icon: Receipt, label: 'Générateur de Factures' }
      ]
    },
    {
      category: 'Administration',
      categoryCode: 'ADMINISTRATION',
      items: [
        { path: '/employes', icon: Users, label: 'Listes des employés' },
        { path: '/historique-employes', icon: Clock, label: 'Historique des employés' },
        { path: '/liste-ventes', icon: Receipt, label: 'Listes des ventes' },
        { path: '/salaires', icon: DollarSign, label: 'Listes des Salaires' },
        { path: '/service-monitoring', icon: Activity, label: 'Listes des Services' },
        { path: '/liste-factures', icon: FileText, label: 'Listes des factures' }
      ]
    },
    {
      category: 'GESTION',
      categoryCode: 'GESTION',
      items: [
        { path: '/gestion-roles', icon: ShieldCheck, label: 'Gestion Roles' },
        { path: '/gestion-items', icon: Package, label: 'Gestion Item' },
        { path: '/gestion-partenariats', icon: Handshake, label: 'Gestionnaire Partenariat' },
        { path: '/gestion-stock', icon: Package, label: 'Gestion Stock' },
        { path: '/gestion-entreprise', icon: Building, label: 'Gestion Entreprise' },
        { path: '/quick-timer-admin', icon: Timer, label: 'Autoriser Timers', technicianOnly: true },
        { path: '/timer-admin', icon: ShieldCheck, label: 'Admin Timers', technicianOnly: true },
        { path: '/technician-admin', icon: Shield, label: 'Admin Technicien', technicianOnly: true }
        
      ]
    }
  ];

  // Filtrer les catégories selon les permissions de l'utilisateur
  const menuItems = permissionsLoading ? [] : allMenuItems.filter(category => {
    const hasAccess = canViewCategory(category.categoryCode as 'GENERALE' | 'PAPERASSE' | 'ADMINISTRATION' | 'GESTION');
    return hasAccess;
  }).map(category => {
    // Filtrer les items selon la configuration des pages visibles de l'entreprise
    const visiblePages = (selectedCompany as any)?.visiblePages || [];
    
    // Si pas de configuration ou si l'utilisateur est Technicien, afficher toutes les pages
    const shouldFilterPages = visiblePages.length > 0 && user?.systemRole !== 'Technicien';
    
    // Vérifier si l'entreprise est en mode API
    const isApiMode = (selectedCompany as any)?.apiMode === true;
    
    // Pages à masquer en mode API (gestion manuelle désactivée)
    // Note: /ventes est VISIBLE en mode API car elle affiche les données de l'API GLife
    const apiModeHiddenPages = ['/prestations', '/gestion-stock', '/gestion-items'];
    
    return {
      ...category,
      items: category.items.filter(item => {
        // Les pages réservées aux techniciens ne sont pas filtrées
        if (item.technicianOnly) {
          return true;
        }
        
        // En mode API, masquer les pages de gestion manuelle (sauf pour les Techniciens)
        if (isApiMode && user?.systemRole !== 'Technicien') {
          if (apiModeHiddenPages.includes(item.path)) {
            return false;
          }
        }
        
        // Si on doit filtrer, vérifier si la page est dans la liste des pages visibles
        if (shouldFilterPages) {
          return visiblePages.includes(item.path);
        }
        
        // Sinon, afficher toutes les pages
        return true;
      })
    };
  }).filter(category => category.items.length > 0); // Supprimer les catégories vides

  return (
    <>
      {/* Overlay pour mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bouton menu mobile */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden bg-card p-2 rounded-md shadow-lg border border-border"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <Menu className="h-6 w-6 text-foreground" />
        )}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen bg-card border-r border-border z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-72 lg:relative lg:translate-x-0 lg:h-screen
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
                {selectedCompany?.logo ? (
                  <img 
                    src={selectedCompany.logo} 
                    alt={`Logo ${selectedCompany.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-primary-foreground font-bold text-lg">C</span>
                )}
              </div>
              <div className="flex-1">
                {/* Dropdown pour tous les utilisateurs */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-between w-full text-left hover:bg-accent hover:text-accent-foreground rounded-lg p-2 transition-colors">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-foreground">
                          {selectedCompany ? selectedCompany.name : 
                           userCompanyName ? userCompanyName :
                           (user?.systemRole === 'Technicien' ? 'Compta System' : 'Chargement...')}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-64" align="start">
                  <DropdownMenuLabel>Sélectionner une entreprise</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Pour les techniciens, afficher "Compta System" */}
                  {user?.systemRole === 'Technicien' && (
                    <>
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => {
                          resetToDefault(); // Reset pour "Compta System" (pas d'entreprise spécifique)
                        }}>
                          <span>Compta System</span>
                          {!selectedCompany && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {/* Afficher les entreprises de l'utilisateur */}
                  {userCompanies.length > 0 && (
                    <DropdownMenuGroup>
                      {userCompanies.map((company: any) => (
                        <DropdownMenuItem 
                          key={company._id}
                          onClick={() => {
                            setSelectedCompany(company);
                            setSelectedCompanyById(company._id);
                          }}
                        >
                          <div className="flex flex-col flex-1">
                            <span>{company.name}</span>
                            {company.description && (
                              <span className="text-xs text-muted-foreground">{company.description}</span>
                            )}
                          </div>
                          {selectedCompany?._id === company._id && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Bouton pour rejoindre une entreprise */}
                  <DropdownMenuItem 
                    onClick={() => navigate('/company-code')} 
                    className="text-blue-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Rejoindre une entreprise</span>
                  </DropdownMenuItem>
                  
                  {/* Bouton pour créer une entreprise (Techniciens seulement) */}
                  {user?.systemRole === 'Technicien' && (
                    <DropdownMenuItem onClick={() => setShowCreateModal(true)} className="text-green-600">
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Créer une entreprise</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          </div>

            {/* Navigation avec scrollbar cachée */}
          <nav className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-hide">
            {permissionsLoading ? (
              <div className="space-y-2">
                <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
                <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
                <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
              </div>
            ) : (
              menuItems.map((category) => {
              const isExpanded = expandedCategories.includes(category.category);
              
              return (
                <div key={category.category}>
                  <button
                    onClick={() => toggleCategory(category.category)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    <span>{category.category}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="space-y-1 mt-2">
                      {category.items.filter((item) => {
                        // Filtrer les items réservés aux Techniciens
                        if (item.technicianOnly && user?.systemRole !== 'Technicien') {
                          return false;
                        }
                        
                        // Filtrer les timers selon les permissions
                        if (item.path === '/timers' || item.path === '/timer-history') {
                          // Mode debug - forcer l'affichage
                          const forceShow = localStorage.getItem('forceShowTimers') === 'true';
                          
                          // Debug logs détaillés pour diagnostiquer
                          
                          
                          // Mode debug activé
                          if (forceShow) {
                            
                            return true;
                          }
                          
                          // NOUVELLE LOGIQUE : Basée sur l'autorisation de l'entreprise
                          // Les Techniciens voient toujours les timers pour pouvoir gérer
                          if (user?.systemRole === 'Technicien') {
                          
                            return true;
                          }
                          
                          // Pour TOUS les autres utilisateurs (y compris employés, admins, etc.)
                          // Vérifier si leur ENTREPRISE est autorisée
                          
                          // Debug : afficher l'état des autorisations depuis l'API
                          
                          
                          if (isTimerAuthorized === true) {
                           
                            return true;
                          }
                          
                          if (isTimerAuthorized === false) {
                           
                            return false;
                          }
                          
                          // null = en cours de vérification, on masque par sécurité
                         
                          return false;
                        }
                        
                        return true;
                      }).map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`
                              flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors
                              ${isActive 
                                ? 'bg-primary text-primary-foreground' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }
                            `}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
            )}
          </nav>

          {/* Bouton de statut de service */}
          <div className="px-4 py-3 border-t border-border">
            <ServiceStatusButton />
          </div>

          {/* Footer avec info utilisateur */}
          <div className="p-4 border-t border-border">
            {user && (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <AccountSwitcher />
                </div>
                
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <div className="scale-75">
                    <ModeToggle />
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Déconnexion"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de création d'entreprise */}
      <CreateCompanyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCompanyCreated={handleCompanyCreated}
      />
    </>
  );
};

export default Sidebar;
