import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// GET - Get all problems (with filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    
    const where: Record<string, unknown> = {}
    
    if (userId) {
      where.userId = userId
    }
    
    if (status) {
      where.status = status
    }
    
    const problems = await db.problem.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            name: true,
            trustScore: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    return NextResponse.json({
      problems: problems.map(p => ({
        id: p.id,
        userId: p.userId,
        type: p.type,
        riskLevel: p.riskLevel,
        title: p.title,
        description: p.description,
        offerPrice: p.offerPrice,
        latitude: p.latitude,
        longitude: p.longitude,
        locationText: p.locationText,
        minTrustRequired: p.minTrustRequired,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        expiresAt: p.expiresAt?.toISOString() || null,
        user: {
          id: p.user.id,
          phone: p.user.phone,
          name: p.user.name,
          trustScore: p.user.trustScore
        }
      }))
    })
  } catch (error) {
    console.error('Get problems error:', error)
    return NextResponse.json(
      { error: 'Failed to get problems' },
      { status: 500 }
    )
  }
}

// POST - Create new problem
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { 
      userId, 
      type, 
      title, 
      description, 
      offerPrice,
      latitude,
      longitude,
      locationText 
    } = data
    
    if (!userId || !title || !description) {
      return NextResponse.json(
        { error: 'User ID, title, and description required' },
        { status: 400 }
      )
    }
    
    // Check user payment status
    const user = await db.user.findUnique({
      where: { id: userId }
    })
    
    if (!user || !user.paymentActive) {
      return NextResponse.json(
        { error: 'Active subscription required to post problems' },
        { status: 403 }
      )
    }
    
    // Determine risk level based on type
    let riskLevel = 'LOW'
    let minTrustRequired = 40
    
    if (type === 'TIME_ACCESS') {
      riskLevel = 'MEDIUM'
      minTrustRequired = 50
    } else if (type === 'RESOURCE_RENT') {
      riskLevel = 'HIGH'
      minTrustRequired = 70
    }
    
    // Check daily post limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayPosts = await db.problem.count({
      where: {
        userId,
        createdAt: { gte: today }
      }
    })
    
    if (todayPosts >= 3) {
      return NextResponse.json(
        { error: 'Daily post limit (3) reached' },
        { status: 400 }
      )
    }
    
    // Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    const problem = await db.problem.create({
      data: {
        id: uuidv4(),
        userId,
        type: type || 'EMERGENCY',
        riskLevel,
        title,
        description,
        offerPrice: offerPrice || null,
        latitude: latitude || user.latitude,
        longitude: longitude || user.longitude,
        locationText,
        minTrustRequired,
        expiresAt
      }
    })
    
    return NextResponse.json({
      success: true,
      problem: {
        id: problem.id,
        type: problem.type,
        riskLevel: problem.riskLevel,
        title: problem.title,
        description: problem.description,
        offerPrice: problem.offerPrice,
        latitude: problem.latitude,
        longitude: problem.longitude,
        locationText: problem.locationText,
        minTrustRequired: problem.minTrustRequired,
        status: problem.status,
        createdAt: problem.createdAt.toISOString(),
        expiresAt: problem.expiresAt?.toISOString() || null
      }
    })
  } catch (error) {
    console.error('Create problem error:', error)
    return NextResponse.json(
      { error: 'Failed to create problem' },
      { status: 500 }
    )
  }
}
