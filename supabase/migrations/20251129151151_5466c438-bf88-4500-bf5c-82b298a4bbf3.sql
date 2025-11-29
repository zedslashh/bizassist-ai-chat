-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update workflow policies to include managers
DROP POLICY IF EXISTS "Users can view all workflows" ON public.workflows;
CREATE POLICY "Users can view all workflows"
ON public.workflows
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  auth.uid() = created_by
);

DROP POLICY IF EXISTS "Users can update their own workflows" ON public.workflows;
CREATE POLICY "Managers can update workflows"
ON public.workflows
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  auth.uid() = created_by
);

DROP POLICY IF EXISTS "Users can delete their own workflows" ON public.workflows;
CREATE POLICY "Managers can delete workflows"
ON public.workflows
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  auth.uid() = created_by
);

-- Update workflow_instances policies for managers
DROP POLICY IF EXISTS "Users can view workflow instances they started" ON public.workflow_instances;
CREATE POLICY "Users and managers can view workflow instances"
ON public.workflow_instances
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  auth.uid() = started_by
);

DROP POLICY IF EXISTS "Users can update workflow instances they started" ON public.workflow_instances;
CREATE POLICY "Users and managers can update workflow instances"
ON public.workflow_instances
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  auth.uid() = started_by
);

-- Update workflow_tasks policies for managers
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON public.workflow_tasks;
CREATE POLICY "Users and managers can view tasks"
ON public.workflow_tasks
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  auth.uid() = assigned_to OR 
  auth.uid() IN (
    SELECT started_by
    FROM workflow_instances
    WHERE id = workflow_tasks.instance_id
  )
);

-- Update workflow_approvals policies for managers
DROP POLICY IF EXISTS "Users can view approvals assigned to them" ON public.workflow_approvals;
CREATE POLICY "Users and managers can view approvals"
ON public.workflow_approvals
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  auth.uid() = approver_id
);

DROP POLICY IF EXISTS "Approvers can update their approvals" ON public.workflow_approvals;
CREATE POLICY "Approvers and managers can update approvals"
ON public.workflow_approvals
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  auth.uid() = approver_id
);