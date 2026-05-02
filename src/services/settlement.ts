import { supabase } from '../lib/supabase';

export interface SettlementData {
  groupId: string;
  payerId: string; // The person giving the money
  receiverId: string; // The person receiving the money
  amount: number;
}

export const SettlementService = {
  /**
   * Records a settlement payment between two members.
   * This is stored as a special type of expense or in a settlements table.
   * For simplicity and balance calculation compatibility, we'll store it in a 'settlements' table.
   */
  async createSettlement(data: SettlementData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: settlement, error } = await (supabase as any)
      .from('settlements')
      .insert({
        group_id: data.groupId,
        payer_id: data.payerId,
        receiver_id: data.receiverId,
        amount: data.amount,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return settlement;
  },

  async getGroupSettlements(groupId: string) {
    const { data, error } = await (supabase as any)
      .from('settlements')
      .select(`
        *,
        payer:payer_id (id, email, full_name),
        receiver:receiver_id (id, email, full_name),
        creator:created_by (id, email, full_name)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false }) as any;

    if (error) throw error;
    return data;
  }
};
