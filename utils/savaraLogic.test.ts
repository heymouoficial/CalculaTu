import { describe, it, expect } from 'vitest';
import { getSavaraSystemInstruction } from './savaraLogic';
import { ShoppingItem } from '../types';

describe('getSavaraSystemInstruction', () => {
  const baseInstruction = "Eres un asistente útil.";
  const rates = { USD: 50, EUR: 55 };

  it('should include the user name when provided', () => {
    const userName = "Carlos";
    const items: ShoppingItem[] = [];
    
    const result = getSavaraSystemInstruction(baseInstruction, userName, items, rates);
    
    expect(result).toContain(baseInstruction);
    expect(result).toContain("El usuario se llama Carlos");
  });

  it('should include the current shopping cart items', () => {
    const userName = "Carlos";
    const items: ShoppingItem[] = [
      { id: '1', name: 'Harina PAN', price: 1.5, currency: 'USD', quantity: 2 },
      { id: '2', name: 'Queso', price: 5, currency: 'USD', quantity: 1 }
    ];
    
    const result = getSavaraSystemInstruction(baseInstruction, userName, items, rates);
    
    expect(result).toContain("Harina PAN");
    expect(result).toContain("Queso");
    expect(result).toContain("1.5");
    expect(result).toContain("5");
    expect(result).toContain("Contenido actual del carrito:"); // We expect this header
  });

  it('should mention the current exchange rates', () => {
     const userName = "Carlos";
     const items: ShoppingItem[] = [];
     
     const result = getSavaraSystemInstruction(baseInstruction, userName, items, rates);

     expect(result).toContain("Tasas de cambio:");
     expect(result).toContain("USD: 50");
     expect(result).toContain("EUR: 55");
  });
});
