import { Button } from "@/components/ui/button";
import { Bot, LayoutDashboard, Settings, Plus, LogOut, Menu, GitBranch } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: "/generator", label: "Create Assistant", icon: <Plus className="w-5 h-5" /> },
    { path: "/workflows", label: "Workflows", icon: <GitBranch className="w-5 h-5" /> },
    { path: "/settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 border-r bg-card flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-gradient">BizAssistAI</span>
          </div>
          <p className="text-sm text-muted-foreground">AI-Powered Support</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              variant={location.pathname === item.path ? "default" : "ghost"}
              className="w-full justify-start"
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-destructive">
            <LogOut className="w-5 h-5" />
            <span className="ml-3">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 w-full z-50 bg-card border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">BizAssistAI</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t p-4 space-y-2 bg-card">
            {navItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                variant={location.pathname === item.path ? "default" : "ghost"}
                className="w-full justify-start"
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </Button>
            ))}
            <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-destructive">
              <LogOut className="w-5 h-5" />
              <span className="ml-3">Logout</span>
            </Button>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="md:ml-64 pt-20 md:pt-0 p-6 md:p-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
