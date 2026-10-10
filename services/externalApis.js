const axios = require('axios');

// In-Memory Cache to prevent duplicate API requests
const translationCache = {};

// Helper function to introduce a minor delay between requests
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Dynamic Currency Conversion API (Open Exchange Rates / Fallback API)
async function convertCurrency(amountInUSD, targetCurrency = 'USD') {
  const currency = targetCurrency.toUpperCase();
  
  if (currency === 'USD') {
    return { originalUSD: amountInUSD, currency: 'USD', rate: 1, convertedAmount: Number(amountInUSD.toFixed(2)) };
  }

  try {
    const apiKey = process.env.OPEN_EXCHANGE_RATES_KEY;
    let rate = null;

    if (apiKey && apiKey !== 'your_key_here') {
      const response = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}`);
      rate = response.data.rates[currency];
    }

    if (!rate) {
      const fallbackRes = await axios.get(`https://open.er-api.com/v6/latest/USD`);
      rate = fallbackRes.data.rates[currency];
    }

    if (!rate) throw new Error(`Exchange rate for ${currency} not found.`);

    const convertedAmount = Number((amountInUSD * rate).toFixed(2));
    return { originalUSD: amountInUSD, currency, rate, convertedAmount };
  } catch (err) {
    console.error("Currency API Error:", err.message);
    const staticRates = { MYR: 4.45, EUR: 0.92, CNY: 7.23, JPY: 152.50 };
    const fallbackRate = staticRates[currency] || 1;
    return {
      originalUSD: amountInUSD,
      currency,
      rate: fallbackRate,
      convertedAmount: Number((amountInUSD * fallbackRate).toFixed(2))
    };
  }
}

// 2. Reliable Free Dynamic Text Translation API (Google Translate Endpoint)
async function translateText(text, targetLang = 'en') {
  if (!text || targetLang === 'en') return text;

  const cacheKey = `${targetLang}:${text}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    await delay(50); // 50ms pause to ensure smooth throughput

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await axios.get(url, { timeout: 4000 });

    if (response.data && response.data[0]) {
      const translated = response.data[0].map(item => item[0]).join('');
      translationCache[cacheKey] = translated;
      return translated;
    }
    return text;
  } catch (err) {
    console.error(`Translation API Error (${targetLang}):`, err.message);
    return text; // Fallback to original text on error
  }
}

// 3. Map Geocoding Tracking API (Nominatim / OpenStreetMap)
async function getTrackingLocation(address) {
  if (!address) return { latitude: 3.1390, longitude: 101.6869, formattedAddress: "Default Location" };

  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: address, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'ShopFlowEcommerce/1.0' },
      timeout: 4000
    });

    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
        formattedAddress: response.data[0].display_name
      };
    }
    throw new Error("Address not found");
  } catch (err) {
    return { latitude: 3.1390, longitude: 101.6869, formattedAddress: address };
  }
}

module.exports = {
  convertCurrency,
  translateText,
  getTrackingLocation
};