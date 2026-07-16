export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          id: string
          published: boolean
          published_at: string | null
          slug: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      club_chat_messages: {
        Row: {
          body: string
          category_id: string
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          category_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          reply_to_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_chat_messages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "club_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "club_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      club_post_comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "club_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      club_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "club_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      club_posts: {
        Row: {
          action: string | null
          body: string
          category_id: string
          cmp: number | null
          created_at: string
          deleted_at: string | null
          entry_zone: string | null
          exchange: string | null
          id: string
          idea_type: string | null
          image_url: string | null
          rationale: string | null
          stop_loss: number | null
          symbol: string | null
          target1: number | null
          timeframe: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string | null
          body: string
          category_id: string
          cmp?: number | null
          created_at?: string
          deleted_at?: string | null
          entry_zone?: string | null
          exchange?: string | null
          id?: string
          idea_type?: string | null
          image_url?: string | null
          rationale?: string | null
          stop_loss?: number | null
          symbol?: string | null
          target1?: number | null
          timeframe?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string | null
          body?: string
          category_id?: string
          cmp?: number | null
          created_at?: string
          deleted_at?: string | null
          entry_zone?: string | null
          exchange?: string | null
          id?: string
          idea_type?: string | null
          image_url?: string | null
          rationale?: string | null
          stop_loss?: number | null
          symbol?: string | null
          target1?: number | null
          timeframe?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "club_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          id: string
          invoice_number: string
          payment_id: string | null
          period_end: string
          period_start: string
          plan: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          invoice_number: string
          payment_id?: string | null
          period_end: string
          period_start: string
          plan: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          invoice_number?: string
          payment_id?: string | null
          period_end?: string
          period_start?: string
          plan?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_reports: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
          week_of: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          week_of: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          week_of?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          contact: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          method: string | null
          notes: Json | null
          plan: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          refund_amount: number | null
          refund_id: string | null
          refunded_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          contact?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          method?: string | null
          notes?: Json | null
          plan: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          contact?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          method?: string | null
          notes?: Json | null
          plan?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          must_change_password: boolean
          name: string
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          must_change_password?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          must_change_password?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      saved_strategies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          positions: Json
          source: string
          symbol: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          positions: Json
          source: string
          symbol: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          positions?: Json
          source?: string
          symbol?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      special_trading_days: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          trading_hours: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          trading_hours?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          trading_hours?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          new_plan: string | null
          new_status: string | null
          old_plan: string | null
          old_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          reason: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          new_plan?: string | null
          new_status?: string | null
          old_plan?: string | null
          old_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reason?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          new_plan?: string | null
          new_status?: string | null
          old_plan?: string | null
          old_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reason?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_reminder_log: {
        Row: {
          days_before: number
          expires_at: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          days_before: number
          expires_at: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          days_before?: number
          expires_at?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_reminder_settings: {
        Row: {
          enabled: boolean
          id: number
          notify_days: number[]
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: number
          notify_days?: number[]
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: number
          notify_days?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_type: string
          started_at: string
          status: string
          trial_used: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type?: string
          started_at?: string
          status?: string
          trial_used?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type?: string
          started_at?: string
          status?: string
          trial_used?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      table_styles: {
        Row: {
          created_at: string
          dark_config: Json
          id: string
          light_config: Json
          style_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          dark_config: Json
          id?: string
          light_config: Json
          style_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          dark_config?: Json
          id?: string
          light_config?: Json
          style_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      trial_claims: {
        Row: {
          created_at: string
          fingerprint: string | null
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          preference_key: string
          preference_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preference_key: string
          preference_value: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preference_key?: string
          preference_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          duration: string | null
          id: string
          is_published: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          is_published?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          is_published?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_club_member: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
