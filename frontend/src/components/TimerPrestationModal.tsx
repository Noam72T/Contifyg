import React, { useState, useEffect } from 'react';
import { X, Timer, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface TimerPrestation {
  _id: string;
  nom: string;
  description?: string;
  tarifParMinute: number;
  couleur: string;
  icone: string;
}

interface TimerPrestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prestation?: TimerPrestation | null;
  companyId: string;
}

const TimerPrestationModal: React.FC<TimerPrestationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prestation,
  companyId
}) => {
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    tarifParMinute: 0,
    couleur: '#3b82f6',
    icone: 'Timer'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prestation) {
      setFormData({
        nom: prestation.nom,
        description: prestation.description || '',
        tarifParMinute: prestation.tarifParMinute,
        couleur: prestation.couleur,
        icone: prestation.icone
      });
    } else {
      setFormData({
        nom: '',
        description: '',
        tarifParMinute: 0,
        couleur: '#3b82f6',
        icone: 'Timer'
      });
    }
  }, [prestation, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom.trim() || formData.tarifParMinute <= 0) {
      toast.error('Nom et tarif par minute sont requis');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const url = prestation 
        ? `${apiUrl}/api/timers/prestations/${prestation._id}`
        : `${apiUrl}/api/timers/prestations`;
      
      const method = prestation ? 'PUT' : 'POST';
      
      const body = prestation 
        ? formData
        : { ...formData, company: companyId };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(prestation ? 'Prestation timer modifiée avec succès' : 'Prestation timer créée avec succès');
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Erreur lors de l\'opération');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'opération');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            {prestation ? 'Modifier la prestation timer' : 'Nouvelle prestation timer'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nom de la prestation *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              placeholder="Ex: Réparation moteur"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description (optionnelle)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              placeholder="Description de la prestation..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Tarif par minute * (€)
              </div>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.tarifParMinute}
              onChange={(e) => setFormData({ ...formData, tarifParMinute: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              placeholder="Ex: 2.50"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Le coût sera calculé automatiquement : durée × tarif/minute × quantité
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Couleur
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.couleur}
                onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                className="w-12 h-10 rounded border border-input cursor-pointer"
              />
              <input
                type="text"
                value={formData.couleur}
                onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : (prestation ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimerPrestationModal;
