import React from 'react';
import { useRoles } from '../hooks/useRoles';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  fallback = null,
  showError = false
}) => {
  const { hasPermission } = useRoles();

  const hasAccess = hasPermission(permission);

  if (!hasAccess) {
    if (showError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-red-600 font-medium">Accès refusé</div>
          <div className="text-red-500 text-sm mt-1">
            Vous n'avez pas les permissions nécessaires pour accéder à cette fonctionnalité.
          </div>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
