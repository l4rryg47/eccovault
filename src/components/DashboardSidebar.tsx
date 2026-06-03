import {
  LayoutDashboard, Wallet, ArrowLeftRight,
  CreditCard, PiggyBank, TrendingUp, Send,
  Settings, LogOut, ArrowDownLeft, Shield,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Overview",     url: "/dashboard",              icon: LayoutDashboard },
  { title: "Accounts",     url: "/dashboard/accounts",     icon: Wallet },
  { title: "Transactions", url: "/dashboard/transactions", icon: ArrowLeftRight },
  { title: "Cards",        url: "/dashboard/cards",        icon: CreditCard },
  { title: "Savings",      url: "/dashboard/savings",      icon: PiggyBank },
  { title: "Investments",  url: "/dashboard/investments",  icon: TrendingUp },
  { title: "Send Money",   url: "/dashboard/transfer",     icon: Send },
  { title: "Deposit",      url: "/dashboard/deposit",      icon: ArrowDownLeft },
];

export function DashboardSidebar() {
  const { state }   = useSidebar();
  const collapsed   = state === "collapsed";
  const { user, profile, logout } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30">
      <SidebarContent>
        <div className="flex h-14 items-center px-4">
          <a href="/" className="font-display text-lg font-bold text-foreground">
            {collapsed ? "E" : <>Eccovault<span className="text-primary">.</span></>}
          </a>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/30 p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <SidebarMenu>
          {/* Admin panel link — only visible to admins */}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/admin"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Admin Panel</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/dashboard/settings"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                activeClassName="bg-primary/10 text-primary font-medium"
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Log Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

