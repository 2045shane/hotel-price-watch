(function(root){
'use strict';
const CTA='小红书私信『珊哥爱读书』获取解锁码';
const STORAGE_KEYS={quota:'hpwQuota',license:'hpwLicense'};
function localDateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function readQuota(stored,now=new Date(),unlocked=false){const date=localDateKey(now);const count=stored?.date===date && Number.isSafeInteger(stored.count)&&stored.count>=0?stored.count:0;return {date,count,unlocked,allowed:unlocked||count<3,remaining:unlocked?null:Math.max(0,3-count)};}
function createQuotaStore(storage,verify,now=()=>new Date()){let queue=Promise.resolve();async function status(){const d=await storage.get(Object.values(STORAGE_KEYS));return readQuota(d.hpwQuota,now(),await verify(d.hpwLicense));}function consume(){const task=queue.then(async()=>{const q=await status();if(!q.allowed)return {...q,recorded:false};if(q.unlocked)return {...q,recorded:true};const stored={date:q.date,count:q.count+1};await storage.set({hpwQuota:stored});return {...readQuota(stored,now()),recorded:true};});queue=task.catch(()=>{});return task;}return {status,consume};}

const api={CTA,STORAGE_KEYS,localDateKey,readQuota,createQuotaStore}; Object.assign(root.HotelWatch ||= {},api); if(typeof module!=='undefined' && module.exports) module.exports=api;
})(globalThis);
