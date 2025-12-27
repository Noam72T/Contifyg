import React, { useState } from 'react';
import { X, Copy, Clock, Calendar, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useCompany } from '../contexts/CompanyContext';

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InvitationCode {
  code: string;
  expiresAt: string;
  description: string;
  createdAt: string;
  validFor: string;
}

const InviteEmployeeModal: React.FC<InviteEmployeeModalProps> = ({ isOpen, onClose }) => {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [invitationCode, setInvitationCode] = useState<InvitationCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Vérifier s'il existe déjà un code valide
  const checkExistingCode = async () => {
    if (!selectedCompany?._id) return;
    
    try {
      setCheckingExisting(true);
      const response = await api.get(`/users/current-invitation-code?companyId=${selectedCompany._id}`);
      
      if (response.data.success && response.data.data) {
        setInvitationCode(response.data.data);
      }
    } catch (error: any) {
      console.error('Erreur lors de la vérification du code existant:', error);
    } finally {
      setCheckingExisting(false);
    }
  };

  // Vérifier au montage du modal et quand l'entreprise change
  React.useEffect(() => {
    if (isOpen && selectedCompany) {
      setInvitationCode(null); // Reset le code précédent
      checkExistingCode();
    }
  }, [isOpen, selectedCompany?._id]);

  const generateInvitationCode = async () => {
    if (!selectedCompany?._id) {
      toast.error('Aucune entreprise sélectionnée');
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.post('/users/generate-invitation-code', {
        companyId: selectedCompany._id
      });
      
      if (response.data.success) {
        setInvitationCode(response.data.data);
      } else {
        toast.error('Erreur: ' + response.data.message);
      }
    } catch (error: any) {
      console.error('Erreur lors de la génération du code:', error);
      toast.error('Erreur lors de la génération du code d\'invitation: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (invitationCode) {
      try {
        await navigator.clipboard.writeText(invitationCode.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Erreur lors de la copie:', error);
        // Fallback pour les navigateurs plus anciens
        const textArea = document.createElement('textarea');
        textArea.value = invitationCode.code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClose = () => {
    setInvitationCode(null);
    setCopied(false);
    onClose();
  };

  // Afficher un loader pendant la vérification
  if (checkingExisting) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg border max-w-md w-full mx-4 p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Vérification des codes existants...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Inviter un employé</h2>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!invitationCode ? (
          /* Génération du code */
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Générez un code d'invitation unique pour inviter un nouvel employé à rejoindre votre entreprise.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" />
                  <span>Validité: 4 jours</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Utilisation illimitée</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={generateInvitationCode}
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? 'Génération...' : 'Générer le code'}
              </Button>
            </div>
          </div>
        ) : (
          /* Affichage du code généré */
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Code d'invitation généré avec succès !
              </p>
            </div>

            {/* Code d'invitation */}
            <div className="bg-muted/50 rounded-lg p-4">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Code d'invitation
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={invitationCode.code}
                  readOnly
                  className="font-mono text-lg text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Informations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expire le:</span>
                <span className="text-foreground font-medium">
                  {formatDate(invitationCode.expiresAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Validité:</span>
                <span className="text-foreground font-medium">{invitationCode.validFor}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Utilisations:</span>
                <span className="text-foreground font-medium">Illimitées</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Instructions:</strong> Partagez ce code avec le nouvel employé. 
                Il pourra l'utiliser pour créer son compte et rejoindre automatiquement votre entreprise.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={copyToClipboard}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {copied ? 'Copié !' : 'Copier le code'}
              </Button>
              <Button 
                onClick={generateInvitationCode}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                {loading ? 'Génération...' : 'Générer un autre'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteEmployeeModal;
