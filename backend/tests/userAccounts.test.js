/**
 * TESTS AUTOMATISÉS - SYSTÈME DE DOUBLE COMPTE
 * 
 * Pour exécuter ces tests:
 * 1. Installer les dépendances: npm install --save-dev jest supertest
 * 2. Ajouter dans package.json: "test": "jest"
 * 3. Exécuter: npm test
 */

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../server'); // Assure-toi que server.js exporte l'app
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');

describe('Système de Double Compte - Tests', () => {
  let token1, token2;
  let user1, user2;
  let company1, company2;
  let role1, role2;

  // Configuration avant tous les tests
  beforeAll(async () => {
    // Connexion à la base de données de test
    const testDbUri = process.env.MONGODB_URI;
    await mongoose.connect(testDbUri);
    
    // Nettoyer la base de données
    await User.deleteMany({});
    await Company.deleteMany({});
    await Role.deleteMany({});
    
    // Supprimer l'index unique sur discordId pour permettre les tests de double compte
    try {
      await User.collection.dropIndex('discordId_unique_sparse');
      console.log('✅ Index discordId_unique_sparse supprimé pour les tests');
    } catch (error) {
      // L'index n'existe peut-être pas, ce n'est pas grave
      console.log('ℹ️ Index discordId_unique_sparse non trouvé (normal si première exécution)');
    }
  });

  // Nettoyage après tous les tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Préparation des données de test
  beforeEach(async () => {
    // Hasher le mot de passe pour les tests
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Créer un utilisateur propriétaire pour les entreprises
    const ownerUser = await User.create({
      username: 'owner',
      password: hashedPassword,
      firstName: 'Owner',
      lastName: 'Test',
      email: 'owner@test.com',
      phoneNumber: '555-0000000',
      compteBancaire: '0000000',
      systemRole: 'Utilisateur',
      isActivated: true,
      isCompanyValidated: false
    });

    // Créer 2 entreprises
    company1 = await Company.create({
      name: 'Entreprise Test A',
      companyCode: 'TESTA',
      category: 'Service',
      owner: ownerUser._id,
      isActive: true
    });

    company2 = await Company.create({
      name: 'Entreprise Test B',
      companyCode: 'TESTB',
      category: 'Commerce',
      owner: ownerUser._id,
      isActive: true
    });

    // Créer des rôles
    role1 = await Role.create({
      nom: 'Employé A',
      company: company1._id,
      creePar: ownerUser._id,
      level: 1,
      normeSalariale: 50,
      typeContrat: 'CDI',
      actif: true
    });

    role2 = await Role.create({
      nom: 'Employé B',
      company: company2._id,
      creePar: ownerUser._id,
      level: 1,
      normeSalariale: 60,
      typeContrat: 'CDI',
      actif: true
    });

    // Créer 2 utilisateurs avec le même discordId (double compte)
    user1 = await User.create({
      username: 'testuser1',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phoneNumber: '555-1234567',
      compteBancaire: '1234567',
      discordId: 'discord123',
      discordUsername: 'JohnDiscord',
      company: company1._id,
      role: role1._id,
      systemRole: 'Utilisateur',
      isActivated: true,
      isCompanyValidated: true,
      primes: 100,
      avances: 50,
      socialScore: 75
    });

    user2 = await User.create({
      username: 'testuser2',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john2@test.com',
      phoneNumber: '555-7654321',
      compteBancaire: '7654321',
      discordId: 'discord123', // Même discordId
      discordUsername: 'JohnDiscord',
      company: company2._id,
      role: role2._id,
      systemRole: 'Utilisateur',
      isActivated: true,
      isCompanyValidated: true,
      primes: 200,
      avances: 0,
      socialScore: 90
    });

    // Obtenir les tokens
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser1', password: 'password123' });
    token1 = login1.body.token;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser2', password: 'password123' });
    token2 = login2.body.token;
  });

  // Nettoyage après chaque test
  afterEach(async () => {
    await User.deleteMany({});
    await Company.deleteMany({});
    await Role.deleteMany({});
  });

  /**
   * TEST 1: Récupération de tous les comptes
   */
  describe('GET /api/user-accounts', () => {
    it('devrait retourner tous les comptes avec le même discordId', async () => {
      const response = await request(app)
        .get('/api/user-accounts')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accounts).toHaveLength(2);
      expect(response.body.accounts[0].username).toBeDefined();
      expect(response.body.accounts[0].company).toBeDefined();
    });

    it('devrait marquer le compte actuel comme isCurrent', async () => {
      const response = await request(app)
        .get('/api/user-accounts')
        .set('Authorization', `Bearer ${token1}`);

      const currentAccount = response.body.accounts.find(acc => acc.isCurrent);
      expect(currentAccount).toBeDefined();
      expect(currentAccount.username).toBe('testuser1');
    });
  });

  /**
   * TEST 2: Switch entre comptes
   */
  describe('POST /api/user-accounts/switch', () => {
    it('devrait permettre le switch vers un autre compte', async () => {
      const response = await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${token1}`)
        .send({ accountId: user2._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });

    it('devrait retourner TOUTES les données nécessaires', async () => {
      const response = await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${token1}`)
        .send({ accountId: user2._id.toString() });

      const user = response.body.user;

      // Vérifier tous les champs obligatoires
      expect(user._id).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user._id).toBe(user.id); // Les deux doivent être identiques
      expect(user.username).toBe('testuser2');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.email).toBeDefined();
      expect(user.phoneNumber).toBeDefined();
      expect(user.compteBancaire).toBeDefined();
      expect(user.company).toBeDefined();
      expect(user.currentCompany).toBeDefined();
      expect(user.companies).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.systemRole).toBe('Utilisateur');
      expect(user.isActivated).toBe(true);
      expect(user.isCompanyValidated).toBe(true);
      expect(user.discordId).toBe('discord123');
      expect(user.discordUsername).toBe('JohnDiscord');
      expect(user.lastLogin).toBeDefined();
      expect(user.primes).toBe(200);
      expect(user.avances).toBe(0);
      expect(user.socialScore).toBe(90);
    });

    it('devrait mettre à jour lastLogin', async () => {
      const beforeSwitch = new Date();
      
      await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${token1}`)
        .send({ accountId: user2._id.toString() });

      const updatedUser = await User.findById(user2._id);
      expect(new Date(updatedUser.lastLogin)).toBeInstanceOf(Date);
      expect(new Date(updatedUser.lastLogin).getTime()).toBeGreaterThanOrEqual(beforeSwitch.getTime());
    });

    it('ne devrait pas permettre le switch vers un compte inactif', async () => {
      // Désactiver user2
      await User.findByIdAndUpdate(user2._id, { isActive: false });

      const response = await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${token1}`)
        .send({ accountId: user2._id.toString() });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('désactivé');
    });

    it('ne devrait pas permettre le switch vers un compte inexistant', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${token1}`)
        .send({ accountId: fakeId.toString() });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('ne devrait pas permettre le switch vers un compte d\'un autre utilisateur', async () => {
      // Créer un utilisateur complètement différent
      const otherUser = await User.create({
        username: 'otheruser',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        phoneNumber: '555-9999999',
        compteBancaire: '9999999',
        discordId: 'discord999', // discordId différent
        company: company1._id,
        role: role1._id,
        systemRole: 'Utilisateur',
        isActivated: true,
        isCompanyValidated: true
      });

      const response = await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${token1}`)
        .send({ accountId: otherUser._id.toString() });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('autorisation');
    });
  });

  /**
   * TEST 3: Création d'un nouveau compte
   */
  describe('POST /api/user-accounts/create', () => {
    it('devrait créer un nouveau compte pour une autre entreprise', async () => {
      const response = await request(app)
        .post('/api/user-accounts/create')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyCode: 'TESTB',
          firstName: 'John',
          lastName: 'Doe',
          username: 'testuser3',
          password: 'password123',
          phoneNumber: '555-3333333',
          compteBancaire: '3333333'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.account).toBeDefined();
      expect(response.body.account.username).toBe('testuser3');
      expect(response.body.account.company.name).toBe('Entreprise Test B');
    });

    it('ne devrait pas créer un compte si l\'utilisateur a déjà un compte pour cette entreprise', async () => {
      const response = await request(app)
        .post('/api/user-accounts/create')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyCode: 'TESTA', // Même entreprise que user1
          firstName: 'John',
          lastName: 'Doe',
          username: 'testuser4',
          password: 'password123',
          phoneNumber: '555-4444444',
          compteBancaire: '4444444'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('déjà un compte');
    });

    it('ne devrait pas créer un compte avec un username déjà pris', async () => {
      const response = await request(app)
        .post('/api/user-accounts/create')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyCode: 'TESTB',
          firstName: 'John',
          lastName: 'Doe',
          username: 'testuser2', // Username déjà pris
          password: 'password123',
          phoneNumber: '555-5555555',
          compteBancaire: '5555555'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('déjà pris');
    });
  });

  /**
   * TEST 4: Tests de régression
   */
  describe('Tests de régression', () => {
    it('devrait supporter plusieurs switches consécutifs', async () => {
      // Switch 1→2
      const switch1 = await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${token1}`)
        .send({ accountId: user2._id.toString() });
      
      expect(switch1.status).toBe(200);
      const newToken1 = switch1.body.token;

      // Switch 2→1
      const switch2 = await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${newToken1}`)
        .send({ accountId: user1._id.toString() });
      
      expect(switch2.status).toBe(200);
      const newToken2 = switch2.body.token;

      // Switch 1→2 encore
      const switch3 = await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${newToken2}`)
        .send({ accountId: user2._id.toString() });
      
      expect(switch3.status).toBe(200);
      expect(switch3.body.user.username).toBe('testuser2');
    });

    it('devrait préserver les données financières après switch', async () => {
      const response = await request(app)
        .post('/api/user-accounts/switch')
        .set('Authorization', `Bearer ${token1}`)
        .send({ accountId: user2._id.toString() });

      expect(response.body.user.primes).toBe(200);
      expect(response.body.user.avances).toBe(0);
      expect(response.body.user.socialScore).toBe(90);
    });
  });
});

/**
 * INSTRUCTIONS D'EXÉCUTION:
 * 
 * 1. Installer les dépendances:
 *    npm install --save-dev jest supertest
 * 
 * 2. Ajouter dans package.json:
 *    "scripts": {
 *      "test": "jest",
 *      "test:watch": "jest --watch"
 *    }
 * 
 * 3. Créer un fichier .env.test avec:
 *    MONGODB_URI_TEST=mongodb://localhost:27017/test_db
 *    JWT_SECRET=test_secret_key
 * 
 * 4. Exécuter les tests:
 *    npm test
 * 
 * 5. Exécuter en mode watch:
 *    npm run test:watch
 */
