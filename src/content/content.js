(() => {
const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
function first(selectors) {for(const selector of selectors)for(const el of document.querySelectorAll(selector))if(visible(el))return el.textContent.trim();return '';}
function snapshot() {
 const s=globalThis.HotelSelectors, dates=HotelWatch.datesFromUrl(location.href);
 const raw=first(s.price),price=HotelWatch.parsePrice(raw);
 return {name:first(s.name),url:location.href,checkin:dates.checkin||first(s.checkin),checkout:dates.checkout||first(s.checkout),price,raw};
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{if(message.type==='snapshot'){reply(snapshot());}});
const button=document.createElement('button');button.textContent='加入追踪';button.style.cssText='position:fixed;bottom:24px;right:24px;z-index:2147483647;background:#165dca;color:white;padding:12px 20px;border:0;border-radius:8px;cursor:pointer';
button.addEventListener('click',async()=>{button.disabled=true;try {const r=await chrome.runtime.sendMessage({type:'add',snapshot:snapshot()});button.textContent=r.ok?'已加入追踪':r.error;}catch {button.textContent='操作失败，请刷新页面重试';}finally{button.disabled=false;}});document.body.append(button);
})();
