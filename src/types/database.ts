export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          joined_at: string
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          joined_at?: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          joined_at?: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          group_id: string
          paid_by: string
          title: string
          description: string | null
          total_amount: number
          quantity: number
          image_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          paid_by: string
          title: string
          description?: string | null
          total_amount: number
          quantity?: number
          image_url?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          paid_by?: string
          title?: string
          description?: string | null
          total_amount?: number
          quantity?: number
          image_url?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      expense_participants: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          share_amount: number
          is_paid: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          share_amount: number
          is_paid?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          share_amount?: number
          is_paid?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      settlements: {
        Row: {
          id: string
          group_id: string
          payer_id: string
          receiver_id: string
          amount: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          payer_id: string
          receiver_id: string
          amount: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          payer_id?: string
          receiver_id?: string
          amount?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
