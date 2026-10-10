export function createReservationWindow(start, durationHours, now = new Date()) {
  const hours = Number(durationHours);
  const startDate = new Date(start);
  if (!Number.isInteger(hours) || hours < 1 || hours > 24) return { error: "Choose a duration between 1 and 24 hours" };
  if (!start || Number.isNaN(startDate.getTime()) || startDate.getTime() < now.getTime() - 2 * 60 * 1000 || startDate.getTime() > now.getTime() + 90 * 24 * 60 * 60 * 1000) return { error: "Choose a valid start time within the next 90 days" };
  return { hours, startDate, endDate: new Date(startDate.getTime() + hours * 60 * 60 * 1000) };
}

export function calculatePrice(lot, hours) {
  const first = Number(lot.rates?.firstHour ?? lot.rates?.hourly);
  const extra = Number(lot.rates?.additional ?? lot.rates?.hourly ?? first);
  const daily = Number(lot.rates?.dailyMax ?? first * 8);
  return Math.min(first + Math.max(0, hours - 1) * extra, daily);
}

export function calculateQuote(lot, hours, serviceFee = Number(process.env.PARKFLOW_SERVICE_FEE ?? 15)) {
  const parkingFee = calculatePrice(lot, hours);
  if (!Number.isFinite(serviceFee) || serviceFee < 0 || serviceFee > 500) throw new Error("Service fee must be between ₹0 and ₹500");
  return { parkingFee, serviceFee, total: parkingFee + serviceFee, currency: "INR" };
}
