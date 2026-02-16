import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Approve or reject payment (admin only)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { adminId, paymentId, action, rejectionReason } = data
    
    if (!adminId || !paymentId || !action) {
      return NextResponse.json(
        { error: 'Admin ID, payment ID, and action required' },
        { status: 400 }
      )
    }
    
    // Verify admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })
    
    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin only' },
        { status: 403 }
      )
    }
    
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    })
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }
    
    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 400 }
      )
    }
    
    if (action === 'approve') {
      // Update payment status
      await db.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED' }
      })
      
      // Activate user subscription for 30 days
      const activeTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      
      await db.user.update({
        where: { id: payment.userId },
        data: {
          paymentActive: true,
          activeTill
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Payment approved',
        activeTill: activeTill.toISOString()
      })
    } else if (action === 'reject') {
      await db.payment.update({
        where: { id: paymentId },
        data: { 
          status: 'REJECTED'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Payment rejected'
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Approve payment error:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
