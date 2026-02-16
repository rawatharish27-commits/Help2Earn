'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Phone, MapPin, Clock, AlertTriangle, CheckCircle, XCircle, 
  Star, Shield, Zap, Users, IndianRupee, Bell, Settings,
  LogOut, Plus, Search, PhoneCall,
  HandHelping, Package, Timer,
  AlertCircle, CheckCircle2, Menu, Home, FileText,
  MessageSquare, UserCheck, DollarSign, Flag,
  Eye, Sparkles, Award, Heart, Gift, Target,
  Copy, Share2, TrendingUp, Wallet, Coins, Rocket
} from 'lucide-react'
import { 
  useAppStore, 
  getTrustBadge, 
  formatCurrency, 
  formatRelativeTime, 
  formatPhone,
  PROBLEM_CATEGORIES,
  SUBSCRIPTION_INFO,
  type User as UserType
} from '@/lib/store'
import { toast } from 'sonner'

// Types
interface Problem {
  id: string
  userId: string
  type: 'EMERGENCY' | 'TIME_ACCESS' | 'RESOURCE_RENT'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  category?: string
  title: string
  description: string
  offerPrice: number | null
  latitude: number | null
  longitude: number | null
  locationText: string | null
  minTrustRequired: number
  status: string
  viewCount: number
  callCount: number
  createdAt: string
  expiresAt: string | null
  distance?: number
  user: {
    id: string
    phone: string
    name: string | null
    trustScore: number
  }
}

interface Payment {
  id: string
  userId: string
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  month: number
  year: number
  createdAt: string
  user?: {
    id: string
    phone: string
    name: string | null
    trustScore: number
    paymentActive: boolean
  }
}

// Attractive Hinglish quotes for the app
const ATTRACT_QUOTES = [
  "💰 Madad karke roz ₹1,000 – ₹2,000 tak kamaane ka mauka!",
  "⏰ Kya aapke paas thoda time hai? Nearby logon ki madad karo aur kamaao!",
  "🏠 Ghar par bekaar pada samaan se lekar free time dene tak — sab kaam aa sakta hai!",
  "💍 Shaadi ho, emergency ho ya daily ka kaam — log madad dhundhte hain!",
  "📍 Apne 20 KM area me customer khud aapse phone pe baat karega!",
  "✨ Madad bhi, imaandaari se kamaai bhi — sirf ₹49/mahina!",
  "🚀 Aaj hi join karo aur apni community me help karke earn karo!"
]

const HERO_TEXT = {
  main: "Madad karo, Kamaao! 💵",
  sub: "Jab logon ko zarurat hoti hai, nearby madad milti hai.",
  highlight: "Help2Earn pe customer khud aapse phone pe baat karega — seedha contact!",
  pricing: "Aap apni madad ka daam khud tay karte ho 💪",
  tagline: "Madad bhi, roz ki kamaai bhi! 🎯"
}

const FEATURES = [
  {
    icon: "🚨",
    title: "Emergency Help",
    titleHi: "Emergency Madad",
    desc: "Puncture, Battery Dead, Phone Charging — Quick help jab sabse zyada zaroori ho!"
  },
  {
    icon: "⏰",
    title: "Time & Access",
    titleHi: "Time Do, Kamaao",
    desc: "Queue me lagna, errands, local guidance — Apna time dho, paisa kamao!"
  },
  {
    icon: "📦",
    title: "Resource Rent",
    titleHi: "Samaan Rent Karo",
    desc: "Bike, Tools, Electronics — Ghar pada samaan se income banao!"
  }
]

export default function Help2EarnApp() {
  // Global State
  const { user, isAuthenticated, setUser, logout, updateUserLocation } = useAppStore()
  
  // Local State
  const [loading, setLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState('home')
  
  // Login State
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [receivedOtp, setReceivedOtp] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  
  // Problems State
  const [problems, setProblems] = useState<Problem[]>([])
  const [myProblems, setMyProblems] = useState<Problem[]>([])
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedRisk, setSelectedRisk] = useState<string>('all')
  
  // Post Problem State
  const [newProblem, setNewProblem] = useState({
    type: 'EMERGENCY' as 'EMERGENCY' | 'TIME_ACCESS' | 'RESOURCE_RENT',
    title: '',
    description: '',
    offerPrice: '',
    locationText: ''
  })
  
  // Payment State
  const [payments, setPayments] = useState<Payment[]>([])
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([])
  
  // Admin State
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0, activePaidUsers: 0, todayProblems: 0, pendingPayments: 0,
    flaggedUsers: 0, openProblems: 0, totalPayments: 0, totalRevenue: 0, pendingReports: 0
  })
  const [adminUsers, setAdminUsers] = useState<UserType[]>([])
  
  // Location State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  
  // Dialog State
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [showSOSDialog, setShowSOSDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportCategory, setReportCategory] = useState('OTHER')
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [helperReached, setHelperReached] = useState<boolean | null>(null)
  
  // Quote rotation
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)

  // Computed Values
  const isUserActive = useMemo(() => 
    user?.paymentActive && user?.activeTill && new Date(user.activeTill) > new Date(),
    [user?.paymentActive, user?.activeTill]
  )

  // Filtered Problems
  const filteredProblems = useMemo(() => {
    return problems.filter(p => {
      const matchesSearch = !searchQuery || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = selectedType === 'all' || p.type === selectedType
      const matchesRisk = selectedRisk === 'all' || p.riskLevel === selectedRisk
      return matchesSearch && matchesType && matchesRisk
    })
  }, [problems, searchQuery, selectedType, selectedRisk])

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % ATTRACT_QUOTES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Get User Location
  useEffect(() => {
    if (isAuthenticated && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          updateUserLocation(latitude, longitude)
          if (user) {
            try {
              await fetch('/api/users/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, latitude, longitude })
              })
            } catch (e) { console.error('Location error:', e) }
          }
        },
        () => toast.error('GPS enable karein better results ke liye!'),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [isAuthenticated])

  // API Functions
  const sendOtp = async () => {
    if (!phone || phone.length !== 10) {
      toast.error('Sahi 10-digit mobile number daalen!')
      return
    }
    if (!termsAccepted) {
      toast.error('Terms & Conditions accept karein')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      const data = await res.json()
      if (data.success) {
        setOtpSent(true)
        setReceivedOtp(data.otp)
        toast.success('OTP bhej diya gaya! 📱')
      } else {
        toast.error(data.error || 'OTP bhejne me problem!')
      }
    } catch {
      toast.error('Connection error. Try again!')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('6-digit OTP daalen')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp, name })
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
        toast.success('🎉 Welcome to Help2Earn!')
        if (data.user.isAdmin) toast.info('Admin Access Active!')
      } else {
        toast.error(data.error || 'Galat OTP!')
      }
    } catch {
      toast.error('Verification failed!')
    } finally {
      setLoading(false)
    }
  }

  const fetchNearbyProblems = useCallback(async () => {
    if (!user || !userLocation) return
    try {
      const res = await fetch(`/api/problems/nearby?userId=${user.id}&lat=${userLocation.lat}&lng=${userLocation.lng}`)
      const data = await res.json()
      if (data.problems) setProblems(data.problems)
    } catch {
      toast.error('Problems load nahi ho paaye')
    }
  }, [user, userLocation])

  const fetchMyProblems = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/problems?userId=${user.id}`)
      const data = await res.json()
      if (data.problems) setMyProblems(data.problems)
    } catch {
      toast.error('Posts load nahi ho paaye')
    }
  }, [user])

  const postProblem = async () => {
    if (!user || !newProblem.title || !newProblem.description) {
      toast.error('Sab fields bharen!')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, ...newProblem,
          offerPrice: newProblem.offerPrice ? parseFloat(newProblem.offerPrice) : null,
          latitude: userLocation?.lat, longitude: userLocation?.lng
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('✅ Request post ho gaya!')
        setNewProblem({ type: 'EMERGENCY', title: '', description: '', offerPrice: '', locationText: '' })
        setCurrentTab('problems')
        fetchMyProblems()
      } else {
        toast.error(data.error || 'Post nahi ho paaya')
      }
    } catch {
      toast.error('Error! Try again.')
    } finally {
      setLoading(false)
    }
  }

  const createPaymentRequest = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: SUBSCRIPTION_INFO.price })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Payment request submit ho gaya! 💳')
        fetchPayments()
      } else {
        toast.error(data.error || 'Request fail!')
      }
    } catch {
      toast.error('Payment error!')
    } finally {
      setLoading(false)
    }
  }

  const fetchPayments = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/payments?userId=${user.id}`)
      const data = await res.json()
      if (data.payments) setPayments(data.payments)
    } catch {
      toast.error('Payments load nahi ho paaye')
    }
  }, [user])

  const fetchAdminData = useCallback(async () => {
    if (!user?.isAdmin) return
    try {
      const [statsRes, paymentsRes, usersRes] = await Promise.all([
        fetch(`/api/admin/stats?adminId=${user.id}`),
        fetch(`/api/admin/payments?adminId=${user.id}&status=PENDING`),
        fetch(`/api/admin/users?adminId=${user.id}`)
      ])
      const [statsData, paymentsData, usersData] = await Promise.all([statsRes.json(), paymentsRes.json(), usersRes.json()])
      if (statsData.stats) setAdminStats(statsData.stats)
      if (paymentsData.payments) setPendingPayments(paymentsData.payments)
      if (usersData.users) setAdminUsers(usersData.users)
    } catch {
      toast.error('Admin data load error')
    }
  }, [user])

  const approvePayment = async (paymentId: string, action: 'approve' | 'reject') => {
    if (!user?.isAdmin) return
    setLoading(true)
    try {
      const res = await fetch('/api/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, paymentId, action })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Payment ${action} ho gaya!`)
        fetchAdminData()
      } else {
        toast.error(data.error || 'Process fail!')
      }
    } catch {
      toast.error('Error!')
    } finally {
      setLoading(false)
    }
  }

  const submitReport = async (reportedId: string) => {
    if (!user || !reportReason) { toast.error('Reason daalen!'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporterId: user.id, reportedId, reason: reportReason, category: reportCategory })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Report submit ho gaya!')
        setShowReportDialog(false)
        setReportReason('')
        setReportCategory('OTHER')
      } else {
        toast.error(data.error || 'Report fail!')
      }
    } catch {
      toast.error('Error!')
    } finally {
      setLoading(false)
    }
  }

  const submitFeedback = async (problemId: string, helperId: string) => {
    if (!user || helperReached === null) { toast.error('Confirm karein!'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, helperId, clientId: user.id, rating: feedbackRating, comment: feedbackComment, helperReached })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Feedback diya! 🌟')
        setShowFeedbackDialog(false)
        setFeedbackRating(5)
        setFeedbackComment('')
        setHelperReached(null)
        fetchMyProblems()
      } else {
        toast.error(data.error || 'Feedback fail!')
      }
    } catch {
      toast.error('Error!')
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on tab change
  useEffect(() => {
    if (isAuthenticated && user) {
      if (currentTab === 'problems') { fetchNearbyProblems(); fetchMyProblems() }
      else if (currentTab === 'payment') fetchPayments()
      else if (currentTab === 'admin' && user.isAdmin) fetchAdminData()
    }
  }, [currentTab, isAuthenticated, user, fetchNearbyProblems, fetchMyProblems, fetchPayments, fetchAdminData])

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode)
      toast.success('Referral code copy ho gaya! 📋')
    }
  }

  // ========== RENDER ==========

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200/30 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-40 right-10 w-40 h-40 bg-teal-200/30 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-cyan-200/30 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '2s' }} />
        </div>

        {/* Header */}
        <header className="p-4 border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg animate-float">
                <Image src="/logo.svg" alt="Help2Earn" width={48} height={48} />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Help2Earn</h1>
                <p className="text-xs text-gray-500">Madad karo, Kamaao! 💵</p>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
          {!otpSent ? (
            <div className="w-full max-w-md space-y-5">
              {/* Hero Card */}
              <Card className="border-emerald-200 bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
                <CardHeader className="text-center pb-2 pt-6">
                  <div className="w-24 h-24 mx-auto mb-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl rotate-6 opacity-20" />
                    <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl">
                      <Wallet className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-bold gradient-text">
                    {HERO_TEXT.main}
                  </CardTitle>
                  <CardDescription className="text-base font-medium text-gray-600 mt-2">
                    {HERO_TEXT.sub}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rotating Quote */}
                  <div className="p-4 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 rounded-xl border border-amber-100 min-h-[70px] flex items-center justify-center shadow-inner">
                    <p className="text-sm text-amber-700 text-center font-medium transition-opacity duration-500">
                      {ATTRACT_QUOTES[currentQuoteIndex]}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 text-center">
                      <p className="text-lg font-bold text-emerald-600">₹1K+</p>
                      <p className="text-xs text-gray-500">Daily Earn</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 text-center">
                      <p className="text-lg font-bold text-teal-600">20 KM</p>
                      <p className="text-xs text-gray-500">Area</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 text-center">
                      <p className="text-lg font-bold text-cyan-600">₹49</p>
                      <p className="text-xs text-gray-500">/Month</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Login Form */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">📱 Mobile Number</Label>
                      <div className="flex">
                        <span className="flex items-center px-4 border border-r-0 rounded-l-xl bg-gradient-to-b from-gray-50 to-gray-100 text-gray-600 text-sm font-medium">
                          +91
                        </span>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="10-digit number daalen"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="rounded-l-none h-12 text-lg"
                          maxLength={10}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">👤 Name (Optional)</Label>
                      <Input
                        id="name"
                        placeholder="Apna naam"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12"
                      />
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                      <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} />
                      <label htmlFor="terms" className="text-sm cursor-pointer text-gray-600 leading-tight">
                        Main <span className="font-medium">Terms &amp; Privacy Policy</span> accept karta/karti hoon
                      </label>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pb-6">
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-lg text-lg font-semibold btn-glow"
                    onClick={sendOtp}
                    disabled={loading || phone.length !== 10 || !termsAccepted}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">⏳ Bhej rahe hain...</span>
                    ) : (
                      <span className="flex items-center gap-2">🚀 Get Started - OTP Bhejo</span>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Feature Cards */}
              <div className="space-y-3">
                {FEATURES.map((feature, i) => (
                  <Card key={i} className="p-4 bg-white/80 backdrop-blur shadow-lg border-0 card-hover">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{feature.icon}</div>
                      <div>
                        <p className="font-semibold text-gray-800">{feature.titleHi}</p>
                        <p className="text-sm text-gray-500">{feature.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* OTP Verification */
            <Card className="w-full max-w-md shadow-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
              <CardHeader className="text-center pt-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <Phone className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl">OTP Verify Karo 📱</CardTitle>
                <CardDescription className="text-base">
                  +91 {phone} pe bheja gaya code daalen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <Input
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-3xl tracking-widest h-16 font-bold"
                  maxLength={6}
                />

                {receivedOtp && (
                  <Alert className="bg-emerald-50 border-emerald-200 shadow-inner">
                    <AlertCircle className="w-5 h-5 text-emerald-500" />
                    <AlertTitle className="font-medium">Demo Mode 🎮</AlertTitle>
                    <AlertDescription className="text-lg font-bold text-emerald-600">
                      Your OTP: {receivedOtp}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => { setOtpSent(false); setOtp(''); setReceivedOtp('') }}>
                    ← Back
                  </Button>
                  <Button 
                    className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold"
                    onClick={verifyOtp}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? '⏳ Verify...' : '✅ Verify & Login'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 text-center border-t bg-white/80 backdrop-blur">
          <p className="font-semibold gradient-text">{HERO_TEXT.tagline}</p>
          <p className="text-xs text-gray-400 mt-1">© 2024 Help2Earn | Made with ❤️ in India</p>
        </footer>
      </div>
    )
  }

  // Main App
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold gradient-text">Help2Earn</h1>
              <p className="text-xs text-gray-400">Madad karo, Kamaao!</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`${getTrustBadge(user?.trustScore || 50).color} text-white shadow-sm`}>
              {getTrustBadge(user?.trustScore || 50).icon} {user?.trustScore}
            </Badge>
            {isUserActive ? (
              <Badge className="bg-emerald-500 text-white text-xs shadow-sm">
                <CheckCircle className="w-3 h-3 mr-1" /> Active
              </Badge>
            ) : (
              <Badge className="bg-red-500 text-white text-xs shadow-sm">
                <XCircle className="w-3 h-3 mr-1" /> Inactive
              </Badge>
            )}
            {user?.isAdmin && (
              <Badge className="bg-purple-500 text-white text-xs shadow-sm">
                <Shield className="w-3 h-3 mr-1" /> Admin
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-3">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-6 mb-4 bg-white/80 backdrop-blur shadow-sm">
            <TabsTrigger value="home" className="text-xs md:text-sm font-medium">
              <Home className="w-4 h-4 mr-1" /> Home
            </TabsTrigger>
            <TabsTrigger value="problems" className="text-xs md:text-sm font-medium" disabled={!isUserActive}>
              <Search className="w-4 h-4 mr-1" /> Nearby
            </TabsTrigger>
            <TabsTrigger value="post" className="text-xs md:text-sm font-medium" disabled={!isUserActive}>
              <Plus className="w-4 h-4 mr-1" /> Post
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-xs md:text-sm font-medium">
              <IndianRupee className="w-4 h-4 mr-1" /> Payment
            </TabsTrigger>
            {user?.isAdmin && (
              <TabsTrigger value="admin" className="text-xs md:text-sm font-medium">
                <Settings className="w-4 h-4 mr-1" /> Admin
              </TabsTrigger>
            )}
            <TabsTrigger value="logout" className="text-xs md:text-sm font-medium text-red-500" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" /> Exit
            </TabsTrigger>
          </TabsList>

          {/* HOME TAB */}
          <TabsContent value="home" className="space-y-4 animate-fade-in">
            {/* Hero Section */}
            <Card className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white border-0 shadow-xl overflow-hidden">
              <CardContent className="pt-6 pb-6 relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative text-center mb-4">
                  <h2 className="text-2xl font-bold mb-1">
                    {user?.name ? `Namaste, ${user.name}! 🙏` : 'Welcome to Help2Earn! 🎉'}
                  </h2>
                  <p className="text-white/90 text-sm">
                    {HERO_TEXT.highlight}
                  </p>
                </div>
                
                {/* Rotating Quote */}
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur mb-4">
                  <p className="text-sm text-center font-medium transition-opacity duration-500">
                    {ATTRACT_QUOTES[currentQuoteIndex]}
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  {!isUserActive ? (
                    <Button 
                      className="bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg font-semibold btn-glow"
                      onClick={() => setCurrentTab('payment')}
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Start Earning - ₹49/month
                    </Button>
                  ) : (
                    <>
                      <Button 
                        className="bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg font-semibold"
                        onClick={() => setCurrentTab('post')}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Request Post Karo
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-white text-white hover:bg-white/20 font-semibold"
                        onClick={() => setCurrentTab('problems')}
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Help Dhundho
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="shadow-lg card-hover bg-gradient-to-br from-white to-emerald-50">
                <CardContent className="pt-4 pb-3 text-center">
                  <Award className="w-7 h-7 mx-auto text-emerald-500" />
                  <p className="text-2xl font-bold mt-1 gradient-text">{user?.trustScore || 50}</p>
                  <p className="text-xs text-gray-500 font-medium">Trust Score</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg card-hover bg-gradient-to-br from-white to-pink-50">
                <CardContent className="pt-4 pb-3 text-center">
                  <Heart className="w-7 h-7 mx-auto text-pink-500" />
                  <p className="text-2xl font-bold mt-1 text-pink-600">{user?.totalHelpsGiven || 0}</p>
                  <p className="text-xs text-gray-500 font-medium">Madad Ki 👍</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg card-hover bg-gradient-to-br from-white to-blue-50">
                <CardContent className="pt-4 pb-3 text-center">
                  <HandHelping className="w-7 h-7 mx-auto text-blue-500" />
                  <p className="text-2xl font-bold mt-1 text-blue-600">{user?.totalHelpsTaken || 0}</p>
                  <p className="text-xs text-gray-500 font-medium">Madad Li 🙏</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg card-hover bg-gradient-to-br from-white to-amber-50">
                <CardContent className="pt-4 pb-3 text-center">
                  <Gift className="w-7 h-7 mx-auto text-amber-500" />
                  <p className="text-2xl font-bold mt-1 text-amber-600">{user?.referralCount || 0}</p>
                  <p className="text-xs text-gray-500 font-medium">Referrals 🎁</p>
                </CardContent>
              </Card>
            </div>

            {/* Help Types */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Madad ke Types
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(PROBLEM_CATEGORIES).map(([key, config]) => (
                  <Card key={key} className={`${config.bgColor} ${config.borderColor} border-2 shadow-lg card-hover overflow-hidden`}>
                    <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-2xl">{config.icon}</span>
                        <span className={config.color}>{config.label}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-medium">{config.riskLevel} Risk</Badge>
                        <Badge variant="outline" className="text-xs font-medium">Trust: {config.minTrust}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">
                        {config.examples.city.slice(0, 4).join(', ')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Earning Info */}
            <Card className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-200 shadow-lg">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Coins className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">💰 Roz ₹1,000–₹2,000 tak kamaao!</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Ghar par bekaar pade samaan se lekar apna free time dene tak — sab kuch kaam aa sakta hai.
                      Shaadi ho, emergency ho ya daily ka zaroori kaam — log madad dhundhte hain!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referral Section */}
            {user?.referralCode && (
              <Card className="shadow-lg overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-orange-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    🎁 Refer &amp; Earn
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600 mb-3">Apna referral code share karo, dono ko +3 trust score milega!</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-gray-100 rounded-xl font-mono text-center text-lg font-bold">
                      {user.referralCode}
                    </div>
                    <Button variant="outline" size="icon" className="h-12 w-12" onClick={copyReferralCode}>
                      <Copy className="w-5 h-5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-12 w-12">
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trust Score Info */}
            <Card className="shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Trust Score System 🛡️
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-green-50 border-2 border-green-200 text-center">
                    <div className="text-2xl">🟢</div>
                    <p className="font-bold text-sm text-green-700">Trusted</p>
                    <p className="text-xs text-gray-500">70-100</p>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-50 border-2 border-yellow-200 text-center">
                    <div className="text-2xl">🟡</div>
                    <p className="font-bold text-sm text-yellow-700">Neutral</p>
                    <p className="text-xs text-gray-500">40-69</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200 text-center">
                    <div className="text-2xl">🔴</div>
                    <p className="font-bold text-sm text-red-700">Restricted</p>
                    <p className="text-xs text-gray-500">0-39</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-xl">
                  <p>✅ Successful help: <span className="font-bold text-green-600">+3</span></p>
                  <p>⭐ Positive rating (4-5): <span className="font-bold text-green-600">+2</span></p>
                  <p>❌ No-show: <span className="font-bold text-red-600">-10</span></p>
                  <p>🚨 Valid report: <span className="font-bold text-red-600">-15</span></p>
                </div>
              </CardContent>
            </Card>

            {/* Rules */}
            <Card className="shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  📋 Important Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Subscription: <strong>₹49/month</strong> mandatory</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Visibility: <strong>20 KM radius</strong> for paid users</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Payments: Direct between users (outside app)</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Max <strong>3 posts/day</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>No illegal items or activities ❌</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROBLEMS TAB */}
          <TabsContent value="problems" className="space-y-4 animate-fade-in">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="🔍 Madad dhundho..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="EMERGENCY">🚨 Emergency</SelectItem>
                    <SelectItem value="TIME_ACCESS">⏰ Time</SelectItem>
                    <SelectItem value="RESOURCE_RENT">📦 Resource</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedRisk} onValueChange={setSelectedRisk}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk</SelectItem>
                    <SelectItem value="LOW">🟢 Low</SelectItem>
                    <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                    <SelectItem value="HIGH">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto bg-white px-3 py-1.5 rounded-lg shadow-sm">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  {userLocation ? `${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}` : 'No GPS'}
                </div>
              </div>
            </div>

            <Tabs defaultValue="nearby">
              <TabsList className="bg-white/80 shadow-sm">
                <TabsTrigger value="nearby">Nearby ({filteredProblems.length})</TabsTrigger>
                <TabsTrigger value="mine">My Posts ({myProblems.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="nearby">
                {filteredProblems.length === 0 ? (
                  <Card className="shadow-lg">
                    <CardContent className="py-16 text-center">
                      <Search className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                      <p className="font-semibold text-gray-600 text-lg">Koi help request nahi mili</p>
                      <p className="text-sm text-gray-400 mt-1">Filters change karo ya khud post karo!</p>
                      <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500" onClick={() => setCurrentTab('post')}>
                        <Plus className="w-4 h-4 mr-2" /> Post Request
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[55vh] scrollbar-thin">
                    <div className="space-y-3 pr-2">
                      {filteredProblems.map((problem) => {
                        const typeConfig = PROBLEM_CATEGORIES[problem.type]
                        return (
                          <Card key={problem.id} className="shadow-lg card-hover overflow-hidden">
                            <div className={`h-1 ${typeConfig.riskLevel === 'HIGH' ? 'bg-red-400' : typeConfig.riskLevel === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                            <CardContent className="pt-4 pb-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="space-y-1">
                                  <h3 className="font-bold text-gray-800">{problem.title}</h3>
                                  <div className="flex flex-wrap gap-1">
                                    <Badge className={`${typeConfig.bgColor} ${typeConfig.borderColor} ${typeConfig.color}`} variant="outline">
                                      {typeConfig.icon} {typeConfig.label}
                                    </Badge>
                                    <Badge variant="outline" className={
                                      problem.riskLevel === 'HIGH' ? 'text-red-500 border-red-300' :
                                      problem.riskLevel === 'MEDIUM' ? 'text-yellow-600 border-yellow-300' :
                                      'text-green-500 border-green-300'
                                    }>
                                      {problem.riskLevel}
                                    </Badge>
                                  </div>
                                </div>
                                {problem.offerPrice && (
                                  <Badge className="bg-green-500 text-white shadow-sm text-base px-3">
                                    {formatCurrency(problem.offerPrice)}
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-600 line-clamp-2 mt-2">{problem.description}</p>
                              
                              <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  {formatRelativeTime(problem.createdAt)}
                                </span>
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                                  <MapPin className="w-3 h-3" />
                                  {problem.distance?.toFixed(1)} km
                                </span>
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                                  <Eye className="w-3 h-3" />
                                  {problem.viewCount}
                                </span>
                              </div>

                              <Separator className="my-3" />

                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-medium">{formatPhone(problem.user.phone)}</span>
                                  <Badge variant="outline" className={
                                    problem.user.trustScore >= 70 ? 'text-green-500' :
                                    problem.user.trustScore >= 40 ? 'text-yellow-600' :
                                    'text-red-500'
                                  }>
                                    {problem.user.trustScore}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setSelectedProblem(problem)}>
                                    <Eye className="w-4 h-4 mr-1" /> Details
                                  </Button>
                                  <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500" onClick={() => window.open(`tel:+91${problem.user.phone}`)}>
                                    <PhoneCall className="w-4 h-4 mr-1" /> Call
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="mine">
                {myProblems.length === 0 ? (
                  <Card className="shadow-lg">
                    <CardContent className="py-16 text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                      <p className="font-semibold text-gray-600 text-lg">Koi post nahi hai</p>
                      <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500" onClick={() => setCurrentTab('post')}>
                        <Plus className="w-4 h-4 mr-2" /> First post karo
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[55vh] scrollbar-thin">
                    <div className="space-y-3 pr-2">
                      {myProblems.map((problem) => {
                        const typeConfig = PROBLEM_CATEGORIES[problem.type]
                        return (
                          <Card key={problem.id} className="shadow-lg">
                            <CardContent className="pt-4 pb-3">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold">{problem.title}</h3>
                                <Badge variant="outline">{problem.status}</Badge>
                              </div>
                              <Badge className={`${typeConfig.bgColor} ${typeConfig.borderColor}`}>
                                {typeConfig.icon} {typeConfig.label}
                              </Badge>
                              <p className="text-sm text-gray-600 mt-2">{problem.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatRelativeTime(problem.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {problem.viewCount} views
                                </span>
                              </div>
                              {problem.status === 'OPEN' && (
                                <Button 
                                  variant="outline" size="sm"
                                  className="mt-3 w-full"
                                  onClick={() => { setSelectedProblem(problem); setShowFeedbackDialog(true) }}
                                >
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Mark Resolved &amp; Feedback Do
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* POST TAB */}
          <TabsContent value="post" className="animate-fade-in">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Plus className="w-6 h-6 text-emerald-500" />
                  Help Request Post Karo
                </CardTitle>
                <CardDescription>
                  Kis tarah ki madad chahiye? Describe karo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-medium">Request Type *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(['EMERGENCY', 'TIME_ACCESS', 'RESOURCE_RENT'] as const).map((type) => {
                      const config = PROBLEM_CATEGORIES[type]
                      return (
                        <Card 
                          key={type}
                          className={`cursor-pointer transition-all card-hover ${newProblem.type === type ? 'ring-2 ring-emerald-500 border-emerald-300' : ''} ${config.bgColor} ${config.borderColor} border-2`}
                          onClick={() => setNewProblem({ ...newProblem, type })}
                        >
                          <CardContent className="pt-4 pb-3 text-center">
                            <span className="text-3xl">{config.icon}</span>
                            <p className={`font-semibold mt-2 ${config.color}`}>{config.label}</p>
                            <Badge variant="outline" className="text-xs mt-1">{config.riskLevel}</Badge>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="font-medium">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief title likho..."
                    value={newProblem.title}
                    onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="font-medium">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Kya madad chahiye? Details me likho..."
                    value={newProblem.description}
                    onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offerPrice" className="font-medium">Offer Price (₹)</Label>
                    <Input
                      id="offerPrice"
                      type="number"
                      placeholder="Optional"
                      value={newProblem.offerPrice}
                      onChange={(e) => setNewProblem({ ...newProblem, offerPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationText" className="font-medium">Location</Label>
                    <Input
                      id="locationText"
                      placeholder="Landmark, area..."
                      value={newProblem.locationText}
                      onChange={(e) => setNewProblem({ ...newProblem, locationText: e.target.value })}
                    />
                  </div>
                </div>

                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <AlertTitle>Yaad rakho! 📝</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      <li>Max <strong>3 posts/day</strong></li>
                      <li>Posts <strong>24 hours</strong> me expire</li>
                      <li>Phone number helpers ko dikhegi</li>
                      <li>Payments <strong>outside app</strong></li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="pb-6">
                <Button 
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 font-semibold text-lg btn-glow"
                  onClick={postProblem}
                  disabled={loading || !newProblem.title || !newProblem.description}
                >
                  {loading ? '⏳ Posting...' : '🚀 Post Request'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* PAYMENT TAB */}
          <TabsContent value="payment" className="space-y-4 animate-fade-in">
            <Card className="shadow-xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-green-500" />
                  Subscription
                </CardTitle>
                <CardDescription>
                  {formatCurrency(SUBSCRIPTION_INFO.price)}/{SUBSCRIPTION_INFO.duration} days - Unlimited access!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isUserActive ? (
                  <Alert className="bg-green-50 border-green-200 shadow-inner">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <AlertTitle className="font-semibold">✅ Subscription Active!</AlertTitle>
                    <AlertDescription>
                      Valid till {user?.activeTill ? new Date(user.activeTill).toLocaleDateString('hi-IN') : 'N/A'}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="w-4 h-4 text-blue-500" />
                      <AlertTitle>Payment Process 💳</AlertTitle>
                      <AlertDescription>
                        <ol className="list-decimal list-inside mt-2 space-y-1 font-medium">
                          <li>UPI se ₹49 pay karo</li>
                          <li>&quot;I Have Paid&quot; click karo</li>
                          <li>Admin 2 hours me verify karega</li>
                        </ol>
                      </AlertDescription>
                    </Alert>

                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-inner">
                      <CardContent className="pt-5 pb-4">
                        <div className="text-center space-y-3">
                          <p className="text-sm text-gray-500 font-medium">Pay to UPI ID</p>
                          <p className="text-2xl font-bold text-emerald-600 font-mono">help2earn@upi</p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-3xl font-bold gradient-text">₹49</span>
                            <span className="text-gray-500">/month</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Button 
                      className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold text-lg btn-glow"
                      onClick={createPaymentRequest}
                      disabled={loading || payments.some(p => p.status === 'PENDING')}
                    >
                      {loading ? '⏳ Processing...' : '✅ I Have Paid ₹49'}
                    </Button>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold">Payment History</h3>
                  {payments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Koi payment nahi hai</p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm">
                          <div>
                            <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(payment.createdAt).toLocaleDateString('hi-IN')}
                            </p>
                          </div>
                          <Badge className={
                            payment.status === 'APPROVED' ? 'bg-green-500' :
                            payment.status === 'REJECTED' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }>
                            {payment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADMIN TAB */}
          {user?.isAdmin && (
            <TabsContent value="admin" className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="shadow-lg bg-gradient-to-br from-white to-blue-50">
                  <CardContent className="pt-4 pb-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <p className="text-2xl font-bold mt-1">{adminStats.totalUsers}</p>
                    <p className="text-xs text-gray-500">Total Users</p>
                  </CardContent>
                </Card>
                <Card className="shadow-lg bg-gradient-to-br from-white to-green-50">
                  <CardContent className="pt-4 pb-3">
                    <UserCheck className="w-5 h-5 text-green-500" />
                    <p className="text-2xl font-bold mt-1">{adminStats.activePaidUsers}</p>
                    <p className="text-xs text-gray-500">Active Paid</p>
                  </CardContent>
                </Card>
                <Card className="shadow-lg bg-gradient-to-br from-white to-amber-50">
                  <CardContent className="pt-4 pb-3">
                    <DollarSign className="w-5 h-5 text-amber-500" />
                    <p className="text-2xl font-bold mt-1">{formatCurrency(adminStats.totalRevenue)}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </CardContent>
                </Card>
                <Card className="shadow-lg bg-gradient-to-br from-white to-purple-50">
                  <CardContent className="pt-4 pb-3">
                    <FileText className="w-5 h-5 text-purple-500" />
                    <p className="text-2xl font-bold mt-1">{adminStats.todayProblems}</p>
                    <p className="text-xs text-gray-500">Today Posts</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Pending Payments ({pendingPayments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingPayments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No pending payments</p>
                  ) : (
                    <ScrollArea className="h-[30vh]">
                      <div className="space-y-2 pr-2">
                        {pendingPayments.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm">
                            <div>
                              <p className="font-medium">{payment.user?.phone}</p>
                              <p className="text-xs text-gray-500">{payment.user?.name} • Trust: {payment.user?.trustScore}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => approvePayment(payment.id, 'approve')}>✓ Approve</Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => approvePayment(payment.id, 'reject')}>✗ Reject</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">All Users ({adminStats.totalUsers})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[30vh]">
                    <div className="space-y-2 pr-2">
                      {adminUsers.map((u) => (
                        <div key={u.id} className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm">
                          <div>
                            <p className="font-medium">{u.phone}</p>
                            <p className="text-xs text-gray-500">{u.name || 'No name'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={u.trustScore >= 70 ? 'text-green-500' : u.trustScore >= 40 ? 'text-yellow-600' : 'text-red-500'}>{u.trustScore}</Badge>
                            <Badge className={u.paymentActive ? 'bg-green-500' : 'bg-gray-400'}>{u.paymentActive ? 'Active' : 'Inactive'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* SOS Button */}
      {isAuthenticated && (
        <Button
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-xl z-40 animate-pulse-soft"
          size="icon"
          onClick={() => setShowSOSDialog(true)}
        >
          <AlertTriangle className="w-7 h-7" />
        </Button>
      )}

      {/* SOS Dialog */}
      <Dialog open={showSOSDialog} onOpenChange={setShowSOSDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-xl">
              <AlertTriangle className="w-6 h-6" />
              🚨 SOS Emergency
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-600 font-medium">Emergency me ye contacts use karo:</p>
            <Button className="w-full h-12" variant="destructive" onClick={() => window.open('tel:112')}>📞 Emergency (112)</Button>
            <Button className="w-full h-12" variant="outline" onClick={() => window.open('tel:100')}>👮 Police (100)</Button>
            <Button className="w-full h-12" variant="outline" onClick={() => window.open(`https://maps.google.com/?q=${userLocation?.lat},${userLocation?.lng}`)}>📍 Location Share</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Problem Detail Dialog */}
      <Dialog open={!!selectedProblem && !showFeedbackDialog} onOpenChange={() => setSelectedProblem(null)}>
        <DialogContent className="max-w-md">
          {selectedProblem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProblem.title}</DialogTitle>
                <DialogDescription>
                  <div className="flex gap-2 mt-2">
                    <Badge>{PROBLEM_CATEGORIES[selectedProblem.type].label}</Badge>
                    <Badge variant="outline">{selectedProblem.riskLevel} Risk</Badge>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-gray-600">{selectedProblem.description}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProblem.offerPrice && <Badge className="bg-green-500 text-white">Offer: {formatCurrency(selectedProblem.offerPrice)}</Badge>}
                  <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{formatRelativeTime(selectedProblem.createdAt)}</Badge>
                  {selectedProblem.distance && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{selectedProblem.distance.toFixed(1)} km</Badge>}
                </div>
                {selectedProblem.locationText && <p className="text-sm text-gray-500">📍 {selectedProblem.locationText}</p>}
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Posted by</p>
                    <p className="font-medium">{selectedProblem.user.name || 'Anonymous'}</p>
                    <p className="text-sm">{formatPhone(selectedProblem.user.phone)}</p>
                  </div>
                  <Badge className={`${getTrustBadge(selectedProblem.user.trustScore).color} text-white`}>
                    {getTrustBadge(selectedProblem.user.trustScore).icon} {selectedProblem.user.trustScore}
                  </Badge>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2">
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500" onClick={() => window.open(`tel:+91${selectedProblem.user.phone}`)}>
                  <PhoneCall className="w-4 h-4 mr-2" /> Call Now
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowReportDialog(true)}>
                  <Flag className="w-4 h-4 mr-2" /> Report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>🚨 Report Problem</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={reportCategory} onValueChange={setReportCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                  <SelectItem value="MISBEHAVIOR">Misbehavior</SelectItem>
                  <SelectItem value="FRAUD">Fraud</SelectItem>
                  <SelectItem value="SAFETY">Safety Concern</SelectItem>
                  <SelectItem value="SPAM">Spam</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea placeholder="Issue describe karo..." value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedProblem && submitReport(selectedProblem.userId)} disabled={!reportReason || loading}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>⭐ Feedback &amp; Resolution</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Helper ne madad ki?</Label>
              <div className="flex gap-2">
                <Button variant={helperReached === true ? 'default' : 'outline'} className="flex-1" onClick={() => setHelperReached(true)}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Haan
                </Button>
                <Button variant={helperReached === false ? 'destructive' : 'outline'} className="flex-1" onClick={() => setHelperReached(false)}>
                  <XCircle className="w-4 h-4 mr-1" /> Nahi
                </Button>
              </div>
            </div>
            {helperReached === true && (
              <>
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button key={star} variant="ghost" size="icon" onClick={() => setFeedbackRating(star)}>
                        <Star className={`w-7 h-7 ${star <= feedbackRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Comment (Optional)</Label>
                  <Textarea placeholder="Experience kaisa raha?" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} />
                </div>
              </>
            )}
            {helperReached === false && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <AlertTitle>No-show Report</AlertTitle>
                <AlertDescription>Helper ka trust score -10 hoga.</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedProblem && submitFeedback(selectedProblem.id, selectedProblem.userId)} disabled={helperReached === null || loading}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t mt-auto">
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between">
          <p className="font-semibold gradient-text text-sm">{HERO_TEXT.tagline}</p>
          <p className="text-xs text-gray-400">© 2024 Help2Earn</p>
        </div>
      </footer>
    </div>
  )
}
