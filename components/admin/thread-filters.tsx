'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Community = {
  id: string;
  name: string;
  slug: string;
};

export function ThreadFilters({ communities }: { communities: Community[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCommunity = searchParams.get('community') || 'all';

  const onCommunityChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('community');
    } else {
      params.set('community', value);
    }
    router.push(`/admin/threads?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-4">
      <Select value={currentCommunity} onValueChange={onCommunityChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter by Community" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Communities</SelectItem>
          {communities.map((community) => (
            <SelectItem key={community.id} value={community.id}>
              {community.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input placeholder="Search threads..." className="w-[300px]" />
      <Button>Export</Button>
    </div>
  );
} 