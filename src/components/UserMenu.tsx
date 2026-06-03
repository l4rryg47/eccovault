import { useNavigate } from "react-router-dom";
import { ChevronDown, User, LogOut } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Header user box: avatar circle + name + dropdown arrow.
const UserMenu = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = profile?.avatar_url ?? undefined;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full border border-border/50 bg-muted/30 py-1 pl-1 pr-2.5 transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <Avatar className="h-8 w-8">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" /> : null}
          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-[10rem] truncate text-sm font-medium text-foreground">
          {displayName}
        </span>
        <ChevronDown size={15} className="text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
          <User size={14} className="mr-2" /> My Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut size={14} className="mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
