let PAT=null, ENC=null;
const el=(id)=>document.getElementById(id);

function setStatus(text, kind="info"){
  const s=el("status");
  s.textContent=text;
}

async function api(path, opt={}){
  const res=await fetch(path,{headers:{"Content-Type":"application/json"},...opt});
  const text=await res.text(); let data=null;
  try{data=text?JSON.parse(text):null;}catch{data=text;}
  if(!res.ok) throw new Error(data?.detail || data || "Request failed");
  return data;
}

const debounce=(fn,ms)=>{let t=null;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}};

function tabsInit(){
  document.querySelectorAll(".tab").forEach(b=>{
    b.addEventListener("click", ()=>activateTab(b.dataset.k));
  });
}

function activateTab(key){
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("on"));
  document.querySelectorAll(".pane").forEach(x=>x.classList.remove("on"));
  document.querySelector(`.tab[data-k="${key}"]`).classList.add("on");
  el("p_"+key).classList.add("on");
}

const tabOrder=["v","n","pmh","m","dx","pl","o"];
function nextTab(dir){
  const cur=document.querySelector(".tab.on")?.dataset.k || "v";
  let i=tabOrder.indexOf(cur);
  i = Math.max(0, Math.min(tabOrder.length-1, i + dir));
  activateTab(tabOrder[i]);
}

function enterToNext(){
  // Enter moves to next input in the reception form (fast data entry)
  const fields = ["p_id","p_full","p_dob","p_sex","p_nka","btn_create","q","btn_search"];
  fields.forEach((id, idx)=>{
    const node = el(id);
    if(!node) return;
    node.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){
        e.preventDefault();
        const next = fields[idx+1];
        if(next) el(next).focus();
      }
    });
  });
}

function render(list){
  const box=el("list"); box.innerHTML="";
  if(!list.length){
    box.innerHTML="<div class='small'>No results</div>";
    return;
  }
  list.forEach(p=>{
    const d=document.createElement("div"); d.className="it";
    d.innerHTML=`<div style="font-weight:900">${p.full_name} <span style="color:#64748b;font-size:12px">(#${p.id})</span></div>
    <div style="color:#64748b;font-size:12px;margin-top:4px">DOB: ${p.date_of_birth ?? "-"} | Sex: ${p.sex}</div>
    <div class="row"><button class="sec" data-id="${p.id}">Select</button></div>`;
    box.appendChild(d);
  });
  box.querySelectorAll("button[data-id]").forEach(b=>b.onclick=()=>selectPatient(Number(b.dataset.id)));
}

function selectPatient(id){
  PAT=id; ENC=null;
  el("sel").textContent="Patient #"+id;
  el("enc").textContent="Encounter: —";
  el("btn_start").disabled=false;
  el("btn_load").disabled=true;
  el("btn_export").disabled=false;
  setStatus("Patient selected");
}

async function startEncounter(){
  if(!PAT) return;
  setStatus("Creating encounter...");
  const e=await api(`/api/patients/${PAT}/encounters`,{method:"POST",body:JSON.stringify({})});
  ENC=e.id;
  el("enc").textContent="Encounter: #"+ENC;
  el("btn_load").disabled=false;
  setStatus("Encounter started");
}

async function loadSheet(){
  if(!ENC) return;
  setStatus("Loading sheet...");
  const s=await api(`/api/encounters/${ENC}/sheet`);
  fill(s.items||{});
  setStatus("Loaded");
}

function downloadExcel(){
  if(!PAT) return;
  window.open(`/api/patients/${PAT}/export.xlsx`, "_blank");
}

function fill(items){
  const v=items.VITALS||{}; const vf=v.flags||{};
  el("v_bp").value=v.bp||""; el("v_hr").value=v.hr||""; el("v_rr").value=v.rr||"";
  el("v_spo2").value=v.spo2||""; el("v_temp").value=v.temp||""; el("v_gcs").value=v.gcs||"";
  el("f_stable").checked=!!vf.stable; el("f_unstable").checked=!!vf.unstable; el("f_febrile").checked=!!vf.febrile; el("f_afebrile").checked=!!vf.afebrile;

  const n=items.NOTE||{}; el("n_cc").value=n.chief_complaint||""; el("n_sum").value=n.clinical_summary||""; el("n_hpi").value=n.history_present_illness||"";

  const p=items.PMH||{}; el("pmh_htn").checked=!!p.hypertension; el("pmh_dm").checked=!!p.diabetes; el("pmh_ckd").checked=!!p.chronic_kidney_disease;
  el("pmh_cld").checked=!!p.chronic_lung_disease; el("pmh_stroke").checked=!!p.stroke_tia; el("pmh_malig").checked=!!p.malignancy;
  el("pmh_cml").value=p.cml_status||""; el("pmh_other").value=p.other_chronic_illness_specify||"";

  const m=items.MEDICATION||{}; const mf=m.flags||{}; const a=m.known_allergies||{};
  el("m_anticoag").checked=!!mf.anticoagulants; el("m_antiplate").checked=!!mf.antiplatelets; el("m_steroids").checked=!!mf.steroids;
  el("a_drug").value=a.drug_allergy||""; el("a_food").value=a.food_allergy||""; el("a_reaction").value=a.reaction||""; el("m_list").value=m.current_medications_text||"";

  const d=items.DIAGNOSIS||{}; const inj=d.injury_details||{};
  el("dx1").value=d.dx1||""; el("dx2").value=d.dx2||""; el("inj_date").value=inj.date||""; el("inj_et").value=inj.etiology||"";
  el("inj_lat").value=inj.laterality||""; el("inj_other").value=inj.other||"";

  const pl=items.PLAN||{}; el("pl_labs").value=pl.labs_investigations||""; el("pl_plan").value=pl.plan_followup||""; el("pl_rx").value=pl.prescription||"";

  const o=items.OUTCOME||{}; el("o_disp").value=o.disposition||""; el("o_dest").value=o.destination||"";
}

async function upsert(type,payload){
  if(!ENC) throw new Error("Start an encounter first");
  setStatus("Saving...");
  await api(`/api/encounters/${ENC}/items/${type}`,{method:"PUT",body:JSON.stringify({payload_json:payload})});
  setStatus("Saved");
}

const saveVitals=debounce(async()=>{try{
  await upsert("VITALS",{bp:el("v_bp").value,hr:el("v_hr").value,rr:el("v_rr").value,spo2:el("v_spo2").value,temp:el("v_temp").value,gcs:el("v_gcs").value,
    flags:{stable:el("f_stable").checked,unstable:el("f_unstable").checked,febrile:el("f_febrile").checked,afebrile:el("f_afebrile").checked}});
}catch(e){setStatus("Error: "+e.message);}},450);

const saveNote=debounce(async()=>{try{
  await upsert("NOTE",{chief_complaint:el("n_cc").value,clinical_summary:el("n_sum").value,history_present_illness:el("n_hpi").value});
}catch(e){setStatus("Error: "+e.message);}},650);

const savePMH=debounce(async()=>{try{
  await upsert("PMH",{hypertension:el("pmh_htn").checked,diabetes:el("pmh_dm").checked,chronic_kidney_disease:el("pmh_ckd").checked,
    chronic_lung_disease:el("pmh_cld").checked,stroke_tia:el("pmh_stroke").checked,malignancy:el("pmh_malig").checked,
    cml_status:el("pmh_cml").value,other_chronic_illness_specify:el("pmh_other").value});
}catch(e){setStatus("Error: "+e.message);}},550);

const saveMeds=debounce(async()=>{try{
  await upsert("MEDICATION",{current_medications_text:el("m_list").value,flags:{anticoagulants:el("m_anticoag").checked,antiplatelets:el("m_antiplate").checked,steroids:el("m_steroids").checked},
    known_allergies:{drug_allergy:el("a_drug").value,food_allergy:el("a_food").value,reaction:el("a_reaction").value}});
}catch(e){setStatus("Error: "+e.message);}},650);

const saveDx=debounce(async()=>{try{
  await upsert("DIAGNOSIS",{dx1:el("dx1").value,dx2:el("dx2").value,injury_details:{date:el("inj_date").value,etiology:el("inj_et").value,laterality:el("inj_lat").value,other:el("inj_other").value}});
}catch(e){setStatus("Error: "+e.message);}},650);

const savePlan=debounce(async()=>{try{
  await upsert("PLAN",{labs_investigations:el("pl_labs").value,plan_followup:el("pl_plan").value,prescription:el("pl_rx").value});
}catch(e){setStatus("Error: "+e.message);}},800);

const saveOutcome=debounce(async()=>{try{
  await upsert("OUTCOME",{disposition:el("o_disp").value,destination:el("o_dest").value});
}catch(e){setStatus("Error: "+e.message);}},350);

function vitalsShortcuts(){
  document.addEventListener("keydown",(e)=>{
    // Ctrl + arrows => change tabs
    if(e.ctrlKey && e.key==="ArrowRight"){ e.preventDefault(); nextTab(+1); return; }
    if(e.ctrlKey && e.key==="ArrowLeft"){ e.preventDefault(); nextTab(-1); return; }

    // Quick vitals flags (only when encounter exists)
    if(!ENC) return;
    const k=e.key.toLowerCase();
    if(k==="s"){ el("f_stable").checked=!el("f_stable").checked; saveVitals(); }
    if(k==="u"){ el("f_unstable").checked=!el("f_unstable").checked; saveVitals(); }
    if(k==="f"){ el("f_febrile").checked=!el("f_febrile").checked; saveVitals(); }
    if(k==="a"){ el("f_afebrile").checked=!el("f_afebrile").checked; saveVitals(); }
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  tabsInit();
  enterToNext();
  vitalsShortcuts();

  // default focus
  el("p_id").focus();

  el("btn_create").onclick=async()=>{
    try{
      setStatus("Creating patient...");
      const p=await api("/api/patients",{method:"POST",body:JSON.stringify({
        full_name:el("p_full").value.trim(),
        national_id:el("p_id").value.trim()||null,
        date_of_birth:el("p_dob").value||null,
        sex:el("p_sex").value,
        no_known_allergies:el("p_nka").checked
      })});
      setStatus("Patient created (#"+p.id+")");
    }catch(e){setStatus("Error: "+e.message);}
  };

  el("btn_search").onclick=async()=>{
    try{
      setStatus("Searching...");
      const list=await api(`/api/patients/search?q=${encodeURIComponent(el("q").value.trim())}`);
      render(list);
      setStatus("Search done");
    }catch(e){setStatus("Error: "+e.message);}
  };

  el("btn_start").onclick=async()=>{ try{ await startEncounter(); }catch(e){ setStatus("Error: "+e.message); } };
  el("btn_load").onclick=async()=>{ try{ await loadSheet(); }catch(e){ setStatus("Error: "+e.message); } };
  el("btn_export").onclick=downloadExcel;

  // autosave bindings
  ["v_bp","v_hr","v_rr","v_spo2","v_temp","v_gcs","f_stable","f_unstable","f_febrile","f_afebrile"].forEach(id=>{el(id).oninput=saveVitals; el(id).onchange=saveVitals;});
  ["n_cc","n_sum","n_hpi"].forEach(id=>el(id).oninput=saveNote);
  ["pmh_htn","pmh_dm","pmh_ckd","pmh_cld","pmh_stroke","pmh_malig","pmh_cml","pmh_other"].forEach(id=>{el(id).onchange=savePMH; el(id).oninput=savePMH;});
  ["m_anticoag","m_antiplate","m_steroids","a_drug","a_food","a_reaction","m_list"].forEach(id=>{el(id).onchange=saveMeds; el(id).oninput=saveMeds;});
  ["dx1","dx2","inj_date","inj_et","inj_lat","inj_other"].forEach(id=>{el(id).onchange=saveDx; el(id).oninput=saveDx;});
  ["pl_labs","pl_plan","pl_rx"].forEach(id=>el(id).oninput=savePlan);
  ["o_disp","o_dest"].forEach(id=>el(id).onchange=saveOutcome);
});
