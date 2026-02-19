const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export const calcCoinValue = ({ popularity = 0, followers = 0 }) => {
  // popularity 0..100 -> 0..1
  const popNorm = clamp(popularity / 100, 0, 1);

  // followers -> normalize using realistic music scale:
  // 10k => 0, 10M => 1 (log scale)
  const logF = Math.log10((followers || 0) + 1);
  const followerNorm = clamp((logF - 4) / 3, 0, 1);

  // weights (pop matters more than followers)
  const score = (0.7 * popNorm) + (0.3 * followerNorm);

  // map to 8..35
  const coins = 8 + Math.round(score * (35 - 8));

  return clamp(coins, 8, 35);
};
