
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LikeButtonProps, ContentType } from '@/types/profile';
import { cn } from '@/lib/utils';

export function UniversalLikeButton({
  contentType,
  contentId,
  recipientId,
  initialLiked = false,
  initialCount = 0,
  size = 'md',
  variant = 'default',
  onLikeChange,
  showCount = true,
  disabled = false
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Sync with props
  useEffect(() => {
    if (!hasInteracted) {
      setLiked(initialLiked);
      setCount(initialCount);
    }
  }, [initialLiked, initialCount, hasInteracted]);

  const handleLike = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setHasInteracted(true);
    
    // Optimistic update
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : count - 1;
    setLiked(newLiked);
    setCount(Math.max(0, newCount));

    try {
      // FIXED: Use unified API endpoint for all content types
      const endpoint = `/api/unified-likes/${contentType}/${contentId}`
      const requestBody = {
        action: newLiked ? 'like' : 'unlike',
        reaction: 'like',
        recipientId,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'universal_like_button'
        }
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // FIXED: Handle unified API response format
      const serverLiked = data.isLiked || false
      const serverCount = data.totalLikes || 0
      
      // Update with server response
      setLiked(serverLiked)
      setCount(serverCount)
      
      // Notify parent
      onLikeChange?.(serverLiked, serverCount);

      // Show toast for like (not unlike)
      if (serverLiked && variant !== 'minimal') {
        toast.success('👍 Liked!', {
          duration: 1500,
        });
      }

    } catch (error) {
      // Revert optimistic update
      setLiked(liked);
      setCount(count);
      
      console.error('Like error:', error);
      
      // Show specific error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to update like';
      toast.error(`❌ ${errorMessage}`);
      
      // If it's an authentication error, suggest login
      if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
        toast.error('Please sign in to like content', {
          action: {
            label: 'Sign In',
            onClick: () => window.location.href = '/login'
          }
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'h-8 px-2 text-xs',
      icon: 'h-3 w-3',
      gap: 'gap-1'
    },
    md: {
      button: 'h-9 px-3 text-sm',
      icon: 'h-4 w-4',
      gap: 'gap-2'
    },
    lg: {
      button: 'h-10 px-4 text-base',
      icon: 'h-5 w-5',
      gap: 'gap-2'
    }
  };

  const config = sizeConfig[size];

  // Variant configurations
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleLike}
        disabled={disabled || isLoading}
        className={cn(
          "flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors",
          liked && "text-red-500",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <Loader2 className={cn(config.icon, "animate-spin")} />
          ) : (
            <motion.div
              key={liked ? 'liked' : 'unliked'}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Heart 
                className={cn(
                  config.icon,
                  liked ? "fill-red-500 text-red-500" : "text-gray-500"
                )} 
              />
            </motion.div>
          )}
        </AnimatePresence>
        {showCount && count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-xs font-medium"
          >
            {formatCount(count)}
          </motion.span>
        )}
      </button>
    );
  }

  if (variant === 'floating') {
    return (
      <motion.button
        onClick={handleLike}
        disabled={disabled || isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "fixed bottom-4 right-4 z-50 rounded-full shadow-lg",
          "flex items-center justify-center",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "text-gray-700 dark:text-gray-300",
          liked ? "bg-red-50 border-red-200 text-red-600" : "",
          disabled && "opacity-50 cursor-not-allowed",
          config.button
        )}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <Loader2 className={cn(config.icon, "animate-spin")} />
          ) : (
            <motion.div
              key={liked ? 'liked' : 'unliked'}
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8, rotate: 10 }}
              transition={{ duration: 0.2 }}
            >
              <Heart 
                className={cn(
                  config.icon,
                  liked ? "fill-red-500 text-red-500" : ""
                )} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // Default variant  // Map size to button size (Button doesn't accept 'md', so map to 'default')
  const buttonSize = size === 'md' ? 'default' : size

  return (
    <Button
      onClick={handleLike}
      disabled={disabled || isLoading}
      variant={liked ? "default" : "outline"}
      size={buttonSize}
      className={cn(
        "transition-all duration-200",
        config.button,
        config.gap,
        liked && "bg-red-500 hover:bg-red-600 text-white border-red-500",
        !liked && "hover:bg-red-50 hover:text-red-600 hover:border-red-200"
      )}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <Loader2 className={cn(config.icon, "animate-spin")} />
        ) : (
          <motion.div
            key={liked ? 'liked' : 'unliked'}
            initial={{ scale: 0.8, y: -2 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 2 }}
            transition={{ 
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
          >
            <Heart 
              className={cn(
                config.icon,
                liked ? "fill-current" : ""
              )} 
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {showCount && (
        <motion.span
          key={count}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-medium"
        >
          {liked ? 'Liked' : 'Like'}
          {showCount && count > 0 && ` (${formatCount(count)})`}
        </motion.span>
      )}
    </Button>
  );
}

// ==========================================
// LIKE COUNTER DISPLAY (Read-only)
// ==========================================

interface LikeCounterProps {
  count: number;
  contentType: ContentType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function LikeCounter({ 
  count, 
  contentType, 
  size = 'md',
  showIcon = true,
  className 
}: LikeCounterProps) {
  const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const sizeConfig = {
    sm: { icon: 'h-3 w-3', text: 'text-xs' },
    md: { icon: 'h-4 w-4', text: 'text-sm' },
    lg: { icon: 'h-5 w-5', text: 'text-base' }
  };

  const config = sizeConfig[size];

  if (count === 0) return null;

  return (
    <div className={cn("flex items-center gap-1 text-gray-500", className)}>
      {showIcon && (
        <Heart className={cn(config.icon, "fill-red-500 text-red-500")} />
      )}
      <span className={cn(config.text, "font-medium")}>
        {formatCount(count)} {count === 1 ? 'like' : 'likes'}
      </span>
    </div>
  );
}

export default UniversalLikeButton;
