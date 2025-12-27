import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { showToast } from '../utils/toastDeduplicator';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';

// Schema de validation pour l'ajout de compte
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

const AddAccountPage: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<AddAccountFormData>({
    resolver: zodResolver(addAccountSchema)
  });

  const onSubmit = async (data: AddAccountFormData) => {
    try {
      showToast.info('Création du compte en cours...');
      
      // Récupérer le accountFamilyId de l'utilisateur actuel
      let accountFamilyId = null;
      
      if (user) {
        // Récupérer les comptes liés à l'utilisateur actuel
        try {
          const accountsResponse = await api.get('/user-accounts');
          if (accountsResponse.data.success && accountsResponse.data.accounts.length > 0) {
            // Utiliser le accountFamilyId du premier compte trouvé
            const firstAccount = accountsResponse.data.accounts[0];
            if ((firstAccount as any).accountFamilyId) {
              accountFamilyId = (firstAccount as any).accountFamilyId;
              console.log('📌 Utilisation du familyId des comptes existants:', accountFamilyId);
            }
          }
        } catch (err) {
          console.error('⚠️ Erreur lors de la récupération des comptes:', err);
        }
        
        // Si toujours pas de familyId, vérifier l'utilisateur actuel
        if (!accountFamilyId && (user as any).accountFamilyId) {
          accountFamilyId = (user as any).accountFamilyId;
          console.log('📌 Utilisation du familyId de l\'utilisateur actuel:', accountFamilyId);
        }
        
        // Si toujours pas de familyId, en créer un nouveau
        if (!accountFamilyId) {
          accountFamilyId = uuidv4();
          console.log('📌 Création d\'un nouveau familyId:', accountFamilyId);
          
          // Mettre à jour l'utilisateur actuel avec le nouveau familyId
          try {
            await api.put(`/users/${user._id}`, { accountFamilyId });
            console.log('✅ FamilyId assigné à l\'utilisateur actuel');
          } catch (err) {
            console.error('⚠️ Erreur lors de l\'assignation du familyId:', err);
          }
        }
      }
      
      // Créer le compte via l'API d'inscription normale avec le accountFamilyId
      const response = await api.post('/auth/register', {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        compteBancaire: data.compteBancaire,
        password: data.password,
        accountFamilyId: accountFamilyId // Lier automatiquement à la famille
      });

      if (response.data.success) {
        showToast.success('Compte créé avec succès !');
        
        // Attendre un peu pour que le compte soit bien créé
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Connecter automatiquement avec le nouveau compte
        showToast.info('Connexion automatique...');
        
        const loginResponse = await api.post('/auth/login', {
          username: data.username,
          password: data.password
        });

        if (loginResponse.data.success) {
          // Stocker le token et l'utilisateur
          localStorage.setItem('token', loginResponse.data.token);
          localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
          
          showToast.success('Connexion réussie ! Redirection vers la validation du code d\'entreprise...');
          
          // Attendre un peu avant la redirection
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Utiliser window.location.href pour forcer la navigation
          window.location.href = '/company-code';
        } else {
          showToast.error('Erreur lors de la connexion automatique');
        }
      }
    } catch (error: any) {
      console.error('Erreur détaillée:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la création du compte';
      showToast.error(errorMessage);
      
      // Si erreur de validation, afficher les détails
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err: string) => {
          showToast.error(err);
        });
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Ajouter un compte</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-13">
            Créez un nouveau compte pour rejoindre une autre entreprise
          </p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl font-bold">Informations du compte</CardTitle>
            <CardDescription className="text-base mt-2">
              Remplissez vos informations pour créer un nouveau compte
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nom d'utilisateur */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="username" className="text-sm font-semibold">Nom d'utilisateur *</Label>
                  <Input
                    {...register('username')}
                    id="username"
                    type="text"
                    placeholder="Votre nom d'utilisateur"
                    className={`h-11 ${errors.username ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive font-medium">{errors.username.message}</p>
                  )}
                </div>

                {/* Prénom RP */}
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-semibold">Prénom RP *</Label>
                  <Input
                    {...register('firstName')}
                    id="firstName"
                    type="text"
                    placeholder="Snow"
                    className={`h-11 ${errors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive font-medium">{errors.firstName.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Utilisez votre nom de personnage</p>
                </div>

                {/* Nom RP */}
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-semibold">Nom RP *</Label>
                  <Input
                    {...register('lastName')}
                    id="lastName"
                    type="text"
                    placeholder="Way"
                    className={`h-11 ${errors.lastName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive font-medium">{errors.lastName.message}</p>
                  )}
                </div>

                {/* Téléphone */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm font-semibold">Téléphone *</Label>
                  <Input
                    {...register('phoneNumber')}
                    id="phoneNumber"
                    type="text"
                    placeholder="555-1234567"
                    className={`h-11 ${errors.phoneNumber ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {errors.phoneNumber && (
                    <p className="text-sm text-destructive font-medium">{errors.phoneNumber.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Format: 555-XXXXXXX</p>
                </div>

                {/* Compte bancaire */}
                <div className="space-y-2">
                  <Label htmlFor="compteBancaire" className="text-sm font-semibold">Compte bancaire *</Label>
                  <Input
                    {...register('compteBancaire')}
                    id="compteBancaire"
                    type="text"
                    placeholder="1234567"
                    maxLength={7}
                    className={`h-11 ${errors.compteBancaire ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {errors.compteBancaire && (
                    <p className="text-sm text-destructive font-medium">{errors.compteBancaire.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Maximum 7 chiffres</p>
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      {...register('password')}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`h-11 pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive font-medium">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirmer mot de passe */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirmer le mot de passe *</Label>
                  <div className="relative">
                    <Input
                      {...register('confirmPassword')}
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`h-11 pr-10 ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive font-medium">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              {/* Note importante */}
              <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="text-lg mr-2">💡</span>
                  <span className="font-semibold text-foreground">Prochaine étape :</span> Après la création de votre compte, vous serez redirigé vers la page de validation du code d'entreprise.
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 h-12 text-base font-semibold"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Créer le compte
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Bouton Mes comptes */}
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/my-accounts')}
            className="text-muted-foreground hover:text-primary"
          >
            Mes comptes
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default AddAccountPage;
