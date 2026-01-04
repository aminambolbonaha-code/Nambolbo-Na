
export interface MetalData {
  price: number;
  prev_close_price: number;
  ch: number;
  chp: number;
  ask: number;
  bid: number;
  high_price: number;
  low_price: number;
  currency: string;
}

const GOLD_API_URL = 'https://www.goldapi.io/api';
const API_TOKEN = 'goldapi-11kxhqsmjzesgh2-io';

export async function fetchMetalData(ticker: string): Promise<MetalData | null> {
  const symbol = ticker.toUpperCase();
  let pair = '';

  if (symbol.includes('XAU') || symbol.includes('GOLD')) pair = 'XAU/USD';
  else if (symbol.includes('XAG') || symbol.includes('SILVER')) pair = 'XAG/USD';
  else return null;

  try {
    const response = await fetch(`${GOLD_API_URL}/${pair}`, {
      headers: {
        'x-access-token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Metal API error');
    return await response.json();
  } catch (error) {
    console.error('Error fetching metal data:', error);
    return null;
  }
}
