import { PrismaClient, Role, CustomerStatus, ChallanStatus, StockMovementType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const password = await bcrypt.hash('password123', 10);

  const usersData = [
    { email: 'admin@test.com', name: 'Admin User', role: Role.ADMIN },
    { email: 'sales@test.com', name: 'Rahul Sharma', role: Role.SALES },
    { email: 'warehouse@test.com', name: 'Vikram Singh', role: Role.WAREHOUSE },
    { email: 'accounts@test.com', name: 'Priya Patel', role: Role.ACCOUNTS },
  ];

  const users: Record<string, string> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password },
    });
    users[u.role] = user.id;
    console.log(`  user: ${u.email} (${u.role})`);
  }

  const customers = [
    {
      name: 'Sunil Traders',
      mobile: '9822001234',
      email: 'sunil@suniltraders.in',
      businessName: 'Sunil Traders',
      gstNumber: '27AABCU9603R1ZM',
      type: 'Wholesale',
      address: '12, Mahatma Gandhi Road, Mumbai, Maharashtra',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: 'Prefers bulk orders on Monday.',
    },
    {
      name: 'Meera Enterprises',
      mobile: '9876543210',
      email: 'meera@meeraent.com',
      businessName: 'Meera Enterprises',
      gstNumber: '29AAAFM1234F1Z5',
      type: 'Distributor',
      address: '45, Brigade Road, Bengaluru, Karnataka',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      notes: 'Payment terms 30 days.',
    },
    {
      name: 'Arjun Retail Store',
      mobile: '9123456780',
      email: 'arjun@arjunretail.in',
      businessName: 'Arjun Retail Store',
      type: 'Retail',
      address: '8, Linking Road, Bandra West, Mumbai',
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: 'Initial meeting done. Waiting for price list.',
    },
    {
      name: 'Kavita Agencies',
      mobile: '9988776655',
      email: 'kavita@kavitaagencies.com',
      businessName: 'Kavita Agencies',
      gstNumber: '24AAACK1234P1Z8',
      type: 'Wholesale',
      address: '22, CG Road, Ahmedabad, Gujarat',
      status: CustomerStatus.ACTIVE,
      notes: 'Regular monthly orders.',
    },
    {
      name: 'Deepak Distributors',
      mobile: '9012345678',
      email: 'deepak@deepakdist.in',
      businessName: 'Deepak Distributors',
      type: 'Distributor',
      address: '3, Park Street, Kolkata, West Bengal',
      status: CustomerStatus.INACTIVE,
      notes: 'Paused orders for the season.',
    },
  ];

  const customerIds: Record<string, string> = {};
  for (const c of customers) {
    const existing = await prisma.customer.findFirst({
      where: { email: c.email },
    });
    const customer = existing
      ? await prisma.customer.update({
          where: { id: existing.id },
          data: c,
        })
      : await prisma.customer.create({ data: c });
    customerIds[c.name] = customer.id;
  }

  const products = [
    {
      name: 'LED Bulb 9W',
      sku: 'LED-9W-001',
      category: 'Lighting',
      unitPrice: 85,
      currentStock: 500,
      minStockAlert: 100,
      location: 'Warehouse A - Rack 1',
    },
    {
      name: 'LED Tube Light 20W',
      sku: 'LTL-20W-002',
      category: 'Lighting',
      unitPrice: 220,
      currentStock: 180,
      minStockAlert: 60,
      location: 'Warehouse A - Rack 1',
    },
    {
      name: 'Ceiling Fan 1200mm',
      sku: 'FAN-1200-003',
      category: 'Electrical',
      unitPrice: 1450,
      currentStock: 75,
      minStockAlert: 40,
      location: 'Warehouse B - Rack 3',
    },
    {
      name: 'Extension Board 6-Way',
      sku: 'EXT-6W-004',
      category: 'Electrical',
      unitPrice: 320,
      currentStock: 25,
      minStockAlert: 50,
      location: 'Warehouse B - Rack 2',
    },
    {
      name: 'Copper Wire 1.5mm (90m)',
      sku: 'WIR-1.5-005',
      category: 'Wiring',
      unitPrice: 1150,
      currentStock: 120,
      minStockAlert: 30,
      location: 'Warehouse C - Rack 1',
    },
    {
      name: 'MCB 32A Single Pole',
      sku: 'MCB-32-006',
      category: 'Switchgear',
      unitPrice: 190,
      currentStock: 40,
      minStockAlert: 80,
      location: 'Warehouse B - Rack 5',
    },
  ];

  const productIds: Record<string, string> = {};
  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data: p })
      : await prisma.product.create({ data: p });
    productIds[p.sku] = product.id;
  }

  const movementCount = await prisma.stockMovement.count();
  if (movementCount === 0) {
    await prisma.stockMovement.createMany({
      data: products.map((p) => ({
        productId: productIds[p.sku],
        quantityChanged: p.currentStock,
        movementType: StockMovementType.IN,
        reason: 'Initial stock (seed data)',
        createdBy: users[Role.WAREHOUSE],
      })),
    });
  }

  const followUpCount = await prisma.followUp.count();
  if (followUpCount === 0) {
    await prisma.followUp.createMany({
      data: [
        {
          customerId: customerIds['Sunil Traders'],
          note: 'Sent updated price list for LED range.',
          nextFollowDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          createdBy: users[Role.SALES],
        },
        {
          customerId: customerIds['Meera Enterprises'],
          note: 'Discussed monthly distributor discount.',
          nextFollowDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          createdBy: users[Role.SALES],
        },
        {
          customerId: customerIds['Arjun Retail Store'],
          note: 'Shared catalog. Call back next week.',
          nextFollowDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: users[Role.SALES],
        },
      ],
    });
  }

  const challanCount = await prisma.challan.count();
  if (challanCount === 0) {
    const snapshot = [
      {
        id: productIds['LED-9W-001'],
        name: 'LED Bulb 9W',
        sku: 'LED-9W-001',
        category: 'Lighting',
        unitPrice: 85,
        currentStock: 500,
        location: 'Warehouse A - Rack 1',
      },
      {
        id: productIds['FAN-1200-003'],
        name: 'Ceiling Fan 1200mm',
        sku: 'FAN-1200-003',
        category: 'Electrical',
        unitPrice: 1450,
        currentStock: 75,
        location: 'Warehouse B - Rack 3',
      },
    ];

    const challan = await prisma.challan.create({
      data: {
        challanNumber: 'CH-1001',
        customerId: customerIds['Sunil Traders'],
        status: ChallanStatus.CONFIRMED,
        totalQuantity: 30,
        createdBy: users[Role.SALES],
        productSnapshot: snapshot,
        items: {
          create: [
            {
              productId: productIds['LED-9W-001'],
              quantity: 20,
              price: 85,
            },
            {
              productId: productIds['FAN-1200-003'],
              quantity: 10,
              price: 1450,
            },
          ],
        },
      },
    });

    await prisma.stockMovement.createMany({
      data: [
        {
          productId: productIds['LED-9W-001'],
          quantityChanged: 20,
          movementType: StockMovementType.OUT,
          reason: `Challan ${challan.challanNumber} confirmed`,
          createdBy: users[Role.WAREHOUSE],
        },
        {
          productId: productIds['FAN-1200-003'],
          quantityChanged: 10,
          movementType: StockMovementType.OUT,
          reason: `Challan ${challan.challanNumber} confirmed`,
          createdBy: users[Role.WAREHOUSE],
        },
      ],
    });

    await prisma.product.update({
      where: { id: productIds['LED-9W-001'] },
      data: { currentStock: { decrement: 20 } },
    });
    await prisma.product.update({
      where: { id: productIds['FAN-1200-003'] },
      data: { currentStock: { decrement: 10 } },
    });
  }

  console.log('Seed complete.');
  console.log('\nTest credentials (password: password123):');
  console.log('  admin@test.com      (Admin)');
  console.log('  sales@test.com      (Sales)');
  console.log('  warehouse@test.com  (Warehouse)');
  console.log('  accounts@test.com   (Accounts)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
