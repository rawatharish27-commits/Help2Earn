import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// Generate referral code from phone number
function generateReferralCode(phone: string): string {
  const hash = phone.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + parseInt(char)) | 0
  }, 0)
  return `H2E${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`
}

export async function POST(request: NextRequest) {
  try {
    const { phone, code, name, referralCode } = await request.json()
    
    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and OTP code required' },
        { status: 400 }
      )
    }
    
    // Find valid OTP
    const otp = await db.oTP.findFirst({
      where: {
        phone,
        code,
        used: false,
        expiresAt: { gt: new Date() }
      }
    })
    
    if (!otp) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }
    
    // Mark OTP as used
    await db.oTP.update({
      where: { id: otp.id },
      data: { used: true }
    })
    
    // Find or create user
    let user = await db.user.findUnique({
      where: { phone }
    })
    
    if (!user) {
      // Check for referrer
      let referrerId: string | null = null
      if (referralCode) {
        const referrer = await db.user.findFirst({
          where: { referralCode }
        })
        if (referrer) {
          referrerId = referrer.id
        }
      }

      user = await db.user.create({
        data: {
          id: uuidv4(),
          phone,
          name: name || null,
          trustScore: 50, // Default trust score
          paymentActive: false,
          ageVerified: true,
          referralCode: generateReferralCode(phone),
          referredBy: referralCode || null,
          lastActiveAt: new Date(),
          notifyNewRequests: true,
          notifyPayments: true,
          notifyReports: true
        }
      })

      // If referred, log activity
      if (referrerId) {
        await db.activityLog.create({
          data: {
            userId: referrerId,
            action: 'REFERRAL_SIGNUP',
            details: `Referred user ${phone} signed up`
          }
        })
      }
    } else {
      // Update existing user
      const updateData: Record<string, unknown> = { lastActiveAt: new Date() }
      if (name && name !== user.name) {
        updateData.name = name
      }
      if (!user.referralCode) {
        updateData.referralCode = generateReferralCode(phone)
      }
      if (!user.ageVerified) {
        updateData.ageVerified = true
      }
      
      user = await db.user.update({
        where: { id: user.id },
        data: updateData
      })
    }
    
    // Create login activity log
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: 'User logged in via OTP'
      }
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        ageVerified: user.ageVerified,
        paymentActive: user.paymentActive,
        activeTill: user.activeTill?.toISOString() || null,
        trustScore: user.trustScore,
        latitude: user.latitude,
        longitude: user.longitude,
        locationText: user.locationText,
        isAdmin: user.isAdmin,
        isFrozen: user.isFrozen,
        referralCode: user.referralCode,
        referralCount: user.referralCount,
        totalHelpsGiven: user.totalHelpsGiven,
        totalHelpsTaken: user.totalHelpsTaken,
        notifyNewRequests: user.notifyNewRequests,
        notifyPayments: user.notifyPayments,
        notifyReports: user.notifyReports,
        createdAt: user.createdAt.toISOString(),
        lastActiveAt: user.lastActiveAt?.toISOString() || null
      }
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
