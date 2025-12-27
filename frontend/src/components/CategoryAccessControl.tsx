import React from 'react';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface CategoryAccessControlProps {
  category: 'GENERALE' | 'PAPERASSE' | 'ADMINISTRATION' | 'GESTION';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const CategoryAccessControl: React.FC<CategoryAccessControlProps> = ({
  category,
  children,
  fallback = null
}) => {
  const { canViewCategory, loading } = useUserPermissions();

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-8 rounded"></div>;
  }

  if (!canViewCategory(category)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface NavigationItem {
  name: string;
  href: string;
  category: 'GENERALE' | 'PAPERASSE' | 'ADMINISTRATION' | 'GESTION';
  icon?: React.ComponentType<any>;
}

interface CategoryBasedNavigationProps {
  items: NavigationItem[];
  renderItem: (item: NavigationItem) => React.ReactNode;
}

export const CategoryBasedNavigation: React.FC<CategoryBasedNavigationProps> = ({
  items,
  renderItem
}) => {
  const { canViewCategory, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-10 rounded"></div>
        ))}
      </div>
    );
  }

  const accessibleItems = items.filter(item => canViewCategory(item.category));

  return (
    <div className="space-y-1">
      {accessibleItems.map(item => (
        <div key={item.href}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
};

export default CategoryAccessControl;
