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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          id: string
          language: string
          org_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          org_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          org_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          a_en: string
          a_ta: string
          created_at: string | null
          domain: string
          embedding: string | null
          id: number
          q_en: string
          q_ta: string
        }
        Insert: {
          a_en: string
          a_ta: string
          created_at?: string | null
          domain: string
          embedding?: string | null
          id?: number
          q_en: string
          q_ta: string
        }
        Update: {
          a_en?: string
          a_ta?: string
          created_at?: string | null
          domain?: string
          embedding?: string | null
          id?: number
          q_en?: string
          q_ta?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          escalated: boolean | null
          id: string
          language: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          escalated?: boolean | null
          id?: string
          language: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          escalated?: boolean | null
          id?: string
          language?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          contact_type: string
          contact_value: string
          conversation_id: string | null
          created_at: string
          domain: string | null
          id: number
          org_id: string
          query_summary: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_type: string
          contact_value: string
          conversation_id?: string | null
          created_at?: string
          domain?: string | null
          id?: number
          org_id: string
          query_summary?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_type?: string
          contact_value?: string
          conversation_id?: string | null
          created_at?: string
          domain?: string | null
          id?: number
          org_id?: string
          query_summary?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_approvals: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          comments: string | null
          created_at: string | null
          id: string
          instance_id: string | null
          node_id: string
          status: Database["public"]["Enums"]["approval_status"]
          task_id: string | null
          title: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          node_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          task_id?: string | null
          title: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          node_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_approvals_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approvals_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "workflow_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          completed_at: string | null
          context_data: Json | null
          created_at: string | null
          current_node_id: string | null
          id: string
          started_at: string | null
          started_by: string | null
          status: Database["public"]["Enums"]["workflow_instance_status"]
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string | null
          current_node_id?: string | null
          id?: string
          started_at?: string | null
          started_by?: string | null
          status?: Database["public"]["Enums"]["workflow_instance_status"]
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string | null
          current_node_id?: string | null
          id?: string
          started_at?: string | null
          started_by?: string | null
          status?: Database["public"]["Enums"]["workflow_instance_status"]
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          instance_id: string | null
          node_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instance_id?: string | null
          node_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instance_id?: string | null
          node_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          flow_data: Json
          id: string
          name: string
          status: Database["public"]["Enums"]["workflow_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flow_data: Json
          id?: string
          name: string
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flow_data?: Json
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_faqs: {
        Args: {
          filter_domain?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          a_en: string
          a_ta: string
          domain: string
          id: number
          q_en: string
          q_ta: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      approval_status: "pending" | "approved" | "rejected"
      node_type:
        | "start"
        | "task"
        | "approval"
        | "condition"
        | "automation"
        | "end"
      task_status: "pending" | "in_progress" | "completed" | "skipped"
      workflow_instance_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "rejected"
        | "cancelled"
      workflow_status: "draft" | "active" | "archived"
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
      app_role: ["admin", "manager", "user"],
      approval_status: ["pending", "approved", "rejected"],
      node_type: [
        "start",
        "task",
        "approval",
        "condition",
        "automation",
        "end",
      ],
      task_status: ["pending", "in_progress", "completed", "skipped"],
      workflow_instance_status: [
        "pending",
        "in_progress",
        "completed",
        "rejected",
        "cancelled",
      ],
      workflow_status: ["draft", "active", "archived"],
    },
  },
} as const
