import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, ShoppingCart, Edit, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

interface Vente {
  _id: string;
  numero: string;
  client: {
    nom: string;
    email?: string;
    telephone?: string;
  };
  produits: Array<{
    nom: string;
    description: string;
    quantite: number;
    prixUnitaire: number;
    total: number;
  }>;
  montantTotal: number;
  dateVente: string;
  statut: string;
  vendeur: {
    firstName: string;
    lastName: string;
  };
  commission?: {
    taux: number;
    montant: number;
  };
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

const VentesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      fetchVentes();
    }
  }, [selectedCompany]);

  const fetchVentes = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ventes?companyId=${selectedCompany?._id}`);
      setVentes(response.data.ventes);
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error);
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
      case 'confirmee': return 'text-green-600 bg-green-100';
      case 'en_attente': return 'text-yellow-600 bg-yellow-100';
      case 'livree': return 'text-blue-600 bg-blue-100';
      case 'annulee': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!selectedCompany) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour voir les ventes.</p>
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
            <h1 className="text-3xl font-bold text-foreground">Ventes</h1>
            <p className="text-muted-foreground">{selectedCompany.name}</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Vente
          </Button>
        </div>

        {loading ? (
          <div className="text-center">Chargement...</div>
        ) : (
          <div className="space-y-4">
            {ventes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune vente trouvée</p>
                </CardContent>
              </Card>
            ) : (
              ventes.map((vente) => (
                <Card key={vente._id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        {vente.numero}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {vente.client.nom} • {formatDate(vente.dateVente)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(vente.statut)}`}>
                        {vente.statut}
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
                        <p className="text-sm text-muted-foreground">Vendeur</p>
                        <p className="font-medium">
                          {vente.vendeur.firstName} {vente.vendeur.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Montant total</p>
                        <p className="font-medium">{formatCurrency(vente.montantTotal)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nombre de produits</p>
                        <p className="font-medium">{vente.produits.length} produit(s)</p>
                      </div>
                      {vente.commission && (
                        <div>
                          <p className="text-sm text-muted-foreground">Commission ({vente.commission.taux}%)</p>
                          <p className="font-medium">{formatCurrency(vente.commission.montant)}</p>
                        </div>
                      )}
                    </div>
                    {vente.produits.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Produits vendus</h4>
                        <div className="space-y-2">
                          {vente.produits.slice(0, 3).map((produit, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span>{produit.nom} (x{produit.quantite})</span>
                              <span className="font-medium">{formatCurrency(produit.total)}</span>
                            </div>
                          ))}
                          {vente.produits.length > 3 && (
                            <p className="text-sm text-muted-foreground">
                              ... et {vente.produits.length - 3} autre(s) produit(s)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
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

export default VentesPage;
