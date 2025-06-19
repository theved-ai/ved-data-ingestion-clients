const EXPAND_KEY = 'pensieve-expanded';
function getExpandState(){ return localStorage.getItem(EXPAND_KEY)==='true'; }
function setExpandState(v){ localStorage.setItem(EXPAND_KEY, v?'true':'false'); }
