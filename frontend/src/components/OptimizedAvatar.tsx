import React, { memo, useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';

/**
 * Composant Avatar optimisé avec lazy loading et tailles configurables
 */

interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  fallbackIcon?: React.ReactNode;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
  showBorder?: boolean;
  borderColor?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-20 h-20 text-xl',
  '2xl': 'w-24 h-24 text-2xl',
  '3xl': 'w-32 h-32 text-3xl',
};

const iconSizes = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  '2xl': 48,
  '3xl': 64,
};

export const OptimizedAvatar = memo(({
  src,
  alt,
  size = 'md',
  className = '',
  fallbackIcon,
  onClick,
  loading = 'lazy',
  showBorder = false,
  borderColor = 'border-gray-300'
}: OptimizedAvatarProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!src || loading === 'eager') {
      setImageSrc(src || null);
      return;
    }

    // Lazy loading avec Intersection Observer
    if (imgRef.current && loading === 'lazy') {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              if (observerRef.current && imgRef.current) {
                observerRef.current.unobserve(imgRef.current);
              }
            }
          });
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  const baseClasses = `
    ${sizeClasses[size]}
    rounded-full
    object-cover
    ${showBorder ? `border-2 ${borderColor}` : ''}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const fallbackClasses = `
    ${sizeClasses[size]}
    rounded-full
    bg-gradient-to-br from-blue-400 to-blue-600
    flex items-center justify-center
    text-white font-semibold
    ${showBorder ? `border-2 ${borderColor}` : ''}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Si pas d'image ou erreur, afficher le fallback
  if (!imageSrc || hasError) {
    return (
      <div 
        className={fallbackClasses}
        onClick={onClick}
        title={alt}
      >
        {fallbackIcon || <User size={iconSizes[size]} />}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      {/* Placeholder pendant le chargement */}
      {!isLoaded && (
        <div className={fallbackClasses}>
          <div className="animate-pulse">
            {fallbackIcon || <User size={iconSizes[size]} />}
          </div>
        </div>
      )}
      
      {/* Image réelle */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`${baseClasses} ${!isLoaded ? 'hidden' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        loading={loading}
      />
    </div>
  );
});

OptimizedAvatar.displayName = 'OptimizedAvatar';

/**
 * Groupe d'avatars empilés
 */
interface AvatarGroupProps {
  avatars: Array<{
    src?: string | null;
    alt: string;
    id: string | number;
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AvatarGroup = memo(({
  avatars,
  max = 5,
  size = 'md',
  className = ''
}: AvatarGroupProps) => {
  const displayedAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={`flex items-center ${className}`}>
      {displayedAvatars.map((avatar, index) => (
        <div
          key={avatar.id}
          className="-ml-2 first:ml-0"
          style={{ zIndex: displayedAvatars.length - index }}
        >
          <OptimizedAvatar
            src={avatar.src}
            alt={avatar.alt}
            size={size}
            showBorder={true}
            borderColor="border-white dark:border-gray-800"
          />
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className={`
            -ml-2
            ${sizeClasses[size]}
            rounded-full
            bg-gray-200 dark:bg-gray-700
            border-2 border-white dark:border-gray-800
            flex items-center justify-center
            text-gray-600 dark:text-gray-300
            font-semibold
          `}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
});

AvatarGroup.displayName = 'AvatarGroup';

/**
 * Avatar avec badge de statut
 */
interface AvatarWithStatusProps extends OptimizedAvatarProps {
  status?: 'online' | 'offline' | 'away' | 'busy';
  showStatus?: boolean;
}

export const AvatarWithStatus = memo(({
  status = 'offline',
  showStatus = true,
  ...avatarProps
}: AvatarWithStatusProps) => {
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4',
    '3xl': 'w-5 h-5',
  };

  return (
    <div className="relative inline-block">
      <OptimizedAvatar {...avatarProps} />
      
      {showStatus && (
        <span
          className={`
            absolute bottom-0 right-0
            ${statusSizes[avatarProps.size || 'md']}
            ${statusColors[status]}
            rounded-full
            border-2 border-white dark:border-gray-800
          `}
          title={status}
        />
      )}
    </div>
  );
});

AvatarWithStatus.displayName = 'AvatarWithStatus';

/**
 * Hook pour générer un avatar à partir d'initiales
 */
export function useInitialsAvatar(name: string): string {
  // Générer une couleur basée sur le nom
  const colors = [
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-yellow-400 to-yellow-600',
    'from-red-400 to-red-600',
    'from-indigo-400 to-indigo-600',
    'from-teal-400 to-teal-600',
  ];
  
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  
  return colors[colorIndex];
}

/**
 * Avatar avec initiales
 */
interface InitialsAvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  onClick?: () => void;
}

export const InitialsAvatar = memo(({
  name,
  size = 'md',
  className = '',
  onClick
}: InitialsAvatarProps) => {
  const gradient = useInitialsAvatar(name);
  
  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        bg-gradient-to-br ${gradient}
        flex items-center justify-center
        text-white font-semibold
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${className}
      `}
      onClick={onClick}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
});

InitialsAvatar.displayName = 'InitialsAvatar';
