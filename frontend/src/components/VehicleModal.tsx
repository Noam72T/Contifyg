import React, { useState, useEffect } from 'react';
import { X, Car, Upload, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface Vehicle {
  _id: string;
  nom: string;
  marque: string;
  modele: string;
  plaque: string;
  couleur?: string;
  annee?: number;
  image?: string;
  description?: string;
  tarifParMinute: number;
  proprietaire?: {
    nom?: string;
    telephone?: string;
    email?: string;
  };
}

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicle?: Vehicle | null;
  companyId?: string;
}

const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vehicle,
  companyId
}) => {
  // Debug: log des props reçues
  React.useEffect(() => {
    if (isOpen) {
      console.log('🚗 VehicleModal ouvert avec props:', { vehicle, isOpen });
    }
  }, [isOpen, vehicle]);
  const [formData, setFormData] = useState({
    nom: '',
    plaque: '',
    tarifParMinute: 0
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        nom: vehicle.nom,
        plaque: vehicle.plaque,
        tarifParMinute: vehicle.tarifParMinute
      });
      setImagePreview(vehicle.image || null);
    } else {
      setFormData({
        nom: '',
        plaque: '',
        tarifParMinute: 0
      });
      setImagePreview(null);
    }
    setImageFile(null);
  }, [vehicle, isOpen]);

  // Fonction pour compresser une image côté frontend
  const compressImageFrontend = (file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculer les nouvelles dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Configurer le canvas
        canvas.width = width;
        canvas.height = height;
        
        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir en blob puis en File
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            console.log(`🖼️ Image compressée frontend: ${file.size} -> ${compressedFile.size} bytes`);
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérification basique du type de fichier
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image valide');
        return;
      }
      
      let processedFile = file;
      
      // Compresser si l'image est trop volumineuse (> 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast('Compression de l\'image en cours...', { icon: '⏳' });
        try {
          processedFile = await compressImageFrontend(file);
          toast.success(`Image compressée : ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(processedFile.size / 1024 / 1024).toFixed(1)}MB`);
        } catch (error) {
          console.error('Erreur compression frontend:', error);
          toast('Compression échouée, utilisation de l\'image originale', { icon: '⚠️' });
        }
      }
      
      setImageFile(processedFile);
      
      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(processedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom.trim() || !formData.plaque.trim() || formData.tarifParMinute <= 0) {
      toast.error('Nom, plaque et tarif par minute sont requis');
      return;
    }

    console.log('🚗 Création véhicule (company récupéré automatiquement côté serveur)');
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const formDataToSend = new FormData();
      formDataToSend.append('nom', formData.nom);
      formDataToSend.append('plaque', formData.plaque);
      formDataToSend.append('tarifParMinute', formData.tarifParMinute.toString());
      
      // Ajouter l'ID de l'entreprise si disponible
      if (companyId && !vehicle) {
        formDataToSend.append('company', companyId);
      }
      
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }
      
      
      
      const url = vehicle 
        ? `${apiUrl}/api/vehicles/${vehicle._id}`
        : `${apiUrl}/api/vehicles`;
      
      const method = vehicle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(vehicle ? 'Véhicule modifié avec succès' : 'Véhicule créé avec succès');
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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-background/95 backdrop-blur-sm rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto border border-border/50">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            {vehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image du véhicule */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Photo du véhicule
            </label>
            <div className="flex items-center space-x-3">
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="w-16 h-16 object-cover rounded border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              )}
              <label className="cursor-pointer bg-muted/50 hover:bg-muted/80 border border-dashed border-border rounded p-3 flex flex-col items-center justify-center space-y-1 min-w-[80px]">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {imagePreview ? 'Changer' : 'Ajouter'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Informations essentielles */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nom du véhicule *
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="w-full px-3 py-2 bg-background/50 border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                placeholder="Ex: Voiture de service"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Plaque d'immatriculation *
              </label>
              <input
                type="text"
                value={formData.plaque}
                onChange={(e) => setFormData({ ...formData, plaque: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-background/50 border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground uppercase"
                placeholder="Ex: AB-123-CD"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Tarif par minute * ($)
                </div>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.tarifParMinute}
                onChange={(e) => setFormData({ ...formData, tarifParMinute: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-background/50 border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                placeholder="Ex: 2.50"
                required
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 bg-muted/50 text-muted-foreground rounded hover:bg-muted/80 text-sm"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 text-sm"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : (vehicle ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleModal;
