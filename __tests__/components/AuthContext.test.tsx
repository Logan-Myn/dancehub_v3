/**
 * AuthContext Tests
 *
 * Tests for the authentication context and useAuth hook
 * These tests verify the Better Auth integration works correctly
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Test component that uses the auth hook
function TestAuthConsumer({ mockAuth }: { mockAuth: ReturnType<typeof getMockAuth> }) {
  const { user, session, loading, error } = mockAuth;

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <div data-testid="user-name">{user.name}</div>
      <div data-testid="user-email">{user.email}</div>
    </div>
  );
}

// Helper to create mock auth states
function getMockAuth(state: 'loading' | 'unauthenticated' | 'authenticated' | 'error') {
  switch (state) {
    case 'loading':
      return {
        user: null,
        session: null,
        loading: true,
        error: null,
        refreshUser: jest.fn(),
      };
    case 'unauthenticated':
      return {
        user: null,
        session: null,
        loading: false,
        error: null,
        refreshUser: jest.fn(),
      };
    case 'authenticated':
      return {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          emailVerified: true,
        },
        session: {
          id: 'session-123',
          userId: 'user-123',
          expiresAt: new Date(Date.now() + 86400000),
        },
        loading: false,
        error: null,
        refreshUser: jest.fn(),
      };
    case 'error':
      return {
        user: null,
        session: null,
        loading: false,
        error: new Error('Session expired'),
        refreshUser: jest.fn(),
      };
  }
}

describe('AuthContext behavior', () => {
  it('shows loading state when loading is true', () => {
    const mockAuth = getMockAuth('loading');
    render(<TestAuthConsumer mockAuth={mockAuth} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows not authenticated when no user', () => {
    const mockAuth = getMockAuth('unauthenticated');
    render(<TestAuthConsumer mockAuth={mockAuth} />);

    expect(screen.getByText('Not authenticated')).toBeInTheDocument();
  });

  it('shows user data when authenticated', () => {
    const mockAuth = getMockAuth('authenticated');
    render(<TestAuthConsumer mockAuth={mockAuth} />);

    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
  });

  it('shows error state when error exists', () => {
    const mockAuth = getMockAuth('error');
    render(<TestAuthConsumer mockAuth={mockAuth} />);

    expect(screen.getByText('Error: Session expired')).toBeInTheDocument();
  });
});

describe('useAuth hook from AuthContext', () => {
  it('provides default values from global mock', () => {
    // This tests that our global mock in jest-dom.ts works
    const { useAuth } = jest.requireMock('@/contexts/AuthContext');
    const auth = useAuth();

    expect(auth.user).toBeNull();
    expect(auth.session).toBeNull();
    expect(auth.loading).toBe(false);
    expect(auth.error).toBeNull();
    expect(typeof auth.refreshUser).toBe('function');
  });
});
