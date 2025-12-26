import { ShoppingItem } from '../types';

const MARKETING_KB = `
### CONOCIMIENTO DE PRODUCTO (CalculaTú) ###
- Propósito: Supervivencia financiera en Venezuela.
- Modo Búnker: La app funciona 100% offline. Las tasas se guardan por 24h.
- Savara Pro: Es la inteligencia artificial con la que el usuario habla.
- Beneficios Pro: Entrada de voz, análisis de gastos, gestión de inventario futuro.
- Precios: 
  - Plan Mensual: $2.99 USD.
  - Plan Lifetime: $19.99 USD.
- Soporte: Vía WhatsApp al +58 (multiversa).
`;

export const getSavaraSystemInstruction = (
  baseInstruction: string,
  userName: string | null,
  items: ShoppingItem[],
  rates: { USD: number; EUR: number },
  license: { tier: string; expiresAt: string | null; isPremium: boolean },
  coreStats?: any
): string => {
  let contextParts = [baseInstruction];

  // 1. Mandatory JSON Protocol
  contextParts.push(`
  ### PROTOCOLO DE RESPUESTA OBLIGATORIO ###
  Eres Savara, la asistente Pro de CalculaTú. 
  SIEMPRE responde en JSON con "intent" y "text".
  No hables de ser un modelo de lenguaje. Eres Savara.
  `);

  // 2. Marketing & Context
  contextParts.push(MARKETING_KB);

  // 3. User & License Status
  const status = license.isPremium ? 'PREMIUM (Pro)' : 'TRIAL/FREE';
  const isCreator = userName?.toLowerCase().includes('moisés');

  let licenseInfo = `Usuario: ${userName || 'Invitado'}. Estatus: ${status}.`;

  if (isCreator) {
    contextParts.push(`
    ### RECONOCIMIENTO ESPECIAL ###
    Moisés es tu CREADOR y el arquitecto detrás de Multiversa. 
    Trátalo con la deferencia y el respeto que merece el "Arquitecto Jefe". 
    Si te saluda, puedes reconocerlo como tal de forma sutil y elegante.
    `);
  }

  if (!license.isPremium && license.expiresAt) {
    const daysLeft = Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    licenseInfo += ` Le quedan ${daysLeft} días de prueba gratuita.`;
    if (daysLeft <= 2) {
      contextParts.push("NOTA: El trial está por expirar. Sugiere sutilmente que el Plan Lifetime es la mejor inversión.");
    }
  }
  if (isCreator && coreStats) {
    contextParts.push(`
    ### CORE INTELLIGENCE (SÓLO OJOS DEL ARQUITECTO) ###
     blueprint_status: ${coreStats.systemStatus}
     total_network_users: ${coreStats.totalUsers}
     active_node_contracts: ${coreStats.activeSubscriptions}
     last_synchronizations: ${coreStats.recentActivity.length} nodos detectados.
     platform_version: ${coreStats.platform}
    
    Usa estos datos SOLO si Moisés te pregunta específicamente por el estado del sistema o de Multiversa.
    `);
  }

  contextParts.push(licenseInfo);

  // 4. Exchange Rates
  contextParts.push(`Tasas BCV: USD: ${rates.USD}, EUR: ${rates.EUR}.`);

  // 5. Shopping Cart Context
  if (items.length > 0) {
    const totalVES = items.reduce((acc, item) => {
      let priceInVES = item.price;
      if (item.currency === 'USD') priceInVES *= rates.USD;
      if (item.currency === 'EUR') priceInVES *= rates.EUR;
      return acc + (priceInVES * item.quantity);
    }, 0);

    const itemsList = items.map(item =>
      `- ${item.name}: ${item.price} ${item.currency} (Cant: ${item.quantity})`
    ).join('\n');

    contextParts.push(`Carrito actual:\n${itemsList}\nTotal: ${totalVES.toFixed(2)} VES.`);
  }

  return contextParts.join('\n\n');
};
