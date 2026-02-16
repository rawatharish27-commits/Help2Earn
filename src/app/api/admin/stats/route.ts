import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get dashboard stats (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    
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
    
    // Get stats
    const [
      totalUsers,
      activePaidUsers,
      todayProblems,
      pendingPayments,
      flaggedUsers,
      openProblems,
      totalPayments,
      pendingReports
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { paymentActive: true } }),
      db.problem.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      db.payment.count({ where: { status: 'PENDING' } }),
      db.user.count({ where: { trustScore: { lt: 40 } } }),
      db.problem.count({ where: { status: 'OPEN' } }),
      db.payment.count({ where: { status: 'APPROVED' } }),
      db.report.count({ where: { status: 'PENDING' } })
    ])
    
    // Revenue stats
    const approvedPayments = await db.payment.findMany({
      where: { status: 'APPROVED' },
      select: { amount: true }
    })
    
    const totalRevenue = approvedPayments.reduce((sum, p) => sum + p.amount, 0)
    
    return NextResponse.json({
      stats: {
        totalUsers,
        activePaidUsers,
        todayProblems,
        pendingPayments,
        flaggedUsers,
        openProblems,
        totalPayments,
        totalRevenue,
        pendingReports
      }
    })
  } catch (error) {
    console.error('Get admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}
