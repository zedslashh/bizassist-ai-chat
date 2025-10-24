import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { workflow_id } = await req.json();
    
    // Get workflow definition
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflow_id)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow not found');
    }

    // Create workflow instance
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .insert({
        workflow_id: workflow_id,
        started_by: user.id,
        status: 'in_progress',
        current_node_id: '1', // Start node
        context_data: {},
      })
      .select()
      .single();

    if (instanceError) {
      throw new Error('Failed to create workflow instance');
    }

    console.log('Workflow instance created:', instance.id);

    // Process the workflow flow
    const flowData = workflow.flow_data as any;
    const nodes = flowData.nodes || [];
    const edges = flowData.edges || [];

    // Find start node
    const startNode = nodes.find((n: any) => n.data.nodeType === 'start');
    if (!startNode) {
      throw new Error('No start node found');
    }

    // Find next nodes after start
    const nextEdges = edges.filter((e: any) => e.source === startNode.id);
    
    // Create tasks for next nodes
    for (const edge of nextEdges) {
      const targetNode = nodes.find((n: any) => n.id === edge.target);
      if (!targetNode) continue;

      const nodeType = targetNode.data.nodeType;
      
      if (nodeType === 'task') {
        await supabase.from('workflow_tasks').insert({
          instance_id: instance.id,
          node_id: targetNode.id,
          title: targetNode.data.label,
          description: targetNode.data.description || '',
          assigned_to: user.id, // Default assign to creator
          status: 'pending',
        });
      } else if (nodeType === 'approval') {
        const { data: task } = await supabase.from('workflow_tasks').insert({
          instance_id: instance.id,
          node_id: targetNode.id,
          title: targetNode.data.label,
          description: targetNode.data.description || '',
          assigned_to: user.id,
          status: 'pending',
        }).select().single();

        if (task) {
          await supabase.from('workflow_approvals').insert({
            instance_id: instance.id,
            task_id: task.id,
            node_id: targetNode.id,
            title: targetNode.data.label,
            approver_id: user.id,
            status: 'pending',
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        instance_id: instance.id,
        message: 'Workflow started successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error executing workflow:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
