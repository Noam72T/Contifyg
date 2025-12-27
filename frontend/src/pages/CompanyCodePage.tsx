import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { companyCodeSchema, type CompanyCodeFormData } from '../utils/validation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import authService from '../services/authService';

export default function CompanyCodePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { forceUserCompanySync } = useCompany();

  // Gérer le token Discord depuis l'URL
  useEffect(() => {
    const token = searchParams.get('token');
    const discordSuccess = searchParams.get('discord');
    
    if (token && discordSuccess === 'success') {
      console.log('🔑 Token Discord reçu dans CompanyCodePage');
      
      // Sauvegarder le token dans localStorage
      localStorage.setItem('token', token);
      
      // Nettoyer l'URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Rafraîchir les données utilisateur
      if (refreshUser) {
        console.log('🔄 Rafraîchissement des données utilisateur Discord');
        refreshUser().then(() => {
          console.log('✅ Données utilisateur Discord rafraîchies');
        });
      }
    }
  }, [searchParams, refreshUser]);

  // Vérifier si l'utilisateur a déjà des entreprises assignées
  useEffect(() => {
    // Si l'utilisateur est un Technicien, rediriger directement vers le dashboard
    if (user?.systemRole === 'Technicien') {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Si l'utilisateur a déjà un profil complet et des entreprises, 
    // cette page sert à ajouter une nouvelle entreprise
    if (user && user.firstName && user.lastName && user.isCompanyValidated) {
      // L'utilisateur accède à cette page pour rejoindre une nouvelle entreprise
      // Pas de redirection automatique
      return;
    }
  }, [navigate, user]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CompanyCodeFormData>({
    resolver: zodResolver(companyCodeSchema)
  });

  const onSubmit = async (data: CompanyCodeFormData) => {
    setIsLoading(true);
    
    try {
      // Si l'utilisateur est connecté (Discord ou normal), assigner l'entreprise directement
      if (user) {
        console.log('👤 Utilisateur connecté, assignation à l\'entreprise...');
        const assignResult = await authService.assignToCompany(data.companyCode);

        if (assignResult.success) {
          toast.success(assignResult.message || `Vous avez rejoint l'entreprise avec succès !`);
          
          // Forcer la réinitialisation du CompanyContext et récupérer le profil utilisateur mis à jour
          try {
            await refreshUser();
            await forceUserCompanySync();
          } catch (error) {
            console.warn('Erreur lors de la récupération du profil:', error);
          }
          
          // Rediriger vers le dashboard avec rechargement complet
          // pour garantir que le contexte est bien mis à jour
          setTimeout(() => {
            window.location.href = assignResult.redirectTo || '/dashboard';
          }, 1500);
          return;
        } else {
          toast.error(assignResult.message || 'Erreur lors de l\'assignation à l\'entreprise');
          return;
        }
      }

      // Si pas d'utilisateur connecté, créer un nouveau compte (ne devrait pas arriver avec Discord)
      toast.error('Vous devez être connecté pour rejoindre une entreprise');
      navigate('/login');
      return;

      /* Code commenté - ancien flux pour nouveaux utilisateurs non-Discord
      // Ce code n'est plus utilisé car tous les utilisateurs doivent être connectés
      // avant d'accéder à cette page (via Discord ou login normal)
      */
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      
      // Gestion spécifique des erreurs réseau
      if (error instanceof TypeError && error.message?.includes('fetch')) {
        toast.error('Erreur de connexion au serveur. Vérifiez votre connexion internet.');
      } else if (error.response) {
        // Erreur HTTP avec réponse du serveur
        const errorData = error.response?.data;
        toast.error(errorData?.message || 'Erreur serveur lors du traitement de votre demande');
      } else {
        // Autres erreurs
        toast.error('Une erreur inattendue s\'est produite. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Déterminer le contexte d'utilisation
  const isExistingUser = user && user.firstName && user.lastName;
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isExistingUser ? 'Rejoindre une entreprise' : 'Code d\'entreprise'}
          </CardTitle>
          <CardDescription>
            {isExistingUser 
              ? `Bonjour ${user.firstName} ! Entrez le code de l'entreprise que vous souhaitez rejoindre.`
              : 'Entrez votre code d\'entreprise pour accéder à l\'application de comptabilité'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              {isExistingUser ? (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Retour au dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Retour à la connexion
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Créer un compte
                  </button>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyCode">Code d'entreprise *</Label>
              <Input
                {...register('companyCode')}
                id="companyCode"
                type="text"
                placeholder="Entrez votre code d'entreprise"
                className={errors.companyCode ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.companyCode && (
                <p className="text-sm text-destructive">{errors.companyCode.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading 
                ? 'Validation...' 
                : isExistingUser 
                  ? 'Rejoindre l\'entreprise' 
                  : 'Valider le code'
              }
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas de code d'entreprise ?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Contactez votre administrateur pour obtenir un code valide.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
