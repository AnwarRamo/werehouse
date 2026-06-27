/**
 * Diagnostic script to check employee's bus subscription status
 * Usage: node scripts/diagnose-employee-bus.js <employeeId>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseEmployeeBus(employeeId) {
  console.log('🔍 Diagnosing employee bus subscription...\n');
  console.log(`Employee ID: ${employeeId}\n`);
  console.log('═'.repeat(60));

  // 1. Check if employee exists
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    select: {
      employeeId: true,
      name: true,
      residence: true,
      status: true,
    },
  });

  if (!employee) {
    console.error('❌ Employee not found in database!');
    process.exit(1);
  }

  console.log('✅ Employee Found:');
  console.log(`   Name: ${employee.name}`);
  console.log(`   Residence: ${employee.residence || 'N/A'}`);
  console.log(`   Status: ${employee.status}`);
  console.log('═'.repeat(60));

  // 2. Check all bus subscriptions (active and inactive)
  const allSubscriptions = await prisma.busPassenger.findMany({
    where: { employeeId },
    include: {
      bus: {
        select: {
          id: true,
          busId: true,
          route: true,
          plateNumber: true,
          driverName: true,
          capacity: true,
          totalCost: true,
          companyDeductionPct: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📋 Total Subscriptions Found: ${allSubscriptions.length}\n`);

  if (allSubscriptions.length === 0) {
    console.log('✅ Employee has NO bus subscriptions.');
    console.log('   You should be able to add them to any bus.');
  } else {
    const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active');
    const inactiveSubscriptions = allSubscriptions.filter(s => s.status === 'inactive');

    console.log(`   Active: ${activeSubscriptions.length}`);
    console.log(`   Inactive: ${inactiveSubscriptions.length}\n`);

    if (activeSubscriptions.length > 0) {
      console.log('🚨 ACTIVE SUBSCRIPTIONS (blocking new assignments):');
      console.log('─'.repeat(60));
      activeSubscriptions.forEach((sub, idx) => {
        console.log(`\n   [${idx + 1}] Bus ID: ${sub.bus.id}`);
        console.log(`       Bus Code: ${sub.bus.busId}`);
        console.log(`       Route: ${sub.bus.route}`);
        console.log(`       Plate: ${sub.bus.plateNumber}`);
        console.log(`       Driver: ${sub.bus.driverName}`);
        console.log(`       Subscription Date: ${sub.subscriptionDate.toISOString().split('T')[0]}`);
        console.log(`       Status: ${sub.status}`);
        console.log(`       Cost: ${sub.bus.totalCost} SYP`);
        console.log(`       Company Deduction: ${sub.bus.companyDeductionPct}%`);
      });
      console.log('\n' + '═'.repeat(60));
      console.log('\n⚠️  BLOCKING REASON:');
      console.log('   Employee already has active subscription(s)!');
      console.log('   System enforces: ONE active bus per employee');
      console.log('\n📌 SOLUTION:');
      console.log('   You must remove them from the active bus first.');
    }

    if (inactiveSubscriptions.length > 0) {
      console.log('\n📜 INACTIVE SUBSCRIPTIONS (historical):');
      console.log('─'.repeat(60));
      inactiveSubscriptions.forEach((sub, idx) => {
        console.log(`\n   [${idx + 1}] Bus: ${sub.bus.route} (${sub.bus.plateNumber})`);
        console.log(`       Subscription Date: ${sub.subscriptionDate.toISOString().split('T')[0]}`);
        console.log(`       Status: ${sub.status}`);
      });
    }
  }

  console.log('\n' + '═'.repeat(60));

  // 3. Show all available buses
  const allBuses = await prisma.bus.findMany({
    where: { status: 'active' },
    include: {
      _count: {
        select: { passengers: { where: { status: 'active' } } },
      },
      passengers: {
        where: { 
          employeeId,
          status: 'active' 
        },
        select: { id: true, status: true },
      },
    },
    orderBy: { route: 'asc' },
  });

  console.log('\n🚌 Available Buses:\n');
  allBuses.forEach((bus, idx) => {
    const isSubscribed = bus.passengers.length > 0;
    const isFull = bus._count.passengers >= bus.capacity;
    const available = bus.capacity - bus._count.passengers;

    console.log(`   [${idx + 1}] ${bus.route} (${bus.plateNumber})`);
    console.log(`       Bus ID: ${bus.id}`);
    console.log(`       Capacity: ${bus._count.passengers}/${bus.capacity} (${available} available)`);
    console.log(`       Cost: ${bus.totalCost} SYP | Deduction: ${bus.companyDeductionPct}%`);
    
    if (isSubscribed) {
      console.log(`       🔴 ALREADY SUBSCRIBED`);
    } else if (isFull) {
      console.log(`       🔴 BUS IS FULL`);
    } else {
      console.log(`       ✅ AVAILABLE FOR ASSIGNMENT`);
    }
    console.log('');
  });

  console.log('═'.repeat(60));
  console.log('\n📝 RECOMMENDED ACTIONS:\n');

  if (activeSubscriptions.length > 0) {
    const currentBus = activeSubscriptions[0];
    console.log('Step 1: Remove employee from current bus');
    console.log(`   DELETE /api/transportation/buses/${currentBus.busId}/passengers/${employeeId}`);
    console.log('');
    console.log('Step 2: Add employee to target bus');
    console.log('   POST /api/transportation/buses/{targetBusId}/passengers');
    console.log('   Body: { "employeeId": "' + employeeId + '", "subscriptionDate": "' + new Date().toISOString().split('T')[0] + '" }');
  } else {
    console.log('✅ Employee is not subscribed to any bus.');
    console.log('   You can add them directly:');
    console.log('   POST /api/transportation/buses/{targetBusId}/passengers');
    console.log('   Body: { "employeeId": "' + employeeId + '", "subscriptionDate": "' + new Date().toISOString().split('T')[0] + '" }');
  }

  console.log('\n' + '═'.repeat(60));
}

// Get employee ID from command line
const employeeId = process.argv[2];

if (!employeeId) {
  console.error('❌ Usage: node scripts/diagnose-employee-bus.js <employeeId>');
  console.error('   Example: node scripts/diagnose-employee-bus.js EMP001');
  process.exit(1);
}

diagnoseEmployeeBus(employeeId)
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
