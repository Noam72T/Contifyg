import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { showToast } from '../utils/toastDeduplicator';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

// Schema de validation
const addAccountSchema = z.object({
  username: z.string().min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phoneNumber: z.string()
    .regex(/^555-\d+$/, 'Le numéro doit commencer par 555- suivi de chiffres')
    .min(8, 'Le numéro de téléphone est trop court'),
  compteBancaire: z.string()
    .regex(/^\d+$/, 'Le compte bancaire ne peut contenir que des chiffres')
    .max(7, 'Le compte bancaire ne peut pas dépasser 7 chiffres'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type AddAccountFormData = z.infer<typeof addAccountSchema>;

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ open, onOpenChange }) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<AddAccountFormData>({
    resolver: zodResolver(addAccountSchema)
  });

  const onSubmit = async (data: AddAccountFormData) => {
    try {
      showToast.info('Création du compte en cours...');
      
      // Récupérer le accountFamilyId depuis plusieurs sources
      let accountFamilyId: string | null = null;
      
      // 1. Vérifier le localStorage (persiste entre les sessions)
      const storedFamilyId = localStorage.getItem('accountFamilyId');
      if (storedFamilyId) {
        accountFamilyId = storedFamilyId;
        console.log('📌 FamilyId récupéré du localStorage:', accountFamilyId);
      }
      
      // Vérifier le nombre de comptes existants dans cette famille
      if (accountFamilyId) {
        try {
          const accountsResponse = await api.get('/user-accounts');
          if (accountsResponse.data.success && accountsResponse.data.accounts) {
            const familyAccounts = accountsResponse.data.accounts.filter(
              (acc: any) => acc.accountFamilyId === accountFamilyId
            );
            
            if (familyAccounts.length >= 4) {
              showToast.error('Limite atteinte : Vous ne pouvez pas avoir plus de 4 comptes par famille');
              return;
            }
            
            console.log(`📊 Comptes dans la famille: ${familyAccounts.length}/4`);
          }
        } catch (err) {
          console.error('⚠️ Erreur lors de la vérification du nombre de comptes:', err);
        }
      }
      
      // 2. Si pas dans localStorage et utilisateur connecté, récupérer depuis l'API
      if (!accountFamilyId && user) {
        try {
          const accountsResponse = await api.get('/user-accounts');
          if (accountsResponse.data.success && accountsResponse.data.accounts.length > 0) {
            const firstAccount = accountsResponse.data.accounts[0];
            if ((firstAccount as any).accountFamilyId) {
              accountFamilyId = (firstAccount as any).accountFamilyId;
              // Sauvegarder dans localStorage pour les prochaines fois
              if (accountFamilyId) {
                localStorage.setItem('accountFamilyId', accountFamilyId);
                console.log('📌 FamilyId récupéré de l\'API et sauvegardé:', accountFamilyId);
              }
            }
          }
        } catch (err) {
          console.error('⚠️ Erreur lors de la récupération des comptes:', err);
        }
        
        // 3. Vérifier l'utilisateur actuel
        if (!accountFamilyId && (user as any).accountFamilyId) {
          accountFamilyId = (user as any).accountFamilyId;
          if (accountFamilyId) {
            localStorage.setItem('accountFamilyId', accountFamilyId);
            console.log('📌 FamilyId récupéré de l\'utilisateur actuel:', accountFamilyId);
          }
        }
      }
      
      // 4. Si toujours pas de familyId, en créer un nouveau
      if (!accountFamilyId) {
        accountFamilyId = uuidv4();
        localStorage.setItem('accountFamilyId', accountFamilyId);
        console.log('📌 Nouveau FamilyId créé et sauvegardé:', accountFamilyId);
        
        // Si utilisateur connecté, mettre à jour son familyId
        if (user) {
          try {
            await api.put(`/users/${user._id}`, { accountFamilyId });
          } catch (err) {
            console.error('⚠️ Erreur lors de l\'assignation du familyId:', err);
          }
        }
      }
      
      // Créer le compte
      const response = await api.post('/auth/register', {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        compteBancaire: data.compteBancaire,
        password: data.password,
        accountFamilyId: accountFamilyId
      });

      if (response.data.success) {
        showToast.success('Compte créé avec succès !');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        showToast.info('Connexion automatique...');
        
        const loginResponse = await api.post('/auth/login', {
          username: data.username,
          password: data.password
        });

        if (loginResponse.data.success) {
          // Sauvegarder le accountFamilyId AVANT de mettre à jour les autres données
          const currentFamilyId = localStorage.getItem('accountFamilyId');
          
          localStorage.setItem('token', loginResponse.data.token);
          localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
          
          // Restaurer le accountFamilyId si il a été perdu
          if (currentFamilyId && !localStorage.getItem('accountFamilyId')) {
            localStorage.setItem('accountFamilyId', currentFamilyId);
            console.log('📌 AccountFamilyId restauré après connexion:', currentFamilyId);
          }
          
          // S'assurer que l'utilisateur connecté a le bon accountFamilyId
          if (loginResponse.data.user.accountFamilyId && loginResponse.data.user.accountFamilyId !== currentFamilyId) {
            console.warn('⚠️ Incohérence accountFamilyId détectée:', {
              localStorage: currentFamilyId,
              userAccount: loginResponse.data.user.accountFamilyId
            });
          }
          
          showToast.success('Connexion réussie ! Redirection vers la validation du code d\'entreprise...');
          
          // Fermer la modal
          onOpenChange(false);
          reset();
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          window.location.href = '/company-code';
        } else {
          showToast.error('Erreur lors de la connexion automatique');
        }
      }
    } catch (error: any) {
      console.error('Erreur détaillée:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la création du compte';
      showToast.error(errorMessage);
      
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err: string) => {
          showToast.error(err);
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5 text-primary" />
            Ajouter un compte
          </DialogTitle>
          <DialogDescription>
            Créez un nouveau compte pour rejoindre une autre entreprise
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom d'utilisateur */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Nom d'utilisateur *</Label>
              <Input
                {...register('username')}
                id="username"
                type="text"
                placeholder="Votre nom d'utilisateur"
                className={errors.username ? 'border-destructive' : ''}
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>

            {/* Prénom RP */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">Prénom RP *</Label>
              <Input
                {...register('firstName')}
                id="firstName"
                type="text"
                placeholder="Snow"
                className={errors.firstName ? 'border-destructive' : ''}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            {/* Nom RP */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">Nom RP *</Label>
              <Input
                {...register('lastName')}
                id="lastName"
                type="text"
                placeholder="Way"
                className={errors.lastName ? 'border-destructive' : ''}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium">Téléphone *</Label>
              <Input
                {...register('phoneNumber')}
                id="phoneNumber"
                type="text"
                placeholder="555-1234567"
                className={errors.phoneNumber ? 'border-destructive' : ''}
              />
              {errors.phoneNumber && (
                <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>
              )}
            </div>

            {/* Compte bancaire */}
            <div className="space-y-2">
              <Label htmlFor="compteBancaire" className="text-sm font-medium">Compte bancaire *</Label>
              <Input
                {...register('compteBancaire')}
                id="compteBancaire"
                type="text"
                placeholder="1234567"
                maxLength={7}
                className={errors.compteBancaire ? 'border-destructive' : ''}
              />
              {errors.compteBancaire && (
                <p className="text-xs text-destructive">{errors.compteBancaire.message}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Mot de passe *</Label>
              <div className="relative">
                <Input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirmer mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmer *</Label>
              <div className="relative">
                <Input
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <span className="mr-1.5">💡</span>
              Après la création, vous serez redirigé vers la validation du code d'entreprise
            </p>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Créer le compte
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountModal;
