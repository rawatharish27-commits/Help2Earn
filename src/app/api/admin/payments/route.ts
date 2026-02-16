import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get pending payments (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const status = searchParams.get('status') || 'PENDING'
    
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
    
    const payments = await db.payment.findMany({
      where: { status },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            name: true,
            trustScore: true,
            paymentActive: true
          }
        }
      },
      orderBy: { createdAt: 'asc' } // Oldest first for approval queue
    })
    
    return NextResponse.json({
      payments: payments.map(p => ({
        id: p.id,
        userId: p.userId,
        amount: p.amount,
        status: p.status,
        month: p.month,
        year: p.year,
        createdAt: p.createdAt.toISOString(),
        user: p.user
      })),
      total: payments.length
    })
  } catch (error) {
    console.error('Get admin payments error:', error)
    return NextResponse.json(
      { error: 'Failed to get payments' },
      { status: 500 }
    )
  }
}
