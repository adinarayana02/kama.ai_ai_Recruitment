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
      candidate_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          phone: string | null
          location: string | null
          headline: string | null
          skills: string[]
          experience: string | null
          education: string | null
          resume_url: string | null
          linkedin_url: string | null
          github_url: string | null
          portfolio_url: string | null
          about: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          phone?: string | null
          location?: string | null
          headline?: string | null
          skills?: string[]
          experience?: string | null
          education?: string | null
          resume_url?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          about?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          phone?: string | null
          location?: string | null
          headline?: string | null
          skills?: string[]
          experience?: string | null
          education?: string | null
          resume_url?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          about?: string | null
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