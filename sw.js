/* Dokodemo offline cache. Bump VERSION each time you upload a new index.html */
const VERSION='myaing-v115';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  if(r.url.indexOf('config.json')>-1)return; /* on/off switches: always fresh from network */
  const isPage=r.mode==='navigate'||r.url.endsWith('index.html');
  if(isPage){ /* network first: users get updates when online, cached copy when offline */
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(VERSION).then(x=>x.put('./index.html',c));return res}).catch(()=>caches.match('./index.html')));return}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const c=res.clone();caches.open(VERSION).then(x=>x.put(r,c))}return res}).catch(()=>hit)));
});

/* Push notifications (Sabbath reminders from Firebase Cloud Messaging) */
self.addEventListener('push',e=>{let p={};try{p=e.data?e.data.json():{}}catch(x){p={data:{body:e.data?e.data.text():''}}}
  const d=p.data||p.notification||p||{};
  e.waitUntil(self.registration.showNotification(d.title||'Dokodemo',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag||'dokodemo-sabbath',data:{url:d.url||'./'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c)return c.focus()}return clients.openWindow(u)}))});
