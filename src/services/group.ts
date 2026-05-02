import { supabase } from '../lib/supabase';
import { AuthService } from './auth';
import { Database } from '../types/database';

type Group = Database['public']['Tables']['groups']['Row'];
type NewGroup = Database['public']['Tables']['groups']['Insert'];

export const GroupService = {
  async getGroups() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups (*)
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    
    // Flatten the response to return groups
    return data.map(item => item.groups) as Group[];
  },

  async createGroup(name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    await AuthService.ensureProfile(user);

    // 1. Create the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        created_by: user.id
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // 2. Add the creator as the first member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id
      });

    if (memberError) throw memberError;

    return group;
  },

  async getGroupMembers(groupId: string) {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        is_active,
        created_by,
        profiles:user_id (
          id,
          email,
          full_name
        ),
        added_by:created_by (
          id,
          email,
          full_name
        )
      `)
      .eq('group_id', groupId)
      .order('is_active', { ascending: false }) as any;

    if (error) throw error;
    return data;
  },

  async getPendingInvites(groupId: string) {
    const { data, error } = await supabase
      .from('group_invites')
      .select('id, email, status, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async addMemberByEmail(groupId: string, email: string, fullName?: string) {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profile && !profileError) {
      // User exists - add them directly
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          { 
            group_id: groupId, 
            user_id: profile.id,
            created_by: currentUser?.id
          }
        ]);

      if (memberError) {
        if (memberError.code === '23505') return { status: 'already_member' };
        throw memberError;
      }
      return { status: 'added' };
    } else {
      // User doesn't exist - send an auth invite email and store the pending group invite.
      const { data, error } = await supabase.functions.invoke('send-group-invite', {
        body: {
          groupId,
          email: normalizedEmail,
          fullName: fullName?.trim() || null,
          redirectTo: `${window.location.origin}/accept-invite`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.status === 'already_invited') return { status: 'already_invited' };
      return { status: 'invited' };
    }
  },

  async updateMemberStatus(groupId: string, userId: string, isActive: boolean) {
    const { error } = await supabase
      .from('group_members')
      .update({ is_active: isActive })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
  }
};
