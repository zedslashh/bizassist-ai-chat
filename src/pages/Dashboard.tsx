import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, MessageSquare, Languages, UserCog, Plus, BarChart3, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";

const Dashboard = () => {
  const navigate = useNavigate();

  // Mock data - in real app, fetch from API
  const stats = {
    totalMessages: 1247,
    englishMessages: 823,
    tamilMessages: 424,
    escalatedToAgent: 89,
    avgResponseTime: "2.3s",
    satisfactionRate: 94,
  };

  const recentActivity = [
    { id: 1, type: "tamil", message: "Product inquiry", time: "2 min ago", escalated: false },
    { id: 2, type: "english", message: "Shipping question", time: "5 min ago", escalated: false },
    { id: 3, type: "tamil", message: "Return request", time: "12 min ago", escalated: true },
    { id: 4, type: "english", message: "Technical support", time: "18 min ago", escalated: false },
    { id: 5, type: "english", message: "Billing inquiry", time: "23 min ago", escalated: true },
  ];

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
                  <span className="text-sm text-muted-foreground">66%</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "66%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Tamil</span>
                  <span className="text-sm text-muted-foreground">34%</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-info rounded-full" style={{ width: "34%" }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Performance Metrics</h3>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Avg Response Time</span>
                  <span className="text-2xl font-bold text-success">{stats.avgResponseTime}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Satisfaction Rate</span>
                  <span className="text-2xl font-bold text-success">{stats.satisfactionRate}%</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: `${stats.satisfactionRate}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-6">Recent Activity</h3>
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
