import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, latitude, longitude } = data
    
    if (!userId || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'User ID, latitude, and longitude required' },
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
    
    // Check for suspicious location jumps (GPS spoofing detection)
    let locationFlag = false
    if (user.latitude && user.longitude) {
      const distance = calculateDistance(
        user.latitude, user.longitude,
        latitude, longitude
      )
      const timeDiff = Date.now() - user.updatedAt.getTime()
      const hoursDiff = timeDiff / (1000 * 60 * 60)
      
      // If moved more than 100km in less than 1 hour, flag as suspicious
      if (distance > 100 && hoursDiff < 1) {
        locationFlag = true
        console.warn(`Suspicious location jump for user ${userId}: ${distance.toFixed(2)}km in ${hoursDiff.toFixed(2)} hours`)
      }
    }
    
    await db.user.update({
      where: { id: userId },
      data: {
        latitude,
        longitude
      }
    })
    
    return NextResponse.json({
      success: true,
      location: { latitude, longitude },
      flagged: locationFlag
    })
  } catch (error) {
    console.error('Update location error:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
