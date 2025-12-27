import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { registerSchema } from '../utils/validation';
import type { RegisterFormData } from '../utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DiscordButton } from '@/components/ui/discord-button';
import { ModeToggle } from '@/components/mode-toggle';

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const navigate = useNavigate();
    const { register: registerUser, loginWithDiscord } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterFormData) => {
    const success = await registerUser(data);
    if (success) {
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
      
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Compta System</h1>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Créer un compte</CardTitle>
            <CardDescription>
              Remplissez vos informations pour créer votre compte
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom d'utilisateur */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur *</Label>
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

                {/* Prénom RP */}
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom RP *</Label>
                  <Input
                    {...register('firstName')}
                    id="firstName"
                    type="text"
                    placeholder="Votre prénom RP"
                    className={errors.firstName ? 'border-destructive' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Utilisez votre nom de personnage, pas votre nom réel</p>
                </div>

                {/* Nom RP */}
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom RP *</Label>
                  <Input
                    {...register('lastName')}
                    id="lastName"
                    type="text"
                    placeholder="Votre nom RP"
                    className={errors.lastName ? 'border-destructive' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Utilisez votre nom de personnage, pas votre nom réel</p>
                </div>

                {/* Numéro de téléphone */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                  <Input
                    {...register('phoneNumber')}
                    id="phoneNumber"
                    type="tel"
                    placeholder="555-1234567"
                    className={errors.phoneNumber ? 'border-destructive' : ''}
                  />
                  {errors.phoneNumber && (
                    <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                  )}
                </div>

                {/* Compte bancaire */}
                <div className="space-y-2">
                  <Label htmlFor="compteBancaire">Compte Bancaire</Label>
                  <Input
                    {...register('compteBancaire')}
                    id="compteBancaire"
                    type="text"
                    placeholder="1234567"
                    maxLength={7}
                    className={errors.compteBancaire ? 'border-destructive' : ''}
                  />
                  {errors.compteBancaire && (
                    <p className="text-sm text-destructive">{errors.compteBancaire.message}</p>
                  )}
                </div>

                {/* ID Personnage GLife */}
                <div className="space-y-2">
                  <Label htmlFor="charId">ID Personnage GLife (optionnel)</Label>
                  <Input
                    {...register('charId')}
                    id="charId"
                    type="text"
                    placeholder="Ex: 1234"
                    className={errors.charId ? 'border-destructive' : ''}
                  />
                  {errors.charId && (
                    <p className="text-sm text-destructive">{errors.charId.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Pour les entreprises utilisant l'API GLife
                  </p>
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
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

                {/* Confirmation mot de passe */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                  <div className="relative">
                    <Input
                      {...register('confirmPassword')}
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirmez votre mot de passe"
                      className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={isSubmitting}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Création du compte...' : 'Créer mon compte'}
              </Button>
            </form>

            <div className="relative mt-6">
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

            <div className="text-center text-sm mt-6">
              <span className="text-muted-foreground">Déjà un compte ? </span>
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                Se connecter
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
