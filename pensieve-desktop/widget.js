const ORB_SZ=84, W_W=360, W_H=120, W_HE=240, M=32, N=32;
const USER='7dcb16b8-c05c-4ec4-9524-0003e11acd2a';

const orb=document.getElementById('orb'),
      wdg=document.getElementById('widget'),
      input=document.getElementById('note-input'),
      status=document.getElementById('status'),
      closeOrbBtn=document.getElementById('close-orb'),
      closeWBtn=document.getElementById('close-widget'),
      expBtn=document.getElementById('expand-btn'), // now removed from HTML
      sendBtn=document.getElementById('send-btn');

function getWState(){
  return input.classList.contains('expanded')
    ? {width:W_W,height:W_HE}
    : {width:W_W,height:W_H};
}

// restore collapse/expand
if(getExpandState()){
  wdg.classList.add('expanded');
}
  
// auto-resize textarea
input.addEventListener('input',()=>{
  input.style.height='auto';
  input.style.height=input.scrollHeight+'px';
  sendBtn.disabled=!input.value.trim();
});

// enter key
input.addEventListener('keydown',e=>{
  if(e.key==='Enter' && !e.shiftKey){
    e.preventDefault(); sendBtn.click();
  }
});

// dragging
enableDrag(orb,'orb',()=>({width:ORB_SZ,height:ORB_SZ}),{SIDE_MARGIN:M,BOTTOM_MARGIN:N});
enableDrag(wdg,'wdg',getWState,{SIDE_MARGIN:M,BOTTOM_MARGIN:N});

// submit
wdg.addEventListener('submit',async e=>{
  e.preventDefault();
  let c=input.value.trim(); if(!c) return;
  sendBtn.disabled=true; status.textContent='Sending…';
  try{
    let r=await fetch('http://localhost:8000/v1/ingest',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body: JSON.stringify({user_id:USER,data_source:'user_typed',content:c})
    });
    if(!r.ok) throw new Error(r.status);
    status.textContent='Note sent';
    input.value=''; input.style.height='36px';
  }catch(err){
    status.textContent='Error';
  }
  setTimeout(()=>status.textContent='',1200);
  sendBtn.disabled=false;
});

// close
closeOrbBtn.onclick=closeWBtn.onclick=()=>closeWindow();

// toggle expand (via shortcut)
onToggleExpand(()=>setExpanded(wdg.style.display==='none'));

// show on load
setExpanded(true);

function setExpanded(on){
  if(on){
    orb.style.display='none';
    wdg.style.display='block';
    let {x,y,width,height} = (()=>{
      let {width,height}=getWState();
      // reposition if out of screen
      let sx=window.screenX, sy=window.screenY;
      let {w,h}={w:window.screen.width,h:window.screen.height};
      if(sx+width+M>w) sx=w-width-M;
      if(sy+height+N>h) sy=h-height-N;
      if(sy<16) sy=16;
      return {width,height,x:sx,y:sy};
    })();
    setWindow({width,height,x,y});
    setTimeout(()=>input.focus(),100);
  } else {
    wdg.style.display='none';
    orb.style.display='flex';
    let {w,h}={w:window.screen.width,h:window.screen.height};
    setWindow({width:ORB_SZ,height:ORB_SZ,x:w-ORB_SZ-N,y:h-ORB_SZ-N});
  }
}
