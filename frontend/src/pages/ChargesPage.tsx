import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Receipt, Edit, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import WeekFilter from '../components/WeekFilter';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Charge {
  _id: string;
  nom: string;
  description?: string;
  montant: number;
  categorie: string;
  dateCharge: string;
  recurrente: boolean;
  frequence?: string;
  statut: string;
  deductibilite: string;
  pourcentageDeduction?: number;
  facture?: {
    numero?: string;
    fournisseur?: string;
    dateEcheance?: string;
  };
  createdBy: string;
  createdAt: string;
}

const ChargesPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const date = new Date();
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    // Jeudi de cette semaine
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    // Premier jeudi de janvier = semaine 1
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    montant: '',
    categorie: '',
    dateCharge: '',
    recurrente: false,
    frequence: '',
    deductibilite: 'deductible',
    pourcentageDeduction: '',
    facture: {
      numero: '',
      fournisseur: '',
      dateEcheance: ''
    }
  });


  useEffect(() => {
    if (selectedCompany) {
      fetchCharges();
    }
  }, [selectedCompany]);

  const fetchCharges = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/charges?companyId=${selectedCompany?._id}`);
      if (response.data.success) {
        setCharges(response.data.charges);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des charges:', error);
      toast.error('Erreur lors du chargement des charges');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany || !user) {
      toast.error('Entreprise ou utilisateur non sélectionné');
      return;
    }

    try {
      const chargeData = {
        ...formData,
        montant: parseFloat(formData.montant),
        pourcentageDeduction: formData.pourcentageDeduction ? parseFloat(formData.pourcentageDeduction) : undefined,
        company: selectedCompany._id,
        createdBy: user._id
      };

      let response;
      if (editingCharge) {
        response = await api.put(`/charges/${editingCharge._id}`, chargeData);
        toast.success('Charge modifiée avec succès');
      } else {
        response = await api.post('/charges', chargeData);
        toast.success('Charge créée avec succès');
      }

      if (response.data.success) {
        fetchCharges();
        resetForm();
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (charge: Charge) => {
    setEditingCharge(charge);
    setFormData({
      nom: charge.nom,
      description: charge.description || '',
      montant: charge.montant.toString(),
      categorie: charge.categorie,
      dateCharge: charge.dateCharge.split('T')[0],
      recurrente: charge.recurrente,
      frequence: charge.frequence || '',
      deductibilite: charge.deductibilite,
      pourcentageDeduction: charge.pourcentageDeduction?.toString() || '',
      facture: {
        numero: charge.facture?.numero || '',
        fournisseur: charge.facture?.fournisseur || '',
        dateEcheance: charge.facture?.dateEcheance?.split('T')[0] || ''
      }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette charge ?')) {
      return;
    }

    try {
      await api.delete(`/charges/${id}`);
      toast.success('Charge supprimée avec succès');
      fetchCharges();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    // Calculer la date de début de la semaine courante (lundi)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Dimanche = 0, donc -6 pour aller au lundi précédent
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const currentWeekDate = monday.toISOString().split('T')[0];

    setFormData({
      nom: '',
      description: '',
      montant: '',
      categorie: '',
      dateCharge: currentWeekDate, // Date automatique de la semaine courante
      recurrente: false,
      frequence: '',
      deductibilite: 'deductible',
      pourcentageDeduction: '',
      facture: {
        numero: '',
        fournisseur: '',
        dateEcheance: ''
      }
    });
    setEditingCharge(null);
  };

  const formatCurrency = (amount: number) => {
    return '$' + amount.toString();
  };

  const getDeductibilityBadge = (deductibilite: string, pourcentage?: number) => {
    switch (deductibilite) {
      case 'deductible':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-500 text-white">Déductible</span>;
      case 'non_deductible':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-500 text-white">Non déductible</span>;
      case 'partiellement_deductible':
        return <span className="px-2 py-1 rounded-full text-xs bg-orange-500 text-white">Partiel ({pourcentage}%)</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-500 text-white">-</span>;
    }
  };


  // Fonction pour calculer le numéro de semaine
  const getWeekNumber = (date: Date) => {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const filteredCharges = charges.filter(charge => {
    const matchesSearch = charge.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.categorie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.facture?.fournisseur?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrer par semaine sélectionnée
    const chargeDate = new Date(charge.dateCharge);
    const chargeWeek = getWeekNumber(chargeDate);
    const chargeYear = chargeDate.getFullYear();
    
    const matchesWeek = chargeWeek === selectedWeek && chargeYear === selectedYear;
    
    return matchesSearch && matchesWeek;
  });

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
                <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Charges</span>
              </div>
            </li>
          </ol>
        </nav>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Charges</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Recherche</span>
                <Input 
                  placeholder="Filter par motif..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              
              {/* Filtre par semaine */}
              <WeekFilter
                selectedWeek={selectedWeek}
                selectedYear={selectedYear}
                onWeekChange={(week, year) => {
                  setSelectedWeek(week);
                  setSelectedYear(year);
                }}
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-cyan-600 hover:bg-cyan-700 text-black">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une charge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCharge ? 'Modifier la charge' : 'Ajouter une nouvelle charge'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nom" className="mb-2 block">Nom de la charge *</Label>
                      <Input
                        id="nom"
                        value={formData.nom}
                        onChange={(e) => setFormData({...formData, nom: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="categorie" className="mb-2 block">Raison *</Label>
                      <Input
                        id="categorie"
                        value={formData.categorie}
                        onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                        placeholder="Entrez la raison de la charge"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="mb-2 block">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="montant" className="mb-2 block">Montant *</Label>
                      <Input
                        id="montant"
                        type="number"
                        step="0.01"
                        value={formData.montant}
                        onChange={(e) => setFormData({...formData, montant: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateCharge" className="mb-2 block">Date de la charge *</Label>
                      <Input
                        id="dateCharge"
                        type="date"
                        value={formData.dateCharge}
                        onChange={(e) => setFormData({...formData, dateCharge: e.target.value})}
                        required
                        disabled={!editingCharge} // Désactivé pour les nouvelles charges
                        className={!editingCharge ? "bg-muted text-muted-foreground" : ""}
                      />
                      {!editingCharge && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Date automatique de la semaine courante
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="mb-2 block">Déductibilité fiscale *</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="deductible"
                          name="deductibilite"
                          value="deductible"
                          checked={formData.deductibilite === 'deductible'}
                          onChange={(e) => setFormData({...formData, deductibilite: e.target.value})}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="deductible" className="cursor-pointer">Déductible</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="non_deductible"
                          name="deductibilite"
                          value="non_deductible"
                          checked={formData.deductibilite === 'non_deductible'}
                          onChange={(e) => setFormData({...formData, deductibilite: e.target.value})}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="non_deductible" className="cursor-pointer">Non déductible</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="partiellement_deductible"
                          name="deductibilite"
                          value="partiellement_deductible"
                          checked={formData.deductibilite === 'partiellement_deductible'}
                          onChange={(e) => setFormData({...formData, deductibilite: e.target.value})}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="partiellement_deductible" className="cursor-pointer">Partiellement déductible</Label>
                      </div>
                    </div>
                    
                    {formData.deductibilite === 'partiellement_deductible' && (
                      <div className="mt-4">
                        <Label htmlFor="pourcentageDeduction" className="mb-2 block">Pourcentage de déduction (%)</Label>
                        <Input
                          id="pourcentageDeduction"
                          type="number"
                          min="0"
                          max="100"
                          value={formData.pourcentageDeduction}
                          onChange={(e) => setFormData({...formData, pourcentageDeduction: e.target.value})}
                          required
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>



                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                      {editingCharge ? 'Modifier' : 'Créer'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tableau des charges */}
        <div className="bg-card rounded-lg border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">Chargement des charges...</p>
            </div>
          ) : filteredCharges.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Aucune charge trouvée</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Essayez de modifier vos critères de recherche' : 'Commencez par ajouter votre première charge'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Nom</th>
                    <th className="text-left p-4 font-medium text-sm">Raison</th>
                    <th className="text-left p-4 font-medium text-sm">Montant</th>
                    <th className="text-left p-4 font-medium text-sm">Date</th>
                    <th className="text-left p-4 font-medium text-sm">Déductibilité</th>
                    <th className="text-left p-4 font-medium text-sm">Fournisseur</th>
                    <th className="text-left p-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCharges.map((charge) => (
                    <tr key={charge._id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{charge.nom}</p>
                          {charge.description && (
                            <p className="text-sm text-muted-foreground">{charge.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {charge.categorie}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-green-600">
                          {formatCurrency(charge.montant)}
                        </span>
                        {charge.recurrente && (
                          <p className="text-xs text-muted-foreground">
                            Récurrent ({charge.frequence})
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {new Date(charge.dateCharge).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-4">
                        {getDeductibilityBadge(charge.deductibilite, charge.pourcentageDeduction)}
                      </td>
                      <td className="p-4 text-sm">
                        {charge.facture?.fournisseur || '-'}
                        {charge.facture?.numero && (
                          <p className="text-xs text-muted-foreground">
                            N° {charge.facture.numero}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(charge)}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(charge._id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
