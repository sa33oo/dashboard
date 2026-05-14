export type PaymentKey = '現金' | 'カード' | 'アプリ決済' | '電子マネー' | 'その他';

export type SaleRow = {
  date: string;
  invoiceId: string;
  petId: string;
  itemName: string;
  itemCategory: string;
  amount: number;
  paymentMethod: string;
};

export type PetRow = {
  petId: string;
  species: string;
  breed: string;
  age: number | null;
};

export const CHECK_VALUES = {
  total: 5343337,
  payments: {
    現金: 2317772,
    カード: 2633041,
    アプリ決済: 298265,
    電子マネー: 94259
  }
};

export const toYen = (n: number) => `${n.toLocaleString('ja-JP')}円`;

export const normalizePayment = (raw: string): PaymentKey => {
  const s = (raw || '').toLowerCase();

  if (s.includes('現金') || s.includes('cash')) {
    return '現金';
  }

  if (
    s.includes('カード') ||
    s.includes('credit') ||
    s.includes('visa') ||
    s.includes('master') ||
    s.includes('jcb') ||
    s.includes('amex')
  ) {
    return 'カード';
  }

  if (
    s.includes('アプリ') ||
    s.includes('paypay') ||
    s.includes('line pay') ||
    s.includes('楽天pay') ||
    s.includes('d払い')
  ) {
    return 'アプリ決済';
  }

  if (
    s.includes('電子') ||
    s.includes('交通系') ||
    s.includes('id') ||
    s.includes('quicpay') ||
    s.includes('waon') ||
    s.includes('nanaco')
  ) {
    return '電子マネー';
  }

  return 'その他';
};

export const parseDate = (v: unknown): string => {
  if (typeof v === 'string') {
    return v.slice(0, 10);
  }

  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }

  return '';
};