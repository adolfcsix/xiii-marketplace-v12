# XIII Marketplace — Seller Promotions

This phase adds seller-funded vouchers and automatic product campaigns to the existing marketplace checkout.

## Seller Center

Open `http://localhost:3001/promotions` after signing in as a seller.

Seller voucher capabilities:
- FIXED or PERCENT discounts.
- Minimum spend, total usage quantity, and per-buyer limit.
- Whole-shop or selected-product scope.
- Scheduled start/end dates.
- Pause/resume and soft archive. Historical voucher usage is never deleted by Seller Center.

Campaign capabilities:
- Automatic FIXED or PERCENT product discount.
- Whole-shop or selected-product scope.
- Scheduled start/end dates.
- Pause/resume and soft archive.
- If more than one campaign matches the same SKU, Checkout uses the campaign that produces the largest unit discount. Campaigns do not stack with each other.

## Buyer behavior

`GET /api/v1/promotions/shop/:shopId` exposes only currently active public shop vouchers/campaigns. Product Detail uses this endpoint to show current offers.

Checkout accepts:
- `voucherCode`: one platform voucher.
- `shopVoucherCodes`: zero or one shop voucher per shop in the cart.

Discount order is deterministic:
1. Original SKU price.
2. Best active seller campaign for that product.
3. One eligible shop voucher for that shop.
4. One platform voucher for the whole cart.
5. Platform free-shipping discount, when applicable.

Shop vouchers are seller funded. Platform vouchers are marketplace funded. Seller revenue and platform commission are calculated from merchandise after seller-funded discounts, while platform-funded discounts do not reduce seller revenue.

## Order snapshot

Checkout stores promotion facts on the order instead of recalculating old orders from current campaigns:
- Order: originalSubtotal, campaignDiscount, sellerDiscount, platformDiscount, shopVoucherCodes.
- SubOrder: originalSubtotal, campaignDiscount, voucherDiscount, voucherCode.
- OrderItem: originalUnitPrice, final unitPrice, campaignId, campaignName, campaignDiscount.

Changing or disabling a promotion later therefore does not mutate historical order pricing.

## Consistency

Voucher stock is incremented in the same MongoDB transaction that creates the order. If checkout detects a concurrent voucher update, it aborts with `VOUCHER_CONCURRENT_UPDATE`.

Buyer cancellation and online-payment expiry restore every VoucherUsage attached to the order and decrement each voucher's usedCount. This supports a platform voucher plus multiple shop vouchers on the same master order.

## Demo seed

After `npm run seed --workspace services/api`:
- `SHOP50`: seller voucher, 50,000 VND off orders from 399,000 VND.
- `TEE12`: 12% off the seeded XIII Basic Tee, max 60,000 VND.
- `Street Week -15%`: automatic campaign on the seeded XIII Hoodie, max 90,000 VND per unit.
- Platform demo vouchers `XIII120` and `SHIP25` remain available.

## Returns and finance

Promotion snapshots are also used by the after-sales flow. Each OrderItem stores the shop-voucher allocation, platform product-discount allocation, and buyer-paid product amount. A return therefore refunds the buyer from the amount actually paid for the returned quantity while separately recording the seller liability before marketplace-funded discounts. Seller Finance reverses the seller-funded merchandise amount and the proportional platform fee, so a platform voucher does not accidentally become seller-funded during a refund.
