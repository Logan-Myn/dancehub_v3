/**
 * Button Component Tests
 *
 * Tests for the reusable Button component with variants
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass('bg-destructive');
  });

  it('renders with outline variant', () => {
    render(<Button variant="outline">Cancel</Button>);

    const button = screen.getByRole('button', { name: /cancel/i });
    expect(button).toHaveClass('border');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-8');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it('renders children correctly', () => {
    render(
      <Button>
        <span data-testid="icon">+</span>
        Add Item
      </Button>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });
});
