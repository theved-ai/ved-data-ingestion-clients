function enableDrag(el, mode, getState, {SIDE_MARGIN,BOTTOM_MARGIN}) {
  let dragging=false, start={x:0,y:0}, origin={x:0,y:0}, frame;
  let target={};
  function clamp(v,m,M){return Math.max(m,Math.min(v,M));}
  function animate(){
    if(!dragging) return;
    setWindow(target);
    frame = requestAnimationFrame(animate);
  }
  el.addEventListener('mousedown',e=>{
    if(e.target.closest('textarea,button')) return;
    dragging=true;
    start={x:e.screenX,y:e.screenY};
    origin={x:window.screenX,y:window.screenY};
    document.body.style.cursor='grabbing';
    frame=requestAnimationFrame(animate);
  });
  window.addEventListener('mousemove',e=>{
    if(!dragging) return;
    let dx=e.screenX-start.x, dy=e.screenY-start.y;
    let {w,h}={w:window.screen.width,h:window.screen.height};
    let {width,height}=getState();
    let x=clamp(origin.x+dx,SIDE_MARGIN,w-width-SIDE_MARGIN);
    let y=clamp(origin.y+dy,BOTTOM_MARGIN,h-height-BOTTOM_MARGIN);
    target={width,height,x,y};
  });
  window.addEventListener('mouseup',()=>{
    if(!dragging) return;
    dragging=false;
    cancelAnimationFrame(frame);
    document.body.style.cursor='';
    setWindow(target);
  });
}
