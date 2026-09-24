const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'edumerge-demo-secret-change-in-production';
const DB_FILE = path.join(__dirname, 'admission-data.json');

app.use(cors());
app.use(express.json());

const SOURCES = ['Website','Walk-in','Phone','WhatsApp','Fair','Campaign','Other'];
const STATUSES = ['New','Contacted','Follow-up','Qualified','Converted','Lost'];
const PRIORITIES = ['Low','Medium','High'];

function nowIso(){ return new Date().toISOString(); }
function today(){ return new Date().toISOString().slice(0,10); }
function save(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }
function load(){
  if(fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
  const hash = bcrypt.hashSync('password123', 10);
  const created = nowIso();
  const db = {
    nextUserId: 3, nextLeadId: 6, nextFollowupId: 5,
    users: [
      {id:1,name:'Demo Manager',email:'manager@demo.com',password_hash:hash,role:'manager'},
      {id:2,name:'Demo Counsellor',email:'counsellor@demo.com',password_hash:hash,role:'counsellor'}
    ],
    leads: [
      {id:1,name:'Rahul Shetty',phone:'9876543210',email:'rahul@example.com',course:'BCA',source:'Website',status:'New',priority:'High',counsellor_id:2,notes:'Interested in scholarship.',created_at:new Date(Date.now()-86400000*2).toISOString(),updated_at:created},
      {id:2,name:'Priya Nair',phone:'9876543211',email:'priya@example.com',course:'B.Tech CSE',source:'Walk-in',status:'Follow-up',priority:'Medium',counsellor_id:2,notes:'Requested campus visit.',created_at:new Date(Date.now()-86400000*8).toISOString(),updated_at:created},
      {id:3,name:'Arjun Rao',phone:'9876543212',email:'arjun@example.com',course:'MBA',source:'WhatsApp',status:'Qualified',priority:'High',counsellor_id:2,notes:'Parent follow-up pending.',created_at:new Date(Date.now()-86400000*14).toISOString(),updated_at:created},
      {id:4,name:'Sneha Kumar',phone:'9876543213',email:'sneha@example.com',course:'MCA',source:'Campaign',status:'Converted',priority:'Low',counsellor_id:1,notes:'Admission completed.',created_at:new Date(Date.now()-86400000*25).toISOString(),updated_at:created},
      {id:5,name:'Vikram Das',phone:'9876543214',email:'vikram@example.com',course:'BBA',source:'Fair',status:'Lost',priority:'Medium',counsellor_id:1,notes:'Selected another institution.',created_at:new Date(Date.now()-86400000*30).toISOString(),updated_at:created}
    ],
    followups: [
      {id:1,lead_id:2,due_date:today(),note:'Confirm campus visit timing.',outcome:'',created_at:created},
      {id:2,lead_id:3,due_date:new Date(Date.now()-86400000).toISOString().slice(0,10),note:'Call parent about scholarship.',outcome:'',created_at:created},
      {id:3,lead_id:1,due_date:new Date(Date.now()+86400000).toISOString().slice(0,10),note:'Share scholarship details.',outcome:'',created_at:created},
      {id:4,lead_id:4,due_date:new Date(Date.now()-86400000*5).toISOString().slice(0,10),note:'Admission completed check.',outcome:'Completed',created_at:created}
    ]
  };
  save(db); return db;
}
let db = load();
function persist(){ save(db); }
function nextId(key){ const id=db[key]++; persist(); return id; }
function userById(id){ return db.users.find(u=>u.id===Number(id)); }
function leadById(id){ return db.leads.find(l=>l.id===Number(id)); }
function followupsFor(id){ return db.followups.filter(f=>f.lead_id===Number(id)).sort((a,b)=>a.due_date.localeCompare(b.due_date)||b.id-a.id); }
function enrich(l){
  const u=userById(l.counsellor_id);
  const ageing_days=Math.max(0,Math.floor((Date.now()-new Date(l.created_at).getTime())/86400000));
  return {...l,counsellor_name:u?u.name:null,ageing_days,followups:followupsFor(l.id)};
}
function auth(req,res,next){
  const token=(req.headers.authorization||'').replace('Bearer ','');
  try{ req.user=jwt.verify(token,JWT_SECRET); next(); }catch{ res.status(401).json({error:'Authentication required'}); }
}
function managerOnly(req,res,next){ if(req.user.role!=='manager') return res.status(403).json({error:'Manager access required'}); next(); }
function validateLead(b,partial=false){
  const errors=[];
  if(!partial || b.name!==undefined) if(!String(b.name||'').trim()) errors.push('Name is required');
  if(!partial || b.phone!==undefined) if(!/^\d{10}$/.test(String(b.phone||''))) errors.push('Phone must contain exactly 10 digits');
  if(!partial || b.course!==undefined) if(!String(b.course||'').trim()) errors.push('Course is required');
  if(b.source!==undefined && !SOURCES.includes(b.source)) errors.push('Invalid source');
  if(b.status!==undefined && !STATUSES.includes(b.status)) errors.push('Invalid status');
  if(b.priority!==undefined && !PRIORITIES.includes(b.priority)) errors.push('Invalid priority');
  return errors;
}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'EduLead API'}));

app.post('/api/auth/login',(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||'');
  const u=db.users.find(x=>x.email.toLowerCase()===email);
  if(!u || !bcrypt.compareSync(password,u.password_hash)) return res.status(401).json({error:'Invalid email or password'});
  const token=jwt.sign({id:u.id,name:u.name,email:u.email,role:u.role},JWT_SECRET,{expiresIn:'8h'});
  res.json({token,user:{id:u.id,name:u.name,email:u.email,role:u.role}});
});

app.get('/api/counsellors',auth,(req,res)=>res.json(db.users.filter(u=>u.role==='counsellor').sort((a,b)=>a.name.localeCompare(b.name)).map(({id,name,email})=>({id,name,email}))));

app.get('/api/leads',auth,(req,res)=>{
  let rows=db.leads.slice();
  const {search,status,source,priority,counsellor}=req.query;
  if(req.user.role==='counsellor') rows=rows.filter(l=>l.counsellor_id===req.user.id);
  if(search){ const q=search.toLowerCase(); rows=rows.filter(l=>[l.name,l.phone,l.email,l.course].some(v=>String(v||'').toLowerCase().includes(q))); }
  if(status) rows=rows.filter(l=>l.status===status);
  if(source) rows=rows.filter(l=>l.source===source);
  if(priority) rows=rows.filter(l=>l.priority===priority);
  if(counsellor) rows=rows.filter(l=>l.counsellor_id===Number(counsellor));
  res.json(rows.sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(enrich));
});

app.get('/api/leads/:id',auth,(req,res)=>{
  const l=leadById(req.params.id); if(!l) return res.status(404).json({error:'Lead not found'});
  if(req.user.role==='counsellor' && l.counsellor_id!==req.user.id) return res.status(403).json({error:'Lead not assigned to you'});
  res.json(enrich(l));
});

app.post('/api/leads',auth,(req,res)=>{
  const b=req.body||{}, errors=validateLead(b);
  if(errors.length) return res.status(400).json({errors});
  if(db.leads.some(l=>l.phone===String(b.phone))) return res.status(409).json({error:'A lead with this phone number already exists'});
  const counsellor_id=b.counsellor_id?Number(b.counsellor_id):(req.user.role==='counsellor'?req.user.id:null);
  if(counsellor_id && !db.users.some(u=>u.id===counsellor_id && u.role==='counsellor')) return res.status(400).json({error:'Invalid counsellor'});
  const now=nowIso();
  const l={id:nextId('nextLeadId'),name:String(b.name).trim(),phone:String(b.phone),email:String(b.email||'').trim(),course:String(b.course).trim(),source:b.source||'Website',status:b.status||'New',priority:b.priority||'Medium',counsellor_id,notes:String(b.notes||''),created_at:now,updated_at:now};
  db.leads.push(l); persist(); res.status(201).json(enrich(l));
});

app.put('/api/leads/:id',auth,(req,res)=>{
  const l=leadById(req.params.id); if(!l) return res.status(404).json({error:'Lead not found'});
  if(req.user.role==='counsellor' && l.counsellor_id!==req.user.id) return res.status(403).json({error:'Lead not assigned to you'});
  const b=req.body||{}, errors=validateLead(b,true); if(errors.length) return res.status(400).json({errors});
  if(b.phone && b.phone!==l.phone && db.leads.some(x=>x.phone===String(b.phone)&&x.id!==l.id)) return res.status(409).json({error:'A lead with this phone number already exists'});
  const fields=['name','phone','email','course','source','status','priority','notes'];
  for(const k of fields) if(b[k]!==undefined) l[k]=k==='name'||k==='course'||k==='phone'?String(b[k]).trim():b[k];
  if(req.user.role==='manager' && b.counsellor_id!==undefined){ const cid=b.counsellor_id===null||b.counsellor_id===''?null:Number(b.counsellor_id); if(cid!==null&&!db.users.some(u=>u.id===cid&&u.role==='counsellor')) return res.status(400).json({error:'Invalid counsellor'}); l.counsellor_id=cid; }
  l.updated_at=nowIso(); persist(); res.json(enrich(l));
});

app.delete('/api/leads/:id',auth,managerOnly,(req,res)=>{
  const idx=db.leads.findIndex(l=>l.id===Number(req.params.id)); if(idx<0) return res.status(404).json({error:'Lead not found'});
  db.leads.splice(idx,1); db.followups=db.followups.filter(f=>f.lead_id!==Number(req.params.id)); persist(); res.json({message:'Lead deleted'});
});

app.post('/api/leads/:id/followups',auth,(req,res)=>{
  const l=leadById(req.params.id); if(!l) return res.status(404).json({error:'Lead not found'});
  if(req.user.role==='counsellor' && l.counsellor_id!==req.user.id) return res.status(403).json({error:'Lead not assigned to you'});
  const due_date=String(req.body.due_date||''), note=String(req.body.note||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(due_date)||!note) return res.status(400).json({error:'Due date and note are required'});
  const f={id:nextId('nextFollowupId'),lead_id:l.id,due_date,note,outcome:String(req.body.outcome||''),created_at:nowIso()};
  db.followups.push(f); if(l.status==='New'||l.status==='Contacted') l.status='Follow-up'; l.updated_at=nowIso(); persist(); res.status(201).json(f);
});

app.get('/api/dashboard',auth,(req,res)=>{
  let rows=db.leads.slice(); if(req.user.role==='counsellor') rows=rows.filter(l=>l.counsellor_id===req.user.id);
  const total=rows.length, active=rows.filter(l=>!['Converted','Lost'].includes(l.status)).length, converted=rows.filter(l=>l.status==='Converted').length;
  const overdue=new Set(db.followups.filter(f=>f.due_date<today()).filter(f=>rows.some(l=>l.id===f.lead_id)).filter(f=>{const l=leadById(f.lead_id);return l&&!['Converted','Lost'].includes(l.status)}).map(f=>f.lead_id)).size;
  const counts=(key)=>Object.entries(rows.reduce((m,l)=>(m[l[key]]=(m[l[key]]||0)+1,m),{})).sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
  res.json({total,active,converted,overdue,conversion_rate:total?Number((converted/total*100).toFixed(1)):0,byStatus:counts('status'),bySource:counts('source')});
});

app.listen(PORT,()=>console.log(`API running on http://localhost:${PORT}`));
