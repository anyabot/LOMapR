// OpenNext Cloudflare adapter config. Defaults are fine: pages are prerendered
// at build time and served from the assets binding; the Worker-first allowlist
// only includes the /models|/rebuilt|/skins rewrites and API routes. Unknown
// paths receive the static 404 page. No incremental cache needed — nothing
// revalidates.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
