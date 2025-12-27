import React from 'react';
import { ModeToggle } from './mode-toggle';

const TopBar: React.FC = () => {
  return (
    <div className="fixed top-4 right-4 z-40">
      <ModeToggle />
    </div>
  );
};

export default TopBar;
