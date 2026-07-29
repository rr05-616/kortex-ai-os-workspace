-- ============================================================
-- KORTEX AI — Supabase Production Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'user', 'member');
CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');
CREATE TYPE sprint_status AS ENUM ('planning', 'active', 'completed');
CREATE TYPE url_type AS ENUM ('github', 'gitlab', 'bitbucket', 'website', 'vercel', 'netlify', 'unknown');
CREATE TYPE scan_status AS ENUM ('scanning', 'analyzing', 'generating', 'completed', 'failed');
CREATE TYPE notification_type AS ENUM ('deadline', 'mention', 'assignment', 'sprint', 'ai_recommendation', 'risk_alert', 'dependency_warning', 'workspace_update');
CREATE TYPE message_role AS ENUM ('user', 'assistant');

-- ============================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  image TEXT,
  role user_role DEFAULT 'user',
  is_anonymous BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, image, is_anonymous)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    image = COALESCE(EXCLUDED.image, public.users.image),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PROJECTS TABLE
-- ============================================================

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'planning',
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  members UUID[] DEFAULT '{}',
  labels TEXT[] DEFAULT '{}',
  start_date BIGINT,
  end_date BIGINT,
  priority priority_level DEFAULT 'medium',
  sprint_duration INTEGER DEFAULT 14,
  health_score INTEGER DEFAULT 85,
  ai_summary TEXT,
  ai_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- ============================================================
-- TASKS TABLE
-- ============================================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'backlog',
  priority priority_level DEFAULT 'medium',
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_id UUID NOT NULL REFERENCES public.users(id),
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  due_date BIGINT,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  sort_order INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT false,
  ai_risk_score NUMERIC,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_project_status ON public.tasks(project_id, status);

-- ============================================================
-- COMMENTS TABLE
-- ============================================================

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_task ON public.comments(task_id);

-- ============================================================
-- SPRINTS TABLE
-- ============================================================

CREATE TABLE public.sprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date BIGINT NOT NULL,
  end_date BIGINT NOT NULL,
  status sprint_status DEFAULT 'planning',
  ai_goal_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sprints_project ON public.sprints(project_id);
CREATE INDEX idx_sprints_status ON public.sprints(status);

-- ============================================================
-- SPRINT TASKS (junction table)
-- ============================================================

CREATE TABLE public.sprint_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(sprint_id, task_id)
);

CREATE INDEX idx_sprint_tasks_sprint ON public.sprint_tasks(sprint_id);
CREATE INDEX idx_sprint_tasks_task ON public.sprint_tasks(task_id);

-- ============================================================
-- AI CONVERSATIONS TABLE
-- ============================================================

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'New conversation',
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_project ON public.ai_conversations(project_id);

-- ============================================================
-- PROJECT ANALYSES TABLE
-- ============================================================

CREATE TABLE public.project_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_type url_type DEFAULT 'unknown',
  status scan_status DEFAULT 'scanning',
  repo_info JSONB,
  analysis JSONB,
  scores JSONB,
  recommendations JSONB,
  generated_tasks JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_project_analyses_user ON public.project_analyses(user_id);
CREATE INDEX idx_project_analyses_project ON public.project_analyses(project_id);
CREATE INDEX idx_project_analyses_status ON public.project_analyses(status);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);

-- ============================================================
-- WORKSPACE SETTINGS TABLE
-- ============================================================

CREATE TABLE public.workspace_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  ai_preferences JSONB DEFAULT '{}'::jsonb,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AI MEMORY TABLE
-- ============================================================

CREATE TABLE public.ai_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_memory_user ON public.ai_memory(user_id);
CREATE INDEX idx_ai_memory_type ON public.ai_memory(memory_type);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

-- Users: can read own profile, anyone in same workspace can read names
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view workspace member names" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.owner_id = auth.uid() AND auth.uid() = ANY(p.members)
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.owner_id = public.users.id AND auth.uid() = ANY(p.members)
    )
  );

-- Projects: owner and members can access
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (owner_id = auth.uid() OR auth.uid() = ANY(members));

CREATE POLICY "Users can create projects" ON public.projects
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update projects" ON public.projects
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete projects" ON public.projects
  FOR DELETE USING (owner_id = auth.uid());

-- Tasks: accessible if user has project access
CREATE POLICY "Users can view project tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.members))
    )
  );

CREATE POLICY "Users can create tasks in accessible projects" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.members))
    )
  );

CREATE POLICY "Users can update tasks in accessible projects" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.members))
    )
  );

CREATE POLICY "Users can delete tasks in accessible projects" ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.members))
    )
  );

-- Comments: accessible if user has task/project access
CREATE POLICY "Users can view task comments" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_id AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.members))
    )
  );

CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (user_id = auth.uid());

-- Sprints: accessible if user has project access
CREATE POLICY "Users can view project sprints" ON public.sprints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.members))
    )
  );

CREATE POLICY "Users can manage sprints" ON public.sprints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- Sprint Tasks: accessible if user has sprint/project access
CREATE POLICY "Users can view sprint tasks" ON public.sprint_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sprints s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = sprint_id AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.members))
    )
  );

CREATE POLICY "Users can manage sprint tasks" ON public.sprint_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sprints s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = sprint_id AND p.owner_id = auth.uid()
    )
  );

-- AI Conversations: user can only access own
CREATE POLICY "Users can view own conversations" ON public.ai_conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations" ON public.ai_conversations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations" ON public.ai_conversations
  FOR DELETE USING (user_id = auth.uid());

-- Project Analyses: accessible if user has project access
CREATE POLICY "Users can view project analyses" ON public.project_analyses
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.members))
    )
  );

CREATE POLICY "Users can create analyses" ON public.project_analyses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own analyses" ON public.project_analyses
  FOR UPDATE USING (user_id = auth.uid());

-- Notifications: user can only access own
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Workspace Settings: user can only access own
CREATE POLICY "Users can view own settings" ON public.workspace_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings" ON public.workspace_settings
  FOR ALL USING (user_id = auth.uid());

-- AI Memory: user can only access own
CREATE POLICY "Users can view own memory" ON public.ai_memory
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own memory" ON public.ai_memory
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('attachments', 'attachments', false, 52428800, NULL),
  ('reports', 'reports', false, 10485760, ARRAY['application/pdf', 'text/html', 'application/json']),
  ('documents', 'documents', false, 52428800, NULL),
  ('exports', 'exports', false, 104857600, NULL);

-- Storage RLS policies
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_conversations;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_workspace_settings_updated_at BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
