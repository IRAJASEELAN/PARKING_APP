const AMENITY_BONUS = { cctv: 4, covered: 2, accessible: 2, ev: 1, attendant: 2 };

export function rankLots(lots) {
  const prices = lots.map((lot) => Number(lot.rates?.hourly ?? lot.rates?.firstHour ?? 0)).filter((price) => price > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  return lots.map((lot) => {
    const total = Math.max(0, Number(lot.totalSpots) || 0);
    const available = Math.max(0, total - (Number(lot.occupied) || 0));
    const availabilityScore = total ? available / total * 100 : 0;
    const distanceScore = lot.distanceKm == null ? 55 : 100 * Math.exp(-lot.distanceKm / 8);
    const price = Number(lot.rates?.hourly ?? lot.rates?.firstHour ?? 0);
    const priceScore = maxPrice === minPrice ? 75 : 100 * (maxPrice - price) / (maxPrice - minPrice);
    const safetyScore = Math.max(0, Math.min(100, Number(lot.safetyScore) / 5 * 100 || 0));
    const ratingScore = Math.max(0, Math.min(100, Number(lot.driverRating) / 5 * 100 || 0));
    const amenities = Array.isArray(lot.amenities) ? lot.amenities : [];
    const amenityScore = Math.min(100, amenities.reduce((sum, key) => sum + (AMENITY_BONUS[key] || 0), 0) * 10);
    const convenienceScore = amenityScore * 0.7 + (lot.reservable ? 30 : 0);
    const score = Math.round(
      distanceScore * 0.25 + availabilityScore * 0.20 + priceScore * 0.15 +
      safetyScore * 0.15 + ratingScore * 0.15 + convenienceScore * 0.10
    );
    const reasons = [];
    if (available > 0) reasons.push(`${available} spaces available`);
    if (lot.distanceKm != null) reasons.push(`${lot.distanceKm.toFixed(1)} km from your destination`);
    if (price > 0) reasons.push(`₹${price}/hour`);
    if (amenities.includes("cctv")) reasons.push("CCTV listed");
    if (lot.safetyScore) reasons.push(`Sample safety rating ${Number(lot.safetyScore).toFixed(1)}/5`);
    if (lot.reservable) reasons.push("Reservations accepted");
    return { ...lot, score, reasons };
  }).sort((a, b) => b.score - a.score);
}


