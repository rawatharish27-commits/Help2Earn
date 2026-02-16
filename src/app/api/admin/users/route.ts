import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get all users (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    
    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      )
    }
    
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })
    
    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin only' },
        { status: 403 }
      )
    }
    
    const where: Record<string, unknown> = {}
    
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { name: { contains: search } }
      ]
    }
    
    const total = await db.user.count({ where })
    
    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
    
    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        phone: u.phone,
        name: u.name,
        paymentActive: u.paymentActive,
        activeTill: u.activeTill?.toISOString() || null,
        trustScore: u.trustScore,
        latitude: u.latitude,
        longitude: u.longitude,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt.toISOString()
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    )
  }
}
