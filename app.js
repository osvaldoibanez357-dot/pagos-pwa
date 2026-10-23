const STORAGE_KEY = 'mis-pagos-v1';
const $ = (id) => document.getElementById(id);
let state = loadState();
state.subscriptions ||= [];

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { transactions: [] }; }
  catch { return { transactions: [] }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function money(n) { return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n || 0); }
function currentMonthKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function monthTx() { const key=currentMonthKey(); return state.transactions.filter(t => t.date.startsWith(key)); }

function render() {
  const txs = monthTx();
  const income = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  $('balance').textContent = money(income-expense);
  $('incomeTotal').textContent = money(income);
  $('expenseTotal').textContent = money(expense);
  $('monthLabel').textContent = new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(new Date());
  renderBars(income, expense);
  renderCategories(txs);
  renderTransactions();
  renderSubscriptions();
}

function renderBars(income, expense) {
  const max = Math.max(income, expense, 1);
  $('barChart').innerHTML = `
    <div class="bar-row"><span>Ingresos</span><div class="bar-track"><div class="bar-fill" style="width:${income/max*100}%"></div></div><span class="bar-value">${money(income)}</span></div>
    <div class="bar-row"><span>Gastos</span><div class="bar-track"><div class="bar-fill expense" style="width:${expense/max*100}%"></div></div><span class="bar-value">${money(expense)}</span></div>`;
}

function renderCategories(txs) {
  const expenses = txs.filter(t=>t.type==='expense');
  const grouped = expenses.reduce((a,t)=>(a[t.category]=(a[t.category]||0)+t.amount,a),{});
  const total = Object.values(grouped).reduce((a,b)=>a+b,0);
  const entries = Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
  $('categoryList').innerHTML = entries.length ? entries.map(([name,value])=>`
    <div class="category-item"><strong>${escapeHtml(name)}</strong><span>${money(value)}</span><div class="category-line"><span style="width:${total?value/total*100:0}%"></span></div></div>`).join('') : '<div class="empty">Todavía no hay gastos este mes.</div>';
}

function renderTransactions() {
  const items = [...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,12);
  $('transactions').innerHTML = items.length ? items.map(t=>`
    <div class="tx"><div class="tx-icon">${t.type==='income'?'↗':'↘'}</div><div class="tx-main"><strong>${escapeHtml(t.merchant)}</strong><span>${escapeHtml(t.category)} · ${escapeHtml(t.method)} · ${formatDate(t.date)}</span></div><div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'}${money(t.amount)}</div></div>`).join('') : '<div class="empty">Agrega tu primer movimiento con el botón +.</div>';
}

function formatDate(v){ const [y,m,d]=v.split('-').map(Number); return new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short'}).format(new Date(y,m-1,d)); }
function localDateValue(d=new Date()){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function normalizeAmount(raw=''){
  let v=String(raw).trim().replace(/[^0-9,.-]/g,'');
  if(!v) return '';
  const comma=v.lastIndexOf(','), dot=v.lastIndexOf('.');
  if(comma>-1 && dot>-1){
    if(comma>dot) v=v.replace(/\./g,'').replace(',','.');
    else v=v.replace(/,/g,'');
  } else if(comma>-1) v=v.replace(',','.');
  const n=Number(v);
  return Number.isFinite(n) && n>0 ? String(Math.round(n*100)/100) : '';
}
function prefillFromUrl(){
  const params=new URLSearchParams(location.search);
  const hasWalletData=['amount','merchant','card','date','category','note'].some(k=>params.has(k));
  if(!hasWalletData) return;
  openDialog();
  const amount=normalizeAmount(params.get('amount')||'');
  if(amount) $('amount').value=amount;
  if(params.get('merchant')) $('merchant').value=params.get('merchant');
  if(params.get('date')) $('date').value=params.get('date');
  if(params.get('category')) { const option=[...$('category').options].find(o=>o.value===params.get('category')); if(option) $('category').value=option.value; }
  $('method').value='Apple Pay';
  const notes=[];
  if(params.get('card')) notes.push(`Tarjeta: ${params.get('card')}`);
  if(params.get('note')) notes.push(params.get('note'));
  if(notes.length) $('note').value=notes.join(' · ');
  history.replaceState({},'',location.pathname+location.hash);
}
function escapeHtml(str=''){ return str.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function openDialog(){ $('movementForm').reset(); $('date').value = localDateValue(); $('movementDialog').showModal(); setTimeout(()=>$('amount').focus(),50); }
$('quickAdd').addEventListener('click',openDialog);
$('closeDialog').addEventListener('click',()=>$('movementDialog').close());
$('movementForm').addEventListener('submit',(e)=>{
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const tx = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    type: fd.get('type'), amount: Number(fd.get('amount')), merchant: fd.get('merchant').trim(),
    category: fd.get('category'), method: fd.get('method'), date: fd.get('date'), note: fd.get('note').trim(), createdAt: Date.now()
  };
  if (!tx.amount || !tx.merchant || !tx.date) return;
  state.transactions.push(tx); saveState(); render(); e.currentTarget.reset(); $('movementDialog').close();
});
$('clearAll').addEventListener('click',()=>{ if(confirm('¿Borrar todos los movimientos guardados en este dispositivo?')){ state.transactions=[]; saveState(); render(); } });
$('exportBtn').addEventListener('click',()=>{
  const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`mis-pagos-respaldo-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
});
$('importInput').addEventListener('change',async(e)=>{
  const file=e.target.files?.[0]; if(!file) return;
  try { const parsed=JSON.parse(await file.text()); if(!Array.isArray(parsed.transactions)) throw new Error(); if (parsed.subscriptions !== undefined && !Array.isArray(parsed.subscriptions)) throw new Error(); state=parsed; state.subscriptions ||= []; syncSubscriptions(); saveState(); render(); alert('Respaldo importado.'); }
  catch { alert('Ese archivo no parece ser un respaldo válido.'); }
  e.target.value='';
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
syncSubscriptions();
render();
prefillFromUrl();
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) { syncSubscriptions(); render(); } });
setInterval(()=>{ if(!document.hidden) { syncSubscriptions(); render(); } },60000);

function syncSubscriptions() {
  if (Recurring.generate(state, localDateValue())) saveState();
}
function renderSubscriptions() {
  const host=$('subscriptions'); host.replaceChildren();
  if (!state.subscriptions.length) { host.innerHTML='<div class="empty">Agrega tus suscripciones para registrar sus gastos mensuales.</div>'; return; }
  for (const sub of state.subscriptions) {
    const row=document.createElement('div'); row.className='subscription-row';
    const info=document.createElement('div'); info.className='tx-main';
    const name=document.createElement('strong'); name.textContent=sub.name;
    const detail=document.createElement('span');
    detail.textContent=`${money(sub.amount)} · Día ${Number(sub.start.slice(-2))} · ${sub.active ? 'Activa' : 'Pausada'}`;
    info.append(name,detail); row.append(info);
    const actions=document.createElement('div'); actions.className='tool-actions';
    const toggle=document.createElement('button'); toggle.className='secondary-btn'; toggle.textContent=sub.active?'Pausar':'Reactivar';
    toggle.onclick=()=>{
      syncSubscriptions();
      if(!sub.active) {
        // Skip paused months, including a charge already due this month.
        const today=localDateValue();
        const due=Recurring.dueDate(today.slice(0,7),sub.start);
        const previous=new Date(Number(today.slice(0,4)),Number(today.slice(5,7))-2,1);
        const through=due<=today?today.slice(0,7):currentMonthKey(previous);
        if(!sub.lastMonth || through>sub.lastMonth) sub.lastMonth=through;
      }
      sub.active=!sub.active; saveState(); render();
    };
    const remove=document.createElement('button'); remove.className='text-btn danger'; remove.textContent='Eliminar';
    remove.onclick=()=>{ if(confirm('¿Eliminar esta suscripción? Los gastos ya registrados se conservarán.')) {state.subscriptions=state.subscriptions.filter(s=>s.id!==sub.id);saveState();render();} };
    actions.append(toggle,remove); row.append(actions); host.append(row);
  }
}
$('addSubscription').onclick=()=>{ $('subscriptionForm').reset(); $('subscriptionStart').value=localDateValue(); $('subscriptionDialog').showModal(); };
$('closeSubscription').onclick=()=>$('subscriptionDialog').close();
$('subscriptionForm').onsubmit=(e)=>{
  e.preventDefault(); const fd=new FormData(e.currentTarget);
  const name=String(fd.get('name')).trim(), amount=Number(fd.get('amount')), start=String(fd.get('start'));
  if(!name || !Number.isFinite(amount) || amount<=0 || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return;
  if(start<localDateValue() && !confirm('La fecha inicial ya pasó. Se registrarán los cobros mensuales pendientes hasta hoy. ¿Continuar?')) return;
  state.subscriptions.push({id:crypto.randomUUID(),name,amount,start,method:fd.get('method'),note:String(fd.get('note')).trim(),active:true,lastMonth:null});
  syncSubscriptions(); saveState(); render(); $('subscriptionDialog').close();
};
