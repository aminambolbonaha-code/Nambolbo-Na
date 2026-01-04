export interface RateData {
  success: boolean;
  base: string;
  rates: { [key: string]: number };
  timestamp: number;
}

const FOREX_RATE_API_URL = 'https://api.forexrateapi.com/v1/latest';
const API_KEY = '5e520443d4cbd757ae3d7084d0347c1b';

/**
 * Fetches latest exchange rates for Forex or Crypto from ForexRateAPI.
 */
export async function fetchRateData(ticker: string): Promise<RateData | null> {
  const symbol = ticker.toUpperCase();
  
  let targetCurrency = '';
  // Usually we want the price in USD, so we use USD as base and fetch the rate for the asset
  const baseCurrency = 'USD';

  // Extract the asset code (e.g., EUR from EURUSD or BTC from BTCUSD)
  if (symbol.length === 6) {
    targetCurrency = symbol.substring(0, 3);
  } else if (symbol.endsWith('USD')) {
    targetCurrency = symbol.replace('USD', '');
  } else if (symbol.endsWith('USDT')) {
    targetCurrency = symbol.replace('USDT', '');
  } else {
    targetCurrency = symbol;
  }

  try {
    // ForexRateAPI format: ?api_key=...&base=USD&currencies=EUR
    const url = `${FOREX_RATE_API_URL}?api_key=${API_KEY}&base=${baseCurrency}&currencies=${targetCurrency}`;
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`ForexRateAPI responded with ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Network error fetching rate data from ForexRateAPI:', error);
    return null;
  }
}
