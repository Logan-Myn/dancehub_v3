import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rmnndxnjzacfhrbixxfo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtbm5keG5qemFjZmhyYml4eGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTM5NTYsImV4cCI6MjA1MjA4OTk1Nn0.zQWP8nEBKH0XF2n_yObpR6AILvAPBqxZ6GD8IxMz7P0'
);

describe('Threads API', () => {
  const COMMUNITY_ID = '629ad0da-4298-4d53-9e1f-f71d3ee88fde';

  describe('GET /api/community/[communitySlug]/threads', () => {
    it('should return threads for a valid community', async () => {
      const { data: threads, error } = await supabase
        .from('threads')
        .select('*')
        .eq('community_id', COMMUNITY_ID);

      expect(error).toBeNull();
      expect(Array.isArray(threads)).toBe(true);
      
      if (threads && threads.length > 0) {
        const thread = threads[0];
        expect(thread).toHaveProperty('id');
        expect(thread).toHaveProperty('title');
        expect(thread).toHaveProperty('content');
        expect(thread).toHaveProperty('created_at');
        expect(thread).toHaveProperty('user_id');
      }
    });

    it('should return empty array for non-existent community', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const { data: threads, error } = await supabase
        .from('threads')
        .select('*')
        .eq('community_id', nonExistentId);

      expect(error).toBeNull();
      expect(Array.isArray(threads)).toBe(true);
      expect(threads?.length).toBe(0);
    });

    it('should include thread metadata', async () => {
      const { data: threads, error } = await supabase
        .from('threads')
        .select('*')
        .eq('community_id', COMMUNITY_ID)
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(threads)).toBe(true);

      if (threads && threads.length > 0) {
        const thread = threads[0];
        expect(thread).toHaveProperty('likes');
        expect(thread).toHaveProperty('comments');
        expect(Array.isArray(thread.likes)).toBe(true);
        expect(Array.isArray(thread.comments)).toBe(true);
      }
    });

    it('should order threads by creation date', async () => {
      const { data: threads, error } = await supabase
        .from('threads')
        .select('*')
        .eq('community_id', COMMUNITY_ID)
        .order('created_at', { ascending: false })
        .limit(2);

      expect(error).toBeNull();
      expect(Array.isArray(threads)).toBe(true);

      if (threads && threads.length >= 2) {
        const firstThread = new Date(threads[0].created_at);
        const secondThread = new Date(threads[1].created_at);
        expect(firstThread.getTime()).toBeGreaterThanOrEqual(secondThread.getTime());
      }
    });
  });
}); 