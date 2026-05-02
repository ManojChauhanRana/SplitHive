import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];

export interface CreateExpenseData {
  groupId: string;
  paidBy: string;
  title: string;
  description?: string;
  totalAmount: number;
  quantity: number;
  selectedMemberIds: string[]; // Who is splitting this?
  imageUrl?: string;
}

export const ExpenseService = {
  async createExpense(data: CreateExpenseData) {
    if (data.selectedMemberIds.length === 0) {
      throw new Error('At least one member must be selected for splitting.');
    }

    // 1. Calculate share amount (Equal split)
    // We use a precision-safe approach for rounding
    const shareAmount = Number((data.totalAmount / data.selectedMemberIds.length).toFixed(2));

    // 2. Insert the main expense
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: data.groupId,
        paid_by: data.paidBy,
        created_by: user.id,
        title: data.title,
        description: data.description,
        total_amount: data.totalAmount,
        quantity: data.quantity,
        image_url: data.imageUrl,
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // 3. Insert participants
    const participants = data.selectedMemberIds.map(userId => ({
      expense_id: expense.id,
      user_id: userId,
      share_amount: shareAmount,
      is_paid: false, // Default to false
    }));

    const { error: participantError } = await supabase
      .from('expense_participants')
      .insert(participants);

    if (participantError) {
      // In production, you'd want to handle rolling back the expense insert here
      // if participants fail, but for now we'll throw the error.
      throw participantError;
    }

    return expense;
  },

  async getGroupExpenses(groupId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        paid_by_profile:paid_by (*),
        created_by_profile:created_by (*),
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false }) as any;

    if (error) throw error;
    return data;
  },

  async getUserExpenses(userId: string) {
    // Get all groups user is part of
    const { data: userGroups, error: groupsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (groupsError) throw groupsError;
    
    if (!userGroups || userGroups.length === 0) return [];

    const groupIds = userGroups.map(g => g.group_id);

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        paid_by_profile:paid_by (*),
        group:group_id (name)
      `)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false }) as any;

    if (error) throw error;
    return data;
  }
};
