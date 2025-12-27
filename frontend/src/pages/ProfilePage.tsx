import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Camera, X, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { profileUpdateSchema } from '../utils/validation';
import type { ProfileUpdateFormData } from '../utils/validation';
import authService from '../services/authService';
import api from '../utils/api';
import Layout from '../components/Layout';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // États pour la question de sécurité
  const [showSecuritySection, setShowSecuritySection] = useState(false);
  const [existingSecurityQuestion, setExistingSecurityQuestion] = useState<string | null>(null);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // États pour le changement de mot de passe
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // États pour la visibilité des mots de passe
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Charger la question de sécurité existante
  React.useEffect(() => {
    const loadSecurityQuestion = async () => {
      if (!user?.username) return;
      
      try {
        const response = await api.post('/auth/get-security-question', {
          username: user.username
        });
        
        if (response.data.success && response.data.securityQuestion) {
          setExistingSecurityQuestion(response.data.securityQuestion);
        }
      } catch (error) {
        // Pas de question configurée, c'est normal
        setExistingSecurityQuestion(null);
      }
    };

    loadSecurityQuestion();
  }, [user?.username]);

  // Synchroniser avatarPreview avec l'avatar de l'utilisateur
  React.useEffect(() => {
    console.log('🖼️ Synchronisation avatar ProfilePage:', {
      userAvatar: user?.avatar ? 'Présent' : 'Absent',
      userAvatarLength: user?.avatar ? user.avatar.length : 0,
      currentPreview: avatarPreview ? 'Présent' : 'Absent',
      username: user?.username
    });
    
    if (user?.avatar) {
      console.log('✅ Mise à jour de l\'aperçu avec l\'avatar utilisateur');
      setAvatarPreview(user.avatar);
    } else {
      console.log('❌ Pas d\'avatar utilisateur, réinitialisation de l\'aperçu');
      setAvatarPreview('');
    }
  }, [user?.avatar]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phoneNumber: user?.phoneNumber || '',
      compteBancaire: user?.compteBancaire || '',
      charId: user?.charId?.toString() || '',
      email: user?.email || '',
      avatar: user?.avatar || ''
    }
  });

  // Mettre à jour le formulaire quand l'utilisateur change
  React.useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        compteBancaire: user.compteBancaire || '',
        charId: user.charId?.toString() || '',
        email: user.email || '',
        avatar: user.avatar || ''
      });
    }
  }, [user, reset]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('L\'image ne peut pas dépasser 2MB');
        return;
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image valide');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setAvatarPreview(base64String);
        setValue('avatar', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    setValue('avatar', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleSecuritySection = () => {
    if (!showSecuritySection) {
      // Pré-remplir avec la question existante lors de l'ouverture
      if (existingSecurityQuestion) {
        setSecurityQuestion(existingSecurityQuestion);
      }
    } else {
      // Nettoyer les champs lors de la fermeture
      setSecurityQuestion('');
      setSecurityAnswer('');
    }
    setShowSecuritySection(!showSecuritySection);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        toast.success('Mot de passe modifié avec succès !');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.message || 'Mot de passe actuel incorrect');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveSecurityQuestion = async () => {
    if (!securityQuestion.trim() || !securityAnswer.trim()) {
      toast.error('Veuillez remplir la question et la réponse');
      return;
    }

    setIsSavingSecurity(true);
    try {
      const response = await api.post('/auth/set-security-question', {
        securityQuestion,
        securityAnswer
      });

      if (response.data.success) {
        toast.success('Question de sécurité configurée avec succès !');
        setExistingSecurityQuestion(securityQuestion); // Mettre à jour la question affichée
        setSecurityAnswer(''); // Nettoyer seulement la réponse pour la sécurité
        setShowSecuritySection(false);
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la configuration');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const onSubmit = async (data: ProfileUpdateFormData) => {
    try {
      console.log('🔄 Données envoyées pour mise à jour:', data);
      console.log('🔢 CharId spécifiquement:', { charId: data.charId, type: typeof data.charId });
      const response = await authService.updateProfile(data);
      console.log('📥 Réponse reçue:', response);
      console.log('👤 Utilisateur dans la réponse:', response.user);
      console.log('🔢 CharId dans la réponse:', response.user?.charId);
      
      if (response.success && response.user) {
        console.log('👤 Avatar dans la réponse:', response.user.avatar);
        updateUser(response.user);
        
        // Mettre à jour l'aperçu de l'avatar avec la nouvelle valeur
        if (response.user.avatar) {
          setAvatarPreview(response.user.avatar);
        }
        
        // Déclencher un événement personnalisé pour forcer la synchronisation
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: { user: response.user }
        }));
        
        toast.success('Profil mis à jour avec succès !');
      } else {
        console.error('❌ Erreur dans la réponse:', response);
        toast.error(response.message || 'Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la mise à jour du profil';
      toast.error(errorMessage);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="h-screen overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {/* Breadcrumb */}
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <a href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
                  Tableau de bord
                </a>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-3 h-3 text-muted-foreground mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                  </svg>
                  <span className="ml-1 text-sm font-medium text-foreground md:ml-2">Mon profil</span>
                </div>
              </li>
            </ol>
          </nav>

          {/* Formulaire de profil */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card shadow rounded-lg max-w-4xl mx-auto"
          >
            <div className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Section Photo de profil */}
                <div className="flex flex-col items-center space-y-3 pb-4 border-b border-border">
                  <h3 className="text-lg font-medium text-foreground">Photo de profil</h3>
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Camera className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Choisir une photo
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Formats acceptés : JPG, PNG, GIF. Taille maximale : 2MB
                  </p>
                </div>

                {/* Informations du compte */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-lg font-medium text-foreground mb-4">Informations du compte</h3>
                  
                  {/* Champs modifiables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Nom d'utilisateur (non modifiable) */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Nom d'utilisateur</label>
                      <p className="text-sm text-foreground bg-muted px-3 py-2 rounded-md">{user.username}</p>
                    </div>

                    {/* Prénom */}
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
                        Prénom *
                      </label>
                      <input
                        {...register('firstName')}
                        type="text"
                        autoComplete="given-name"
                        className={`appearance-none relative block w-full px-3 py-2 border ${
                          errors.firstName ? 'border-red-500' : 'border-border'
                        } placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                        placeholder="Votre prénom"
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                      )}
                    </div>

                    {/* Nom de famille */}
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">
                        Nom de famille *
                      </label>
                      <input
                        {...register('lastName')}
                        type="text"
                        autoComplete="family-name"
                        className={`appearance-none relative block w-full px-3 py-2 border ${
                          errors.lastName ? 'border-red-500' : 'border-border'
                        } placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                        placeholder="Votre nom de famille"
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                      )}
                    </div>

                    {/* Numéro de téléphone */}
                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground mb-1">
                        Numéro de téléphone *
                      </label>
                      <input
                        {...register('phoneNumber')}
                        type="tel"
                        autoComplete="tel"
                        className={`appearance-none relative block w-full px-3 py-2 border ${
                          errors.phoneNumber ? 'border-red-500' : 'border-border'
                        } placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                        placeholder="0123456789"
                      />
                      {errors.phoneNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
                      )}
                    </div>

                    {/* Compte bancaire */}
                    <div>
                      <label htmlFor="compteBancaire" className="block text-sm font-medium text-foreground mb-1">
                        Compte Bancaire *
                      </label>
                      <input
                        {...register('compteBancaire')}
                        type="text"
                        className={`appearance-none relative block w-full px-3 py-2 border ${
                          errors.compteBancaire ? 'border-red-500' : 'border-border'
                        } placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                        placeholder="Numéro de compte bancaire"
                      />
                      {errors.compteBancaire && (
                        <p className="mt-1 text-sm text-red-600">{errors.compteBancaire.message}</p>
                      )}
                    </div>

                    {/* ID Personnage GLife */}
                    <div>
                      <label htmlFor="charId" className="block text-sm font-medium text-foreground mb-1">
                        ID Personnage GLife
                      </label>
                      <input
                        {...register('charId')}
                        type="text"
                        className={`appearance-none relative block w-full px-3 py-2 border ${
                          errors.charId ? 'border-red-500' : 'border-border'
                        } placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                        placeholder="Ex: 1234"
                      />
                      {errors.charId && (
                        <p className="mt-1 text-sm text-red-600">{errors.charId.message}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pour les entreprises utilisant l'API GLife
                      </p>
                    </div>
                  </div>

                  {/* Informations Discord (uniquement si connecté via Discord) */}
                  {user.discordId && (
                    <div className="bg-muted/50 p-4 rounded-md">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Compte Discord lié</label>
                        <div className="flex items-center bg-background px-3 py-2 rounded-md">
                          {user.avatar && (
                            <img
                              src={user.avatar}
                              alt="Avatar utilisateur"
                              className="w-6 h-6 rounded-full mr-2"
                            />
                          )}
                          <span className="text-sm text-foreground">{user.discordUsername || user.username}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              {/* Section Question de Sécurité */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium text-foreground">Question de sécurité</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleSecuritySection}
                    className="text-sm text-primary hover:underline"
                  >
                    {showSecuritySection ? 'Masquer' : existingSecurityQuestion ? 'Modifier' : 'Configurer'}
                  </button>
                </div>

                {/* Afficher la question existante si elle existe et que le formulaire n'est pas ouvert */}
                {existingSecurityQuestion && !showSecuritySection && (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-sm font-medium text-foreground mb-1">Question configurée :</p>
                    <p className="text-sm text-muted-foreground">{existingSecurityQuestion}</p>
                  </div>
                )}

                {showSecuritySection && (
                  <div className="space-y-4 bg-muted/50 p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      Configurez une question de sécurité pour pouvoir réinitialiser votre mot de passe sans email.
                    </p>
                    
                    <div>
                      <label htmlFor="securityQuestion" className="block text-sm font-medium text-foreground mb-1">
                        Question de sécurité
                      </label>
                      <input
                        id="securityQuestion"
                        type="text"
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        placeholder="Ex: Quel est le nom de votre premier animal ?"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div>
                      <label htmlFor="securityAnswer" className="block text-sm font-medium text-foreground mb-1">
                        Réponse
                      </label>
                      <input
                        id="securityAnswer"
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        placeholder="Votre réponse"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveSecurityQuestion}
                      disabled={isSavingSecurity}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {isSavingSecurity ? 'Sauvegarde...' : existingSecurityQuestion ? 'Modifier la question' : 'Sauvegarder la question'}
                    </button>
                  </div>
                )}
              </div>

              {/* Section Changement de Mot de Passe */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium text-foreground">Changer le mot de passe</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="text-sm text-primary hover:underline"
                  >
                    {showPasswordSection ? 'Masquer' : 'Modifier'}
                  </button>
                </div>

                {showPasswordSection && (
                  <div className="space-y-4 bg-muted/50 p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      Changez votre mot de passe pour sécuriser votre compte.
                    </p>
                    
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground mb-1">
                        Mot de passe actuel
                      </label>
                      <div className="relative">
                        <input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Votre mot de passe actuel"
                          className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-1">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimum 6 caractères"
                          className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
                        Confirmer le mot de passe
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirmez votre nouveau mot de passe"
                          className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {isChangingPassword ? 'Modification...' : 'Changer le mot de passe'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Link
                  to="/dashboard"
                  className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
