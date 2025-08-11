self.addEventListener('install', function(e){
  e.waitUntil(caches.open('warfarin-v1').then(function(cache){
    return cache.addAll(['./','./index.html','./style.css','./script.js']);
  }));
});
self.addEventListener('fetch', function(e){
  e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request); }));
});