import React from 'react';
import { DiscordIcon } from '../icons/DiscordIcon';

interface DiscordButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const DiscordButton: React.FC<DiscordButtonProps> = ({
  onClick,
  children,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#5865F2]/50 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2 disabled:cursor-not-allowed text-sm"
    >
      <DiscordIcon className="w-4 h-4" />
      {children}
    </button>
  );
};
