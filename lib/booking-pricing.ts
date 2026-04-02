/** Matches payout split in `lib/stripe-release-payout.ts`. */
export const PLATFORM_FEE_RATE = 0.2;

export type OfferPriceSplit = {
  total: number;
  lineHolderFee: number;
  platformFee: number;
};

/** Split offered price (total charged) into Line Holder share and platform fee. */
export function splitOfferedPrice(total: number): OfferPriceSplit {
  const totalCents = Math.round(total * 100);
  const platformCents = Math.round(totalCents * PLATFORM_FEE_RATE);
  const lineHolderCents = totalCents - platformCents;
  return {
    total: totalCents / 100,
    lineHolderFee: lineHolderCents / 100,
    platformFee: platformCents / 100,
  };
}
