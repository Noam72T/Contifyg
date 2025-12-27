import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { showToast } from '../utils/toastDeduplicator';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ModeToggle } from '@/components/mode-toggle';

export default function DiscordSetupPage() {
  const [loading, setLoading] = useState(true);
  const [discordData, setDiscordData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    compteBancaire: '',
    companyCode: '',
    username: ''
  });
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser, refreshUser } = useAuth();

  useEffect(() => {
    const dataParam = searchParams.get('data');
    const tokenParam = searchParams.get('token');
    
    if (dataParam && tokenParam) {
      try {
        // Sauvegarder le token dans localStorage
        localStorage.setItem('token', tokenParam);
        
        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        setDiscordData(decodedData);
        
        // Mettre à jour le contexte d'authentification avec les données utilisateur
        updateUser(decodedData);
        
        setFormData(prev => ({
          ...prev,
          username: decodedData.discordUsername || ''
        }));
        setLoading(false);
      } catch (error) {
        console.error('Erreur:', error);
        showToast.error('Erreur lors de la récupération des données Discord');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]); // Suppression de updateUser des dépendances

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs obligatoires
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber || 
        !formData.compteBancaire) {
      showToast.error('Tous les champs obligatoires doivent être remplis');
      return;
    }

    if (!discordData) {
      showToast.error('Données Discord manquantes');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const requestData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        compteBancaire: formData.compteBancaire,
        username: formData.username
      };
      
      console.log('📤 Données envoyées au backend:', requestData);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/discord-company/complete-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('token', result.token);
        updateUser(result.user);
        
        // Rafraîchir les données utilisateur pour s'assurer d'avoir les dernières infos
        await refreshUser();
        
        showToast.success('Profil complété avec succès !');
        navigate('/company-code', { replace: true });
      } else {
        showToast.error(result.message || 'Erreur lors de la complétion du profil');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast.error('Erreur de connexion au serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground">Chargement...</h2>
        </div>
      </div>
    );
  }

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
            <CardTitle className="text-xl">Finaliser votre inscription</CardTitle>
            <CardDescription>
              {discordData && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  {discordData.avatar && (
                    <img
                      src={discordData.avatar}
                      alt="Avatar Discord"
                      className="w-8 h-8 rounded-full"
                      onError={(e) => {
                        // En cas d'erreur, masquer l'image
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <span>Connecté via Discord: {discordData.discordUsername || discordData.username}</span>
                </div>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom d'utilisateur */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur *</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Votre nom d'utilisateur"
                    required
                  />
                </div>

                {/* Prénom RP */}
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom RP *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Votre prénom RP"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Utilisez votre nom de personnage, pas votre nom réel</p>
                </div>

                {/* Nom RP */}
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom RP *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Votre nom RP"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Utilisez votre nom de personnage, pas votre nom réel</p>
                </div>

                {/* Numéro de téléphone */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Numéro de téléphone *</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="555-1234567"
                    required
                  />
                </div>

                {/* Compte bancaire */}
                <div className="space-y-2">
                  <Label htmlFor="compteBancaire">Compte Bancaire *</Label>
                  <Input
                    id="compteBancaire"
                    name="compteBancaire"
                    type="text"
                    value={formData.compteBancaire}
                    onChange={handleChange}
                    placeholder="1234567"
                    maxLength={7}
                    required
                  />
                </div>

                {/* Pas de mot de passe pour les comptes Discord */}
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={isSubmitting}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Finalisation...' : 'Finaliser mon inscription'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
