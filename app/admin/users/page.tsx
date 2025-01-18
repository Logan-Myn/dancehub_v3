import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ban, CheckCircle, MoreVertical } from "lucide-react";

async function getUsers() {
  const supabase = createServerComponentClient({ cookies });
  
  // Fetch basic user profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  // Fetch counts separately
  const usersWithCounts = await Promise.all(
    (profiles || []).map(async (user) => {
      const [{ count: createdCount }, { count: joinedCount }] = await Promise.all([
        supabase
          .from('communities')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id),
        supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
      ]);

      return {
        ...user,
        created_communities: { count: createdCount || 0 },
        joined_communities: { count: joinedCount || 0 }
      };
    })
  );

  return usersWithCounts;
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search users..."
            className="w-[300px]"
          />
          <Button>Export</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Communities</TableHead>
              <TableHead className="text-right">Memberships</TableHead>
              <TableHead className="text-right">Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {user.full_name?.charAt(0) || user.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.display_name}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.is_admin ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        <CheckCircle className="h-3 w-3" /> Admin
                      </span>
                    ) : user.banned_until ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                        <Ban className="h-3 w-3" /> Banned
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {user.created_communities.count || 0}
                </TableCell>
                <TableCell className="text-right">
                  {user.joined_communities.count || 0}
                </TableCell>
                <TableCell className="text-right">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 