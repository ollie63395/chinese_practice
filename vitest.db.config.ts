import { defineConfig } from 'vitest/config';

// Tests of the database's access rules and the app's data functions.
// They need local Supabase running (`npm run db:start`).
export default defineConfig({
  test: {
    include: ['supabase/tests/**/*.test.ts', 'src/**/*.db.test.ts'],
    testTimeout: 20_000,
  },
});
