import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { SignupData, LoginData } from '../types/auth';

export const AuthService = {
  async ensureProfile(userArg?: User | null) {
    const user = userArg ?? (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const email = user.email;
    if (!email) {
      throw new Error('Authenticated user is missing an email address');
    }

    const fullName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null;

    const profilesTable = supabase.from('profiles' as never) as any;
    const { error } = await profilesTable.upsert(
      {
        id: user.id,
        email,
        full_name: fullName,
      },
      {
        onConflict: 'id',
      }
    );

    if (error) throw error;
    return user;
  },

  async ensureProfileIfPossible(userArg?: User | null) {
    try {
      return await this.ensureProfile(userArg);
    } catch (error: any) {
      console.error('Error ensuring profile:', error);

      const isProfilesRlsError =
        error?.message?.includes('row-level security policy for table "profiles"') ||
        error?.code === '42501';

      if (isProfilesRlsError) {
        return userArg ?? null;
      }

      throw error;
    }
  },

  async signUp({ email, password, fullName }: SignupData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;

    // If signup returns an authenticated user immediately, make sure the profile exists.
    if (data.user && data.session) {
      await this.ensureProfileIfPossible(data.user);
    }

    return data;
  },

  async signIn({ email, password }: LoginData) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    await this.ensureProfileIfPossible(data.user);
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },
};
