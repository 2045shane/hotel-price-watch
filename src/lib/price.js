(function(root) {
'use strict';
function parsePrice(value) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\u00a0|\u202f/g, ' ');
  const code = text.match(/\b(CNY|RMB|USD|EUR|GBP|JPY|HKD|AUD|CAD|SGD|TWD|KRW|THB)\b/i)?.[1]?.toUpperCase();
  const currency = code === 'RMB' ? 'CNY' : code || (text.includes('US$') ? 'USD' : text.includes('€') ? 'EUR' : text.includes('£') ? 'GBP' : null);
  // ¥ / $ alone are ambiguous: never assume CNY/USD and compare across currencies.
  const resolved = currency || (text.includes('¥') || text.includes('￥') ? 'UNKNOWN_YEN' : text.includes('$') ? 'UNKNOWN_DOLLAR' : null);
  const match = text.match(/\d[\d .,\u2019']*/);
  if (!match || !resolved) return null;
  let number = match[0].trim().replace(/[\s’']/g, '');
  const comma = number.lastIndexOf(','), dot = number.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.';
    number = number.replace(decimal === ',' ? /\./g : /,/g, '').replace(decimal, '.');
  } else if (comma >= 0 || dot >= 0) {
    const sep = comma >= 0 ? ',' : '.';
    const parts = number.split(sep);
    number = parts.length === 2 && parts[1].length <= 2 ? parts.join('.') : parts.join('');
  }
  const amount = Number(number);
  return Number.isFinite(amount) && amount > 0 ? {amount, currency: resolved} : null;
}
function comparePrices(recorded, current) {
  if (!recorded || !current || !Number.isFinite(recorded.amount) || !Number.isFinite(current.amount)) return 'unavailable';
  if (!recorded.currency || recorded.currency !== current.currency || recorded.currency.startsWith('UNKNOWN')) return 'currency-mismatch';
  return current.amount < recorded.amount ? 'lower' : current.amount > recorded.amount ? 'higher' : 'equal';
}
function datesFromUrl(url) {
  try {const p = new URL(url).searchParams; const valid = key => {const v=p.get(key);return /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v ? v : '';}; return {checkin:valid('checkin'),checkout:valid('checkout')};} catch {return {checkin:'',checkout:''};}
}
const api={parsePrice,comparePrices,datesFromUrl};Object.assign(root.HotelWatch ||= {},api);if(typeof module!=='undefined')module.exports=api;
})(globalThis);
