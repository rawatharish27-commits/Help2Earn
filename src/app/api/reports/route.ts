import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// GET - Get reports (admin)
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
    
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin only' },
        { status: 403 }
      )
    }
    
    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }
    
    const reports = await db.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, phone: true, name: true, trustScore: true } },
        reported: { select: { id: true, phone: true, name: true, trustScore: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    return NextResponse.json({
      reports: reports.map(r => ({
        id: r.id,
        reporterId: r.reporterId,
        reportedId: r.reportedId,
        reason: r.reason,
        category: r.category,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporter: r.reporter,
        reported: r.reported
      }))
    })
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json(
      { error: 'Failed to get reports' },
      { status: 500 }
    )
  }
}

// POST - Create report
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { reporterId, reportedId, problemId, reason, category } = data
    
    if (!reporterId || !reportedId || !reason || !category) {
      return NextResponse.json(
        { error: 'Reporter ID, reported ID, reason, and category required' },
        { status: 400 }
      )
    }
    
    if (reporterId === reportedId) {
      return NextResponse.json(
        { error: 'Cannot report yourself' },
        { status: 400 }
      )
    }
    
    const report = await db.report.create({
      data: {
        id: uuidv4(),
        reporterId,
        reportedId,
        problemId,
        reason,
        category
      }
    })
    
    // Reduce trust score of reported user by 15
    await db.user.update({
      where: { id: reportedId },
      data: {
        trustScore: { decrement: 15 }
      }
    })
    
    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        category: report.category,
        status: report.status,
        createdAt: report.createdAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Create report error:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}
