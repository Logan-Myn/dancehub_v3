import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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

async function getCommunities() {
  const supabase = createServerComponentClient({ cookies });
  const { data: communities, error } = await supabase
    .from("communities")
    .select("id, name, slug")
    .order("name");

  if (error) {
    console.error("Error fetching communities:", error);
    return [];
  }

  return communities;
}

async function getThreads(communityId?: string) {
  const supabase = createServerComponentClient({ cookies });

  // Fetch threads
  let query = supabase
    .from("threads")
    .select("*, comments_count")
    .order("created_at", { ascending: false });

  if (communityId && communityId !== "all") {
    query = query.eq("community_id", communityId);
  }

  const { data: threads, error } = await query;

  if (error) {
    console.error("Error fetching threads:", error);
    return [];
  }

  // Get additional data for each thread
  const threadsWithDetails = await Promise.all(
    (threads || []).map(async (thread) => {
      const [
        { data: communityData },
        { data: authorData },
        { count: reportsCount }
      ] = await Promise.all([
        supabase
          .from("communities")
          .select("name, slug")
          .eq("id", thread.community_id)
          .single(),
        supabase
          .from("profiles")
          .select("full_name, email, avatar_url")
          .eq("id", thread.created_by)
          .single(),
        supabase
          .from("thread_reports")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", thread.id),
      ]);

      return {
        ...thread,
        community: communityData || { name: "Unknown", slug: "" },
        author: authorData || { full_name: "Unknown", email: "", avatar_url: "" },
        reports_count: reportsCount || 0,
        replies_count: thread.comments_count || 0,
      };
    })
  );

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