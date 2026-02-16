import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }
    
    const user = await db.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        paymentActive: user.paymentActive,
        activeTill: user.activeTill?.toISOString() || null,
        trustScore: user.trustScore,
        latitude: user.latitude,
        longitude: user.longitude,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}
