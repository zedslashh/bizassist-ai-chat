import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Play, Plus, FileText, CheckCircle2, GitBranch, Zap } from 'lucide-react';
import { NodeToolbar } from '@/components/workflow/NodeToolbar';
import { WorkflowNode } from '@/components/workflow/WorkflowNode';

const nodeTypes = {
  custom: WorkflowNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'custom',
    position: { x: 250, y: 50 },
    data: { 
      label: 'Start', 
      nodeType: 'start',
      icon: Play,
    },
  },
];

export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadWorkflow(id);
    }
  }, [id]);

  const loadWorkflow = async (workflowId: string) => {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      toast.error('Failed to load workflow');
      return;
    }

    if (data) {
      setWorkflowName(data.name);
      setWorkflowDescription(data.description || '');
      const flowData = data.flow_data as any;
      if (flowData.nodes) setNodes(flowData.nodes);
      if (flowData.edges) setEdges(flowData.edges);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const addNode = (nodeType: string, label: string, icon: any) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'custom',
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
      data: { 
        label, 
        nodeType,
        icon,
        description: '',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const saveWorkflow = async () => {
    setSaving(true);
    const flowData = { nodes, edges };
    
    const workflowData = {
      name: workflowName,
      description: workflowDescription,
      flow_data: flowData as any,
      status: 'draft' as const,
    };

    try {
      if (id) {
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', id);
        
        if (error) throw error;
        toast.success('Workflow saved successfully');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please log in to save workflows');
          navigate('/auth');
          return;
        }

        const { data, error } = await supabase
          .from('workflows')
          .insert({ ...workflowData, created_by: user.id })
          .select()
          .single();
        
        if (error) throw error;
        toast.success('Workflow created successfully');
        navigate(`/workflows/${data.id}`);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const executeWorkflow = async () => {
    if (!id) {
      toast.error('Please save the workflow first');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to execute workflows');
        return;
      }

      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: { workflow_id: id }
      });

      if (error) throw error;
      toast.success('Workflow started successfully');
      navigate(`/workflow-instances/${data.instance_id}`);
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast.error('Failed to start workflow');
    }
  };

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col">
        <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 max-w-2xl">
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-xl font-semibold mb-2"
                placeholder="Workflow Name"
              />
              <Input
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="Description (optional)"
              />
            </div>
            <div className="flex gap-2 ml-4">
              <Button onClick={saveWorkflow} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button onClick={executeWorkflow} variant="default">
                <Play className="w-4 h-4 mr-2" />
                Run
              </Button>
            </div>
          </div>
          
          <NodeToolbar onAddNode={addNode} />
        </div>

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </DashboardLayout>
  );
}
