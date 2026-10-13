/* Bump VERSION whenever any cached runtime file changes. */
const VERSION='pwa-v2';
const PREFIX='groundhog-game:'+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const FILES=[
  "./",
  "index.html",
  "style.css",
  "game-core.js",
  "game.js",
  "ending.js",
  "view-mode.js",
  "pwa.js",
  "manifest.webmanifest",
  "assets/blue-down.png",
  "assets/blue-happy.png",
  "assets/blue-left.png",
  "assets/blue-right.png",
  "assets/blue-sad.png",
  "assets/blue-up.png",
  "assets/coin.png",
  "assets/floor.png",
  "assets/green-down.png",
  "assets/green-happy.png",
  "assets/green-left.png",
  "assets/green-right.png",
  "assets/green-sad.png",
  "assets/green-up.png",
  "assets/groundhog-down.png",
  "assets/groundhog-happy.png",
  "assets/groundhog-left.png",
  "assets/groundhog-right.png",
  "assets/groundhog-sad.png",
  "assets/groundhog-up.png",
  "assets/groundhog.png",
  "assets/purple-down.png",
  "assets/purple-happy.png",
  "assets/purple-left.png",
  "assets/purple-right.png",
  "assets/purple-sad.png",
  "assets/purple-up.png",
  "assets/red-down.png",
  "assets/red-happy.png",
  "assets/red-left.png",
  "assets/red-right.png",
  "assets/red-sad.png",
  "assets/red-up.png",
  "assets/rock-1.png",
  "assets/rock-2.png",
  "assets/rock-3.png",
  "assets/rock-4.png",
  "assets/soil.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png"
];
const absolute=path=>new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(file=>new Request(absolute(file),{cache:'reload'})))));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})());});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(request.mode==='navigate'){return (await cache.match(absolute('index.html')))||fetch(request);}
    const cached=await cache.match(request,{ignoreSearch:true});
    return cached||fetch(request);
  })());
});
