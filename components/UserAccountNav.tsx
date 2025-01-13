import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User as UserIcon, Settings } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth";
import toast from "react-hot-toast";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserAccountNavProps {
  user: User;
  profile: Profile | null;
}

export default function UserAccountNav({ user, profile }: UserAccountNavProps) {
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Successfully signed out");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible:outline-none">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || user.user_metadata?.avatar_url} />
          <AvatarFallback className="uppercase">
            {profile?.full_name?.[0] || user.email?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {(profile?.full_name || user.user_metadata?.full_name) && (
              <p className="font-medium">{profile?.full_name || user.user_metadata?.full_name}</p>
            )}
            {user.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserIcon className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
