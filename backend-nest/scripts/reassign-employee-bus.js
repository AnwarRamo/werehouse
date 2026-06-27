/**
 * Script to remove employee from current bus and optionally add to new bus
 * Usage: 
 *   Remove only: node scripts/reassign-employee-bus.js <employeeId>
 *   Remove & Add: node scripts/reassign-employee-bus.js <employeeId> <targetBusId> [subscriptionDate]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reassignEmployeeBus(employeeId, targetBusId = null, subscriptionDate = null) {
  console.log('🔄 Employee Bus Reassignment Tool\n');
  console.log(`Employee ID: ${employeeId}`);
  if (targetBusId) console.log(`Target Bus ID: ${targetBusId}`);
  console.log('═'.repeat(60));

  // 1. Find employee
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    select: { employeeId: true, name: true },
  });

  if (!employee) {
    console.error('❌ Employee not found!');
    process.exit(1);
  }

  console.log(`✅ Employee: ${employee.name} (${employee.employeeId})\n`);

  // 2. Find active subscriptions
  const activeSubscriptions = await prisma.busPassenger.findMany({
    where: {
      employeeId,
      status: 'active',
    },
    include: {
      bus: {
        select: {
          id: true,
          busId: true,
          route: true,
          plateNumber: true,
        },
      },
    },
  });

  if (activeSubscriptions.length === 0) {
    console.log('ℹ️  Employee has no active bus subscriptions.');
  } else {
    console.log(`🚨 Found ${activeSubscriptions.length} active subscription(s):\n`);
    
    for (const sub of activeSubscriptions) {
      console.log(`   Bus: ${sub.bus.route} (${sub.bus.plateNumber})`);
      console.log(`   Bus ID: ${sub.bus.id}`);
      console.log(`   Bus Code: ${sub.bus.busId}`);
      console.log('');
    }

    // 3. Remove from all active buses
    console.log('─'.repeat(60));
    console.log('🗑️  Removing employee from all active buses...\n');

    for (const sub of activeSubscriptions) {
      try {
        await prisma.busPassenger.update({
          where: { id: sub.id },
          data: { status: 'inactive' },
        });

        console.log(`   ✅ Removed from: ${sub.bus.route} (${sub.bus.plateNumber})`);

        // Also delete associated discount
        const discountReason = `بدل مواصلات - ${sub.bus.route} (${sub.bus.plateNumber})`;
        const deletedDiscount = await prisma.employeeSalaryDiscount.deleteMany({
          where: {
            employeeId,
            reason: discountReason,
          },
        });

        if (deletedDiscount.count > 0) {
          console.log(`      🗑️  Deleted discount: ${discountReason}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to remove from ${sub.bus.route}:`, error.message);
      }
    }

    console.log('\n' + '═'.repeat(60));
  }

  // 4. Add to target bus if specified
  if (targetBusId) {
    console.log('\n➕ Adding employee to target bus...\n');

    // Find target bus
    const targetBus = await prisma.bus.findFirst({
      where: {
        OR: [{ id: targetBusId }, { busId: targetBusId }],
      },
      include: {
        _count: {
          select: { passengers: { where: { status: 'active' } } },
        },
      },
    });

    if (!targetBus) {
      console.error('❌ Target bus not found!');
      process.exit(1);
    }

    // Check capacity
    if (targetBus._count.passengers >= targetBus.capacity) {
      console.error(`❌ Bus is at full capacity (${targetBus.capacity} passengers)`);
      process.exit(1);
    }

    const dateToUse = subscriptionDate ? new Date(subscriptionDate) : new Date();

    try {
      // Check if record exists
      const existing = await prisma.busPassenger.findUnique({
        where: {
          busId_employeeId: {
            busId: targetBus.id,
            employeeId,
          },
        },
      });

      let passenger;

      if (existing) {
        // Reactivate
        passenger = await prisma.busPassenger.update({
          where: { id: existing.id },
          data: {
            status: 'active',
            subscriptionDate: dateToUse,
          },
        });
        console.log(`   ✅ Reactivated subscription on: ${targetBus.route}`);
      } else {
        // Create new
        passenger = await prisma.busPassenger.create({
          data: {
            busId: targetBus.id,
            employeeId,
            name: employee.name,
            subscriptionDate: dateToUse,
          },
        });
        console.log(`   ✅ Created new subscription on: ${targetBus.route}`);
      }

      // Recalculate discounts for all passengers
      const netCost = Number(
        targetBus.totalCost * (1 - Number(targetBus.companyDeductionPct) / 100)
      );
      const allPassengers = await prisma.busPassenger.findMany({
        where: {
          busId: targetBus.id,
          status: 'active',
        },
      });
      const costPerEmployee = Number((netCost / allPassengers.length).toFixed(2));

      console.log(`\n   💰 Recalculating discounts for ${allPassengers.length} passengers:`);
      console.log(`      Net cost: ${netCost} SYP`);
      console.log(`      Cost per employee: ${costPerEmployee} SYP`);

      const transportReason = `بدل مواصلات - ${targetBus.route} (${targetBus.plateNumber})`;

      for (const p of allPassengers) {
        const existingDiscount = await prisma.employeeSalaryDiscount.findFirst({
          where: {
            employeeId: p.employeeId,
            reason: transportReason,
          },
        });

        if (existingDiscount) {
          await prisma.employeeSalaryDiscount.update({
            where: { id: existingDiscount.id },
            data: { amount: costPerEmployee },
          });
          console.log(`      ✏️  Updated discount for ${p.employeeId}: ${costPerEmployee}`);
        } else {
          await prisma.employeeSalaryDiscount.create({
            data: {
              employeeId: p.employeeId,
              reason: transportReason,
              amount: costPerEmployee,
              periodMonth: dateToUse.getMonth() + 1,
              periodYear: dateToUse.getFullYear(),
            },
          });
          console.log(`      ➕ Created discount for ${p.employeeId}: ${costPerEmployee}`);
        }
      }

      console.log('\n' + '═'.repeat(60));
      console.log('\n✅ REASSIGNMENT COMPLETE!\n');
      console.log(`   Employee: ${employee.name} (${employee.employeeId})`);
      console.log(`   New Bus: ${targetBus.route} (${targetBus.plateNumber})`);
      console.log(`   Date: ${dateToUse.toISOString().split('T')[0]}`);
      console.log(`   Monthly Cost: ${costPerEmployee} SYP`);
      console.log('\n' + '═'.repeat(60));

    } catch (error) {
      console.error('❌ Failed to add employee to target bus:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ REMOVAL COMPLETE!\n');
    console.log('   Employee removed from all buses.');
    console.log('   No target bus specified - employee is now unsubscribed.');
    console.log('\n' + '═'.repeat(60));
  }
}

// Parse command line arguments
const employeeId = process.argv[2];
const targetBusId = process.argv[3] || null;
const subscriptionDate = process.argv[4] || null;

if (!employeeId) {
  console.error('❌ Usage:');
  console.error('   Remove only: node scripts/reassign-employee-bus.js <employeeId>');
  console.error('   Remove & Add: node scripts/reassign-employee-bus.js <employeeId> <targetBusId> [subscriptionDate]');
  console.error('');
  console.error('   Examples:');
  console.error('     node scripts/reassign-employee-bus.js EMP001');
  console.error('     node scripts/reassign-employee-bus.js EMP001 bus-uuid-123');
  console.error('     node scripts/reassign-employee-bus.js EMP001 bus-uuid-123 2026-06-24');
  process.exit(1);
}

reassignEmployeeBus(employeeId, targetBusId, subscriptionDate)
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
