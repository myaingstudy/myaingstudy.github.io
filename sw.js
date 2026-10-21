/* Dokodemo moved to https://dokodemojapanese.github.io/ — this worker clears the old offline cache
   so the moving page (index.html) loads, and keeps delivering reminders to people who have not moved yet. */
const NEW='https://dokodemojapanese.github.io/';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())await caches.delete(k);
  await self.clients.claim();
  for(const c of await self.clients.matchAll({type:'window'})){try{await c.navigate(c.url)}catch(x){}}
})()));
self.addEventListener('fetch',()=>{});
self.addEventListener('push',e=>{let p={};try{p=e.data?e.data.json():{}}catch(x){p={data:{body:e.data?e.data.text():''}}}
  const d=p.data||p.notification||p||{};
  e.waitUntil(self.registration.showNotification(d.title||'Dokodemo',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag||'dokodemo',data:{url:NEW}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow(NEW))});
