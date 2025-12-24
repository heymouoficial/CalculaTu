import { ShoppingItem } from '../types';

export const getSavaraSystemInstruction = (
  baseInstruction: string,
  userName: string | null,
  items: ShoppingItem[],
  rates: { USD: number; EUR: number }
): string => {
  let contextParts = [baseInstruction];

  // 1. User Identity
  if (userName) {
    contextParts.push(`El usuario se llama ${userName}. Úsalo naturalmente.`);
  }

  // 2. Exchange Rates
  contextParts.push(`Tasas de cambio: USD: ${rates.USD}, EUR: ${rates.EUR}.`);

  // 3. Shopping Cart Context
  if (items.length > 0) {
    const itemsList = items.map(item => 
      `- ${item.name}: ${item.price} ${item.currency} (Cant: ${item.quantity})`
    ).join('\n');
    contextParts.push(`Contenido actual del carrito:\n${itemsList}`);
  } else {
    contextParts.push("El carrito está vacío por ahora.");
  }

  return contextParts.join('\n\n');
};
