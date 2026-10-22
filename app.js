const STORAGE_KEY = 'mis-pagos-v1';
const $ = (id) => document.getElementById(id);
let state = loadState();

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
function escapeHtml(str=''){ return str.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function openDialog(){ $('date').value = new Date().toISOString().slice(0,10); $('movementDialog').showModal(); setTimeout(()=>$('amount').focus(),50); }
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
$('clearAll').addEventListener('click',()=>{ if(confirm('¿Borrar todos los movimientos guardados en este dispositivo?')){ state={transactions:[]}; saveState(); render(); } });
$('exportBtn').addEventListener('click',()=>{
  const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`mis-pagos-respaldo-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
});
$('importInput').addEventListener('change',async(e)=>{
  const file=e.target.files?.[0]; if(!file) return;
  try { const parsed=JSON.parse(await file.text()); if(!Array.isArray(parsed.transactions)) throw new Error(); state=parsed; saveState(); render(); alert('Respaldo importado.'); }
  catch { alert('Ese archivo no parece ser un respaldo válido.'); }
  e.target.value='';
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
