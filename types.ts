export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface ChatState {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
}

export enum PricingTier {
  FREE = 'FREE',
  PRO = 'PRO'
}

export interface ShoppingItem {
  id: string;
  name: string;
  price: number;
  currency: 'USD' | 'EUR' | 'VES';
  quantity: number;
}

export type ViewState = 'landing' | 'calculator';