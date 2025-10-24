-- Create workflow status enum
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'archived');

-- Create workflow instance status enum
CREATE TYPE workflow_instance_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected', 'cancelled');

-- Create task status enum
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- Create approval status enum
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create node type enum
CREATE TYPE node_type AS ENUM ('start', 'task', 'approval', 'condition', 'automation', 'end');

-- Workflows table - stores workflow definitions
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  flow_data JSONB NOT NULL, -- stores the node graph structure
  status workflow_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow instances - running instances of workflows
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  status workflow_instance_status NOT NULL DEFAULT 'pending',
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  current_node_id TEXT, -- tracks which node is currently active
  context_data JSONB, -- stores workflow variables and state
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow tasks - individual tasks within instances
CREATE TABLE workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  status task_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow approvals - approval records
CREATE TABLE workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  task_id UUID REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  title TEXT NOT NULL,
  approver_id UUID REFERENCES auth.users(id),
  status approval_status NOT NULL DEFAULT 'pending',
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Users can view all workflows"
  ON workflows FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own workflows"
  ON workflows FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own workflows"
  ON workflows FOR DELETE
  USING (auth.uid() = created_by);

-- Workflow instances policies
CREATE POLICY "Users can view workflow instances they started"
  ON workflow_instances FOR SELECT
  USING (auth.uid() = started_by);

CREATE POLICY "Users can create workflow instances"
  ON workflow_instances FOR INSERT
  WITH CHECK (auth.uid() = started_by);

CREATE POLICY "Users can update workflow instances they started"
  ON workflow_instances FOR UPDATE
  USING (auth.uid() = started_by);

-- Workflow tasks policies
CREATE POLICY "Users can view tasks assigned to them or created by them"
  ON workflow_tasks FOR SELECT
  USING (
    auth.uid() = assigned_to OR 
    auth.uid() IN (SELECT started_by FROM workflow_instances WHERE id = instance_id)
  );

CREATE POLICY "System can create tasks"
  ON workflow_tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Assigned users can update their tasks"
  ON workflow_tasks FOR UPDATE
  USING (auth.uid() = assigned_to);

-- Workflow approvals policies
CREATE POLICY "Users can view approvals assigned to them"
  ON workflow_approvals FOR SELECT
  USING (auth.uid() = approver_id);

CREATE POLICY "System can create approvals"
  ON workflow_approvals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Approvers can update their approvals"
  ON workflow_approvals FOR UPDATE
  USING (auth.uid() = approver_id);

-- Indexes for performance
CREATE INDEX idx_workflows_created_by ON workflows(created_by);
CREATE INDEX idx_workflow_instances_workflow_id ON workflow_instances(workflow_id);
CREATE INDEX idx_workflow_instances_started_by ON workflow_instances(started_by);
CREATE INDEX idx_workflow_tasks_instance_id ON workflow_tasks(instance_id);
CREATE INDEX idx_workflow_tasks_assigned_to ON workflow_tasks(assigned_to);
CREATE INDEX idx_workflow_approvals_instance_id ON workflow_approvals(instance_id);
CREATE INDEX idx_workflow_approvals_approver_id ON workflow_approvals(approver_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflows_timestamp
BEFORE UPDATE ON workflows
FOR EACH ROW
EXECUTE FUNCTION update_workflows_updated_at();