async function fetchHistory(){
  const token = localStorage.getItem('token');
  if(!token) { location.href='/'; return; }
  const r = await fetch('/history',{headers:{'Authorization':'Bearer '+token}});
  const j = await r.json();
  const h = document.getElementById('history'); h.innerHTML='';
  for(const m of j){
    const div = document.createElement('div'); div.textContent = `${m.role}: ${m.content}`; h.appendChild(div);
  }
}

async function send(){
  const token = localStorage.getItem('token');
  const input = document.getElementById('input');
  const msg = input.value;
  if(!msg) return;
  const r = await fetch('/chat',{method:'POST',headers:{'content-type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({message:msg})});
  const j = await r.json();
  input.value='';
  await fetchHistory();
}

function logout(){ localStorage.removeItem('token'); location.href='/'; }

fetchHistory();
