(function(root){
  'use strict';
  const SIZE=10,BOMBS=8,ROCKS=12,TARGET=5,STUN_MS=3000,NPC_INTERVAL=650;
  const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  const p1={id:'player',name:'玩家 1',sprite:'groundhog',human:true,team:'players',color:'#d4a469',x:4,y:9,facing:'up'};
  const p2={id:'player2',name:'玩家 2',sprite:'purple',human:true,team:'players',color:'#c6a1e8',x:4,y:0,facing:'down'};
  const npcStarts=[{id:'blue',name:'藍藍',sprite:'blue',color:'#71b9e3',x:0,y:4,facing:'right'},{id:'red',name:'小紅',sprite:'red',color:'#e98779',x:9,y:4,facing:'left'},{id:'green',name:'小綠',sprite:'green',color:'#aac57b',x:4,y:0,facing:'down'}];
  function teamScore(s,team){return s.actors.filter(a=>a.team===team).reduce((sum,a)=>sum+a.score,0);}
  function displayScore(s,id){const a=s.actors.find(a=>a.id===id);return s.mode==='coop'?teamScore(s,a.team):a.score;}
  function createGame(random=Math.random,npcCount=3,playerCount=1,mode='normal'){
    playerCount=Number(playerCount)===2?2:1;
    mode=playerCount===2&&mode==='coop'?'coop':'normal';
    npcCount=mode==='coop'?2:Math.max(0,Math.min(playerCount===2?2:3,Math.trunc(Number(npcCount)||0)));
    const specs=[p1,...(playerCount===2?[p2]:[]),...npcStarts.slice(0,npcCount).map(a=>({...a,human:false,team:'npcs',x:a.id==='green'&&playerCount===2?7:a.x}))];
    const actors=specs.map(a=>({...a,score:0,moves:0,bombsHit:0,rocksBroken:0,stunnedUntil:0,nextStepAt:1500,goal:null}));
    const cells=Array.from({length:100},()=>({dug:false,item:null,rockHits:0}));
    const spawns=new Set(actors.map(a=>a.y*SIZE+a.x));
    const spots=Array.from({length:100},(_,i)=>i).filter(i=>!spawns.has(i));
    for(let i=spots.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[spots[i],spots[j]]=[spots[j],spots[i]];}
    const coinCount=4*actors.length+1;
    spots.slice(0,coinCount).forEach(i=>cells[i].item='coin');
    spots.slice(coinCount,coinCount+BOMBS).forEach(i=>cells[i].item='bomb');
    spots.slice(coinCount+BOMBS,coinCount+BOMBS+ROCKS).forEach(i=>cells[i].item='rock');
    spawns.forEach(i=>cells[i].dug=true);
    return {cells,actors,npcCount,playerCount,mode,target:mode==='coop'?9:5,coinCount,dug:spawns.size,winner:null,finished:false};
  }
  function move(s,direction,now,actorId='player'){
    if(s.finished)return {type:'finished'};
    const a=s.actors.find(a=>a.id===actorId);if(!a)return {type:'invalid'};
    if(now<a.stunnedUntil)return {type:'stunned',actorId};
    const d=directions[direction];if(!d)return {type:'invalid'};
    a.facing=direction;
    const x=a.x+d[0],y=a.y+d[1];
    if(x<0||x>=SIZE||y<0||y>=SIZE)return {type:'edge',actorId};
    if(s.actors.some(other=>other!==a&&other.x===x&&other.y===y))return {type:'occupied',actorId,x,y};
    const cell=s.cells[y*SIZE+x];let broken=false;
    if(cell.item==='rock'){
      cell.rockHits++;
      if(cell.rockHits<4)return {type:'rock',actorId,x,y,hits:cell.rockHits};
      cell.item=null;a.rocksBroken++;broken=true;
    }
    a.x=x;a.y=y;a.moves++;
    if(!cell.dug){cell.dug=true;s.dug++;}
    const item=cell.item;cell.item=null;
    if(item==='bomb'){a.bombsHit++;a.stunnedUntil=now+STUN_MS;return {type:'bomb',actorId,x,y};}
    if(item==='coin'){a.score++;if(displayScore(s,a.id)>=s.target){s.finished=true;s.winner=s.mode==='coop'?a.team:a.id;return {type:'win',actorId,x,y};}return {type:'coin',actorId,x,y};}
    return {type:broken?'rock-broken':'dig',actorId,x,y};
  }
  // NPCs search unexplored cells. Hidden coin/bomb locations are never consulted.
  function chooseNPCDirection(s,a){
    const start=a.y*SIZE+a.x,occupied=new Set(s.actors.filter(o=>o!==a).map(o=>o.y*SIZE+o.x));
    if(a.goal!==null&&(s.cells[a.goal].dug||occupied.has(a.goal)))a.goal=null;
    const dist=Array(100).fill(Infinity),first=Array(100).fill(null),done=new Set();dist[start]=0;
    const order=a.id==='blue'?['up','right','down','left']:a.id==='red'?['left','up','down','right']:['down','left','right','up'];
    let best=null;
    for(let count=0;count<100;count++){
      let i=-1;for(let n=0;n<100;n++)if(!done.has(n)&&(i===-1||dist[n]<dist[i]))i=n;
      if(i<0||!Number.isFinite(dist[i]))break;done.add(i);
      if(i!==start&&!s.cells[i].dug){if(best===null)best=i;if(a.goal===null||i===a.goal){best=i;break;}}
      for(const dir of order){const [dx,dy]=directions[dir],x=i%SIZE+dx,y=Math.floor(i/SIZE)+dy;if(x<0||x>=SIZE||y<0||y>=SIZE)continue;const n=y*SIZE+x;if(occupied.has(n))continue;const c=s.cells[n];const cost=1+(c.rockHits>0&&c.item==='rock'?4-c.rockHits:0);if(dist[i]+cost<dist[n]){dist[n]=dist[i]+cost;first[n]=first[i]||dir;}}
    }
    if(best!==null){a.goal=best;return first[best];}
    a.goal=null;return null;
  }
  function tickNPCs(s,now){
    const events=[];
    for(const a of s.actors.filter(a=>!a.human)){
      if(s.finished)break;if(now<a.nextStepAt||now<a.stunnedUntil)continue;
      a.nextStepAt=now+NPC_INTERVAL;
      const direction=chooseNPCDirection(s,a);if(direction)events.push(move(s,direction,now,a.id));
    }
    return events;
  }
  function joystickDirection(dx,dy,deadZone=14){if(Math.hypot(dx,dy)<deadZone)return null;return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');}
  const api={SIZE,BOMBS,ROCKS,TARGET,STUN_MS,NPC_INTERVAL,teamScore,displayScore,createGame,move,tickNPCs,chooseNPCDirection,joystickDirection};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Groundhog=api;
})(typeof window!=='undefined'?window:globalThis);
