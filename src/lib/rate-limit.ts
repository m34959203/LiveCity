const requests = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of requests) {
    if (entry.resetAt <= now) {
      requests.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  limit: number = 50,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number } {
  cleanup();

  const now = Date.now();
  const entry = requests.get(key);

  if (!entry || entry.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  entry.count++;

  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - entry.count };
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
