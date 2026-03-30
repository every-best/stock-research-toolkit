import axios from "axios";

const FINNHUB_KEY = 'd74allhr01qno4q12eagd74allhr01qno4q12eb0';
const symbol = 'AAPL';
const to = Math.floor(Date.now() / 1000);
const from = to - 252 * 86400 * 2;
const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;

console.log('Testing Finnhub API...');
console.log('URL:', url);

const res = await axios.get(url);
console.log('Status:', res.status);
console.log('Data s:', res.data.s);
console.log('Data t length:', res.data.t ? res.data.t.length : 'no t');
console.log('Full response:', JSON.stringify(res.data).slice(0, 1000));
