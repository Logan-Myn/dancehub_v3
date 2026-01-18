import '@testing-library/jest-dom';
import React from 'react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image - use createElement instead of JSX
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    return React.createElement('img', {
      ...props,
      alt: props.alt as string,
    });
  },
}));

// Mock AuthContext - default to unauthenticated state
// Individual tests can override this mock
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    error: null,
    refreshUser: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
