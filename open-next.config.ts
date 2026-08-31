// Defaults are fine: pages are prerendered and served from the assets binding, and
// nothing revalidates, so no incremental cache is needed.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
