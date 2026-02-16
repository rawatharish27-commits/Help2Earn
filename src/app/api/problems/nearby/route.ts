import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Haversine formula to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('radius') || '20') // 20km default
    const type = searchParams.get('type')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }
    
    // Check user payment status
    const user = await db.user.findUnique({
      where: { id: userId }
    })
    
    if (!user || !user.paymentActive) {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      )
    }
    
    // Get all open problems
    const where: Record<string, unknown> = {
      status: 'OPEN',
      expiresAt: { gt: new Date() }
    }
    
    if (type) {
      where.type = type
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
      orderBy: { createdAt: 'desc' }
    })
    
    // Filter by distance and trust score
    const nearbyProblems = problems
      .filter(p => {
        // Skip user's own problems
        if (p.userId === userId) return false
        
        // Check if problem has location
        if (!p.latitude || !p.longitude) return false
        
        // Check distance
        const distance = calculateDistance(lat, lng, p.latitude, p.longitude)
        if (distance > radius) return false
        
        // Check if user's trust score meets requirement
        if (user.trustScore < p.minTrustRequired) return false
        
        return true
      })
      .map(p => ({
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
        distance: calculateDistance(lat, lng, p.latitude!, p.longitude!),
        user: {
          id: p.user.id,
          phone: p.user.phone,
          name: p.user.name,
          trustScore: p.user.trustScore
        }
      }))
      .sort((a, b) => a.distance - b.distance)
    
    return NextResponse.json({
      problems: nearbyProblems,
      total: nearbyProblems.length,
      radius,
      userLocation: { lat, lng }
    })
  } catch (error) {
    console.error('Get nearby problems error:', error)
    return NextResponse.json(
      { error: 'Failed to get nearby problems' },
      { status: 500 }
    )
  }
}
