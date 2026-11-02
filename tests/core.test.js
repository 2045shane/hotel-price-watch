const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parsePrice,comparePrices,datesFromUrl}=require('../src/lib/price');
const {issueLicense,verifyLicense}=require('../src/lib/license');
const {readQuota,createQuotaStore,localDateKey}=require('../src/lib/quota');
test('价格解析：中美欧格式、空格与歧义币种',()=>{
 for(const [s,amount,currency] of [['CNY 1,234',1234,'CNY'],['¥1,234',1234,'UNKNOWN_YEN'],['US$199',199,'USD'],['€ 1.234,56',1234.56,'EUR'],['1 234 €',1234,'EUR'],['USD 1,234.56',1234.56,'USD'],['€ 199,50',199.5,'EUR']])assert.deepEqual(parsePrice(s),{amount,currency});
 for(const s of ['',null,'暂无价格','CNY 0','123'])assert.equal(parsePrice(s),null);
});
test('比较降价、涨价、相等、不同与歧义币种',()=>{const baseline={amount:200,currency:'USD'};for(const [amount,result] of [[199,'lower'],[201,'higher'],[200,'equal']])assert.equal(comparePrices(baseline,{amount,currency:'USD'}),result);assert.equal(comparePrices(baseline,{amount:100,currency:'CNY'}),'currency-mismatch');assert.equal(comparePrices({amount:200,currency:'UNKNOWN_YEN'},{amount:100,currency:'UNKNOWN_YEN'}),'currency-mismatch');assert.equal(comparePrices(null,baseline),'unavailable');});
test('URL 日期优先数据提取',()=>{assert.deepEqual(datesFromUrl('https://www.booking.com/hotel/a?checkin=2026-11-03&checkout=2026-11-05'),{checkin:'2026-11-03',checkout:'2026-11-05'});assert.deepEqual(datesFromUrl('invalid'),{checkin:'',checkout:''});assert.equal(datesFromUrl('https://www.booking.com/?checkin=2026-02-30').checkin,'');});
test('license 正确、错误、空值和其他产品校验码',async()=>{const code=await issueLicense();assert.match(code,/^HPW1\.[a-f0-9]{64}$/);assert.equal(await verifyLicense(code),true);assert.equal(await verifyLicense(' '+code+' '),true);for(const v of [null,'',code+'x',code.replace('HPW1','GCB1'),'HPW1.'+'0'.repeat(64)])assert.equal(await verifyLicense(v),false);});
test('配额每日计次、并发上限、跨天重置、license 绕过',async()=>{
 let now=new Date(2026,10,1,23,59);const data={};const storage={async get(){return {...data};},async set(v){Object.assign(data,v);}};const q=createQuotaStore(storage,verifyLicense,()=>now);
 const results=await Promise.all(Array.from({length:5},()=>q.consume()));assert.equal(results.filter(x=>x.recorded).length,3);assert.equal((await q.status()).remaining,0);assert.equal(data.hpwQuota.count,3);
 now=new Date(2026,10,2);assert.equal((await q.status()).remaining,3);await q.consume();assert.deepEqual(data.hpwQuota,{date:localDateKey(now),count:1});
 data.hpwLicense=await issueLicense();for(let i=0;i<5;i++)assert.equal((await q.consume()).recorded,true);assert.equal(data.hpwQuota.count,1);assert.equal((await q.status()).unlocked,true);
 assert.equal(readQuota({date:localDateKey(now),count:-1},now).remaining,3);
});
test('MV3 manifest 文件引用及最小权限',()=>{
 const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));assert.equal(m.manifest_version,3);assert.deepEqual(m.permissions,['storage']);assert.deepEqual(m.host_permissions,['https://*.booking.com/*','https://*.agoda.com/*']);
 const files=[m.background.service_worker,m.action.default_popup,...Object.values(m.icons),...m.content_scripts.flatMap(c=>c.js)];for(const f of files)assert.ok(fs.existsSync(path.join(root,f)),f);
 for(const [size,f] of Object.entries(m.icons)){const b=fs.readFileSync(path.join(root,f));assert.equal(b.subarray(1,4).toString(),'PNG');assert.equal(b.readUInt32BE(16),Number(size));assert.equal(b.readUInt32BE(20),Number(size));}
 assert.ok(m.content_scripts[0].matches.includes('https://*.booking.com/hotel/*'));
 const html=fs.readFileSync(path.join(root,m.action.default_popup),'utf8');for(const [,f] of html.matchAll(/(?:src|href)="([^"]+)"/g))assert.ok(fs.existsSync(path.join(root,'src/popup',f)));
});

test('Booking 美国区 "$2,477" 用页头 USD 补全币种（2026-11-02 真站）',()=>{
  const H=require('../src/lib/price.js');const assert=require('node:assert/strict');
  assert.deepEqual(H.resolveCurrency(H.parsePrice('$2,477'),[null,'USD']),{amount:2477,currency:'USD'});
  assert.equal(H.resolveCurrency(H.parsePrice('$2,477'),['EUR']).currency,'UNKNOWN_DOLLAR');
  assert.equal(H.resolveCurrency(H.parsePrice('¥1,580'),['CNY']).currency,'CNY');
  assert.equal(H.resolveCurrency(H.parsePrice('€ 245'),['USD']).currency,'EUR');
});

test('Booking 去掉 URL 日期后，页面日期转 ISO；复查 URL 带回日期并去掉挑战参数',()=>{
  const H=require('../src/lib/price.js');const assert=require('node:assert/strict');const now=new Date(2026,10,2);
  assert.equal(H.displayDateToIso('Tue, Dec 8',now),'2026-12-08');
  assert.equal(H.displayDateToIso('Thu, Jan 7',now),'2027-01-07');
  assert.equal(H.displayDateToIso('12月8日周二',now),'2026-12-08');
  assert.equal(H.displayDateToIso('8 Dec 2026',now),'2026-12-08');
  assert.equal(H.displayDateToIso('Feb 30',now),'');
  assert.equal(H.urlWithDates('https://www.booking.com/hotel/gb/x.html?lang=en-us&chal_t=1&force_referer=','2026-12-08','2026-12-10'),'https://www.booking.com/hotel/gb/x.html?lang=en-us&checkin=2026-12-08&checkout=2026-12-10');
});
