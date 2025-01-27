import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  // Test configuration
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users over 30 seconds
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
  },
};

const COMMUNITY_ID = '629ad0da-4298-4d53-9e1f-f71d3ee88fde'; // Replace with your community ID
const BASE_URL = 'https://rmnndxnjzacfhrbixxfo.supabase.co/rest/v1';
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtbm5keG5qemFjZmhyYml4eGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTM5NTYsImV4cCI6MjA1MjA4OTk1Nn0.zQWP8nEBKH0XF2n_yObpR6AILvAPBqxZ6GD8IxMz7P0"; // You'll need to add your Supabase anon key here

export default function () {
  const params = {
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    },
  };

  // Test threads endpoint
  const threadsResponse = http.get(
    `${BASE_URL}/threads?select=*&community_id=eq.${COMMUNITY_ID}&order=created_at.desc`,
    params
  );

  // Verify the response
  check(threadsResponse, {
    'threads status was 200': (r) => r.status === 200,
    'threads response has data': (r) => r.json().length > 0,
  });

  // Get user IDs from threads
  const threads = threadsResponse.json();
  const userIds = [...new Set(threads.map(thread => thread.user_id))];

  // Test profiles endpoint
  const profilesResponse = http.get(
    `${BASE_URL}/profiles?select=id,full_name,avatar_url,display_name&id=in.(${userIds.join(',')})`,
    params
  );

  // Verify the profiles response
  check(profilesResponse, {
    'profiles status was 200': (r) => r.status === 200,
    'profiles response has data': (r) => r.json().length > 0,
  });

  sleep(1);
} 