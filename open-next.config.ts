// OpenNext Cloudflare adapter config. Defaults are fine: pages are prerendered
// at build time and served from the assets binding; the Worker only handles
// what isn't a static asset (the /models|/rebuilt|/skins rewrites, and any
// future API routes). No incremental cache needed — nothing revalidates.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
