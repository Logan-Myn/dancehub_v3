import http from 'k6/http';
import { sleep, check } from 'k6';

// Configuration
const BASE_URL = 'http://localhost:3000';
const ENDPOINT = '/api/community/plop/threads';

// Test scenarios
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 10 users
    { duration: '1m', target: 20 },   // Stay at 10 users
    { duration: '30s', target: 0 },  // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

// Main test function
export default function() {
  // Make the request with all required headers
  const response = http.get(`${BASE_URL}${ENDPOINT}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6Ijhmam5yYTA4aEdqbjVobi8iLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3Jtbm5keG5qemFjZmhyYml4eGZvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlMzk4NjViZC00YmEzLTQ3MjctOTdkMi0xNTJmMTJkMTI2ZWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM3OTg2OTcwLCJpYXQiOjE3Mzc5ODMzNzAsImVtYWlsIjoibG9nYW4ubW95b24xNUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6Imdvb2dsZSIsInByb3ZpZGVycyI6WyJnb29nbGUiXX0sInVzZXJfbWV0YWRhdGEiOnsiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pHNGRnTHF1T1Qwa2NFaHZ5WnJBY0lsQmNRaC1Da3FCM1JWUlBrZ21Kd3pSQjA9czk2LWMiLCJlbWFpbCI6ImxvZ2FuLm1veW9uMTVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkxvZ2FuIE1veW9uIiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwibmFtZSI6IkxvZ2FuIE1veW9uIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jSkc0ZGdMcXVPVDBrY0VodnlackFjSWxCY1FoLUNrcUIzUlZSUGtnbUp3elJCMD1zOTYtYyIsInByb3ZpZGVyX2lkIjoiMTA3MDk3NDAyNjQ5MjYxMTc5MTU1Iiwic3ViIjoiMTA3MDk3NDAyNjQ5MjYxMTc5MTU1In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3Mzc1NTU0NjZ9XSwic2Vzc2lvbl9pZCI6IjA3ODdmYzdmLTc5MDAtNGUzOC1hZjFhLTA1MTE4ZjNhZmE0YSIsImlzX2Fub255bW91cyI6ZmFsc2V9.t307OOtgTYHZc-iVcGIUPE8r7ywV9G2AuAewGxb6xXQ',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/`
    },
  });

  // Check the response
  check(response, {
    'is status 200': (r) => r.status === 200,
    'has valid response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch (e) {
        console.log('Response parsing failed:', e.message);
        console.log('Response status:', r.status);
        console.log('Response body:', r.body.slice(0, 200));
        return false;
      }
    },
  });

  // Wait between requests
  sleep(1);
} 
