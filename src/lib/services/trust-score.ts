import { db } from '@/lib/db'

// Trust Score Constants
export const TRUST_CONFIG = {
  POINTS: {
    SUCCESSFUL_HELP: 3,
    POSITIVE_RATING: 2,      // 4-5 stars
    NEUTRAL_RATING: 0,       // 3 stars
    NEGATIVE_RATING: -5,     // 1-2 stars
    NO_SHOW: -10,
    VALID_REPORT: -15,
    WEEKLY_ACTIVE: 1,
    LOCATION_CONSISTENCY: 5,
    REFERRAL_BONUS: 3,
  },
  LIMITS: {
    MAX_SCORE: 100,
    MIN_SCORE: 0,
    DEFAULT_SCORE: 50,
    TRUSTED_THRESHOLD: 70,
    NEUTRAL_THRESHOLD: 40,
    MAX_POSTS_PER_DAY: 3,
    MAX_REPORTS_PER_DAY: 5,
    NO_SHOW_THRESHOLD: 3,  // After 3 no-shows, restrictions apply
    BAN_THRESHOLD: 20,      // Below this score = auto ban
  }
}

export type TrustLevel = 'TRUSTED' | 'NEUTRAL' | 'RESTRICTED'

export class TrustScoreService {
  
  /**
   * Calculate and return trust level based on score
   */
  static getTrustLevel(score: number): TrustLevel {
    if (score >= TRUST_CONFIG.LIMITS.TRUSTED_THRESHOLD) return 'TRUSTED'
    if (score >= TRUST_CONFIG.LIMITS.NEUTRAL_THRESHOLD) return 'NEUTRAL'
    return 'RESTRICTED'
  }

  /**
   * Calculate new trust score with bounds checking
   */
  static calculateNewScore(currentScore: number, change: number): number {
    const newScore = currentScore + change
    return Math.max(
      TRUST_CONFIG.LIMITS.MIN_SCORE, 
      Math.min(TRUST_CONFIG.LIMITS.MAX_SCORE, newScore)
    )
  }

  /**
   * Update user's trust score
   */
  static async updateTrustScore(userId: string, change: number, reason: string): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { trustScore: true }
    })

    if (!user) throw new Error('User not found')

    const newScore = this.calculateNewScore(user.trustScore, change)

    await db.user.update({
      where: { id: userId },
      data: { 
        trustScore: newScore,
        updatedAt: new Date()
      }
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: 'TRUST_SCORE_UPDATE',
        details: `${reason}: ${change >= 0 ? '+' : ''}${change} (New score: ${newScore})`
      }
    })

    return newScore
  }

  /**
   * Handle successful help completion
   */
  static async recordSuccessfulHelp(userId: string): Promise<number> {
    const score = await this.updateTrustScore(
      userId, 
      TRUST_CONFIG.POINTS.SUCCESSFUL_HELP, 
      'Successful help completed'
    )

    // Increment helps given count
    await db.user.update({
      where: { id: userId },
      data: { 
        totalHelpsGiven: { increment: 1 },
        lastActiveAt: new Date()
      }
    })

    return score
  }

  /**
   * Handle rating received
   */
  static async recordRating(userId: string, rating: number): Promise<number> {
    let points: number
    let reason: string

    if (rating >= 4) {
      points = TRUST_CONFIG.POINTS.POSITIVE_RATING
      reason = `Positive rating received (${rating} stars)`
    } else if (rating <= 2) {
      points = TRUST_CONFIG.POINTS.NEGATIVE_RATING
      reason = `Negative rating received (${rating} stars)`
    } else {
      points = TRUST_CONFIG.POINTS.NEUTRAL_RATING
      reason = `Neutral rating received (${rating} stars)`
    }

    return this.updateTrustScore(userId, points, reason)
  }

  /**
   * Handle no-show
   */
  static async recordNoShow(userId: string, problemId: string): Promise<{ score: number; shouldRestrict: boolean }> {
    // Create no-show record
    await db.noShow.create({
      data: {
        userId,
        problemId
      }
    })

    const score = await this.updateTrustScore(
      userId, 
      TRUST_CONFIG.POINTS.NO_SHOW, 
      'No-show reported'
    )

    // Count no-shows in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentNoShows = await db.noShow.count({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo }
      }
    })

    const shouldRestrict = recentNoShows >= TRUST_CONFIG.LIMITS.NO_SHOW_THRESHOLD

    return { score, shouldRestrict }
  }

  /**
   * Handle report
   */
  static async recordReport(reportedUserId: string, isReportValid: boolean): Promise<number> {
    if (!isReportValid) {
      return (await db.user.findUnique({ where: { id: reportedUserId } }))?.trustScore || TRUST_CONFIG.LIMITS.DEFAULT_SCORE
    }

    return this.updateTrustScore(
      reportedUserId, 
      TRUST_CONFIG.POINTS.VALID_REPORT, 
      'Valid report received'
    )
  }

  /**
   * Weekly active bonus
   */
  static async applyWeeklyActiveBonus(userId: string): Promise<number> {
    // Check if already received this week
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const existingBonus = await db.activityLog.findFirst({
      where: {
        userId,
        action: 'WEEKLY_ACTIVE_BONUS',
        createdAt: { gte: sevenDaysAgo }
      }
    })

    if (existingBonus) {
      return (await db.user.findUnique({ where: { id: userId } }))?.trustScore || TRUST_CONFIG.LIMITS.DEFAULT_SCORE
    }

    const score = await this.updateTrustScore(
      userId, 
      TRUST_CONFIG.POINTS.WEEKLY_ACTIVE, 
      'Weekly active bonus'
    )

    return score
  }

  /**
   * Referral bonus
   */
  static async applyReferralBonus(userId: string): Promise<number> {
    const score = await this.updateTrustScore(
      userId, 
      TRUST_CONFIG.POINTS.REFERRAL_BONUS, 
      'Referral bonus'
    )

    // Increment referral count
    await db.user.update({
      where: { id: userId },
      data: { referralCount: { increment: 1 } }
    })

    return score
  }

  /**
   * Check if user can post problems
   */
  static async canPostProblem(userId: string): Promise<{ canPost: boolean; reason: string }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        trustScore: true, 
        paymentActive: true, 
        activeTill: true,
        isFrozen: true 
      }
    })

    if (!user) {
      return { canPost: false, reason: 'User not found' }
    }

    if (user.isFrozen) {
      return { canPost: false, reason: 'Account is frozen' }
    }

    if (!user.paymentActive || (user.activeTill && new Date(user.activeTill) < new Date())) {
      return { canPost: false, reason: 'Subscription inactive' }
    }

    // Check daily limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayPosts = await db.problem.count({
      where: {
        userId,
        createdAt: { gte: today }
      }
    })

    if (todayPosts >= TRUST_CONFIG.LIMITS.MAX_POSTS_PER_DAY) {
      return { canPost: false, reason: 'Daily post limit reached (3/day)' }
    }

    return { canPost: true, reason: '' }
  }

  /**
   * Check if user can access resource based on risk level
   */
  static canAccessRiskLevel(trustScore: number, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'): boolean {
    const level = this.getTrustLevel(trustScore)
    
    switch (riskLevel) {
      case 'LOW':
        return true  // All users can access low risk
      case 'MEDIUM':
        return level !== 'RESTRICTED'
      case 'HIGH':
        return level === 'TRUSTED'
      default:
        return false
    }
  }

  /**
   * Check if user should be auto-banned
   */
  static shouldAutoBan(trustScore: number): boolean {
    return trustScore < TRUST_CONFIG.LIMITS.BAN_THRESHOLD
  }

  /**
   * Get user trust stats
   */
  static async getUserTrustStats(userId: string): Promise<{
    score: number
    level: TrustLevel
    totalHelpsGiven: number
    totalHelpsTaken: number
    noShowCount: number
    reportCount: number
  }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        trustScore: true,
        totalHelpsGiven: true,
        totalHelpsTaken: true
      }
    })

    if (!user) throw new Error('User not found')

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [noShowCount, reportCount] = await Promise.all([
      db.noShow.count({
        where: { userId, createdAt: { gte: thirtyDaysAgo } }
      }),
      db.report.count({
        where: { reportedId: userId, createdAt: { gte: thirtyDaysAgo } }
      })
    ])

    return {
      score: user.trustScore,
      level: this.getTrustLevel(user.trustScore),
      totalHelpsGiven: user.totalHelpsGiven,
      totalHelpsTaken: user.totalHelpsTaken,
      noShowCount,
      reportCount
    }
  }
}
