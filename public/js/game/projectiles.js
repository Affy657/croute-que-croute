export const PROJECTILES = {
  knife: { len: 66, rad: 5 },
  fork: { len: 58, rad: 6 }
};

export function projectile(kind, x, y, vx, vy, spin = 0) {
  const { len, rad } = PROJECTILES[kind];
  return { kind, x, y, vx, vy, a: Math.atan2(vy, vx), spin, len, rad, near: false };
}
