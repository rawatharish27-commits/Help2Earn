import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// POST - Submit feedback after help
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { problemId, helperId, clientId, rating, comment, helperReached } = data
    
    if (!problemId || !helperId || !clientId || !rating) {
      return NextResponse.json(
        { error: 'Problem ID, helper ID, client ID, and rating required' },
        { status: 400 }
      )
    }
    
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }
    
    // Check if feedback already exists
    const existingFeedback = await db.feedback.findFirst({
      where: { problemId, helperId, clientId }
    })
    
    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted' },
        { status: 400 }
      )
    }
    
    // Create feedback
    const feedback = await db.feedback.create({
      data: {
        id: uuidv4(),
        problemId,
        helperId,
        clientId,
        rating,
        comment,
        helperReached
      }
    })
    
    // Update helper's trust score
    let trustChange = 0
    
    if (helperReached === false) {
      // No-show: -10 points
      trustChange = -10
      
      // Create no-show record
      await db.noShow.create({
        data: {
          id: uuidv4(),
          userId: helperId,
          problemId
        }
      })
    } else if (rating >= 4) {
      // Positive rating: +2 points
      trustChange = 2
    } else if (rating <= 2) {
      // Negative rating: -5 points
      trustChange = -5
    }
    // Neutral rating (3): no change
    
    if (trustChange !== 0) {
      await db.user.update({
        where: { id: helperId },
        data: {
          trustScore: { increment: trustChange }
        }
      })
    }
    
    // Mark problem as closed
    await db.problem.update({
      where: { id: problemId },
      data: { status: 'CLOSED' }
    })
    
    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        rating: feedback.rating,
        helperReached: feedback.helperReached,
        trustChange
      }
    })
  } catch (error) {
    console.error('Create feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
