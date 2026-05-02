import { supabase } from '../lib/supabase';

export interface UserBalance {
  user_id: string;
  email: string;
  full_name: string;
  total_paid: number;
  total_share: number;
  net_balance: number;
  is_active: boolean;
  added_by_name?: string;
}

export const BalanceService = {
  /**
   * Fetches the net balances for all members in a group.
   * Uses a JS fallback if the RPC hasn't been created yet.
   */
  async getGroupBalances(groupId: string): Promise<UserBalance[]> {
    try {
      // 1. Try using the optimized RPC function first
      const { data, error } = await supabase.rpc('get_group_balances', {
        p_group_id: groupId
      });

      if (!error && data) {
        // We'll need to join with profiles/member info to get names
        // For now, let's just use the ID and fetch emails
        return data as UserBalance[];
      }
      
      console.warn("RPC 'get_group_balances' not found or failed. Falling back to JS aggregation.");
    } catch (e) {
      // Fallback to JS aggregation below
    }

    // 2. JS Fallback Aggregation
    // Step A: Get all members
    const { data: members, error: memError } = await supabase
      .from('group_members')
      .select(`
        user_id,
        is_active,
        profiles:user_id (email, full_name),
        added_by_profile:created_by (full_name, email)
      `)
      .eq('group_id', groupId);

    if (memError) throw memError;

    // Step B: Get all expenses for paid_by totals
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('paid_by, total_amount')
      .eq('group_id', groupId);

    if (expError) throw expError;

    // Step C: Get all participants for share totals
    const { data: participants, error: partError } = await supabase
      .from('expense_participants')
      .select('user_id, share_amount, expense:expense_id!inner(group_id)')
      .eq('expense.group_id', groupId);

    if (partError) throw partError;

    if (partError) throw partError;

    // Step D: Get all settlements
    const { data: settlements, error: setError } = await supabase
      .from('settlements')
      .select('payer_id, receiver_id, amount')
      .eq('group_id', groupId);

    if (setError) throw setError;

    // Step E: Calculate
    return members.map(m => {
      const paid = expenses
        .filter(e => e.paid_by === m.user_id)
        .reduce((sum, e) => sum + Number(e.total_amount), 0);

      const share = participants
        .filter(p => p.user_id === m.user_id)
        .reduce((sum, p) => sum + Number(p.share_amount), 0);

      const settlementsPaid = settlements
        .filter(s => s.payer_id === m.user_id)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      
      const settlementsReceived = settlements
        .filter(s => s.receiver_id === m.user_id)
        .reduce((sum, s) => sum + Number(s.amount), 0);

      return {
        user_id: m.user_id,
        email: m.profiles.email,
        full_name: m.profiles.full_name || m.profiles.email,
        total_paid: paid + settlementsPaid,
        total_share: share + settlementsReceived,
        net_balance: Number(((paid + settlementsPaid) - (share + settlementsReceived)).toFixed(2)),
        is_active: m.is_active,
        added_by_name: m.added_by_profile?.full_name || m.added_by_profile?.email
      };
    });
  },

  /**
   * Calculates overall stats for the dashboard (Total Owed, Total Owe, Total Net)
   */
  async getUserDashboardStats(userId: string): Promise<{ totalBalance: number; youOwe: number; youAreOwed: number }> {
    // 1. Get all groups user is part of
    const { data: userGroups, error: groupsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (groupsError) throw groupsError;

    let totalOwe = 0;
    let totalOwed = 0;

    // 2. For each group, get the balance for this specific user
    // In a real production app, we would write a single SQL query for this
    // but for now, we leverage the existing logic
    const balancePromises = userGroups.map(g => this.getGroupBalances(g.group_id));
    const allBalances = await Promise.all(balancePromises);

    allBalances.forEach(groupBalance => {
      const userBalance = groupBalance.find(b => b.user_id === userId);
      if (userBalance) {
        if (userBalance.net_balance > 0) {
          totalOwed += userBalance.net_balance;
        } else {
          totalOwe += Math.abs(userBalance.net_balance);
        }
      }
    });

    return {
      totalBalance: Number((totalOwed - totalOwe).toFixed(2)),
      youOwe: Number(totalOwe.toFixed(2)),
      youAreOwed: Number(totalOwed.toFixed(2))
    };
  },

  /**
   * Provides a detailed breakdown of who the user owes and who owes the user across all groups.
   */
  async getDetailedUserBalances(userId: string) {
    // 1. Get all groups user is part of
    const { data: userGroups, error: groupsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (groupsError) throw groupsError;
    if (!userGroups || userGroups.length === 0) return { youOwe: [], owesYou: [] };

    const groupIds = userGroups.map(g => g.group_id);

    // 2. Fetch all relevant data for these groups
    const [expenses, participants, settlements, profiles] = await Promise.all([
      supabase.from('expenses').select('id, group_id, paid_by, total_amount').in('group_id', groupIds),
      supabase.from('expense_participants').select('expense_id, user_id, share_amount, expense:expense_id!inner(group_id, paid_by)').in('expense.group_id', groupIds),
      supabase.from('settlements').select('payer_id, receiver_id, amount').in('group_id', groupIds),
      supabase.from('profiles').select('id, full_name, email')
    ]);

    if (expenses.error) throw expenses.error;
    if (participants.error) throw participants.error;
    if (settlements.error) throw settlements.error;
    if (profiles.error) throw profiles.error;

    // 3. Map to store net balance per person
    // Positive: they owe user, Negative: user owes them
    const personBalances: Record<string, number> = {};

    // Process expenses where user is participant
    participants.data.forEach(p => {
      const payerId = p.expense.paid_by;
      const participantId = p.user_id;

      if (payerId === userId && participantId !== userId) {
        // Someone owes user
        personBalances[participantId] = (personBalances[participantId] || 0) + Number(p.share_amount);
      } else if (participantId === userId && payerId !== userId) {
        // User owes someone
        personBalances[payerId] = (personBalances[payerId] || 0) - Number(p.share_amount);
      }
    });

    // Process settlements
    settlements.data.forEach(s => {
      if (s.payer_id === userId) {
        // User paid someone (reduces what user owes them or increases what they owe user)
        personBalances[s.receiver_id] = (personBalances[s.receiver_id] || 0) + Number(s.amount);
      } else if (s.receiver_id === userId) {
        // Someone paid user
        personBalances[s.payer_id] = (personBalances[s.payer_id] || 0) - Number(s.amount);
      }
    });

    // 4. Format results
    const youOwe: any[] = [];
    const owesYou: any[] = [];

    Object.entries(personBalances).forEach(([pid, balance]) => {
      if (Math.abs(balance) < 0.01) return; // Skip tiny balances

      const profile = profiles.data.find(p => p.id === pid);
      const personInfo = {
        user_id: pid,
        full_name: profile?.full_name || profile?.email || 'Unknown',
        amount: Math.abs(balance)
      };

      if (balance < 0) {
        youOwe.push(personInfo);
      } else {
        owesYou.push(personInfo);
      }
    });

    return { youOwe, owesYou };
  }
};
