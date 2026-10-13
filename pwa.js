(function(){
  'use strict';
  const install=document.getElementById('pwa-install'),update=document.getElementById('pwa-update'),message=document.getElementById('pwa-message');
  let promptEvent=null,registration=null,offlineReady=false,updating=false;
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  function showStatus(){
    if(standalone())message.textContent=offlineReady?'已以 App 開啟，離線遊玩已就緒。':'已以 App 開啟，正在準備離線遊玩。';
    else if(offlineReady)message.textContent=ios?'離線遊玩已就緒。安裝：Safari 分享 → 加入主畫面。':'離線遊玩已就緒，可從瀏覽器選單安裝 App。';
    else message.textContent='首次連線載入後，會自動準備離線遊玩。';
    install.hidden=!promptEvent||standalone();
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;showStatus();});
  window.addEventListener('appinstalled',()=>{promptEvent=null;install.hidden=true;showStatus();});
  install.addEventListener('click',async()=>{if(!promptEvent)return;const event=promptEvent;promptEvent=null;install.hidden=true;await event.prompt();await event.userChoice;showStatus();});
  update.addEventListener('click',()=>{if(!registration?.waiting)return;updating=true;update.disabled=true;message.textContent='正在更新，遊戲將重新開啟。';registration.waiting.postMessage({type:'SKIP_WAITING'});});
  showStatus();
  if(!('serviceWorker' in navigator)||!isSecureContext||location.protocol==='file:'){message.textContent='安裝與離線快取請從 HTTPS 線上網址開啟；本機檔案仍可遊玩。';return;}
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updating)location.reload();});
  function offerUpdate(){update.hidden=!registration?.waiting;}
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{
    registration=reg;offerUpdate();
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offerUpdate();});});
    await navigator.serviceWorker.ready;offlineReady=true;showStatus();
  }).catch(()=>{message.textContent='離線準備未完成，請在連線時重新整理再試。';});
})();
