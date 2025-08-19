import { Variants, Transition } from 'framer-motion'

// Animation timing constants
export const ANIMATION_DURATIONS = {
  micro: 0.2,      // Button clicks, hover states
  short: 0.3,      // Small transitions
  medium: 0.5,     // Page transitions, modals
  long: 0.8,       // Complex animations
} as const

// Easing curves
export const ANIMATION_EASINGS = {
  smooth: [0.25, 0.1, 0.25, 1],
  spring: [0.175, 0.885, 0.32, 1.275],
  entrance: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
} as const

// Stagger timing
export const STAGGER = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
} as const

// Common animation variants
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.short,
      ease: ANIMATION_EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: ANIMATION_DURATIONS.micro,
      ease: ANIMATION_EASINGS.exit,
    },
  },
}

export const fadeInDown: Variants = {
  initial: {
    opacity: 0,
    y: -20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.short,
      ease: ANIMATION_EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: {
      duration: ANIMATION_DURATIONS.micro,
      ease: ANIMATION_EASINGS.exit,
    },
  },
}

export const fadeIn: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATIONS.short,
      ease: ANIMATION_EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATIONS.micro,
      ease: ANIMATION_EASINGS.exit,
    },
  },
}

export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: ANIMATION_DURATIONS.short,
      ease: ANIMATION_EASINGS.spring,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: ANIMATION_DURATIONS.micro,
      ease: ANIMATION_EASINGS.exit,
    },
  },
}

export const slideInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATIONS.short,
      ease: ANIMATION_EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: ANIMATION_DURATIONS.micro,
      ease: ANIMATION_EASINGS.exit,
    },
  },
}

export const slideInRight: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATIONS.short,
      ease: ANIMATION_EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: ANIMATION_DURATIONS.micro,
      ease: ANIMATION_EASINGS.exit,
    },
  },
}

// Container variants for stagger animations
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: STAGGER.normal,
    },
  },
  exit: {
    transition: {
      staggerChildren: STAGGER.fast,
      staggerDirection: -1,
    },
  },
}

export const fastStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: STAGGER.fast,
    },
  },
  exit: {
    transition: {
      staggerChildren: STAGGER.fast,
      staggerDirection: -1,
    },
  },
}

// Button interaction variants
export const buttonPress: Variants = {
  initial: {
    scale: 1,
  },
  whileTap: {
    scale: 0.95,
    transition: {
      duration: ANIMATION_DURATIONS.micro,
      ease: ANIMATION_EASINGS.smooth,
    },
  },
  whileHover: {
    scale: 1.02,
    transition: {
      duration: ANIMATION_DURATIONS.micro,
      ease: ANIMATION_EASINGS.smooth,
    },
  },
}

// Card hover effect
export const cardHover: Variants = {
  initial: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },
  whileHover: {
    y: -2,
    boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)',
    transition: {
      duration: ANIMATION_DURATIONS.short,
      ease: ANIMATION_EASINGS.smooth,
    },
  },
}

// Page transition variants
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.medium,
      ease: ANIMATION_EASINGS.entrance,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: ANIMATION_DURATIONS.short,
      ease: ANIMATION_EASINGS.exit,
    },
  },
}

// Loading skeleton shimmer effect
export const shimmer: Variants = {
  initial: {
    backgroundPosition: '-200px 0',
  },
  animate: {
    backgroundPosition: 'calc(200px + 100%) 0',
    transition: {
      duration: 2,
      ease: 'linear',
      repeat: Infinity,
    },
  },
}

// Number count animation
export const numberCountUp = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: ANIMATION_DURATIONS.short,
      ease: ANIMATION_EASINGS.spring,
    },
  },
}

// Utility function to check if user prefers reduced motion
export const respectsReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Utility function to get animation duration based on user preference
export const getAnimationDuration = (duration: number): number => {
  return respectsReducedMotion() ? 0 : duration
}

// Utility function to create responsive stagger timing
export const createStaggerChildren = (
  stagger: number = STAGGER.normal,
  delayChildren?: number
): Transition => ({
  staggerChildren: respectsReducedMotion() ? 0 : stagger,
  delayChildren: respectsReducedMotion() ? 0 : delayChildren,
})

// Utility function to create spring transition
export const createSpringTransition = (
  stiffness: number = 300,
  damping: number = 30
): Transition => ({
  type: 'spring',
  stiffness: respectsReducedMotion() ? 1000 : stiffness,
  damping: respectsReducedMotion() ? 50 : damping,
})