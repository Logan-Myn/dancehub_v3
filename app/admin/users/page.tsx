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
import DeleteUserButton from '@/components/admin/delete-user-button';

type Community = {
  name: string;
  slug: string;
};

type UserWithCommunities = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  banned_until: string | null;
  created_at: string;
  created_communities: Community[];
  joined_communities: Community[];
};

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

  // Fetch communities data separately
  const usersWithCommunities = await Promise.all(
    (profiles || []).map(async (user) => {
      const [{ data: createdCommunities }, { data: joinedCommunities }] = await Promise.all([
        supabase
          .from('communities')
          .select('name, slug')
          .eq('created_by', user.id),
        supabase
          .from('community_members')
          .select('communities(name, slug)')
          .eq('user_id', user.id)
      ]);

      return {
        ...user,
        created_communities: createdCommunities || [],
        joined_communities: joinedCommunities?.map(item => item.communities) || []
      };
    })
  );

  return usersWithCommunities;
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
              <TableHead>Created Communities</TableHead>
              <TableHead>Member Of</TableHead>
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
                <TableCell>
                  <div className="max-w-[200px] space-y-1">
                    {user.created_communities.map((community: Community, index: number) => (
                      <a
                        key={index}
                        href={`/community/${community.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm truncate hover:text-primary hover:underline"
                      >
                        {community.name}
                      </a>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] space-y-1">
                    {user.joined_communities.map((community: Community, index: number) => (
                      <a
                        key={index}
                        href={`/community/${community.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm truncate hover:text-primary hover:underline"
                      >
                        {community.name}
                      </a>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DeleteUserButton userId={user.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 