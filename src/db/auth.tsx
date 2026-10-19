import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { clearQueries } from './store';
import type { Profile } from './types';

/** The current session: `undefined` until it's known, `null` when signed out. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null>();
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') clearQueries();
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

/** Signs out on this device only; other devices stay signed in. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}

export interface Account {
  id: string;
  profile: Profile;
  isTeacher: boolean;
}

export const AccountContext = createContext<Account | null>(null);

/** The signed-in account. Only for use inside the signed-in part of the app. */
export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useAccount() is only available when signed in.');
  return account;
}
