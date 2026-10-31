const encoder = new TextEncoder();

const hex = (buffer: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");

export function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

export async function sha256(text: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

export async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(x, y);
}
