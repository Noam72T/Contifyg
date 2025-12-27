import { z } from 'zod';

// Schéma pour la validation du numéro de téléphone format 555-XXXXXXX
const phoneRegex = /^555-\d+$/;

// Schéma pour la validation compte bancaire (maximum 7 chiffres)
const compteBancaireRegex = /^\d{1,7}$/;

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Le nom d\'utilisateur est requis')
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis')
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'),
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  lastName: z
    .string()
    .min(1, 'Le nom de famille est requis')
    .max(50, 'Le nom de famille ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le nom de famille ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  phoneNumber: z
    .string()
    .optional()
    .refine((val) => !val || phoneRegex.test(val), 'Le numéro de téléphone doit commencer par 555- suivi de chiffres'),
  compteBancaire: z
    .string()
    .optional()
    .refine((val) => !val || compteBancaireRegex.test(val), 'Le numéro de compte bancaire ne peut contenir que des chiffres (maximum 7)'),
  charId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'L\'ID du personnage GLife doit être un nombre'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
    .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Le mot de passe doit contenir au moins un caractère spécial'),
  confirmPassword: z
    .string()
    .min(1, 'La confirmation du mot de passe est requise')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword']
  }
);

export const companyCodeSchema = z.object({
  companyCode: z
    .string()
    .min(1, 'Le code d\'entreprise est requis')
    .min(8, 'Le code d\'entreprise doit contenir au moins 8 caractères')
});

export const discordCompleteSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  lastName: z
    .string()
    .min(1, 'Le nom de famille est requis')
    .max(50, 'Le nom de famille ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le nom de famille ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  phoneNumber: z
    .string()
    .min(1, 'Le numéro de téléphone est requis')
    .regex(phoneRegex, 'Format de numéro de téléphone invalide'),
  idUser: z
    .string()
    .min(1, 'L\'ID utilisateur est requis')
    .min(3, 'L\'ID utilisateur doit contenir au moins 3 caractères'),
  compteBancaire: z
    .string()
    .optional()
    .refine((val) => !val || compteBancaireRegex.test(val), 'Le numéro de compte bancaire ne peut contenir que des chiffres (maximum 7)'),
  username: z
    .string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
    .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Le mot de passe doit contenir au moins un caractère spécial'),
  confirmPassword: z
    .string()
    .min(1, 'La confirmation du mot de passe est requise')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword']
  }
);

export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  lastName: z
    .string()
    .min(1, 'Le nom de famille est requis')
    .max(50, 'Le nom de famille ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le nom de famille ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  phoneNumber: z
    .string()
    .min(1, 'Le numéro de téléphone est requis')
    .regex(phoneRegex, 'Le numéro de téléphone doit commencer par 555- suivi de chiffres'),
  compteBancaire: z
    .string()
    .min(1, 'Le compte bancaire est requis')
    .regex(compteBancaireRegex, 'Le numéro de compte bancaire ne peut contenir que des chiffres (maximum 7)'),
  charId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'L\'ID du personnage GLife doit être un nombre'),
  email: z
    .string()
    .email('Format d\'email invalide')
    .optional()
    .or(z.literal('')),
  avatar: z
    .string()
    .optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Le mot de passe actuel est requis'),
  newPassword: z
    .string()
    .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le nouveau mot de passe doit contenir au moins une lettre majuscule')
    .regex(/[a-z]/, 'Le nouveau mot de passe doit contenir au moins une lettre minuscule')
    .regex(/\d/, 'Le nouveau mot de passe doit contenir au moins un chiffre')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Le nouveau mot de passe doit contenir au moins un caractère spécial'),
  confirmNewPassword: z
    .string()
    .min(1, 'La confirmation du nouveau mot de passe est requise')
}).refine(
  (data) => data.newPassword === data.confirmNewPassword,
  {
    message: 'Les nouveaux mots de passe ne correspondent pas',
    path: ['confirmNewPassword']
  }
);

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CompanyCodeFormData = z.infer<typeof companyCodeSchema>;
export type DiscordCompleteFormData = z.infer<typeof discordCompleteSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
