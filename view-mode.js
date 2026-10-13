(function(root){
  'use strict';
  function isMobileDevice(info){
    const ua=info.userAgent||'',platform=info.platform||'';
    if(info.uaMobile||/Android|iPhone|iPad|iPod|Mobile/i.test(ua))return true;
    // iPadOS may advertise itself as a Mac when requesting desktop websites.
    if((platform==='MacIntel'||/Macintosh/i.test(ua))&&info.maxTouchPoints>1)return true;
    // Touch-capable Windows laptops stay in the desktop layout.
    return !!info.coarse&&info.maxTouchPoints>0&&!/Windows|Macintosh|X11|Linux.*(?:x86_64|i686)/i.test(ua);
  }
  function opposed(state,mobileDevice){return state.playerCount===2&&mobileDevice;}
  function keyInput(state,key,code=''){
    const arrows={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'},letters={w:'up',a:'left',s:'down',d:'right'},physical={KeyW:'up',KeyA:'left',KeyS:'down',KeyD:'right'};
    const direction=arrows[key]||physical[code]||letters[String(key).toLowerCase()];if(!direction)return null;
    const arrow=!!arrows[key];
    const id=state.playerCount!==2?'player':(arrow?'player2':'player');
    return {id,direction};
  }
  function endingRotation(state,a,faceToFace){
    if(!faceToFace)return 0;
    if(a.id==='player2')return Math.PI;
    // Blue is presented to player 1; red is presented to player 2.
    if(state.mode==='coop'&&state.winner==='npcs'&&a.id==='red')return Math.PI;
    return 0;
  }
  function actorRotation(a,faceToFace){return a.id==='player2'&&faceToFace?Math.PI:0;}
  function spriteDirection(a,faceToFace){return actorRotation(a,faceToFace)?({up:'down',down:'up',left:'right',right:'left'}[a.facing]):a.facing;}
  function pickupRotation(actorId,faceToFace){return actorId==='player2'&&faceToFace?Math.PI:0;}
  const api={isMobileDevice,opposed,keyInput,endingRotation,actorRotation,spriteDirection,pickupRotation};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GroundhogView=api;
})(typeof window!=='undefined'?window:globalThis);
