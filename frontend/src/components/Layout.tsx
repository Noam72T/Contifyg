import React from 'react';
import Sidebar  from '@/components/Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        <main className="h-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
