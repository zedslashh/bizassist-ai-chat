import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, GitBranch, Zap, Play } from 'lucide-react';

interface NodeToolbarProps {
  onAddNode: (type: string, label: string, icon: any) => void;
}

export function NodeToolbar({ onAddNode }: NodeToolbarProps) {
  const nodeTypes = [
    { type: 'task', label: 'Task', icon: FileText, color: 'bg-blue-500' },
    { type: 'approval', label: 'Approval', icon: CheckCircle2, color: 'bg-green-500' },
    { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-yellow-500' },
    { type: 'automation', label: 'Automation', icon: Zap, color: 'bg-purple-500' },
    { type: 'end', label: 'End', icon: Play, color: 'bg-red-500' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {nodeTypes.map(({ type, label, icon: Icon, color }) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          onClick={() => onAddNode(type, label, Icon)}
          className="gap-2"
        >
          <div className={`w-3 h-3 rounded-full ${color}`} />
          {label}
        </Button>
      ))}
    </div>
  );
}
