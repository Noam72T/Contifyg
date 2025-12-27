import React from 'react';
import { useCompany } from '../contexts/CompanyContext';
import Layout from '../components/Layout';

const BilanPage: React.FC = () => {
  const { selectedCompany } = useCompany();

  if (!selectedCompany) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour voir les bilans.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bilan hebdomadaire S33 2025</h1>
            <p className="text-muted-foreground">Numéro</p>
          </div>
        </div>

        {/* Tableau Bilan */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="grid grid-cols-3 bg-muted/50">
            {/* Colonne Chiffre d'affaire */}
            <div className="p-6 border-r">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">Chiffre d'affaire</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Salaires et notes de frais</span>
                  <span className="text-sm">$0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Salaires</span>
                  <span className="text-sm">$0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Notes de frais</span>
                  <span className="text-sm">$0</span>
                </div>
                <div className="border-t pt-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Charges déductibles</span>
                    <span className="text-sm">$0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Coût de reviens</span>
                    <span className="text-sm">$0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Charges récurrentes</span>
                    <span className="text-sm">$0</span>
                  </div>
                </div>
                <div className="border-t pt-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bénéfice brut imposable</span>
                    <span className="text-sm">$0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Impôts</span>
                    <span className="text-sm text-blue-400">$1</span>
                  </div>
                </div>
                <div className="border-t pt-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bénéfice net</span>
                    <span className="text-sm text-red-400">-$1</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Primes</span>
                    <span className="text-sm">$0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Dividende</span>
                    <span className="text-sm">$0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Trésorerie</span>
                    <span className="text-sm">$0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne Charges */}
            <div className="p-6 border-r">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">Charges</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Charges non déductibles</span>
                  <span className="text-sm">$0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Charges déductibles</span>
                  <span className="text-sm">$0</span>
                </div>
              </div>
            </div>

            {/* Colonne Ventes */}
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">Ventes</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ventes aux clients</span>
                  <span className="text-sm">$0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ventes aux partenaires</span>
                  <span className="text-sm">$0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BilanPage;
