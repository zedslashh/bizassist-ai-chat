import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface NodeData {
  label: string;
  nodeType: string;
  icon: LucideIcon;
  description?: string;
}

export const WorkflowNode = memo(({ data }: NodeProps<NodeData>) => {
  const Icon = data.icon;
  
  const getNodeColor = (type: string) => {
    const colors = {
      start: 'bg-blue-500',
      task: 'bg-blue-500',
      approval: 'bg-green-500',
      condition: 'bg-yellow-500',
      automation: 'bg-purple-500',
      end: 'bg-red-500',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  const showTopHandle = data.nodeType !== 'start';
  const showBottomHandle = data.nodeType !== 'end';

  return (
    <>
      {showTopHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-primary"
        />
      )}
      
      <Card className="p-4 min-w-[180px] shadow-lg border-2 hover:border-primary transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${getNodeColor(data.nodeType)} flex items-center justify-center text-white`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm">{data.label}</div>
            {data.description && (
              <div className="text-xs text-muted-foreground mt-1">
                {data.description}
              </div>
            )}
          </div>
        </div>
      </Card>

      {showBottomHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-primary"
        />
      )}
    </>
  );
});

WorkflowNode.displayName = 'WorkflowNode';
