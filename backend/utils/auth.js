const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Le mot de passe doit contenir au moins ${minLength} caractères`);
  }
  
  if (!hasUpperCase) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
  }
  
  if (!hasLowerCase) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
  }
  
  if (!hasNumbers) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  if (!hasSpecialChar) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const sanitizeUser = (user) => {
  const sanitized = user.toObject ? user.toObject() : user;
  delete sanitized.password;
  delete sanitized.__v;
  return sanitized;
};

module.exports = {
  generateToken,
  validatePassword,
  sanitizeUser
};
