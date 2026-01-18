import { sql } from '@/lib/db';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, MessageCircle, Flag, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThreadFilters } from "@/components/admin/thread-filters";
import { DeleteThreadButton } from "@/components/admin/delete-thread-button";

type Thread = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  community_id: string;
  created_by: string;
  is_hidden: boolean;
  reports_count: number;
  replies_count: number;
  community: {
    name: string;
    slug: string;
  };
  author: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
};

type Community = {
  id: string;
  name: string;
  slug: string;
};

async function getCommunities(): Promise<Community[]> {
  const communities = await sql`
    SELECT id, name, slug
    FROM communities
    ORDER BY name
  ` as Community[];

  return communities || [];
}

async function getThreads(communityId?: string): Promise<Thread[]> {
  // Build the base query
  let threads;
  if (communityId && communityId !== 'all') {
    threads = await sql`
      SELECT id, title, content, created_at, community_id, created_by, is_hidden, comments_count
      FROM threads
      WHERE community_id = ${communityId}
      ORDER BY created_at DESC
    ` as { id: string; title: string; content: string; created_at: string; community_id: string; created_by: string; is_hidden: boolean; comments_count: number }[];
  } else {
    threads = await sql`
      SELECT id, title, content, created_at, community_id, created_by, is_hidden, comments_count
      FROM threads
      ORDER BY created_at DESC
    ` as { id: string; title: string; content: string; created_at: string; community_id: string; created_by: string; is_hidden: boolean; comments_count: number }[];
  }

  if (!threads || threads.length === 0) {
    return [];
  }

  // Get unique community IDs and author IDs
  const communityIds = Array.from(new Set(threads.map(t => t.community_id)));
  const authorIds = Array.from(new Set(threads.map(t => t.created_by)));
  const threadIds = threads.map(t => t.id);

  // Fetch all communities, authors, and report counts in parallel
  const [communities, authors, reportCounts] = await Promise.all([
    sql`
      SELECT id, name, slug
      FROM communities
      WHERE id = ANY(${communityIds})
    `,
    sql`
      SELECT auth_user_id, full_name, email, avatar_url
      FROM profiles
      WHERE auth_user_id = ANY(${authorIds})
    `,
    sql`
      SELECT thread_id, COUNT(*) as count
      FROM thread_reports
      WHERE thread_id = ANY(${threadIds})
      GROUP BY thread_id
    `
  ]) as [
    { id: string; name: string; slug: string }[],
    { auth_user_id: string; full_name: string; email: string; avatar_url: string }[],
    { thread_id: string; count: number }[]
  ];

  // Create lookup maps
  const communityMap = new Map(communities.map(c => [c.id, c]));
  const authorMap = new Map(authors.map(a => [a.auth_user_id, a]));
  const reportCountMap = new Map(reportCounts.map(r => [r.thread_id, Number(r.count)]));

  // Build the final result
  const threadsWithDetails = threads.map(thread => ({
    ...thread,
    community: communityMap.get(thread.community_id) || { name: "Unknown", slug: "" },
    author: authorMap.get(thread.created_by) || { full_name: "Unknown", email: "", avatar_url: "" },
    reports_count: reportCountMap.get(thread.id) || 0,
    replies_count: thread.comments_count || 0,
  }));

  return threadsWithDetails;
}

export default async function ThreadsPage({
  searchParams,
}: {
  searchParams: { community?: string };
}) {
  const [communities, threads] = await Promise.all([
    getCommunities(),
    getThreads(searchParams.community),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Thread Moderation</h2>
        <ThreadFilters communities={communities} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thread</TableHead>
              <TableHead>Community</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {threads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No threads found
                </TableCell>
              </TableRow>
            ) : (
              threads.map((thread: Thread) => (
                <TableRow key={thread.id}>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <div className="font-medium truncate">{thread.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {thread.content}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/${thread.community.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {thread.community.name}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={thread.author.avatar_url || undefined} />
                        <AvatarFallback>
                          {thread.author.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {thread.author.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {thread.author.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{thread.replies_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      <span>{thread.reports_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={thread.is_hidden ? "destructive" : "secondary"}
                    >
                      {thread.is_hidden ? "Hidden" : "Visible"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Date(thread.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Thread
                        </DropdownMenuItem>
                        <DeleteThreadButton
                          threadId={thread.id}
                          threadTitle={thread.title}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
