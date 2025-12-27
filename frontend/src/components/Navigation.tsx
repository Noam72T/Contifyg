import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ModeToggle } from './mode-toggle';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-card shadow-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">C</span>
                </div>
                <h1 className="text-xl font-bold text-card-foreground">Compta System</h1>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <ModeToggle />
            {user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-card-foreground">
                    {user.firstName} {user.lastName}
                  </span>
                </div>

                <Link
                  to="/profile"
                  className="text-muted-foreground hover:text-card-foreground px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Profil</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-card-foreground px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
