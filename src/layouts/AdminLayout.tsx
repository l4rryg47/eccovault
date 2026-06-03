import { Outlet, Navigate, NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, ArrowLeftRight,
  CreditCard, Wallet, Shield, LogOut, Menu, X, MessageSquare, Settings, Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Overview",      icon: LayoutDashboard, path: "/admin"              },
  { label: "Users",         icon: Users,           path: "/admin/users"        },
  { label: "Transactions",  icon: ArrowLeftRight,  path: "/admin/transactions" },
  { label: "Transfer Reviews", icon: Clock,        path: "/admin/transfer-reviews" },
  { label: "Card Payments", icon: CreditCard,      path: "/admin/payments"     },
  { label: "Accounts",      icon: Wallet,          path: "/admin/accounts"     },
    { label: "Support",       icon: MessageSquare,   path: "/admin/support"      },
    { label: "Settings",      icon: Settings,        path: "/admin/settings"     },
];

const AdminLayout = () => {
  const { user, profile, loading, logout } = useAuth();
  const { data: isAdmin, isLoading: adminChecking } = useIsAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Session timeout — signs out after 10 min of inactivity ──
  useSessionTimeout();

  if (loading || adminChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <Shield size={28} className="text-destructive" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This area is restricted to administrators. Contact your system administrator to request access.
        </p>
        <NavLink to="/dashboard" className="mt-2 text-sm text-primary hover:underline">
          ← Back to Dashboard
        </NavLink>
      </div>
    );
  }

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Admin";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-border/30 bg-background transition-all duration-200 ${
        sidebarOpen ? "w-56" : "w-14"
      }`}>
        <div className="flex h-14 items-center justify-between px-4 border-b border-border/30">
          {sidebarOpen && (
            <span className="font-display text-base font-bold text-foreground">
              Eccovault <span className="text-xs font-normal text-primary">ADMIN</span>
            </span>
          )}
          <button onClick={() => setSidebarOpen((v) => !v)}
            className="ml-auto text-muted-foreground hover:text-foreground">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2 pt-4">
          {navItems.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border/30 p-2 pb-4 space-y-1">
          {sidebarOpen && (
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <button onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <LogOut size={16} className="shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b border-border/30 px-6">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

