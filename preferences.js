(function(root){
  'use strict';
  const KEY='groundhog-game.settings.v1';
  function normalize(value){const v=value&&typeof value==='object'?value:{};const playerCount=Number(v.playerCount)===2?2:1,mode=playerCount===2&&v.mode==='coop'?'coop':'normal',max=playerCount===2?2:3;const selected=Number(v.npcCount??3);const npcCount=mode==='coop'?2:Math.max(0,Math.min(max,Number.isFinite(selected)?Math.trunc(selected):max));return {playerCount,mode,npcCount};}
  function read(storage){try{return normalize(JSON.parse(storage.getItem(KEY)));}catch{return normalize(null);}}
  function write(storage,value){try{storage.setItem(KEY,JSON.stringify(normalize(value)));return true;}catch{return false;}}
  const api={KEY,normalize,read,write};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GroundhogPreferences=api;
})(typeof window!=='undefined'?window:globalThis);
