// Script manuel pour générer un code de test
// Exécutez ce script dans la console MongoDB ou utilisez les valeurs directement

const testCode = {
  code: "LW" + Math.random().toString(36).substr(2, 6).toUpperCase(),
  description: "Code de test pour Liberty Walk",
  maxUses: 10,
  expiresAt: null
};

console.log("Code de test généré:", testCode.code);

// Exemple de document CompanyCode à insérer manuellement
const companyCodeDocument = {
  code: testCode.code,
  company: "COMPANY_ID_HERE", // Remplacez par l'ID de Liberty Walk
  generatedBy: "USER_ID_HERE", // Remplacez par l'ID du propriétaire
  isActive: true,
  maxUses: 10,
  currentUses: 0,
  expiresAt: null,
  description: "Code de test généré pour Liberty Walk - Tests d'inscription",
  usageHistory: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

console.log("Document à insérer:", JSON.stringify(companyCodeDocument, null, 2));
