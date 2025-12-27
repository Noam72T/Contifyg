import React, { useState } from 'react';
import { X, Building, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: (company: any) => void;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onCompanyCreated
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    apiMode: false,
    glifeCompanyId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Le nom de l\'entreprise est requis');
      return;
    }

    if (!formData.category.trim()) {
      toast.error('La catégorie est requise');
      return;
    }

    if (formData.apiMode && !formData.glifeCompanyId.trim()) {
      toast.error('L\'ID de l\'entreprise GLife est requis en mode API');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Entreprise créée avec succès !');
        onCompanyCreated(data.company);
        handleClose();
      } else {
        toast.error(data.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur lors de la création de l\'entreprise');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', category: '', apiMode: false, glifeCompanyId: '' });
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Créer une nouvelle entreprise
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Nom de l'entreprise */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: Restaurant Le Gourmet"
                disabled={loading}
                required
              />
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Catégorie *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
                required
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Commerce">Commerce</option>
                <option value="Service">Service</option>
                <option value="Industrie">Industrie</option>
                <option value="Technologie">Technologie</option>
                <option value="Santé">Santé</option>
                <option value="Éducation">Éducation</option>
                <option value="Immobilier">Immobilier</option>
                <option value="Transport">Transport</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Description de l'entreprise (optionnel)"
                disabled={loading}
              />
            </div>

            {/* Mode API */}
            <div className="border-t border-border pt-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="apiMode"
                  checked={formData.apiMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiMode: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                  disabled={loading}
                />
                <div className="flex-1">
                  <label htmlFor="apiMode" className="block text-sm font-medium text-foreground cursor-pointer">
                    Utiliser l'API GLife
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Récupère automatiquement les ventes depuis l'API GLife. Les modules Prestations, Ventes, Stock et Items seront désactivés.
                  </p>
                </div>
              </div>
            </div>

            {/* ID GLife (conditionnel) */}
            {formData.apiMode && (
              <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  ID de l'entreprise GLife *
                </label>
                <input
                  type="number"
                  value={formData.glifeCompanyId}
                  onChange={(e) => handleInputChange('glifeCompanyId', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ex: 250"
                  disabled={loading}
                  required={formData.apiMode}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  L'ID de votre entreprise sur GLife (visible dans l'URL de l'API)
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer l\'entreprise'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateCompanyModal;
