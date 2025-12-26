import React from 'react';
import { render, screen } from '@testing-library/react';
import { StickyPricingHeader } from './StickyPricingHeader';
import { describe, it, expect } from 'vitest';

describe('StickyPricingHeader', () => {
  it('renders massive totals', () => {
    // Venezuela locale uses comma for decimals
    render(<StickyPricingHeader totalBs={123.45} totalUsd={10.00} rateUsd={12.34} />);
    
    // Check for values formatted (partial match)
    // 123.45 -> "123,45"
    expect(screen.getByText(/123,45/)).toBeInTheDocument();
    expect(screen.getByText(/10.00/)).toBeInTheDocument();
  });

  it('is sticky and has backdrop blur', () => {
    const { container } = render(<StickyPricingHeader totalBs={0} totalUsd={0} rateUsd={0} />);
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('sticky');
    expect(header).toHaveClass('top-0');
    expect(header.className).toMatch(/backdrop-blur/);
  });
});
