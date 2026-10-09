const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Types } = require('mongoose');
const { CheckoutService } = require('../services/api/dist/checkout/checkout.service');
const { CartService } = require('../services/api/dist/cart/cart.service');

test('discount allocation conserves money with a free or tiny final item', () => {
  const service = new CheckoutService();
  for (const bases of [[1, 1, 0], [9, 9, 1], [0, 0, 0], [100, 0, 300]]) {
    const lines = bases.map((base, id) => ({ base, id: String(id) }));
    const total = bases.reduce((a, b) => a + b, 0);
    for (let amount = 0; amount <= total + 1; amount++) {
      const result = service.allocateDiscount(amount, lines, x => x.id, x => x.base);
      assert.equal([...result.values()].reduce((a, b) => a + b, 0), Math.min(amount, total));
      for (const line of lines) assert.ok((result.get(line.id) || 0) <= line.base);
    }
  }
});

function fixture(initial = 1) {
  const variantId = new Types.ObjectId();
  let items = [{ variantId, quantity: initial, addedAt: new Date() }];
  let conflicts = 0;
  const snapshot = () => items.map(x => ({ ...x }));
  const model = {
    findOneAndUpdate: async () => { const saved = snapshot(); return { _id: 'cart', toObject: () => ({ items: saved }) }; },
    updateOne: async (filter, update) => {
      if (JSON.stringify(filter.items) !== JSON.stringify(items)) { conflicts++; return { matchedCount: 0 }; }
      items = update.$set.items; return { matchedCount: 1 };
    },
  };
  const service = new CartService(model);
  service.assertPurchasable = async () => {};
  service.get = async () => snapshot();
  return { service, variantId, read: snapshot, conflicts: () => conflicts };
}

test('simultaneous adds retain both increments after a stale snapshot', async () => {
  const f = fixture();
  await Promise.all([f.service.add('507f1f77bcf86cd799439011', f.variantId, 2), f.service.add('507f1f77bcf86cd799439011', f.variantId, 3)]);
  assert.equal(f.read()[0].quantity, 6);
  assert.ok(f.conflicts() > 0);
});

test('concurrent adds recheck the 99 item limit', async () => {
  const f = fixture(98);
  const results = await Promise.allSettled([f.service.add('507f1f77bcf86cd799439011', f.variantId, 1), f.service.add('507f1f77bcf86cd799439011', f.variantId, 1)]);
  assert.equal(f.read()[0].quantity, 99);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.match(results.find(x => x.status === 'rejected').reason.message, /CART_ITEM_LIMIT_EXCEEDED/);
});

test('persistent conflicts return a recoverable 409 instead of overwriting', async () => {
  const f = fixture();
  f.service.carts.updateOne = async () => ({ matchedCount: 0 });
  await assert.rejects(f.service.add('507f1f77bcf86cd799439011', f.variantId, 1), error => error.getStatus() === 409);
  assert.equal(f.read()[0].quantity, 1);
});

const { AuthService } = require('../services/api/dist/auth/auth.service');
test('concurrent registration duplicate is a 409, not a 500', async () => {
  for (const field of ['email', 'phone']) {
    const users = { exists: async () => false, create: async () => { throw { code: 11000, keyPattern: { [field]: 1 } }; } };
    await assert.rejects(new AuthService(users).register({ email: 'a@example.com', password: 'password123', fullName: 'Buyer', phone: '123' }),
      error => error.getStatus() === 409 && error.message === `${field.toUpperCase()}_EXISTS`);
  }
});

test('blank optional phone is omitted before insertion', async () => {
  let inserted;
  const users = { exists: async () => false, create: async data => { inserted = data; return data; } };
  const service = new AuthService(users);
  service.issueTokens = async () => ({});
  await service.register({ email: 'a@example.com', password: 'password123', fullName: 'Buyer', phone: '   ' });
  assert.equal(inserted.phone, undefined);
});

test('transaction retry only notifies sellers for the committed attempt', async () => {
  const id = new Types.ObjectId();
  let attempt = 0;
  const sent = [];
  const session = { withTransaction: async callback => { await callback(); await callback(); }, endSession: async () => {} };
  const service = new CheckoutService();
  Object.assign(service, {
    connection: { startSession: async () => session },
    resolveAddress: async () => ({}),
    loadCart: async () => ({ cart: { _id: id }, groups: [{ shop: { _id: id, ownerId: id }, items: [], subtotal: 100, originalSubtotal: 100, shippingFee: 0, campaignDiscount: 0 }], subtotal: 100, originalSubtotal: 100, shippingFee: 0, campaignDiscount: 0, marketplaceSettings: { codEnabled: true } }),
    resolveShopVouchers: async () => new Map(),
    resolvePlatformVoucher: async () => ({ voucher: null, discountAmount: 0, shippingDiscount: 0 }),
    finance: { getSettings: async () => ({ commissionRateBps: 0 }) },
    orders: { create: async () => { attempt++; return [{ _id: id }]; } },
    subOrders: { create: async () => [{ _id: id, subOrderCode: `SUB-${attempt}` }] },
    orderHistory: { create: async () => [] },
    carts: { updateOne: async () => ({ modifiedCount: 1 }) },
    notifications: { createSafe: async value => sent.push(value) },
  });
  await service.create(id.toString(), { paymentMethod: 'COD', shippingMethod: 'STANDARD', addressId: id.toString() });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].data.subOrderCode, 'SUB-2');
});
