'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CourseFiltersProps {
  communities: {
    id: string;
    name: string;
  }[];
}

export function CourseFilters({ communities }: CourseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleCommunityChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('community');
    } else {
      params.set('community', value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-4">
      <select 
        className="h-10 rounded-md border border-input bg-background px-3 py-2"
        defaultValue={searchParams.get('community') || 'all'}
        onChange={(e) => handleCommunityChange(e.target.value)}
      >
        <option value="all">All Communities</option>
        {communities.map((community) => (
          <option key={community.id} value={community.id}>
            {community.name}
          </option>
        ))}
      </select>
      <Input placeholder="Search courses..." className="w-[300px]" />
      <Button>Export</Button>
    </div>
  );
} 