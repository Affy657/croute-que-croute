export const PER_IP = 4, STALE_MS = 60 * 1000;

export function stalest<T>(list: T[], seen: (item: T) => number, now: number): T | null {
  const oldest = list.reduce<T | null>((a, b) => (a === null || seen(b) < seen(a) ? b : a), null);
  return oldest !== null && now - seen(oldest) >= STALE_MS ? oldest : null;
}
