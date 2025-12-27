import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Award,
  Clock,
  CreditCard,
  Building,
  AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
// Import useCompanySwitch supprimé - les useEffect se déclenchent naturellement
import Layout from '../components/Layout';
import api from '../utils/api';
import { calculateEmployeeSalary } from '../services/salaryService';

interface UserStats {
  role?: string;
  chiffreAffaires: number;
  avances: number;
  primes: number;
  salaireBrut: number;
  salaireAVerser: number;
  socialScore: number;
}

const DashboardPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { selectedCompany, companyData, isLoading } = useCompany();

  // TOUS LES STATES ET REFS DOIVENT ÊTRE DÉCLARÉS EN PREMIER (règles des hooks)
  const [userStats, setUserStats] = useState<UserStats>({
    chiffreAffaires: 0,
    avances: 0,
    primes: 0,
    salaireBrut: 0,
    salaireAVerser: 0,
    socialScore: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [chartData, setChartData] = useState<Array<{name: string, value: number}>>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const isLoadingRef = useRef(false);
  const isLoadingChartRef = useRef(false);

  // Gérer le token Discord depuis l'URL (useEffect APRÈS tous les useState/useRef)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const discordSuccess = urlParams.get('discord');
    
    if (token && discordSuccess === 'success') {
      console.log('🔑 Token Discord reçu dans l\'URL');
      
      // Sauvegarder le token dans localStorage
      localStorage.setItem('token', token);
      
      // Nettoyer l'URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // IMPORTANT : Rafraîchir les données utilisateur pour mettre à jour le contexte Auth
      // Cela évite d'être redirigé vers /login par les guards de route
      // force=true pour contourner le throttling lors de la connexion Discord
      if (refreshUser) {
        console.log('🔄 Rafraîchissement forcé des données utilisateur Discord');
        // @ts-ignore - Le paramètre force existe mais TypeScript n'a pas encore rechargé les types
        refreshUser(true).then(() => {
          console.log('✅ Données utilisateur Discord rafraîchies - Contexte Auth mis à jour');
        }).catch(error => {
          console.error('❌ Erreur lors du rafraîchissement:', error);
          // En cas d'erreur, recharger la page pour forcer la réinitialisation
          window.location.reload();
        });
      }
    }
  }, [refreshUser]);

  // Charger toutes les données en une seule fois
  useEffect(() => {
    // Éviter les appels multiples simultanés
    if (isLoadingRef.current) return;
    
    const fetchAllData = async () => {
      if (!user || !selectedCompany) {
        
        setLoadingStats(false);
        setLoadingChart(false);
        return;
      }

     

      try {
        isLoadingRef.current = true;
        setLoadingStats(true);
        setLoadingChart(true);

        // Récupérer les données utilisateur avec rôle (populate le rôle)
        const userResponse = await api.get(`/users?company=${selectedCompany._id}`);
        
        
        // Vérifier la structure de la réponse
        const users = Array.isArray(userResponse.data) ? userResponse.data : 
                     userResponse.data?.users ? userResponse.data.users : [];
        
        
        // Utiliser l'ID correct selon la structure de l'objet user
        const userId = user._id || (user as any).id || (user as any).userId;
        
        
        const currentUser = users.find((u: any) => u._id === userId);
        
        
        if (!selectedCompany?._id || !currentUser) return;
        
        setLoadingStats(true);
        
        let chiffreAffaires = 0;
        let chiffreAffairesVentes = 0;
        let ventes: any[] = []; // Declare ventes outside the try block
        
        // Calculer la semaine courante selon ISO 8601
        const getCurrentWeek = () => {
          const date = new Date();
          const d = new Date(date.getTime());
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
          const week1 = new Date(d.getFullYear(), 0, 4);
          return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        };
        
        const selectedWeek = getCurrentWeek();
        const selectedYear = new Date().getFullYear();
        
        try {
          
          
          
          // Récupérer les ventes pour la semaine courante (même logique que SalairesPage)
          
          
          const ventesResponse = await api.get(`/ventes?companyId=${selectedCompany._id}&week=${selectedWeek}&year=${selectedYear}`);
          ventes = ventesResponse?.data?.ventes || []; // Assign to the outer scope variable
          
          
          
          // Filtrer les ventes de l'utilisateur (même logique que SalairesPage)
          const ventesEmploye = ventes.filter((vente: any) => {
            return vente.vendeur?._id === userId || 
                   vente.vendeur?.username === currentUser?.username ||
                   vente.vendeurNom === currentUser?.username ||
                   vente.vendeurNom === `${currentUser?.firstName} ${currentUser?.lastName}`;
          });
          
          
          
          
          
          // CA individuel = somme des marges des ventes de l'utilisateur (totalCommission)
          chiffreAffairesVentes = ventesEmploye.reduce((total: number, vente: any) => 
            total + (vente.totalCommission || 0), 0
          );
          
          
          
        } catch (ventesError) {
          
        }
        
        // Récupérer les sessions de timer pour la semaine courante (même logique que SalairesPage)
        let chiffreAffairesTimer = 0;
        try {
          
          let timerSessions = [];
          
          try {
            // Essayer d'abord l'API des sessions timer
            const timerResponse = await api.get(`/timers/sessions/history/${selectedCompany._id}?week=${selectedWeek}_${selectedYear}`);
            timerSessions = timerResponse?.data?.sessions || timerResponse?.data || [];
            
            
            // Si pas de sessions, essayer l'API d'historique directement
            if (timerSessions.length === 0) {
              
              const apiUrl = import.meta.env.VITE_API_URL;
              const token = localStorage.getItem('token');
              
              const historyResponse = await fetch(`${apiUrl}/api/timers/sessions/history/${selectedCompany._id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                timerSessions = historyData.sessions || historyData || [];
                
              }
            }
          } catch (error) {
            
            timerSessions = [];
          }
          
          // TEMPORAIRE : Si aucune session récupérée, utiliser les données visibles dans l'historique
          if (timerSessions.length === 0) {
            
          }
          
          // Filtrer les sessions timer de l'utilisateur (même logique que SalairesPage)
          const timerSessionsEmploye = timerSessions.filter((session: any) => {
            // Si l'utilisateur est spécifié, filtrer par utilisateur
            if (session.utilisateur?._id || session.utilisateur?.username || session.utilisateurNom) {
              return session.utilisateur?._id === userId || 
                     session.utilisateur?.username === currentUser?.username ||
                     session.utilisateurNom === currentUser?.username ||
                     session.utilisateurNom === `${currentUser?.firstName} ${currentUser?.lastName}`;
            }
            
            // TEMPORAIRE : FORCER l'attribution de TOUTES les sessions sans utilisateur
            // à l'utilisateur connecté (pour debug)
           
            return true;
          });
          
          
          
          chiffreAffairesTimer = timerSessionsEmploye.reduce((total: number, session: any) => {
            let coutSession = session.coutTotal || 0;
            
            // Si le coût est 0, le recalculer (même logique que dans TimerHistoryPage)
            if (coutSession === 0 && session.dureeMinutes > 0) {
              const tarifParMinute = 500; // Tarif par défaut
              coutSession = (session.dureeMinutes + (session.dureeSecondes || 0) / 60) * tarifParMinute;
             
            }
            
            return total + coutSession;
          }, 0);
          
          
          
        } catch (timerError) {
          
          chiffreAffairesTimer = 0;
        }
        
        // Chiffre d'affaires total = ventes + timer
        chiffreAffaires = chiffreAffairesVentes + chiffreAffairesTimer;
        
        // Utiliser les données directement du user context pour avances et primes
        const avances = parseFloat(currentUser?.avances?.toString() || '0');
        const primes = parseFloat(currentUser?.primes?.toString() || '0');
        
      
        
        // Récupérer la norme salariale du rôle (en pourcentage)
        const normeSalariale = currentUser?.companies?.[0]?.role?.normeSalariale || 
                              currentUser?.role?.normeSalariale || 0;
        
        // Récupérer le score social depuis les données utilisateur récupérées via l'API (plus à jour)
        const socialScore = currentUser?.socialScore || 0;
        
        // DEBUG: Afficher les valeurs pour comprendre pourquoi le salaire est 0
        console.log('🔍 DEBUG SALAIRE:', {
          chiffreAffaires,
          normeSalariale,
          socialScore,
          roleInfo: currentUser?.companies?.[0]?.role || currentUser?.role,
          currentUser: currentUser
        });
        
        // Utiliser le service de calcul de salaire avec plafonnement
        const salaryResult = calculateEmployeeSalary(chiffreAffaires, normeSalariale, socialScore);
        console.log('💰 Résultat calcul salaire:', salaryResult);
        const salaireCalcule = salaryResult.salaireCalculeFinal;
        
        
        // Calculer le salaire total (salaire brut + primes - avances)
        const salaireTotal = salaireCalcule + primes - avances;
        
        // Récupérer le rôle avec la même logique que SalairesPage
        const roleInfo = currentUser?.companies?.[0]?.role || currentUser?.role;
        const roleNom = roleInfo?.nom || 'Employé';
        
        setUserStats({
          role: roleNom,
          chiffreAffaires: chiffreAffaires,
          avances: avances,
          primes: primes,
          salaireBrut: salaireCalcule,
          salaireAVerser: salaireTotal,
          socialScore: socialScore
        });

        // Charger les données du graphique par jour de la semaine courante
        try {
          // Utiliser TOUTES les ventes de l'entreprise pour le graphique (même calcul que le bilan)
          const ventesGraph = ventes;
          
          // Créer un objet pour stocker le CA par jour de la semaine
          const caParJour: { [key: string]: number } = {
            'Lundi': 0,
            'Mardi': 0,
            'Mercredi': 0,
            'Jeudi': 0,
            'Vendredi': 0,
            'Samedi': 0,
            'Dimanche': 0
          };
          
          // Calculer le CA total pour chaque jour (marges = totalCommission)
          ventesGraph.forEach((vente: any) => {
            if (vente.dateVente && vente.totalCommission) {
              const dateVente = new Date(vente.dateVente);
              const jourSemaine = dateVente.getDay(); // 0 = dimanche, 1 = lundi, etc.
              
              // Convertir le numéro du jour en nom (CORRECTION: dimanche=0, lundi=1, etc.)
              const nomsJours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
              const nomJour = nomsJours[jourSemaine];
              
              if (caParJour[nomJour] !== undefined) {
                caParJour[nomJour] += vente.totalCommission;
              }
            }
          });
          
          // Convertir en format pour le graphique (dans l'ordre lundi à dimanche)
          const chartDataJours = [
            { name: 'Lundi', value: Math.round(caParJour['Lundi']) },
            { name: 'Mardi', value: Math.round(caParJour['Mardi']) },
            { name: 'Mercredi', value: Math.round(caParJour['Mercredi']) },
            { name: 'Jeudi', value: Math.round(caParJour['Jeudi']) },
            { name: 'Vendredi', value: Math.round(caParJour['Vendredi']) },
            { name: 'Samedi', value: Math.round(caParJour['Samedi']) },
            { name: 'Dimanche', value: Math.round(caParJour['Dimanche']) }
          ];
          
          setChartData(chartDataJours);
          
        } catch (chartError) {
          console.error('Erreur lors du chargement des données du graphique:', chartError);
          // Données par défaut en cas d'erreur (7 jours à 0)
          setChartData([
            { name: 'Lundi', value: 0 },
            { name: 'Mardi', value: 0 },
            { name: 'Mercredi', value: 0 },
            { name: 'Jeudi', value: 0 },
            { name: 'Vendredi', value: 0 },
            { name: 'Samedi', value: 0 },
            { name: 'Dimanche', value: 0 }
          ]);
        }
        
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        isLoadingRef.current = false;
        setLoadingStats(false);
        setLoadingChart(false);
      }
    };

    // Réinitialiser les refs quand l'entreprise change pour permettre le rechargement
    isLoadingRef.current = false;
    isLoadingChartRef.current = false;
    
    fetchAllData();
  }, [user, selectedCompany]);

  // Charger les données du graphique par semaine
  useEffect(() => {
    // Éviter les appels multiples simultanés pour le graphique
    if (isLoadingChartRef.current) return;
    
    const fetchChartData = async () => {
      if (!selectedCompany) {
        console.log('🚫 Pas d\'entreprise pour le graphique');
        setLoadingChart(false);
        return;
      }

      console.log('📊 Chargement des données graphique pour:', selectedCompany.name);

      try {
        isLoadingChartRef.current = true;
        setLoadingChart(true);
        
        // Récupérer les ventes des 2 dernières semaines
        const response = await api.get(`/ventes/stats/weekly?companyId=${selectedCompany._id}&weeks=2`);
        
        if (response.data && response.data.length > 0) {
          setChartData(response.data);
        } else {
          // Données par défaut pour la semaine actuelle (S38) et précédente (S37)
          const currentWeek = (() => {
            const date = new Date();
            const d = new Date(date.getTime());
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
            const week1 = new Date(d.getFullYear(), 0, 4);
            return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
          })();
          
          setChartData([
            { name: `S${currentWeek - 1}`, value: 0 },
            { name: `S${currentWeek}`, value: 0 },
          ]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données du graphique:', error);
        // Données par défaut en cas d'erreur avec semaine actuelle
        const currentWeek = (() => {
          const date = new Date();
          const d = new Date(date.getTime());
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
          const week1 = new Date(d.getFullYear(), 0, 4);
          return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        })();
        
        setChartData([
          { name: `S${currentWeek - 1}`, value: 0 },
          { name: `S${currentWeek}`, value: 0 },
        ]);
      } finally {
        isLoadingChartRef.current = false;
        setLoadingChart(false);
      }
    };

    // Réinitialiser la ref pour permettre le rechargement
    isLoadingChartRef.current = false;
    
    fetchChartData();
  }, [selectedCompany]);

  if (!user) {
    return null;
  }

  // Fonction pour afficher le contenu selon l'entreprise sélectionnée
  const renderCompanySpecificContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3 text-muted-foreground">Chargement des données...</span>
        </div>
      );
    }

    if (companyData?.error) {
      return (
        <div className="flex items-center justify-center h-64 text-destructive">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>{companyData.error}</span>
        </div>
      );
    }

    if (selectedCompany) {
      return (
        <div className="space-y-6">
          {/* Statistiques spécifiques à l'entreprise */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Utilisateurs"
              value={companyData?.stats?.totalUsers || 0}
              subtitle="Total dans cette entreprise"
              icon={Users}
              trend="up"
              
            />
            <StatCard
              title="Utilisateurs actifs"
              value={companyData?.stats?.activeUsers || 0}
              subtitle="Connectés récemment"
              icon={Clock}
              trend="up"
              
            />
            <StatCard
              title="Revenus"
              value={loadingStats ? "Chargement..." : `$${userStats.chiffreAffaires.toFixed(2)}`}
              subtitle="Cette semaine"
              icon={DollarSign}
              trend="up"
              
            />
          </div>
        </div>
      );
    }

    // Vue globale (toutes les entreprises)
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-2">Vue d'ensemble - Toutes les entreprises</h2>
          <p className="text-muted-foreground">Aperçu global de toutes les entreprises du système</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total entreprises"
            value={companyData?.stats?.totalCompanies || 0}
            subtitle="Enregistrées"
            icon={Building}
            trend="up"
            trendValue="+2 ce mois"
          />
          <StatCard
            title="Total utilisateurs"
            value={companyData?.stats?.totalUsers || 0}
            subtitle="Sur toutes les entreprises"
            icon={Users}
            trend="up"
            trendValue="+12 ce mois"
          />
          <StatCard
            title="Revenus globaux"
            value="€0"
            subtitle="Toutes entreprises"
            icon={DollarSign}
            trend="up"
            trendValue="+8%"
          />
          <StatCard
            title="Performance système"
            value="92%"
            subtitle="Score global"
            icon={Award}
            trend="up"
            trendValue="+2%"
          />
        </div>
      </div>
    );
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-lg p-6 border border-border shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="text-sm font-medium">{trendValue}</span>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <span className="text-sm font-medium text-foreground">Tableau de bord</span>
            </li>
          </ol>
        </nav>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-muted-foreground">
              {selectedCompany 
                ? `Entreprise: ${selectedCompany.name} - Semaine ${
                    (() => {
                      const d = new Date();
                      d.setHours(0, 0, 0, 0);
                      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
                      const week1 = new Date(d.getFullYear(), 0, 4);
                      return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                    })()}`
                : 'Vue d\'ensemble de toutes vos entreprises'
              }
            </p>
          </div>
        </div>

        {/* Contenu spécifique à l'entreprise ou vue globale */}
        {renderCompanySpecificContent()}

        {/* Graphique et fiche de paie - toujours affichés */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-card rounded-lg p-6 border border-border shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Chiffre d'affaires par semaine
              </h3>
              <p className="text-sm text-muted-foreground">2 dernières semaines</p>
            </div>
            <div className="h-64">
              {loadingChart ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span className="ml-3 text-muted-foreground">Chargement...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    className="text-muted-foreground"
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Fiche de paie */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-lg p-6 border border-border shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Fiche de paie
              </h3>
            </div>

            <div className="space-y-4">
              {/* Rôle et Compte */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Rôle</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {loadingStats ? 'Chargement...' : (userStats.role || 'Employé')}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Compte bancaire</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {loadingStats ? 'Chargement...' : (user.compteBancaire || '75505')}
                </span>
              </div>

              {/* Finances */}
              <div className="space-y-3 pt-4">
                <h4 className="font-medium text-foreground">Finances</h4>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Chiffre d'affaires :</span>
                  <span className="text-sm font-medium text-foreground">
                    {loadingStats ? 'Chargement...' : `$${userStats.chiffreAffaires.toFixed(2)}`}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avances :</span>
                  <span className="text-sm font-medium text-foreground">
                    {loadingStats ? 'Chargement...' : `$${userStats.avances.toFixed(2)}`}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Primes :</span>
                  <span className="text-sm font-medium text-foreground">
                    {loadingStats ? 'Chargement...' : `$${userStats.primes.toFixed(2)}`}
                  </span>
                </div>
                
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">Salaire brut :</span>
                  <span className="text-sm font-medium text-foreground">
                    {loadingStats ? 'Chargement...' : `$${userStats.salaireBrut.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Salaire à verser */}
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Salaire à verser :</span>
                  <span className="text-lg font-bold text-primary">
                    {loadingStats ? 'Chargement...' : `$${userStats.salaireAVerser.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
