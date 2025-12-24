import { describe, it, expect } from 'vitest';
import { getSavaraSystemInstruction } from './savaraLogic';

describe('getSavaraSystemInstruction', () => {
  const baseInstruction = "Instrucción base";
  const userName = "Juan";
  const items: any[] = [];
  const rates = { USD: 35.5, EUR: 38.2 };

  it('should include marketing KB', () => {
    const license = { tier: 'trial', expiresAt: null, isPremium: false };
    const result = getSavaraSystemInstruction(baseInstruction, userName, items, rates, license);
    expect(result).toContain('### CONOCIMIENTO DE PRODUCTO (CalculaTú) ###');
    expect(result).toContain('Savara Pro');
  });

  it('should mention trial remaining days and suggest Plan Lifetime if near expiry', () => {
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const license = { tier: 'trial', expiresAt: twoDaysFromNow, isPremium: false };
    const result = getSavaraSystemInstruction(baseInstruction, userName, items, rates, license);
    
    expect(result).toContain('Le quedan 2 días de prueba gratuita');
    expect(result).toContain('sugiere sutilmente que el Plan Lifetime es la mejor inversión');
  });

  it('should report PREMIUM status correctly', () => {
    const license = { tier: 'pro', expiresAt: null, isPremium: true };
    const result = getSavaraSystemInstruction(baseInstruction, userName, items, rates, license);
    
    expect(result).toContain('Estatus: PREMIUM (Pro)');
  });
});