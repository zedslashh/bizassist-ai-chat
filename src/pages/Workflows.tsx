import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Play, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function Workflows() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Workflow deleted');
      loadWorkflows();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-500',
      active: 'bg-green-500',
      archived: 'bg-yellow-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Workflows</h1>
            <p className="text-muted-foreground">
              Create and manage your business process workflows
            </p>
          </div>
          <Button onClick={() => navigate('/workflows/new')} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Play className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first workflow to get started
              </p>
              <Button onClick={() => navigate('/workflows/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{workflow.name}</CardTitle>
                    <Badge className={getStatusColor(workflow.status)}>
                      {workflow.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {workflow.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    Updated {formatDistanceToNow(new Date(workflow.updated_at))} ago
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/workflows/${workflow.id}`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWorkflow(workflow.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
