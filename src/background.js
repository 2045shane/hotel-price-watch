importScripts('lib/license.js','lib/quota.js','lib/price.js');
const H=HotelWatch, quota=H.createQuotaStore(chrome.storage.local,H.verifyLicense);
const allowed = url => {try {const u=new URL(url);return u.protocol==='https:' && ['booking.com','agoda.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h));}catch{return false;}};
async function tracks(){return (await chrome.storage.local.get('tracks')).tracks || [];}
async function readTab(url) {
 if(!allowed(url))throw Error('链接不受支持');
 const tab=await chrome.tabs.create({url,active:false});
 try {
  // Poll for client-rendered prices; stop after 20 seconds. Always close our tab.
  for(let i=0;i<20;i++) {await new Promise(r=>setTimeout(r,1000));try {const s=await chrome.tabs.sendMessage(tab.id,{type:'snapshot'});if(s?.price && allowed(s.url))return s;}catch{}}
  throw Error('无法读取价格，请手动打开页面，确认日期后重新加入追踪刷新记录');
 }finally {await chrome.tabs.remove(tab.id).catch(()=>{});}
}
async function handle(m,sender) {
 if(m.type==='add') {
  const s=m.snapshot;
  if(!sender.tab || !allowed(sender.tab.url) || !s || s.url!==sender.tab.url || !allowed(s.url) || !s.name || !s.price || !Number.isFinite(s.price.amount) || s.price.amount<=0 || !s.price.currency || !s.checkin || !s.checkout)throw Error('未读取到酒店、价格或日期，请确认页面信息后重试');
  if(!(await quota.consume()).recorded)throw Error(H.CTA);
  const list=await tracks(),cleanUrl=H.urlWithDates(s.url,s.checkin,s.checkout),existing=list.find(x=>x.url===cleanUrl||x.url===s.url);
  const item={id:existing?.id||crypto.randomUUID(),name:s.name,url:H.urlWithDates(s.url,s.checkin,s.checkout),checkin:s.checkin,checkout:s.checkout,recordedPrice:s.price.amount,currency:s.price.currency,lastCheckedAt:new Date().toISOString(),lastCheckedPrice:s.price.amount,lastCurrency:s.price.currency,result:'equal'};
  await chrome.storage.local.set({tracks:[...list.filter(x=>x.id!==item.id),item]});return {ok:true};
 }
 // Content scripts may only add the current page. Other commands belong to popup.
 if(sender.tab)throw Error('不支持的请求');
 if(m.type==='state')return {ok:true,tracks:await tracks(),quota:await quota.status()};
 if(m.type==='delete'){await chrome.storage.local.set({tracks:(await tracks()).filter(x=>x.id!==m.id)});return {ok:true};}
 if(m.type==='license'){if(!await H.verifyLicense(m.value))throw Error('解锁码无效');await chrome.storage.local.set({hpwLicense:m.value.trim()});return {ok:true};}
 if(m.type==='check') {
  const list=await tracks();if(!list.length)throw Error('请先加入追踪');
  if(!(await quota.consume()).recorded)throw Error(H.CTA);
  for(const item of list){item.lastCheckedAt=new Date().toISOString();try {const s=await readTab(H.urlWithDates(item.url,item.checkin,item.checkout));if(s.checkin!==item.checkin||s.checkout!==item.checkout)throw Error('入住/离店日期发生变化，请手动核对页面');item.lastCheckedPrice=s.price.amount;item.lastCurrency=s.price.currency;item.result=H.comparePrices({amount:item.recordedPrice,currency:item.currency},s.price);delete item.error;}catch(e){item.result='unavailable';item.error=e.message;}}
  await chrome.storage.local.set({tracks:list});return {ok:true};
 }
 throw Error('未知操作');
}
// Serialize mutations so simultaneous popup/page requests cannot overwrite storage.
let queue=Promise.resolve();
chrome.runtime.onMessage.addListener((m,sender,reply)=>{const task=queue.then(()=>handle(m,sender));queue=task.catch(()=>{});task.then(reply,e=>reply({ok:false,error:e.message}));return true;});
