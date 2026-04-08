function getData(){
  const r=localStorage.getItem('swentech_v2');
  let d=r?JSON.parse(r):{projects:[],expenses:[],users:[],auditLogs:[]};
  if(!d.users || d.users.length === 0 || d.credVersion !== 3){
    d.users=[
      {name:'Karthigeyan B.S', id:'9840713587', pass:'9840@2006', key:'k'},
      {name:'Vendhan c', id:'9003497233', pass:'9003@2006', key:'v'},
      {name:'Abisha', id:'9025746604', pass:'9025@2006', key:'a'},
      {name:'Rakesh', id:'7871398619', pass:'7871@2008', key:'r'}
    ];
    d.credVersion = 3;
    saveData(d);
  }
  if(!d.auditLogs) d.auditLogs=[];
  return d;
}

function addAuditLog(action, desc){
  const data = getData();
  const user = currentRole === 'admin' ? 'ADMIN' : (currentUser?.name || 'Unknown');
  data.auditLogs.unshift({
    timestamp: new Date().toLocaleString('en-IN'),
    user, action, desc
  });
  if(data.auditLogs.length > 100) data.auditLogs.pop(); // Cap at 100 logs
  saveData(data);
}
function saveData(d){localStorage.setItem('swentech_v2',JSON.stringify(d))}
function formatINR(n){const v=parseFloat(n)||0;return '₹'+v.toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2})}
function today(){return new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function initIcons(){if(window.lucide)window.lucide.createIcons();}

function isDateInRange(dateStr, from, to){
  if(!from && !to) return true;
  const d = new Date(dateStr);
  if(from && d < new Date(from)) return false;
  if(to && d > new Date(to)) return false;
  return true;
}

const ADMIN={user:'SWEN TECH',pass:'KVAR@26'};
let currentRole=null,currentUser=null;

// ══ AUTH ══
function switchLoginTab(tab,btn){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('adminLoginForm').style.display=tab==='admin'?'':'none';
  document.getElementById('userLoginForm').style.display=tab==='user'?'':'none';
  document.getElementById('loginErr').style.display='none';
}
function loginAdmin(){
  const u=document.getElementById('adminUser').value.trim();
  const p=document.getElementById('adminPass').value.trim();
  if(u===ADMIN.user&&p===ADMIN.pass){currentRole='admin';currentUser=null;enterApp();}
  else showLoginError();
}
function loginUser(){
  const uid=document.getElementById('userId').value.trim();
  const pass=document.getElementById('userPass').value.trim();
  const data=getData();
  const found=data.users.find(u=>u.id===uid&&u.pass===pass);
  if(found){currentRole='user';currentUser=found;enterApp();}
  else showLoginError();
}
function showLoginError(){const e=document.getElementById('loginErr');e.style.display='block';setTimeout(()=>e.style.display='none',3000)}
function enterApp(){
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('appScreen').classList.add('active');
  initIcons();
  if(currentRole==='admin'){
    document.getElementById('navAvatar').textContent='ST';
    document.getElementById('navName').textContent='SWEN TECH';
    document.getElementById('navRole').textContent='ADMIN';
    document.getElementById('navRole').className='role-badge admin';
    document.getElementById('adminTabs').style.display='';
    document.getElementById('userTabs').style.display='none';
    showAdminTab('dashboard');
  } else {
    document.getElementById('navAvatar').textContent=currentUser.name.charAt(0);
    document.getElementById('navName').textContent=currentUser.name;
    document.getElementById('navRole').textContent='USER';
    document.getElementById('navRole').className='role-badge user';
    document.getElementById('adminTabs').style.display='none';
    document.getElementById('userTabs').style.display='';
    showUserTab('myDashboard');
  }
}
function logout(){
  currentRole=null;currentUser=null;
  document.getElementById('appScreen').classList.remove('active');
  document.getElementById('loginScreen').classList.add('active');
  ['adminUser','adminPass','userId','userPass'].forEach(id=>document.getElementById(id).value='');
}

// ══ TABS ══
function switchTab(name){currentRole==='admin'?showAdminTab(name):showUserTab(name)}
function showAdminTab(name){
  const tabs=['dashboard','addProject','expenses','users','statement'];
  document.querySelectorAll('#adminNav .tnav-btn').forEach(b=>{
    const onclick=b.getAttribute('onclick')||'';
    b.classList.toggle('active',onclick.includes(`'${name}'`));
  });
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  const panel=document.getElementById('tab-'+name);
  if(panel)panel.classList.add('active');
  if(name==='dashboard')renderAdminDashboard();
  if(name==='addProject'){resetAddForm();}
  if(name==='expenses')renderExpenses();
  if(name==='users')renderUserManagement();
  if(name==='statement')renderStatement();
  if(name==='audit')renderAuditLogs();
}
function showUserTab(name){
  const tabs=['myDashboard','myProjects'];
  document.querySelectorAll('#userTabs .tnav-btn').forEach((b,i)=>b.classList.toggle('active',tabs[i]===name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  const panel=document.getElementById('tab-'+name);
  if(panel)panel.classList.add('active');
  if(name==='myDashboard')renderUserDashboard();
  if(name==='myProjects')renderUserProjects();
}

function getSubSplits(p){
  // returns {k,v,a,r} total from all sub-projects of a project
  const s={k:0,v:0,a:0,r:0};
  (p.subProjects||[]).forEach(sub=>{
    s.k+=sub.splits?.k||0;
    s.v+=sub.splits?.v||0;
    s.a+=sub.splits?.a||0;
    s.r+=sub.splits?.r||0;
  });
  return s;
}
function getTotals(data){
  let tE=0,tK=0,tV=0,tA=0,tR=0,tGST=0;
  data.projects.forEach(p=>{
    const subE=(p.subProjects||[]).reduce((s,sub)=>s+(sub.amount||0),0);
    const projE = (p.earnings||0) + subE;
    tE += projE;
    if(p.gst) tGST += projE * 0.18;
    const ss=getSubSplits(p);
    tK+=(p.splits?.k||0)+ss.k;
    tV+=(p.splits?.v||0)+ss.v;
    tA+=(p.splits?.a||0)+ss.a;
    tR+=(p.splits?.r||0)+ss.r;
  });
  const tSplits=tK+tV+tA+tR;
  const projBal=tE-tSplits;
  const tExp=data.expenses.reduce((s,e)=>s+(e.amount||0),0);
  const compBal=projBal-tExp;
  return{totalEarnings:tE,totalK:tK,totalV:tV,totalA:tA,totalR:tR,totalSplits:tSplits,totalExpenses:tExp,companyBalance:compBal,totalGST:tGST};
}

// ══ ADMIN RENDER ══
let revenueChartInstance=null,expenseChartInstance=null;
function renderCharts(data){
  const ctxRev=document.getElementById('revenueChart')?.getContext('2d');
  const ctxExp=document.getElementById('expenseChart')?.getContext('2d');
  if(!ctxRev||!ctxExp)return;
  if(revenueChartInstance)revenueChartInstance.destroy();
  if(expenseChartInstance)expenseChartInstance.destroy();
  
  const last6Months=Array.from({length:6},(_,i)=>{
    const d=new Date();d.setMonth(d.getMonth()-i);
    return d.toLocaleString('default',{month:'short'});
  }).reverse();
  
  const revData=last6Months.map(m=>{
    return data.projects.filter(p=>p.date.includes(m)).reduce((s,p)=>{
      const subAmt=(p.subProjects||[]).reduce((ss,sub)=>ss+(sub.amount||0),0);
      return s+(p.earnings||0)+subAmt;
    },0);
  });

  revenueChartInstance=new Chart(ctxRev,{
    type:'bar',
    data:{labels:last6Months,datasets:[{label:'Revenue',data:revData,backgroundColor:'#00d4ff',borderRadius:5}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'#2a3450'},border:{display:false},ticks:{color:'#8896b3',callback:v=>'₹'+v/1000+'k'}},x:{grid:{display:false},ticks:{color:'#8896b3'}}}}
  });

  const expData=data.expenses.reduce((acc,e)=>{
    const cat=e.category||'General';acc[cat]=(acc[cat]||0)+e.amount;return acc;
  },{});
  
  expenseChartInstance=new Chart(ctxExp,{
    type:'doughnut',
    data:{labels:Object.keys(expData),datasets:[{data:Object.values(expData),backgroundColor:['#7c3aed','#10b981','#f59e0b','#ef4444','#00d4ff'],borderWidth:0,hoverOffset:10}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8896b3',usePointStyle:true,font:{size:11}}}},cutout:'70%'}
  });

  // Team Performance Chart
  const ctxTeam=document.getElementById('teamChart')?.getContext('2d');
  if(ctxTeam){
    const t=getTotals(data);
    new Chart(ctxTeam,{
      type:'bar',
      data:{labels:['Karthigeyan','Vendhan','Abisha','Rakesh'],datasets:[{label:'Revenue Split',data:[t.totalK,t.totalV,t.totalA,t.totalR],backgroundColor:['#00d4ff','#7c3aed','#10b981','#f59e0b']}]},
      options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{display:false},y:{ticks:{color:'#8896b3'}}}}
    });
  }
}

function calculateForecast(revData){
  const n = revData.length;
  if(n < 2) return { value: 0, confidence: 0 };
  const x = Array.from({length:n},(_,i)=>i);
  const y = revData;
  const sumX = x.reduce((a,b)=>a+b,0);
  const sumY = y.reduce((a,b)=>a+b,0);
  const sumXY = x.reduce((a,b,i)=>a+(b*y[i]),0);
  const sumXX = x.reduce((a,b)=>a+(b*b),0);
  const slope = (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX);
  const intercept = (sumY - slope*sumX) / n;
  const forecast = slope * n + intercept;
  const confidence = Math.min(95, 70 + (n * 5)); 
  return { value: Math.max(0, forecast), confidence };
}

function renderAdminDashboard(){
  let data=getData();
  const from=document.getElementById('dashFromDate')?.value;
  const to=document.getElementById('dashToDate')?.value;
  const search=document.getElementById('dashSearch')?.value.toLowerCase();
  
  // Filter for dashboard
  const projects = data.projects.filter(p=>{
    const inRange = isDateInRange(p.date, from, to);
    const matchesSearch = !search || p.name.toLowerCase().includes(search) || (p.client||'').toLowerCase().includes(search);
    return inRange && matchesSearch;
  });
  const expenses = data.expenses.filter(e=>isDateInRange(e.date, from, to));
  const filteredData = { ...data, projects, expenses };

  const t=getTotals(filteredData);
  renderCharts(filteredData);
  initIcons();
  
  // Forecast
  const last6Months = revenueChartInstance?.data?.datasets[0]?.data || [];
  const forecast = calculateForecast(last6Months);

  document.getElementById('adminStats').innerHTML=`
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Net Revenue</div><div class="stat-value">${formatINR(t.totalEarnings)}</div></div>
    <div class="stat-card green"><div class="stat-icon">📤</div><div class="stat-label">Total Payouts</div><div class="stat-value">${formatINR(t.totalSplits)}</div></div>
    <div class="stat-card warn"><div class="stat-icon">🏦</div><div class="stat-label">Biz Balance</div><div class="stat-value">${formatINR(t.companyBalance)}</div></div>
    <div class="stat-card purple"><div class="stat-icon">📈</div><div class="stat-label">AI Forecast (Next Mo)</div><div class="stat-value">${formatINR(forecast.value)}<span style="font-size:10px;display:block;opacity:0.7">Conf: ${forecast.confidence}%</span></div></div>`;
  
  const tbody=document.getElementById('dashTableBody');
  if(!projects.length){
    tbody.innerHTML=`<tr><td colspan="9"><div class="empty-state"><div class="big">📭</div><p>No projects found in this range.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=projects.slice().reverse().map((p,i)=>{
    const idx=projects.length-i;
    const subTag=p.subProjects&&p.subProjects.length?`<span class="has-subs">📂 ${p.subProjects.length} sub</span>`:'';
    const ss=getSubSplits(p);
    const subAmt=(p.subProjects||[]).reduce((s,sub)=>s+(sub.amount||0),0);
    const statusClass='status-'+(p.status||'Active').toLowerCase();
    const gstTag=p.gst?`<span class="gst-info">(incl. 18% GST)</span>`:'';
    return `<tr>
      <td><span class="badge badge-blue">${idx}</span></td>
      <td class="td-project">
        <div style="font-weight:700">${p.name}</div>
        <div style="font-size:11px;color:var(--text2)">${p.client||'No Client'}</div>
      </td>
      <td class="td-amount" style="color:var(--accent)">
        ${formatINR((p.earnings||0)+subAmt)}
        ${gstTag}
      </td>
      <td class="td-amount" style="color:var(--accent3)">${formatINR((p.splits?.k||0)+ss.k)}</td>
      <td class="td-amount" style="color:#a78bfa">${formatINR((p.splits?.v||0)+ss.v)}</td>
      <td class="td-amount" style="color:#f472b6">${formatINR((p.splits?.a||0)+ss.a)}</td>
      <td class="td-amount" style="color:var(--warn)">${formatINR((p.splits?.r||0)+ss.r)}</td>
      <td class="td-date">
        <span class="status-pill ${statusClass}">${p.status||'Active'}</span>
        <div style="margin-top:4px">${p.date}</div>
      </td>
      <td><div class="proj-actions">
        <button class="btn-edit-proj" onclick="sendWhatsAppReminder('${p.id}')" title="WhatsApp Reminder" style="background:rgba(16,185,129,.1);color:#10b981;border:none;border-radius:6px;width:32px;height:32px;font-size:12px">💬</button>
        <button class="btn-edit-proj" onclick="downloadInvoice('${p.id}')" title="Generate Invoice" style="background:rgba(0,212,255,.1);color:var(--accent);border:none;border-radius:6px;width:32px;height:32px;font-size:12px">📄</button>
        <button class="btn-edit-proj" onclick="openEditModal('${p.id}')" style="font-size:12px">✏️</button>
        <button class="btn-del-proj" onclick="deleteProject('${p.id}')" style="font-size:12px">🗑</button>
      </div></td>
    </tr>`;
  }).join('');
}

function renderStatement(){
  let data=getData();
  const from=document.getElementById('stmtFromDate')?.value;
  const to=document.getElementById('stmtToDate')?.value;
  const search=document.getElementById('stmtSearch')?.value.toLowerCase();
  
  const projects = data.projects.filter(p=>{
    const inRange = isDateInRange(p.date, from, to);
    const matchesSearch = !search || p.name.toLowerCase().includes(search) || (p.client||'').toLowerCase().includes(search);
    return inRange && matchesSearch;
  });
  const expenses = data.expenses.filter(e=>isDateInRange(e.date, from, to));
  const filteredData = { ...data, projects, expenses };
  
  const t=getTotals(filteredData);
  document.getElementById('summaryTotals').innerHTML=`
    <div class="sum-box teal"><div class="s-label">Total Earnings</div><div class="s-value">${formatINR(t.totalEarnings)}</div></div>
    <div class="sum-box green"><div class="s-label">Payouts</div><div class="s-value">${formatINR(t.totalSplits)}</div></div>
    <div class="sum-box warn"><div class="s-label">GST Collect (18%)</div><div class="s-value" style="color:var(--accent)">${formatINR(t.totalGST)}</div></div>
    <div class="sum-box warn"><div class="s-label">Expenses</div><div class="s-value" style="color:var(--danger)">${formatINR(t.totalExpenses)}</div></div>
    <div class="sum-box teal" style="background:rgba(0,212,255,0.1)"><div class="s-label">Net Biz Profit</div><div class="s-value">${formatINR(t.companyBalance)}</div></div>`;
  const tbody=document.getElementById('statementBody');
  if(!projects.length){tbody.innerHTML=`<tr><td colspan="9" class="no-data">No projects found for selected period.</td></tr>`;return;}
  tbody.innerHTML=projects.slice().reverse().map((p,i)=>{
    const ss=getSubSplits(p);
    const subAmt=(p.subProjects||[]).reduce((s,sub)=>s+(sub.amount||0),0);
    const totalE=(p.earnings||0)+subAmt;
    const tk=(p.splits?.k||0)+ss.k,tv=(p.splits?.v||0)+ss.v,ta=(p.splits?.a||0)+ss.a,tr=(p.splits?.r||0)+ss.r;
    const co=totalE-tk-tv-ta-tr;
    return `<tr>
      <td>${projects.length-i}</td>
      <td class="td-project">${p.name}${p.subProjects?.length?`<br><span style="font-size:11px;color:var(--text3)">${p.subProjects.map(s=>s.name).join(', ')}</span>`:''}</td>
      <td class="td-amount" style="color:var(--accent)">${formatINR(totalE)}</td>
      <td>${formatINR(tk)}</td>
      <td>${formatINR(tv)}</td>
      <td>${formatINR(ta)}</td>
      <td>${formatINR(tr)}</td>
      <td class="td-amount" style="color:var(--warn)">${formatINR(co)}</td>
      <td class="td-date">${p.date}</td>
    </tr>`;
  }).join('');
}

function renderExpenses(){
  const data=getData(),t=getTotals(data);
  document.getElementById('expenseStats').innerHTML=`
    <div class="stat-card warn"><div class="stat-icon">🏦</div><div class="stat-label">Company Balance</div><div class="stat-value">${formatINR(t.companyBalance)}</div></div>
    <div class="stat-card"><div class="stat-icon">📉</div><div class="stat-label">Total Expenses</div><div class="stat-value" style="color:var(--danger)">${formatINR(t.totalExpenses)}</div></div>
    <div class="stat-card green"><div class="stat-icon">💹</div><div class="stat-label">Project Balance</div><div class="stat-value">${formatINR(t.companyBalance+t.totalExpenses)}</div></div>`;
  const log=document.getElementById('expenseLog');
  if(!data.expenses.length){log.innerHTML='<div class="no-data">No expenses recorded yet.</div>';return;}
  log.innerHTML=data.expenses.slice().reverse().map(e=>`
    <div class="expense-item">
      <div>
        <div class="e-name">${e.name}</div>
        <div class="badge badge-purple" style="font-size:9px; margin-top:4px;">${e.category||'General'}</div>
        <div class="e-date" style="margin-top:4px;">${e.date}</div>
      </div>
      <div class="e-amt">-${formatINR(e.amount)}</div>
    </div>`).join('');
}

// ══ SUB-PROJECTS UI ══
let subRowCounter=0;
function addSubRow(listId){
  const id='sub_'+Date.now()+'_'+(subRowCounter++);
  const div=document.createElement('div');
  div.className='sub-entry';
  div.id=id;
  div.innerHTML=`
    <div style="width:100%;margin-bottom:8px;display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
      <div class="form-group" style="flex:2;min-width:140px;margin-bottom:0"><label>Sub-Project Name</label><input type="text" placeholder="e.g. Logo Design" class="sub-name"></div>
      <div class="form-group" style="flex:1;min-width:100px;margin-bottom:0"><label>Amount (₹)</label><input type="number" placeholder="0.00" class="sub-amount" oninput="recalcFromParent(this)"></div>
      <button class="btn-del-sub" onclick="document.getElementById('${id}').remove();recalcAll()">✕</button>
    </div>
    <div style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
      <div class="form-group" style="margin-bottom:0"><div class="split-user-label" style="font-size:10px"><span class="split-user-dot"></span>Karthigeyan</div><input type="number" placeholder="0" class="sub-k" oninput="recalcFromParent(this)"></div>
      <div class="form-group" style="margin-bottom:0"><div class="split-user-label" style="font-size:10px"><span class="split-user-dot" style="background:#a78bfa"></span>Vendhan</div><input type="number" placeholder="0" class="sub-v" oninput="recalcFromParent(this)"></div>
      <div class="form-group" style="margin-bottom:0"><div class="split-user-label" style="font-size:10px"><span class="split-user-dot" style="background:#f472b6"></span>Abisha</div><input type="number" placeholder="0" class="sub-a" oninput="recalcFromParent(this)"></div>
      <div class="form-group" style="margin-bottom:0"><div class="split-user-label" style="font-size:10px"><span class="split-user-dot" style="background:var(--warn)"></span>Rakesh</div><input type="number" placeholder="0" class="sub-r" oninput="recalcFromParent(this)"></div>
    </div>`;
  document.getElementById(listId).appendChild(div);
}
function recalcFromParent(el){
  // find which form we're in and trigger correct recalc
  const inEdit=el.closest('#editSubList')||el.closest('.modal-body');
  if(inEdit&&document.getElementById('editSubList').contains(el))calcEditSplit();
  else calcSplit();
}
function recalcAll(){
  if(document.getElementById('tab-addProject').classList.contains('active'))calcSplit();
  if(!document.getElementById('editModal').classList.contains('hidden'))calcEditSplit();
}
function getSubProjects(listId){
  const rows=document.getElementById(listId).querySelectorAll('.sub-entry');
  const subs=[];
  rows.forEach(r=>{
    const n=(r.querySelector('.sub-name')?.value||'').trim();
    const a=parseFloat(r.querySelector('.sub-amount')?.value)||0;
    const k=parseFloat(r.querySelector('.sub-k')?.value)||0;
    const v=parseFloat(r.querySelector('.sub-v')?.value)||0;
    const subA=parseFloat(r.querySelector('.sub-a')?.value)||0;
    const subR=parseFloat(r.querySelector('.sub-r')?.value)||0;
    if(n) subs.push({name:n,amount:a,splits:{k,v,a:subA,r:subR}});
  });
  return subs;
}
function loadSubProjects(listId,subs){
  const container=document.getElementById(listId);
  container.innerHTML='';
  (subs||[]).forEach(s=>{
    const id='sub_'+Date.now()+'_'+(subRowCounter++);
    const div=document.createElement('div');
    div.className='sub-entry';div.id=id;
    div.innerHTML=`
      <div style="width:100%;margin-bottom:8px;display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="flex:2;min-width:140px;margin-bottom:0"><label>Sub-Project Name</label><input type="text" value="${s.name}" placeholder="e.g. Logo Design" class="sub-name"></div>
        <div class="form-group" style="flex:1;min-width:100px;margin-bottom:0"><label>Amount (₹)</label><input type="number" value="${s.amount||0}" placeholder="0.00" class="sub-amount" oninput="recalcFromParent(this)"></div>
        <button class="btn-del-sub" onclick="document.getElementById('${id}').remove();recalcAll()">✕</button>
      </div>
      <div style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
        <div class="form-group" style="margin-bottom:0"><div class="split-user-label" style="font-size:10px"><span class="split-user-dot"></span>Karthigeyan</div><input type="number" value="${s.splits?.k||0}" placeholder="0" class="sub-k" oninput="recalcFromParent(this)"></div>
        <div class="form-group" style="margin-bottom:0"><div class="split-user-label" style="font-size:10px"><span class="split-user-dot" style="background:#a78bfa"></span>Vendhan</div><input type="number" value="${s.splits?.v||0}" placeholder="0" class="sub-v" oninput="recalcFromParent(this)"></div>
        <div class="form-group" style="margin-bottom:0"><div class="split-user-label" style="font-size:10px"><span class="split-user-dot" style="background:#f472b6"></span>Abisha</div><input type="number" value="${s.splits?.a||0}" placeholder="0" class="sub-a" oninput="recalcFromParent(this)"></div>
        <div class="form-group" style="margin-bottom:0"><div class="split-user-label" style="font-size:10px"><span class="split-user-dot" style="background:var(--warn)"></span>Rakesh</div><input type="number" value="${s.splits?.r||0}" placeholder="0" class="sub-r" oninput="recalcFromParent(this)"></div>
      </div>`;
    container.appendChild(div);
  });
}

function calcSplit(){
  const e=parseFloat(document.getElementById('projEarnings').value)||0;
  const k=parseFloat(document.getElementById('split_k').value)||0;
  const v=parseFloat(document.getElementById('split_v').value)||0;
  const a=parseFloat(document.getElementById('split_a').value)||0;
  const r=parseFloat(document.getElementById('split_r').value)||0;
  // sum sub-project amounts and splits
  const subs=getSubProjects('newSubList');
  const subAmt=subs.reduce((s,sub)=>s+(sub.amount||0),0);
  const subK=subs.reduce((s,sub)=>s+(sub.splits?.k||0),0);
  const subV=subs.reduce((s,sub)=>s+(sub.splits?.v||0),0);
  const subA=subs.reduce((s,sub)=>s+(sub.splits?.a||0),0);
  const subR=subs.reduce((s,sub)=>s+(sub.splits?.r||0),0);
  const totalE=e+subAmt;
  const ts=(k+subK)+(v+subV)+(a+subA)+(r+subR);
  const bal=totalE-ts;
  document.getElementById('totalSplitsDisplay').textContent=formatINR(ts);
  document.getElementById('companyBalDisplay').textContent=formatINR(bal);
  const row=document.getElementById('calcBalRow');
  row.className='calc-row '+(bal<0?'danger':'warn');
  const warn=document.getElementById('addValWarn');
  if(ts>totalE){warn.style.display='block';warn.textContent='⛔ Total splits exceed total earnings!';}
  else if(bal<0){warn.style.display='block';warn.textContent='⛔ Company balance cannot go negative!';}
  else{warn.style.display='none';}
}
function calcEditSplit(){
  const e=parseFloat(document.getElementById('editProjEarnings').value)||0;
  const k=parseFloat(document.getElementById('edit_k').value)||0;
  const v=parseFloat(document.getElementById('edit_v').value)||0;
  const a=parseFloat(document.getElementById('edit_a').value)||0;
  const r=parseFloat(document.getElementById('edit_r').value)||0;
  const subs=getSubProjects('editSubList');
  const subAmt=subs.reduce((s,sub)=>s+(sub.amount||0),0);
  const subK=subs.reduce((s,sub)=>s+(sub.splits?.k||0),0);
  const subV=subs.reduce((s,sub)=>s+(sub.splits?.v||0),0);
  const subA=subs.reduce((s,sub)=>s+(sub.splits?.a||0),0);
  const subR=subs.reduce((s,sub)=>s+(sub.splits?.r||0),0);
  const totalE=e+subAmt;
  const ts=(k+subK)+(v+subV)+(a+subA)+(r+subR);
  const bal=totalE-ts;
  document.getElementById('editTotalSplitsDisplay').textContent=formatINR(ts);
  document.getElementById('editCompanyBalDisplay').textContent=formatINR(bal);
  const row=document.getElementById('editCalcBalRow');
  row.className='calc-row '+(bal<0?'danger':'warn');
  const warn=document.getElementById('editValWarn');
  if(ts>totalE){warn.style.display='block';warn.textContent='⛔ Total splits exceed total earnings!';}
  else if(bal<0){warn.style.display='block';warn.textContent='⛔ Company balance cannot go negative!';}
  else{warn.style.display='none';}
}

// ══ VALIDATION ══
function validateSplits(earnings,k,v,a,r){
  const ts=k+v+a+r,bal=earnings-ts;
  if(ts>earnings){showToast('⛔ Splits exceed earnings! Cannot save.',true);return false;}
  if(bal<0){showToast('⛔ Company balance negative! Reduce splits.',true);return false;}
  return true;
}

// ══ SAVE PROJECT ══
function resetAddForm(){
  ['projName','projClient','projEarnings','projDueDate','split_k','split_v','split_a','split_r'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('projStatus').value='Active';
  document.getElementById('projGst').checked=false;
  document.getElementById('newSubList').innerHTML='';
  document.getElementById('totalSplitsDisplay').textContent='₹0';
  document.getElementById('companyBalDisplay').textContent='₹0';
  document.getElementById('addValWarn').style.display='none';
  document.getElementById('calcBalRow').className='calc-row warn';
}
function saveProject(){
  const name=document.getElementById('projName').value.trim();
  const client=document.getElementById('projClient').value.trim();
  const earnings=parseFloat(document.getElementById('projEarnings').value)||0;
  const dueDate=document.getElementById('projDueDate').value;
  const status=document.getElementById('projStatus').value;
  const gst=document.getElementById('projGst').checked;

  const k=parseFloat(document.getElementById('split_k').value)||0;
  const v=parseFloat(document.getElementById('split_v').value)||0;
  const a=parseFloat(document.getElementById('split_a').value)||0;
  const r=parseFloat(document.getElementById('split_r').value)||0;
  
  if(!name){showToast('⚠️ Enter project name',true);return;}
  if(!earnings){showToast('⚠️ Enter total earnings',true);return;}
  
  const subs=getSubProjects('newSubList');
  const subAmt=subs.reduce((s,sub)=>s+(sub.amount||0),0);
  const subK=subs.reduce((s,sub)=>s+(sub.splits?.k||0),0);
  const subV=subs.reduce((s,sub)=>s+(sub.splits?.v||0),0);
  const subA=subs.reduce((s,sub)=>s+(sub.splits?.a||0),0);
  const subR=subs.reduce((s,sub)=>s+(sub.splits?.r||0),0);
  
  if(!validateSplits(earnings+subAmt,k+subK,v+subV,a+subA,r+subR))return;
  
  const data=getData();
  data.projects.push({
    id:'proj_'+Date.now(),
    name,client,earnings,dueDate,status,gst,
    splits:{k,v,a,r},
    subProjects:subs,
    date:today()
  });
  saveData(data);
  addAuditLog('Project Added', `Created project: ${name} (Client: ${client})`);
  resetAddForm();
  showToast('✅ Project saved!');
  setTimeout(()=>showAdminTab('dashboard'),600);
}

// ══ DELETE PROJECT ══
function deleteProject(id){
  if(!confirm('Delete this project? This cannot be undone.'))return;
  const data=getData();
  data.projects=data.projects.filter(p=>p.id!==id);
  saveData(data);
  addAuditLog('Project Deleted', `Removed project with ID: ${id}`);
  renderAdminDashboard();
  showToast('🗑 Project deleted');
}

// ══ EDIT MODAL ══
function openEditModal(id){
  const data=getData();
  const p=data.projects.find(x=>x.id===id);
  if(!p)return;
  document.getElementById('editProjId').value=id;
  document.getElementById('editProjName').value=p.name;
  document.getElementById('editProjClient').value=p.client||'';
  document.getElementById('editProjEarnings').value=p.earnings;
  document.getElementById('editProjDueDate').value=p.dueDate||'';
  document.getElementById('editProjStatus').value=p.status||'Active';
  document.getElementById('editProjGst').checked=p.gst||false;
  
  document.getElementById('edit_k').value=p.splits?.k||0;
  document.getElementById('edit_v').value=p.splits?.v||0;
  document.getElementById('edit_a').value=p.splits?.a||0;
  document.getElementById('edit_r').value=p.splits?.r||0;
  loadSubProjects('editSubList',p.subProjects||[]);
  calcEditSplit();
  document.getElementById('editModal').classList.remove('hidden');
}
function closeEditModal(){document.getElementById('editModal').classList.add('hidden')}
function saveEditProject(){
  const id=document.getElementById('editProjId').value;
  const name=document.getElementById('editProjName').value.trim();
  const client=document.getElementById('editProjClient').value.trim();
  const earnings=parseFloat(document.getElementById('editProjEarnings').value)||0;
  const dueDate=document.getElementById('editProjDueDate').value;
  const status=document.getElementById('editProjStatus').value;
  const gst=document.getElementById('editProjGst').checked;

  const k=parseFloat(document.getElementById('edit_k').value)||0;
  const v=parseFloat(document.getElementById('edit_v').value)||0;
  const a=parseFloat(document.getElementById('edit_a').value)||0;
  const r=parseFloat(document.getElementById('edit_r').value)||0;
  
  if(!name){showToast('⚠️ Enter project name',true);return;}
  if(!earnings){showToast('⚠️ Enter total earnings',true);return;}
  
  const subs=getSubProjects('editSubList');
  const subAmt=subs.reduce((s,sub)=>s+(sub.amount||0),0);
  const subK=subs.reduce((s,sub)=>s+(sub.splits?.k||0),0);
  const subV=subs.reduce((s,sub)=>s+(sub.splits?.v||0),0);
  const subA=subs.reduce((s,sub)=>s+(sub.splits?.a||0),0);
  const subR=subs.reduce((s,sub)=>s+(sub.splits?.r||0),0);
  
  if(!validateSplits(earnings+subAmt,k+subK,v+subV,a+subA,r+subR))return;
  
  const data=getData();
  const idx=data.projects.findIndex(p=>p.id===id);
  if(idx===-1){showToast('Project not found',true);return;}
  data.projects[idx]={...data.projects[idx],name,client,earnings,dueDate,status,gst,splits:{k,v,a,r},subProjects:subs};
  saveData(data);
  addAuditLog('Project Edited', `Updated details for project: ${name}`);
  closeEditModal();
  showToast('✅ Project updated!');
  renderAdminDashboard();
}

// ══ EXPENSE ══
function addExpense(){
  const name=document.getElementById('expName').value.trim();
  const category=document.getElementById('expCategory').value;
  const amount=parseFloat(document.getElementById('expAmount').value)||0;
  if(!name){showToast('⚠️ Enter expense name',true);return;}
  if(amount<=0){showToast('⚠️ Enter a positive amount',true);return;}

  const data=getData();
  const t=getTotals(data);
  if(amount>t.companyBalance){
    showToast('⛔ Expense exceeds company balance! Cannot deduct.',true);
    return;
  }
  data.expenses.push({id:'exp_'+Date.now(),name,category,amount,date:today()});
  saveData(data);
  addAuditLog('Expense Tracked', `Added ${category} expense: ${name} (${formatINR(amount)})`);
  document.getElementById('expName').value='';
  document.getElementById('expAmount').value='';
  renderExpenses();
  showToast('✅ Expense recorded!');
}

// ══ USER MANAGEMENT ══
function renderUserManagement(){
  const data=getData();
  const list=document.getElementById('userManagementList');
  list.innerHTML=data.users.map(u=>`
    <div class="user-card">
      <div class="u-avatar-sm">${u.name.charAt(0)}</div>
      <div class="u-info">
        <div class="u-name">${u.name}</div>
        <div class="u-id">${u.id}</div>
      </div>
      <div class="u-actions">
        <button class="btn-icon-del" onclick="removeUser('${u.id}')" title="Delete User">🗑</button>
      </div>
    </div>
  `).join('');
}
function addNewUser(){
  const name=document.getElementById('newUserName').value.trim();
  const id=document.getElementById('newUserId').value.trim();
  const pass=document.getElementById('newUserPass').value.trim();
  if(!name||!id||!pass){showToast('⚠️ All fields required!',true);return;}
  
  const data=getData();
  if(data.users.some(u=>u.id===id)){showToast('⚠️ User ID already exists!',true);return;}
  
  const keys=['k','v','a','r']; // Basic keys for now
  const key=keys[data.users.length % keys.length]; 
  
  data.users.push({name,id,pass,key});
  saveData(data);
  ['newUserName','newUserId','newUserPass'].forEach(i=>document.getElementById(i).value='');
  renderUserManagement();
  showToast('👥 User added successfully!');
}
function removeUser(id){
  if(!confirm('Permanently remove this user?'))return;
  const data=getData();
  const userName = data.users.find(u=>u.id===id)?.name || id;
  data.users=data.users.filter(u=>u.id!==id);
  saveData(data);
  addAuditLog('User Removed', `Deleted user account: ${userName}`);
  renderUserManagement();
  showToast('🗑 User removed');
}

function renderAuditLogs(){
  const data=getData();
  const list=document.getElementById('auditLogList');
  if(!data.auditLogs || data.auditLogs.length === 0){
    list.innerHTML = `<div class="no-data">No audit logs recorded yet.</div>`;
    return;
  }
  list.innerHTML = data.auditLogs.map(l=>`
    <div class="audit-item">
      <div class="a-header">
        <span class="a-user">${l.user}</span>
        <span class="a-timestamp">${l.timestamp}</span>
      </div>
      <div class="a-action">${l.action}</div>
      <div class="a-desc">${l.desc}</div>
    </div>
  `).join('');
}

function sendWhatsAppReminder(id){
  const data=getData();
  const p=data.projects.find(x=>x.id===id);
  if(!p) return;
  const subAmt=(p.subProjects||[]).reduce((s,sub)=>s+(sub.amount||0),0);
  const total = formatINR(p.earnings + subAmt);
  const msg = `Hi ${p.client||'there'}, this is a friendly reminder from SWEN TECH regarding the payment for project "${p.name}". The total amount is ${total}. Please let us know if you have any questions. Thank you!`;
  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  addAuditLog('WhatsApp Sent', `Reminder sent for project: ${p.name}`);
}

// ══ USER RENDERS ══
function renderUserDashboard(){
  const data=getData(),t=getTotals(data),u=currentUser;
  const keyMap={k:'K',v:'V',a:'A',r:'R'};
  const myTotal=t['total'+keyMap[u.key]];
  document.getElementById('userAvatarBig').textContent=u.name.charAt(0);
  document.getElementById('userHeroName').textContent=u.name;
  document.getElementById('userHeroId').textContent=u.id;
  document.getElementById('userStats').innerHTML=`
    <div class="stat-card green"><div class="stat-icon">💵</div><div class="stat-label">My Total Share</div><div class="stat-value">${formatINR(myTotal)}</div></div>
    <div class="stat-card warn"><div class="stat-icon">🏦</div><div class="stat-label">Company Balance</div><div class="stat-value">${formatINR(t.companyBalance)}</div></div>
    <div class="stat-card"><div class="stat-icon">📁</div><div class="stat-label">Projects</div><div class="stat-value">${data.projects.length}</div></div>`;
}

function renderUserProjects(){
  const data=getData(),u=currentUser;
  const list=document.getElementById('userProjectList');
  if(!data.projects.length){list.innerHTML='<div class="empty-state"><div class="big">📭</div><p>No projects available yet.</p></div>';return;}
  list.innerHTML=data.projects.slice().reverse().map(p=>{
    const myAmt=p.splits?.[u.key]||0;
    const subHtml=p.subProjects&&p.subProjects.length?`
      <div class="sub-list">
        ${p.subProjects.map(s=>{
          const mySubAmt=s.splits?.[u.key]||0;
          return `<div class="sub-item">
            <span class="s-name">📂 ${s.name}</span>
            <div style="text-align:right">
              ${s.amount?`<div style="font-size:11px;color:var(--text3)">Total: ${formatINR(s.amount)}</div>`:''}
              ${mySubAmt?`<div class="s-amt">My share: ${formatINR(mySubAmt)}</div>`:'<div style="font-size:11px;color:var(--text3)">—</div>'}
            </div>
          </div>`;
        }).join('')}
      </div>`:'';
    const subTotal=(p.subProjects||[]).reduce((s,sub)=>s+(sub.splits?.[u.key]||0),0);
    const totalMyAmt=myAmt+subTotal;
    return `<div class="project-item">
      <div class="pi-top">
        <div><div class="pi-name">${p.name}</div><div class="pi-date">${p.date}</div></div>
        <div class="pi-amount">${formatINR(totalMyAmt)}</div>
      </div>${subHtml}
    </div>`;
  }).join('');
}

// ══ PDF ══
// ══ INVOICE ══
function downloadInvoice(id){
  const data=getData();
  const p=data.projects.find(x=>x.id===id);
  if(!p){showToast('Project not found',true);return;}
  
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  let y=20;

  // Header
  doc.setFillColor(10,12,16);doc.rect(0,0,W,50,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(24);doc.setTextColor(0,212,255);doc.text('INVOICE',20,25);
  doc.setFontSize(10);doc.setTextColor(136,150,179);doc.text('SWEN TECH SOLUTIONS',20,33);
  doc.text('Invoice #: INV-'+p.id.split('_')[1],W-20,25,{align:'right'});
  doc.text('Date: '+p.date,W-20,31,{align:'right'});

  // Client Info
  y=65;
  doc.setFontSize(9);doc.setTextColor(136,150,179);doc.text('BILL TO:',20,y);
  doc.setFontSize(12);doc.setTextColor(232,237,247);doc.text(p.client||'Client Name',20,y+7);
  
  doc.setFontSize(9);doc.setTextColor(136,150,179);doc.text('PROJECT:',120,y);
  doc.setFontSize(12);doc.setTextColor(232,237,247);doc.text(p.name,120,y+7);

  // Table Header
  y=90;
  doc.setFillColor(26,32,48);doc.rect(15,y,W-30,10,'F');
  doc.setFontSize(9);doc.setTextColor(232,237,247);
  doc.text('Description',20,y+6.5);doc.text('Amount',W-25,y+6.5,{align:'right'});

  // Items
  y+=10;
  doc.setFontSize(10);doc.setTextColor(232,237,247);
  doc.text(p.name + ' Service Fee',20,y+10);
  doc.text(formatINR(p.earnings),W-25,y+10,{align:'right'});
  y+=18;

  if(p.subProjects&&p.subProjects.length){
    p.subProjects.forEach(s=>{
      doc.setFontSize(9);doc.setTextColor(136,150,179);
      doc.text('  - '+s.name,20,y);doc.text(formatINR(s.amount),W-25,y,{align:'right'});
      y+=8;
    });
  }

  // Totals
  const subTotal = (p.earnings||0) + (p.subProjects||[]).reduce((s,sub)=>s+(sub.amount||0),0);
  const gst = p.gst ? (subTotal * 0.18) : 0;
  const grandTotal = p.gst ? subTotal : (subTotal + (subTotal * 0.18)); // Logic depends on how user entered it. Assume entered amount is base if GST is checked.
  
  y=220;
  doc.setDrawColor(42,52,80);doc.line(120,y,W-15,y);y+=10;
  doc.setFontSize(10);doc.setTextColor(136,150,179);doc.text('Subtotal:',130,y);
  doc.setTextColor(232,237,247);doc.text(formatINR(subTotal),W-25,y,{align:'right'});y+=8;
  
  if(p.gst){
    doc.setFontSize(10);doc.setTextColor(136,150,179);doc.text('GST (18%):',130,y);
    doc.setTextColor(232,237,247);doc.text(formatINR(subTotal*0.18),W-25,y,{align:'right'});y+=8;
  }
  
  doc.setFillColor(0,212,255);doc.rect(120,y+2,W-135,12,'F');
  doc.setFontSize(12);doc.setTextColor(10,12,16);doc.text('TOTAL:',130,y+10);
  doc.text(formatINR(p.gst?subTotal:subTotal*1.18),W-25,y+10,{align:'right'});

  // Footer
  doc.setFontSize(8);doc.setTextColor(136,150,179);
  doc.text('Thank you for your business!',W/2,280,{align:'center'});

  doc.save('Invoice_'+p.name.replace(/ /g,'_')+'.pdf');
  showToast('📄 Invoice generated!');
}

function renderAdminPDF(){
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const data=getData(),t=getTotals(data),W=doc.internal.pageSize.getWidth();
  let y=20;
  doc.setFillColor(10,12,16);doc.rect(0,0,W,40,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(22);doc.setTextColor(0,212,255);doc.text('SWEN TECH',20,18);
  doc.setFontSize(10);doc.setTextColor(136,150,179);doc.text('Company Finance Report',20,26);doc.text('Date: '+today(),W-20,26,{align:'right'});
  y=50;doc.setFillColor(26,32,48);doc.roundedRect(15,y,W-30,28,3,3,'F');
  doc.setFontSize(9);doc.setTextColor(136,150,179);
  doc.text('TOTAL EARNINGS',25,y+8);doc.text('TOTAL SPLITS',75,y+8);doc.text('EXPENSES',125,y+8);doc.text('COMPANY BALANCE',165,y+8);
  doc.setFont('helvetica','bold');doc.setFontSize(12);
  doc.setTextColor(0,212,255);doc.text('Rs.'+t.totalEarnings.toFixed(2),25,y+20);
  doc.setTextColor(16,185,129);doc.text('Rs.'+t.totalSplits.toFixed(2),75,y+20);
  doc.setTextColor(239,68,68);doc.text('Rs.'+t.totalExpenses.toFixed(2),125,y+20);
  doc.setTextColor(245,158,11);doc.text('Rs.'+t.companyBalance.toFixed(2),165,y+20);
  y=90;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(232,237,247);doc.text('Project Breakdown',15,y);y+=8;
  doc.setFillColor(22,27,38);doc.rect(15,y,W-30,8,'F');
  doc.setFontSize(8);doc.setTextColor(136,150,179);
  doc.text('#',18,y+5.5);doc.text('Project',26,y+5.5);doc.text('Earnings',75,y+5.5);
  doc.text('K',98,y+5.5);doc.text('V',111,y+5.5);doc.text('A',124,y+5.5);doc.text('R',137,y+5.5);
  doc.text('Co.Bal',150,y+5.5);doc.text('Date',172,y+5.5);y+=10;
  data.projects.forEach((p,i)=>{
    if(y>270){doc.addPage();y=20;}
    const ss=getSubSplits(p);
    const subAmt=(p.subProjects||[]).reduce((s,sub)=>s+(sub.amount||0),0);
    const totalE=(p.earnings||0)+subAmt;
    const tk=(p.splits?.k||0)+ss.k, tv=(p.splits?.v||0)+ss.v, ta=(p.splits?.a||0)+ss.a, tr=(p.splits?.r||0)+ss.r;
    const co=totalE-tk-tv-ta-tr;

    doc.setFillColor(i%2===0?20:26,i%2===0?24:32,i%2===0?36:48);doc.rect(15,y-2,W-30,9,'F');
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(232,237,247);
    doc.text(String(i+1),18,y+4);doc.text(p.name.substring(0,22),26,y+4);
    doc.setTextColor(0,212,255);doc.text(totalE.toFixed(0),75,y+4);
    doc.setTextColor(16,185,129);doc.text(tk.toFixed(0),98,y+4);
    doc.setTextColor(167,139,250);doc.text(tv.toFixed(0),111,y+4);
    doc.setTextColor(244,114,182);doc.text(ta.toFixed(0),124,y+4);
    doc.setTextColor(245,158,11);doc.text(tr.toFixed(0),137,y+4);
    doc.setTextColor(245,158,11);doc.text(co.toFixed(0),150,y+4);
    doc.setTextColor(136,150,179);doc.text(p.date,172,y+4);y+=9;
    if(p.subProjects&&p.subProjects.length){
      p.subProjects.forEach(s=>{
        if(y>275){doc.addPage();y=20;}
        doc.setFillColor(15,18,28);doc.rect(15,y-2,W-30,7,'F');
        doc.setFontSize(7);doc.setTextColor(74,85,104);
        doc.text('  └ '+s.name.substring(0,20),26,y+3);doc.text(s.amount?'Rs.'+s.amount:'-',75,y+3);y+=7;
      });
    }
  });
  if(data.expenses.length){
    y+=8;if(y>260){doc.addPage();y=20;}
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(232,237,247);doc.text('Expenses',15,y);y+=8;
    data.expenses.forEach((e,i)=>{
      if(y>275){doc.addPage();y=20;}
      doc.setFillColor(20,24,36);doc.rect(15,y-2,W-30,8,'F');
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(232,237,247);doc.text(e.name,20,y+3);
      doc.setTextColor(239,68,68);doc.text('-Rs.'+(e.amount).toFixed(2),160,y+3,{align:'right'});
      doc.setTextColor(136,150,179);doc.text(e.date,175,y+3);y+=8;
    });
  }
  doc.save('SWEN_TECH_Company_Report_'+today().replace(/ /g,'_')+'.pdf');
  showToast('📄 PDF downloaded!');
}

function downloadCSV(){
  const data=getData(), t=getTotals(data);
  let csv = 'Project Name,Client,Earnings,Splits Total,Balance,Status,Date\n';
  data.projects.forEach(p=>{
    const subAmt=(p.subProjects||[]).reduce((s,sub)=>s+(sub.amount||0),0);
    const ss=getSubSplits(p);
    const ts=(p.splits?.k||0)+(p.splits?.v||0)+(p.splits?.a||0)+(p.splits?.r||0)+ss.k+ss.v+ss.a+ss.r;
    csv += `"${p.name}","${p.client||'-'}",${p.earnings+subAmt},${ts},${(p.earnings+subAmt)-ts},"${p.status}","${p.date}"\n`;
  });
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='SWEN_TECH_Statement_'+today().replace(/ /g,'_')+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  showToast('📊 CSV Exported!');
}

function downloadUserPDF(){
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const data=getData(),t=getTotals(data),u=currentUser,W=doc.internal.pageSize.getWidth();
  let y=20;
  const keyMap={k:'K',v:'V',a:'A',r:'R'};
  const myTotal=t['total'+keyMap[u.key]];
  doc.setFillColor(10,12,16);doc.rect(0,0,W,40,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(20);doc.setTextColor(0,212,255);doc.text('SWEN TECH',20,18);
  doc.setFontSize(10);doc.setTextColor(136,150,179);doc.text('Personal Earnings Statement',20,26);doc.text('Generated: '+today(),W-20,26,{align:'right'});
  y=50;doc.setFillColor(26,32,48);doc.roundedRect(15,y,W-30,30,3,3,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(232,237,247);doc.text(u.name,25,y+12);
  doc.setFontSize(9);doc.setTextColor(136,150,179);doc.text('User ID: '+u.id,25,y+20);
  doc.setFontSize(9);doc.text('Total Share:',130,y+10);
  doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(16,185,129);doc.text('Rs.'+myTotal.toFixed(2),130,y+21);
  doc.setFontSize(9);doc.setTextColor(136,150,179);doc.text('Company Balance: Rs.'+t.companyBalance.toFixed(2),130,y+28);
  y=90;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(232,237,247);doc.text('Project Earnings',15,y);y+=8;
  doc.setFillColor(22,27,38);doc.rect(15,y,W-30,8,'F');
  doc.setFontSize(8);doc.setTextColor(136,150,179);doc.text('#',18,y+5.5);doc.text('Project Name',28,y+5.5);doc.text('My Amount',150,y+5.5);doc.text('Date',175,y+5.5);y+=10;
  data.projects.forEach((p,i)=>{
    if(y>270){doc.addPage();y=20;}
    const subTotal=(p.subProjects||[]).reduce((s,sub)=>s+(sub.splits?.[u.key]||0),0);
    const myTotalAmt=(p.splits?.[u.key]||0)+subTotal;

    doc.setFillColor(i%2===0?20:26,i%2===0?24:32,i%2===0?36:48);doc.rect(15,y-2,W-30,9,'F');
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(232,237,247);
    doc.text(String(i+1),18,y+4);doc.text(p.name.substring(0,40),28,y+4);
    doc.setTextColor(16,185,129);doc.text('Rs.'+myTotalAmt.toFixed(2),150,y+4);
    doc.setTextColor(136,150,179);doc.text(p.date,175,y+4);y+=9;
    if(p.subProjects&&p.subProjects.length){
      p.subProjects.forEach(s=>{
        if(y>275){doc.addPage();y=20;}
        doc.setFillColor(15,18,28);doc.rect(15,y-2,W-30,7,'F');
        doc.setFontSize(7);doc.setTextColor(74,85,104);doc.text('  └ '+s.name.substring(0,40),28,y+3);
        const subSplit = s.splits?.[u.key]||0;
        doc.setTextColor(16,185,129);doc.text(subSplit ? 'Rs.'+subSplit.toFixed(2) : '-', 150, y+3);
        y+=7;
      });
    }
  });
  y+=10;doc.setFillColor(22,40,30);doc.roundedRect(15,y,W-30,14,2,2,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(16,185,129);doc.text('TOTAL: Rs.'+myTotal.toFixed(2),25,y+9);
  doc.save('SWEN_TECH_'+u.name+'_Statement_'+today().replace(/ /g,'_')+'.pdf');
  showToast('📄 Statement downloaded!');
}

// ══ TOAST ══
function showToast(msg,isError=false){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className='toast'+(isError?' error':'');t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2800);
}

// ══ PWA MANIFEST ══
(function(){
  const manifest={name:'SWEN TECH Finance',short_name:'SWEN TECH',start_url:'.',display:'standalone',background_color:'#0a0c10',theme_color:'#0a0c10',description:'SWEN TECH Finance Manager',icons:[{src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="%230a0c10"/><text x="96" y="130" font-size="100" text-anchor="middle" fill="%2300d4ff" font-family="sans-serif" font-weight="bold">S</text></svg>',sizes:'192x192',type:'image/svg+xml'},{src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="%230a0c10"/><text x="256" y="360" font-size="280" text-anchor="middle" fill="%2300d4ff" font-family="sans-serif" font-weight="bold">S</text></svg>',sizes:'512x512',type:'image/svg+xml'}]};
  const blob=new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'});
  document.getElementById('pwaManifest').href=URL.createObjectURL(blob);
})();

// ══ KEYBOARD ══
document.getElementById('adminPass').addEventListener('keydown',e=>{if(e.key==='Enter')loginAdmin()});
document.getElementById('userPass').addEventListener('keydown',e=>{if(e.key==='Enter')loginUser()});
document.getElementById('adminUser').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('adminPass').focus()});
document.getElementById('userId').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('userPass').focus()});
document.getElementById('editModal').addEventListener('click',e=>{if(e.target===document.getElementById('editModal'))closeEditModal()});
