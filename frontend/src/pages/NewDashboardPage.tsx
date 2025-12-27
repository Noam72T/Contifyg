import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Award,
  Clock,
  CreditCard
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Données factices pour les graphiques
  const chartData = [
    { name: 'Lun', value: 500 },
    { name: 'Mar', value: 800 },
    { name: 'Mer', value: 600 },
    { name: 'Jeu', value: 1200 },
    { name: 'Ven', value: 900 },
    { name: 'Sam', value: 400 },
    { name: 'Dim', value: 300 },
    { name: 'Lun', value: 700 },
    { name: 'Mar', value: 1100 },
    { name: 'Mer', value: 650 },
    { name: 'Jeu', value: 850 },
    { name: 'Ven', value: 950 },
  ];

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              👋 Salut {user.firstName}
            </h1>
            <p className="text-muted-foreground">Numéro employé: #{user.idUser}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Salaire S33"
            value="0"
            subtitle="0,00%"
            icon={DollarSign}
            trend="down"
            trendValue="0,00%"
          />
          <StatCard
            title="Nombre de ventes S33"
            value="0"
            subtitle="0,00%"
            icon={TrendingUp}
            trend="down"
            trendValue="0,00%"
          />
          <StatCard
            title="Employé de la semaine"
            value="N/A"
            subtitle="N/A"
            icon={Award}
          />
          <StatCard
            title="Grade actuel"
            value="PDG"
            subtitle="Pourcentage: 90%"
            icon={Users}
          />
          <StatCard
            title="Heures travaillées S33"
            value="0,008 h"
            subtitle="99,97%"
            icon={Clock}
            trend="down"
            trendValue="99,97%"
          />
        </div>

        {/* Main Content Grid */}
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
                Chiffre d'affaire par jour
              </h3>
              <p className="text-sm text-muted-foreground">2 dernières semaines</p>
            </div>
            <div className="h-64">
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
                <span className="text-sm font-medium text-foreground">PDG</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Compte bancaire</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {user.compteBancaire || '775'}
                </span>
              </div>

              {/* Finances */}
              <div className="space-y-3 pt-4">
                <h4 className="font-medium text-foreground">Finances</h4>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Chiffre d'affaires :</span>
                  <span className="text-sm font-medium text-foreground">0</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avances :</span>
                  <span className="text-sm font-medium text-foreground">0</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Primes :</span>
                  <span className="text-sm font-medium text-foreground">0</span>
                </div>
                
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">Salaire brut :</span>
                  <span className="text-sm font-medium text-foreground">0</span>
                </div>
              </div>

              {/* Salaire à verser */}
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Salaire Total</span>
                  <span className="text-lg font-bold text-primary">0</span>
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
