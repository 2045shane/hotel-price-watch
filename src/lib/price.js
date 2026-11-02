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
// Booking 在美国区显示 "$2,477"（不带 US），单看价格文本币种不明。用页面明确的币种代码补全：
// URL 的 selected_currency 或页头币种按钮文字（如 "USD"）。只接受 3 位大写代码，且必须与符号一致（$→*D, ¥→JPY/CNY）。
function resolveCurrency(price, hints) {
  if (!price || !String(price.currency).startsWith('UNKNOWN')) return price;
  for (const hint of hints || []) {
    const code = String(hint || '').match(/\b([A-Z]{3})\b/)?.[1];
    if (!code) continue;
    if (price.currency === 'UNKNOWN_DOLLAR' && /^[A-Z]{2}D$/.test(code)) return {...price, currency: code};
    if (price.currency === 'UNKNOWN_YEN' && (code === 'JPY' || code === 'CNY')) return {...price, currency: code};
  }
  return price;
}
// Booking 加载后会用 replaceState 去掉 URL 里的 checkin/checkout，只剩页面上的 "Tue, Dec 8"。
// 把页面日期转成 ISO（年份取今天起最近的一次），保证加入与复查时日期可比。
const MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function displayDateToIso(text, now = new Date()) {
  const t = String(text || '').trim(); if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  let y, m, d;
  let r = t.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/) || null;
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = t.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/))) [m, d] = [+r[1], +r[2]];
  else if ((r = t.match(/\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?!\d)(?:,?\s*(\d{4}))?/)) && MONTHS[r[1].toLowerCase()]) [m, d, y] = [MONTHS[r[1].toLowerCase()], +r[2], r[3] && +r[3]];
  else if ((r = t.match(/\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?(?:\s+(\d{4}))?/)) && MONTHS[r[2].toLowerCase()]) [d, m, y] = [+r[1], MONTHS[r[2].toLowerCase()], r[3] && +r[3]];
  else return '';
  if (!y) { const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()); y = now.getFullYear(); if (Date.UTC(y, m - 1, d) < today) y += 1; }
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return new Date(iso).toISOString().slice(0, 10) === iso ? iso : '';
}
// 复查时用记录的日期重新拼 URL，并去掉 Booking 的一次性挑战参数。
function urlWithDates(url, checkin, checkout) {
  try { const u = new URL(url); for (const k of ['chal_t', 'force_referer']) u.searchParams.delete(k);
    if (/^\d{4}-\d{2}-\d{2}$/.test(checkin || '') && /^\d{4}-\d{2}-\d{2}$/.test(checkout || '')) { u.searchParams.set('checkin', checkin); u.searchParams.set('checkout', checkout); }
    return u.toString(); } catch { return url; }
}
const api={parsePrice,comparePrices,datesFromUrl,resolveCurrency,displayDateToIso,urlWithDates};Object.assign(root.HotelWatch ||= {},api);if(typeof module!=='undefined')module.exports=api;
})(globalThis);
