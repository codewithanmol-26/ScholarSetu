// Live Jago: replaces the recorded KB replies with calls to POST /jago/chat (same server).
(function(){
document.head.insertAdjacentHTML('beforeend','<style>.jc{margin:6px 0 6px 6px;max-width:92%;background:var(--card);border:1px solid var(--b);border-radius:12px;padding:9px 11px;font-size:13px}.jc b{display:block;margin-bottom:3px}.jc .bd{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;margin-bottom:4px}.jc.eligible .bd{background:var(--gl);color:var(--g)}.jc.needs .bd{background:var(--ol);color:#8a5200}.jc.no .bd{background:var(--rl);color:var(--r)}.jc .mu,.js{font-size:11px;color:var(--mut)}.js{margin:2px 0 8px 8px}.jc a{color:var(--g);font-weight:600}.ty i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:var(--mut);animation:jb 1s infinite}.ty i:nth-child(2){animation-delay:.2s}.ty i:nth-child(3){animation-delay:.4s}@keyframes jb{50%{opacity:.2}}</style>');
let profile={};
const SUG={en:["Which scholarships can I apply for?","I'm an ST student doing B.Tech, family income 2 lakh","What documents do I need?","Are there scholarships to study abroad?"],hi:["मैं कौन सी छात्रवृत्ति के लिए आवेदन कर सकता हूँ?","मैं ST छात्र हूँ, B.Tech कर रहा हूँ, परिवार की आय 2 लाख है","मुझे कौन से दस्तावेज़ चाहिए?","विदेश में पढ़ाई के लिए छात्रवृत्ति?"]};
const BD={eligible:["Likely eligible","संभवतः पात्र"],needs:["Needs verification","पुष्टि ज़रूरी"],no:["Not eligible","पात्र नहीं"]};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const FL={category:"ST category",stage:"class/course",income:"family income",marks:"marks"};
window.chips=function(){const c=$("#ch");c.innerHTML=CH[kl()].map(x=>`<button class="chip" onclick="ask('${x[1]}')">${x[0]}</button>`).join("");
 SUG[kl()].forEach(q=>{const b=document.createElement("button");b.className="chip";b.textContent=q;b.onclick=()=>run(q);c.appendChild(b)})};
window.send=function(){const q=$("#q").value.trim();if(!q)return;$("#q").value="";run(q)};
function rich(h){const d=document.createElement("div");d.innerHTML=h;$("#chat").appendChild(d.firstElementChild||d);$("#v").scrollTop=1e5}
function card(s){const i=kl()=="en"?0:1,det=[];
 if(s.fails.length)det.push("✗ "+s.fails.join(", "));if(s.passed.length)det.push("✓ "+s.passed.join(", "));
 const need=s.missing.map(f=>FL[f]||f).concat(s.unverified);if(need.length)det.push((i?"जाँचना बाकी: ":"To confirm: ")+need.join(", "));
 rich(`<div class="jc ${s.status}"><span class="bd">${BD[s.status][i]}</span><b>${esc(s.name)}</b><div class="mu">${det.map(esc).join("<br>")}</div><div class="mu" style="margin-top:3px">${i?"दस्तावेज़":"Documents"}: ${s.documents}${s.verified?"":(i?" (आधिकारिक पुष्टि बाकी)":" (not officially verified)")}${s.portal?` · <a href="${s.portal}" target="_blank" rel="noopener">${i?"आधिकारिक पोर्टल":"Official portal"}</a>`:""}</div></div>`)}
window.run=async function(q){
 add("u",q);const w=q.toLowerCase();
 if(typeof KW!=="undefined"){const h=["status","issue","pay"].find(k=>KW[k]&&KW[k].some(x=>w.includes(x)));if(h){setTimeout(()=>add("a",ans(h)),350);return}}
 rich('<div class="m a ty"><i></i><i></i><i></i></div>');const ty=$("#chat").lastElementChild;
 try{const r=await fetch("/jago/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:q,profile,lang:kl()})});
  const j=await r.json();ty.remove();if(!r.ok)throw new Error(j.error||"error");
  profile=j.profile;add("a",j.reply);j.cards.forEach(card);
  if(j.sources.length)rich(`<div class="js">📄 ${j.sources.map(s=>esc(s.source)+" – "+esc(s.section)).join("; ")}</div>`);
  rich(`<div class="js">${j.provider=="rules-only"?"Rules-only mode (no AI model connected)":"Answered live by "+esc(j.provider)}</div>`)}
 catch(e){ty.remove();add("a",kl()=="en"?"Sorry, Jago could not reach the server. Please check that it is running and try again.":"क्षमा करें, Jago सर्वर से नहीं जुड़ पाया। कृपया जाँचें कि सर्वर चालू है और फिर कोशिश करें।")}};
})();
