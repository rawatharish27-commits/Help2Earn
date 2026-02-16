import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()
    
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Valid 10-digit phone number required' },
        { status: 400 }
      )
    }
    
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    
    // Delete any existing OTPs for this phone
    await db.oTP.deleteMany({
      where: { phone }
    })
    
    // Create new OTP
    await db.oTP.create({
      data: {
        id: uuidv4(),
        phone,
        code,
        expiresAt
      }
    })
    
    // In production, send SMS here
    // For demo, we return the OTP (remove in production!)
    console.log(`OTP for ${phone}: ${code}`)
    
    return NextResponse.json({ 
      success: true,
      message: 'OTP sent successfully',
      // Remove in production - only for demo
      otp: code 
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
