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

export type SavaraAction = 'ADD_ITEM' | 'REMOVE_ITEM' | 'CLEAR_CART' | 'SUMMARIZE_CART' | 'TALK';

export interface SavaraIntent {
  action: SavaraAction;
  itemName?: string;
  price?: number;
  currency?: 'USD' | 'EUR' | 'VES';
  quantity?: number;
  id?: string;
  text?: string; // For the 'TALK' action or AI commentary
}

export type ViewState = 'landing' | 'calculator' | 'portal';

export interface ExchangeRate {
  USD: number;
  EUR: number;
  prevUSD?: number;
  prevEUR?: number;
  updatedAt?: string | null;
}