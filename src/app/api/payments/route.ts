import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// GET - Get payments for user or all (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
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
    
    const where: Record<string, unknown> = {}
    
    // Admin can see all payments, regular users see their own
    if (user.isAdmin) {
      if (status) {
        where.status = status
      }
    } else {
      where.userId = userId
    }
    
    const payments = await db.payment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
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
      }))
    })
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json(
      { error: 'Failed to get payments' },
      { status: 500 }
    )
  }
}

// POST - Create payment request
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, amount } = data
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
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
    
    // Check if already has active subscription
    if (user.paymentActive && user.activeTill && new Date(user.activeTill) > new Date()) {
      return NextResponse.json(
        { error: 'Already have active subscription' },
        { status: 400 }
      )
    }
    
    // Check for pending payments
    const pendingPayment = await db.payment.findFirst({
      where: {
        userId,
        status: 'PENDING'
      }
    })
    
    if (pendingPayment) {
      return NextResponse.json(
        { error: 'Already have pending payment request' },
        { status: 400 }
      )
    }
    
    const now = new Date()
    
    const payment = await db.payment.create({
      data: {
        id: uuidv4(),
        userId,
        amount: amount || 49,
        status: 'PENDING',
        month: now.getMonth() + 1,
        year: now.getFullYear()
      }
    })
    
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
