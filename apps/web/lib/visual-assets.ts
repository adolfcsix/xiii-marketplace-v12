const legacyCampaigns = new Set([
  '/campaigns/hero-street.svg',
  '/campaigns/promo-local.svg',
  '/campaigns/promo-accessories.svg',
  '/campaigns/promo-sale.svg',
  '/campaigns/editorial-dark.svg',
  '/campaigns/editorial-light.svg',
]);
// Only replace the original bundled demo art; merchants' uploaded art stays intact.
export const isLegacyCampaign = (image: string) => legacyCampaigns.has(image);
