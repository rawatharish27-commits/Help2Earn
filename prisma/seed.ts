import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

// Generate referral code from phone number
function generateReferralCode(phone: string): string {
  const hash = phone.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + parseInt(char)) | 0
  }, 0)
  return `H2E${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`
}

async function main() {
  console.log('🌱 Seeding database...\n')

  // Create admin user
  const adminPhone = '9999999999'
  const existingAdmin = await prisma.user.findUnique({
    where: { phone: adminPhone }
  })

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        id: uuidv4(),
        phone: adminPhone,
        name: 'Admin User',
        trustScore: 100,
        paymentActive: true,
        activeTill: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isAdmin: true,
        ageVerified: true,
        referralCode: generateReferralCode(adminPhone),
        latitude: 28.6139,
        longitude: 77.2090,
        locationText: 'Connaught Place, Delhi'
      }
    })
    console.log('✅ Created admin user:', admin.phone)
    console.log('   Referral Code:', admin.referralCode)
  } else {
    await prisma.user.update({
      where: { phone: adminPhone },
      data: {
        isAdmin: true,
        paymentActive: true,
        activeTill: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        trustScore: 100,
        ageVerified: true,
        referralCode: existingAdmin.referralCode || generateReferralCode(adminPhone)
      }
    })
    console.log('✅ Updated admin user:', adminPhone)
  }

  // Create test users with different profiles
  const testUsers = [
    { phone: '8888888888', name: 'Rahul Sharma', trustScore: 75, paymentActive: true, location: 'Karol Bagh' },
    { phone: '7777777777', name: 'Priya Singh', trustScore: 65, paymentActive: true, location: 'Lajpat Nagar' },
    { phone: '6666666666', name: 'Amit Kumar', trustScore: 45, paymentActive: false, location: 'Saket' },
    { phone: '5555555555', name: 'Sneha Patel', trustScore: 85, paymentActive: true, location: 'Dwarka' },
    { phone: '4444444444', name: 'Vikram Mehta', trustScore: 55, paymentActive: true, location: 'Rohini' },
    { phone: '3333333333', name: 'Anita Verma', trustScore: 30, paymentActive: false, location: 'Nehru Place' },
  ]

  for (const testUser of testUsers) {
    const existing = await prisma.user.findUnique({
      where: { phone: testUser.phone }
    })

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          phone: testUser.phone,
          name: testUser.name,
          trustScore: testUser.trustScore,
          paymentActive: testUser.paymentActive,
          activeTill: testUser.paymentActive 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
            : null,
          ageVerified: true,
          referralCode: generateReferralCode(testUser.phone),
          latitude: 28.6139 + (Math.random() - 0.5) * 0.15,
          longitude: 77.2090 + (Math.random() - 0.5) * 0.15,
          locationText: testUser.location + ', Delhi',
          totalHelpsGiven: Math.floor(Math.random() * 10),
          totalHelpsTaken: Math.floor(Math.random() * 5)
        }
      })
      console.log('✅ Created user:', user.phone, '-', user.name)
    }
  }

  // Get all active users
  const activeUsers = await prisma.user.findMany({
    where: { paymentActive: true, isAdmin: false }
  })

  // Sample problems with variety
  const sampleProblems = [
    {
      title: 'Bike Puncture - Need Urgent Help!',
      description: 'My bike got punctured near Rajiv Chowk Metro. Need someone with a puncture repair kit urgently. Will pay ₹50 for the help.',
      type: 'EMERGENCY' as const,
      riskLevel: 'LOW' as const,
      category: 'puncture',
      offerPrice: 50
    },
    {
      title: 'Need Ladder for 2-3 Hours',
      description: 'Need a sturdy ladder to clean ceiling fans and change some bulbs. Will return in perfect condition. Deposit available.',
      type: 'RESOURCE_RENT' as const,
      riskLevel: 'MEDIUM' as const,
      category: 'tools',
      offerPrice: 100
    },
    {
      title: 'Queue at Aadhaar Center',
      description: 'Need someone to stand in queue at Aadhaar enrollment center for 2-3 hours. Will pay ₹150. Location: Janakpuri.',
      type: 'TIME_ACCESS' as const,
      riskLevel: 'LOW' as const,
      category: 'queue',
      offerPrice: 150
    },
    {
      title: 'Phone Battery Dead - Emergency',
      description: 'My phone battery died and I need to make an urgent call. Can someone nearby lend their phone for 5 minutes?',
      type: 'EMERGENCY' as const,
      riskLevel: 'LOW' as const,
      category: 'charging',
      offerPrice: 20
    },
    {
      title: 'Scooty for Rent - 1 Day',
      description: 'Need a scooty for tomorrow for some urgent work. Will provide ID proof and ₹500 deposit. Must be in good condition.',
      type: 'RESOURCE_RENT' as const,
      riskLevel: 'HIGH' as const,
      category: 'vehicle',
      minTrustRequired: 70,
      offerPrice: 300
    },
    {
      title: 'Help with Grocery Shopping',
      description: 'Need someone to pick up groceries from the market. Will provide list and payment. Duration: 1 hour.',
      type: 'TIME_ACCESS' as const,
      riskLevel: 'LOW' as const,
      category: 'errand',
      offerPrice: 80
    },
    {
      title: 'Power Drill Needed',
      description: 'Need a power drill for 30 minutes to fix some shelves. Will pick up and return.',
      type: 'RESOURCE_RENT' as const,
      riskLevel: 'MEDIUM' as const,
      category: 'tools',
      offerPrice: 50
    },
    {
      title: 'Jump Start My Car',
      description: 'Car battery dead in parking. Need someone with jumper cables to help start the car.',
      type: 'EMERGENCY' as const,
      riskLevel: 'LOW' as const,
      category: 'vehicle',
      offerPrice: 100
    }
  ]

  // Create problems for users
  for (let i = 0; i < Math.min(sampleProblems.length, activeUsers.length); i++) {
    const user = activeUsers[i]
    const problemData = sampleProblems[i]
    
    const existingProblem = await prisma.problem.findFirst({
      where: { userId: user.id, title: problemData.title }
    })

    if (!existingProblem) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const problem = await prisma.problem.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          ...problemData,
          latitude: user.latitude,
          longitude: user.longitude,
          locationText: user.locationText,
          minTrustRequired: problemData.minTrustRequired || 
            (problemData.riskLevel === 'HIGH' ? 70 : problemData.riskLevel === 'MEDIUM' ? 50 : 40),
          expiresAt,
          viewCount: Math.floor(Math.random() * 20),
          callCount: Math.floor(Math.random() * 5)
        }
      })
      console.log('✅ Created problem:', problem.title.substring(0, 30) + '...')
    }
  }

  // Create pending payments for inactive users
  const inactiveUsers = await prisma.user.findMany({
    where: { paymentActive: false, isAdmin: false }
  })

  for (const user of inactiveUsers) {
    const existingPayment = await prisma.payment.findFirst({
      where: { userId: user.id, status: 'PENDING' }
    })

    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          amount: 49,
          status: 'PENDING',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        }
      })
      console.log('✅ Created pending payment for:', user.phone)
    }
  }

  // Create some notifications
  const allUsers = await prisma.user.findMany({ where: { isAdmin: false } })
  
  for (const user of allUsers.slice(0, 3)) {
    const existingNotification = await prisma.notification.findFirst({
      where: { userId: user.id }
    })

    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          type: 'SYSTEM',
          title: 'Welcome to Help2Earn!',
          message: 'Madad karo, kamaao! Complete profile aur subscription activate karo.',
          read: false
        }
      })
      console.log('✅ Created notification for:', user.phone)
    }
  }

  // Create admin settings
  const settings = [
    { key: 'UPI_ID', value: 'help2earn@upi' },
    { key: 'SUBSCRIPTION_PRICE', value: '49' },
    { key: 'MAX_POSTS_PER_DAY', value: '3' },
    { key: 'RADIUS_KM', value: '20' },
    { key: 'OTP_EXPIRY_MINUTES', value: '5' },
  ]

  for (const setting of settings) {
    const existing = await prisma.setting.findUnique({
      where: { key: setting.key }
    })

    if (!existing) {
      await prisma.setting.create({
        data: {
          id: uuidv4(),
          key: setting.key,
          value: setting.value
        }
      })
      console.log('✅ Created setting:', setting.key)
    }
  }

  console.log('\n🎉 Help2Earn - Seeding completed!')
  console.log('\n📋 Test Credentials:')
  console.log('   Admin: 9999999999')
  console.log('   Test Users: 8888888888, 7777777777, 6666666666, 5555555555, 4444444444, 3333333333')
  console.log('   OTP will be displayed in demo mode')
  console.log('   Made with ❤️ for India\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
