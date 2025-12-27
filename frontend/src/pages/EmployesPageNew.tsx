import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, Users, Edit, Trash2, Mail } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

interface Employe {
  _id: string;
  utilisateur: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
  };
  poste: string;
  salaire: number;
  typeContrat: string;
  dateEmbauche: string;
  statut: string;
  departement: string;
  manager?: {
    firstName: string;
    lastName: string;
  };
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

const EmployesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      fetchEmployes();
    }
  }, [selectedCompany]);

  const fetchEmployes = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/employes?companyId=${selectedCompany?._id}`);
      setEmployes(response.data.employes);
    } catch (error) {
      console.error('Erreur lors de la récupération des employés:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'text-green-600 bg-green-100';
      case 'en_conge': return 'text-blue-600 bg-blue-100';
      case 'suspendu': return 'text-orange-600 bg-orange-100';
      case 'demission': return 'text-red-600 bg-red-100';
      case 'licencie': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!selectedCompany) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour voir les employés.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employés</h1>
            <p className="text-muted-foreground">{selectedCompany.name}</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel Employé
          </Button>
        </div>

        {loading ? (
          <div className="text-center">Chargement...</div>
        ) : (
          <div className="space-y-4">
            {employes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun employé trouvé</p>
                </CardContent>
              </Card>
            ) : (
              employes.map((employe) => (
                <Card key={employe._id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {employe.utilisateur.firstName} {employe.utilisateur.lastName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {employe.poste} • {employe.departement}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(employe.statut)}`}>
                        {employe.statut}
                      </span>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Type de contrat</p>
                        <p className="font-medium">{employe.typeContrat}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Salaire</p>
                        <p className="font-medium">{formatCurrency(employe.salaire)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date d'embauche</p>
                        <p className="font-medium">{formatDate(employe.dateEmbauche)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {employe.utilisateur.email}
                        </p>
                      </div>
                      {employe.manager && (
                        <div>
                          <p className="text-sm text-muted-foreground">Manager</p>
                          <p className="font-medium">
                            {employe.manager.firstName} {employe.manager.lastName}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmployesPage;
