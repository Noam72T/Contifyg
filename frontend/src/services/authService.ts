import api from '../utils/api';
import type { 
  LoginData, 
  RegisterData, 
  DiscordCompleteData, 
  AuthResponse, 
  User, 
  ChangePasswordData, 
  ProfileUpdateData 
} from '../types/auth';

class AuthService {
  // Connexion
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    
    if (response.data.success && response.data.token && response.data.user) {
      this.setAuthData(response.data.token, response.data.user);
    }
    
    return response.data;
  }

  // Inscription
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    if (response.data.success && response.data.token && response.data.user) {
      this.setAuthData(response.data.token, response.data.user);
    }
    
    return response.data;
  }

  // Compléter l'inscription Discord
  async completeDiscordProfile(data: DiscordCompleteData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/discord-company/complete', data);
    
    if (response.data.success && response.data.token && response.data.user) {
      this.setAuthData(response.data.token, response.data.user);
    }
    
    return response.data;
  }

  // Obtenir le profil utilisateur
  async getProfile(): Promise<{ success: boolean; user?: User; message?: string }> {
    const response = await api.get('/auth/profile');
    
    // Mettre à jour les données utilisateur dans localStorage si récupérées avec succès
    if (response.data.success && response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  }

  // Mettre à jour le profil
  async updateProfile(data: ProfileUpdateData): Promise<{ success: boolean; user?: User; message?: string }> {
    const response = await api.put('/auth/update-profile', data);
    
    if (response.data.success && response.data.user) {
      this.setUser(response.data.user);
    }
    
    return response.data;
  }

  // Changer le mot de passe
  async changePassword(data: ChangePasswordData): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  }

  // Déconnexion
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Ne pas rediriger automatiquement, laisser le composant gérer la redirection
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  }

  // Obtenir le token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Obtenir l'utilisateur actuel
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Définir les données d'authentification
  private setAuthData(token: string, user: User): void {
    // Préserver le accountFamilyId existant si présent
    const existingFamilyId = localStorage.getItem('accountFamilyId');
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Sauvegarder le accountFamilyId de l'utilisateur s'il en a un
    if ((user as any).accountFamilyId) {
      localStorage.setItem('accountFamilyId', (user as any).accountFamilyId);
      console.log('📌 AccountFamilyId sauvegardé depuis setAuthData:', (user as any).accountFamilyId);
    } else if (existingFamilyId) {
      // Restaurer le familyId existant si l'utilisateur n'en a pas
      localStorage.setItem('accountFamilyId', existingFamilyId);
      console.log('📌 AccountFamilyId existant préservé:', existingFamilyId);
    }
  }

  // Mettre à jour les données utilisateur
  private setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // URL de connexion Discord
  getDiscordLoginUrl(): string {
    return `${import.meta.env.VITE_API_URL}/api/discord/login`;
  }

  // Assigner un utilisateur existant à une entreprise
  async assignToCompany(companyCode: string): Promise<{ success: boolean; message?: string; company?: any; user?: any; token?: string; redirectTo?: string; shouldRefresh?: boolean; alreadyMember?: boolean }> {
    // Utiliser le code d'entreprise pour assigner réellement l'utilisateur en base de données
    const response = await api.post('/company-codes/use', { code: companyCode });
    
    if (response.data.success) {
      // Mettre à jour le token JWT avec les nouvelles informations
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      
      // Mettre à jour les données utilisateur avec les informations de l'entreprise
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      // Sauvegarder l'entreprise sélectionnée
      if (response.data.company) {
        // Sauvegarder l'objet complet de l'entreprise avec le bon format
        const companyData = {
          _id: response.data.company._id || response.data.company.id,
          id: response.data.company._id || response.data.company.id,
          name: response.data.company.name,
          description: response.data.company.description,
          category: response.data.company.category,
          logo: response.data.company.logo,
          owner: response.data.company.owner,
          createdAt: response.data.company.createdAt,
          code: companyCode
        };
        
        localStorage.setItem('selectedCompany', JSON.stringify(companyData));
        
        // Sauvegarder aussi l'ID séparément pour CompanyContext
        localStorage.setItem('selectedCompanyId', companyData._id);
      }
    }
    
    return response.data;
  }

  // Valider un code d'entreprise (route publique)
  async validateCompanyCode(companyCode: string): Promise<{ success: boolean; message?: string; company?: any; companyCode?: string }> {
    const response = await api.post('/auth/validate-company-code', { companyCode });
    return response.data;
  }

  // Créer un utilisateur avec un code d'entreprise
  async createUserWithCode(data: { companyCode: string; username: string; firstName: string; lastName: string; phoneNumber?: string; password: string; confirmPassword: string; compteBancaire?: string }): Promise<{ success: boolean; message?: string; user?: any }> {
    const response = await api.post('/auth/create-user-with-code', data);
    return response.data;
  }

  // Vérifier la validité du token (optionnel, pour une vérification côté client)
  async verifyToken(): Promise<boolean> {
    try {
      const response = await this.getProfile();
      return response.success;
    } catch {
      return false;
    }
  }
}

export default new AuthService();
