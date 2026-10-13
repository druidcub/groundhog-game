(function(root){
  'use strict';
  const lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  function winners(state){return state.actors.filter(a=>state.mode==='coop'?a.team===state.winner:a.id===state.winner);}
  function overview(w,h){const cellSize=Math.min(w,h)/10;return {cellSize,offsetX:(w-cellSize*10)/2,offsetY:(h-cellSize*10)/2};}
  function focus(actors,w,h){
    const xs=actors.map(a=>a.x+.5),ys=actors.map(a=>a.y+.5);
    const minX=Math.min(...xs)-.7,maxX=Math.max(...xs)+.7,minY=Math.min(...ys)-1.05,maxY=Math.max(...ys)+1.05;
    const margin=Math.min(32,w*.07,h*.07);
    const cellSize=Math.min((w-2*margin)/(maxX-minX),(h-2*margin)/(maxY-minY),Math.min(w,h)*.23);
    return {cellSize,offsetX:w/2-(minX+maxX)*.5*cellSize,offsetY:h/2-(minY+maxY)*.5*cellSize};
  }
  function mix(a,b,t){return {cellSize:lerp(a.cellSize,b.cellSize,t),offsetX:lerp(a.offsetX,b.offsetX,t),offsetY:lerp(a.offsetY,b.offsetY,t)};}
  function camera(state,w,h,elapsed,initial,reduced=false){const wide=overview(w,h),close=focus(winners(state),w,h);if(reduced)return close;if(elapsed<600)return mix(initial||wide,wide,smooth(elapsed/600));if(elapsed<1100)return wide;return mix(wide,close,smooth((elapsed-1100)/1400));}
  function pose(isWinner,elapsed,phase=0,reduced=false){if(reduced)return {jump:0,scaleX:1,scaleY:1,angle:0};if(isWinner){const t=(elapsed+phase)/780*Math.PI*2,jump=Math.max(0,Math.sin(t))*.4;return {jump,scaleX:1+Math.sin(t)*.045,scaleY:1-Math.sin(t)*.045,angle:Math.sin(t)*.025};}return {jump:-.06,scaleX:.98,scaleY:.91,angle:Math.sin((elapsed+phase)/1000)*.045};}
  const api={winners,overview,focus,camera,pose};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GroundhogEnding=api;
})(typeof window!=='undefined'?window:globalThis);
