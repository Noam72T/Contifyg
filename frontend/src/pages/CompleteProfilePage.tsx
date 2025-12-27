import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

function CompleteProfilePage() {
  const [loading, setLoading] = useState(true);
  const [discordData, setDiscordData] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    idUser: '',
    compteBancaire: '',
    password: '',
    confirmPassword: ''
  });
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        setDiscordData(decodedData);
        setFormData(prev => ({
          ...prev,
          idUser: ''
        }));
        setLoading(false);
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la récupération des données Discord');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (!discordData) {
      toast.error('Données Discord manquantes');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/discord/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          discordId: discordData.discordId,
          username: discordData.discordUsername,
          email: discordData.email,
          avatar: discordData.avatar
        })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('token', result.token);
        updateUser(result.user);
        toast.success('Profil complété avec succès !');
        navigate('/dashboard', { replace: true });
      } else {
        toast.error(result.message || 'Erreur lors de la complétion du profil');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion au serveur');
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
      <div className="w-full max-w-2xl bg-card rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Compta System</h1>
          {discordData && (
            <div className="flex items-center justify-center mb-4">
              {discordData.avatar && (
                <img
                  src={`https://cdn.discordapp.com/avatars/${discordData.discordId}/${discordData.avatar}.png`}
                  alt="Avatar Discord"
                  className="w-12 h-12 rounded-full mr-3"
                />
              )}
              <div>
                <h2 className="text-xl font-semibold">Finaliser votre inscription</h2>
                <p className="text-muted-foreground">
                  Connecté via Discord: {discordData.discordUsername}
                </p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prénom *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                placeholder="Votre prénom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nom de famille *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                placeholder="Votre nom de famille"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Téléphone *</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                placeholder="0123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ID Utilisateur (identifiant unique) *</label>
              <input
                type="text"
                name="idUser"
                value={formData.idUser}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                placeholder="Ex: USR001, USER123..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Compte Bancaire *</label>
            <input
              type="text"
              name="compteBancaire"
              value={formData.compteBancaire}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              placeholder="Numéro de compte bancaire"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mot de passe *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                placeholder="Votre mot de passe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirmer le mot de passe *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                placeholder="Confirmez votre mot de passe"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-md hover:bg-primary/90 font-medium"
          >
            Finaliser mon inscription
          </button>
        </form>
      </div>
    </div>
  );
}

export default CompleteProfilePage;
