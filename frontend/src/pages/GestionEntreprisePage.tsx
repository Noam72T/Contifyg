import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Edit3, Save, X, Upload, Building, Settings, Calculator } from 'lucide-react';
import Layout from '../components/Layout';
import { useUserPermissions } from '../hooks/useUserPermissions';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface TaxDistribution {
  primes: number;
  dividendes: number;
  tresorerie: number;
  ville: number;
}

interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

const GestionEntreprisePage: React.FC = () => {
  const { selectedCompany, setSelectedCompany, fetchCompanyData } = useCompany();
  const { hasPermission, canViewCategory } = useUserPermissions();
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [showTaxBracketsModal, setShowTaxBracketsModal] = useState(false);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([
    { min: 0, max: 15000, rate: 5 },
    { min: 15001, max: 50000, rate: 10 },
    { min: 50001, max: 100000, rate: 20 },
    { min: 100001, max: 300000, rate: 30 },
    { min: 300001, max: 500000, rate: 40 },
    { min: 500001, max: null, rate: 50 }
  ]);

  // Fonction de compression d'image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculer les nouvelles dimensions (max 800px de largeur)
        const maxWidth = 800;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Dessiner l'image redimensionnée
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convertir en base64 avec compression (qualité 0.8)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => {
        // En cas d'erreur, utiliser l'image originale
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };
  const [taxDistribution, setTaxDistribution] = useState<TaxDistribution>({
    primes: 10,
    dividendes: 30,
    tresorerie: 60,
    ville: 0
  });
  const [pdgInfo, setPdgInfo] = useState<{firstName: string, lastName: string} | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(false);

  // Vérifier les permissions
  const canViewCompany = canViewCategory('GESTION') || hasPermission('VIEW_GESTION_CATEGORY');
  const canManageCompany = hasPermission('MANAGE_COMPANY');
  
  // États pour l'édition
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    pdg: '',
    compteBancaire: '',
    nombreEmployes: 0,
    logo: ''
  });

  // Charger les données de l'entreprise
  const loadCompanyData = async () => {
    if (!selectedCompany) return;
    
    try {
      setLoadingData(true);
      
      // Récupérer les employés pour compter et trouver le PDG
      const employeesResponse = await api.get(`/companies/${selectedCompany._id}/employees`);
      if (employeesResponse.data.success) {
        const employees = employeesResponse.data.users;
        setEmployeeCount(employees.length);
        
        // Trouver le PDG (utilisateur avec rôle PDG)
        const pdg = employees.find((emp: any) => 
          emp.role?.nom?.toLowerCase().includes('pdg')
        );
        
        if (pdg) {
          setPdgInfo({ firstName: pdg.firstName, lastName: pdg.lastName });
        } else {
          setPdgInfo(null);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Forcer la synchronisation des données fraîches à chaque chargement de la page
  useEffect(() => {
    if (selectedCompany?._id) {
      // Recharger les données fraîches depuis la BDD pour s'assurer d'avoir la dernière version
      fetchCompanyData(selectedCompany._id);
    }
  }, []); // Se déclenche seulement au montage du composant

  // Mettre à jour editData quand selectedCompany change
  useEffect(() => {
    if (selectedCompany) {
      setEditData({
        name: selectedCompany.name || '',
        pdg: selectedCompany.pdg || '',
        compteBancaire: selectedCompany.compteBancaire || '',
        nombreEmployes: selectedCompany.nombreEmployes || 0,
        logo: selectedCompany.logo || ''
      });
      
      // Charger les données de répartition des taxes depuis la base de données
      const companyTaxDistribution = (selectedCompany as any).taxDistribution;
      if (companyTaxDistribution) {
        setTaxDistribution({
          primes: companyTaxDistribution.primes || 10,
          dividendes: companyTaxDistribution.dividendes || 30,
          tresorerie: companyTaxDistribution.tresorerie || 60,
          ville: companyTaxDistribution.ville || 0
        });
      }
      
      // Charger les paliers d'imposition depuis la base de données
      const companyTaxBrackets = (selectedCompany as any).taxBrackets;
      if (companyTaxBrackets && companyTaxBrackets.length > 0) {
        setTaxBrackets(companyTaxBrackets);
      }
      
      // Charger les données dynamiques
      loadCompanyData();
    }
  }, [selectedCompany]);
  
  const handleSave = async () => {
    if (!canManageCompany) {
      toast.error('Vous n\'avez pas les permissions pour modifier les informations de l\'entreprise');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/companies/${selectedCompany?._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editData.name,
          pdg: editData.pdg,
          compteBancaire: editData.compteBancaire,
          nombreEmployes: parseInt(editData.nombreEmployes.toString()) || 0,
          logo: editData.logo
        })
      });

      if (response.ok) {
        toast.success('Informations de l\'entreprise sauvegardées avec succès');
        setIsEditing(false);
        
        // Mettre à jour le contexte de l'entreprise
        if (selectedCompany) {
          const updatedCompany = {
            ...selectedCompany,
            name: editData.name,
            pdg: editData.pdg,
            compteBancaire: editData.compteBancaire,
            nombreEmployes: parseInt(editData.nombreEmployes.toString()) || 0,
            logo: editData.logo
          };
          
          setSelectedCompany(updatedCompany);
        }
        
        // Forcer la synchronisation des données après sauvegarde
        setTimeout(async () => {
          if (selectedCompany?._id) {
            await fetchCompanyData(selectedCompany._id);
          }
        }, 500); // Délai de 0.5 seconde pour laisser le temps à la BDD de se mettre à jour
      } else {
        const error = await response.json();
        console.error('Erreur lors de la sauvegarde:', error);
        toast.error('Erreur lors de la sauvegarde des données');
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      toast.error('Erreur de connexion au serveur');
    }
  };
  
  const handleCancel = () => {
    if (selectedCompany) {
      setEditData({
        name: selectedCompany.name || '',
        pdg: selectedCompany.pdg || '',
        compteBancaire: selectedCompany.compteBancaire || '',
        nombreEmployes: selectedCompany.nombreEmployes || 0,
        logo: selectedCompany.logo || ''
      });
    }
    setIsEditing(false);
  };

  // Fonctions de gestion des paliers d'imposition
  const handleAddBracket = () => {
    const lastBracket = taxBrackets[taxBrackets.length - 1];
    const newMin = lastBracket.max ? lastBracket.max + 1 : 0;
    setTaxBrackets([...taxBrackets, { min: newMin, max: null, rate: 0 }]);
  };

  const handleRemoveBracket = (index: number) => {
    if (taxBrackets.length <= 1) {
      toast.error('Il doit y avoir au moins un palier d\'imposition');
      return;
    }
    const newBrackets = taxBrackets.filter((_, i) => i !== index);
    setTaxBrackets(newBrackets);
  };

  const handleBracketChange = (index: number, field: keyof TaxBracket, value: number | null) => {
    const newBrackets = [...taxBrackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };
    setTaxBrackets(newBrackets);
  };

  const handleSaveTaxBrackets = async () => {
    if (!canManageCompany) {
      toast.error('Vous n\'avez pas les permissions pour modifier les informations de l\'entreprise');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/companies/${selectedCompany?._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ taxBrackets })
      });

      if (response.ok) {
        setShowTaxBracketsModal(false);
        if (selectedCompany) {
          setSelectedCompany({
            ...selectedCompany,
            taxBrackets: taxBrackets
          } as any);
        }
        toast.success('Paliers d\'imposition sauvegardés avec succès !');
      } else {
        const error = await response.json();
        console.error('Erreur lors de la sauvegarde:', error);
        toast.error('Erreur lors de la sauvegarde des paliers d\'imposition');
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      toast.error('Erreur de connexion au serveur');
    }
  };

  const handleSaveTaxDistribution = async () => {
    if (!canManageCompany) {
      toast.error('Vous n\'avez pas les permissions pour modifier les informations de l\'entreprise');
      return;
    }
    
    // Vérifier que la somme est égale à 100%
    const total = taxDistribution.primes + taxDistribution.dividendes + taxDistribution.tresorerie + taxDistribution.ville;
    if (total !== 100) {
      toast.error('La somme des pourcentages doit être égale à 100%');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/companies/${selectedCompany?._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taxDistribution: taxDistribution
        })
      });

      if (response.ok) {
        setShowTaxForm(false);
        // Mettre à jour le contexte de l'entreprise
        if (selectedCompany) {
          setSelectedCompany({
            ...selectedCompany,
            taxDistribution: taxDistribution
          } as any);
        }
        toast.success('Répartition des taxes sauvegardée avec succès !');
      } else {
        const error = await response.json();
        console.error('Erreur lors de la sauvegarde:', error);
        toast.error('Erreur lors de la sauvegarde de la répartition des taxes');
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      toast.error('Erreur de connexion au serveur');
    }
  };

  if (!canViewCompany) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions pour gérer l'entreprise.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!selectedCompany) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Veuillez sélectionner une entreprise pour gérer les entreprises.</p>
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
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Gestion Entreprise</span>
              </div>
            </li>
          </ol>
        </nav>
       
        <div className="space-y-8">
          {/* En-tête simplifié */}
          <div className="rounded-lg bg-card border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Gestion de l'entreprise</h1>
                <p className="text-muted-foreground mt-1">Modifiez les informations de votre entreprise</p>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <Button 
                      onClick={() => setIsEditing(true)} 
                      disabled={!canManageCompany}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                    <Button 
                      onClick={() => setShowTaxForm(true)} 
                      variant="outline"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Répartition des taxes
                    </Button>
                    <Button 
                      onClick={() => setShowTaxBracketsModal(true)} 
                      variant="outline"
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Paliers d'imposition
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={handleCancel} 
                      variant="outline"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Sauvegarder
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Formulaire */}
          <div className="bg-card rounded-lg border p-6">
            <div className="space-y-6">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Logo de l'entreprise</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center border">
                    {editData.logo ? (
                      <img src={editData.logo} alt="Logo" className="w-16 h-16 rounded object-cover" />
                    ) : (
                      <Building className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  {isEditing && (
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            if (!file.type.startsWith('image/')) {
                              toast.error('Veuillez sélectionner un fichier image valide');
                              return;
                            }

                            // Message informatif pour les gros fichiers
                            if (file.size > 10 * 1024 * 1024) { // 10MB
                              toast.loading('Image volumineuse détectée, compression en cours...');
                            }

                            try {
                              // Compresser l'image
                              const compressedImage = await compressImage(file);
                              setEditData({...editData, logo: compressedImage});
                              toast.success('Logo uploadé et optimisé avec succès');
                            } catch (error) {
                              console.error('Erreur lors de la compression:', error);
                              toast.error('Erreur lors du traitement de l\'image');
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {editData.logo ? 'Changer le logo' : 'Ajouter un logo'}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Nom de l'entreprise */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nom de l'entreprise</label>
                {isEditing ? (
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="bg-background border-border text-foreground"
                    placeholder="Nom de l'entreprise"
                  />
                ) : (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-foreground">{editData.name}</p>
                  </div>
                )}
              </div>
              
              {/* PDG */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">PDG</label>
                <div className="bg-muted rounded-lg p-3">
                  {loadingData ? (
                    <p className="text-muted-foreground">Chargement...</p>
                  ) : pdgInfo ? (
                    <p className="text-foreground">{pdgInfo.firstName} {pdgInfo.lastName}</p>
                  ) : (
                    <p className="text-muted-foreground">Aucun PDG assigné</p>
                  )}
                </div>
              </div>
              
              {/* Compte bancaire */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Compte bancaire</label>
                {isEditing ? (
                  <Input
                    value={editData.compteBancaire}
                    onChange={(e) => setEditData({...editData, compteBancaire: e.target.value})}
                    className="bg-background border-border text-foreground font-mono"
                    placeholder="Numéro de compte bancaire"
                  />
                ) : (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-foreground font-mono">{editData.compteBancaire || 'Aucun compte bancaire'}</p>
                  </div>
                )}
              </div>
              
              {/* Nombre d'employés */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nombre d'employés</label>
                <div className="bg-muted rounded-lg p-3">
                  {loadingData ? (
                    <p className="text-muted-foreground">Chargement...</p>
                  ) : (
                    <p className="text-foreground">
                      {employeeCount} {employeeCount <= 1 ? 'employé' : 'employés'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de répartition des taxes */}
        {showTaxForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-2xl mx-4 border shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Répartition des taxes</h3>
                <Button
                  onClick={() => setShowTaxForm(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Assurez-vous que la somme totale des taux est égale à 100%.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">% Primes</label>
                    <Input
                      type="number"
                      value={taxDistribution.primes}
                      onChange={(e) => setTaxDistribution({...taxDistribution, primes: Number(e.target.value)})}
                      className="bg-background border-border text-foreground"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">% Trésorerie</label>
                    <Input
                      type="number"
                      value={taxDistribution.tresorerie}
                      onChange={(e) => setTaxDistribution({...taxDistribution, tresorerie: Number(e.target.value)})}
                      className="bg-background border-border text-foreground"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">% Dividendes</label>
                    <Input
                      type="number"
                      value={taxDistribution.dividendes}
                      onChange={(e) => setTaxDistribution({...taxDistribution, dividendes: Number(e.target.value)})}
                      className="bg-background border-border text-foreground"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">% Ville (si gérance)</label>
                    <Input
                      type="number"
                      value={taxDistribution.ville}
                      onChange={(e) => setTaxDistribution({...taxDistribution, ville: Number(e.target.value)})}
                      className="bg-background border-border text-foreground"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Total: {taxDistribution.primes + taxDistribution.dividendes + taxDistribution.tresorerie + taxDistribution.ville}%</p>
                {(taxDistribution.primes + taxDistribution.dividendes + taxDistribution.tresorerie + taxDistribution.ville) !== 100 && (
                  <p className="text-sm text-destructive mt-1">⚠️ La somme doit être égale à 100%</p>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  onClick={() => setShowTaxForm(false)}
                  variant="outline"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveTaxDistribution}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={(taxDistribution.primes + taxDistribution.dividendes + taxDistribution.tresorerie + taxDistribution.ville) !== 100}
                >
                  Sauvegarder
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de configuration des paliers d'imposition */}
        {showTaxBracketsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg p-6 w-full max-w-4xl mx-4 border shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Configuration des Paliers d'Imposition</h3>
                  <p className="text-sm text-muted-foreground mt-1">Configurez les paliers d'imposition progressifs pour votre entreprise.</p>
                </div>
                <Button
                  onClick={() => setShowTaxBracketsModal(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Tableau des paliers actuels */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4">Tableau des Paliers Actuels</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-3 text-left text-sm font-medium">Tranche</th>
                        <th className="p-3 text-left text-sm font-medium">De</th>
                        <th className="p-3 text-left text-sm font-medium">À</th>
                        <th className="p-3 text-left text-sm font-medium">Taux</th>
                        <th className="p-3 text-center text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxBrackets.map((bracket, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="p-3 text-sm font-medium">Palier {index + 1}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={bracket.min}
                              onChange={(e) => handleBracketChange(index, 'min', parseInt(e.target.value) || 0)}
                              className="w-32 bg-background"
                              min="0"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="text"
                              value={bracket.max === null ? 'Illimité' : bracket.max}
                              onChange={(e) => {
                                const value = e.target.value.toLowerCase();
                                if (value === 'illimité' || value === 'illimite' || value === '') {
                                  handleBracketChange(index, 'max', null);
                                } else {
                                  handleBracketChange(index, 'max', parseInt(e.target.value) || 0);
                                }
                              }}
                              className="w-32 bg-background"
                              placeholder="Illimité"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={bracket.rate}
                                onChange={(e) => handleBracketChange(index, 'rate', parseInt(e.target.value) || 0)}
                                className="w-20 bg-background"
                                min="0"
                                max="100"
                              />
                              <span className="text-sm">%</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              onClick={() => handleRemoveBracket(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <Button
                  onClick={handleAddBracket}
                  variant="outline"
                  className="mt-4"
                >
                  + Ajouter un palier
                </Button>
              </div>

              {/* Aperçu des calculs */}
              <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-semibold mb-3">Aperçu des Calculs</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {taxBrackets.map((bracket, index) => (
                    <div key={index} className="flex justify-between">
                      <span>
                        {bracket.min.toLocaleString()}$ à {bracket.max === null ? 'illimité' : `${bracket.max.toLocaleString()}$`}
                      </span>
                      <span className="font-medium">{bracket.rate}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setShowTaxBracketsModal(false)}
                  variant="outline"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveTaxBrackets}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Sauvegarder les Paliers
                </Button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </Layout>
  );
};

export default GestionEntreprisePage;
