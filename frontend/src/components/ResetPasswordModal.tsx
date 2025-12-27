import React, { useState } from 'react';
import { KeyRound, HelpCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'username' | 'question' | 'reset'>('username');
  const [username, setUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setStep('username');
    setUsername('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleGetSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Veuillez entrer votre nom d\'utilisateur');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/get-security-question', { username });
      
      if (response.data.success) {
        setSecurityQuestion(response.data.securityQuestion);
        setStep('question');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.message || 'Utilisateur non trouvé ou aucune question de sécurité configurée');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!securityAnswer.trim()) {
      toast.error('Veuillez entrer votre réponse');
      return;
    }

    setStep('reset');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password-with-security', {
        username,
        securityAnswer,
        newPassword
      });

      if (response.data.success) {
        toast.success('Mot de passe réinitialisé avec succès !');
        handleClose();
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Réinitialiser le mot de passe
          </DialogTitle>
          <DialogDescription>
            {step === 'username' && 'Entrez votre nom d\'utilisateur pour commencer'}
            {step === 'question' && 'Répondez à votre question de sécurité'}
            {step === 'reset' && 'Choisissez votre nouveau mot de passe'}
          </DialogDescription>
        </DialogHeader>

        {/* Étape 1: Nom d'utilisateur */}
        {step === 'username' && (
          <form onSubmit={handleGetSecurityQuestion} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre nom d'utilisateur"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Vérification...' : 'Continuer'}
              </Button>
            </div>
          </form>
        )}

        {/* Étape 2: Question de sécurité */}
        {step === 'question' && (
          <form onSubmit={handleVerifyAnswer} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Question de sécurité
              </Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {securityQuestion}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">Votre réponse</Label>
              <Input
                id="answer"
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Entrez votre réponse"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('username')} className="flex-1">
                Retour
              </Button>
              <Button type="submit" className="flex-1">
                Vérifier
              </Button>
            </div>
          </form>
        )}

        {/* Étape 3: Nouveau mot de passe */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Nouveau mot de passe
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('question')} className="flex-1">
                Retour
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Réinitialisation...' : 'Réinitialiser'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
