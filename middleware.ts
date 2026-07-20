import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';

type RateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type RateLimitEnv = CloudflareEnv & {
  DYNAMIC_RATE_LIMITER?: RateLimiter;
};

const RETRY_AFTER_SECONDS = 60;

/**
 * Protect the relatively small dynamic surface of the site without putting a
 * challenge in front of visitors. In production, Cloudflare's asset-first
 * routing serves prerendered pages and static files before this middleware is
 * reached, so only allowlisted proxy rewrites and future API routes are counted.
 */
export async function middleware(request: NextRequest) {
  // The Cloudflare binding does not exist under the regular Next.js dev server.
  if (process.env.NODE_ENV !== 'production') return NextResponse.next();

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new NextResponse('Method not allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD' },
    });
  }

  try {
    const { env } = getCloudflareContext();
    const limiter = (env as RateLimitEnv).DYNAMIC_RATE_LIMITER;

    // CF-Connecting-IP is set by Cloudflare and cannot be spoofed by clients.
    // The fallback is only relevant to unusual preview/proxy configurations.
    const clientKey = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const result = await limiter?.limit({ key: clientKey });

    if (result && !result.success) {
      return new NextResponse('Too many requests. Please try again shortly.', {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(RETRY_AFTER_SECONDS),
        },
      });
    }
  } catch (error) {
    // A limiter outage or missing preview binding must not make the site fail.
    console.error('Dynamic request rate limiter unavailable', error);
  }

  return NextResponse.next();
}
