import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  phone: string
  name: string | null
  ageVerified: boolean
  paymentActive: boolean
  activeTill: string | null
  trustScore: number
  latitude: number | null
  longitude: number | null
  locationText: string | null
  isAdmin: boolean
  isFrozen: boolean
  referralCode: string | null
  referredBy: string | null
  referralCount: number
  totalHelpsGiven: number
  totalHelpsTaken: number
  notifyNewRequests: boolean
  notifyPayments: boolean
  notifyReports: boolean
  createdAt: string
  lastActiveAt: string | null
}

interface AppState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  currentView: string
  
  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  updateUserLocation: (lat: number, lng: number, locationText?: string) => void
  setCurrentView: (view: string) => void
  updateUserStats: (stats: Partial<User>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      loading: true,
      currentView: 'home',
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        loading: false 
      }),
      
      setLoading: (loading) => set({ loading }),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false,
        loading: false,
        currentView: 'home'
      }),
      
      updateUserLocation: (lat, lng, locationText) => set((state) => ({
        user: state.user ? {
          ...state.user,
          latitude: lat,
          longitude: lng,
          locationText: locationText || state.user.locationText
        } : null
      })),

      setCurrentView: (view) => set({ currentView: view }),
      
      updateUserStats: (stats) => set((state) => ({
        user: state.user ? {
          ...state.user,
          ...stats
        } : null
      }))
    }),
    {
      name: 'help2earn-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Trust Score System
export const TrustScoreSystem = {
  // Score ranges
  TRUSTED_MIN: 70,
  NEUTRAL_MIN: 40,
  RESTRICTED_MAX: 39,
  
  // Point values
  POINTS: {
    SUCCESSFUL_HELP: 3,
    POSITIVE_RATING: 2,
    NEUTRAL_RATING: 0,
    NEGATIVE_RATING: -5,
    NO_SHOW: -10,
    VALID_REPORT: -15,
    WEEKLY_ACTIVE: 1,
    LOCATION_CONSISTENCY: 5,
    REFERRAL_BONUS: 3,
  },
  
  // Daily limits
  LIMITS: {
    MAX_POSTS_PER_DAY: 3,
    MAX_REPORTS_PER_DAY: 5,
    COOLDOWN_HOURS: 24,
  },
  
  // Hard caps
  MAX_SCORE: 100,
  MIN_SCORE: 0,
  DEFAULT_SCORE: 50,
  
  // Calculate new trust score
  calculateNewScore: (currentScore: number, change: number): number => {
    const newScore = currentScore + change
    return Math.max(TrustScoreSystem.MIN_SCORE, Math.min(TrustScoreSystem.MAX_SCORE, newScore))
  },
  
  // Get trust level
  getTrustLevel: (score: number): 'TRUSTED' | 'NEUTRAL' | 'RESTRICTED' => {
    if (score >= TrustScoreSystem.TRUSTED_MIN) return 'TRUSTED'
    if (score >= TrustScoreSystem.NEUTRAL_MIN) return 'NEUTRAL'
    return 'RESTRICTED'
  },
  
  // Check if user can access high-risk resources
  canAccessHighRisk: (score: number): boolean => {
    return score >= TrustScoreSystem.TRUSTED_MIN
  },
  
  // Check if user can access medium-risk resources
  canAccessMediumRisk: (score: number): boolean => {
    return score >= TrustScoreSystem.NEUTRAL_MIN
  }
}

// Trust Badge Helper
export const getTrustBadge = (score: number): { label: string; color: string; icon: string; description: string } => {
  const level = TrustScoreSystem.getTrustLevel(score)
  
  switch (level) {
    case 'TRUSTED':
      return { 
        label: 'Trusted', 
        color: 'bg-green-500', 
        icon: '🟢',
        description: 'Can access all help types including high-risk resources'
      }
    case 'NEUTRAL':
      return { 
        label: 'Neutral', 
        color: 'bg-yellow-500', 
        icon: '🟡',
        description: 'Can access low and medium-risk help requests'
      }
    case 'RESTRICTED':
      return { 
        label: 'Restricted', 
        color: 'bg-red-500', 
        icon: '🔴',
        description: 'Limited access. Improve trust score to unlock more features.'
      }
  }
}

// Distance calculation (Haversine formula)
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format date
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

// Format relative time
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hr ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(date)
}

// Format phone number
export const formatPhone = (phone: string): string => {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
}

// Generate referral code
export const generateReferralCode = (phone: string): string => {
  const hash = phone.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + parseInt(char)) | 0
  }, 0)
  return `H2E${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`
}

// Problem categories with examples for Gaon/City/Smart City
export const PROBLEM_CATEGORIES = {
  EMERGENCY: {
    label: 'Emergency Help',
    icon: '🚨',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    riskLevel: 'LOW',
    minTrust: 40,
    examples: {
      gaon: ['Puncture', 'Phone charging', 'Jump-start', 'Bulb change'],
      city: ['Puncture', 'Phone charging', 'Jump-start', 'Internet hotspot'],
      smartCity: ['EV charging', 'Phone charging', 'Jump-start', 'WiFi hotspot']
    }
  },
  TIME_ACCESS: {
    label: 'Time/Access Help',
    icon: '⏰',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    riskLevel: 'MEDIUM',
    minTrust: 50,
    examples: {
      gaon: ['Queue at mandi', 'Ration shop line', 'Form filling', 'Bank queue'],
      city: ['Queue standing', 'Errand running', 'Local guidance', 'Shop watch'],
      smartCity: ['Queue at tech park', 'Document pickup', 'Event help', 'Pet care']
    }
  },
  RESOURCE_RENT: {
    label: 'Resource Rent',
    icon: '📦',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    riskLevel: 'HIGH',
    minTrust: 70,
    examples: {
      gaon: ['Tractor', 'Tools', 'Cycle', 'Ladder', 'Tent'],
      city: ['Bike/Scooty', 'Tools', 'Ladder', 'Saree', 'Chair set'],
      smartCity: ['Scooty', 'Camera', 'Drone', 'Laptop', 'Projector']
    }
  }
}

// Subscription info
export const SUBSCRIPTION_INFO = {
  price: 49,
  currency: 'INR',
  duration: 30, // days
  features: [
    'Post unlimited help requests (max 3/day)',
    'View all nearby help requests',
    'Direct phone contact with helpers',
    'Trust score tracking',
    'Priority support'
  ]
}
