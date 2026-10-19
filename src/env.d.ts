interface ImportMetaEnv {
  /** The Supabase project URL, e.g. https://abcd.supabase.co */
  readonly VITE_SUPABASE_URL?: string;
  /** The project's publishable (or legacy anon) key. Safe to ship: the database's access rules do the guarding. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
