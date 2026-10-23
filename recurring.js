/* Monthly expense generation uses local YYYY-MM-DD values, without UTC conversion. */
const Recurring = (() => {
  function dueDate(month, start) {
    const [year, m] = month.split('-').map(Number);
    const day = Math.min(Number(start.slice(-2)), new Date(year, m, 0).getDate());
    return `${month}-${String(day).padStart(2,'0')}`;
  }
  function nextMonth(month) {
    const [year,m] = month.split('-').map(Number);
    return m===12 ? `${year+1}-01` : `${year}-${String(m+1).padStart(2,'0')}`;
  }
  function generate(state, today) {
    let changed=false;
    const ids=new Set(state.transactions.map(t=>t.id));
    for(const sub of state.subscriptions || []) {
      if(!sub.active || !/^\d{4}-\d{2}-\d{2}$/.test(sub.start) || !(sub.amount>0)) continue;
      let month=sub.lastMonth ? nextMonth(sub.lastMonth) : sub.start.slice(0,7);
      if(month<sub.start.slice(0,7)) month=sub.start.slice(0,7);
      while(month<=today.slice(0,7)) {
        const date=dueDate(month,sub.start);
        if(date>today) break;
        const id=`subscription:${sub.id}:${month}`;
        if(!ids.has(id)) {
          state.transactions.push({id,type:'expense',amount:sub.amount,merchant:sub.name,category:'Suscripciones',method:sub.method,date,note:sub.note||'',createdAt:Date.now(),subscriptionId:sub.id});
          ids.add(id);
        }
        sub.lastMonth=month; changed=true; month=nextMonth(month);
      }
    }
    return changed;
  }
  return {dueDate,nextMonth,generate};
})();
if(typeof module!=='undefined') module.exports=Recurring;
