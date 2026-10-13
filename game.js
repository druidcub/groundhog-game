'use strict';
const canvas=document.getElementById('board'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id),settings=$('settings'),win=$('win');
let state,burst=null,cameraY=null,clock=0,lastFrame=null,lastStatus='',ending=null,lastView=null;
const mobileDevice=GroundhogView.isMobileDevice({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,uaMobile:navigator.userAgentData?.mobile,coarse:matchMedia('(pointer: coarse)').matches});
const faceToFace=()=>GroundhogView.opposed(state,mobileDevice);
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const topResult=$('result-top');topResult.innerHTML=win.innerHTML;for(const el of topResult.querySelectorAll('[id]'))el.id+='-top';
const controllers=new Map(),swipes=new Map(),images={};
for(const name of ['soil','floor','coin','groundhog-up','groundhog-down','groundhog-left','groundhog-right','rock-1','rock-2','rock-3','rock-4']){const img=new Image();img.src=`assets/${name}.png`;images[name]=img;}
for(const color of ['blue','red','green','purple'])for(const direction of ['up','down','left','right']){const img=new Image();img.src=`assets/${color}-${direction}.png`;images[`${color}-${direction}`]=img;}
for(const color of ['groundhog','blue','red','green','purple'])for(const expression of ['happy','sad']){const img=new Image();img.src=`assets/${color}-${expression}.png`;images[`${color}-${expression}`]=img;}
for(const hud of document.querySelectorAll('.hud'))controllers.set(hud.dataset.actor,{id:hud.dataset.actor,hud,joystick:hud.querySelector('.joystick'),thumb:hud.querySelector('.joy-thumb'),pointer:null,held:null,lastMove:-Infinity});
const actor=id=>state.actors.find(a=>a.id===id),player=()=>actor('player');
function stop(id){const c=controllers.get(id);if(!c)return;c.held=null;c.pointer=null;c.thumb.style.transform='translate(-50%,-50%)';c.joystick.classList.remove('active');for(const [p,s] of swipes)if(s.id===id)swipes.delete(p);}
function stopAll(){for(const id of controllers.keys())stop(id);swipes.clear();}
function blocked(id){const a=actor(id);return !a||state.finished||settings.open||clock<a.stunnedUntil;}
function reset(){stopAll();state=Groundhog.createGame(Math.random,Number($('npc-count').value),Number($('player-count').value),$('game-mode').value);clock=0;lastFrame=null;burst=null;cameraY=null;ending=null;lastView=null;win.hidden=true;topResult.hidden=true;$('ending-banner').hidden=true;for(const c of controllers.values())c.lastMove=-Infinity;$('hud-top').hidden=state.playerCount!==2;document.body.classList.toggle('dual',state.playerCount===2);document.body.classList.toggle('opposed',faceToFace());$('device-note').textContent=mobileDevice?'已偵測為手機／平板：雙人時上方介面朝向對面玩家。':'已偵測為電腦：雙人正常／合作時兩邊介面均保持正向。';status('挖寶開始！');update();}
function status(text){if(lastStatus!==text){$('status').textContent=text;lastStatus=text;}}
function update(){
  $('total-coins').textContent=state.coinCount;$('dug').textContent=state.dug;$('mode').textContent=state.mode==='coop'?'雙人合作':state.playerCount===2?'雙人競賽':'單人競賽';
  $('rules').textContent=state.mode==='coop'?'本局：玩家兩人合計 vs 左右兩隻 NPC 合計，先拿到 9 枚金幣的一隊獲勝。共 17 枚金幣。':`本局：每個角色獨立計分，先拿到 5 枚金幣者獲勝。金幣總數 = 4 × 參賽者人數 + 1，共 ${state.coinCount} 枚。`;
  for(const c of controllers.values()){
    const a=actor(c.id);if(!a)continue;const score=Groundhog.displayScore(state,a.id);
    c.hud.querySelector('.score-label').textContent=state.mode==='coop'?'玩家隊 · 合計':a.name;
    c.hud.querySelector('.score-value').textContent=score;c.hud.querySelector('.score-target').textContent=`/ ${state.target}`;
    c.hud.querySelector('.progress').replaceChildren(...Array.from({length:state.target},(_,i)=>{const el=document.createElement('span');if(i<score)el.className='filled';return el;}));
    const rivals=state.mode==='coop'?[{name:'NPC 隊',score:Groundhog.teamScore(state,'npcs'),color:'#e98779'}]:state.actors.filter(o=>o!==a);
    c.hud.querySelector('.npc-scores').replaceChildren(...rivals.map(o=>{const chip=document.createElement('span');chip.style.setProperty('--npc-color',o.color);chip.textContent=`${o.name} ${o.score}/${state.target}`;return chip;}));
  }
  if(state.finished){stopAll();const humanWin=state.mode==='coop'?state.winner==='players':actor(state.winner).human;$('result-label').textContent=humanWin?'玩家獲勝':'本局結束';$('result-title').textContent=state.mode==='coop'?(humanWin?'玩家隊先拿到 9 枚！':'NPC 隊先拿到 9 枚！'):`${actor(state.winner).name}先拿到 5 枚！`;$('win-description').textContent=state.mode==='coop'?`玩家隊 ${Groundhog.teamScore(state,'players')} 枚 · NPC 隊 ${Groundhog.teamScore(state,'npcs')} 枚`:state.actors.map(a=>`${a.name} ${a.score} 枚`).join(' · ');win.classList.toggle('lost',!humanWin);if(!ending){ending={elapsed:0,initial:lastView?{...lastView}:null,winnerIds:GroundhogEnding.winners(state).map(a=>a.id)};$('ending-banner').textContent=state.mode==='coop'?(state.winner==='players'?'玩家隊獲勝！':'NPC 隊獲勝！'):`${actor(state.winner).name}獲勝！`;$('ending-banner').hidden=false;for(const id of ['result-label','result-title','win-description'])$(id+'-top').textContent=$(id).textContent;}}
}
function eventFeedback(result){
  if(['coin','win','bomb','rock','rock-broken'].includes(result.type))burst={kind:result.type==='win'?'coin':result.type,x:result.x,y:result.y,at:clock};
  if(result.type==='bomb'&&actor(result.actorId).human)stop(result.actorId);
  if(result.type==='coin'||result.type==='win')status(`${actor(result.actorId).name}找到金幣。`);
  update();
}
function step(id,direction,now){const c=controllers.get(id);if(!c||settings.open||now-c.lastMove<210)return false;const result=Groundhog.move(state,direction,now,id);if(['stunned','finished','invalid'].includes(result.type))return false;c.lastMove=now;eventFeedback(result);return true;}
function steer(c,e){const b=c.joystick.getBoundingClientRect(),screenX=e.clientX-b.x-b.width/2,screenY=e.clientY-b.y-b.height/2,sign=c.id==='player2'&&faceToFace()?-1:1,dx=screenX*sign,dy=screenY*sign;c.held=Groundhog.joystickDirection(screenX,screenY);const length=Math.hypot(dx,dy),limit=b.width*.28,k=length>limit?limit/length:1;c.thumb.style.transform=`translate(calc(-50% + ${dx*k}px),calc(-50% + ${dy*k}px))`;c.joystick.classList.toggle('active',!!c.held);if(c.held)step(c.id,c.held,clock);}
for(const c of controllers.values()){
  c.joystick.addEventListener('pointerdown',e=>{if(e.button!==0||c.pointer!==null||blocked(c.id))return;const b=c.joystick.getBoundingClientRect();if(Math.hypot(e.clientX-b.x-b.width/2,e.clientY-b.y-b.height/2)>b.width/2)return;e.preventDefault();stop(c.id);c.pointer=e.pointerId;c.joystick.setPointerCapture(e.pointerId);steer(c,e);});
  c.joystick.addEventListener('pointermove',e=>{if(c.pointer===e.pointerId&&!blocked(c.id)){e.preventDefault();steer(c,e);}});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])c.joystick.addEventListener(name,e=>{if(c.pointer===e.pointerId)stop(c.id);});
}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const b=canvas.getBoundingClientRect(),id=state.playerCount===2&&e.clientY<b.y+b.height/2?'player2':'player';const c=controllers.get(id);if(blocked(id)||c.pointer!==null||[...swipes.values()].some(s=>s.id===id))return;e.preventDefault();stop(id);swipes.set(e.pointerId,{id,x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{const s=swipes.get(e.pointerId);if(!s||blocked(s.id))return;e.preventDefault();const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.max(Math.abs(dx),Math.abs(dy))<22)return;const direction=Groundhog.joystickDirection(dx,dy);if(step(s.id,direction,clock)&&swipes.has(e.pointerId)){s.x=e.clientX;s.y=e.clientY;}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{swipes.delete(e.pointerId);});
function keyInput(e){return GroundhogView.keyInput(state,e.key,e.code);}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['+','=','-','0'].includes(e.key)){e.preventDefault();return;}if(settings.open||state.finished||e.ctrlKey||e.metaKey||e.altKey)return;const input=keyInput(e);if(!input)return;e.preventDefault();if(e.repeat||blocked(input.id))return;const c=controllers.get(input.id);if(c.pointer!==null)return;c.held=input.direction;step(input.id,input.direction,clock);});
document.addEventListener('keyup',e=>{const input=keyInput(e);if(input&&controllers.get(input.id).held===input.direction&&controllers.get(input.id).pointer===null)stop(input.id);});
window.addEventListener('blur',stopAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});
for(const name of ['contextmenu','dblclick','gesturestart','gesturechange','gestureend'])document.addEventListener(name,e=>e.preventDefault(),{passive:false});
document.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)e.preventDefault();},{passive:false});
document.addEventListener('touchstart',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1||!e.target.closest('#settings'))e.preventDefault();},{passive:false});
let normalNPCCount='3',coopSettings=false;
function syncSettings(){const two=$('player-count').value==='2';$('mode-option').hidden=!two;if(!two)$('game-mode').value='normal';const coop=two&&$('game-mode').value==='coop';if(coop&&!coopSettings)normalNPCCount=$('npc-count').value;if(coop)$('npc-count').value='2';else if(coopSettings)$('npc-count').value=normalNPCCount;coopSettings=coop;$('npc-count').disabled=coop;$('config-note').textContent=coop?'合作模式固定左右各一隻 NPC。按「重新開始」套用。':'按「重新開始」套用設定。';}
$('player-count').addEventListener('change',syncSettings);$('game-mode').addEventListener('change',syncSettings);
$('settings-open').addEventListener('click',()=>{stopAll();syncSettings();settings.showModal();});settings.addEventListener('close',stopAll);
$('restart').addEventListener('click',()=>{settings.close();reset();});$('again').addEventListener('click',reset);$('again-top').addEventListener('click',reset);
function ready(img){return img&&img.complete&&img.naturalWidth>0;}

function draw(realNow){
  const delta=lastFrame===null?0:Math.min(100,realNow-lastFrame);lastFrame=realNow;
  if(!settings.open&&!state.finished&&!document.hidden)clock+=delta;
  if(ending&&!settings.open&&!document.hidden){ending.elapsed+=delta;if(ending.elapsed>=(reducedMotion?900:4000)){win.hidden=false;topResult.hidden=state.playerCount!==2;}}
  const now=clock;
  for(const c of controllers.values())if(c.held)step(c.id,c.held,now);
  if(!settings.open&&!document.hidden)Groundhog.tickNPCs(state,now).forEach(eventFeedback);
  for(const c of controllers.values()){const a=actor(c.id);c.joystick.disabled=!a||blocked(c.id);c.hud.querySelector('.control-state').textContent=a&&now<a.stunnedUntil?`暈眩 ${((a.stunnedUntil-now)/1000).toFixed(1)} 秒`:'';}
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  // Keep ten columns across the full viewport with square cells. A tall map follows the actor vertically on wide screens.
  let cellSize=state.playerCount===2?Math.min(w,h)/10:w/10,worldHeight=cellSize*10,offsetX=(w-worldHeight)/2;
  const targetY=worldHeight<=h?-(h-worldHeight)/2:Math.max(0,Math.min(worldHeight-h,player().y*cellSize+cellSize/2-h*.55));
  if(cameraY===null)cameraY=targetY;else cameraY+=(targetY-cameraY)*.2;
  if(ending){const view=GroundhogEnding.camera(state,w,h,ending.elapsed,ending.initial,reducedMotion);cellSize=view.cellSize;offsetX=view.offsetX;cameraY=-view.offsetY;lastView=view;}else lastView={cellSize,offsetX,offsetY:-cameraY};
  ctx.fillStyle='#4b3021';ctx.fillRect(0,0,w,h);
  if(ready(images.floor)){ctx.globalAlpha=.55;const pattern=ctx.createPattern(images.floor,'repeat');ctx.fillStyle=pattern;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;}
  state.cells.forEach((cell,i)=>{const x=offsetX+(i%10)*cellSize,y=Math.floor(i/10)*cellSize-cameraY;if(y+cellSize<0||y>h)return;const img=images[cell.dug?'floor':'soil'];ctx.fillStyle=cell.dug?'#60412e':'#b8804c';ctx.fillRect(x,y,cellSize,cellSize);if(ready(img))ctx.drawImage(img,x,y,cellSize+.4,cellSize+.4);ctx.strokeStyle=cell.dug?'#51372444':'#714a3344';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,cellSize-1,cellSize-1);
    if(cell.item==='rock'&&cell.rockHits>0){ctx.fillStyle='#5c423144';ctx.fillRect(x,y,cellSize,cellSize);const rock=images[`rock-${cell.rockHits}`];if(ready(rock)){ctx.save();if(burst&&burst.kind==='rock'&&burst.x===i%10&&burst.y===Math.floor(i/10)&&now-burst.at<180)ctx.translate(Math.sin((now-burst.at)/15)*cellSize*.035,0);ctx.drawImage(rock,x+cellSize*.05,y+cellSize*.05,cellSize*.9,cellSize*.9);ctx.restore();}}
  });
  if(ending){ctx.fillStyle='#1f160d26';ctx.fillRect(0,0,w,h);}
  for(const [index,a] of state.actors.entries()){
    const x=offsetX+(a.x+.5)*cellSize,y=(a.y+.5)*cellSize-cameraY;
    if(y+cellSize<0||y-cellSize>h)continue;
    const isWinner=ending&&ending.winnerIds.includes(a.id),motion=ending?GroundhogEnding.pose(isWinner,ending.elapsed,index*105,reducedMotion):{jump:0,scaleX:1,scaleY:1,angle:now<a.stunnedUntil?Math.sin(now/100)*.12:0};
    const facingRotation=ending?GroundhogView.endingRotation(state,a,faceToFace()):0,jumpSign=facingRotation?-1:1;
    ctx.fillStyle=a.color+(isWinner?'bb':'66');ctx.beginPath();ctx.ellipse(x,y+jumpSign*cellSize*.29,cellSize*(.32-motion.jump*.25),cellSize*.09,0,0,Math.PI*2);ctx.fill();
    if(isWinner){ctx.strokeStyle='#f3d079';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+jumpSign*cellSize*.29,cellSize*.4,cellSize*.14,0,0,Math.PI*2);ctx.stroke();}
    ctx.save();ctx.translate(x,y-jumpSign*motion.jump*cellSize);ctx.rotate(facingRotation+motion.angle);ctx.scale(motion.scaleX,motion.scaleY);if(ending&&!isWinner)ctx.globalAlpha=.83;
    const expression=images[`${a.sprite}-${isWinner?'happy':'sad'}`],sprite=ending&&ready(expression)?expression:images[`${a.sprite}-${a.facing}`];if(ready(sprite))ctx.drawImage(sprite,-cellSize*.47,-cellSize*.47,cellSize*.94,cellSize*.94);ctx.restore();
    if(isWinner){ctx.fillStyle='#ffe493';ctx.font=`bold ${cellSize*.27}px sans-serif`;ctx.textAlign='center';ctx.fillText('★',x,y-jumpSign*(cellSize*.64+motion.jump*cellSize));}
    if(!ending&&now<a.stunnedUntil){ctx.font=`bold ${cellSize*.32}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='#ffe274';for(let i=0;i<3;i++){const angle=now/280+i*Math.PI*2/3;ctx.fillText('★',x+Math.cos(angle)*cellSize*.4,y-cellSize*.33+Math.sin(angle)*cellSize*.15);}}
  }
  if(ending&&!reducedMotion&&ending.elapsed<6500){ctx.save();const colors=['#f7d467','#c4e28c','#92cceb','#eaa3c6'];for(let i=0;i<28;i++){const t=(ending.elapsed/2700+i*.137)%1,x=((i*71.31)%w)+Math.sin(t*8+i)*12,y=t*(h+30)-30;ctx.globalAlpha=.65;ctx.fillStyle=colors[i%4];ctx.fillRect(x,y,4,7);}ctx.restore();}
  if(burst&&!ending){const age=now-burst.at;if(age<700){ctx.save();ctx.globalAlpha=1-age/700;const bx=offsetX+(burst.x+.5)*cellSize,by=(burst.y+.5)*cellSize-cameraY;
    if(burst.kind==='coin'&&ready(images.coin)){const s=cellSize*.6;ctx.drawImage(images.coin,bx-s/2,by-s/2-age*cellSize/1800,s,s);ctx.fillStyle='#ffe88d';ctx.font=`bold ${cellSize*.35}px sans-serif`;ctx.textAlign='center';ctx.fillText('+1',bx,by-cellSize*.5-age*cellSize/1800);}
    else if(burst.kind==='bomb'){ctx.strokeStyle='#ffce8d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(bx,by,cellSize*(.2+age/650),0,Math.PI*2);ctx.stroke();}
    else if(burst.kind==='rock-broken'&&ready(images['rock-4']))ctx.drawImage(images['rock-4'],bx-cellSize*.45,by-cellSize*.45,cellSize*.9,cellSize*.9);
    ctx.restore();}else burst=null;}
  requestAnimationFrame(draw);
}
syncSettings();reset();requestAnimationFrame(draw);
