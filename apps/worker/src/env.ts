export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  MEME_BUCKET: R2Bucket;
  GAME_SESSIONS: DurableObjectNamespace;
  ADMIN_SESSION_SECRET: string;
  ADMIN_BOOTSTRAP_PASSWORD: string;
}
