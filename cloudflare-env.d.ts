declare namespace Cloudflare {
  interface Env {
    SITE_ENTRY_PASSWORD_HASH?: string;
    SITE_ENTRY_COOKIE_SECRET?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
