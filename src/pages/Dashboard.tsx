import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Languages, UserCog, Plus, BarChart3, TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalMessages: 0,
    englishMessages: 0,
    tamilMessages: 0,
    escalatedToAgent: 0,
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view analytics",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Fetch all messages for the user's conversations
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user.id);

      if (!conversations || conversations.length === 0) {
        setLoading(false);
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Get message statistics
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds);

      if (messages) {
        const englishCount = messages.filter(m => m.language === "english").length;
        const tamilCount = messages.filter(m => m.language === "tamil").length;
        const escalatedCount = messages.filter(m => m.escalated).length;

        setStats({
          totalMessages: messages.length,
          englishMessages: englishCount,
          tamilMessages: tamilCount,
          escalatedToAgent: escalatedCount,
        });

        // Get recent activity (last 10 messages)
        const recent = messages
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
          .map(msg => ({
            id: msg.id,
            type: msg.language,
            message: msg.content.substring(0, 50) + (msg.content.length > 50 ? "..." : ""),
            time: formatTimeAgo(msg.created_at),
            escalated: msg.escalated,
          }));

        setRecentActivity(recent);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const englishPercentage = stats.totalMessages > 0 
    ? Math.round((stats.englishMessages / stats.totalMessages) * 100) 
    : 0;
  const tamilPercentage = stats.totalMessages > 0 
    ? Math.round((stats.tamilMessages / stats.totalMessages) * 100) 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Monitor your AI assistant's performance</p>
          </div>
          <Button 
            onClick={() => navigate("/generator")} 
            className="gradient-primary shadow-lg"
          >
            <Plus className="mr-2 w-4 h-4" /> Create New Assistant
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Messages"
            value={stats.totalMessages.toLocaleString()}
            icon={<MessageSquare className="w-6 h-6" />}
            trend="+12%"
            trendUp={true}
          />
          <StatCard
            title="English Messages"
            value={stats.englishMessages.toLocaleString()}
            icon={<Languages className="w-6 h-6" />}
            trend="+8%"
            trendUp={true}
          />
          <StatCard
            title="Tamil Messages"
            value={stats.tamilMessages.toLocaleString()}
            icon={<Languages className="w-6 h-6" />}
            trend="+18%"
            trendUp={true}
          />
          <StatCard
            title="Escalated to Agent"
            value={stats.escalatedToAgent.toLocaleString()}
            icon={<UserCog className="w-6 h-6" />}
            trend="-5%"
            trendUp={false}
          />
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Language Distribution */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Language Distribution</h3>
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">English</span>
                  <span className="text-sm text-muted-foreground">{englishPercentage}%</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${englishPercentage}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Tamil</span>
                  <span className="text-sm text-muted-foreground">{tamilPercentage}%</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-info rounded-full transition-all" style={{ width: `${tamilPercentage}%` }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Message Statistics</h3>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Total Conversations</span>
                  <span className="text-2xl font-bold">{stats.totalMessages}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Escalation Rate</span>
                  <span className="text-2xl font-bold">
                    {stats.totalMessages > 0 
                      ? Math.round((stats.escalatedToAgent / stats.totalMessages) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-warning rounded-full transition-all" 
                    style={{ 
                      width: `${stats.totalMessages > 0 ? (stats.escalatedToAgent / stats.totalMessages) * 100 : 0}%` 
                    }} 
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-6">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No activity yet. Start creating assistants to see analytics!
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    activity.type === "english" ? "bg-primary/10 text-primary" : "bg-info/10 text-info"
                  }`}>
                    <Languages className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{activity.message}</p>
                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
                {activity.escalated && (
                  <div className="px-3 py-1 rounded-full bg-warning/10 text-warning text-sm font-medium">
                    Escalated
                  </div>
                )}
              </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

const StatCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend: string; 
  trendUp: boolean;
}) => (
  <Card className="p-6 hover:shadow-lg transition-all duration-300 animate-fade-in">
    <div className="flex items-start justify-between mb-4">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <span className={`text-sm font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
        {trend}
      </span>
    </div>
    <h3 className="text-sm text-muted-foreground mb-1">{title}</h3>
    <p className="text-3xl font-bold">{value}</p>
  </Card>
);

export default Dashboard;
