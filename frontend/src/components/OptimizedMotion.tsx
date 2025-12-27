import React, { memo } from 'react';
import { motion, type MotionProps } from 'framer-motion';

/**
 * Composant Motion optimisé avec animations plus légères
 * Réduit la charge sur le GPU et améliore les performances
 */

// Animations prédéfinies optimisées
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } }
};

export const slideUpVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }
};

export const scaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } }
};

// Composant Motion.div optimisé
interface OptimizedMotionDivProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'fade' | 'slideUp' | 'scale' | 'none';
  delay?: number;
}

export const OptimizedMotionDiv = memo(({ 
  children, 
  className, 
  variant = 'fade',
  delay = 0,
  ...props 
}: OptimizedMotionDivProps) => {
  // Pas d'animation si l'utilisateur préfère reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return <div className={className}>{children}</div>;
  }

  const variants = variant === 'slideUp' ? slideUpVariants :
                   variant === 'scale' ? scaleVariants :
                   variant === 'fade' ? fadeInVariants :
                   undefined;

  return (
    <motion.div
      className={className}
      initial={variant !== 'none' ? 'hidden' : undefined}
      animate={variant !== 'none' ? 'visible' : undefined}
      variants={variants}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
});

OptimizedMotionDiv.displayName = 'OptimizedMotionDiv';

// Composant pour les listes avec stagger optimisé
interface OptimizedListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const OptimizedList = memo(({ 
  children, 
  className,
  staggerDelay = 0.05 
}: OptimizedListProps) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
});

OptimizedList.displayName = 'OptimizedList';

// Item de liste optimisé
export const OptimizedListItem = memo(({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
      }}
    >
      {children}
    </motion.div>
  );
});

OptimizedListItem.displayName = 'OptimizedListItem';

// Hook pour détecter si les animations doivent être désactivées
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// ============================================
// 1. LAZY LOADING D'IMAGES OPTIMISÉ
// ============================================

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number;
}

export const OptimizedImage = memo(({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E',
  onLoad,
  onError,
  threshold = 0.1,
  className,
  ...props
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = src;

            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
              onLoad?.();
            };

            img.onerror = () => {
              setHasError(true);
              onError?.();
            };

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, threshold, onLoad, onError]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className || ''} ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''}`}
      style={{
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoaded ? 1 : 0.6,
        ...props.style
      }}
      {...props}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// ============================================
// 2. INTERSECTION OBSERVER POUR ANIMATIONS
// ============================================

interface AnimateOnScrollProps {
  children: React.ReactNode;
  variant?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale';
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  className?: string;
}

export const AnimateOnScroll = memo(({
  children,
  variant = 'fade',
  threshold = 0.2,
  rootMargin = '0px',
  triggerOnce = true,
  className
}: AnimateOnScrollProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (triggerOnce && ref.current) {
              observer.unobserve(ref.current);
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  const variants = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 }
    },
    slideUp: {
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0 }
    },
    slideDown: {
      hidden: { opacity: 0, y: -30 },
      visible: { opacity: 1, y: 0 }
    },
    slideLeft: {
      hidden: { opacity: 0, x: 30 },
      visible: { opacity: 1, x: 0 }
    },
    slideRight: {
      hidden: { opacity: 0, x: -30 },
      visible: { opacity: 1, x: 0 }
    },
    scale: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 }
    }
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={variants[variant]}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
});

AnimateOnScroll.displayName = 'AnimateOnScroll';

// ============================================
// 3. SKELETON LOADERS OPTIMISÉS
// ============================================

interface OptimizedSkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'list' | 'image';
  count?: number;
  animate?: boolean;
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const OptimizedSkeleton = memo(({
  variant = 'text',
  count = 1,
  animate = true,
  className = '',
  width,
  height
}: OptimizedSkeletonProps) => {
  const baseClass = 'bg-gray-200 dark:bg-gray-700 rounded';
  const animateClass = animate ? 'animate-pulse' : '';

  const skeletonStyles: Record<string, React.CSSProperties> = {
    text: {
      width: width || '100%',
      height: height || '1rem',
      marginBottom: '0.5rem'
    },
    card: {
      width: width || '100%',
      height: height || '200px',
      marginBottom: '1rem'
    },
    avatar: {
      width: width || '3rem',
      height: height || '3rem',
      borderRadius: '50%'
    },
    list: {
      width: width || '100%',
      height: height || '3rem',
      marginBottom: '0.75rem'
    },
    image: {
      width: width || '100%',
      height: height || '300px'
    }
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClass} ${animateClass} ${className}`}
      style={skeletonStyles[variant]}
    />
  ));

  return <>{items}</>;
});

OptimizedSkeleton.displayName = 'OptimizedSkeleton';

// Skeleton spécifique pour les cartes
export const SkeletonCard = memo(() => (
  <div className="bg-card rounded-lg p-6 border border-border">
    <div className="flex items-center space-x-4 mb-4">
      <OptimizedSkeleton variant="avatar" width="3rem" height="3rem" />
      <div className="flex-1">
        <OptimizedSkeleton variant="text" width="60%" height="1rem" />
        <OptimizedSkeleton variant="text" width="40%" height="0.875rem" />
      </div>
    </div>
    <OptimizedSkeleton variant="text" count={3} />
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

// ============================================
// 4. HOOK useMediaQuery OPTIMISÉ
// ============================================

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Utiliser addEventListener pour la compatibilité
    mediaQuery.addEventListener('change', handleChange);

    // Vérifier immédiatement
    setMatches(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

// Hooks de media queries prédéfinis
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)');
}

export function useIsDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

// ============================================
// 5. VIRTUALISATION SIMPLE
// ============================================

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
  overscan?: number;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight = 600,
  overscan = 3,
  className = ''
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = React.useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Throttle du scroll pour les performances
  const throttledScroll = React.useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 16); // ~60fps
    };
  }, [handleScroll]);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = React.useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }));
  }, [items, startIndex, endIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={throttledScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HOOK useIntersectionObserver
// ============================================

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): {
  ref: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
  entry: IntersectionObserverEntry | null;
} {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false
  } = options;

  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const frozen = React.useRef(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || frozen.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        setIsVisible(entry.isIntersecting);

        if (entry.isIntersecting && freezeOnceVisible) {
          frozen.current = true;
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, freezeOnceVisible]);

  return { ref, isVisible, entry };
}
