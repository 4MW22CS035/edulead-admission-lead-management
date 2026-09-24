import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const API = 'https://edulead-admission-lead-management.onrender.com';
const SOURCES=['Website','Walk-in','Phone','WhatsApp','Fair','Campaign','Other'];
const STATUSES=['New','Contacted','Follow-up','Qualified','Converted','Lost'];
const PRIORITIES=['Low','Medium','High'];

async function api(path,opts={}){
 const token=localStorage.getItem('token');
 const res=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(opts.headers||{})}});
 const data=await res.json().catch(()=>({}));
 if(!res.ok) throw new Error(data.error || (data.errors||[]).join(', ') || 'Request failed');
 return data;
}

function Login({onLogin}){
 const [email,setEmail]=useState('manager@demo.com'); const [password,setPassword]=useState('password123'); const [err,setErr]=useState('');
 async function submit(e){e.preventDefault();setErr('');try{const d=await api('/auth/login',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem('token',d.token);localStorage.setItem('user',JSON.stringify(d.user));onLogin(d.user)}catch(x){setErr(x.message)}}
 return <div className="login"><div className="login-card"><div className="brand">EduLead</div><h1>Admission Lead Management</h1><p className="muted">Product engineering assessment prototype</p><form onSubmit={submit}><label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{err&&<div className="error">{err}</div>}<button className="primary full">Sign in</button></form><div className="demo"><b>Demo</b><br/>Manager: manager@demo.com<br/>Counsellor: counsellor@demo.com<br/>Password: password123</div></div></div>
}

function Stat({label,value,sub}){return <div className="stat"><div className="muted">{label}</div><div className="stat-number">{value}</div>{sub&&<div className="tiny">{sub}</div>}</div>}
function Modal({title,onClose,children}){return <div className="overlay"><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon" onClick={onClose}>×</button></div>{children}</div></div>}

function LeadForm({lead,counsellors,user,onClose,onSaved}){
 const blank={name:'',phone:'',email:'',course:'',source:'Website',status:'New',priority:'Medium',counsellor_id:user.role==='counsellor'?user.id:null,notes:''};
 const [form,setForm]=useState(lead||blank); const [err,setErr]=useState(''); const edit=!!lead;
 function set(k,v){setForm(f=>({...f,[k]:v}))}
 async function save(e){e.preventDefault();setErr('');try{const d=await api(edit?`/leads/${lead.id}`:'/leads',{method:edit?'PUT':'POST',body:JSON.stringify({...form,counsellor_id:form.counsellor_id?Number(form.counsellor_id):null})});onSaved(d)}catch(x){setErr(x.message)}}
 return <Modal title={edit?'Edit lead':'Add new lead'} onClose={onClose}><form className="grid-form" onSubmit={save}>
 <label>Student name*<input value={form.name} onChange={e=>set('name',e.target.value)} required/></label>
 <label>Phone*<input value={form.phone} onChange={e=>set('phone',e.target.value.replace(/\D/g,'').slice(0,10))} required/></label>
 <label>Email<input value={form.email||''} onChange={e=>set('email',e.target.value)}/></label>
 <label>Course preference*<input value={form.course} onChange={e=>set('course',e.target.value)} placeholder="e.g. B.Tech CSE" required/></label>
 <label>Lead source<select value={form.source} onChange={e=>set('source',e.target.value)}>{SOURCES.map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Status<select value={form.status} onChange={e=>set('status',e.target.value)}>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Priority<select value={form.priority} onChange={e=>set('priority',e.target.value)}>{PRIORITIES.map(x=><option key={x}>{x}</option>)}</select></label>
 {user.role==='manager'&&<label>Counsellor<select value={form.counsellor_id||''} onChange={e=>set('counsellor_id',e.target.value)}><option value="">Unassigned</option>{counsellors.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}
 <label className="wide">Notes<textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)} rows="3"/></label>
 {err&&<div className="error wide">{err}</div>}<div className="actions wide"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">{edit?'Save changes':'Create lead'}</button></div>
 </form></Modal>
}

function Followup({lead,onClose,onSaved}){
 const [date,setDate]=useState(new Date().toISOString().slice(0,10));const [note,setNote]=useState('');const [outcome,setOutcome]=useState('');const [err,setErr]=useState('');
 async function save(e){e.preventDefault();try{const d=await api(`/leads/${lead.id}/followups`,{method:'POST',body:JSON.stringify({due_date:date,note,outcome})});onSaved(d)}catch(x){setErr(x.message)}}
 return <Modal title={`Follow-up · ${lead.name}`} onClose={onClose}><form onSubmit={save}><label>Due date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label>Action / note<textarea value={note} onChange={e=>setNote(e.target.value)} rows="4" required placeholder="Call parent about scholarship…"/></label><label>Outcome (optional)<input value={outcome} onChange={e=>setOutcome(e.target.value)}/></label>{err&&<div className="error">{err}</div>}<div className="actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Add follow-up</button></div></form></Modal>
}

function App(){
 const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('user')||'null')); const [dash,setDash]=useState(null); const [leads,setLeads]=useState([]); const [counsellors,setCounsellors]=useState([]); const [filters,setFilters]=useState({search:'',status:'',source:'',priority:'',counsellor:''}); const [modal,setModal]=useState(null); const [err,setErr]=useState('');
 async function load(){try{const q=new URLSearchParams(Object.entries(filters).filter(([,v])=>v));const [l,d,c]=await Promise.all([api('/leads?'+q),api('/dashboard'),api('/counsellors')]);setLeads(l);setDash(d);setCounsellors(c);setErr('')}catch(e){setErr(e.message)}}
 useEffect(()=>{if(user)load()},[user,filters.status,filters.source,filters.priority,filters.counsellor]);
 if(!user)return <Login onLogin={setUser}/>;
 function logout(){localStorage.clear();setUser(null)}
 async function del(id){if(!confirm('Delete this lead? This action cannot be undone.'))return;try{await api('/leads/'+id,{method:'DELETE'});load()}catch(e){alert(e.message)}}
 return <div className="app"><header><div className="brand">EduLead</div><div className="top-title"><b>Admission Lead Management</b><span className="muted">{user.role==='manager'?'Manager dashboard':'Counsellor workspace'}</span></div><div className="user"><span>{user.name}</span><span className="role">{user.role}</span><button className="secondary small" onClick={logout}>Logout</button></div></header>
 <main>{err&&<div className="error banner">{err}</div>}<section className="stats">{dash&&<><Stat label="Total leads" value={dash.total}/><Stat label="Active pipeline" value={dash.active}/><Stat label="Converted" value={dash.converted}/><Stat label="Conversion rate" value={dash.conversion_rate+'%'}/><Stat label="Overdue follow-ups" value={dash.overdue}/></>}</section>
 <section className="insights"><div className="panel"><h3>Status pipeline</h3>{dash?.byStatus.map(x=><div className="barrow" key={x.label}><span>{x.label}</span><div className="bar"><i style={{width:`${dash.total?Math.max(6,x.value/dash.total*100):0}%`}}/></div><b>{x.value}</b></div>)}</div><div className="panel"><h3>Lead sources</h3>{dash?.bySource.map(x=><div className="barrow" key={x.label}><span>{x.label}</span><div className="bar"><i style={{width:`${dash.total?Math.max(6,x.value/dash.total*100):0}%`}}/></div><b>{x.value}</b></div>)}</div></section>
 <section className="panel leads"><div className="section-head"><div><h2>Leads</h2><p className="muted">Track every admission enquiry from first contact to conversion.</p></div><button className="primary" onClick={()=>setModal({type:'lead'})}>+ Add lead</button></div>
 <div className="filters"><input placeholder="Search name, phone, email or course…" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))}/><select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}><option value="">All statuses</option>{STATUSES.map(x=><option key={x}>{x}</option>)}</select><select value={filters.source} onChange={e=>setFilters(f=>({...f,source:e.target.value}))}><option value="">All sources</option>{SOURCES.map(x=><option key={x}>{x}</option>)}</select><select value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))}><option value="">All priorities</option>{PRIORITIES.map(x=><option key={x}>{x}</option>)}</select>{user.role==='manager'&&<select value={filters.counsellor} onChange={e=>setFilters(f=>({...f,counsellor:e.target.value}))}><option value="">All counsellors</option>{counsellors.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>}</div>
 <div className="table-wrap"><table><thead><tr><th>Lead</th><th>Course</th><th>Source</th><th>Status</th><th>Priority</th><th>Counsellor</th><th>Ageing</th><th>Next action</th><th></th></tr></thead><tbody>{leads.map(l=>{const next=l.followups?.find(f=>f.due_date>=new Date().toISOString().slice(0,10));return <tr key={l.id}><td><b>{l.name}</b><small>{l.phone}<br/>{l.email}</small></td><td>{l.course}</td><td>{l.source}</td><td><span className={'pill '+l.status.toLowerCase().replace(/\W/g,'')}>{l.status}</span></td><td><span className={'priority '+l.priority.toLowerCase()}>{l.priority}</span></td><td>{l.counsellor_name}</td><td>{l.ageing_days}d</td><td>{next?<><b>{next.due_date}</b><small>{next.note}</small></>:<span className="muted">No scheduled action</span>}</td><td className="row-actions"><button onClick={()=>setModal({type:'follow',lead:l})}>Follow-up</button><button onClick={()=>setModal({type:'lead',lead:l})}>Edit</button>{user.role==='manager'&&<button className="danger" onClick={()=>del(l.id)}>Delete</button>}</td></tr>})}</tbody></table>{!leads.length&&<div className="empty">No leads match these filters.</div>}</div></section></main>
 {modal?.type==='lead'&&<LeadForm lead={modal.lead} counsellors={counsellors} user={user} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>}{modal?.type==='follow'&&<Followup lead={modal.lead} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>}
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
