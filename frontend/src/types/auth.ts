export interface User {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  idUser: string;
  compteBancaire: string;
  charId?: number;
  email?: string;
  discordId?: string;
  discordUsername?: string;
  avatar?: string;
  isActive: boolean;
  isCompanyValidated: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Champs pour le système de permissions
  systemRole?: 'Technicien' | 'SuperAdmin' | 'IRS' | 'User';
  company?: string; // Ancien système
  companies?: Array<{
    company: string;
    role: string;
  }>;
  currentCompany?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  compteBancaire?: string;
  charId?: string;
  password: string;
}

export interface DiscordCompleteData {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  compteBancaire?: string;
  companyCode: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  errors?: string[];
}

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  compteBancaire?: string;
  charId?: string;
  email?: string;
  avatar?: string;
}
