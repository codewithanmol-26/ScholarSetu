// ScholarSetu Jago Lite: zero-dependency server (Node 18+). Run: node server.js
// Serves ../frontend and POST /jago/chat. Keys stay in .env on the server only.
const http=require('http'),fs=require('fs'),path=require('path');
try{fs.readFileSync(path.join(__dirname,'.env'),'utf8').split('\n').forEach(l=>{const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2]})}catch{}
const E=process.env, DATA=JSON.parse(fs.readFileSync(path.join(__dirname,'data/schemes.json'),'utf8'));
const KDIR=path.join(__dirname,'data/knowledge');
function loadKB(){const out=[];try{for(const f of fs.readdirSync(KDIR).filter(f=>f.endsWith('.txt'))){const raw=fs.readFileSync(path.join(KDIR,f),'utf8');const m=raw.match(/^SOURCE:\s*(.+)$/m);const src=m?m[1]:f;raw.split(/\n\s*\n/).map(s=>s.trim()).filter(s=>s.length>40&&!/^SOURCE:/.test(s)).forEach((t,i)=>out.push({src,sec:'paragraph '+(i+1),t}))}}catch{}return out}
const tok=s=>(s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]);
function retrieve(q,k=3){const qt=new Set(tok(q));return loadKB().map(c=>({c,s:tok(c.t).filter(w=>qt.has(w)).length})).filter(x=>x.s>=2).sort((a,b)=>b.s-a.s).slice(0,k).map(x=>x.c)}
// ---- profile extraction (rules, not LLM) ----
function extract(msg,p){p={...p};const t=msg.toLowerCase();
 if(/\bst\b|tribal|adivasi|आदिवासी|जनजाति/i.test(msg))p.category='ST';
 let m=t.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|लाख)/);if(m)p.income=Math.round(+m[1]*1e5);
 else if(m=t.match(/(?:income|आय)[^\d]{0,20}(\d{5,7})/))p.income=+m[1];
 m=t.match(/(\d{2,3}(?:\.\d+)?)\s*(%|percent|प्रतिशत)/);if(m)p.marks=+m[1];
 if(/after\s*(class\s*)?10\b|10\s*(th)?\s*के बाद/.test(t))p.stage='post_matric';
 else if(/class\s*(9|10)\b|\b(9|10)th\b|कक्षा\s*(9|10)\b/.test(t))p.stage='pre_matric';
 if(/class\s*(11|12)\b|\b(11|12)th\b|after\s*(class\s*)?12|कक्षा\s*(11|12)|b\.?\s?tech|\bb\.?\s?sc\b|\bb\.?\s?a\b|\bb\.?\s?com\b|diploma|mbbs|undergrad|graduation|\bug\b/.test(t))p.stage='post_matric';
 if(/m\.?\s?tech|\bm\.?\s?sc\b|\bm\.?\s?a\b|\bmba\b|post.?grad|\bpg\b|ph\.?\s?d|m\.?\s?phil|doctorate/.test(t))p.stage='postgrad';
 if(/abroad|overseas|foreign|विदेश/.test(t))p.abroad=true;
 return p}
// ---- eligibility engine: deterministic; the LLM only explains it ----
const OPS={eq:(a,b)=>a===b,in:(a,b)=>b.includes(a),lte:(a,b)=>a<=b,gte:(a,b)=>a>=b};
function evaluate(s,p){const fails=[],missing=[],unverified=[],passed=[];
 for(const r of s.rules){const lab=r.label||r.field,v=p[r.field];
  if(r.value===null){unverified.push(lab);continue}
  if(v===undefined){missing.push(r.field);continue}
  (OPS[r.op](v,r.value)?passed:fails).push(lab)}
 const status=fails.length?'no':(missing.length||unverified.length)?'needs':'eligible';
 return{id:s.id,name:s.name,status,passed,fails,missing,unverified,portal:s.portal,verified:s.verified,documents:DATA.documents_common.length}}
const ORDER={eligible:0,needs:1,no:2};
// ---- AI providers (swap with AI_PROVIDER) ----
const P={
 async ollama(sys,u){const r=await fetch((E.OLLAMA_URL||'http://localhost:11434')+'/api/chat',{method:'POST',body:JSON.stringify({model:E.OLLAMA_MODEL||'llama3.2',stream:false,messages:[{role:'system',content:sys},{role:'user',content:u}]})});const j=await r.json();return j.message.content},
 async gemini(sys,u){const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${E.GEMINI_MODEL||'gemini-2.0-flash'}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':E.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[{text:u}]}]})});const j=await r.json();return j.candidates[0].content.parts[0].text},
 async openai(sys,u){const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+E.OPENAI_API_KEY},body:JSON.stringify({model:E.OPENAI_MODEL||'gpt-4o-mini',messages:[{role:'system',content:sys},{role:'user',content:u}]})});const j=await r.json();return j.choices[0].message.content}};
const SYS=`You are Jago, a scholarship assistant for Tribal/ST students in India. Reply in the SAME language and script the student used (English, Hindi, or Hinglish). Use short, simple words; explain government terms plainly.
Use ONLY the FACTS given. Eligibility results come from the backend rules engine: explain them, never change them. Never invent schemes, amounts, deadlines, income limits or documents. If a fact is missing or marked unverified, say: "I don't have verified information for that. Please check the official scholarship guidelines." Never say an application was submitted or a document verified. If the profile lacks category, stage (class/course) or family income, ask for exactly what is missing. If KB excerpts are present, prefer them and name their source. Max 120 words.`;
function fallback(hi,ev,p,hits){const L=[];const names=ev.filter(e=>e.status!=='no');
 if(!names.length&&!p.category&&!p.stage)return hi?'मुझे आपकी पात्रता जाँचने के लिए चाहिए: ST श्रेणी, कक्षा/कोर्स और परिवार की वार्षिक आय।':'To check your eligibility I need: your category (ST), class/course, and family annual income.';
 L.push(hi?'आपकी जानकारी के आधार पर:':'Based on what you told me:');
 names.forEach(e=>L.push('• '+e.name+': '+(e.status==='eligible'?(hi?'संभवतः पात्र':'likely eligible'):(hi?'पुष्टि ज़रूरी':'needs verification'))));
 L.push(hi?'पुष्टि के लिए आधिकारिक दिशानिर्देश देखें।':'Please confirm with the official guidelines.');
 if(hits.length)L.push((hi?'स्रोत से: ':'From source: ')+hits[0].t.slice(0,200));
 return L.join('\n')}
async function chat(b){
 const msg=String(b.message||'').slice(0,500).trim();if(!msg)throw Object.assign(new Error('Empty message'),{code:400});
 const p0=b.profile&&typeof b.profile==='object'?b.profile:{};
 const pr={};['category','stage'].forEach(k=>typeof p0[k]==='string'&&(pr[k]=p0[k].slice(0,20)));['income','marks'].forEach(k=>Number.isFinite(p0[k])&&(pr[k]=p0[k]));if(p0.abroad===true)pr.abroad=true;
 const prof=extract(msg,pr),hi=/[\u0900-\u097F]/.test(msg);
 const ev=DATA.schemes.map(s=>evaluate(s,prof)).sort((a,b)=>ORDER[a.status]-ORDER[b.status]);
 const hits=retrieve(msg);
 const wants=/scholar|eligib|apply|which|kaun|कौन|छात्रवृत्ति|पात्र|abroad|विदेश|b\.?tech|class|document|दस्तावेज़/i.test(msg)||Object.keys(prof).length>Object.keys(pr).length;
 const facts={student_profile:prof,eligibility_results:ev,commonly_required_documents_unverified:DATA.documents_common,kb_excerpts:hits.map(h=>({source:h.src,section:h.sec,text:h.t}))};
 let reply,provider=(E.AI_PROVIDER||'').toLowerCase();
 try{if(!P[provider])throw 0;const ctl=AbortSignal.timeout(60000);reply=await Promise.race([P[provider](SYS,'FACTS:\n'+JSON.stringify(facts)+'\n\nSTUDENT: '+msg),new Promise((_,rj)=>ctl.addEventListener('abort',()=>rj(new Error('timeout'))))])}
 catch(e){if(provider)console.error('AI provider failed:',e.message||e);reply=fallback(hi,ev,prof,hits);provider='rules-only'}
 return{reply:reply.trim(),profile:prof,cards:wants?ev:[],sources:hits.map(h=>({source:h.src,section:h.sec})),provider}}
// ---- HTTP ----
const FE=path.join(__dirname,'../frontend'),MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const hits={};setInterval(()=>{for(const k in hits)delete hits[k]},60000);
http.createServer(async(req,res)=>{
 const send=(c,o)=>{res.writeHead(c,{'Content-Type':'application/json','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(o))};
 if(req.method==='POST'&&req.url==='/jago/chat'){
  const ip=req.socket.remoteAddress;hits[ip]=(hits[ip]||0)+1;if(hits[ip]>30)return send(429,{error:'Too many requests. Please wait a minute.'});
  let body='';req.on('data',d=>{body+=d;if(body.length>8192)req.destroy()});
  req.on('end',async()=>{try{send(200,await chat(JSON.parse(body||'{}')))}catch(e){send(e.code||500,{error:e.code?e.message:'Jago had a problem. Please try again.'})}});return}
 if(req.method==='GET'&&req.url==='/jago/health')return send(200,{ok:true,provider:E.AI_PROVIDER||'rules-only'});
 let f=path.normalize(decodeURIComponent(req.url.split('?')[0]));if(f==='/'||f==='\\')f='/index.html';
 const fp=path.join(FE,f);if(!fp.startsWith(FE)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);return res.end('Not found')}
 res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(res)
}).listen(E.PORT||3000,'0.0.0.0',()=>console.log('Jago Lite on http://localhost:'+(E.PORT||3000)+'  provider='+(E.AI_PROVIDER||'rules-only')));
