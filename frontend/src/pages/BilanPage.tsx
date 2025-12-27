import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { ChevronDown, ChevronUp, Calculator, RefreshCw, ChevronLeft, ChevronRight, Calendar, Download } from 'lucide-react';
import api from '../utils/api';
import { showToast } from '../utils/toastDeduplicator';

interface CalculImpots {
  beneficeBrut: number;
  impotTotal: number;
  tauxEffectif: number;
  beneficeNetApresImpot: number;
  detailCalcul: string;
}

interface DetailSalaire {
  employeId: string;
  nom: string;
  username: string;
  role: string;
  chiffreAffaires: number;
  normeSalariale: number;
  limiteSalaire?: number;
  salaireCalcule: number;
  salaireFinal: number;
  salaireBloque?: boolean;
  montantRetenu: number;
  avances: number;
  primes: number;
}

interface FinancialData {
  chiffreAffaire: {
    salairesEtNotesDeFrais: number;
    salaires: number;
    notesDeFrais: number;
    chargesDeductibles: number;
    coutDeReviens: number;
    chargesRecurrentes: number;
    beneficeBrutImposable: number;
    impots: number;
    beneficeNet: number;
    primes: number;
    dividendes: number;
    tresorerie: number;
    villeGerance: number;
  };
  charges: {
    chargesNonDeductibles: number;
    chargesDeductibles: number;
  };
  ventes: {
    ventesClients: number;
    ventesPartenaires: number;
  };
  detailsSalaires?: DetailSalaire[];
  calculImpots?: CalculImpots;
}

const BilanPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [showSalaryDetails, setShowSalaryDetails] = useState(false);
  const getCurrentWeek = () => {
    const date = new Date();
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());


  useEffect(() => {
    if (selectedCompany) {
      console.log('🔄 Entreprise ou période changée, rechargement du bilan...');
      fetchFinancialData();
    } else {
      console.log('⚠️ Aucune entreprise sélectionnée');
      setFinancialData(null);
    }
  }, [selectedCompany, selectedWeek, selectedYear]);

  // Effet pour forcer le rechargement quand l'ID de l'entreprise change
  useEffect(() => {
    if (selectedCompany?._id) {
      console.log('🏢 Nouvelle entreprise détectée, rechargement forcé du bilan...');
      // Petit délai pour s'assurer que le contexte est bien mis à jour
      setTimeout(() => {
        fetchFinancialData();
      }, 100);
    }
  }, [selectedCompany?._id]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Debug: Afficher l'entreprise sélectionnée
      console.log('🏢 Entreprise sélectionnée pour le bilan:', selectedCompany);
      console.log('🆔 ID entreprise:', selectedCompany?._id);
      console.log('📅 Semaine/Année:', selectedWeek, selectedYear);
      
      if (!selectedCompany?._id) {
        console.warn('⚠️ Aucune entreprise sélectionnée pour le bilan');
        setFinancialData(null);
        return;
      }
      
      const response = await api.get(`/bilans/calculate/${selectedCompany._id}`, {
        params: {
          week: selectedWeek,
          year: selectedYear
        }
      });
      
      console.log('📊 Réponse du serveur bilan:', response.data);
      
      if (response.data.success) {
        setFinancialData(response.data.data);
        console.log('✅ Données financières chargées:', response.data.data);
      } else {
        console.warn('⚠️ Pas de données financières disponibles');
        setFinancialData(null);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données financières:', error);
      showToast.error('Erreur lors du chargement des données financières');
      setFinancialData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return '$' + amount.toString();
  };

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
        {/* Breadcrumb */}
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
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Bilan</span>
              </div>
            </li>
          </ol>
        </nav>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Bilan hebdomadaire</h1>
              <p className="text-muted-foreground">
                Données financières de {selectedCompany?.name || 'l\'entreprise'}
              </p>
            </div>
            
            {/* Sélecteur de semaine */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2">
              <button
                onClick={() => {
                  const newWeek = selectedWeek > 1 ? selectedWeek - 1 : 52;
                  const newYear = selectedWeek > 1 ? selectedYear : selectedYear - 1;
                  setSelectedWeek(newWeek);
                  setSelectedYear(newYear);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Semaine précédente"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              
              <div className="flex items-center gap-1 px-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  S{selectedWeek.toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedYear}
                </span>
              </div>
              
              <button
                onClick={() => {
                  const newWeek = selectedWeek < 53 ? selectedWeek + 1 : 1;
                  const newYear = selectedWeek < 53 ? selectedYear : selectedYear + 1;
                  setSelectedWeek(newWeek);
                  setSelectedYear(newYear);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Semaine suivante"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (!financialData) {
                  showToast.error('Aucune donnée à exporter');
                  return;
                }
                
                // Créer les données d'export
                const exportData = {
                  entreprise: selectedCompany?.name,
                  periode: `Semaine ${selectedWeek} - ${selectedYear}`,
                  dateExport: new Date().toISOString(),
                  donnees: financialData
                };
                
                // Créer et télécharger le fichier JSON
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `bilan-s${selectedWeek}-${selectedYear}-${selectedCompany?.name?.replace(/\s+/g, '-') || 'entreprise'}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showToast.success('Données exportées avec succès');
              }}
              variant="outline"
              size="sm"
              disabled={loading || !financialData}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            
            <Button
              onClick={() => {
                console.log('🔄 Rafraîchissement manuel du bilan...');
                fetchFinancialData();
              }}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Tableau Bilan */}
        {loading ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <p className="text-muted-foreground">Chargement des données financières...</p>
          </div>
        ) : financialData ? (
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/50">
              {/* Colonne Chiffre d'affaire */}
              <div className="p-6 border-r">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Chiffre d'affaire</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-blue-300">Chiffre d'affaires total</span>
                    <span className="text-sm font-bold text-blue-400">{formatCurrency(financialData.ventes.ventesClients)}</span>
                  </div>
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Salaires et notes de frais</span>
                      <span className="text-sm text-cyan-400">{formatCurrency(financialData.chiffreAffaire.salairesEtNotesDeFrais)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {financialData.detailsSalaires && financialData.detailsSalaires.length > 0 && (
                          <Button
                            onClick={() => setShowSalaryDetails(!showSalaryDetails)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            {showSalaryDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                        )}
                        <span className="text-sm text-muted-foreground">Salaires</span>
                      </div>
                      <span className="text-sm text-cyan-400">{formatCurrency(financialData.chiffreAffaire.salaires)}</span>
                    </div>
                    {financialData.detailsSalaires && showSalaryDetails && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg max-h-96 overflow-y-auto">
                        <div className="text-xs font-medium text-foreground mb-3">
                          Détail des salaires par employé ({financialData.detailsSalaires.length})
                        </div>
                        <div className="space-y-2">
                          {financialData.detailsSalaires.map((salaire) => (
                            <div key={salaire.employeId} className="p-2 bg-background/50 rounded border border-border/50">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <div className="text-xs font-medium text-foreground">{salaire.nom}</div>
                                  <div className="text-xs text-muted-foreground">{salaire.role} • {salaire.normeSalariale}%</div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-xs font-medium ${salaire.salaireBloque ? 'text-orange-500' : 'text-green-500'}`}>
                                    {formatCurrency(salaire.salaireFinal)}
                                    {salaire.salaireBloque && ' 🔒'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">CA: {formatCurrency(salaire.chiffreAffaires)}</div>
                                </div>
                              </div>
                              {salaire.salaireBloque && salaire.montantRetenu > 0 && (
                                <div className="text-xs text-orange-500 mt-1 pt-1 border-t border-border/30">
                                  Limite: {formatCurrency(salaire.limiteSalaire || 0)} • Retenu: {formatCurrency(salaire.montantRetenu)}
                                </div>
                              )}
                              {(salaire.primes > 0 || salaire.avances > 0) && (
                                <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/30">
                                  {salaire.primes > 0 && `Primes: +${formatCurrency(salaire.primes)}`}
                                  {salaire.primes > 0 && salaire.avances > 0 && ' • '}
                                  {salaire.avances > 0 && `Avances: -${formatCurrency(salaire.avances)}`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {financialData.detailsSalaires.some(s => s.montantRetenu > 0) && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Total retenu par l'entreprise:</span>
                              <span className="font-medium text-green-500">
                                {formatCurrency(financialData.detailsSalaires.reduce((sum, s) => sum + s.montantRetenu, 0))}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Notes de frais</span>
                      <span className="text-sm">{formatCurrency(financialData.chiffreAffaire.notesDeFrais)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Charges déductibles</span>
                      <span className="text-sm text-green-400">{formatCurrency(financialData.chiffreAffaire.chargesDeductibles)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Coût de reviens</span>
                      <span className="text-sm text-green-400">{formatCurrency(financialData.chiffreAffaire.coutDeReviens)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Charges récurrentes</span>
                      <span className="text-sm">{formatCurrency(financialData.chiffreAffaire.chargesRecurrentes)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Bénéfice brut imposable</span>
                      <span className="text-sm text-green-400">{formatCurrency(financialData.chiffreAffaire.beneficeBrutImposable)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {financialData.calculImpots && (
                          <Button
                            onClick={() => setShowTaxDetails(!showTaxDetails)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            {showTaxDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                        )}
                        <span className="text-sm text-muted-foreground">Impôts</span>
                      </div>
                      <span className="text-sm text-green-400">{formatCurrency(financialData.chiffreAffaire.impots)}</span>
                    </div>
                    {financialData.calculImpots && showTaxDetails && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-foreground">
                            Détail du Calcul d'Impôt (Taux Fixe)
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {financialData.calculImpots.detailCalcul}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Bénéfice Brut:</span>
                            <span className="font-mono">{formatCurrency(financialData.calculImpots.beneficeBrut)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Total Impôts:</span>
                            <span className="font-mono">{formatCurrency(financialData.calculImpots.impotTotal)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium border-t border-border/50 pt-1">
                            <span className="text-foreground">Bénéfice Net:</span>
                            <span className="font-mono text-green-400">{formatCurrency(financialData.calculImpots.beneficeNetApresImpot)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Bénéfice net</span>
                      <span className={`text-sm ${
                        financialData.chiffreAffaire.beneficeNet >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(financialData.chiffreAffaire.beneficeNet)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Primes</span>
                      <span className="text-sm text-green-400">{formatCurrency(financialData.chiffreAffaire.primes)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Dividende</span>
                      <span className="text-sm text-green-400">{formatCurrency(financialData.chiffreAffaire.dividendes)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Trésorerie</span>
                      <span className="text-sm">{formatCurrency(financialData.chiffreAffaire.tresorerie)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Ville</span>
                      <span className="text-sm">{formatCurrency(financialData.chiffreAffaire.villeGerance)}</span>
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
                    <span className="text-sm text-green-400">{formatCurrency(financialData.charges.chargesNonDeductibles)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Charges déductibles</span>
                    <span className="text-sm text-green-400">{formatCurrency(financialData.charges.chargesDeductibles)}</span>
                  </div>
                </div>
              </div>

              {/* Colonne Ventes */}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Ventes</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ventes aux clients</span>
                    <span className="text-sm text-cyan-400">{formatCurrency(financialData.ventes.ventesClients)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ventes aux partenaires</span>
                    <span className="text-sm">{formatCurrency(financialData.ventes.ventesPartenaires)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-12 text-center space-y-4">
            <p className="text-muted-foreground">Aucune donnée financière disponible</p>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Entreprise sélectionnée : <strong>{selectedCompany?.name || 'Aucune'}</strong></p>
              <p>Période : Semaine {selectedWeek} de {selectedYear}</p>
              <p className="text-xs">
                Note: Le 28/09/2025 correspond à la semaine {Math.ceil((new Date(2025, 8, 28).getTime() - new Date(2025, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))} de 2025
              </p>
              <p className="text-xs">
                Vérifiez que vous avez des ventes, charges ou salaires enregistrés pour cette entreprise et cette période.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  console.log('🔄 Tentative de rechargement...');
                  fetchFinancialData();
                }}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
              <Button
                onClick={async () => {
                  console.log('🔍 Diagnostic des ventes...');
                  try {
                    const response = await api.get('/bilans/debug-ventes');
                    console.log('📊 Diagnostic des ventes:', response.data);
                    showToast.success('Diagnostic affiché dans la console');
                  } catch (error) {
                    console.error('❌ Erreur diagnostic:', error);
                    showToast.error('Erreur lors du diagnostic');
                  }
                }}
                variant="secondary"
                size="sm"
              >
                🔍 Diagnostic
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BilanPage;
