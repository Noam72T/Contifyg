import React, { useState, useEffect } from 'react';
import { Building, ChevronDown, Check, Eye, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import api from '../utils/api';

interface Company {
  _id: string;
  name: string;
  description?: string;
  category: string;
  owner: string;
  createdAt: string;
  logo?: string;
  compteBancaire?: string;
  pdg?: string;
  nombreEmployes?: number;
}

const CompanySelectorSimple: React.FC = () => {
  const { user } = useAuth();
  const { selectedCompany, setSelectedCompany } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  // Vérifier si l'utilisateur est un technicien
  const isTechnician = user?.systemRole === 'Technicien';

  // Charger toutes les entreprises pour les techniciens
  useEffect(() => {
    if (isTechnician) {
      fetchAllCompanies();
    }
  }, [isTechnician]);

  const fetchAllCompanies = async () => {
    try {
      setLoading(true);
    
      const response = await api.get('/companies');
      
      if (response.data.success) {
        const companiesData = response.data.companies || []
        setCompanies(companiesData);
      } else {
        console.error('API returned success: false');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des entreprises:', error);
    } finally {
      setLoading(false);
    }
  };

  // Si ce n'est pas un technicien, afficher juste le nom
  if (!isTechnician) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600">
        <Building className="h-4 w-4 text-blue-400" />
        <span className="font-medium text-white">Simplix</span>
      </div>
    );
  }

  const handleCompanySelect = (company: Company | null) => {
    setSelectedCompany(company);
    setIsOpen(false);
  };

  // Grouper les entreprises par catégorie
  const groupedCompanies = companies.reduce((acc, company) => {
    const category = company.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(company);
    return acc;
  }, {} as Record<string, Company[]>);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-600 min-w-[200px] w-full justify-between"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Building className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <span className="font-medium text-white truncate">
            {selectedCompany ? selectedCompany.name : 'Sélectionner une entreprise'}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-gray-800 rounded-lg shadow-xl border border-gray-600 z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-center text-gray-400">
              Chargement des entreprises...
            </div>
          ) : (
            <>
              {/* Option "Voir toutes" pour les techniciens */}
              <button
                onClick={() => handleCompanySelect(null)}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-600 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-gray-400" />
                  <span className="text-white">Toutes les entreprises</span>
                </div>
                {!selectedCompany && <Check className="h-4 w-4 text-blue-400" />}
              </button>

              {/* Afficher les entreprises groupées par catégorie */}
              {Object.entries(groupedCompanies).map(([category, categoryCompanies]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-900">
                    {category}
                  </div>
                  {categoryCompanies.map((company) => (
                    <button
                      key={company._id}
                      onClick={() => handleCompanySelect(company)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{company.name}</div>
                        {company.description && (
                          <div className="text-sm text-gray-400 truncate">{company.description}</div>
                        )}
                      </div>
                      {selectedCompany?._id === company._id && <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              ))}

              {companies.length === 0 && !loading && (
                <div className="px-4 py-3 text-center text-gray-400">
                  Aucune entreprise trouvée
                </div>
              )}

              {/* Option pour créer une nouvelle entreprise */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  alert('Créer une nouvelle entreprise (fonctionnalité à venir)');
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-t border-gray-600 flex items-center space-x-2 text-green-400"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">Ajouter une entreprise</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanySelectorSimple;
