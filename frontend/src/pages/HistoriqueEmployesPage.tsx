import React, { useState, useEffect } from 'react';
import { Clock, User, Calendar, Phone, CreditCard, MessageCircle, AlertTriangle } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { useUserPermissions } from '../hooks/useUserPermissions';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface EmployeHistorique {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  compteBancaire?: string;
  discordId?: string;
  discordUsername?: string;
  avatar?: string; // Photo de profil de l'utilisateur
  roleName?: string;
  dateRecrutement: string;
  dateLicenciement: string;
  motifLicenciement?: string;
  licenciePar?: {
    firstName: string;
    lastName: string;
  };
  originalUserId?: string;
  company?: string;
}

const HistoriqueEmployesPage: React.FC = () => {
  const { selectedCompanyId } = useCompany();
  const { hasPermission } = useUserPermissions();
  const [historique, setHistorique] = useState<EmployeHistorique[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Utiliser une valeur fixe comme les autres pages

  useEffect(() => {
    if (selectedCompanyId) {
      fetchHistorique();
    }
  }, [selectedCompanyId]);

  const fetchHistorique = async () => {
    try {
      setLoading(true);
      
      
      // Passer explicitement le companyId en paramètre
      const response = await api.get(`/users/historique?companyId=${selectedCompanyId}`);
      
      
      
      if (response.data.success) {
        setHistorique(response.data.historique);
        
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération de l\'historique:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filtrer et dédupliquer l'historique
  const uniqueHistorique = historique.reduce((acc, employe) => {
    // Créer une clé unique basée sur l'utilisateur original et l'entreprise
    const key = `${employe.originalUserId || employe._id}-${employe.company}`;
    
    // Si on n'a pas encore cet employé, ou si cette entrée est plus récente
    if (!acc[key] || new Date(employe.dateLicenciement) > new Date(acc[key].dateLicenciement)) {
      acc[key] = employe;
    }
    
    return acc;
  }, {} as Record<string, EmployeHistorique>);

  const filteredHistorique = Object.values(uniqueHistorique).filter(employe =>
    `${employe.firstName} ${employe.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employe.email && employe.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employe.roleName && employe.roleName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.dateLicenciement).getTime() - new Date(a.dateLicenciement).getTime());

  // Calculs de pagination
  const totalItems = filteredHistorique.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredHistorique.slice(startIndex, endIndex);

  // Réinitialiser la page lors de la recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);


  if (!hasPermission('MANAGE_EMPLOYES')) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Accès restreint
            </h3>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions pour voir l'historique des employés.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
      <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
                Tableau de bord
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-3 h-3 text-muted-foreground mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Historique des employés</span>
              </div>
            </li>
          </ol>
        </nav>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Historique des Employés</h1>
            <p className="text-muted-foreground">
              Liste des employés licenciés de l'entreprise
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{totalItems} employé(s) licencié(s)</span>
            {totalPages > 1 && (
              <span className="text-xs">
                (Page {currentPage} sur {totalPages})
              </span>
            )}
          </div>
        </div>

        {/* Barre de recherche et options */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par nom, email ou rôle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
            />
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-background border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Chargement...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucun employé licencié
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Aucun résultat pour votre recherche.' : 'Aucun employé n\'a encore été licencié.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Employé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Licenciement
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentItems.map((employe) => (
                    <tr key={employe._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            {employe.avatar ? (
                              <img 
                                src={employe.avatar} 
                                alt={`${employe.firstName} ${employe.lastName}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // En cas d'erreur de chargement, cacher l'image et afficher l'icône
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.style.display = 'none';
                                  const sibling = target.nextElementSibling as HTMLElement;
                                  if (sibling) {
                                    sibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <User 
                              className={`h-5 w-5 text-red-600 dark:text-red-400 ${employe.avatar ? 'hidden' : 'flex'}`}
                            />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {employe.firstName} {employe.lastName}
                            </div>
                            {employe.discordId && (
                              <div className="text-sm text-muted-foreground">
                                ID Discord: {employe.discordId}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          {employe.roleName || 'Rôle non défini'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {employe.phoneNumber && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Phone className="h-3 w-3 mr-2" />
                              {employe.phoneNumber}
                            </div>
                          )}
                          {employe.compteBancaire && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <CreditCard className="h-3 w-3 mr-2" />
                              {employe.compteBancaire.slice(0, 8)}...
                            </div>
                          )}
                          {employe.discordUsername && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MessageCircle className="h-3 w-3 mr-2" />
                              {employe.discordUsername}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-3 w-3 mr-2 text-green-500" />
                            <span className="font-medium text-green-700 dark:text-green-400">Recruté:</span>
                            <span className="ml-2 text-foreground">{formatDate(employe.dateRecrutement)}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-3 w-3 mr-2 text-red-500" />
                            <span className="font-medium text-red-700 dark:text-red-400">Licencié:</span>
                            <span className="ml-2 text-foreground">{formatDate(employe.dateLicenciement)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Licencié par:</span>
                            <div className="text-foreground font-medium">
                              {employe.licenciePar ? `${employe.licenciePar.firstName} ${employe.licenciePar.lastName}` : 'Inconnu'}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Motif:</span>
                            <div className="text-foreground">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                {employe.motifLicenciement || 'Non spécifié'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
        />
      </div>
    </Layout>
  );
};

export default HistoriqueEmployesPage;
