import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandDock } from './CommandDock';
import { describe, it, expect, vi } from 'vitest';

describe('CommandDock', () => {
  const defaultProps = {
    quantity: '1',
    name: '',
    price: '',
    currency: 'USD' as const,
    onQuantityChange: vi.fn(),
    onNameChange: vi.fn(),
    onPriceChange: vi.fn(),
    onCurrencyCycle: vi.fn(),
    onAdd: vi.fn(),
    isValid: false,
  };

  it('renders fixed at the bottom', () => {
    const { container } = render(<CommandDock {...defaultProps} />);
    const dock = container.firstChild as HTMLElement;
    expect(dock).toHaveClass('fixed');
    expect(dock).toHaveClass('bottom-0');
  });

  it('displays input fields for quantity, name, and price', () => {
    render(<CommandDock {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Cant/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nombre/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/0.00/)).toBeInTheDocument();
  });

  it('renders the currency toggle with current currency', () => {
    render(<CommandDock {...defaultProps} currency="USD" />);
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('calls onAdd when add button is clicked', () => {
    const onAdd = vi.fn();
    render(<CommandDock {...defaultProps} isValid={true} onAdd={onAdd} />);
    const addButton = screen.getByRole('button', { name: /add/i }); // We'll add aria-label="add"
    fireEvent.click(addButton);
    expect(onAdd).toHaveBeenCalled();
  });
  
  it('disables add button when not valid', () => {
    render(<CommandDock {...defaultProps} isValid={false} />);
    const addButton = screen.getByRole('button', { name: /add/i });
    expect(addButton).toBeDisabled();
  });
});
