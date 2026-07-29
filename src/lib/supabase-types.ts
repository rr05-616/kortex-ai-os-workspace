export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          image: string | null;
          role: "admin" | "user" | "member";
          is_anonymous: boolean;
          email_verified_at: string | null;
          phone_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          image?: string | null;
          role?: "admin" | "user" | "member";
          is_anonymous?: boolean;
          email_verified_at?: string | null;
          phone_verified_at?: string | null;
        };
        Update: {
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          image?: string | null;
          role?: "admin" | "user" | "member";
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: "planning" | "active" | "on_hold" | "completed" | "archived";
          owner_id: string;
          members: string[];
          labels: string[];
          start_date: number | null;
          end_date: number | null;
          priority: "critical" | "high" | "medium" | "low";
          sprint_duration: number;
          health_score: number;
          ai_summary: string | null;
          ai_tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          status?: "planning" | "active" | "on_hold" | "completed" | "archived";
          owner_id: string;
          members?: string[];
          labels?: string[];
          start_date?: number | null;
          end_date?: number | null;
          priority?: "critical" | "high" | "medium" | "low";
          sprint_duration?: number;
          health_score?: number;
          ai_summary?: string | null;
          ai_tags?: string[];
        };
        Update: {
          name?: string;
          description?: string | null;
          status?: "planning" | "active" | "on_hold" | "completed" | "archived";
          members?: string[];
          labels?: string[];
          start_date?: number | null;
          end_date?: number | null;
          priority?: "critical" | "high" | "medium" | "low";
          sprint_duration?: number;
          health_score?: number;
          ai_summary?: string | null;
          ai_tags?: string[];
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
          priority: "critical" | "high" | "medium" | "low";
          project_id: string;
          assignee_id: string | null;
          created_by_id: string;
          parent_task_id: string | null;
          due_date: number | null;
          estimated_hours: number | null;
          actual_hours: number | null;
          sort_order: number;
          tags: string[];
          ai_generated: boolean;
          ai_risk_score: number | null;
          is_recurring: boolean;
          recurrence_rule: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description?: string | null;
          status?: "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
          priority?: "critical" | "high" | "medium" | "low";
          project_id: string;
          assignee_id?: string | null;
          created_by_id: string;
          parent_task_id?: string | null;
          due_date?: number | null;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          sort_order?: number;
          tags?: string[];
          ai_generated?: boolean;
          ai_risk_score?: number | null;
          is_recurring?: boolean;
          recurrence_rule?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
          priority?: "critical" | "high" | "medium" | "low";
          assignee_id?: string | null;
          parent_task_id?: string | null;
          due_date?: number | null;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          sort_order?: number;
          tags?: string[];
          ai_risk_score?: number | null;
        };
      };
      comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          ai_generated: boolean;
          created_at: string;
        };
        Insert: {
          task_id: string;
          user_id: string;
          content: string;
          ai_generated?: boolean;
        };
        Update: { content?: string };
      };
      sprints: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          goal: string | null;
          start_date: number;
          end_date: number;
          status: "planning" | "active" | "completed";
          ai_goal_summary: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          name: string;
          goal?: string | null;
          start_date: number;
          end_date: number;
          status?: "planning" | "active" | "completed";
          ai_goal_summary?: string | null;
        };
        Update: {
          name?: string;
          goal?: string | null;
          start_date?: number;
          end_date?: number;
          status?: "planning" | "active" | "completed";
        };
      };
      sprint_tasks: {
        Row: {
          id: string;
          sprint_id: string;
          task_id: string;
          sort_order: number;
        };
        Insert: {
          sprint_id: string;
          task_id: string;
          sort_order?: number;
        };
        Update: { sort_order?: number };
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          messages: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          project_id?: string | null;
          title?: string;
          messages?: Json;
        };
        Update: {
          title?: string;
          messages?: Json;
        };
      };
      project_analyses: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          url: string;
          url_type: "github" | "gitlab" | "bitbucket" | "website" | "vercel" | "netlify" | "unknown";
          status: "scanning" | "analyzing" | "generating" | "completed" | "failed";
          repo_info: Json | null;
          analysis: Json | null;
          scores: Json | null;
          recommendations: Json | null;
          generated_tasks: Json | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          project_id: string;
          user_id: string;
          url: string;
          url_type?: "github" | "gitlab" | "bitbucket" | "website" | "vercel" | "netlify" | "unknown";
          status?: "scanning" | "analyzing" | "generating" | "completed" | "failed";
          repo_info?: Json | null;
          analysis?: Json | null;
          scores?: Json | null;
          recommendations?: Json | null;
          generated_tasks?: Json | null;
          completed_at?: string | null;
        };
        Update: {
          status?: "scanning" | "analyzing" | "generating" | "completed" | "failed";
          repo_info?: Json | null;
          analysis?: Json | null;
          scores?: Json | null;
          recommendations?: Json | null;
          generated_tasks?: Json | null;
          completed_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "deadline" | "mention" | "assignment" | "sprint" | "ai_recommendation" | "risk_alert" | "dependency_warning" | "workspace_update";
          title: string;
          content: string | null;
          project_id: string | null;
          task_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: "deadline" | "mention" | "assignment" | "sprint" | "ai_recommendation" | "risk_alert" | "dependency_warning" | "workspace_update";
          title: string;
          content?: string | null;
          project_id?: string | null;
          task_id?: string | null;
          is_read?: boolean;
        };
        Update: {
          is_read?: boolean;
        };
      };
      workspace_settings: {
        Row: {
          id: string;
          user_id: string;
          ai_preferences: Json;
          notification_preferences: Json;
          theme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          ai_preferences?: Json;
          notification_preferences?: Json;
          theme?: string;
        };
        Update: {
          ai_preferences?: Json;
          notification_preferences?: Json;
          theme?: string;
        };
      };
      ai_memory: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string | null;
          memory_type: string;
          content: Json;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          user_id: string;
          conversation_id?: string | null;
          memory_type: string;
          content: Json;
          metadata?: Json;
        };
        Update: {
          content?: Json;
          metadata?: Json;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "admin" | "user" | "member";
      priority_level: "critical" | "high" | "medium" | "low";
      task_status: "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
      project_status: "planning" | "active" | "on_hold" | "completed" | "archived";
      sprint_status: "planning" | "active" | "completed";
      url_type: "github" | "gitlab" | "bitbucket" | "website" | "vercel" | "netlify" | "unknown";
      scan_status: "scanning" | "analyzing" | "generating" | "completed" | "failed";
      notification_type: "deadline" | "mention" | "assignment" | "sprint" | "ai_recommendation" | "risk_alert" | "dependency_warning" | "workspace_update";
      message_role: "user" | "assistant";
    };
  };
}
