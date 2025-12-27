import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { loginSchema } from '../utils/validation';
import type { LoginFormData } from '../utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DiscordButton } from '@/components/ui/discord-button';
import { ModeToggle } from '@/components/mode-toggle';
import { ResetPasswordModal } from '@/components/ResetPasswordModal';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, loginWithDiscord, isAuthenticated, refreshUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      // Laisser ProtectedRoute gérer la redirection vers /company-code si nécessaire
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Gérer le token de connexion Discord depuis l'URL
  useEffect(() => {
    const handleDiscordCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');
      const discordSuccess = searchParams.get('discord');

      if (token) {
        console.log('🔑 Token Discord reçu, mise à jour du contexte...');
        localStorage.setItem('token', token);
        
        // Charger les données utilisateur avec le nouveau token
        if (refreshUser) {
          await refreshUser();
        }
        
        if (discordSuccess === 'success') {
          toast.success('Connexion Discord réussie !');
        }
        
        // Rediriger vers le dashboard
        navigate('/dashboard', { replace: true });
      } else if (error === 'discord_error') {
        toast.error('Erreur lors de la connexion Discord');
      } else if (error === 'no_user') {
        toast.error('Aucun utilisateur trouvé');
      } else if (error === 'discord_auth_failed') {
        toast.error('Échec de l\'authentification Discord');
      }
    };

    handleDiscordCallback();
  }, [searchParams, navigate, refreshUser]);

  const onSubmit = async (data: LoginFormData) => {
    const success = await login(data.username, data.password);
    if (success) {
      // Ne pas rediriger ici, laisser ProtectedRoute gérer la redirection
      // Le ProtectedRoute redirigera vers /company-code si pas validé
      navigate('/dashboard', { replace: true });
    }
  };

  const handleDiscordLogin = () => {
    loginWithDiscord();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Compta System</h1>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Se connecter</CardTitle>
            <CardDescription>
              Connectez-vous à votre compte pour continuer
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  {...register('username')}
                  id="username"
                  type="text"
                  placeholder="Votre nom d'utilisateur"
                  className={errors.username ? 'border-destructive' : ''}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Votre mot de passe"
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou</span>
              </div>
            </div>

            <DiscordButton onClick={handleDiscordLogin}>
              Se connecter avec Discord
            </DiscordButton>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Pas encore de compte ? </span>
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                Créer un compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de réinitialisation de mot de passe */}
      <ResetPasswordModal 
        isOpen={showResetModal} 
        onClose={() => setShowResetModal(false)} 
      />
    </div>
  );
};

export default LoginPage;
