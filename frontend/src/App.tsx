import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { ServiceProvider } from './contexts/ServiceContext';
import { ThemeProvider } from './components/theme-provider';
import PublicRoute from './components/PublicRoute';
import AuthGuard from './components/AuthGuard';
import CompanyCodeGuard from './components/CompanyCodeGuard';
import SmartRedirect from './components/SmartRedirect';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LoginSuccessPage from './pages/LoginSuccessPage';
import DiscordSetupPage from './pages/DiscordSetupPage';
import CompanyCodePage from './pages/CompanyCodePage';
import MyAccountsPage from './pages/MyAccountsPage';
import AddAccountPage from './pages/AddAccountPage';
import DashboardPage from './pages/DashboardPage';
import PrestationsPage from './pages/PrestationsPage';
import HistoriqueVentesPage from './pages/HistoriqueVentesPage';
import ListeVentesPage from './pages/ListeVentesPage';
import TransactionsPage from './pages/TransactionsPage';
import AddTransactionPage from './pages/AddTransactionPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
// Nouvelles pages
import BilanPage from './pages/BilanPage';
import ChargesPage from './pages/ChargesPage';
import FacturesPage from './pages/FacturesPage';
import ListeFacturesPage from './pages/ListeFacturesPage';
import EmployesPage from './pages/EmployesPage';
import HistoriqueEmployesPage from './pages/HistoriqueEmployesPage';
import VentesPage from './pages/VentesPage';
import SalairesPage from './pages/SalairesPage';
// Pages de gestion
import GestionRolesPage from './pages/GestionRolesPage';
import GestionItemsPage from './pages/GestionItemsPage';
import GestionPartenariatsPage from './pages/GestionPartenariatsPage';
import GestionEntreprisePage from './pages/GestionEntreprisePage';
import GestionStockPage from './pages/GestionStockPage';
import ModernTimersPage from './pages/ModernTimersPage';
import TimerAdminPage from './pages/TimerAdminPage';
import QuickTimerAdminPage from './pages/QuickTimerAdminPage';
import TimerHistoryPage from './pages/TimerHistoryPage';
import ServiceMonitoringPage from './pages/ServiceMonitoringPage';
import TechnicianAdminPage from './pages/TechnicianAdminPage';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="compta-ui-theme">
      <AuthProvider>
        <CompanyProvider>
          <ServiceProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Routes publiques */}
                  <Route path="/login" element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  } />
                  <Route path="/register" element={
                    <PublicRoute>
                      <RegisterPage />
                    </PublicRoute>
                  } />
                  <Route path="/login-success" element={<LoginSuccessPage />} />
                  <Route path="/complete-profile" element={<DiscordSetupPage />} />
                  <Route path="/company-code" element={<CompanyCodePage />} />
                  <Route path="/my-accounts" element={
                    <AuthGuard>
                      <MyAccountsPage />
                    </AuthGuard>
                  } />
                  <Route path="/add-account" element={
                    <AuthGuard>
                      <AddAccountPage />
                    </AuthGuard>
                  } />

                 


                  {/* Routes protégées */}
                  <Route path="/dashboard" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <DashboardPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/prestations" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <PrestationsPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/timers" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <ModernTimersPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/timer-admin" element={
                    <AuthGuard>
                      <TimerAdminPage />
                    </AuthGuard>
                  } />
                  <Route path="/quick-timer-admin" element={
                    <AuthGuard>
                      <QuickTimerAdminPage />
                    </AuthGuard>
                  } />
                  <Route path="/technician-admin" element={
                    <AuthGuard>
                      <TechnicianAdminPage />
                    </AuthGuard>
                  } />
                  <Route path="/timer-history" element={
                    <AuthGuard>
                      <TimerHistoryPage />
                    </AuthGuard>
                  } />
                  <Route path="/historique-ventes" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <HistoriqueVentesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/liste-ventes" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <ListeVentesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/transactions" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <TransactionsPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/add-transaction" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <AddTransactionPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/reports" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <ReportsPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/settings" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <SettingsPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/profile" element={
                    <AuthGuard>
                      <ProfilePage />
                    </AuthGuard>
                  } />
                  <Route path="/change-password" element={
                    <AuthGuard>
                      <ChangePasswordPage />
                    </AuthGuard>
                  } />

                  {/* Nouvelles routes */}
                  <Route path="/bilan" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <BilanPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/charges" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <ChargesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/factures" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <FacturesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/employes" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <EmployesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/historique-employes" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <HistoriqueEmployesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/ventes" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <VentesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/salaires" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <SalairesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />

                  <Route path="/service-monitoring" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <ServiceMonitoringPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />

                  <Route path="/liste-factures" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <ListeFacturesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />

                  {/* Pages de gestion */}
                  <Route path="/gestion-roles" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <GestionRolesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/gestion-items" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <GestionItemsPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/gestion-partenariats" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <GestionPartenariatsPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/gestion-entreprise" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <GestionEntreprisePage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/gestion-stock" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <GestionStockPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/permissions/:companyId" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <GestionRolesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />
                  <Route path="/roles-management/:companyId" element={
                    <AuthGuard>
                      <CompanyCodeGuard>
                        <GestionRolesPage />
                      </CompanyCodeGuard>
                    </AuthGuard>
                  } />

                  {/* Redirection par défaut intelligente */}
                  <Route path="/" element={<SmartRedirect />} />

                  {/* Route 404 */}
                  <Route path="*" element={
                    <div className="min-h-screen flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                        <p className="text-gray-600 mb-4">Page non trouvée</p>
                        <a href="/dashboard" className="text-indigo-600 hover:text-indigo-500">
                          Retour au tableau de bord
                        </a>
                      </div>
                    </div>
                  } />
                </Routes>

                {/* Notifications toast ultra-premium */}
                <Toaster
                  position="top-right"
                  gutter={12}
                  toastOptions={{
                    duration: 4000,
                    className: 'toast-ultra-premium',
                    style: {
                      background: 'linear-gradient(135deg, var(--card) 0%, oklch(from var(--card) calc(l * 0.98) c h) 100%)',
                      color: 'var(--card-foreground)',
                      border: '1px solid var(--border)',
                      borderRadius: '1rem',
                      padding: '1.125rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(16px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                      maxWidth: '450px',
                      minHeight: '64px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                    },
                    success: {
                      duration: 3500,
                      iconTheme: {
                        primary: 'oklch(0.65 0.18 150)',
                        secondary: 'oklch(0.99 0 0)',
                      },
                      style: {
                        background: 'linear-gradient(135deg, var(--card) 0%, oklch(from var(--success) l c h / 0.05) 100%)',
                        color: 'var(--card-foreground)',
                        border: '1.5px solid oklch(from var(--success) l c h / 0.4)',
                        borderRadius: '1rem',
                        padding: '1.125rem 1.5rem',
                        boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.25), 0 10px 10px -5px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(16, 185, 129, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                      },
                    },
                    error: {
                      duration: 5000,
                      iconTheme: {
                        primary: 'oklch(0.60 0.22 25)',
                        secondary: 'oklch(0.99 0 0)',
                      },
                      style: {
                        background: 'linear-gradient(135deg, var(--card) 0%, oklch(from var(--destructive) l c h / 0.05) 100%)',
                        color: 'var(--card-foreground)',
                        border: '1.5px solid oklch(from var(--destructive) l c h / 0.4)',
                        borderRadius: '1rem',
                        padding: '1.125rem 1.5rem',
                        boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.25), 0 10px 10px -5px rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(239, 68, 68, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                      },
                    },
                    loading: {
                      iconTheme: {
                        primary: 'oklch(0.55 0.22 270)',
                        secondary: 'oklch(0.99 0 0)',
                      },
                      style: {
                        background: 'linear-gradient(135deg, var(--card) 0%, oklch(from var(--primary) l c h / 0.05) 100%)',
                        color: 'var(--card-foreground)',
                        border: '1.5px solid oklch(from var(--primary) l c h / 0.4)',
                        borderRadius: '1rem',
                        padding: '1.125rem 1.5rem',
                        boxShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.25), 0 10px 10px -5px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(139, 92, 246, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </ServiceProvider>
        </CompanyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
