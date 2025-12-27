import React, { useState } from 'react';
// import { useEffect } from 'react'; // Non utilisé actuellement
// import { useAuth } from '../contexts/AuthContext'; // Non utilisé actuellement
import Layout from '../components/Layout';
// import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'; // Non utilisé actuellement
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
// import { Plus, DollarSign, Filter } from 'lucide-react'; // Non utilisé actuellement
import { useCompany } from '../contexts/CompanyContext';
// import api from '../utils/api'; // Non utilisé actuellement

const ChargesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');

  if (!selectedCompany) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour voir les charges.</p>
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
            <h1 className="text-3xl font-bold text-foreground">Charges</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Numéro</span>
              <Input 
                placeholder="Filter par motif..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Colonnes</span>
              <Button variant="outline" size="sm">
                Ajouter
              </Button>
            </div>
          </div>
        </div>

        {/* Tableau des charges */}
        <div className="bg-card rounded-lg border overflow-hidden">
          {/* En-têtes du tableau */}
          <div className="grid grid-cols-5 bg-muted/50 border-b">
            <div className="p-4 font-medium text-sm">
              <div className="flex items-center gap-2">
                Type
                <Button variant="ghost" size="sm" className="p-0 h-4 w-4">
                  ↕
                </Button>
              </div>
            </div>
            <div className="p-4 font-medium text-sm border-l">
              <div className="flex items-center gap-2">
                Motif
                <Button variant="ghost" size="sm" className="p-0 h-4 w-4">
                  ↕
                </Button>
              </div>
            </div>
            <div className="p-4 font-medium text-sm border-l">
              <div className="flex items-center gap-2">
                Date
                <Button variant="ghost" size="sm" className="p-0 h-4 w-4">
                  ↕
                </Button>
              </div>
            </div>
            <div className="p-4 font-medium text-sm border-l">
              <div className="flex items-center gap-2">
                Montant
                <Button variant="ghost" size="sm" className="p-0 h-4 w-4">
                  ↕
                </Button>
              </div>
            </div>
            <div className="p-4 font-medium text-sm border-l">
              <div className="flex items-center gap-2">
                Payé par
                <Button variant="ghost" size="sm" className="p-0 h-4 w-4">
                  ↕
                </Button>
              </div>
            </div>
          </div>

          {/* Message "No results" */}
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No results.</p>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChargesPage;
