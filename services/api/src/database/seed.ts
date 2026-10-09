import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { createCipheriv, createHash, randomBytes } from 'crypto';

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/xiii_marketplace?replicaSet=rs0';
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const now = new Date();
  const passwordHash = await bcrypt.hash('Xiii12345!', 12);
  const collections = [
    'addresses', 'sellerapplications', 'shops', 'categories', 'brands',
    'products', 'productvariants', 'inventories', 'inventorytransactions', 'productreviews', 'vouchers', 'voucherusages', 'promotioncampaigns',
    'conversations', 'chatmessages', 'notifications', 'analyticsevents', 'sellerledgerentries', 'sellerpayoutaccounts', 'withdrawalrequests', 'financesettings', 'homebanners', 'homesections', 'shopmembers', 'adminaccesses', 'auditlogs', 'marketplacesettings'
  ];
  for (const name of collections) await db.collection(name).deleteMany({ seedTag: 'phase1-demo' });

  const users = db.collection('users');
  const admin = await users.findOneAndUpdate(
    { email: 'admin@xiii.local' },
    { $set: { email: 'admin@xiii.local', fullName: 'XIII Admin', passwordHash, roles: ['BUYER', 'ADMIN', 'SUPER_ADMIN'], status: 'ACTIVE', emailVerified: true, phoneVerified: false, seedTag: 'phase1-demo', createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' }
  );
  const seller = await users.findOneAndUpdate(
    { email: 'seller@xiii.local' },
    { $set: { email: 'seller@xiii.local', phone: '0900000001', fullName: 'Demo Seller', passwordHash, roles: ['BUYER', 'SELLER'], status: 'ACTIVE', emailVerified: true, phoneVerified: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' }
  );
  const buyer = await users.findOneAndUpdate(
    { email: 'buyer@xiii.local' },
    { $set: { email: 'buyer@xiii.local', phone: '0900000002', fullName: 'Demo Buyer', passwordHash, roles: ['BUYER'], status: 'ACTIVE', emailVerified: true, phoneVerified: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' }
  );
  const manager = await users.findOneAndUpdate(
    { email: 'manager@xiii.local' },
    { $set: { email: 'manager@xiii.local', phone: '0900000003', fullName: 'XIII Shop Manager', passwordHash, roles: ['BUYER','SELLER'], status: 'ACTIVE', emailVerified: true, phoneVerified: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' }
  );
  const staff = await users.findOneAndUpdate(
    { email: 'staff@xiii.local' },
    { $set: { email: 'staff@xiii.local', phone: '0900000004', fullName: 'XIII Fulfilment Staff', passwordHash, roles: ['BUYER','SELLER'], status: 'ACTIVE', emailVerified: true, phoneVerified: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' }
  );
  const opsAdmin = await users.findOneAndUpdate(
    { email: 'ops@xiii.local' },
    { $set: { email: 'ops@xiii.local', fullName: 'XIII Operations Admin', passwordHash, roles: ['BUYER','ADMIN'], status: 'ACTIVE', emailVerified: true, phoneVerified: false, seedTag: 'phase1-demo', createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' }
  );
  const applicant = await users.findOneAndUpdate(
    { email: 'applicant@xiii.local' },
    { $set: { email: 'applicant@xiii.local', phone: '0900000005', fullName: 'Demo Seller Applicant', passwordHash, roles: ['BUYER'], status: 'ACTIVE', emailVerified: true, phoneVerified: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' }
  );
  const blockedUser = await users.findOneAndUpdate(
    { email: 'blocked@xiii.local' },
    { $set: { email: 'blocked@xiii.local', fullName: 'Demo Blocked User', passwordHash, roles: ['BUYER'], status: 'BLOCKED', emailVerified: false, phoneVerified: false, seedTag: 'phase1-demo', createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' }
  );
  if (!admin || !seller || !buyer || !manager || !staff || !opsAdmin || !applicant || !blockedUser) throw new Error('Failed to seed users');
  // Runtime carts reference variant IDs, so reset demo-user carts before rebuilding seeded catalog IDs.
  await db.collection('carts').deleteMany({ userId: { $in: [admin._id, seller._id, buyer._id] } });
  const oldConversations = await db.collection('conversations').find({ $or: [{ buyerId: { $in: [admin._id, seller._id, buyer._id] } }, { sellerId: { $in: [admin._id, seller._id, buyer._id] } }] }).project({ _id: 1 }).toArray();
  if (oldConversations.length) await db.collection('chatmessages').deleteMany({ conversationId: { $in: oldConversations.map(row => row._id) } });
  await db.collection('conversations').deleteMany({ $or: [{ buyerId: { $in: [admin._id, seller._id, buyer._id] } }, { sellerId: { $in: [admin._id, seller._id, buyer._id] } }] });
  await db.collection('notifications').deleteMany({ userId: { $in: [admin._id, seller._id, buyer._id] } });
  await db.collection('sellerledgerentries').deleteMany({ sellerId: seller._id });
  await db.collection('withdrawalrequests').deleteMany({ sellerId: seller._id });
  await db.collection('sellerpayoutaccounts').deleteMany({ sellerId: seller._id });
  // Reset demo buyer review + checkout/order state because seeded catalog IDs are rebuilt on every seed run.
  await db.collection('customerreviews').deleteMany({ buyerId: buyer._id });
  // Keep demo user IDs stable. Also repair legacy seed orders left behind by
  // versions that deleted and recreated the demo buyer before this cleanup.
  const oldOrders = await db.collection('orders').find({ $or: [{ buyerId: buyer._id }, { orderCode: 'XIII-DEMO-RETURN-001' }] }).project({ _id: 1 }).toArray();
  const oldOrderIds = oldOrders.map(row => row._id);
  if (oldOrderIds.length) {
    await db.collection('customerreviews').deleteMany({ orderId: { $in: oldOrderIds } });
    const oldReturns = await db.collection('returnrequests').find({ orderId: { $in: oldOrderIds } }).project({ _id: 1 }).toArray();
    const oldReturnIds = oldReturns.map(row => row._id);
    if (oldReturnIds.length) {
      await db.collection('refunds').deleteMany({ returnRequestId: { $in: oldReturnIds } });
      await db.collection('disputes').deleteMany({ returnRequestId: { $in: oldReturnIds } });
    }
    await db.collection('returnrequests').deleteMany({ orderId: { $in: oldOrderIds } });
    const oldPayments = await db.collection('payments').find({ orderId: { $in: oldOrderIds } }).project({ _id: 1 }).toArray();
    const oldPaymentIds = oldPayments.map(row => row._id);
    if (oldPaymentIds.length) await db.collection('paymentevents').deleteMany({ paymentId: { $in: oldPaymentIds } });
    await db.collection('payments').deleteMany({ orderId: { $in: oldOrderIds } });
    await db.collection('suborders').deleteMany({ orderId: { $in: oldOrderIds } });
    await db.collection('orderitems').deleteMany({ orderId: { $in: oldOrderIds } });
    await db.collection('orderstatushistories').deleteMany({ orderId: { $in: oldOrderIds } });
    await db.collection('voucherusages').deleteMany({ orderId: { $in: oldOrderIds } });
    await db.collection('orders').deleteMany({ _id: { $in: oldOrderIds } });
  }
  await db.collection('inventorytransactions').deleteMany({ createdBy: buyer._id });

  const categories = db.collection('categories');
  const fashion = await categories.insertOne({ name: 'Thời trang', slug: 'thoi-trang', level: 0, sortOrder: 1, active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
  const men = await categories.insertOne({ parentId: fashion.insertedId, name: 'Thời trang nam', slug: 'thoi-trang-nam', level: 1, sortOrder: 1, active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
  const hoodies = await categories.insertOne({ parentId: men.insertedId, name: 'Áo hoodie', slug: 'ao-hoodie', image: '/products/hoodie-gray.svg', level: 2, sortOrder: 1, active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
  const tees = await categories.insertOne({ parentId: men.insertedId, name: 'Áo thun', slug: 'ao-thun', image: '/products/tee-black.svg', level: 2, sortOrder: 2, active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
  const pants = await categories.insertOne({ parentId: men.insertedId, name: 'Quần', slug: 'quan', image: '/products/cargo-black.svg', level: 2, sortOrder: 3, active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
  const shoes = await categories.insertOne({ parentId: men.insertedId, name: 'Giày', slug: 'giay', image: '/products/sneaker.svg', level: 2, sortOrder: 4, active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
  const accessories = await categories.insertOne({ parentId: men.insertedId, name: 'Phụ kiện', slug: 'phu-kien', image: '/products/bag.svg', level: 2, sortOrder: 5, active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });

  const brands = db.collection('brands');
  const brand = await brands.insertOne({ name: 'XIII Official', slug: 'xiii-official', logo: '', description: 'Demo streetwear brand', verified: true, active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });

  const shops = db.collection('shops');
  const shopResult = await shops.insertOne({
    ownerId: seller._id, name: 'XIII Official', slug: 'xiii-official', logo: '', banner: '', description: 'Simple but different.',
    businessCategories: [men.insertedId], address: { addressLine: '13 Demo Street', ward: 'Lạch Tray', district: 'Ngô Quyền', province: 'Hải Phòng' }, contactEmail: 'seller@xiii.local', contactPhone: '0900000001', orderPreparationDays: 2, returnPolicy: 'Chấp nhận yêu cầu trả hàng hợp lệ trong 7 ngày theo chính sách marketplace.', ratingAverage: 4.9, ratingCount: 1200,
    followerCount: 12500, productCount: 9, responseRate: 98, status: 'ACTIVE', verified: true,
    seedTag: 'phase1-demo', createdAt: now, updatedAt: now
  });
  const shopId = shopResult.insertedId;

  const allShopPermissions = ['SHOP_VIEW','SHOP_SETTINGS','TEAM_MANAGE','PRODUCT_READ','PRODUCT_WRITE','INVENTORY_READ','INVENTORY_WRITE','ORDER_READ','ORDER_FULFILL','PROMOTION_MANAGE','CHAT_REPLY','REVIEW_REPLY','RETURN_MANAGE','ANALYTICS_VIEW','FINANCE_VIEW','FINANCE_WITHDRAW'];
  await db.collection('shopmembers').insertMany([
    { shopId, userId: seller._id, role: 'OWNER', permissions: allShopPermissions, status: 'ACTIVE', joinedAt: now, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { shopId, userId: manager._id, role: 'MANAGER', permissions: allShopPermissions.filter(p => p !== 'FINANCE_WITHDRAW'), status: 'ACTIVE', invitedBy: seller._id, joinedAt: now, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { shopId, userId: staff._id, role: 'STAFF', permissions: ['SHOP_VIEW','PRODUCT_READ','INVENTORY_READ','ORDER_READ','ORDER_FULFILL','CHAT_REPLY','REVIEW_REPLY','RETURN_MANAGE'], status: 'ACTIVE', invitedBy: seller._id, joinedAt: now, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
  ]);
  await db.collection('adminaccesses').insertOne({
    userId: opsAdmin._id,
    permissions: ['DASHBOARD_VIEW','PRODUCTS_MODERATE','SELLERS_MANAGE','RETURNS_MANAGE','REVIEWS_MODERATE','ANALYTICS_VIEW','ORDERS_MANAGE','PAYMENTS_MANAGE'],
    status: 'ACTIVE', updatedBy: admin._id, seedTag: 'phase1-demo', createdAt: now, updatedAt: now,
  });

  await db.collection('marketplacesettings').updateOne({key:'marketplace'},{$set:{ key:'marketplace', standardShippingFee:25000, expressShippingFee:45000, paymentExpiresMinutes:15, codEnabled:true, momoEnabled:true, vnpayEnabled:true, updatedBy:admin._id, seedTag:'phase1-demo', updatedAt:now },$setOnInsert:{createdAt:now}},{upsert:true});

  await db.collection('sellerapplications').insertOne({
    userId: seller._id, sellerType: 'INDIVIDUAL', shopName: 'XIII Official', identityType: 'CCCD', identityNumber: 'DEMO-CCCD',
    identityFrontImage: 'https://example.invalid/front.jpg', identityBackImage: 'https://example.invalid/back.jpg', selfieImage: 'https://example.invalid/selfie.jpg',
    address: { province: 'Hải Phòng' }, status: 'APPROVED', submittedAt: now, reviewedAt: now, reviewedBy: admin._id,
    seedTag: 'phase1-demo', createdAt: now, updatedAt: now
  });
  await db.collection('sellerapplications').insertOne({
    userId: applicant._id, sellerType: 'INDIVIDUAL', shopName: '404 Street Lab', identityType: 'CCCD', identityNumber: '031204000404',
    identityFrontImage: 'http://localhost:3000/fallback.svg', identityBackImage: 'http://localhost:3000/fallback.svg', selfieImage: 'http://localhost:3000/fallback.svg',
    address: { addressLine: '404 Demo Street', ward: 'Phường Demo', district: 'Quận Demo', province: 'Hải Phòng' }, status: 'PENDING', submittedAt: new Date(now.getTime()-2*60*60*1000),
    seedTag: 'phase1-demo', createdAt: now, updatedAt: now
  });

  const productSeed = [
    { categoryId: tees.insertedId, name: 'XIII Basic Tee - Black', slug: 'xiii-basic-tee-black', shortDescription: 'Áo thun basic form rộng.', description: 'Heavy cotton, dropped shoulder, relaxed unisex fit.', image: '/products/tee-black.svg', price: 279000, compareAtPrice: 350000, sku: 'XIII-TEE-BLK-M', attrs: { color: 'Black', size: 'M' }, ratingAverage: 4.8, ratingCount: 1200, soldCount: 3400, viewCount: 10000, weight: 250, available: 120 },
    { categoryId: hoodies.insertedId, name: 'XIII Hoodie - Gray', slug: 'xiii-hoodie-gray', shortDescription: 'Hoodie streetwear màu xám.', description: 'Hoodie nỉ dày, form rộng.', image: '/products/hoodie-gray.svg', price: 499000, compareAtPrice: 620000, sku: 'XIII-HOOD-GRY-M', attrs: { color: 'Gray', size: 'M' }, ratingAverage: 4.9, ratingCount: 856, soldCount: 2100, viewCount: 8200, weight: 600, available: 85 },
    { categoryId: pants.insertedId, name: 'Cargo Pants - Black', slug: 'cargo-pants-black', shortDescription: 'Cargo form suông, nhiều túi.', description: 'Quần cargo vải dày, form relaxed, phong cách utility.', image: '/products/cargo-black.svg', price: 420000, compareAtPrice: 520000, sku: 'XIII-CARGO-BLK-L', attrs: { color: 'Black', size: 'L' }, ratingAverage: 4.7, ratingCount: 832, soldCount: 3100, viewCount: 7600, weight: 520, available: 66 },
    { categoryId: shoes.insertedId, name: 'XIII Sneaker 01', slug: 'xiii-sneaker-01', shortDescription: 'Sneaker low-top phối monochrome.', description: 'Đế cao su, upper synthetic leather, phối màu streetwear.', image: '/products/sneaker.svg', price: 650000, compareAtPrice: 740000, sku: 'XIII-SNK-01-41', attrs: { color: 'White', size: '41' }, ratingAverage: 4.8, ratingCount: 421, soldCount: 890, viewCount: 5400, weight: 850, available: 32 },
    { categoryId: accessories.insertedId, name: 'XIII Cap - Black', slug: 'xiii-cap-black', shortDescription: 'Mũ lưỡi trai logo XIII.', description: 'Mũ cotton twill, form 6-panel, khoá tăng chỉnh.', image: '/products/cap.svg', price: 220000, compareAtPrice: 280000, sku: 'XIII-CAP-BLK', attrs: { color: 'Black', size: 'Free' }, ratingAverage: 4.8, ratingCount: 390, soldCount: 1800, viewCount: 6000, weight: 180, available: 120 },
    { categoryId: accessories.insertedId, name: 'XIII Crossbody Bag', slug: 'xiii-crossbody-bag', shortDescription: 'Túi đeo chéo nhỏ gọn.', description: 'Nylon chống bám nhẹ, nhiều ngăn, dây tăng chỉnh.', image: '/products/bag.svg', price: 299000, compareAtPrice: 380000, sku: 'XIII-BAG-BLK', attrs: { color: 'Black', size: 'Free' }, ratingAverage: 4.7, ratingCount: 268, soldCount: 720, viewCount: 4300, weight: 320, available: 44 },
    { categoryId: accessories.insertedId, name: 'Silver Chain XIII', slug: 'silver-chain-xiii', shortDescription: 'Dây chuyền kim loại tối giản.', description: 'Phụ kiện unisex, bề mặt bạc mờ, logo XIII.', image: '/products/chain.svg', price: 219000, compareAtPrice: 290000, sku: 'XIII-CHAIN-SLV', attrs: { color: 'Silver', size: 'Free' }, ratingAverage: 4.8, ratingCount: 154, soldCount: 520, viewCount: 3100, weight: 90, available: 80 },
    { categoryId: hoodies.insertedId, name: 'Graphic Sweatshirt 404', slug: 'graphic-sweatshirt-404', shortDescription: 'Sweatshirt graphic oversize.', description: 'Nỉ da cá, vai rơi, graphic mặt trước.', image: '/products/sweatshirt.svg', price: 419000, compareAtPrice: 560000, sku: 'XIII-SWT-404-M', attrs: { color: 'Black', size: 'M' }, ratingAverage: 4.9, ratingCount: 376, soldCount: 910, viewCount: 5200, weight: 550, available: 58 },
  ];

  const products = db.collection('products');
  const variants = db.collection('productvariants');
  const inventories = db.collection('inventories');
  for (const item of productSeed) {
    const p = await products.insertOne({
      shopId, categoryId: item.categoryId, brandId: brand.insertedId, name: item.name, slug: item.slug,
      shortDescription: item.shortDescription, description: item.description, images: [item.image],
      attributes: { material: 'Streetwear', fit: 'Oversized', gender: 'Unisex' }, status: 'ACTIVE',
      ratingAverage: item.ratingAverage, ratingCount: item.ratingCount, soldCount: item.soldCount, viewCount: item.viewCount,
      seedTag: 'phase1-demo', createdAt: now, updatedAt: now
    });
    const v = await variants.insertOne({
      productId: p.insertedId, shopId, sku: item.sku, attributes: item.attrs, price: item.price,
      compareAtPrice: item.compareAtPrice, weight: item.weight, image: item.image, status: 'ACTIVE',
      seedTag: 'phase1-demo', createdAt: now, updatedAt: now
    });
    await inventories.insertOne({ variantId: v.insertedId, shopId, available: item.available, reserved: 0, sold: item.soldCount, lowStockThreshold: 5, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });

    const extraVariants = item.slug === 'xiii-basic-tee-black' ? [
      { sku: 'XIII-TEE-BLK-S', attrs: { color: 'Black', size: 'S' }, price: 279000, compareAtPrice: 350000, available: 42 },
      { sku: 'XIII-TEE-BLK-L', attrs: { color: 'Black', size: 'L' }, price: 289000, compareAtPrice: 350000, available: 18 },
      { sku: 'XIII-TEE-BONE-M', attrs: { color: 'Bone', size: 'M' }, price: 279000, compareAtPrice: 350000, available: 27 },
      { sku: 'XIII-TEE-BONE-L', attrs: { color: 'Bone', size: 'L' }, price: 289000, compareAtPrice: 350000, available: 11 },
    ] : item.slug === 'xiii-hoodie-gray' ? [
      { sku: 'XIII-HOOD-GRY-L', attrs: { color: 'Gray', size: 'L' }, price: 519000, compareAtPrice: 620000, available: 22 },
      { sku: 'XIII-HOOD-BLK-M', attrs: { color: 'Black', size: 'M' }, price: 499000, compareAtPrice: 620000, available: 31 },
      { sku: 'XIII-HOOD-BLK-L', attrs: { color: 'Black', size: 'L' }, price: 519000, compareAtPrice: 620000, available: 16 },
    ] : [];

    for (const extra of extraVariants) {
      const ev = await variants.insertOne({
        productId: p.insertedId, shopId, sku: extra.sku, attributes: extra.attrs, price: extra.price,
        compareAtPrice: extra.compareAtPrice, weight: item.weight, image: item.image, status: 'ACTIVE',
        seedTag: 'phase1-demo', createdAt: now, updatedAt: now
      });
      await inventories.insertOne({ variantId: ev.insertedId, shopId, available: extra.available, reserved: 0, sold: Math.floor(item.soldCount / 4), lowStockThreshold: 5, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
    }
  }

  // Seed product-view analytics across the last 30 days so Seller/Admin charts have real time-series data immediately after seeding.
  const activeProductsForAnalytics = await products.find({ shopId, status: 'ACTIVE' }).project({ _id: 1 }).toArray();
  const analyticsEvents: any[] = [];
  for (let day = 29; day >= 0; day--) {
    const eventDay = new Date(now.getTime() - day * 86400000);
    const dailyViews = 5 + ((29 - day) % 8);
    for (let i = 0; i < dailyViews; i++) {
      const product = activeProductsForAnalytics[(day + i) % activeProductsForAnalytics.length];
      analyticsEvents.push({ type: 'PRODUCT_VIEW', shopId, productId: product._id, metadata: { source: 'SEED_PRODUCT_DETAIL' }, seedTag: 'phase1-demo', createdAt: new Date(eventDay.getTime() - (i + 1) * 1800000), updatedAt: new Date(eventDay.getTime() - (i + 1) * 1800000) });
    }
  }
  if (analyticsEvents.length) await db.collection('analyticsevents').insertMany(analyticsEvents);

  // Seed one completed COD order so the Return / Refund flow can be tested immediately after seeding.
  const returnProduct = await products.findOne({ slug: 'xiii-basic-tee-black' });
  if (!returnProduct) throw new Error('Return demo product missing');
  const returnVariant = await variants.findOne({ productId: returnProduct._id, sku: 'XIII-TEE-BLK-M' });
  if (!returnVariant) throw new Error('Return demo variant missing');
  const completedAt = new Date(now.getTime() - 2 * 86400000);
  const deliveredAt = new Date(completedAt.getTime() - 2 * 3600000);
  const orderId = new mongoose.Types.ObjectId();
  const subOrderId = new mongoose.Types.ObjectId();
  await db.collection('orders').insertOne({
    _id: orderId, orderCode: 'XIII-DEMO-RETURN-001', buyerId: buyer._id,
    shippingAddress: { recipientName: 'Demo Buyer', phone: '0900000002', province: 'Hà Nội', district: 'Đống Đa', ward: 'Láng Thượng', addressLine: '123 Đê La Thành' },
    shippingMethod: 'STANDARD', subtotal: 279000, shippingFee: 25000, discountAmount: 0, platformDiscount: 0, totalAmount: 304000,
    paymentMethod: 'COD', paymentStatus: 'SUCCESS', refundedAmount: 0, status: 'COMPLETED', completedAt,
    createdAt: new Date(completedAt.getTime() - 4 * 86400000), updatedAt: completedAt,
  });
  await db.collection('suborders').insertOne({
    _id: subOrderId, orderId, shopId, sellerId: seller._id, subOrderCode: 'XIII-SUB-RETURN-001', subtotal: 279000, shopDiscount: 0,
    shippingFee: 25000, platformFee: 13950, sellerRevenue: 265050, status: 'COMPLETED', shippingProvider: 'GHN', trackingCode: 'GHN-DEMO-RETURN-001',
    confirmedAt: new Date(completedAt.getTime() - 3 * 86400000), packingAt: new Date(completedAt.getTime() - 3 * 86400000 + 3600000),
    readyToShipAt: new Date(completedAt.getTime() - 3 * 86400000 + 2 * 3600000), shippedAt: new Date(completedAt.getTime() - 2.5 * 86400000), deliveredAt,
    createdAt: new Date(completedAt.getTime() - 4 * 86400000), updatedAt: completedAt,
  });
  await db.collection('orderitems').insertOne({
    orderId, subOrderId, productId: returnProduct._id, variantId: returnVariant._id, shopId, productName: returnProduct.name,
    variantSnapshot: { sku: returnVariant.sku, attributes: returnVariant.attributes }, image: returnVariant.image || '/products/tee-black.svg', quantity: 1,
    unitPrice: 279000, totalPrice: 279000, createdAt: new Date(completedAt.getTime() - 4 * 86400000), updatedAt: completedAt,
  });
  await db.collection('orderstatushistories').insertMany([
    { orderId, fromStatus: 'DELIVERED', toStatus: 'COMPLETED', changedBy: buyer._id, note: 'Seed demo: buyer confirmed receipt', createdAt: completedAt, updatedAt: completedAt },
    { orderId, subOrderId, fromStatus: 'DELIVERED', toStatus: 'COMPLETED', changedBy: buyer._id, note: 'Seed demo: buyer confirmed receipt', createdAt: completedAt, updatedAt: completedAt },
  ]);

  // Finance demo: pending settlement from the completed order + an older available balance so withdrawal can be tested.
  const settlementAt = new Date(completedAt.getTime() + 7 * 86400000);
  await db.collection('financesettings').updateOne({ key: 'marketplace' }, { $set: { key: 'marketplace', commissionRateBps: 500, settlementDelayDays: 7, minWithdrawalAmount: 100000, maxWithdrawalAmount: 100000000, updatedBy: admin._id, seedTag: 'phase1-demo', createdAt: now, updatedAt: now } }, { upsert: true });
  await db.collection('sellerledgerentries').insertMany([
    { ledgerCode: 'LED-DEMO-SALE-001', idempotencyKey: `SALE_GROSS:${subOrderId.toString()}`, sellerId: seller._id, shopId, type: 'SALE_GROSS', amount: 279000, currency: 'VND', status: 'PENDING', availableAt: settlementAt, orderId, subOrderId, referenceCode: 'XIII-SUB-RETURN-001', description: 'Doanh thu gộp XIII-SUB-RETURN-001', metadata: { orderCode: 'XIII-DEMO-RETURN-001' }, seedTag: 'phase1-demo', createdAt: completedAt, updatedAt: completedAt },
    { ledgerCode: 'LED-DEMO-FEE-001', idempotencyKey: `PLATFORM_FEE:${subOrderId.toString()}`, sellerId: seller._id, shopId, type: 'PLATFORM_FEE', amount: -13950, currency: 'VND', status: 'PENDING', availableAt: settlementAt, orderId, subOrderId, referenceCode: 'XIII-SUB-RETURN-001', description: 'Phí nền tảng XIII-SUB-RETURN-001', metadata: { commissionRateBps: 500, orderCode: 'XIII-DEMO-RETURN-001' }, seedTag: 'phase1-demo', createdAt: completedAt, updatedAt: completedAt },
    { ledgerCode: 'LED-DEMO-OPENING-001', idempotencyKey: 'SEED:OPENING_BALANCE', sellerId: seller._id, shopId, type: 'ADJUSTMENT', amount: 650000, currency: 'VND', status: 'AVAILABLE', availableAt: new Date(now.getTime() - 15 * 86400000), settledAt: new Date(now.getTime() - 15 * 86400000), referenceCode: 'DEMO-OPENING', description: 'Số dư lịch sử demo để test withdrawal', metadata: { seed: true }, seedTag: 'phase1-demo', createdAt: new Date(now.getTime() - 15 * 86400000), updatedAt: new Date(now.getTime() - 15 * 86400000) },
  ]);
  const payoutKey = createHash('sha256').update(process.env.PAYOUT_ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET || 'xiii-dev-payout-key-change-me').digest();
  const payoutIv = randomBytes(12); const payoutCipher = createCipheriv('aes-256-gcm', payoutKey, payoutIv); const demoAccountNumber = '0123456789';
  const payoutCiphertext = Buffer.concat([payoutCipher.update(demoAccountNumber, 'utf8'), payoutCipher.final()]);
  const payoutAccountId = new mongoose.Types.ObjectId();
  await db.collection('sellerpayoutaccounts').insertOne({ _id: payoutAccountId, sellerId: seller._id, shopId, bankCode: 'MB', bankName: 'MB Bank', accountName: 'DEMO SELLER', accountNumberCiphertext: payoutCiphertext.toString('base64'), accountNumberIv: payoutIv.toString('base64'), accountNumberTag: payoutCipher.getAuthTag().toString('base64'), accountNumberLast4: demoAccountNumber.slice(-4), status: 'ACTIVE', seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
  await db.collection('withdrawalrequests').insertOne({ withdrawalCode: 'WD-DEMO-001', sellerId: seller._id, shopId, payoutAccountId, amount: 150000, currency: 'VND', status: 'REQUESTED', payoutSnapshot: { bankCode: 'MB', bankName: 'MB Bank', accountName: 'DEMO SELLER', accountNumberLast4: '6789', accountNumberCiphertext: payoutCiphertext.toString('base64'), accountNumberIv: payoutIv.toString('base64'), accountNumberTag: payoutCipher.getAuthTag().toString('base64') }, sellerNote: 'Seed demo withdrawal', adminNote: '', rejectionReason: '', externalReference: '', seedTag: 'phase1-demo', createdAt: new Date(now.getTime() - 45 * 60000), updatedAt: new Date(now.getTime() - 45 * 60000) });

  // Seed one buyer ↔ seller conversation and unread notification for realtime UI testing.
  const conversationId = new mongoose.Types.ObjectId();
  const chatStartedAt = new Date(now.getTime() - 35 * 60000);
  await db.collection('conversations').insertOne({
    _id: conversationId, buyerId: buyer._id, shopId, sellerId: seller._id, productId: returnProduct._id, orderId,
    lastMessage: 'Shop đã kiểm tra, size M vẫn còn hàng nhé.', lastMessageAt: new Date(now.getTime() - 8 * 60000),
    buyerUnread: 1, sellerUnread: 0, status: 'ACTIVE', seedTag: 'phase1-demo', createdAt: chatStartedAt, updatedAt: new Date(now.getTime() - 8 * 60000),
  });
  await db.collection('chatmessages').insertMany([
    { conversationId, senderId: buyer._id, senderRole: 'BUYER', type: 'PRODUCT', text: 'Shop ơi áo này form oversize đúng không?', attachments: [], productId: returnProduct._id, readAt: new Date(now.getTime() - 20 * 60000), seedTag: 'phase1-demo', createdAt: chatStartedAt, updatedAt: chatStartedAt },
    { conversationId, senderId: seller._id, senderRole: 'SELLER', type: 'TEXT', text: 'Đúng rồi bạn, form rộng. Shop đã kiểm tra, size M vẫn còn hàng nhé.', attachments: [], readAt: null, seedTag: 'phase1-demo', createdAt: new Date(now.getTime() - 8 * 60000), updatedAt: new Date(now.getTime() - 8 * 60000) },
  ]);
  await db.collection('notifications').insertMany([
    { userId: buyer._id, type: 'CHAT_MESSAGE', title: 'Shop vừa nhắn tin', body: 'Shop đã kiểm tra, size M vẫn còn hàng nhé.', data: { conversationId: conversationId.toString(), shopId: shopId.toString() }, readAt: null, seedTag: 'phase1-demo', createdAt: new Date(now.getTime() - 8 * 60000), updatedAt: new Date(now.getTime() - 8 * 60000) },
    { userId: seller._id, type: 'ORDER_CREATED', title: 'Đơn demo đã hoàn tất', body: 'XIII-SUB-RETURN-001 · dữ liệu seed để test notification.', data: { orderCode: 'XIII-DEMO-RETURN-001', subOrderCode: 'XIII-SUB-RETURN-001' }, readAt: null, seedTag: 'phase1-demo', createdAt: new Date(now.getTime() - 90 * 60000), updatedAt: new Date(now.getTime() - 90 * 60000) },
  ]);

  // Product pending review keeps Buyer Store at 8 ACTIVE items while giving Admin a real moderation queue to test.
  const reviewSubmittedAt = new Date(now.getTime() - 3 * 3600000);
  const pendingProduct = await products.insertOne({
    shopId, categoryId: hoodies.insertedId, brandId: brand.insertedId, name: 'XIII Utility Zip Hoodie', slug: 'xiii-utility-zip-hoodie-review',
    shortDescription: 'Hoodie zip utility đang chờ kiểm duyệt.', description: 'Nỉ dày, khoá kéo kim loại, túi utility và form relaxed.',
    images: ['/products/hoodie-gray.svg'], attributes: { material: 'Cotton fleece', fit: 'Relaxed', gender: 'Unisex' },
    status: 'PENDING_REVIEW', submittedForReviewAt: reviewSubmittedAt, rejectionReason: '', ratingAverage: 0, ratingCount: 0, soldCount: 0, viewCount: 0,
    seedTag: 'phase1-demo', createdAt: reviewSubmittedAt, updatedAt: reviewSubmittedAt
  });
  const pendingVariant = await variants.insertOne({
    productId: pendingProduct.insertedId, shopId, sku: 'XIII-UZH-GRY-M', attributes: { color: 'Gray', size: 'M' }, price: 569000,
    compareAtPrice: 690000, weight: 650, image: '/products/hoodie-gray.svg', status: 'ACTIVE', seedTag: 'phase1-demo', createdAt: reviewSubmittedAt, updatedAt: reviewSubmittedAt
  });
  await inventories.insertOne({ variantId: pendingVariant.insertedId, shopId, available: 25, reserved: 0, sold: 0, lowStockThreshold: 5, seedTag: 'phase1-demo', createdAt: reviewSubmittedAt, updatedAt: reviewSubmittedAt });
  await db.collection('productreviews').insertOne({ productId: pendingProduct.insertedId, shopId, action: 'SUBMITTED', actorId: seller._id, note: 'Seller gửi sản phẩm duyệt', seedTag: 'phase1-demo', createdAt: reviewSubmittedAt });

  await db.collection('addresses').insertOne({ userId: buyer._id, recipientName: 'Demo Buyer', phone: '0900000002', province: 'Hà Nội', district: 'Đống Đa', ward: 'Láng Thượng', addressLine: '123 Đê La Thành', label: 'HOME', isDefault: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
  const hoodieProductForPromo = await products.findOne({ slug: 'xiii-hoodie-gray' });
  await db.collection('vouchers').insertMany([
    { ownerType: 'PLATFORM', name: 'XIII Platform 120K', code: 'XIII120', type: 'FIXED', value: 120000, maxDiscount: 120000, minimumSpend: 1000000, quantity: 1000, usedCount: 0, perUserLimit: 3, scope: 'ALL_PRODUCTS', productIds: [], startAt: new Date(now.getTime() - 86400000), endAt: new Date(now.getTime() + 90 * 86400000), active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { ownerType: 'PLATFORM', name: 'XIII Shipping 25K', code: 'SHIP25', type: 'FREE_SHIPPING', value: 25000, maxDiscount: 25000, minimumSpend: 299000, quantity: 1000, usedCount: 0, perUserLimit: 3, scope: 'ALL_PRODUCTS', productIds: [], startAt: new Date(now.getTime() - 86400000), endAt: new Date(now.getTime() + 90 * 86400000), active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { ownerType: 'SHOP', shopId, name: 'XIII Shop 50K', code: 'SHOP50', type: 'FIXED', value: 50000, maxDiscount: 50000, minimumSpend: 399000, quantity: 500, usedCount: 0, perUserLimit: 2, scope: 'ALL_PRODUCTS', productIds: [], startAt: new Date(now.getTime() - 86400000), endAt: new Date(now.getTime() + 30 * 86400000), active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { ownerType: 'SHOP', shopId, name: 'Tee riêng 12%', code: 'TEE12', type: 'PERCENT', value: 12, maxDiscount: 60000, minimumSpend: 200000, quantity: 300, usedCount: 0, perUserLimit: 1, scope: 'SELECTED_PRODUCTS', productIds: [returnProduct._id], startAt: new Date(now.getTime() - 86400000), endAt: new Date(now.getTime() + 30 * 86400000), active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
  ]);
  if (hoodieProductForPromo) await db.collection('promotioncampaigns').insertOne({ shopId, sellerId: seller._id, name: 'Street Week -15%', type: 'PERCENT', value: 15, maxDiscount: 90000, scope: 'SELECTED_PRODUCTS', productIds: [hoodieProductForPromo._id], startAt: new Date(now.getTime() - 3600000), endAt: new Date(now.getTime() + 7 * 86400000), active: true, seedTag: 'phase1-demo', createdAt: now, updatedAt: now });
  // CMS defaults are data, not frontend constants: Admin can edit/schedule/reorder these immediately.
  await db.collection('homebanners').insertMany([
    { key: 'hero-street', placement: 'HERO', eyebrow: 'XIII FASHION MARKETPLACE', title: 'STYLE\nYOUR OWN WAY', subtitle: 'Local brand · Streetwear · Phụ kiện · Đời sống', image: '/campaigns/hero-street.svg', mobileImage: '', href: '/search', ctaLabel: 'Mua ngay', sortOrder: 10, active: true, startAt: null, endAt: null, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { key: 'promo-local', placement: 'PROMO', eyebrow: 'LOCAL BRAND', title: 'HÀNG MỚI\nMỖI TUẦN', subtitle: '', image: '/campaigns/promo-local.svg', href: '/search?q=local', ctaLabel: 'Khám phá', sortOrder: 10, active: true, startAt: null, endAt: null, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { key: 'promo-accessories', placement: 'PROMO', eyebrow: 'PHỤ KIỆN', title: 'ĐỒ NHỎ\nCHẤT LỚN', subtitle: '', image: '/campaigns/promo-accessories.svg', href: '/search?q=phụ kiện', ctaLabel: 'Xem ngay', sortOrder: 20, active: true, startAt: null, endAt: null, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { key: 'promo-sale', placement: 'PROMO', eyebrow: 'SALE', title: 'GIẢM ĐẾN\n50%', subtitle: '', image: '/campaigns/promo-sale.svg', href: '/search?q=sale', ctaLabel: 'Săn deal', sortOrder: 30, active: true, startAt: null, endAt: null, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { key: 'editorial-fw', placement: 'EDITORIAL', eyebrow: 'BỘ SƯU TẬP MỚI', title: 'FALL / WINTER', subtitle: '', image: '/campaigns/editorial-dark.svg', href: '/search?q=collection', ctaLabel: 'Khám phá ngay', sortOrder: 10, active: true, startAt: null, endAt: null, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { key: 'editorial-local', placement: 'EDITORIAL', eyebrow: 'LOCAL BRAND NỔI BẬT', title: 'VIETNAMESE\nSTREETWEAR', subtitle: '', image: '/campaigns/editorial-light.svg', href: '/search?q=local', ctaLabel: 'Xem ngay', sortOrder: 20, active: true, startAt: null, endAt: null, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
  ]);
  await db.collection('homesections').insertMany([
    { key: 'hero', title: 'Hero', subtitle: '', type: 'CUSTOM', sortOrder: 10, active: true, config: {}, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { key: 'categories', title: 'Danh mục', subtitle: '', type: 'CATEGORY_RAIL', sortOrder: 20, active: true, config: { maxItems: 8 }, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { key: 'flash-sale', title: 'Flash Sale', subtitle: 'Ưu đãi nổi bật', type: 'PRODUCT_GRID', sortOrder: 30, active: true, config: { productLimit: 8, query: 'sale', badge: '⚡' }, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { key: 'editorial', title: 'Editorial', subtitle: '', type: 'BANNER_GRID', sortOrder: 40, active: true, config: {}, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
    { key: 'benefits', title: 'Benefits', subtitle: '', type: 'BENEFIT_STRIP', sortOrder: 50, active: true, config: { items: [
      { mark: 'SHIP', title: 'Giao hàng tiện lợi', subtitle: 'Tiêu chuẩn hoặc hỏa tốc', href: '/search' },
      { mark: '%', title: 'Khám phá ưu đãi', subtitle: 'Lựa chọn theo gu của bạn', href: '/search?q=sale' },
      { mark: 'SHOP', title: 'Trở thành người bán', subtitle: 'Mở shop trên XIII', href: '/seller-apply' }
    ] }, seedTag: 'phase1-demo', createdAt: now, updatedAt: now },
  ]);

  console.log('Phase 1 seed complete');
  console.log('admin@xiii.local / Xiii12345!');
  console.log('seller@xiii.local / Xiii12345!');
  console.log('buyer@xiii.local / Xiii12345!');
  console.log('manager@xiii.local / Xiii12345!');
  console.log('staff@xiii.local / Xiii12345!');
  console.log('ops@xiii.local / Xiii12345!');
  await mongoose.disconnect();
}
run().catch((error) => { console.error(error); process.exit(1); });
