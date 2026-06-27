import { useState, useEffect, useCallback, useRef } from "react";
import { ADULT_TABS, TEENS_TABS, buildTheme } from "./tokens.js";
import { buildSchedule } from "./schedule.js";
import { WorkoutMusicControl } from "./components/audio/WorkoutMusicControl.jsx";
import { stepsHaveMusicIntent } from "./hooks/useWorkoutBeat.js";

// ═══════════════════════════════════════════════════════════
// KARMA33 (formerly Karma28) — Audio-Guided Yoga Practice Engine
// ═══════════════════════════════════════════════════════════

// One-time copy-forward migration so existing local data (from earlier
// Karma28-branded testing) isn't silently lost when storage keys move
// to the karma33_* namespace. Safe/idempotent: only copies when the new
// key doesn't exist yet, never deletes the old key.
function migrateLegacyStorageKey(oldKey, newKey){
  try{
    if(localStorage.getItem(newKey)===null){
      const legacy=localStorage.getItem(oldKey);
      if(legacy!==null) localStorage.setItem(newKey, legacy);
    }
  }catch(e){}
}
[["karma28_v8","karma33_v1"],["karma28_practice_config_v1","karma33_practice_config_v1"],["karma28_voice_rate_v1","karma33_voice_rate_v1"],["karma28_test_mode_v1","karma33_test_mode_v1"]]
  .forEach(([oldKey,newKey])=>migrateLegacyStorageKey(oldKey,newKey));

const IS_BETA=true;

// ── VOICE / TTS ───────────────────────────────────────────
const NLP=[
  {intent:"complete_yoga",  patterns:["yoga","surya","kriya","namaskar","pranayam","meditation","sanyam","dhyan","done yoga","yoga done"],confirm:"Marking yoga complete. Confirm?"},
  {intent:"complete_weight",patterns:["workout","exercise","weight","training","hiit","run","jog","walk","pushup","squat","gym"],confirm:"Marking workout complete. Confirm?"},
  {intent:"complete_comm",  patterns:["communication","speak","spoke","talk","communicated","done speaking"],confirm:"Marking communication done. Confirm?"},
  {intent:"log_water",      patterns:["water","drank water","had water","3 litre","morning water"],confirm:"Marking morning water done. Confirm?"},
  {intent:"log_meal",       patterns:["ate","eaten","lunch","meal","food","had lunch","big meal"],confirm:"Marking noon meal done. Confirm?"},
  {intent:"log_fast",       patterns:["fasting","no food","fast","done eating","after 6","no dinner"],confirm:"Marking no-food-after-6 done. Confirm?"},
  {intent:"status",         patterns:["status","how am i","progress","streak","how many days"],confirm:null,action:"status"},
];
function parseIntent(text){const l=text.toLowerCase();for(const n of NLP){if(n.patterns.some(p=>l.includes(p)))return n;}return null;}
let _bv=null;
function getBestVoice(){
  if(_bv)return _bv;
  if(!window.speechSynthesis)return null;
  const vs=window.speechSynthesis.getVoices();if(!vs.length)return null;
  for(const p of["Samantha","Karen","Moira","Google US English"]){const f=vs.find(v=>v.name===p);if(f){_bv=f;return f;}}
  _bv=vs.find(v=>/^en/i.test(v.lang))||vs[0];return _bv;
}
function speak(text,rate=0.88,pitch=1.0){
  try{if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const v=getBestVoice();if(v)u.voice=v;u.rate=rate;u.pitch=pitch;u.volume=1;window.speechSynthesis.speak(u);}catch(e){}
}
// speakAwait: returns a Promise that resolves when speech finishes (uses native onend when available)
function speakAwait(text,rate=0.85,pitch=1.0){
  return new Promise((resolve)=>{
    try{
      if(!window.speechSynthesis){ setTimeout(resolve, Math.max(700,text.length*65)); return; }
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);
      const v=getBestVoice();if(v)u.voice=v;
      u.rate=rate;u.pitch=pitch;u.volume=1;
      let done=false;
      u.onend=()=>{ if(!done){done=true;resolve();} };
      u.onerror=()=>{ if(!done){done=true;resolve();} };
      window.speechSynthesis.speak(u);
      // Safety timeout in case onend never fires (some mobile browsers)
      setTimeout(()=>{ if(!done){done=true;resolve();} }, Math.max(1500,text.length*90));
    }catch(e){ setTimeout(resolve, 800); }
  });
}
function safeNotify(title,body){try{if(typeof Notification==="undefined")return;if(Notification.permission==="granted")new Notification(title,{body});}catch(e){}}
function safeRequestNotif(){try{if(typeof Notification==="undefined")return;if(Notification.permission==="default")Notification.requestPermission();}catch(e){}}

// ── CHIME / BELL TONE (Web Audio API, no asset needed) ───
function playChime(freq=528,durMs=1400){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type="sine"; osc.frequency.value=freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime+0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+durMs/1000);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime+durMs/1000+0.05);
    setTimeout(()=>{ try{ctx.close();}catch(e){} }, durMs+200);
  }catch(e){}
}
function playBeep(freq=880,durMs=120){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type="sine"; osc.frequency.value=freq;
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+durMs/1000);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime+durMs/1000+0.02);
    setTimeout(()=>{ try{ctx.close();}catch(e){} }, durMs+100);
  }catch(e){}
}

// ═══════════════════════════════════════════════════════════
// AUDIO CUE ENGINE
// Every spoken instruction in a practice is a "cue". Each cue
// can be satisfied three ways, in priority order:
//   1. User's own recording (stored in IndexedDB, survives reloads)
//   2. AI voice (Web Speech synthesis, using the fallback text)
//   3. (Padmasana only) YouTube video audio
// Admins re-record any cue at any time from the Practice Settings
// screen — recordings are per-device (IndexedDB), not synced.
// ═══════════════════════════════════════════════════════════
const IDB_NAME="karma28_audio_v1";
const IDB_STORE="cues";

function idbOpen(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){ reject(new Error("no indexeddb")); return; }
    const req=window.indexedDB.open(IDB_NAME,1);
    req.onupgradeneeded=()=>{ try{req.result.createObjectStore(IDB_STORE);}catch(e){} };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function idbSet(key,blob){
  try{
    const db=await idbOpen();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(IDB_STORE,"readwrite");
      tx.objectStore(IDB_STORE).put(blob,key);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error);
    });
  }catch(e){ return false; }
}
async function idbGet(key){
  try{
    const db=await idbOpen();
    return new Promise((resolve)=>{
      const tx=db.transaction(IDB_STORE,"readonly");
      const req=tx.objectStore(IDB_STORE).get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>resolve(null);
    });
  }catch(e){ return null; }
}
async function idbDelete(key){
  try{
    const db=await idbOpen();
    return new Promise((resolve)=>{
      const tx=db.transaction(IDB_STORE,"readwrite");
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>resolve(false);
    });
  }catch(e){ return false; }
}

// Play a recorded blob and resolve when finished
function playBlob(blob,rate){
  return new Promise((resolve)=>{
    try{
      const url=URL.createObjectURL(blob);
      const audio=new Audio(url);
      audio.playbackRate=rate||1;
      let done=false;
      const finish=()=>{ if(!done){done=true;URL.revokeObjectURL(url);resolve();} };
      audio.onended=finish;
      audio.onerror=finish;
      audio.play().catch(finish);
      setTimeout(finish, 120000); // 2-min safety cap
    }catch(e){ resolve(); }
  });
}

// Resolve and play a cue: tries recording first, falls back to TTS.
// cueId: unique string key. fallbackText: spoken if no recording exists.
async function playCue(cueId,fallbackText,opts={}){
  if(opts.mode==="ai") return speakAwait(fallbackText, opts.rate||0.85, opts.pitch||1.0);
  try{
    const blob=await idbGet(cueId);
    if(blob) return playBlob(blob, (opts.rate||1) * (typeof loadVoiceRate==="function"?loadVoiceRate():1));
  }catch(e){}
  return speakAwait(fallbackText, opts.rate||0.85, opts.pitch||1.0);
}
async function cueHasRecording(cueId){
  const blob=await idbGet(cueId);
  return !!blob;
}

// ── Recorder hook-like helper used by CueRecorderRow ──────
function useMicRecorder(){
  const [state,setState]=useState("idle"); // idle | recording | saved | error
  const mediaRef=useRef(null);
  const chunksRef=useRef([]);
  function start(){
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
      const mr=new MediaRecorder(stream);
      chunksRef.current=[];
      mr.ondataavailable=e=>chunksRef.current.push(e.data);
      mr.onstop=()=>{ stream.getTracks().forEach(t=>t.stop()); };
      mr.start();
      mediaRef.current=mr;
      setState("recording");
    }).catch(()=>setState("error"));
  }
  function stop(cueId){
    return new Promise((resolve)=>{
      const mr=mediaRef.current;
      if(!mr){ resolve(false); return; }
      mr.onstop=async()=>{
        try{ mr.stream.getTracks().forEach(t=>t.stop()); }catch(e){}
        const blob=new Blob(chunksRef.current,{type:"audio/webm"});
        await idbSet(cueId,blob);
        setState("saved");
        resolve(true);
      };
      mr.stop();
    });
  }
  return {state,setState,start,stop};
}

// ═══════════════════════════════════════════════════════════
// PRACTICE DATA — the 12 names of Surya, the 24-step Namaskar
// sequence, asana references, and default configuration.
// This whole block doubles as the editable "spec" — change
// numbers here (or via the in-app Admin screen) to retune any
// practice without touching the player logic.
// ═══════════════════════════════════════════════════════════

const SURYA_MANTRAS=[
  {name:"Mitraya",        sanskrit:"ॐ मित्राय नमः",        meaning:"Friend of all"},
  {name:"Ravaye",         sanskrit:"ॐ रवये नमः",          meaning:"The shining one"},
  {name:"Suryaya",        sanskrit:"ॐ सूर्याय नमः",        meaning:"Dispeller of darkness"},
  {name:"Bhanave",        sanskrit:"ॐ भानवे नमः",         meaning:"One who illumines"},
  {name:"Khagaya",        sanskrit:"ॐ खगाय नमः",          meaning:"One who moves in the sky"},
  {name:"Pushne",         sanskrit:"ॐ पूष्णे नमः",         meaning:"The nourisher"},
  {name:"Hiranyagarbhaya",sanskrit:"ॐ हिरण्यगर्भाय नमः",   meaning:"Golden cosmic womb"},
  {name:"Marichaye",      sanskrit:"ॐ मरीचये नमः",        meaning:"Lord of the dawn rays"},
  {name:"Adityaya",       sanskrit:"ॐ आदित्याय नमः",       meaning:"Son of Aditi"},
  {name:"Savitre",        sanskrit:"ॐ सवित्रे नमः",        meaning:"Lord of creation"},
  {name:"Arkaya",         sanskrit:"ॐ अर्काय नमः",         meaning:"Fit to be praised"},
  {name:"Bhaskaraya",     sanskrit:"ॐ भास्कराय नमः",       meaning:"Bringer of light"},
];

// One full round = 24 poses: Set A leads with the RIGHT leg (steps 4 & 9),
// Set B leads with the LEFT leg (steps 4 & 9) — balancing both sides.
function suryaPoseSet(leadLeg){
  return [
    {n:"Pranamasana",         e:"Prayer Pose",        breath:"Exhale", c:"Stand tall, palms together at the heart."},
    {n:"Hasta Uttanasana",    e:"Raised Arms Pose",   breath:"Inhale", c:"Sweep the arms overhead, arch gently back."},
    {n:"Hasta Padasana",      e:"Forward Bend",       breath:"Exhale", c:"Fold forward, hands beside the feet."},
    {n:"Ashwa Sanchalanasana",e:`Equestrian — ${leadLeg} leg back`, breath:"Inhale", c:`Step the ${leadLeg} leg back into a deep lunge.`},
    {n:"Dandasana",           e:"Plank Pose",         breath:"Hold",   c:"The other foot joins — one straight line."},
    {n:"Ashtanga Namaskara",  e:"Eight-Limbed Salute",breath:"Exhale", c:"Knees, chest and chin lower to the floor."},
    {n:"Bhujangasana",        e:"Cobra Pose",         breath:"Inhale", c:"Slide the chest forward and up."},
    {n:"Adho Mukha Svanasana",e:"Downward Dog",       breath:"Exhale", c:"Lift the hips high, press the heels down."},
    {n:"Ashwa Sanchalanasana",e:`Equestrian — ${leadLeg} leg forward`, breath:"Inhale", c:`The ${leadLeg} leg steps forward again.`},
    {n:"Hasta Padasana",      e:"Forward Bend",       breath:"Exhale", c:"The other foot joins, fold forward."},
    {n:"Hasta Uttanasana",    e:"Raised Arms Pose",   breath:"Inhale", c:"Sweep the arms up and arch."},
    {n:"Pranamasana",         e:"Prayer Return",      breath:"Exhale", c:"Palms return to the heart. One round half complete."},
  ];
}

// Padmasana / Sahaj asana reference — seeded list, fully editable in Admin
const PADMASANA_ASANAS_DEFAULT=[
  {n:"Neck Roll",          dur:"30 sec",  c:"Slow circles, both directions."},
  {n:"Shoulder Rotation",  dur:"30 sec",  c:"Forward then backward circles."},
  {n:"Peacock Pose",       dur:"30 sec",  c:"Arms wide, gentle twist at the waist."},
  {n:"Swing",              dur:"30 sec",  c:"Hands on hips, sway side to side."},
  {n:"Half Moon Stretch",  dur:"20 sec/side", c:"Reach overhead and lean to each side."},
  {n:"Breath of Joy",      dur:"3 reps",  c:"Three-part inhale with arm sweeps, exhale forward fold."},
  {n:"Cat Pose",           dur:"45 sec",  c:"All fours, arch and round the spine."},
  {n:"Butterfly Pose",     dur:"30 sec",  c:"Soles together, gently flap the knees."},
  {n:"Cradle Pose",        dur:"20 sec/side", c:"Cradle each shin like a baby."},
  {n:"Wind-Relieving Pose",dur:"30 sec/side", c:"Hug one knee to the chest."},
  {n:"Boat Pose",          dur:"20 sec",  c:"Balance on the sit bones, legs lifted."},
  {n:"Serpent Posture",    dur:"20 sec",  c:"Gentle backbend, chest open."},
  {n:"Locust Posture",     dur:"20 sec",  c:"Lift chest and legs, lying face down."},
  {n:"Mountain Posture",   dur:"30 sec",  c:"Stand tall, arms overhead, grounded feet."},
  {n:"Padmasana Settle",   dur:"Final",   c:"Cross-legged, spine tall, eyes closing."},
];

const SIT_POSITIONS=[
  {id:"sukhasan",      label:"Sukhasan",       sub:"Easy cross-legged seat"},
  {id:"ardha-padmasan",label:"Ardha-Padmasan", sub:"Half lotus"},
  {id:"padmasan",      label:"Padmasan",       sub:"Full lotus"},
];

// ── DEFAULT CONFIGURATION ──────────────────────────────────
// This object is the single source of truth for every number,
// duration, and choice across all four practices. It is shown
// and editable on the Admin → Practice Settings screen and is
// persisted to localStorage. Treat this block as the "flat file"
// reference — when asked to retune the app, this is what changes.
const DEFAULT_PRACTICE_CONFIG={
  surya:{
    rounds:6,                 // user can override at session start, 1-12+
    audioMode:"ai",           // "ai" | "recorded"
    speakPoseNames:true,      // narrate each pose name during practice
    poseHoldSec:4,            // seconds to hold/transition per pose
  },
  kriya:{
    stage1Rounds:8, stage2Rounds:8, stage3Rounds:6,
    pattern:{inhale:4,hold1:4,exhale:6,hold2:2}, // seconds, same ratio all 3 stages (editable)
    restBreathsBetweenStages:5,
    bhastrikaRounds:3, bhastrikaCount:20, bhastrikaRestBreaths:10,
    lockHoldBreakMin:1,       // 1-3 min break after the lock & hold
    sitPosition:"sukhasan",
    omChants:3, omAudioMode:"ai",
    kriyaDurationMin:15,      // 10 | 15 | 20 | 25
    kriyaRoundsCount:3,       // 3 full cycles of 20/40/40
    slowBreaths:20, mediumBreaths:40, fastBreaths:40,
    duringKriyaAudio:"silence", // "silence" | "music"
  },
  padmasana:{
    rounds:1,
    videoUrl:"https://youtu.be/PhEEzpP7VmQ?si=TFn4wzyqJ5J1abht",
    videoTitle:"Padmasana / Sahaj Samadhi — Reference Practice",
    playbackSpeed:1,          // 1 | 1.5 | 1.75 | 2
    audioMode:"youtube",      // "youtube" | "recorded" | "ai"
    asanas:PADMASANA_ASANAS_DEFAULT,
  },
  sanyam:{
    bhogarRounds:8,
    bhogarPattern:{inhale:2,hold1:4,exhale:1,hold2:4},
    samadhiDurationMin:20,    // 10|15|20|25|30
    bellCount:14,             // up to 30+
    bellSpacingSec:30,        // 15-120
    lieDownMantraAudioMode:"ai",
  },
};

const CONFIG_KEY="karma33_practice_config_v1";
function loadPracticeConfig(){
  try{
    const raw=localStorage.getItem(CONFIG_KEY);
    if(!raw) return JSON.parse(JSON.stringify(DEFAULT_PRACTICE_CONFIG));
    const parsed=JSON.parse(raw);
    // shallow-merge with defaults so new fields added later always exist
    return {
      surya:{...DEFAULT_PRACTICE_CONFIG.surya,...(parsed.surya||{})},
      kriya:{...DEFAULT_PRACTICE_CONFIG.kriya,...(parsed.kriya||{}),pattern:{...DEFAULT_PRACTICE_CONFIG.kriya.pattern,...(parsed.kriya?.pattern||{})}},
      padmasana:{...DEFAULT_PRACTICE_CONFIG.padmasana,...(parsed.padmasana||{}),asanas:(parsed.padmasana?.asanas||DEFAULT_PRACTICE_CONFIG.padmasana.asanas)},
      sanyam:{...DEFAULT_PRACTICE_CONFIG.sanyam,...(parsed.sanyam||{}),bhogarPattern:{...DEFAULT_PRACTICE_CONFIG.sanyam.bhogarPattern,...(parsed.sanyam?.bhogarPattern||{})}},
    };
  }catch(e){ return JSON.parse(JSON.stringify(DEFAULT_PRACTICE_CONFIG)); }
}
function savePracticeConfig(cfg){ try{ localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }catch(e){} }

// ── SPEED PRESETS — used wherever a rapid "count" is being paced ──
// (e.g. Bhastrika). Exposed to the user as radio buttons; the ms
// value is what actually drives the timer behind the scenes.
const SPEED_PRESETS=[
  {id:"slow",      label:"Slow",       ms:1400},
  {id:"medium",    label:"Medium",     ms:950},
  {id:"fast",      label:"Fast",       ms:600},
  {id:"superfast", label:"Super Fast", ms:380},
];

// ── GLOBAL VOICE CHARACTER — applied as a playbackRate multiplier
// to every recorded cue, so one recording can be made to sound
// deeper, higher, or "baby-like" without re-recording.
const VOICE_RATE_KEY="karma33_voice_rate_v1";
const VOICE_PRESETS=[
  {id:"deep",    label:"Deeper",  rate:0.82},
  {id:"natural", label:"Natural", rate:1.0},
  {id:"higher",  label:"Higher",  rate:1.18},
  {id:"baby",    label:"Baby",    rate:1.4},
];
function loadVoiceRate(){
  try{ const v=localStorage.getItem(VOICE_RATE_KEY); return v?parseFloat(v):1.0; }catch(e){ return 1.0; }
}
function saveVoiceRate(rate){ try{ localStorage.setItem(VOICE_RATE_KEY,String(rate)); }catch(e){} }

// ── TEST / ADMIN MODE — when on, every timed screen shows a
// "Skip" button so Kumar can test the full flow instantly.
const TEST_MODE_KEY="karma33_test_mode_v1";
function loadTestMode(){ try{ return localStorage.getItem(TEST_MODE_KEY)==="1"; }catch(e){ return false; } }
function saveTestMode(on){ try{ localStorage.setItem(TEST_MODE_KEY, on?"1":"0"); }catch(e){} }

// ═══════════════════════════════════════════════════════════
// BREATH RING — signature visual element
// A sundial-like ring that fills clockwise across each phase
// (inhale/hold/exhale/hold), echoing the Surya (sun) motif that
// runs through the whole app. Pure presentational component.
// ═══════════════════════════════════════════════════════════
function BreathRing({progress,label,sublabel,count,color,th,size}){
  const sz=size||220;
  const stroke=10;
  const r=(sz-stroke)/2;
  const c=2*Math.PI*r;
  const offset=c*(1-Math.max(0,Math.min(1,progress)));
  return (
    <div style={{position:"relative",width:sz,height:sz,margin:"0 auto"}}>
      <svg width={sz} height={sz} style={{transform:"rotate(-90deg)"}}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={th.ringTrack} strokeWidth={stroke}/>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color||th.ring} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 0.15s linear"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        {count!=null && <div style={{fontSize:42,fontWeight:900,color:th.t1,lineHeight:1}}>{count}</div>}
        <div style={{fontSize:14,fontWeight:800,color:color||th.t1,letterSpacing:1,marginTop:count!=null?4:0}}>{label}</div>
        {sublabel && <div style={{fontSize:10,color:th.t3,marginTop:3}}>{sublabel}</div>}
      </div>
    </div>
  );
}

// Small linear progress bar used for overall session progress
function SessionBar({current,total,th,color}){
  const pct=total>0?Math.round((current/total)*100):0;
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:th.t3,marginBottom:5,fontWeight:700}}>
        <span>{current} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div style={{background:"rgba(255,255,255,0.10)",borderRadius:6,height:6,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color||th.acc,borderRadius:6,transition:"width 0.3s"}}/>
      </div>
    </div>
  );
}

// Reusable "exit / pause" header bar shown during any active practice session
function SessionHeader({title,subtitle,onExit,th}){
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div>
        <div style={{fontSize:16,fontWeight:900,color:"#fff",textShadow:"0 1px 8px rgba(0,0,0,0.5)"}}>{title}</div>
        {subtitle && <div style={{fontSize:11,color:th.t3,marginTop:2}}>{subtitle}</div>}
      </div>
      <button onClick={onExit} style={{background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.20)",color:th.t2,borderRadius:9,padding:"7px 13px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✕ Exit</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SPEED SELECTOR — radio-button speed presets for any counted
// sequence (e.g. Bhastrika). Shows the live total-duration
// preview so the user can plan before starting.
// ═══════════════════════════════════════════════════════════
function SpeedSelector({value,onChange,totalCount,th,color}){
  const preset=SPEED_PRESETS.find(p=>p.id===value)||SPEED_PRESETS[1];
  const totalSec=Math.round((preset.ms*totalCount)/100)/10;
  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {SPEED_PRESETS.map(p=>(
          <button key={p.id} onClick={()=>onChange(p.id)} style={{display:"flex",alignItems:"center",gap:10,background:value===p.id?"rgba(255,140,0,0.14)":"rgba(255,255,255,0.04)",border:`1px solid ${value===p.id?(color||"#FF8C00"):"rgba(255,255,255,0.12)"}`,borderRadius:10,padding:"9px 12px",cursor:"pointer",textAlign:"left"}}>
            <span style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${value===p.id?(color||"#FF8C00"):"rgba(255,255,255,0.30)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {value===p.id && <span style={{width:8,height:8,borderRadius:"50%",background:color||"#FF8C00"}}/>}
            </span>
            <span style={{flex:1,fontSize:12,fontWeight:700,color:value===p.id?(color||"#FF8C00"):th.t2}}>{p.label}</span>
            <span style={{fontSize:9,color:th.t3}}>{p.ms}ms/count</span>
          </button>
        ))}
      </div>
      <div style={{fontSize:10,color:th.t3,marginTop:9,textAlign:"center"}}>≈{totalSec}s total for {totalCount} counts at this speed</div>
    </div>
  );
}

// ── Skip button shown only when global Test Mode is on ────
function SkipButton({onSkip,th}){
  return (
    <button onClick={onSkip} style={{background:"rgba(255,200,0,0.14)",border:"1px solid rgba(255,200,0,0.35)",color:"#FFD700",borderRadius:9,padding:"8px 16px",fontWeight:800,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5,margin:"10px auto 0"}}>⏭ Skip (Test Mode)</button>
  );
}

// ═══════════════════════════════════════════════════════════
// SURYA NAMASKAR PLAYER
// One full round = 24 poses (12 right-leg-lead + 12 left-leg-lead).
// Each round opens with one of the 12 names of Surya, cycling
// and repeating once all 12 have been used.
// ═══════════════════════════════════════════════════════════
function buildSuryaSequence(){
  return [...suryaPoseSet("right"), ...suryaPoseSet("left")];
}

function SuryaPlayer({config,onComplete,onExit,th,testMode,skipSetup,overrideConfig,sequenceLabel}){
  const cfg={...config,...(overrideConfig||{})};
  const [phase,setPhase]=useState(skipSetup?"mantra":"setup");
  const [rounds,setRounds]=useState(cfg.rounds);
  const [audioMode,setAudioMode]=useState(cfg.audioMode);
  const [roundIdx,setRoundIdx]=useState(0);
  const [poseIdx,setPoseIdx]=useState(0);
  const [secondsLeft,setSecondsLeft]=useState(cfg.poseHoldSec);
  const [paused,setPaused]=useState(false);
  const [showRecorder,setShowRecorder]=useState(false);
  const sequence=buildSuryaSequence();
  const tickRef=useRef(null);
  const startedRef=useRef(false);

  async function announceMantra(){
    const mantra=SURYA_MANTRAS[roundIdx % SURYA_MANTRAS.length];
    setPhase("mantra");
    const cueId=`surya_mantra_${roundIdx % SURYA_MANTRAS.length}`;
    await playCue(cueId, `Om ${mantra.name} Namaha`, {mode:audioMode, rate:0.75});
    setPhase("pose");
    setPoseIdx(0);
    setSecondsLeft(cfg.poseHoldSec);
  }

  useEffect(()=>{
    if(skipSetup && !startedRef.current){ startedRef.current=true; announceMantra(); }
    // eslint-disable-next-line
  },[]);

  useEffect(()=>{ if(phase==="setup")return; if(phase==="mantra")return;
    if(paused)return;
    if(phase==="pose"){
      const pose=sequence[poseIdx];
      if(cfg.speakPoseNames && secondsLeft===cfg.poseHoldSec){
        speak(`${pose.breath}. ${pose.n}.`, 0.95, 1.0);
      }
    }
  },[poseIdx,phase]);

  useEffect(()=>{
    if(phase!=="pose"||paused)return;
    tickRef.current=setInterval(()=>{
      setSecondsLeft(s=>{
        if(s<=1){
          setPoseIdx(pi=>{
            const next=pi+1;
            if(next>=sequence.length){
              setTimeout(()=>{
                setRoundIdx(ri=>{
                  const nextRound=ri+1;
                  if(nextRound>=rounds){ setPhase("done"); return ri; }
                  return nextRound;
                });
              },50);
              return pi;
            }
            return next;
          });
          return cfg.poseHoldSec;
        }
        return s-1;
      });
    },1000);
    return ()=>clearInterval(tickRef.current);
  },[phase,paused,rounds]);

  useEffect(()=>{
    if(roundIdx>0 && phase!=="done") announceMantra();
    // eslint-disable-next-line
  },[roundIdx]);

  useEffect(()=>{
    if(phase==="done"){
      speak(`${rounds} rounds complete. Your Surya Namaskar practice is finished. Well done.`,0.88);
    }
  },[phase]);

  function skipPose(){
    setPoseIdx(pi=>{
      const next=pi+1;
      if(next>=sequence.length){
        setTimeout(()=>{
          setRoundIdx(ri=>{
            const nextRound=ri+1;
            if(nextRound>=rounds){ setPhase("done"); return ri; }
            return nextRound;
          });
        },50);
        return pi;
      }
      return next;
    });
    setSecondsLeft(cfg.poseHoldSec);
  }

  if(phase==="setup"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Surya Namaskar" subtitle="12-pose sun salutation" onExit={onExit} th={th}/>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:54,marginBottom:10}}>☀️</div>
          <div style={{fontSize:13,color:th.t2,lineHeight:1.7,maxWidth:300,margin:"0 auto"}}>One full round is 24 poses — both legs leading in turn. Each round opens with a different name of Surya, chanted in Sanskrit.</div>
        </div>
        <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:800,color:th.t3,letterSpacing:1,marginBottom:10}}>HOW MANY ROUNDS TODAY?</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"center"}}>
            {[1,2,3,4,6,8,12].map(n=>(
              <button key={n} onClick={()=>setRounds(n)} style={{width:46,height:46,borderRadius:12,border:`2px solid ${rounds===n?"#FF8C00":"rgba(255,255,255,0.14)"}`,background:rounds===n?"rgba(255,140,0,0.18)":"rgba(255,255,255,0.05)",color:rounds===n?"#FF8C00":th.t2,fontWeight:900,fontSize:15,cursor:"pointer"}}>{n}</button>
            ))}
          </div>
          <div style={{fontSize:10,color:th.t3,textAlign:"center",marginTop:10}}>≈ {Math.round(rounds*24*cfg.poseHoldSec/60)} min total</div>
        </div>
        <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:800,color:th.t3,letterSpacing:1,marginBottom:10}}>MANTRA VOICE</div>
          <div style={{display:"flex",gap:7}}>
            {[["ai","🤖 AI Voice"],["recorded","🎙️ My Voice"]].map(([m,lb])=>(
              <button key={m} onClick={()=>setAudioMode(m)} style={{flex:1,padding:"9px 8px",borderRadius:10,border:`2px solid ${audioMode===m?"#FF8C00":"rgba(255,255,255,0.14)"}`,background:audioMode===m?"rgba(255,140,0,0.16)":"rgba(255,255,255,0.05)",color:audioMode===m?"#FF8C00":th.t2,fontWeight:800,fontSize:11,cursor:"pointer"}}>{lb}</button>
            ))}
          </div>
          {audioMode==="recorded" && (
            <div style={{marginTop:10}}>
              <button onClick={()=>setShowRecorder(s=>!s)} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.14)",color:th.t2,borderRadius:9,padding:"8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{showRecorder?"Hide":"🎙️ Record the 12 mantras now"}</button>
              {showRecorder && (
                <div style={{marginTop:8,maxHeight:260,overflowY:"auto"}}>
                  {SURYA_MANTRAS.map((m,i)=>(
                    <CueRecorderRow key={i} cueId={`surya_mantra_${i}`} label={`${i+1}. ${m.name}`} fallbackText={`Om ${m.name} Namaha`} th={th}/>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={()=>{ setPhase("mantra"); announceMantra(); }} style={{width:"100%",background:"linear-gradient(135deg,#FF8C00,#D026C8)",border:"none",borderRadius:13,padding:"15px",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer"}}>🙏 Begin Practice</button>
      </div>
    );
  }

  if(phase==="mantra"){
    const mantra=SURYA_MANTRAS[roundIdx % SURYA_MANTRAS.length];
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Surya Namaskar" subtitle={`Round ${roundIdx+1} of ${rounds}${sequenceLabel||""}`} onExit={onExit} th={th}/>
        <div style={{padding:"50px 20px"}}>
          <div style={{fontSize:46,marginBottom:14}}>🕉️</div>
          <div style={{fontSize:24,fontWeight:900,color:"#fff",marginBottom:6,textShadow:"0 1px 8px rgba(0,0,0,0.5)"}}>Om {mantra.name} Namaha</div>
          <div style={{fontSize:22,color:th.t2,marginBottom:8}}>{mantra.sanskrit}</div>
          <div style={{fontSize:12,color:th.t3,fontStyle:"italic"}}>"{mantra.meaning}"</div>
        </div>
      </div>
    );
  }

  if(phase==="done"){
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Surya Namaskar" subtitle="Complete" onExit={onExit} th={th}/>
        <div style={{padding:"40px 20px"}}>
          <div style={{fontSize:60,marginBottom:14}}>🏆</div>
          <div style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:8}}>{rounds} Rounds Complete</div>
          <div style={{fontSize:12,color:th.t3,marginBottom:24}}>≈{rounds*24*cfg.poseHoldSec/60|0} min · {rounds*24} poses · {Math.round(rounds*24*14/12)} cal</div>
          <button onClick={()=>onComplete()} style={{background:"linear-gradient(135deg,#FF8C00,#D026C8)",border:"none",borderRadius:12,padding:"13px 32px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>✓ Mark Done{sequenceLabel?" & Continue":""}</button>
        </div>
      </div>
    );
  }

  // phase === "pose"
  const pose=sequence[poseIdx];
  const setLabel=poseIdx<12?"Right Leg Leads":"Left Leg Leads";
  const progress=1-(secondsLeft/cfg.poseHoldSec);
  return (
    <div style={{paddingBottom:30}}>
      <SessionHeader title="Surya Namaskar" subtitle={`Round ${roundIdx+1} of ${rounds} · ${setLabel}${sequenceLabel||""}`} onExit={onExit} th={th}/>
      <SessionBar current={poseIdx+1} total={24} th={th} color={pose.color}/>
      <BreathRing progress={progress} label={pose.breath.toUpperCase()} sublabel={pose.e} count={null} color="#fff" th={th} size={200}/>
      <div style={{textAlign:"center",marginTop:18}}>
        <div style={{fontSize:19,fontWeight:900,color:"#fff",marginBottom:6,textShadow:"0 1px 8px rgba(0,0,0,0.5)"}}>{pose.n}</div>
        <div style={{fontSize:13,color:th.t2,lineHeight:1.6,maxWidth:300,margin:"0 auto"}}>{pose.c}</div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:24,justifyContent:"center"}}>
        <button onClick={()=>setPaused(p=>!p)} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.22)",color:th.t1,borderRadius:10,padding:"10px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>{paused?"▶ Resume":"⏸ Pause"}</button>
      </div>
      {testMode && <SkipButton onSkip={skipPose} th={th}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRANAYAMA STAGE RUNNER — reusable breath-pattern engine
// Drives any inhale→hold→exhale→hold cycle for N rounds, with
// the BreathRing as the visual pacer and a spoken cue at the
// start of each phase. Used by Sudarshan Kriya's 3-stage
// pranayama AND Sanyam Dhyan's Bhogar Pranayam.
// ═══════════════════════════════════════════════════════════
function PranayamaStageRunner({pattern,totalRounds,label,handCue,onAllRoundsComplete,th,color,testMode}){
  const phases=["inhale","hold1","exhale","hold2"];
  const phaseLabels={inhale:"INHALE",hold1:"HOLD",exhale:"EXHALE",hold2:"HOLD"};
  const [roundIdx,setRoundIdx]=useState(0);
  const [phaseIdx,setPhaseIdx]=useState(0);
  const [secondsLeft,setSecondsLeft]=useState(pattern[phases[0]]);
  const [paused,setPaused]=useState(false);
  const spokenRef=useRef("");

  const curPhase=phases[phaseIdx];
  const curDur=pattern[curPhase]||1;

  useEffect(()=>{
    const key=`${roundIdx}-${phaseIdx}`;
    if(spokenRef.current!==key){
      spokenRef.current=key;
      if(curDur>0) speak(phaseLabels[curPhase], 1.0, curPhase==="inhale"?1.05:curPhase==="exhale"?0.95:1.0);
    }
  },[roundIdx,phaseIdx]);

  useEffect(()=>{
    if(paused)return;
    if(curDur<=0){ advancePhase(); return; }
    const iv=setInterval(()=>{
      setSecondsLeft(s=>{
        if(s<=1){ advancePhase(); return curDur; }
        return s-1;
      });
    },1000);
    return ()=>clearInterval(iv);
    // eslint-disable-next-line
  },[phaseIdx,roundIdx,paused]);

  function advancePhase(){
    setPhaseIdx(pi=>{
      const next=pi+1;
      if(next>=phases.length){
        setRoundIdx(ri=>{
          const nr=ri+1;
          if(nr>=totalRounds){ setTimeout(onAllRoundsComplete,300); return ri; }
          return nr;
        });
        setSecondsLeft(pattern[phases[0]]);
        return 0;
      }
      setSecondsLeft(pattern[phases[next]]||1);
      return next;
    });
  }

  function skipAll(){ onAllRoundsComplete(); }

  const progress=1-(secondsLeft/Math.max(1,curDur));
  const phaseColor=curPhase==="inhale"?"#00DD88":curPhase==="exhale"?"#FF8C00":"#7C9CFF";

  return (
    <div style={{textAlign:"center"}}>
      <SessionBar current={roundIdx+1} total={totalRounds} th={th} color={color}/>
      {handCue && <div style={{fontSize:11,color:th.t3,marginBottom:10,fontStyle:"italic"}}>✋ {handCue}</div>}
      <BreathRing progress={progress} label={phaseLabels[curPhase]} sublabel={`${secondsLeft}s`} count={null} color={phaseColor} th={th} size={190}/>
      <div style={{fontSize:11,color:th.t3,marginTop:14}}>{label} — Round {roundIdx+1} of {totalRounds}</div>
      <button onClick={()=>setPaused(p=>!p)} style={{marginTop:16,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.22)",color:th.t1,borderRadius:10,padding:"9px 18px",fontWeight:800,fontSize:12,cursor:"pointer"}}>{paused?"▶ Resume":"⏸ Pause"}</button>
      {testMode && <SkipButton onSkip={skipAll} th={th}/>}
    </div>
  );
}

// ── Simple countdown rest screen (used between stages) ────
function RestCountdown({seconds,label,onDone,th,testMode}){
  const [left,setLeft]=useState(seconds);
  useEffect(()=>{
    if(left<=0){ onDone(); return; }
    const t=setTimeout(()=>setLeft(l=>l-1),1000);
    return ()=>clearTimeout(t);
  },[left]);
  return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:40,marginBottom:10}}>🌬️</div>
      <div style={{fontSize:14,color:th.t2,marginBottom:8}}>{label}</div>
      <div style={{fontSize:36,fontWeight:900,color:"#fff"}}>{left}</div>
      {testMode && <SkipButton onSkip={onDone} th={th}/>}
    </div>
  );
}

// ── Counted breathing screen (Bhastrika, slow/medium/fast Kriya cycles) ──
// Accepts either bpm (legacy) or msPerCount (new, from SpeedSelector).
function CountedBreathing({targetCount,bpm,msPerCount,label,sublabel,onDone,th,color,testMode}){
  const [count,setCount]=useState(0);
  const [paused,setPaused]=useState(false);
  const intervalMs=msPerCount || Math.max(280, 60000/Math.max(1,bpm||30));
  useEffect(()=>{
    if(paused)return;
    if(count>=targetCount){ setTimeout(onDone,400); return; }
    const t=setTimeout(()=>{
      setCount(c=>c+1);
    },intervalMs);
    return ()=>clearTimeout(t);
    // eslint-disable-next-line
  },[count,paused]);
  const progress=count/Math.max(1,targetCount);
  return (
    <div style={{textAlign:"center"}}>
      <BreathRing progress={progress} label={label} sublabel={sublabel} count={count} color={color} th={th} size={190}/>
      <div style={{fontSize:11,color:th.t3,marginTop:12}}>Target: {targetCount} breaths</div>
      <button onClick={()=>setPaused(p=>!p)} style={{marginTop:14,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.22)",color:th.t1,borderRadius:10,padding:"9px 18px",fontWeight:800,fontSize:12,cursor:"pointer"}}>{paused?"▶ Resume":"⏸ Pause"}</button>
      {testMode && <SkipButton onSkip={onDone} th={th}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUDARSHAN KRIYA PLAYER
// 3-stage pranayama (8/8/6 rounds, 4-4-6-2 breath) → Bhastrika
// (3×20, user-chosen speed) → lock & hold + break → Om×3 →
// main Kriya (3 rounds of 20 slow / 40 medium / 40 fast breaths,
// paced to fit the chosen total duration) → Savasana.
// ═══════════════════════════════════════════════════════════
function SudarshanKriyaPlayer({config,onComplete,onExit,th,testMode,skipSetup,overrideConfig,sequenceLabel}){
  const cfg={...config,...(overrideConfig||{})};
  const STEPS=["intro","stage1","rest1","stage2","rest2","stage3","rest3",
               "bhastrika-intro","bhastrika1","bhastrika-rest1","bhastrika2","bhastrika-rest2","bhastrika3",
               "lock","lock-break","sit","om","kriya-intro","kriya-slow1","kriya-medium1","kriya-fast1",
               "kriya-slow2","kriya-medium2","kriya-fast2","kriya-slow3","kriya-medium3","kriya-fast3",
               "savasana","done"];
  const [stepIdx,setStepIdx]=useState(skipSetup?1:0); // skip "intro" if sequencing
  const [duration,setDuration]=useState(cfg.kriyaDurationMin);
  const [bhastrikaSpeed,setBhastrikaSpeed]=useState("medium");
  const [lockHoldSeconds,setLockHoldSeconds]=useState(0);
  const [lockHolding,setLockHolding]=useState(false);
  const step=STEPS[stepIdx];
  const lockTimerRef=useRef(null);

  function next(){ setStepIdx(i=>Math.min(i+1,STEPS.length-1)); }
  function skipTo(stepName){ setStepIdx(STEPS.indexOf(stepName)); }

  const baseSlowBpm=6, baseMedBpm=15, baseFastBpm=30;
  const baseSec=(cfg.slowBreaths/baseSlowBpm + cfg.mediumBreaths/baseMedBpm + cfg.fastBreaths/baseFastBpm)*60*cfg.kriyaRoundsCount;
  const targetSec=duration*60;
  const scale=targetSec/baseSec;
  const slowBpm=baseSlowBpm/scale, medBpm=baseMedBpm/scale, fastBpm=baseFastBpm/scale;
  const bhastrikaMs=(SPEED_PRESETS.find(p=>p.id===bhastrikaSpeed)||SPEED_PRESETS[1]).ms;

  useEffect(()=>{
    if(step==="intro") speak("Sit in Vajrasana for the three-stage Pranayama. Let's begin.",0.85);
    if(step==="lock"){ speak("Apply the locks. Hold the breath as long as is comfortable. Tap Release when you're ready.",0.85); }
    if(step==="sit") speak(`Now sit in ${SIT_POSITIONS.find(s=>s.id===cfg.sitPosition)?.label||"Sukhasan"}.`,0.85);
    if(step==="savasana") speak("Lie down flat in Savasana. Don't move. Let the body integrate.",0.82);
    if(step==="done") speak("Sudarshan Kriya complete. Jai Gurudev.",0.85);
  },[step]);

  useEffect(()=>{
    if(step!=="lock"||!lockHolding)return;
    lockTimerRef.current=setInterval(()=>setLockHoldSeconds(s=>s+1),1000);
    return ()=>clearInterval(lockTimerRef.current);
  },[step,lockHolding]);

  async function playOmChants(){
    for(let i=0;i<cfg.omChants;i++){
      await playCue(`kriya_om_${i}`, "Om", {mode:cfg.omAudioMode, rate:0.7});
      await new Promise(r=>setTimeout(r,600));
    }
    next();
  }
  useEffect(()=>{ if(step==="om") playOmChants(); },[step]);

  const subSuffix=sequenceLabel||"";

  if(step==="intro"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={"Art of Living breathwork"+subSuffix} onExit={onExit} th={th}/>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:54,marginBottom:10}}>🌀</div>
          <div style={{fontSize:13,color:th.t2,lineHeight:1.7,maxWidth:300,margin:"0 auto"}}>3-stage pranayama → Bhastrika → lock & hold → main Kriya. Cortisol −56%, happiness +68%.</div>
        </div>
        <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:800,color:th.t3,letterSpacing:1,marginBottom:10}}>MAIN KRIYA DURATION</div>
          <div style={{display:"flex",gap:7,justifyContent:"center"}}>
            {[10,15,20,25].map(m=>(
              <button key={m} onClick={()=>setDuration(m)} style={{padding:"10px 16px",borderRadius:11,border:`2px solid ${duration===m?"#D026C8":"rgba(255,255,255,0.14)"}`,background:duration===m?"rgba(208,38,200,0.18)":"rgba(255,255,255,0.05)",color:duration===m?"#D026C8":th.t2,fontWeight:800,fontSize:13,cursor:"pointer"}}>{m} min</button>
            ))}
          </div>
        </div>
        <button onClick={next} style={{width:"100%",background:"linear-gradient(135deg,#D026C8,#7C3AED)",border:"none",borderRadius:13,padding:"15px",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer"}}>🙏 Begin Practice</button>
      </div>
    );
  }

  if(step==="stage1"||step==="stage2"||step==="stage3"){
    const n=step==="stage1"?1:step==="stage2"?2:3;
    const rounds=n===1?cfg.stage1Rounds:n===2?cfg.stage2Rounds:cfg.stage3Rounds;
    const handCue=n===1?"Thumbs on the hip bones":n===2?"Thumbs under the armpits":"Elbows up, hands on the back";
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={`3-Stage Pranayama — Stage ${n}${subSuffix}`} onExit={onExit} th={th}/>
        <PranayamaStageRunner pattern={cfg.pattern} totalRounds={rounds} label={`Stage ${n}`} handCue={handCue} onAllRoundsComplete={next} th={th} color="#D026C8" testMode={testMode}/>
      </div>
    );
  }

  if(step==="rest1"||step==="rest2"||step==="rest3"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={"Transition"+subSuffix} onExit={onExit} th={th}/>
        <RestCountdown seconds={cfg.restBreathsBetweenStages*3} label={`${cfg.restBreathsBetweenStages} normal breaths — palms up on the thighs`} onDone={next} th={th} testMode={testMode}/>
      </div>
    );
  }

  if(step==="bhastrika-intro"){
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={"Bhastrika — Bellows Breath"+subSuffix} onExit={onExit} th={th}/>
        <div style={{padding:"16px 6px"}}>
          <div style={{fontSize:42,marginBottom:8}}>💨</div>
          <div style={{fontSize:13,color:th.t2,lineHeight:1.7,marginBottom:16}}>{cfg.bhastrikaRounds} rounds of {cfg.bhastrikaCount} rapid pumping breaths, fists raised overhead.</div>
        </div>
        <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:800,color:th.t3,letterSpacing:1,marginBottom:10}}>PUMP SPEED</div>
          <SpeedSelector value={bhastrikaSpeed} onChange={setBhastrikaSpeed} totalCount={cfg.bhastrikaCount} th={th} color="#FF8C00"/>
        </div>
        <button onClick={next} style={{background:"linear-gradient(135deg,#D026C8,#7C3AED)",border:"none",borderRadius:12,padding:"12px 28px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>Start Bhastrika</button>
      </div>
    );
  }

  if(step==="bhastrika1"||step==="bhastrika2"||step==="bhastrika3"){
    const n=step==="bhastrika1"?1:step==="bhastrika2"?2:3;
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={`Bhastrika — Round ${n} of ${cfg.bhastrikaRounds}${subSuffix}`} onExit={onExit} th={th}/>
        <CountedBreathing targetCount={cfg.bhastrikaCount} msPerCount={bhastrikaMs} label="PUMP" sublabel="rapid breaths" onDone={next} th={th} color="#FF8C00" testMode={testMode}/>
      </div>
    );
  }
  if(step==="bhastrika-rest1"||step==="bhastrika-rest2"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={"Rest"+subSuffix} onExit={onExit} th={th}/>
        <RestCountdown seconds={Math.round(cfg.bhastrikaRestBreaths*2.5)} label={`${cfg.bhastrikaRestBreaths} normal breaths`} onDone={next} th={th} testMode={testMode}/>
      </div>
    );
  }

  if(step==="lock"){
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={"Lock & Hold"+subSuffix} onExit={onExit} th={th}/>
        <div style={{padding:"30px 20px"}}>
          <div style={{fontSize:50,marginBottom:14}}>🔒</div>
          <div style={{fontSize:13,color:th.t2,marginBottom:20}}>Apply the locks. Hold for as long as feels comfortable.</div>
          <div style={{fontSize:44,fontWeight:900,color:"#fff",marginBottom:20}}>{lockHoldSeconds}s</div>
          {!lockHolding && <button onClick={()=>setLockHolding(true)} style={{background:"linear-gradient(135deg,#D026C8,#7C3AED)",border:"none",borderRadius:12,padding:"12px 28px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>Start Hold</button>}
          {lockHolding && <button onClick={()=>{setLockHolding(false);next();}} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:12,padding:"12px 28px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>Release & Continue</button>}
          {testMode && !lockHolding && <SkipButton onSkip={next} th={th}/>}
        </div>
      </div>
    );
  }

  if(step==="lock-break"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={"Break"+subSuffix} onExit={onExit} th={th}/>
        <RestCountdown seconds={cfg.lockHoldBreakMin*60} label="Resting — breathe normally" onDone={next} th={th} testMode={testMode}/>
      </div>
    );
  }

  if(step==="sit"){
    const pos=SIT_POSITIONS.find(s=>s.id===cfg.sitPosition)||SIT_POSITIONS[0];
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={"Sitting Position"+subSuffix} onExit={onExit} th={th}/>
        <div style={{padding:"40px 20px"}}>
          <div style={{fontSize:50,marginBottom:14}}>🧘</div>
          <div style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:6}}>{pos.label}</div>
          <div style={{fontSize:12,color:th.t3,marginBottom:24}}>{pos.sub}</div>
          <button onClick={next} style={{background:"linear-gradient(135deg,#D026C8,#7C3AED)",border:"none",borderRadius:12,padding:"12px 28px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>Continue to Om Chant</button>
        </div>
      </div>
    );
  }

  if(step==="om"){
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={`Om Chant ×${cfg.omChants}${subSuffix}`} onExit={onExit} th={th}/>
        <div style={{padding:"50px 20px"}}>
          <div style={{fontSize:50,marginBottom:14,animation:"pulse 2s infinite"}}>🕉️</div>
          <div style={{fontSize:13,color:th.t3}}>Chanting Om...</div>
          {testMode && <SkipButton onSkip={()=>skipTo("kriya-intro")} th={th}/>}
        </div>
      </div>
    );
  }

  if(step==="kriya-intro"){
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={"Main Kriya"+subSuffix} onExit={onExit} th={th}/>
        <div style={{padding:"30px 20px"}}>
          <div style={{fontSize:46,marginBottom:10}}>🌬️</div>
          <div style={{fontSize:13,color:th.t2,lineHeight:1.7,marginBottom:14}}>3 rounds of {cfg.slowBreaths} slow + {cfg.mediumBreaths} medium + {cfg.fastBreaths} fast breaths — paced to fit {duration} minutes.</div>
          {cfg.duringKriyaAudio==="music" && <div style={{fontSize:11,color:th.t3,marginBottom:14}}>🎵 Ambient music will play softly throughout</div>}
          <button onClick={next} style={{background:"linear-gradient(135deg,#D026C8,#7C3AED)",border:"none",borderRadius:12,padding:"12px 28px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>Begin Main Kriya</button>
        </div>
      </div>
    );
  }

  if(step.startsWith("kriya-slow")||step.startsWith("kriya-medium")||step.startsWith("kriya-fast")){
    const roundN=step.endsWith("1")?1:step.endsWith("2")?2:3;
    const speedName=step.includes("slow")?"slow":step.includes("medium")?"medium":"fast";
    const targetCount=speedName==="slow"?cfg.slowBreaths:speedName==="medium"?cfg.mediumBreaths:cfg.fastBreaths;
    const bpm=speedName==="slow"?slowBpm:speedName==="medium"?medBpm:fastBpm;
    const color=speedName==="slow"?"#00DD88":speedName==="medium"?"#FFB300":"#FF4444";
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={`Round ${roundN} of ${cfg.kriyaRoundsCount} — ${speedName.toUpperCase()} breaths${subSuffix}`} onExit={onExit} th={th}/>
        <CountedBreathing targetCount={targetCount} bpm={bpm} label={speedName.toUpperCase()} sublabel="breaths" onDone={next} th={th} color={color} testMode={testMode}/>
      </div>
    );
  }

  if(step==="savasana"){
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Sudarshan Kriya" subtitle={"Savasana"+subSuffix} onExit={onExit} th={th}/>
        <RestCountdown seconds={120} label="Lie flat. Integration." onDone={next} th={th} testMode={testMode}/>
      </div>
    );
  }

  return (
    <div style={{paddingBottom:30,textAlign:"center"}}>
      <SessionHeader title="Sudarshan Kriya" subtitle="Complete" onExit={onExit} th={th}/>
      <div style={{padding:"40px 20px"}}>
        <div style={{fontSize:60,marginBottom:14}}>🏆</div>
        <div style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:8}}>Practice Complete</div>
        <div style={{fontSize:12,color:th.t3,marginBottom:24}}>🙏 Jai Gurudev</div>
        <button onClick={()=>onComplete()} style={{background:"linear-gradient(135deg,#D026C8,#7C3AED)",border:"none",borderRadius:12,padding:"13px 32px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>✓ Mark Done{sequenceLabel?" & Continue":""}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PADMASANA DHYAN PLAYER
// Three interchangeable guide sources: an embedded YouTube
// reference (with speed control), the user's own recorded
// narration, or AI narration — all walking through the same
// asana reference list.
// ═══════════════════════════════════════════════════════════
function extractYouTubeId(url){
  try{
    const m1=url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if(m1) return m1[1];
    const m2=url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if(m2) return m2[1];
    return null;
  }catch(e){ return null; }
}

function parseDurSec(durStr){
  const m=String(durStr).match(/(\d+)/);
  return m ? parseInt(m[1])*(/min/.test(durStr)?60:1) : 30;
}

// Embeds the YouTube IFrame Player API. If the API script fails to
// load within 3s (common inside a sandboxed preview), falls back to
// a clear message + a direct "Open on YouTube" link rather than a
// silent blank box — this is the one part of the app that depends
// on an external script, so deployed-on-Vercel is what makes it
// reliable; it is expected to be unreliable in the chat preview.
function YouTubeEmbed({videoId,videoUrl,title,speed,th}){
  const iframeRef=useRef(null);
  const playerRef=useRef(null);
  const [status,setStatus]=useState("loading"); // loading | ready | blocked

  useEffect(()=>{
    let cancelled=false;
    const timeout=setTimeout(()=>{ if(!cancelled && status==="loading") setStatus("blocked"); },3500);
    if(window.YT && window.YT.Player){ setStatus("ready"); clearTimeout(timeout); return; }
    if(!document.getElementById("yt-iframe-api")){
      const tag=document.createElement("script");
      tag.id="yt-iframe-api";
      tag.src="https://www.youtube.com/iframe_api";
      tag.onerror=()=>{ if(!cancelled) setStatus("blocked"); };
      document.body.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady=()=>{ if(!cancelled){ setStatus("ready"); clearTimeout(timeout); } };
    return ()=>{ cancelled=true; clearTimeout(timeout); };
    // eslint-disable-next-line
  },[]);

  useEffect(()=>{
    if(status!=="ready"||!iframeRef.current)return;
    try{
      playerRef.current=new window.YT.Player(iframeRef.current,{
        videoId,
        playerVars:{rel:0,modestbranding:1},
      });
    }catch(e){ setStatus("blocked"); }
  },[status,videoId]);

  useEffect(()=>{
    if(playerRef.current && playerRef.current.setPlaybackRate){
      try{ playerRef.current.setPlaybackRate(speed); }catch(e){}
    }
  },[speed]);

  if(status==="blocked"){
    return (
      <div style={{background:"rgba(255,160,0,0.10)",border:"1px solid rgba(255,160,0,0.25)",borderRadius:14,padding:"22px 16px",textAlign:"center"}}>
        <div style={{fontSize:30,marginBottom:8}}>📺</div>
        <div style={{fontSize:12,color:"#FFB300",fontWeight:700,marginBottom:6}}>Video can't embed here</div>
        <div style={{fontSize:11,color:th.t3,lineHeight:1.6,marginBottom:12}}>This happens inside Claude's preview sandbox — it plays normally once the app is deployed to Vercel. For now, open it directly:</div>
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",background:"rgba(255,255,255,0.14)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",borderRadius:9,padding:"9px 18px",fontSize:12,fontWeight:700,textDecoration:"none"}}>Open on YouTube ↗</a>
      </div>
    );
  }

  return (
    <div>
      <div style={{position:"relative",paddingBottom:"56.25%",borderRadius:14,overflow:"hidden",background:"#000"}}>
        <div ref={iframeRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
        {status==="loading" && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.4)",fontSize:11}}>Loading video…</div>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
        <div style={{fontSize:11,color:th.t3}}>{title}</div>
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:th.t3,textDecoration:"underline"}}>Open on YouTube ↗</a>
      </div>
    </div>
  );
}

function PadmasanaPlayer({config,onComplete,onExit,th,testMode,skipSetup,overrideConfig,sequenceLabel}){
  const cfg={...config,...(overrideConfig||{})};
  const [phase,setPhase]=useState(skipSetup?(cfg.audioMode==="youtube"?"video":"asana"):"setup");
  const [audioMode,setAudioMode]=useState(cfg.audioMode);
  const [speed,setSpeed]=useState(cfg.playbackSpeed);
  const [showRecorder,setShowRecorder]=useState(false);
  const [asanaIdx,setAsanaIdx]=useState(0);
  const [secondsLeft,setSecondsLeft]=useState(0);
  const [paused,setPaused]=useState(false);
  const asanas=cfg.asanas||PADMASANA_ASANAS_DEFAULT;
  const videoId=extractYouTubeId(cfg.videoUrl);
  const subSuffix=sequenceLabel||"";

  async function announceAsana(idx){
    const a=asanas[idx];
    setSecondsLeft(parseDurSec(a.dur));
    await playCue(`padmasana_asana_${idx}`, `${a.n}. ${a.c}`, {mode:audioMode==="recorded"?"recorded":"ai", rate:0.82});
  }

  useEffect(()=>{ if(phase==="asana") announceAsana(asanaIdx); },[asanaIdx,phase]);

  useEffect(()=>{
    if(phase!=="asana"||paused)return;
    const iv=setInterval(()=>{
      setSecondsLeft(s=>{
        if(s<=1){
          setAsanaIdx(ai=>{
            const next=ai+1;
            if(next>=asanas.length){ setTimeout(()=>setPhase("done"),50); return ai; }
            return next;
          });
          return 1;
        }
        return s-1;
      });
    },1000);
    return ()=>clearInterval(iv);
  },[phase,paused]);

  function skipAsana(){
    setAsanaIdx(ai=>{
      const next=ai+1;
      if(next>=asanas.length){ setTimeout(()=>setPhase("done"),50); return ai; }
      return next;
    });
  }

  if(phase==="setup"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Padmasana Dhyan" subtitle="Lotus meditation" onExit={onExit} th={th}/>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:54,marginBottom:10}}>🪷</div>
          <div style={{fontSize:13,color:th.t2,lineHeight:1.7,maxWidth:300,margin:"0 auto"}}>{asanas.length} reference postures, guided by video or voice.</div>
        </div>
        <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"16px",marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:800,color:th.t3,letterSpacing:1,marginBottom:10}}>GUIDE SOURCE</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {[["youtube","📺 YouTube"],["recorded","🎙️ My Voice"],["ai","🤖 AI Voice"]].map(([m,lb])=>(
              <button key={m} onClick={()=>setAudioMode(m)} style={{flex:1,padding:"10px 8px",borderRadius:10,border:`2px solid ${audioMode===m?"#FF4488":"rgba(255,255,255,0.14)"}`,background:audioMode===m?"rgba(255,68,136,0.16)":"rgba(255,255,255,0.05)",color:audioMode===m?"#FF4488":th.t2,fontWeight:800,fontSize:11,cursor:"pointer"}}>{lb}</button>
            ))}
          </div>
          {audioMode==="recorded" && (
            <div style={{marginTop:10}}>
              <button onClick={()=>setShowRecorder(s=>!s)} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.14)",color:th.t2,borderRadius:9,padding:"8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{showRecorder?"Hide":`🎙️ Record the ${asanas.length} asana cues now`}</button>
              {showRecorder && (
                <div style={{marginTop:8,maxHeight:280,overflowY:"auto"}}>
                  {asanas.map((a,i)=>(
                    <CueRecorderRow key={i} cueId={`padmasana_asana_${i}`} label={`${i+1}. ${a.n}`} fallbackText={`${a.n}. ${a.c}`} th={th}/>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {audioMode==="youtube" && (
          <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"16px",marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:800,color:th.t3,letterSpacing:1,marginBottom:10}}>PLAYBACK SPEED</div>
            <div style={{display:"flex",gap:7}}>
              {[1,1.5,1.75,2].map(s=>(
                <button key={s} onClick={()=>setSpeed(s)} style={{flex:1,padding:"8px",borderRadius:9,border:`2px solid ${speed===s?"#FF4488":"rgba(255,255,255,0.14)"}`,background:speed===s?"rgba(255,68,136,0.16)":"rgba(255,255,255,0.05)",color:speed===s?"#FF4488":th.t2,fontWeight:800,fontSize:12,cursor:"pointer"}}>{s}×</button>
              ))}
            </div>
          </div>
        )}
        <button onClick={()=>setPhase(audioMode==="youtube"?"video":"asana")} style={{width:"100%",background:"linear-gradient(135deg,#FF4488,#7C3AED)",border:"none",borderRadius:13,padding:"15px",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer"}}>🙏 Begin Practice</button>
      </div>
    );
  }

  if(phase==="video"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Padmasana Dhyan" subtitle={"Video reference"+subSuffix} onExit={onExit} th={th}/>
        {videoId ? (
          <YouTubeEmbed videoId={videoId} videoUrl={cfg.videoUrl} title={cfg.videoTitle} speed={speed} th={th}/>
        ) : (
          <div style={{background:"rgba(255,160,0,0.10)",border:"1px solid rgba(255,160,0,0.25)",borderRadius:12,padding:"16px",textAlign:"center",fontSize:12,color:"#FFB300"}}>Couldn't read a video ID from the configured URL — check it in Admin.</div>
        )}
        <div style={{marginTop:16}}>
          <div style={{fontSize:10,fontWeight:800,color:th.t3,letterSpacing:1,marginBottom:8}}>REFERENCE LIST</div>
          {asanas.map((a,i)=>(
            <div key={i} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:i<asanas.length-1?`1px solid ${th.divider}`:"none"}}>
              <span style={{fontSize:10,color:th.t3,fontWeight:800,minWidth:18}}>{i+1}</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:th.t1}}>{a.n}</div><div style={{fontSize:10,color:th.t3}}>{a.dur} — {a.c}</div></div>
            </div>
          ))}
        </div>
        <button onClick={()=>setPhase("done")} style={{width:"100%",marginTop:16,background:"linear-gradient(135deg,#FF4488,#7C3AED)",border:"none",borderRadius:12,padding:"13px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>✓ Finished Watching</button>
      </div>
    );
  }

  if(phase==="asana"){
    const a=asanas[asanaIdx];
    const progress=1-(secondsLeft/Math.max(1,parseDurSec(a.dur)));
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Padmasana Dhyan" subtitle={`${audioMode==="recorded"?"Your voice":"AI voice"} guide${subSuffix}`} onExit={onExit} th={th}/>
        <SessionBar current={asanaIdx+1} total={asanas.length} th={th} color="#FF4488"/>
        <BreathRing progress={progress} label={a.n.toUpperCase()} sublabel={a.dur} count={null} color="#FF4488" th={th} size={200}/>
        <div style={{textAlign:"center",marginTop:16,fontSize:13,color:th.t2,maxWidth:300,margin:"16px auto 0"}}>{a.c}</div>
        <div style={{display:"flex",gap:8,marginTop:22,justifyContent:"center"}}>
          <button onClick={()=>setPaused(p=>!p)} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.22)",color:th.t1,borderRadius:10,padding:"10px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>{paused?"▶ Resume":"⏸ Pause"}</button>
        </div>
        {testMode && <SkipButton onSkip={skipAsana} th={th}/>}
      </div>
    );
  }

  return (
    <div style={{paddingBottom:30,textAlign:"center"}}>
      <SessionHeader title="Padmasana Dhyan" subtitle="Complete" onExit={onExit} th={th}/>
      <div style={{padding:"40px 20px"}}>
        <div style={{fontSize:60,marginBottom:14}}>🏆</div>
        <div style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:8}}>Practice Complete</div>
        <div style={{fontSize:12,color:th.t3,marginBottom:24}}>10 min ≈ 4 hours of deep sleep restoration</div>
        <button onClick={()=>onComplete()} style={{background:"linear-gradient(135deg,#FF4488,#7C3AED)",border:"none",borderRadius:12,padding:"13px 32px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>✓ Mark Done{sequenceLabel?" & Continue":""}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SANYAM DHYAN PLAYER
// Bhogar Pranayam → Pratyahar visualization → Sahaj Samadhi
// (silent, timed) → spaced bell rounds → lie down → closing
// mantra.
// ═══════════════════════════════════════════════════════════
function BellTimer({count,spacingSec,onDone,th,testMode}){
  const [rung,setRung]=useState(0);
  const [secondsToNext,setSecondsToNext]=useState(spacingSec);
  const [paused,setPaused]=useState(false);

  useEffect(()=>{ playChime(528,1600); },[]);

  useEffect(()=>{
    if(paused)return;
    if(rung>=count){ setTimeout(onDone,500); return; }
    const iv=setInterval(()=>{
      setSecondsToNext(s=>{
        if(s<=1){
          playChime(528,1600);
          setRung(r=>r+1);
          return spacingSec;
        }
        return s-1;
      });
    },1000);
    return ()=>clearInterval(iv);
  },[paused,rung]);

  function skipAll(){ setRung(count); }

  const progress=rung/Math.max(1,count);
  return (
    <div style={{textAlign:"center"}}>
      <BreathRing progress={progress} label="BELLS" sublabel={`next in ${secondsToNext}s`} count={rung} color="#7744FF" th={th} size={200}/>
      <div style={{fontSize:11,color:th.t3,marginTop:14}}>{rung} of {count} bells</div>
      <button onClick={()=>setPaused(p=>!p)} style={{marginTop:14,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.22)",color:th.t1,borderRadius:10,padding:"9px 18px",fontWeight:800,fontSize:12,cursor:"pointer"}}>{paused?"▶ Resume":"⏸ Pause"}</button>
      {testMode && <SkipButton onSkip={skipAll} th={th}/>}
    </div>
  );
}

function SanyamPlayer({config,onComplete,onExit,th,testMode,skipSetup,overrideConfig,sequenceLabel}){
  const cfg={...config,...(overrideConfig||{})};
  const STEPS=["intro","bhogar","pratyahar","samadhi","bells","liedown","mantra","done"];
  const [stepIdx,setStepIdx]=useState(skipSetup?1:0);
  const step=STEPS[stepIdx];
  const subSuffix=sequenceLabel||"";
  function next(){ setStepIdx(i=>Math.min(i+1,STEPS.length-1)); }

  useEffect(()=>{
    if(step==="intro") speak("Let's begin the evening closing practice.",0.85);
    if(step==="pratyahar") speak("Imagine the rising sun at the base of the root chakra. Visualize Lord Ganpati seated at the base of the spine.",0.78);
    if(step==="liedown") speak("Lie down on the ground. Let every part of the body release.",0.82);
    if(step==="done") speak("Sanyam Dhyan complete. Om Shanti.",0.85);
  },[step]);

  async function playClosingMantra(){
    await playCue("sanyam_closing_mantra","Om Shanti, Om Shanti, Om Shanti",{mode:cfg.lieDownMantraAudioMode,rate:0.7});
    next();
  }
  useEffect(()=>{ if(step==="mantra") playClosingMantra(); },[step]);

  if(step==="intro"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sanyam Dhyan" subtitle="Evening closing practice" onExit={onExit} th={th}/>
        <div style={{textAlign:"center",padding:"20px"}}>
          <div style={{fontSize:54,marginBottom:10}}>🌙</div>
          <div style={{fontSize:13,color:th.t2,lineHeight:1.7,maxWidth:300,margin:"0 auto 20px"}}>Bhogar Pranayam → Pratyahar → Sahaj Samadhi → bells → rest.</div>
          <button onClick={next} style={{background:"linear-gradient(135deg,#7744FF,#0055FF)",border:"none",borderRadius:12,padding:"13px 30px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>🙏 Begin</button>
        </div>
      </div>
    );
  }

  if(step==="bhogar"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sanyam Dhyan" subtitle={"Bhogar Pranayam"+subSuffix} onExit={onExit} th={th}/>
        <PranayamaStageRunner pattern={cfg.bhogarPattern} totalRounds={cfg.bhogarRounds} label="Bhogar Pranayam" handCue={null} onAllRoundsComplete={next} th={th} color="#7744FF" testMode={testMode}/>
      </div>
    );
  }

  if(step==="pratyahar"){
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Sanyam Dhyan" subtitle={"Pratyahar"+subSuffix} onExit={onExit} th={th}/>
        <div style={{padding:"40px 20px"}}>
          <div style={{fontSize:50,marginBottom:16}}>🌅</div>
          <div style={{fontSize:13,color:th.t2,lineHeight:1.8,maxWidth:300,margin:"0 auto 24px"}}>Imagine the rising sun at the base of the root chakra.<br/><br/>Visualize Lord Ganpati seated at the base of the spine.</div>
          <button onClick={next} style={{background:"linear-gradient(135deg,#7744FF,#0055FF)",border:"none",borderRadius:12,padding:"12px 28px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>Continue</button>
        </div>
      </div>
    );
  }

  if(step==="samadhi"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sanyam Dhyan" subtitle={"Sahaj Samadhi"+subSuffix} onExit={onExit} th={th}/>
        <RestCountdown seconds={cfg.samadhiDurationMin*60} label="Silent meditation" onDone={next} th={th} testMode={testMode}/>
      </div>
    );
  }

  if(step==="bells"){
    return (
      <div style={{paddingBottom:30}}>
        <SessionHeader title="Sanyam Dhyan" subtitle={"Bell Rounds"+subSuffix} onExit={onExit} th={th}/>
        <BellTimer count={cfg.bellCount} spacingSec={cfg.bellSpacingSec} onDone={next} th={th} testMode={testMode}/>
      </div>
    );
  }

  if(step==="liedown"){
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Sanyam Dhyan" subtitle={"Lie Down"+subSuffix} onExit={onExit} th={th}/>
        <RestCountdown seconds={60} label="Lie flat on the ground" onDone={next} th={th} testMode={testMode}/>
      </div>
    );
  }

  if(step==="mantra"){
    return (
      <div style={{paddingBottom:30,textAlign:"center"}}>
        <SessionHeader title="Sanyam Dhyan" subtitle={"Closing Mantra"+subSuffix} onExit={onExit} th={th}/>
        <div style={{padding:"50px 20px"}}>
          <div style={{fontSize:50,marginBottom:14,animation:"pulse 2s infinite"}}>🕉️</div>
          <div style={{fontSize:13,color:th.t3}}>Om Shanti...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{paddingBottom:30,textAlign:"center"}}>
      <SessionHeader title="Sanyam Dhyan" subtitle="Complete" onExit={onExit} th={th}/>
      <div style={{padding:"40px 20px"}}>
        <div style={{fontSize:60,marginBottom:14}}>🏆</div>
        <div style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:8}}>Practice Complete</div>
        <div style={{fontSize:12,color:th.t3,marginBottom:24}}>What you do before sleep determines tomorrow.</div>
        <button onClick={()=>onComplete()} style={{background:"linear-gradient(135deg,#7744FF,#0055FF)",border:"none",borderRadius:12,padding:"13px 32px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>✓ Mark Done{sequenceLabel?" & Continue":""}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// YOGA HUB — choose which of the 4 practices to begin
// ═══════════════════════════════════════════════════════════
function YogaHub({onLaunch,onLaunchAll,th,completedToday}){
  const practices=[
    {id:"surya", name:"Surya Namaskar",  sanskrit:"सूर्य नमस्कार", emoji:"☀️", color:"#FF8C00", desc:"12-pose sun salutation, mantra per round"},
    {id:"kriya", name:"Sudarshan Kriya", sanskrit:"सुदर्शन क्रिया", emoji:"🌀", color:"#D026C8", desc:"3-stage pranayama → Bhastrika → main Kriya"},
    {id:"padmasana", name:"Padmasana Dhyan", sanskrit:"पद्मासन ध्यान", emoji:"🪷", color:"#FF4488", desc:"Lotus meditation, video or voice guided"},
    {id:"sanyam", name:"Sanyam Dhyan",   sanskrit:"सन्यम ध्यान",   emoji:"🌙", color:"#7744FF", desc:"Evening closing, bells, Sahaj Samadhi"},
  ];
  const allDone=practices.every(p=>completedToday.includes(p.id));
  return (
    <div>
      <button onClick={onLaunchAll} style={{width:"100%",textAlign:"left",background:allDone?"rgba(0,210,100,0.12)":"linear-gradient(135deg,rgba(255,140,0,0.18),rgba(124,58,237,0.18))",border:`1px solid ${allDone?"rgba(0,210,100,0.32)":"rgba(255,255,255,0.22)"}`,borderRadius:14,padding:"14px 15px",marginBottom:14,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:48,height:48,borderRadius:13,background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.20)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🌅</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:14,color:th.t1}}>Do All 4 Together</div>
          <div style={{fontSize:10,color:th.t3,marginTop:2}}>Configure once, then move through all four back-to-back</div>
        </div>
        {allDone ? <span style={{fontSize:18}}>✅</span> : <span style={{fontSize:16,color:th.t3}}>▶</span>}
      </button>
      <div style={{fontSize:11,color:th.t3,marginBottom:12,lineHeight:1.6}}>Or pick one individually — each is fully audio-guided.</div>
      {practices.map(p=>{
        const done=completedToday.includes(p.id);
        return (
          <button key={p.id} onClick={()=>onLaunch(p.id)} style={{width:"100%",textAlign:"left",background:done?"rgba(0,210,100,0.10)":th.card,border:`1px solid ${done?"rgba(0,210,100,0.30)":th.cardBorder}`,borderRadius:14,padding:"14px 15px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:48,height:48,borderRadius:13,background:`${p.color}20`,border:`1px solid ${p.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{p.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:th.t1}}>{p.name}</div>
              <div style={{fontSize:9,color:p.color,fontStyle:"italic",marginTop:1}}>{p.sanskrit}</div>
              <div style={{fontSize:10,color:th.t3,marginTop:2}}>{p.desc}</div>
            </div>
            {done ? <span style={{fontSize:18}}>✅</span> : <span style={{fontSize:16,color:th.t3}}>▶</span>}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CUE RECORDER ROW — used throughout Admin to record/replace
// any individual audio cue
// ═══════════════════════════════════════════════════════════
function CueRecorderRow({cueId,label,fallbackText,th}){
  const rec=useMicRecorder();
  const [hasRec,setHasRec]=useState(false);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    let alive=true;
    cueHasRecording(cueId).then(v=>{ if(alive){setHasRec(v);setChecking(false);} });
    return ()=>{alive=false;};
  },[cueId]);

  function startRec(){ rec.start(); }
  async function stopRec(){ await rec.stop(cueId); setHasRec(true); }
  async function clearRec(){ await idbDelete(cueId); setHasRec(false); }
  function previewAI(){ speak(fallbackText,0.85); }
  async function previewRecorded(){ const blob=await idbGet(cueId); if(blob) playBlob(blob); }

  return (
    <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.10)",borderRadius:10,padding:"10px 12px",marginBottom:7}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={{fontSize:11,fontWeight:700,color:th.t1}}>{label}</div>
        {!checking && <span style={{fontSize:9,fontWeight:800,color:hasRec?"#00DD88":"#FFB300",background:hasRec?"rgba(0,210,100,0.12)":"rgba(255,160,0,0.12)",borderRadius:5,padding:"2px 7px"}}>{hasRec?"RECORDED":"AI VOICE"}</span>}
      </div>
      <div style={{fontSize:10,color:th.t3,marginBottom:8,fontStyle:"italic"}}>"{fallbackText}"</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {rec.state!=="recording" && <button onClick={startRec} style={{background:"rgba(255,60,60,0.14)",border:"1px solid rgba(255,60,60,0.28)",color:th.t1,borderRadius:7,padding:"5px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>🎙️ Record</button>}
        {rec.state==="recording" && <button onClick={stopRec} style={{background:"#ff4444",border:"none",color:"#fff",borderRadius:7,padding:"5px 10px",fontSize:10,fontWeight:800,cursor:"pointer"}}>⏹ Stop</button>}
        {hasRec && <button onClick={previewRecorded} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.16)",color:th.t2,borderRadius:7,padding:"5px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>▶ Play mine</button>}
        <button onClick={previewAI} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.16)",color:th.t2,borderRadius:7,padding:"5px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>🤖 Play AI</button>
        {hasRec && <button onClick={clearRec} style={{background:"transparent",border:"1px solid rgba(255,100,100,0.30)",color:"#ff8888",borderRadius:7,padding:"5px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>✕ Remove</button>}
      </div>
    </div>
  );
}

// Small reusable numeric stepper for admin config
function NumberField({label,value,onChange,min,max,step,suffix,th}){
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,color:th.t3,fontWeight:700,marginBottom:5}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>onChange(Math.max(min,value-(step||1)))} style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.18)",color:th.t1,fontWeight:900,fontSize:14,cursor:"pointer"}}>−</button>
        <div style={{minWidth:54,textAlign:"center",fontSize:14,fontWeight:900,color:th.t1}}>{value}{suffix||""}</div>
        <button onClick={()=>onChange(Math.min(max,value+(step||1)))} style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.18)",color:th.t1,fontWeight:900,fontSize:14,cursor:"pointer"}}>+</button>
      </div>
    </div>
  );
}

function ChoiceField({label,value,options,onChange,th}){
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,color:th.t3,fontWeight:700,marginBottom:5}}>{label}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {options.map(([v,lb])=>(
          <button key={v} onClick={()=>onChange(v)} style={{padding:"6px 12px",borderRadius:8,border:`2px solid ${value===v?"#FF8C00":"rgba(255,255,255,0.14)"}`,background:value===v?"rgba(255,140,0,0.16)":"rgba(255,255,255,0.05)",color:value===v?"#FF8C00":th.t2,fontWeight:700,fontSize:11,cursor:"pointer"}}>{lb}</button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMBINED SETUP — pick the headline configuration for all 4
// practices in one place, then run them back-to-back without
// stopping at each practice's own setup screen.
// ═══════════════════════════════════════════════════════════
function CombinedSetup({config,onBegin,onExit,th}){
  const [suryaRounds,setSuryaRounds]=useState(config.surya.rounds);
  const [kriyaDuration,setKriyaDuration]=useState(config.kriya.kriyaDurationMin);
  const [padmasanaMode,setPadmasanaMode]=useState(config.padmasana.audioMode);
  const [padmasanaSpeed,setPadmasanaSpeed]=useState(config.padmasana.playbackSpeed);
  const [sanyamDuration,setSanyamDuration]=useState(config.sanyam.samadhiDurationMin);
  const [sanyamBells,setSanyamBells]=useState(config.sanyam.bellCount);

  const suryaMin=Math.round(suryaRounds*24*config.surya.poseHoldSec/60);
  const kriyaMin=kriyaDuration+12; // + warm-up/pranayama/bhastrika/savasana overhead estimate
  const padmasanaMin=padmasanaMode==="youtube"?10:Math.round(config.padmasana.asanas.reduce((s,a)=>s+parseDurSec(a.dur),0)/60);
  const sanyamMin=sanyamDuration+Math.round((sanyamBells*config.sanyam.bellSpacingSec)/60)+5;
  const totalMin=suryaMin+kriyaMin+padmasanaMin+sanyamMin;

  function begin(){
    onBegin({
      surya:{rounds:suryaRounds},
      kriya:{kriyaDurationMin:kriyaDuration},
      padmasana:{audioMode:padmasanaMode,playbackSpeed:padmasanaSpeed},
      sanyam:{samadhiDurationMin:sanyamDuration,bellCount:sanyamBells},
    });
  }

  return (
    <div style={{paddingBottom:30}}>
      <SessionHeader title="Do All 4 Together" subtitle="One setup, then run straight through" onExit={onExit} th={th}/>

      <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"14px",marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:800,color:"#FF8C00",marginBottom:8}}>☀️ Surya Namaskar — rounds</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[1,2,3,4,6].map(n=>(
            <button key={n} onClick={()=>setSuryaRounds(n)} style={{width:38,height:38,borderRadius:10,border:`2px solid ${suryaRounds===n?"#FF8C00":"rgba(255,255,255,0.14)"}`,background:suryaRounds===n?"rgba(255,140,0,0.16)":"rgba(255,255,255,0.05)",color:suryaRounds===n?"#FF8C00":th.t2,fontWeight:800,fontSize:13,cursor:"pointer"}}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"14px",marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:800,color:"#D026C8",marginBottom:8}}>🌀 Sudarshan Kriya — duration</div>
        <div style={{display:"flex",gap:6}}>
          {[10,15,20,25].map(m=>(
            <button key={m} onClick={()=>setKriyaDuration(m)} style={{flex:1,padding:"8px",borderRadius:9,border:`2px solid ${kriyaDuration===m?"#D026C8":"rgba(255,255,255,0.14)"}`,background:kriyaDuration===m?"rgba(208,38,200,0.16)":"rgba(255,255,255,0.05)",color:kriyaDuration===m?"#D026C8":th.t2,fontWeight:800,fontSize:12,cursor:"pointer"}}>{m}m</button>
          ))}
        </div>
      </div>

      <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"14px",marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:800,color:"#FF4488",marginBottom:8}}>🪷 Padmasana Dhyan — guide</div>
        <div style={{display:"flex",gap:6,marginBottom:padmasanaMode==="youtube"?10:0}}>
          {[["youtube","📺"],["recorded","🎙️"],["ai","🤖"]].map(([m,ic])=>(
            <button key={m} onClick={()=>setPadmasanaMode(m)} style={{flex:1,padding:"8px",borderRadius:9,border:`2px solid ${padmasanaMode===m?"#FF4488":"rgba(255,255,255,0.14)"}`,background:padmasanaMode===m?"rgba(255,68,136,0.16)":"rgba(255,255,255,0.05)",color:padmasanaMode===m?"#FF4488":th.t2,fontWeight:800,fontSize:13,cursor:"pointer"}}>{ic}</button>
          ))}
        </div>
        {padmasanaMode==="youtube" && (
          <div style={{display:"flex",gap:6}}>
            {[1,1.5,1.75,2].map(s=>(
              <button key={s} onClick={()=>setPadmasanaSpeed(s)} style={{flex:1,padding:"6px",borderRadius:8,border:`2px solid ${padmasanaSpeed===s?"#FF4488":"rgba(255,255,255,0.14)"}`,background:padmasanaSpeed===s?"rgba(255,68,136,0.16)":"rgba(255,255,255,0.05)",color:padmasanaSpeed===s?"#FF4488":th.t2,fontWeight:700,fontSize:11,cursor:"pointer"}}>{s}×</button>
            ))}
          </div>
        )}
      </div>

      <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:14,padding:"14px",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:800,color:"#7744FF",marginBottom:8}}>🌙 Sanyam Dhyan — samadhi &amp; bells</div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {[10,15,20,25,30].map(m=>(
            <button key={m} onClick={()=>setSanyamDuration(m)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`2px solid ${sanyamDuration===m?"#7744FF":"rgba(255,255,255,0.14)"}`,background:sanyamDuration===m?"rgba(119,68,255,0.16)":"rgba(255,255,255,0.05)",color:sanyamDuration===m?"#7744FF":th.t2,fontWeight:700,fontSize:11,cursor:"pointer"}}>{m}m</button>
          ))}
        </div>
        <NumberField label="Bell count" value={sanyamBells} onChange={setSanyamBells} min={1} max={40} th={th}/>
      </div>

      <div style={{background:"rgba(255,255,255,0.06)",borderRadius:12,padding:"12px 14px",marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:10,color:th.t3,fontWeight:700,letterSpacing:1}}>ESTIMATED TOTAL TIME</div>
        <div style={{fontSize:24,fontWeight:900,color:"#fff",marginTop:4}}>≈{totalMin} min</div>
      </div>

      <button onClick={begin} style={{width:"100%",background:"linear-gradient(135deg,#FF8C00,#D026C8,#7744FF)",border:"none",borderRadius:13,padding:"16px",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer"}}>🙏 Begin All 4 Practices</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN PANEL — every configurable parameter across all 4
// practices, plus per-cue voice recording. Changes save to
// localStorage immediately and take effect on the next session.
// ═══════════════════════════════════════════════════════════
function AdminPanel({onClose,th}){
  const [cfg,setCfg]=useState(loadPracticeConfig());
  const [section,setSection]=useState("general");
  const [testMode,setTestMode]=useState(loadTestMode());
  const [voiceRate,setVoiceRate]=useState(loadVoiceRate());

  function toggleTestMode(){
    const v=!testMode; setTestMode(v); saveTestMode(v);
  }
  function setVoicePreset(rate){ setVoiceRate(rate); saveVoiceRate(rate); }
  function previewVoice(){
    // Plays a representative recorded cue if one exists, else explains
    (async()=>{
      const candidates=["surya_mantra_0","kriya_om_0","padmasana_asana_0","sanyam_closing_mantra"];
      for(const id of candidates){
        const blob=await idbGet(id);
        if(blob){ playBlob(blob, voiceRate); return; }
      }
      speak("Record any cue first to preview your voice character.",0.85);
    })();
  }

  function upd(practice,field,value){
    const ns={...cfg,[practice]:{...cfg[practice],[field]:value}};
    setCfg(ns); savePracticeConfig(ns);
  }
  function updNested(practice,group,field,value){
    const ns={...cfg,[practice]:{...cfg[practice],[group]:{...cfg[practice][group],[field]:value}}};
    setCfg(ns); savePracticeConfig(ns);
  }
  function resetAll(){
    if(!window.confirm("Reset every practice setting to defaults?"))return;
    const fresh=JSON.parse(JSON.stringify(DEFAULT_PRACTICE_CONFIG));
    setCfg(fresh); savePracticeConfig(fresh);
  }

  const sections=[
    {id:"general",label:"⚙️ General"},
    {id:"surya",label:"☀️ Surya Namaskar"},
    {id:"kriya",label:"🌀 Sudarshan Kriya"},
    {id:"padmasana",label:"🪷 Padmasana"},
    {id:"sanyam",label:"🌙 Sanyam Dhyan"},
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"#0a0015",zIndex:2000,overflowY:"auto"}}>
      <div style={{padding:"16px 16px 60px",maxWidth:480,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:"#fff"}}>⚙️ Practice Settings</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>Admin — changes apply to your next session</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.20)",color:"#fff",borderRadius:9,padding:"7px 13px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✕ Close</button>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {sections.map(s=>(
            <button key={s.id} onClick={()=>setSection(s.id)} style={{padding:"8px 12px",borderRadius:10,border:`1px solid ${section===s.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.12)"}`,background:section===s.id?"rgba(255,255,255,0.16)":"rgba(255,255,255,0.04)",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer"}}>{s.label}</button>
          ))}
        </div>

        {section==="general" && (
          <div>
            <div style={{background:"rgba(255,200,0,0.07)",border:"1px solid rgba(255,200,0,0.22)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:"#FFD700"}}>🧪 Test Mode</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:3,maxWidth:240}}>Adds a Skip button to every timer so you can run through a full practice instantly while testing.</div>
                </div>
                <button onClick={toggleTestMode} style={{width:50,height:28,borderRadius:14,border:"none",background:testMode?"#FFD700":"rgba(255,255,255,0.15)",position:"relative",cursor:"pointer",flexShrink:0}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:testMode?25:3,transition:"left 0.2s"}}/>
                </button>
              </div>
            </div>

            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:800,color:"#fff",marginBottom:4}}>🎙️ Your Voice Character</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginBottom:12,lineHeight:1.6}}>Applies to every recorded cue across all 4 practices — record once, then shape how it sounds. AI voice is unaffected.</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {VOICE_PRESETS.map(v=>(
                  <button key={v.id} onClick={()=>setVoicePreset(v.rate)} style={{flex:1,minWidth:70,padding:"9px 6px",borderRadius:10,border:`2px solid ${Math.abs(voiceRate-v.rate)<0.01?"#FF8C00":"rgba(255,255,255,0.14)"}`,background:Math.abs(voiceRate-v.rate)<0.01?"rgba(255,140,0,0.16)":"rgba(255,255,255,0.05)",color:Math.abs(voiceRate-v.rate)<0.01?"#FF8C00":"rgba(255,255,255,0.7)",fontWeight:700,fontSize:11,cursor:"pointer"}}>{v.label}</button>
                ))}
              </div>
              <input type="range" min="0.7" max="1.5" step="0.02" value={voiceRate} onChange={e=>setVoicePreset(parseFloat(e.target.value))} style={{width:"100%"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:2}}>
                <span>Deeper</span><span>{voiceRate.toFixed(2)}×</span><span>Higher</span>
              </div>
              <button onClick={previewVoice} style={{width:"100%",marginTop:10,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.16)",color:"#fff",borderRadius:9,padding:"8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>▶ Preview</button>
            </div>

            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.10)",borderRadius:14,padding:"14px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>True voice cloning (so the AI narration itself sounds like you) needs a paid third-party voice model — not something this on-device app can do alone. Recording real cues and shaping them here is the closest practical equivalent.</div>
            </div>
          </div>
        )}

        {section==="surya" && (
          <div>
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <NumberField label="Default rounds" value={cfg.surya.rounds} onChange={v=>upd("surya","rounds",v)} min={1} max={24} th={th}/>
              <NumberField label="Seconds per pose" value={cfg.surya.poseHoldSec} onChange={v=>upd("surya","poseHoldSec",v)} min={2} max={15} suffix="s" th={th}/>
              <ChoiceField label="Mantra audio" value={cfg.surya.audioMode} options={[["ai","🤖 AI Voice"],["recorded","🎙️ My Voice"]]} onChange={v=>upd("surya","audioMode",v)} th={th}/>
            </div>
            <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:8}}>12 NAMES OF SURYA — TAP TO RECORD</div>
            {SURYA_MANTRAS.map((m,i)=>(
              <CueRecorderRow key={i} cueId={`surya_mantra_${i}`} label={`Round ${i+1}, ${i+13}, ${i+25}... — ${m.name}`} fallbackText={`Om ${m.name} Namaha`} th={th}/>
            ))}
          </div>
        )}

        {section==="kriya" && (
          <div>
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:10}}>3-STAGE PRANAYAMA</div>
              <NumberField label="Stage 1 rounds" value={cfg.kriya.stage1Rounds} onChange={v=>upd("kriya","stage1Rounds",v)} min={1} max={20} th={th}/>
              <NumberField label="Stage 2 rounds" value={cfg.kriya.stage2Rounds} onChange={v=>upd("kriya","stage2Rounds",v)} min={1} max={20} th={th}/>
              <NumberField label="Stage 3 rounds" value={cfg.kriya.stage3Rounds} onChange={v=>upd("kriya","stage3Rounds",v)} min={1} max={20} th={th}/>
              <NumberField label="Inhale" value={cfg.kriya.pattern.inhale} onChange={v=>updNested("kriya","pattern","inhale",v)} min={1} max={12} suffix="s" th={th}/>
              <NumberField label="Hold (after inhale)" value={cfg.kriya.pattern.hold1} onChange={v=>updNested("kriya","pattern","hold1",v)} min={0} max={12} suffix="s" th={th}/>
              <NumberField label="Exhale" value={cfg.kriya.pattern.exhale} onChange={v=>updNested("kriya","pattern","exhale",v)} min={1} max={16} suffix="s" th={th}/>
              <NumberField label="Hold (after exhale)" value={cfg.kriya.pattern.hold2} onChange={v=>updNested("kriya","pattern","hold2",v)} min={0} max={12} suffix="s" th={th}/>
              <NumberField label="Rest breaths between stages" value={cfg.kriya.restBreathsBetweenStages} onChange={v=>upd("kriya","restBreathsBetweenStages",v)} min={0} max={15} th={th}/>
            </div>
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:10}}>BHASTRIKA</div>
              <NumberField label="Rounds" value={cfg.kriya.bhastrikaRounds} onChange={v=>upd("kriya","bhastrikaRounds",v)} min={1} max={6} th={th}/>
              <NumberField label="Breaths per round" value={cfg.kriya.bhastrikaCount} onChange={v=>upd("kriya","bhastrikaCount",v)} min={5} max={40} th={th}/>
              <NumberField label="Rest breaths between" value={cfg.kriya.bhastrikaRestBreaths} onChange={v=>upd("kriya","bhastrikaRestBreaths",v)} min={0} max={20} th={th}/>
            </div>
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:10}}>LOCK, SIT &amp; OM</div>
              <NumberField label="Break after lock-hold" value={cfg.kriya.lockHoldBreakMin} onChange={v=>upd("kriya","lockHoldBreakMin",v)} min={1} max={3} suffix=" min" th={th}/>
              <ChoiceField label="Sitting position" value={cfg.kriya.sitPosition} options={SIT_POSITIONS.map(s=>[s.id,s.label])} onChange={v=>upd("kriya","sitPosition",v)} th={th}/>
              <NumberField label="Om chants" value={cfg.kriya.omChants} onChange={v=>upd("kriya","omChants",v)} min={1} max={9} th={th}/>
              <ChoiceField label="Om audio" value={cfg.kriya.omAudioMode} options={[["ai","🤖 AI"],["recorded","🎙️ Mine"]]} onChange={v=>upd("kriya","omAudioMode",v)} th={th}/>
            </div>
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:10}}>MAIN KRIYA (20 / 40 / 40)</div>
              <ChoiceField label="Default duration" value={cfg.kriya.kriyaDurationMin} options={[[10,"10 min"],[15,"15 min"],[20,"20 min"],[25,"25 min"]]} onChange={v=>upd("kriya","kriyaDurationMin",v)} th={th}/>
              <ChoiceField label="During Kriya" value={cfg.kriya.duringKriyaAudio} options={[["silence","🔇 Silence"],["music","🎵 Music"]]} onChange={v=>upd("kriya","duringKriyaAudio",v)} th={th}/>
            </div>
            <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:8}}>OM CHANT RECORDINGS</div>
            {Array.from({length:cfg.kriya.omChants}).map((_,i)=>(
              <CueRecorderRow key={i} cueId={`kriya_om_${i}`} label={`Om chant ${i+1}`} fallbackText="Om" th={th}/>
            ))}
          </div>
        )}

        {section==="padmasana" && (
          <div>
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <NumberField label="Default rounds" value={cfg.padmasana.rounds} onChange={v=>upd("padmasana","rounds",v)} min={1} max={5} th={th}/>
              <ChoiceField label="Default guide source" value={cfg.padmasana.audioMode} options={[["youtube","📺 YouTube"],["recorded","🎙️ Mine"],["ai","🤖 AI"]]} onChange={v=>upd("padmasana","audioMode",v)} th={th}/>
              <ChoiceField label="Default speed" value={cfg.padmasana.playbackSpeed} options={[[1,"1×"],[1.5,"1.5×"],[1.75,"1.75×"],[2,"2×"]]} onChange={v=>upd("padmasana","playbackSpeed",v)} th={th}/>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:6,wordBreak:"break-all"}}>Video: {cfg.padmasana.videoUrl}</div>
            </div>
            <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:8}}>ASANA NARRATION — TAP TO RECORD</div>
            {(cfg.padmasana.asanas||[]).map((a,i)=>(
              <CueRecorderRow key={i} cueId={`padmasana_asana_${i}`} label={`${i+1}. ${a.n}`} fallbackText={`${a.n}. ${a.c}`} th={th}/>
            ))}
          </div>
        )}

        {section==="sanyam" && (
          <div>
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:10}}>BHOGAR PRANAYAM</div>
              <NumberField label="Rounds" value={cfg.sanyam.bhogarRounds} onChange={v=>upd("sanyam","bhogarRounds",v)} min={1} max={20} th={th}/>
              <NumberField label="Inhale" value={cfg.sanyam.bhogarPattern.inhale} onChange={v=>updNested("sanyam","bhogarPattern","inhale",v)} min={1} max={10} suffix="s" th={th}/>
              <NumberField label="Hold (after inhale)" value={cfg.sanyam.bhogarPattern.hold1} onChange={v=>updNested("sanyam","bhogarPattern","hold1",v)} min={0} max={10} suffix="s" th={th}/>
              <NumberField label="Exhale" value={cfg.sanyam.bhogarPattern.exhale} onChange={v=>updNested("sanyam","bhogarPattern","exhale",v)} min={1} max={10} suffix="s" th={th}/>
              <NumberField label="Hold (after exhale)" value={cfg.sanyam.bhogarPattern.hold2} onChange={v=>updNested("sanyam","bhogarPattern","hold2",v)} min={0} max={10} suffix="s" th={th}/>
            </div>
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:10}}>SAHAJ SAMADHI &amp; BELLS</div>
              <ChoiceField label="Samadhi duration" value={cfg.sanyam.samadhiDurationMin} options={[[10,"10m"],[15,"15m"],[20,"20m"],[25,"25m"],[30,"30m"]]} onChange={v=>upd("sanyam","samadhiDurationMin",v)} th={th}/>
              <NumberField label="Bell count" value={cfg.sanyam.bellCount} onChange={v=>upd("sanyam","bellCount",v)} min={1} max={40} th={th}/>
              <NumberField label="Bell spacing" value={cfg.sanyam.bellSpacingSec} onChange={v=>upd("sanyam","bellSpacingSec",v)} min={15} max={120} step={15} suffix="s" th={th}/>
              <ChoiceField label="Closing mantra audio" value={cfg.sanyam.lieDownMantraAudioMode} options={[["ai","🤖 AI"],["recorded","🎙️ Mine"]]} onChange={v=>upd("sanyam","lieDownMantraAudioMode",v)} th={th}/>
            </div>
            <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:8}}>CLOSING MANTRA RECORDING</div>
            <CueRecorderRow cueId="sanyam_closing_mantra" label="Closing mantra (lying down)" fallbackText="Om Shanti, Om Shanti, Om Shanti" th={th}/>
          </div>
        )}

        <button onClick={resetAll} style={{width:"100%",marginTop:20,background:"rgba(255,60,60,0.10)",border:"1px solid rgba(255,60,60,0.25)",color:"#ff8888",borderRadius:11,padding:"11px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Reset all practice settings to defaults</button>
      </div>
    </div>
  );
}
const AE={E1:{name:"Brisk Walk",dur:"10 min",emoji:"🚶",steps:["Tall posture core braced","Lift knees hip height","Pump arms opposite legs","Inhale 2 exhale 2","Build pace over 2 min"],tip:"Engine warm-up. Never skip."},E2:{name:"Dead Bug",dur:"3×10",emoji:"🐛",steps:["Back down arms ceiling","Knees 90°","Lower right arm + left leg","Back flat never arch","Return switch sides"],tip:"Deepest ab layer. Slow = effective."},E3:{name:"Plank Hold",dur:"3×20 sec",emoji:"🪨",steps:["Elbows under shoulders","Straight line head to heels","Tuck pelvis","Breathe steadily","Squeeze glutes + core"],tip:"20 perfect seconds > 60 sloppy ones."},E4:{name:"Reverse Crunch",dur:"3×12",emoji:"🔄",steps:["Back down hands beside hips","Knees bent feet off floor","EXHALE curl hips UP","Hips lift not legs","3-count lower"],tip:"Lower abs specifically."},E5:{name:"Bicycle Crunch",dur:"2×15/side",emoji:"🚴",steps:["Back down hands behind head","Shoulders lifted","Right elbow to left knee","Extend right leg","SLOW rotation"],tip:"Slow = 3× more effective."},E6:{name:"Cat-Cow",dur:"1 min",emoji:"🐱",steps:["All fours","INHALE belly down head up","EXHALE arch back chin tuck","Flow smoothly","Feel each vertebra"],tip:"Spinal reset."},E7:{name:"Tai Chi Walk",dur:"5 min",emoji:"🥋",steps:["Feet shoulder-width soft knees","Full weight on left","Lift right heel first","Roll heel to toe","EXHALE as weight shifts"],tip:"Micro-meditation."},E8:{name:"High Knees",dur:"3×30 sec",emoji:"🦵",steps:["Hands at hip height","Right knee to palm","Left knee to palm","Deliberate pace","Torso upright"],tip:"Driving knee fires core."},E9:{name:"Side Steps",dur:"3×30 sec/side",emoji:"↔️",steps:["Slight squat","Step right foot wide","Left joins arm swing","Reverse after 30 sec","Lower = more obliques"],tip:"Obliques without crunch."},E10:{name:"Cross-Body Crunch",dur:"3×15/side",emoji:"✖️",steps:["Hip-width hands behind head","Right knee up left elbow down","Feel oblique compress","1 second pause","Switch sides"],tip:"1-second pause is everything."},E11:{name:"Step-Out Jacks",dur:"3×30 sec",emoji:"⭐",steps:["Feet together arms at sides","Step right arms rise","Step back arms lower","Alternate","Breathe steadily"],tip:"Zero joint stress."},E12:{name:"Breathing Walk",dur:"5 min",emoji:"🌬️",steps:["Slow deliberate pace","Inhale 4 steps","Hold 2 steps","Exhale 6 steps","Shoulders drop on exhale"],tip:"Lowers cortisol."},E13:{name:"Mountain Climbers",dur:"4×30/15",emoji:"🧗",steps:["High plank","Drive right knee to chest","Drive left knee","Rapid alternate","Hips level"],tip:"Slow=core fast=cardio."},E14:{name:"Plank→Push-up",dur:"3×10",emoji:"⬆️",steps:["Elbow plank","Right hand up left hand up","Right elbow down left elbow","Alternate lead hand","Hips still"],tip:"Core + chest + stability."},E15:{name:"Russian Twists",dur:"3×20",emoji:"🔀",steps:["Lean back 45°","Hands clasped","Rotate right floor tap","Rotate left","Feet lifted = advanced"],tip:"Rotation from torso only."},E16:{name:"Flutter Kicks",dur:"3×30 sec",emoji:"🏊",steps:["Back down hands under glutes","Legs straight heels 6in up","Small rapid kicks","Lower back pressed","Hold till set ends"],tip:"Lower abs direct."},E17:{name:"Burpee",dur:"3×8",emoji:"💥",steps:["Stand tall","Squat hands to floor","Jump to plank","Push-up optional","Jump up explode"],tip:"Burns 50% more cal."},E18:{name:"Squat Overhead",dur:"3×15",emoji:"🏋️",steps:["Feet shoulder-width toes out","Squat weight through heels","Reach arms overhead","Drive to stand","Arms down as descend"],tip:"7 muscle groups."},E19:{name:"Lunge+Twist",dur:"3×12/side",emoji:"🔃",steps:["Right foot forward lunge","Back knee near floor","Rotate torso right","Arms chest height","Push back through front heel"],tip:"Twist toward front leg."},E20:{name:"Push-ups",dur:"3×12",emoji:"💪",steps:["Hands shoulder-width","Lower chest 1in floor","Elbows 45°","Push up","Knee push-ups valid"],tip:"45° elbow protects shoulder."},E21:{name:"High Knees Sprint",dur:"4×30/15",emoji:"🏃",steps:["Maximum effort","Knees above hip","Pump arms hard","Balls of feet","Hard exhale every stride"],tip:"30 sec all-out > 5 min jog."},E22:{name:"Glute Bridge",dur:"3×20",emoji:"🌉",steps:["Back down knees bent","Press feet hips up","Squeeze glutes 1 sec","3-count lower","No hyperextension"],tip:"Largest muscle = fat burn."},E23:{name:"Side Plank",dur:"2×25/side",emoji:"📐",steps:["Side-lying elbow under shoulder","Stack feet","Lift hips diagonal","Free hand up","Hold. Don't drop."],tip:"Obliques + hip abductors."},E24:{name:"Walk/Jog",dur:"20 min",emoji:"🏃",steps:["Walk 3 min warm-up","Brisk walk","Light jog min 10","2 min walk/2 jog","3 min cool-down"],tip:"60-70% max HR = fat zone."},E25:{name:"Hip Circles",dur:"2×10/side",emoji:"⭕",steps:["Hip-width hands on hips","Large circles clockwise","Feel hip flexors","10 then switch","Counter-clockwise 10"],tip:"Undoes sitting damage."},E26:{name:"Cobra Stretch",dur:"2 min",emoji:"🐍",steps:["Face down hands under shoulders","INHALE push chest up","Hips to floor","Hold 15-30 sec","Repeat 3-4×"],tip:"Counteracts screen posture."},E27:{name:"Child's Pose",dur:"45 sec",emoji:"🙇",steps:["Kneel sit back to heels","Arms forward forehead down","Deep breath back ribs expand","Hold as long as good","Walk hands side to side"],tip:"Rest pose. Take anytime."},};
const TE={T1:{name:"Hype Warm-Up",dur:"5 min",emoji:"🔥",steps:["Play pump-up song 🎵","Jump on spot × 20","High knees × 30 sec","Arm circles","Neck rolls"],tip:"Music + movement = 3× effort."},T2:{name:"HIIT Circuit",dur:"20 min",emoji:"⚡",steps:["Burpees × 8","Rest 20s","Mountain climbers × 30s","Rest 20s","Jump squats × 12","Rest 20s","Push-ups × 10","Rest 60s × 3"],tip:"20 min HIIT = 45 min cardio."},T3:{name:"Core Challenge",dur:"3 rounds",emoji:"🎯",steps:["Plank 30s","Bicycle crunches 20","Leg raises 15","Russian twists 20","Flutter kicks 30s","Rest 45s"],tip:"Consistency builds the 6-pack."},T4:{name:"Push/Pull",dur:"3 rounds",emoji:"💪",steps:["Push-ups × 12","Squat overhead × 15","Lunges × 12/side","Glute bridge × 20","Rest 60s"],tip:"Compound moves burn all day."},T5:{name:"Cardio Blast",dur:"15 min",emoji:"🏃",steps:["Shadow box 2 min","High knees 30s × 4","Side shuffle 30s/side","Jumping jacks 1 min","Rest 30s × 2"],tip:"Mix it up."},T6:{name:"Flexibility",dur:"10 min",emoji:"🧘",steps:["Hip circles × 10/side","Quad stretch × 30s","Figure-4 glute stretch","Cobra × 3","Child's pose 1 min"],tip:"Flexible = fewer injuries."},T7:{name:"Rest & Recover",dur:"Active rest",emoji:"😎",steps:["Slow walk 20 min","Gentle stretch 10 min","Lots of water 💧","Sleep 8+ hours"],tip:"Recovery = getting stronger."},};
const AH=[{id:"water",icon:"💧",title:"Morning Water 3L",time:"Before 6 AM"},{id:"yoga6",icon:"🧘",title:"Yoga Before 6 AM",time:"Before 6 AM"},{id:"meal",icon:"🍽️",title:"One Meal at Noon",time:"11:30 AM – 1 PM"},{id:"fast",icon:"🚫",title:"No Food After 6 PM",time:"After 6 PM"}];
const TH=[{id:"water",icon:"💧",title:"Drink 8 Glasses",time:"All day"},{id:"move",icon:"🏃",title:"Move 30 Min",time:"Anytime"},{id:"noscreen",icon:"📵",title:"Screens Off 10 PM",time:"10 PM"},{id:"sleep",icon:"😴",title:"8 Hours Sleep",time:"10 PM – 6 AM"}];

const SK="karma33_v1";
const load=()=>{try{return JSON.parse(localStorage.getItem(SK))||{};}catch{return{};}};
const save=s=>{try{localStorage.setItem(SK,JSON.stringify(s));}catch{}};
const todayKey=()=>new Date().toISOString().split("T")[0];

// ── COMM DATA ────────────────────────────────────────────
const AC={
  T1:{topic:"First Impressions",tech:"FORD Method",techDesc:"Family, Occupation, Recreation, Dreams — rapport in 90 sec.",prompt:"A moment someone's first impression of you was completely wrong — and the truth.",hint:"Choose ONE FORD anchor. 'Where are you originally from?' — Recreation. Notice how it opens people."},
  T2:{topic:"Sensory Storytelling",tech:"Sensory Language",techDesc:"Replace emotion words with sensory details. 'I was nervous' → 'My palms felt like cold clay.'",prompt:"Most vivid childhood memory — only sensory details. Zero emotion labels.",hint:"Every emotion word: pause — what did it FEEL, SMELL, SOUND like?"},
  T3:{topic:"Your Superpower",tech:"Rule of Three",techDesc:"Any point with exactly 3 examples feels complete. Lincoln used it. Jobs used it.",prompt:"One skill people around you don't notice or credit you for.",hint:"State skill. Give 3 specific moments that prove it — not qualities, moments."},
  T4:{topic:"Story Spine",tech:"Five-Beat Structure",techDesc:"Once upon a time / Every day / Until one day / Because of that / Until finally.",prompt:"A real life event told using all 5 story-spine beats.",hint:"Write all 5 beats first, one sentence each. 'Because of that' is the chain of consequence."},
  T5:{topic:"Disagree Gracefully",tech:"Yes-And",techDesc:"Agree on emotion first. 'But' erases everything before it — replace with 'and at the same time...'",prompt:"A time you strongly disagreed with someone important.",hint:"'I understand why you see it that way. And at the same time, here's what I notice...'"},
  T6:{topic:"Explain Like I'm 5",tech:"Analogy Bridge",techDesc:"Find what they know and bridge it. 'It's like X except instead of A it does B.'",prompt:"Your most complex professional skill explained to a 5-year-old.",hint:"Identify ONE familiar thing your concept is most like. Build entirely from that."},
  T7:{topic:"Art of Compliments",tech:"Specific Over Generic",techDesc:"'Your pause before answering makes me feel truly heard' beats 'You're a good listener.'",prompt:"Three genuine specific compliments to three imaginary people.",hint:"[What you observed] + [the effect it has]. Specific + effect = memorable."},
  T8:{topic:"Vulnerability Strength",tech:"Vulnerability Arc",techDesc:"Struggle → Low Point → Insight → Growth. Stay at low point longer than comfortable.",prompt:"Your worst professional moment and what it genuinely taught you.",hint:"Most people rush to insight. Slow down at the low point — stay there 30 seconds longer."},
  T9:{topic:"Indirect Persuasion",tech:"Plant and Guide",techDesc:"Ask questions that lead to your conclusion. Never push.",prompt:"Convince someone to try a food they hate — without naming it directly.",hint:"Only questions and descriptions. 'What if the texture was completely different?'"},
  T10:{topic:"Listening Superpower",tech:"Mirror and Label",techDesc:"Mirror: repeat last 3 words as question. Label: 'It seems like you feel...' FBI negotiation tools.",prompt:"A conversation where you truly listened. What did you notice that others missed?",hint:"Every minute: once mirror, once label. Track how the other person opens up."},
  T11:{topic:"Beyond How Are You",tech:"Curiosity Questions",techDesc:"'What's the most interesting thing this week?' opens doors. 'How are you?' closes them.",prompt:"5 conversation openers that aren't 'How are you?' or 'What do you do?'",hint:"[Specific context] + [open-ended ask]. 'What surprised you at work this week?'"},
  T12:{topic:"30-Second Pitch",tech:"PAS Formula",techDesc:"Problem → Agitate → Solution. 3 sentences not 30.",prompt:"30 seconds with your ideal mentor. Never get this chance again. Go.",hint:"Strictly 30 seconds. Problem in one sentence. Agitate in one. Solution in one."},
  T13:{topic:"Comedy Timing",tech:"The Pause",techDesc:"Pause BEFORE the punchline. Silence is where the laugh lives.",prompt:"A story that made you laugh until you couldn't breathe.",hint:"Pause 3 full seconds before the punchline. Awkward = the technique working."},
  T14:{topic:"Midpoint Reflection",tech:"Retrieval Practice",techDesc:"Recalling strengthens 3× more than re-reading.",prompt:"Most important communication insight from the first 14 days — teach it back.",hint:"Speak as if teaching a beginner using your own examples."},
  T15:{topic:"Only Questions",tech:"Socratic Method",techDesc:"Questions carry more power than statements.",prompt:"5-minute conversation using ONLY questions. Zero statements allowed.",hint:"'You should consider X' → 'What would happen if you considered X?'"},
  T16:{topic:"Body Language",tech:"Congruence",techDesc:"Words 7%. Voice 38%. Body 55%. All three must say the same thing.",prompt:"What is your body language saying right now — without moving?",hint:"'My shoulders are forward — reads as guarded.' Awareness is the first step."},
  T17:{topic:"Handle Criticism",tech:"OOPS Method",techDesc:"Observe → Own valid part → Pivot → Share perspective.",prompt:"Someone criticized your best work publicly. Respond out loud. Now.",hint:"Find the one valid thing — own it genuinely first. Then pivot."},
  T18:{topic:"Cross-Cultural Voice",tech:"Code Switching",techDesc:"Adapting communication is expanding yourself, not losing yourself.",prompt:"A conversation where you had to completely adapt your style.",hint:"Identify 3 specific things that changed: vocabulary, directness, pace."},
  T19:{topic:"Negotiation Language",tech:"Anchoring",techDesc:"State the high number first. All negotiation orbits the first number.",prompt:"You deserve a promotion. Have the full conversation out loud. No prep.",hint:"State your anchor in first 30 seconds. Then be silent."},
  T20:{topic:"Power of Silence",tech:"Strategic Silence",techDesc:"The person who speaks first after awkward silence usually concedes.",prompt:"Sit in complete silence 60 seconds. Describe every thought that arose.",hint:"After your most important point, wait 5 full seconds. Don't fill the space."},
  T21:{topic:"Precision Empathy",tech:"Name the Feeling",techDesc:"'That sounds incredibly frustrating' beats 'I know how you feel.'",prompt:"Close friend just lost their job. Practice 3 different empathic responses.",hint:"Not 'sad' but 'deflated' or 'blindsided'. Precision signals true understanding."},
  T22:{topic:"Passionate Rant",tech:"Enthusiasm Transfer",techDesc:"You cannot bore when you are genuinely lit from within.",prompt:"Pick anything you love. Talk for 3 uninterrupted minutes. Be unreasonably excited.",hint:"Stand up. Use hands. Eye contact. Speed up exciting parts. Slow on important."},
  T23:{topic:"Meeting Mastery",tech:"Parking Lot",techDesc:"'Great point — let's park that.' Controls meetings without shutting people down.",prompt:"Your meeting went wildly off-track. Redirect without offending anyone.",hint:"Acknowledge + name current agenda + offer specific time for their point."},
  T24:{topic:"TED Talk Opening",tech:"The Logline",techDesc:"One sentence: who you are and why it matters to the room.",prompt:"Introduce yourself as if opening a TED Talk. 60 seconds. Unforgettable first line.",hint:"Start with a question or provocative statement, not your name."},
  T25:{topic:"Mediation Skills",tech:"Common Ground First",techDesc:"Find what both parties agree on before solving anything.",prompt:"Two colleagues in a heated argument. You mediate. First thing you say?",hint:"Ask: 'What outcome do both of you actually want?' Start from shared goal."},
  T26:{topic:"Feedback That Lands",tech:"SBI Model",techDesc:"Situation → Behavior → Impact. No character labels.",prompt:"Give feedback to someone who keeps missing deadlines. Use SBI out loud.",hint:"Situation: specific context. Behavior: what they DID. Impact: effect not judgment."},
  T27:{topic:"Closing Call to Action",tech:"Bookend Structure",techDesc:"Mirror your opening in your close. Show the arc.",prompt:"2-minute talk. End with exactly ONE specific thing you want them to do.",hint:"Your close should contain your opening image transformed."},
  T28:{topic:"Your Transformation",tech:"Hero's Return",techDesc:"The hero returns changed and brings gifts back. Day 28 is your return.",prompt:"Who were you as a communicator 28 days ago? Who are you today? Claim it.",hint:"Don't be modest. Name specific skills, moments of change, situations handled differently."},
};
const TC={
  T1:{topic:"Introduce Yourself",prompt:"Say your name, one thing you love, and one funny fact. Mirror!",tip:"Eye contact shows confidence! 💪"},
  T2:{topic:"Tell a Story",prompt:"Funniest thing that happened this week — use your HANDS!",tip:"Stories with feelings are the BEST! 🎭"},
  T3:{topic:"Ask Great Questions",prompt:"3 questions you could ask someone new that make them smile.",tip:"People LOVE being asked about their favourites! ❤️"},
  T4:{topic:"Compliment Someone",prompt:"Give something specific and genuine to 3 different people.",tip:"Specific beats 'you're nice'! ✨"},
  T5:{topic:"Explain Something",prompt:"Teach your favourite game to an imaginary new friend.",tip:"If they understand, YOU explained perfectly! 🌟"},
  T6:{topic:"Share Your Feelings",prompt:"Practice 'I feel ___ when ___' using 5 different emotions.",tip:"Brave people share feelings! 💜"},
  T7:{topic:"Disagree Kindly",prompt:"Practice 'I see it differently because...' without getting upset.",tip:"Disagree AND still be kind. Superpower! 🦸"},
  T8:{topic:"Cheer Someone Up",prompt:"What would you say to a sad friend? Practice 3 ways.",tip:"Your words can make someone's day! ☀️"},
  T9:{topic:"Ask for Help",prompt:"Practice asking for help in 3 situations without embarrassment.",tip:"Asking is SMART, not weak! 🧠"},
  T10:{topic:"Listen Really Well",prompt:"Echo game — repeat back what someone says to show you heard them.",tip:"Best friends are best LISTENERS! 👂"},
  T11:{topic:"Make Someone Laugh",prompt:"Practice 2 funny but KIND jokes or silly stories.",tip:"Laughter connects people! 😂"},
  T12:{topic:"Say Thank You",prompt:"Write 3 detailed thank-you messages to people who helped you.",tip:"Specific thank-yous feel 10× more meaningful! 🙏"},
  T13:{topic:"Express Excitement",prompt:"Talk about your FAVOURITE thing for 2 whole minutes!",tip:"When you're excited, others get excited too! 🎉"},
  T14:{topic:"Halfway Superpower",prompt:"Biggest communication lesson from the first 14 days?",tip:"You've already improved SO much! 🎊"},
  T15:{topic:"Include Others",prompt:"How do you invite someone left out to join? Practice 3 ways.",tip:"Including people is one of the kindest things! 💛"},
  T16:{topic:"Stand Up for Yourself",prompt:"Practice 'I don't like when...' and 'I prefer...' calmly.",tip:"You deserve to be treated well — say so! 🦁"},
  T17:{topic:"Apologise Properly",prompt:"Practice a real apology: what you did, why wrong, what next.",tip:"Real apologies make friendships STRONGER! 💪"},
  T18:{topic:"Talk to Adults",prompt:"Practice a polite conversation with a teacher or parent.",tip:"Adults love respectful teens! 🌟"},
  T19:{topic:"Negotiate",prompt:"You want TV, sibling wants to play. Find solution TOGETHER in 2 min!",tip:"Middle ground = genius skill! 🧠"},
  T20:{topic:"Tell Someone You Care",prompt:"'I'm really glad you're my friend because...' to 3 people.",tip:"Never assume they know! ❤️"},
  T21:{topic:"Be Brave and Share",prompt:"Share a worry with a trusted adult. Then share something you're proud of!",tip:"Sharing makes worries smaller! 🌈"},
  T22:{topic:"Body Language",prompt:"Make 5 faces — ask a grown-up to guess the feeling. Then switch!",tip:"Your face talks even when you don't! 👀"},
  T23:{topic:"Cheer at Sports",prompt:"Practice cheering (even when losing) with kind words.",tip:"Good sportsmanship = champion! 🏆"},
  T24:{topic:"My Favourite Thing",prompt:"1-minute speech about your favourite thing. Be DRAMATIC!",tip:"Love makes speaking easy! 🌟"},
  T25:{topic:"Problem Solving",prompt:"Practice 'What if we tried...' for 3 imaginary problems.",tip:"Problem-solvers are valued! 💡"},
  T26:{topic:"Encourage Someone",prompt:"Say the most encouraging thing you can to someone struggling.",tip:"Your words change someone's day! ☀️"},
  T27:{topic:"Tell Your Hero Story",prompt:"Tell a time you did something brave or kind. You're the HERO!",tip:"You ARE a hero — own your story! 🦸"},
  T28:{topic:"I Have Grown!",prompt:"Compare yourself 28 days ago to today. What's different?",tip:"28 days of showing up. INCREDIBLE! 🎉"},
};

// ── ALL COMPONENTS — top-level function declarations only ─

function StepHeader({icon,title,sub}){
  return (
    <div>
      <div style={{fontSize:46,textAlign:"center",marginBottom:8}}>{icon}</div>
      <div style={{fontSize:19,fontWeight:900,textAlign:"center",marginBottom:4,color:"#fff"}}>{title}</div>
      <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",textAlign:"center",marginBottom:18,lineHeight:1.5}}>{sub}</div>
    </div>
  );
}

function SetupWizard({onDone}){
  const [step,setStep]=useState(0);
  const [wakeH,setWakeH]=useState("03");
  const [wakeM,setWakeM]=useState("30");
  const [yogaDur,setYogaDur]=useState("60");
  const [name,setName]=useState("");
  function finish(){
    const m=6*60-parseInt(yogaDur)-5;
    const sh=Math.floor(m/60),sm=m%60;
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
    onDone({name:name.trim()||"Friend",wakeTime:`${wakeH}:${wakeM}`,yogaDuration:parseInt(yogaDur),yogaReminder:`${String(sh).padStart(2,"0")}:${String(sm).padStart(2,"0")}`,startDate:tomorrow.toISOString().split("T")[0],setupDone:true});
    speak(`Welcome to Karma33, ${name.trim()||"Friend"}! Your journey begins tomorrow. Jai Gurudev!`);
  }
  const yogaM=6*60-parseInt(yogaDur)-5,yogaH=Math.floor(yogaM/60),yogaS=yogaM%60;
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(150deg,#0a0015,#000a20)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:420,width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.10)",borderRadius:22,padding:"28px 22px"}}>
        <div style={{display:"flex",gap:5,justifyContent:"center",marginBottom:22}}>
          {[0,1,2].map(i=><div key={i} style={{width:i===step?24:7,height:5,borderRadius:3,background:i<=step?"#FF8C00":"rgba(255,255,255,0.10)",transition:"all 0.3s"}}/>)}
        </div>
        {step===0 && (
          <div>
            <StepHeader icon="🙏" title="Welcome to Karma33" sub="28 days to transform body, mind, and voice. Takes 60 seconds to set up."/>
            <label style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:800,letterSpacing:1,display:"block",marginBottom:5}}>YOUR NAME</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name..." autoComplete="off" style={{width:"100%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.18)",color:"#fff",borderRadius:10,padding:"12px 13px",fontSize:16,outline:"none",boxSizing:"border-box"}}/>
          </div>
        )}
        {step===1 && (
          <div>
            <StepHeader icon="⏰" title="When do you wake up?" sub="Recommended: 3:30–4:00 AM for Brahma Muhurta"/>
            <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:12}}>
              <div>
                <label style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontWeight:800,letterSpacing:1,display:"block",marginBottom:4}}>HOUR</label>
                <select value={wakeH} onChange={e=>setWakeH(e.target.value)} style={{background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.18)",color:"#fff",borderRadius:9,padding:"9px 13px",fontSize:17,fontWeight:900,outline:"none"}}>
                  <option value="03">03</option><option value="04">04</option><option value="05">05</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontWeight:800,letterSpacing:1,display:"block",marginBottom:4}}>MIN</label>
                <select value={wakeM} onChange={e=>setWakeM(e.target.value)} style={{background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.18)",color:"#fff",borderRadius:9,padding:"9px 13px",fontSize:17,fontWeight:900,outline:"none"}}>
                  <option value="00">00</option><option value="15">15</option><option value="30">30</option><option value="45">45</option>
                </select>
              </div>
            </div>
            <div style={{background:"rgba(255,140,0,0.10)",border:"1px solid rgba(255,140,0,0.25)",borderRadius:9,padding:"9px 13px",fontSize:11,color:"#FF8C00",textAlign:"center"}}>🌅 Wake alarm at <b>{wakeH}:{wakeM} AM</b></div>
          </div>
        )}
        {step===2 && (
          <div>
            <StepHeader icon="🧘" title="How long does yoga take?" sub="We'll remind you to start in time to finish before 6 AM"/>
            <div style={{display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
              {["30","45","60","75","90"].map(d=>(
                <button key={d} onClick={()=>setYogaDur(d)} style={{padding:"9px 14px",borderRadius:10,border:`2px solid ${yogaDur===d?"#FF8C00":"rgba(255,255,255,0.14)"}`,background:yogaDur===d?"rgba(255,140,0,0.16)":"rgba(255,255,255,0.05)",color:yogaDur===d?"#FF8C00":"rgba(255,255,255,0.55)",fontWeight:800,fontSize:13,cursor:"pointer"}}>
                  {d} min
                </button>
              ))}
            </div>
            <div style={{background:"rgba(255,140,0,0.08)",border:"1px solid rgba(255,140,0,0.22)",borderRadius:9,padding:"9px 13px",fontSize:11,color:"#FF8C00",textAlign:"center"}}>
              ⏰ Start yoga by <b>{String(yogaH).padStart(2,"0")}:{String(yogaS).padStart(2,"0")} AM</b> · 🍽️ Meal reminder <b>11:11 AM</b>
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:8,marginTop:20}}>
          {step>0 && <button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.6)",borderRadius:11,padding:"12px",fontWeight:700,fontSize:13,cursor:"pointer"}}>← Back</button>}
          <button onClick={step<2?()=>setStep(s=>s+1):finish} style={{flex:2,background:"linear-gradient(135deg,#FF8C00,#D026C8)",border:"none",color:"#fff",borderRadius:11,padding:"12px",fontWeight:900,fontSize:14,cursor:"pointer"}}>
            {step<2?"Continue →":"Start My Journey 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}

function useReminders(setup,state,completedMap,todayDay){
  const last=useRef("");
  useEffect(()=>{
    if(!setup?.setupDone)return;
    const iv=setInterval(()=>{
      const now=new Date(),hm=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      if(hm===last.current)return;last.current=hm;
      const h=state[`h_${todayKey()}`]||[];
      const yogaDone=(completedMap["yoga"]||[]).includes(todayDay);
      if(hm===setup.wakeTime&&!h.includes("woken")){speak(`Good morning ${setup.name}! Water first, then yoga. Jai Gurudev!`);safeNotify("🌅 Wake Up!","Water first, then yoga.");}
      if(hm===setup.yogaReminder&&!yogaDone){speak(`Start yoga now to finish before 6 AM.`);safeNotify("🧘 Start Yoga Now","Begin now — finish before 6 AM.");}
      if(hm==="11:11"&&!h.includes("meal")){speak("11:11. Plan your big meal. No food after 6 PM.");safeNotify("🍽️ 11:11 — Plan Meal","Prepare your noon meal.");}
      if(hm==="18:00"&&!h.includes("fast")){speak("6 PM. Eating window closed. Fast begins now.");safeNotify("🚫 Eating Window Closed","No food after 6 PM.");}
    },30000);
    safeRequestNotif();
    return()=>clearInterval(iv);
  },[setup,state,completedMap,todayDay]);
}

function PersonaBar({persona,setPersona,mode,setMode}){
  return (
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      <div style={{display:"flex",background:"rgba(0,0,0,0.28)",borderRadius:20,padding:3,border:"1px solid rgba(255,255,255,0.11)"}}>
        {[["adult","🧑 Adult"],["teens","🧑 Teens"]].map(([p,lb])=>(
          <button key={p} onClick={()=>setPersona(p)} style={{padding:"5px 10px",borderRadius:16,border:"none",cursor:"pointer",fontSize:10,fontWeight:800,background:p===persona?"rgba(255,255,255,0.20)":"transparent",color:p===persona?"#fff":"rgba(255,255,255,0.36)"}}>
            {lb}
          </button>
        ))}
      </div>
      <div style={{display:"flex",background:"rgba(0,0,0,0.28)",borderRadius:20,padding:3,border:"1px solid rgba(255,255,255,0.11)"}}>
        {[["dark","🌑 Dark"],["vivid","⚡ Vivid"]].map(([m,lb])=>(
          <button key={m} onClick={()=>setMode(m)} style={{padding:"5px 10px",borderRadius:16,border:"none",cursor:"pointer",fontSize:10,fontWeight:800,background:m===mode?"rgba(255,255,255,0.20)":"transparent",color:m===mode?"#fff":"rgba(255,255,255,0.36)"}}>
            {lb}
          </button>
        ))}
      </div>
    </div>
  );
}

function StreakRow({completedMap,tabCfg,todayDay}){
  return (
    <div style={{display:"flex",gap:6,marginBottom:12}}>
      {Object.entries(tabCfg).map(([k,v])=>{
        const comp=completedMap[k]||[];
        let s=0;for(let d=todayDay;d>=1;d--){if(comp.includes(d))s++;else break;}
        const pct=Math.round((comp.length/28)*100);
        return (
          <div key={k} style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.11)",borderRadius:12,padding:"9px 6px",textAlign:"center"}}>
            <div style={{fontSize:15,marginBottom:2}}>{v.icon}</div>
            <div style={{fontSize:16,fontWeight:900,color:v.A,lineHeight:1}}>{s}{s>0?"🔥":""}</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.35)",marginTop:2,fontWeight:700}}>{v.short}</div>
            <div style={{marginTop:4,background:"rgba(255,255,255,0.07)",borderRadius:3,height:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:v.A,borderRadius:3}}/>
            </div>
            <div style={{fontSize:7,color:"rgba(255,255,255,0.25)",marginTop:2}}>{comp.length}/28</div>
          </div>
        );
      })}
    </div>
  );
}

function DotCal({days,completedMap,today,missed,onSelect,tabCfg,startDate}){
  const tabKeys=Object.keys(tabCfg);
  const start=new Date(startDate+"T00:00:00");
  const MN=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const enriched=days.map(d=>{const rd=new Date(start);rd.setDate(start.getDate()+d.day-1);return{...d,rd,dateNum:rd.getDate(),month:rd.getMonth(),year:rd.getFullYear()};});
  const monthMap={};
  enriched.forEach(d=>{const k=`${d.year}-${d.month}`;if(!monthMap[k])monthMap[k]={label:`${MN[d.month]} ${d.year}`,days:[]};monthMap[k].days.push(d);});
  const months=Object.values(monthMap);
  return (
    <div>
      {months.map(m=>{
        const firstDow=(m.days[0].rd.getDay()+6)%7;
        const cells=[...Array(firstDow).fill(null),...m.days];
        const rows=[];for(let i=0;i<cells.length;i+=7)rows.push(cells.slice(i,i+7));
        return (
          <div key={m.label} style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.50)",letterSpacing:1}}>{m.label.toUpperCase()}</span>
              <div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
              {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:7,fontWeight:800,color:"rgba(255,255,255,0.20)"}}>{d}</div>)}
            </div>
            {rows.map((row,ri)=>(
              <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
                {row.map((d,ci)=>
                  !d ? <div key={ci} style={{}} /> : (()=>{
                    const isT=d.day===today,isMiss=missed.includes(d.day),fut=d.day>today;
                    const allDone=tabKeys.every(tk=>(completedMap[tk]||[]).includes(d.day));
                    const anyDone=tabKeys.some(tk=>(completedMap[tk]||[]).includes(d.day));
                    return (
                      <button key={d.day} onClick={()=>onSelect(d.day)} style={{borderRadius:8,border:isT?"2px solid rgba(255,255,255,0.75)":isMiss?"1px solid rgba(255,70,70,0.45)":"1px solid rgba(255,255,255,0.07)",background:allDone?"rgba(255,255,255,0.26)":isMiss?"rgba(255,0,0,0.09)":isT?"rgba(255,255,255,0.15)":anyDone?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.03)",cursor:"pointer",outline:"none",padding:"5px 2px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:1,opacity:fut?0.28:1}}>
                        <span style={{fontSize:11,fontWeight:900,lineHeight:1,color:isT?"#fff":isMiss?"#ff7777":fut?"rgba(255,255,255,0.20)":allDone?"#fff":"rgba(255,255,255,0.72)"}}>{d.dateNum}</span>
                        <span style={{fontSize:6,lineHeight:1,color:"rgba(255,255,255,0.25)",fontWeight:700}}>D{d.day}</span>
                        <div style={{display:"flex",gap:1.5,marginTop:1}}>
                          {tabKeys.map(tk=>(
                            <div key={tk} style={{width:3,height:3,borderRadius:"50%",background:(completedMap[tk]||[]).includes(d.day)?tabCfg[tk].dotColor:"rgba(255,255,255,0.09)"}}/>
                          ))}
                        </div>
                      </button>
                    );
                  })()
                )}
              </div>
            ))}
          </div>
        );
      })}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {tabKeys.map(tk=>(<div key={tk} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:"rgba(255,255,255,0.35)"}}><div style={{width:6,height:6,borderRadius:"50%",background:tabCfg[tk].dotColor}}/>{tabCfg[tk].short}</div>))}
        <span style={{fontSize:9,color:"rgba(255,255,255,0.20)"}}>· Tap any day to open</span>
      </div>
    </div>
  );
}

function HabitRow({habit,done,onToggle,th}){
  return (
    <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,marginBottom:5,background:done?th.habitDone:"rgba(255,255,255,0.03)",border:`1px solid ${done?th.habitDoneB:th.checkBorder}`,cursor:"pointer"}}>
      <div style={{width:30,height:30,borderRadius:8,background:done?"rgba(0,210,100,0.14)":"rgba(255,255,255,0.05)",border:`1px solid ${done?"rgba(0,210,100,0.30)":th.checkBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{done?"✅":habit.icon}</div>
      <div style={{flex:1}}><div style={{fontWeight:800,fontSize:12,color:th.t1}}>{habit.title}</div><div style={{fontSize:9,color:done?"#00CC88":th.t3,marginTop:1,fontWeight:600}}>{habit.time}</div></div>
      <div style={{width:17,height:17,borderRadius:"50%",background:done?"rgba(0,210,100,0.18)":"rgba(255,255,255,0.04)",border:`2px solid ${done?"rgba(0,210,100,0.48)":th.checkBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{done&&<span style={{fontSize:9,color:"#00cc66"}}>✓</span>}</div>
    </div>
  );
}

function ExCard({id,th,isTeens}){
  const [open,setOpen]=useState(false);
  const ex=(isTeens?TE:AE)[id];if(!ex)return null;
  const showMusicControl=isTeens && stepsHaveMusicIntent(ex.steps);
  // accent for Teens Moves tab
  const musicAccent=TEENS_TABS.weight.A;
  return (
    <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${open?th.cardBorder:th.divider}`,borderRadius:11,marginBottom:6,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",padding:"10px 12px",background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:9,textAlign:"left"}}>
        <span style={{fontSize:19,minWidth:24,flexShrink:0}}>{ex.emoji}</span>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12,color:th.t1}}>{ex.name}</div><div style={{fontSize:9,color:th.t3,marginTop:1}}>{ex.dur}</div></div>
        <span style={{color:th.t3,fontSize:9,transform:open?"rotate(180deg)":"none",flexShrink:0}}>▼</span>
      </button>
      {open&&(
        <div style={{padding:"0 12px 12px",borderTop:`1px solid ${th.divider}`}}>
          {ex.steps.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:6,padding:"5px 0",borderBottom:i<ex.steps.length-1?`1px solid ${th.divider}`:"none"}}>
              <span style={{background:th.step,color:th.stepTxt,borderRadius:"50%",width:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,flexShrink:0,marginTop:3}}>{i+1}</span>
              <span style={{fontSize:11,color:th.t2,lineHeight:1.5}}>{s}</span>
            </div>
          ))}
          {showMusicControl&&(
            <WorkoutMusicControl accentColor={musicAccent} th={th} bpm={128}/>
          )}
          <div style={{background:th.tip,border:`1px solid ${th.tipB}`,borderRadius:7,padding:"6px 10px",fontSize:10,color:th.tipTxt,marginTop:8}}>💡 {ex.tip}</div>
        </div>
      )}
    </div>
  );
}

function AudioRecorder({topicId,dayNum,th}){
  const [rs,setRs]=useState("idle");
  const [sec,setSec]=useState(0);
  const [url,setUrl]=useState(null);
  const [fb,setFb]=useState(null);
  const [tx,setTx]=useState("");
  const mr=useRef(null);const chunks=useRef([]);const timer=useRef(null);
  function startRec(){
    navigator.mediaDevices.getUserMedia({audio:true}).then(st=>{
      const rec=new MediaRecorder(st);chunks.current=[];
      rec.ondataavailable=e=>chunks.current.push(e.data);
      rec.onstop=()=>{setUrl(URL.createObjectURL(new Blob(chunks.current,{type:"audio/webm"})));st.getTracks().forEach(t=>t.stop());setRs("done");};
      rec.start();mr.current=rec;setRs("recording");setSec(0);
      timer.current=setInterval(()=>setSec(s=>s+1),1000);
    }).catch(()=>alert("Microphone access needed."));
  }
  function stopRec(){if(mr.current&&mr.current.state!=="inactive")mr.current.stop();clearInterval(timer.current);}
  function analyze(){
    if(!tx.trim()){alert("Add a brief summary first.");return;}
    setRs("analyzing");setFb(null);
    const t=AC[topicId];
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:`Expert communication coach for Karma33. Analyze Day ${dayNum}: "${t?.topic}" technique "${t?.tech}". Return ONLY JSON no markdown: {"scores":{"content":7,"structure":6,"delivery":7,"technique":5},"overall":6,"strengths":["s1","s2"],"improvements":["i1","i2"],"coachNote":"Two coaching sentences.","nextStep":"One concrete action tomorrow."}`,messages:[{role:"user",content:tx}]})})
    .then(r=>r.json()).then(data=>{
      const parsed=JSON.parse((data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
      setFb(parsed);setRs("result");
    }).catch(()=>{setRs("done");setFb({error:true,coachNote:"Analysis unavailable. Keep practicing!"});});
  }
  function reset(){setRs("idle");setUrl(null);setTx("");setFb(null);setSec(0);}
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const sc=n=>n>=8?"#00DD88":n>=6?"#FFB300":"#FF6666";
  return (
    <div style={{marginTop:12}}>
      <div style={{fontSize:10,fontWeight:800,color:th.t3,marginBottom:8,letterSpacing:1}}>🎙️ RECORD YOUR PRACTICE</div>
      {rs==="idle" && <button onClick={startRec} style={{width:"100%",background:"rgba(255,80,80,0.12)",border:"1px solid rgba(255,80,80,0.25)",borderRadius:10,padding:"10px",color:th.t1,fontWeight:800,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}><span style={{width:8,height:8,borderRadius:"50%",background:"#ff4444",display:"inline-block"}}/>Start Recording</button>}
      {rs==="recording" && <div style={{background:"rgba(255,50,50,0.09)",border:"1px solid rgba(255,50,50,0.25)",borderRadius:10,padding:"12px",textAlign:"center"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:6}}><span style={{width:8,height:8,borderRadius:"50%",background:"#ff4444",animation:"pulse 1s infinite",display:"inline-block"}}/><span style={{fontWeight:900,fontSize:16,color:"#ff6666"}}>{fmt(sec)}</span></div><div style={{fontSize:10,color:th.t3,marginBottom:10}}>Recording... speak naturally</div><button onClick={stopRec} style={{background:"#ff4444",border:"none",borderRadius:8,padding:"8px 20px",color:"#fff",fontWeight:900,fontSize:12,cursor:"pointer"}}>⏹ Stop</button></div>}
      {(rs==="done"||rs==="result") && url && <div style={{background:th.inner,border:`1px solid ${th.innerB}`,borderRadius:10,padding:"10px",marginBottom:8}}><div style={{fontSize:9,color:th.t3,marginBottom:4,fontWeight:700}}>✅ {fmt(sec)}</div><audio controls src={url} style={{width:"100%",borderRadius:6}}/></div>}
      {rs==="done" && <div><div style={{fontSize:10,color:th.t3,marginBottom:4,fontWeight:700}}>Summarize what you said (3-5 sentences) for AI coaching:</div><textarea value={tx} onChange={e=>setTx(e.target.value)} placeholder="I talked about... I used the technique by..." style={{width:"100%",background:th.inputBg,border:`1px solid ${th.inputB}`,color:th.t1,borderRadius:8,padding:"8px 10px",fontSize:11,outline:"none",resize:"vertical",minHeight:65,lineHeight:1.6,boxSizing:"border-box"}}/><button onClick={analyze} style={{width:"100%",marginTop:6,background:"linear-gradient(135deg,#7C3AED,#0044CC)",border:"none",borderRadius:9,padding:"10px",color:"#fff",fontWeight:900,fontSize:12,cursor:"pointer"}}>✨ Analyze with AI Coach</button></div>}
      {rs==="analyzing" && <div style={{background:"rgba(124,58,237,0.09)",border:"1px solid rgba(124,58,237,0.22)",borderRadius:10,padding:"13px",textAlign:"center"}}><div style={{fontSize:20,marginBottom:6}}>🧠</div><div style={{fontWeight:800,color:th.t1,fontSize:12}}>Analyzing...</div></div>}
      {rs==="result" && fb && !fb.error && (
        <div style={{background:"rgba(124,58,237,0.07)",border:"1px solid rgba(124,58,237,0.20)",borderRadius:12,padding:"12px",marginTop:8}}>
          <div style={{fontWeight:800,fontSize:11,color:"#a78bfa",marginBottom:10}}>🎯 AI Coach Feedback</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
            {[["Content",fb.scores?.content],["Structure",fb.scores?.structure],["Delivery",fb.scores?.delivery],["Technique",fb.scores?.technique]].map(([l,v])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"7px",textAlign:"center"}}>
                <div style={{fontSize:17,fontWeight:900,color:sc(v||0)}}>{v||"—"}<span style={{fontSize:9}}>/10</span></div>
                <div style={{fontSize:8,color:th.t3,fontWeight:700,marginTop:1}}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
          <div style={{background:"rgba(255,255,255,0.05)",borderRadius:8,padding:"8px 10px",marginBottom:8,display:"flex",gap:8,alignItems:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:sc(fb.overall||0)}}>{fb.overall||"—"}</div>
            <div style={{flex:1}}><div style={{fontSize:8,color:th.t3,fontWeight:700}}>OVERALL</div><div style={{fontSize:11,color:th.t2,marginTop:2,lineHeight:1.5}}>{fb.coachNote}</div></div>
          </div>
          {fb.strengths?.length>0 && <div style={{marginBottom:6}}><div style={{fontSize:8,color:"#00DD88",fontWeight:800,marginBottom:2}}>✅ STRENGTHS</div>{fb.strengths.map((s,i)=><div key={i} style={{fontSize:11,color:th.t2,lineHeight:1.6,paddingLeft:6}}>• {s}</div>)}</div>}
          {fb.improvements?.length>0 && <div style={{marginBottom:6}}><div style={{fontSize:8,color:"#FFB300",fontWeight:800,marginBottom:2}}>🎯 IMPROVE</div>{fb.improvements.map((s,i)=><div key={i} style={{fontSize:11,color:th.t2,lineHeight:1.6,paddingLeft:6}}>• {s}</div>)}</div>}
          {fb.nextStep && <div style={{background:"rgba(0,210,100,0.06)",border:"1px solid rgba(0,210,100,0.16)",borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:8,color:"#00DD88",fontWeight:800,marginBottom:2}}>TOMORROW</div><div style={{fontSize:11,color:th.t2,lineHeight:1.5}}>{fb.nextStep}</div></div>}
          <button onClick={reset} style={{width:"100%",marginTop:8,background:th.inner,border:`1px solid ${th.innerB}`,borderRadius:8,padding:"7px",color:th.t2,fontWeight:700,fontSize:11,cursor:"pointer"}}>Record Again</button>
        </div>
      )}
      {fb?.error && <div style={{background:"rgba(255,160,0,0.07)",border:"1px solid rgba(255,160,0,0.18)",borderRadius:8,padding:"8px 10px",marginTop:6}}><div style={{fontSize:11,color:"#FFB300"}}>{fb.coachNote}</div></div>}
    </div>
  );
}

function CommCard({id,th,isTeens,dayNum}){
  const [open,setOpen]=useState(false);
  const t=(isTeens?TC:AC)[id];if(!t)return null;
  return (
    <div style={{background:th.card,border:`1px solid ${open?th.cardHover:th.cardBorder}`,borderRadius:12,overflow:"hidden",marginBottom:8}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",padding:"12px 13px",background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <div style={{width:38,height:38,borderRadius:10,background:th.inner,border:`1px solid ${th.innerB}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{isTeens?"💬":"🎙️"}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:13,color:th.t1}}>{t.topic}</div>
          {!isTeens&&<div style={{fontSize:9,color:th.t2,marginTop:1}}>{t.tech}</div>}
          <div style={{fontSize:9,color:th.t3,marginTop:1}}>{isTeens?"Today's challenge":"9 min · record + AI coach"}</div>
        </div>
        <span style={{color:th.t3,fontSize:9,transform:open?"rotate(180deg)":"none"}}>▼</span>
      </button>
      {open && (
        <div style={{padding:"0 13px 13px",borderTop:`1px solid ${th.divider}`}}>
          <div style={{background:th.tip,border:`1px solid ${th.tipB}`,borderRadius:9,padding:"10px 12px",margin:"10px 0"}}>
            <div style={{fontSize:9,color:th.tipTxt,fontWeight:800,letterSpacing:1,marginBottom:4}}>{isTeens?"🎯 CHALLENGE":"TODAY'S PROMPT"}</div>
            <div style={{fontSize:13,color:th.t1,lineHeight:1.65,fontStyle:"italic"}}>"{t.prompt}"</div>
          </div>
          {!isTeens && (
            <div>
              <div style={{background:th.inner,borderRadius:9,padding:"9px 12px",marginBottom:8}}>
                <div style={{fontSize:9,color:th.t3,fontWeight:800,letterSpacing:1,marginBottom:4}}>🛠 TECHNIQUE: {t.tech}</div>
                <div style={{fontSize:12,color:th.t2,lineHeight:1.65,marginBottom:t.hint?6:0}}>{t.techDesc}</div>
                {t.hint && <div style={{background:"rgba(255,255,255,0.03)",borderRadius:6,padding:"6px 9px",fontSize:10,color:th.t3,lineHeight:1.55,fontStyle:"italic"}}>📌 {t.hint}</div>}
              </div>
              <div style={{background:th.inner,borderRadius:9,padding:"9px 12px",marginBottom:6,borderLeft:"3px solid #FF8C00"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{fontSize:9,color:"#FF8C00",fontWeight:800,letterSpacing:1}}>WARM-UP</div><div style={{fontSize:8,color:th.t3,fontWeight:700}}>2 min</div></div>
                <div style={{fontSize:11,color:th.t1,lineHeight:1.6}}>Read the prompt fully. Close eyes 60 sec. Let first instinct rise — don't plan or script.</div>
              </div>
              <div style={{background:th.inner,borderRadius:9,padding:"9px 12px",marginBottom:6,borderLeft:"3px solid #D026C8"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{fontSize:9,color:"#D026C8",fontWeight:800,letterSpacing:1}}>PRACTICE</div><div style={{fontSize:8,color:th.t3,fontWeight:700}}>6 min</div></div>
                <div style={{fontSize:11,color:th.t1,lineHeight:1.6}}>Speak out loud 5–6 minutes. Apply the technique consciously — not as background knowledge, but actively shaping every sentence.</div>
              </div>
              <div style={{background:th.inner,borderRadius:9,padding:"9px 12px",marginBottom:8,borderLeft:"3px solid #0055FF"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{fontSize:9,color:"#0055FF",fontWeight:800,letterSpacing:1}}>REFLECT</div><div style={{fontSize:8,color:th.t3,fontWeight:700}}>1 min</div></div>
                <div style={{fontSize:11,color:th.t1,lineHeight:1.6}}>Out loud: What came naturally? What felt forced? What would I do differently right now?</div>
              </div>
              <AudioRecorder topicId={id} dayNum={dayNum} th={th}/>
            </div>
          )}
          {isTeens && t.tip && <div style={{background:"rgba(255,180,0,0.08)",border:"1px solid rgba(255,180,0,0.20)",borderRadius:8,padding:"8px 11px"}}><div style={{fontSize:12,color:"#FFD700",lineHeight:1.6}}>⭐ {t.tip}</div></div>}
        </div>
      )}
    </div>
  );
}

function ContactPill({person,connected,onToggle}){
  return (
    <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:4,background:connected?"rgba(0,210,100,0.10)":"rgba(255,255,255,0.08)",border:`1px solid ${connected?"rgba(0,210,100,0.30)":"rgba(255,255,255,0.15)"}`,borderRadius:16,padding:"3px 9px 3px 6px",cursor:"pointer"}}>
      <span style={{fontSize:10}}>{connected?"✅":"👤"}</span>
      <span style={{fontSize:10,fontWeight:700,color:connected?"#00DD88":"rgba(255,255,255,0.75)"}}>{person.name}</span>
    </div>
  );
}

function ConnectionsPanel({state,setState,th,todayDate}){
  const [adding,setAdding]=useState(null);
  const [newName,setNewName]=useState("");
  const vips=state.connections_vip||[];
  const casuals=state.connections_casual||[];
  const todayContacts=state.contacts_today?.[todayDate]||[];
  function addP(type){if(!newName.trim())return;const k=`connections_${type}`;const ns={...state,[k]:[...(state[k]||[]),{id:Date.now(),name:newName.trim()}]};setState(ns);save(ns);setNewName("");setAdding(null);}
  function toggle(id){const m=state.contacts_today||{};const arr=m[todayDate]||[];const ns={...state,contacts_today:{...m,[todayDate]:arr.includes(id)?arr.filter(x=>x!==id):[...arr,id]}};setState(ns);save(ns);}
  return (
    <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:12,padding:"12px 13px",marginBottom:10}}>
      <div style={{fontWeight:800,fontSize:12,color:th.t1,marginBottom:10}}>🤝 Connect Today</div>
      <div style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:10,fontWeight:800,color:th.t2}}>💛 VIP — Family &amp; Close Friends</div>
          <button onClick={()=>setAdding(adding==="vip"?null:"vip")} style={{background:th.tag,border:`1px solid ${th.tagB}`,color:th.tagTxt,borderRadius:6,padding:"3px 8px",fontSize:9,fontWeight:700,cursor:"pointer"}}>{adding==="vip"?"✕":"+ Add"}</button>
        </div>
        {adding==="vip" && (
          <div style={{display:"flex",gap:5,marginBottom:6}}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addP("vip")} placeholder="Name..." style={{flex:1,background:th.inputBg,border:`1px solid ${th.inputB}`,color:th.t1,borderRadius:7,padding:"6px 9px",fontSize:11,outline:"none"}}/>
            <button onClick={()=>addP("vip")} style={{background:th.btn,border:"none",color:th.btnTxt,borderRadius:7,padding:"6px 10px",fontSize:11,fontWeight:800,cursor:"pointer"}}>Add</button>
          </div>
        )}
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {vips.map(p=><ContactPill key={p.id} person={p} connected={todayContacts.includes(p.id)} onToggle={()=>toggle(p.id)}/>)}
          {vips.length===0&&<div style={{fontSize:10,color:th.t4}}>None yet — add some!</div>}
        </div>
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:10,fontWeight:800,color:th.t2}}>🤙 Circle — Acquaintances</div>
          <button onClick={()=>setAdding(adding==="casual"?null:"casual")} style={{background:th.tag,border:`1px solid ${th.tagB}`,color:th.tagTxt,borderRadius:6,padding:"3px 8px",fontSize:9,fontWeight:700,cursor:"pointer"}}>{adding==="casual"?"✕":"+ Add"}</button>
        </div>
        {adding==="casual" && (
          <div style={{display:"flex",gap:5,marginBottom:6}}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addP("casual")} placeholder="Name..." style={{flex:1,background:th.inputBg,border:`1px solid ${th.inputB}`,color:th.t1,borderRadius:7,padding:"6px 9px",fontSize:11,outline:"none"}}/>
            <button onClick={()=>addP("casual")} style={{background:th.btn,border:"none",color:th.btnTxt,borderRadius:7,padding:"6px 10px",fontSize:11,fontWeight:800,cursor:"pointer"}}>Add</button>
          </div>
        )}
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {casuals.map(p=><ContactPill key={p.id} person={p} connected={todayContacts.includes(p.id)} onToggle={()=>toggle(p.id)}/>)}
          {casuals.length===0&&<div style={{fontSize:10,color:th.t4}}>None yet</div>}
        </div>
      </div>
      <div style={{fontSize:9,color:th.t4,marginTop:8}}>Tap any name to mark connected today ✓</div>
    </div>
  );
}

function CertModal({day,tab,tabCfg,onClose}){
  const t=tabCfg[tab];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:t.vivBg,border:"2px solid rgba(255,255,255,0.38)",borderRadius:22,padding:"32px 24px",maxWidth:360,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:4}}>🏆</div>
        <div style={{fontSize:9,color:"rgba(255,255,255,0.55)",fontWeight:800,letterSpacing:3,marginBottom:6}}>CERTIFICATE OF COMPLETION</div>
        <div style={{fontSize:22,fontWeight:900,color:"#fff",marginBottom:4,textShadow:"0 2px 12px rgba(0,0,0,0.5)"}}>Day {day} Complete!</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginBottom:16}}>{t.label} · Karma33</div>
        <div style={{background:"rgba(255,255,255,0.13)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:10,padding:"12px 14px",marginBottom:18}}>
          <div style={{fontSize:12,color:"#fff",lineHeight:1.7}}>You showed up. You did the work.<br/>Jai Gurudev 🙏</div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.18)",color:"#fff",border:"2px solid rgba(255,255,255,0.38)",borderRadius:10,padding:"10px 28px",fontWeight:900,fontSize:14,cursor:"pointer",width:"100%"}}>Claim Certificate ✓</button>
      </div>
    </div>
  );
}

function isSandboxed(){try{return window.self!==window.top;}catch{return true;}}

function VoiceButton({onAction,th,completedMap,todayDay}){
  const [phase,setPhase]=useState("idle");
  const [tx,setTx]=useState("");
  const [intent,setIntent]=useState(null);
  const [err,setErr]=useState("");
  const recRef=useRef(null);
  const support=(()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return"unsupported";if(isSandboxed())return"sandboxed";return"supported";})();
  function listen(){
    if(support==="sandboxed"){setPhase("sandboxed");return;}
    if(support==="unsupported"){setErr("other");return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const rec=new SR();rec.lang="en-IN";rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=3;
    setPhase("requesting");setErr("");
    rec.onstart=()=>{setPhase("listening");speak("Listening",0.9,1.0);};
    rec.onresult=e=>{let best=e.results[0][0].transcript,found=parseIntent(best);if(!found){for(let i=1;i<e.results[0].length;i++){const a=e.results[0][i].transcript;const ai=parseIntent(a);if(ai){found=ai;best=a;break;}}}setTx(best);setIntent(found);if(found){if(found.action==="status"){speak(`${Object.values(completedMap).flat().length} sessions complete!`);setPhase("idle");}else{speak(found.confirm,0.88);setPhase("understood");}}else{setPhase("understood");}};
    rec.onerror=e=>{setPhase("idle");setErr(e.error==="not-allowed"?"permission":e.error==="network"?"network":e.error==="no-speech"?"aborted":"other");};
    rec.onend=()=>{};
    recRef.current=rec;try{rec.start();}catch{setPhase("idle");setErr("other");}
  }
  function confirm(){if(!intent)return;onAction(intent.intent,todayKey());speak("Logged. Great work!",0.88);setPhase("idle");setTx("");setIntent(null);}
  function cancel(){setPhase("idle");setTx("");setIntent(null);speak("Cancelled.",0.88);}
  return (
    <div style={{marginBottom:12}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}@keyframes rip{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.2);opacity:0}}`}</style>
      {phase==="idle"&&!err&&<button onClick={listen} style={{width:"100%",background:th.btn,border:"none",borderRadius:12,padding:"13px",color:th.btnTxt,fontWeight:900,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:9}}><span style={{fontSize:20}}>🎤</span>Tap &amp; Talk — say what you completed</button>}
      {phase==="requesting"&&<div style={{background:th.hero,border:`1px solid ${th.heroB}`,borderRadius:12,padding:"13px",textAlign:"center"}}><div style={{fontSize:24,animation:"pulse 1s infinite"}}>🎤</div><div style={{fontWeight:800,color:th.t1,fontSize:12,marginTop:5}}>Requesting mic...</div></div>}
      {phase==="listening"&&<div style={{background:th.hero,border:`2px solid ${th.acc}`,borderRadius:12,padding:"16px",textAlign:"center",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}><div style={{width:70,height:70,borderRadius:"50%",border:`2px solid ${th.acc}`,animation:"rip 1.5s infinite"}}/></div><div style={{fontSize:28,position:"relative"}}>🎤</div><div style={{fontWeight:900,color:th.t1,fontSize:13,position:"relative",marginTop:4}}>Listening...</div><div style={{fontSize:10,color:th.t3,marginTop:3,position:"relative"}}>"yoga done" · "workout complete" · "had my meal"</div></div>}
      {phase==="sandboxed"&&<div style={{background:"rgba(255,160,0,0.09)",border:"1px solid rgba(255,160,0,0.25)",borderRadius:12,padding:"12px"}}><div style={{display:"flex",gap:9,marginBottom:8}}><span style={{fontSize:20}}>ℹ️</span><div><div style={{fontWeight:800,fontSize:12,color:"#FFB300",marginBottom:3}}>Voice works on your deployed app</div><div style={{fontSize:11,color:"rgba(255,255,255,0.60)",lineHeight:1.65}}>iOS blocks mic in preview windows. Once deployed to Vercel (HTTPS), Tap &amp; Talk works perfectly.</div></div></div><button onClick={()=>setPhase("idle")} style={{width:"100%",background:th.btn,border:"none",borderRadius:9,padding:"9px",color:th.btnTxt,fontWeight:800,fontSize:11,cursor:"pointer"}}>Got it</button></div>}
      {phase==="understood"&&intent&&<div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:12,padding:"13px"}}><div style={{fontSize:9,color:th.t3,marginBottom:3,fontWeight:800,letterSpacing:1}}>I HEARD</div><div style={{fontSize:12,color:th.t1,marginBottom:9,fontStyle:"italic"}}>"{tx}"</div><div style={{background:th.tip,border:`1px solid ${th.tipB}`,borderRadius:9,padding:"8px 11px",marginBottom:9}}><div style={{fontSize:11,color:th.tipTxt,fontWeight:800}}>{intent.confirm}</div></div><div style={{display:"flex",gap:7}}><button onClick={confirm} style={{flex:1,background:th.btn,border:"none",borderRadius:9,padding:"9px",color:th.btnTxt,fontWeight:900,fontSize:12,cursor:"pointer"}}>✓ Confirm</button><button onClick={cancel} style={{flex:1,background:th.inner,border:`1px solid ${th.innerB}`,borderRadius:9,padding:"9px",color:th.t2,fontWeight:700,fontSize:12,cursor:"pointer"}}>✗ Cancel</button></div></div>}
      {phase==="understood"&&!intent&&<div style={{background:th.miss,border:`1px solid ${th.missB}`,borderRadius:11,padding:"11px"}}><div style={{fontSize:11,color:"#ff9999",marginBottom:5}}>Heard: "<i>{tx}</i>" — not sure what to log.</div><div style={{display:"flex",gap:7}}><button onClick={listen} style={{flex:1,background:th.btn,border:"none",borderRadius:7,padding:"7px",color:th.btnTxt,fontWeight:800,fontSize:11,cursor:"pointer"}}>Retry</button><button onClick={()=>setPhase("idle")} style={{flex:1,background:th.inner,border:`1px solid ${th.innerB}`,borderRadius:7,padding:"7px",color:th.t2,fontWeight:700,fontSize:11,cursor:"pointer"}}>Dismiss</button></div></div>}
      {err&&<div style={{background:"rgba(255,60,60,0.09)",border:"1px solid rgba(255,60,60,0.22)",borderRadius:11,padding:"11px"}}><div style={{fontSize:11,color:"rgba(255,255,255,0.55)",lineHeight:1.6,marginBottom:6}}>{err==="permission"?"Settings → Safari → Microphone → Allow":err==="network"?"Speech needs internet.":err==="aborted"?"Nothing heard — try again.":"Not available in this environment."}</div><button onClick={()=>setErr("")} style={{background:th.btn,border:"none",borderRadius:7,padding:"4px 11px",color:th.btnTxt,fontWeight:800,fontSize:10,cursor:"pointer"}}>Dismiss</button></div>}
    </div>
  );
}

function SectionLabel({label,th}){
  return <div style={{fontSize:9,fontWeight:800,color:th.sectionLabel,letterSpacing:1.5,marginBottom:7,marginTop:14}}>{label}</div>;
}


function DayView({day,tab,th,isTeens,state,setState,completedMap,onDone,onBack,tabCfg,onLaunchPractice,onLaunchAll}){
  const sched=buildSchedule(isTeens);
  const d=sched[day-1];
  const {A,B}=tabCfg[tab];
  const isDone=(completedMap[tab]||[]).includes(day);
  const todayDate=todayKey();
  const habits=isTeens?TH:AH;
  const habitsDone=state[`h_${todayDate}`]||[];
  const yogaPracticesDone=state[`yp_${todayDate}`]||[];
  const toggleHabit=useCallback(hid=>{const arr=state[`h_${todayDate}`]||[];const ns={...state,[`h_${todayDate}`]:arr.includes(hid)?arr.filter(x=>x!==hid):[...arr,hid]};setState(ns);save(ns);},[state,setState,todayDate]);
  const dayTitle=tab==="yoga"?(isTeens?"Morning Power":"Yoga & Dhyan"):tab==="weight"?d.type:((isTeens?TC:AC)[d.topicId]?.topic||"Practice");
  return (
    <div style={{paddingBottom:60}}>
      <button onClick={onBack} style={{background:th.inner,border:`1px solid ${th.innerB}`,color:th.t2,borderRadius:7,padding:"5px 12px",fontSize:10,cursor:"pointer",marginBottom:12,fontWeight:700}}>← Calendar</button>
      <div style={{background:th.hero,border:`1px solid ${th.heroB}`,borderRadius:13,padding:"13px 14px",marginBottom:2}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:5}}>
              <span style={{fontSize:10,fontWeight:800,letterSpacing:1.5,background:th.tag,color:th.tagTxt,border:`1px solid ${th.tagB}`,padding:"2px 7px",borderRadius:5}}>DAY {day}</span>
              <span style={{fontSize:9,color:th.t3,fontWeight:700}}>{d.dayName.toUpperCase()} · WK {d.week}</span>
            </div>
            <div style={{fontSize:18,fontWeight:900,color:"#fff",textShadow:"0 1px 10px rgba(0,0,0,0.6)",marginBottom:3,lineHeight:1.2}}>{dayTitle}</div>
            <div style={{fontSize:10,color:th.t3}}>{d.phase} Phase</div>
          </div>
          {isDone&&<div style={{background:th.habitDone,border:`1px solid ${th.habitDoneB}`,borderRadius:8,padding:"4px 10px",fontSize:10,color:"#00CC88",fontWeight:800,flexShrink:0}}>✓ Done</div>}
        </div>
      </div>
      <SectionLabel label="⚙️ DAILY WELLNESS RULES" th={th}/>
      <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:12,padding:"10px 11px",marginBottom:2}}>
        {habits.map(h=><HabitRow key={h.id} habit={h} done={habitsDone.includes(h.id)} onToggle={()=>toggleHabit(h.id)} th={th}/>)}
      </div>
      {tab==="yoga" && (
        <div>
          <SectionLabel label="🧘 TODAY'S PRACTICES" th={th}/>
          {!isTeens && <YogaHub onLaunch={onLaunchPractice} onLaunchAll={onLaunchAll} th={th} completedToday={yogaPracticesDone}/>}
        </div>
      )}
      {tab==="weight" && (
        <div>
          <SectionLabel label="💪 TODAY'S WORKOUT" th={th}/>
          {d.isRest ? (
            <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:12,padding:"26px 18px",textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:7}}>😴</div>
              <div style={{fontSize:15,fontWeight:800,color:th.t1}}>Rest Day</div>
              <div style={{fontSize:11,color:th.t3,marginTop:5,lineHeight:1.7}}>Muscles repair during rest.<br/>Fat burns 24–48h after your last workout.</div>
            </div>
          ) : d.exIds.map((id,i)=><ExCard key={i} id={id} th={th} isTeens={isTeens}/>)}
        </div>
      )}
      {tab==="comm" && (
        <div>
          <SectionLabel label="🎙️ TODAY'S COMMUNICATION PRACTICE" th={th}/>
          <CommCard id={d.topicId} th={th} isTeens={isTeens} dayNum={day}/>
          {!isTeens && <div><SectionLabel label="🤝 CONNECTIONS" th={th}/><ConnectionsPanel state={state} setState={setState} th={th} todayDate={todayDate}/></div>}
        </div>
      )}
      {!isDone&&<button onClick={()=>onDone(day)} style={{width:"100%",marginTop:14,background:`linear-gradient(135deg,${A},${B})`,border:"none",borderRadius:12,padding:"14px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>✓ Complete Day {day}</button>}
    </div>
  );
}

export default function Karma28(){
  const [persona,setPersona]=useState("adult");
  const [mode,setMode]=useState("vivid");
  const [tab,setTab]=useState("yoga");
  const [state,setState]=useState(load);
  const [sel,setSel]=useState(null);
  const [cert,setCert]=useState(null);
  const [activePractice,setActivePractice]=useState(null); // surya|kriya|padmasana|sanyam
  const [showCombinedSetup,setShowCombinedSetup]=useState(false);
  const [sequenceQueue,setSequenceQueue]=useState(null); // null or ordered array of practice ids
  const [sequenceIdx,setSequenceIdx]=useState(0);
  const [sequenceOverrides,setSequenceOverrides]=useState(null);
  const [showAdmin,setShowAdmin]=useState(false);
  const [testMode,setTestModeState]=useState(loadTestMode());
  const isTeens=persona==="teens";
  const tabCfg=isTeens?TEENS_TABS:ADULT_TABS;
  const setup=state.setup;
  useEffect(()=>{if(!state.startDate){const d=new Date();d.setHours(0,0,0,0);const ns={...state,startDate:d.toISOString().split("T")[0]};setState(ns);save(ns);}},[]);
  const startDate=state.startDate||new Date().toISOString().split("T")[0];
  const dayOffset=Math.floor((new Date()-new Date(startDate+"T00:00:00"))/86400000);
  const todayDay=Math.min(Math.max((dayOffset%28)+1,1),28);
  const {A,B}=tabCfg[tab];
  const th=buildTheme(mode,tabCfg,tab);
  const completedMap=Object.fromEntries(Object.keys(tabCfg).map(k=>([k,state[`c_${k}`]||[]])));
  const tabComp=completedMap[tab]||[];
  const sched=buildSchedule(isTeens);
  const missed=sched.filter(d=>d.day<todayDay&&!tabComp.includes(d.day)&&!d.isRest).map(d=>d.day);
  useReminders(setup,state,completedMap,todayDay);
  const practiceConfig=loadPracticeConfig();

  function closeAdmin(){ setShowAdmin(false); setTestModeState(loadTestMode()); }

  const markDone=useCallback((day,t)=>{
    const comp=[...(state[`c_${t}`]||[]),day].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
    let streak=1;for(let d=day-1;d>=1;d--){if(comp.includes(d))streak++;else break;}
    const ns={...state,[`c_${t}`]:comp,[`s_${t}`]:streak,[`r_${t}`]:Math.max(streak,state[`r_${t}`]||0)};
    setState(ns);save(ns);setSel(null);setCert({day,tab:t});speak(`Day ${day} complete! ${streak} day streak!`);
  },[state]);

  function recordPracticeDone(practiceId){
    const todayDate=todayKey();
    const arr=state[`yp_${todayDate}`]||[];
    const ns={...state,[`yp_${todayDate}`]:arr.includes(practiceId)?arr:[...arr,practiceId]};
    setState(ns);save(ns);
  }

  function onPracticeComplete(practiceId){
    recordPracticeDone(practiceId);
    if(sequenceQueue){
      const next=sequenceIdx+1;
      if(next<sequenceQueue.length){
        setSequenceIdx(next);
        setActivePractice(sequenceQueue[next]);
      }else{
        setSequenceQueue(null); setSequenceIdx(0); setSequenceOverrides(null); setActivePractice(null);
        speak("All four practices complete. Jai Gurudev.",0.85);
      }
    }else{
      setActivePractice(null);
    }
  }

  function beginSequence(overrides){
    setSequenceOverrides(overrides);
    const order=["surya","kriya","padmasana","sanyam"];
    setSequenceQueue(order);
    setSequenceIdx(0);
    setShowCombinedSetup(false);
    setActivePractice(order[0]);
  }

  function exitPracticeOrSequence(){
    setSequenceQueue(null); setSequenceIdx(0); setSequenceOverrides(null); setActivePractice(null);
  }

  const handleVoice=useCallback((intent,date)=>{
    const ns={...state};const hArr=ns[`h_${date}`]||[];
    const addH=id=>{if(!hArr.includes(id))hArr.push(id);ns[`h_${date}`]=hArr;};
    if(intent==="complete_yoga"){const c=[...(ns.c_yoga||[]),todayDay].filter((v,i,a)=>a.indexOf(v)===i);ns.c_yoga=c;}
    else if(intent==="complete_weight"){const c=[...(ns.c_weight||[]),todayDay].filter((v,i,a)=>a.indexOf(v)===i);ns.c_weight=c;}
    else if(intent==="complete_comm"){const c=[...(ns.c_comm||[]),todayDay].filter((v,i,a)=>a.indexOf(v)===i);ns.c_comm=c;}
    else if(intent==="log_water")addH("water");
    else if(intent==="log_meal")addH("meal");
    else if(intent==="log_fast")addH("fast");
    setState(ns);save(ns);
  },[state,todayDay]);

  if(!setup?.setupDone)return <SetupWizard onDone={cfg=>{const ns={...state,setup:cfg,startDate:cfg.startDate};setState(ns);save(ns);}}/>;

  // Full-screen practice players take over the whole view
  if(showCombinedSetup){
    const wrapStyle={fontFamily:"'Inter','SF Pro Display','Segoe UI',sans-serif",background:tabCfg.yoga.vivBg,minHeight:"100vh",color:th.t1,maxWidth:480,margin:"0 auto",padding:"20px 16px"};
    return <div style={wrapStyle}><CombinedSetup config={practiceConfig} onBegin={beginSequence} onExit={()=>setShowCombinedSetup(false)} th={th}/></div>;
  }

  if(activePractice){
    const wrapStyle={fontFamily:"'Inter','SF Pro Display','Segoe UI',sans-serif",background:tabCfg.yoga.vivBg,minHeight:"100vh",color:th.t1,maxWidth:480,margin:"0 auto",padding:"20px 16px"};
    const seqLabel=sequenceQueue?` · Practice ${sequenceIdx+1} of ${sequenceQueue.length}`:"";
    const ov=sequenceOverrides;
    if(activePractice==="surya") return <div style={wrapStyle}><style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style><SuryaPlayer config={practiceConfig.surya} onComplete={()=>onPracticeComplete("surya")} onExit={exitPracticeOrSequence} th={th} testMode={testMode} skipSetup={!!sequenceQueue} overrideConfig={ov?.surya} sequenceLabel={seqLabel}/></div>;
    if(activePractice==="kriya") return <div style={wrapStyle}><style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style><SudarshanKriyaPlayer config={practiceConfig.kriya} onComplete={()=>onPracticeComplete("kriya")} onExit={exitPracticeOrSequence} th={th} testMode={testMode} skipSetup={!!sequenceQueue} overrideConfig={ov?.kriya} sequenceLabel={seqLabel}/></div>;
    if(activePractice==="padmasana") return <div style={wrapStyle}><style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style><PadmasanaPlayer config={practiceConfig.padmasana} onComplete={()=>onPracticeComplete("padmasana")} onExit={exitPracticeOrSequence} th={th} testMode={testMode} skipSetup={!!sequenceQueue} overrideConfig={ov?.padmasana} sequenceLabel={seqLabel}/></div>;
    if(activePractice==="sanyam") return <div style={wrapStyle}><style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style><SanyamPlayer config={practiceConfig.sanyam} onComplete={()=>onPracticeComplete("sanyam")} onExit={exitPracticeOrSequence} th={th} testMode={testMode} skipSetup={!!sequenceQueue} overrideConfig={ov?.sanyam} sequenceLabel={seqLabel}/></div>;
  }

  return (
    <div style={{fontFamily:"'Inter','SF Pro Display','Segoe UI',sans-serif",background:mode==="vivid"?tabCfg[tab].vivBg:"#06060f",minHeight:"100vh",color:th.t1,maxWidth:480,margin:"0 auto"}}>
      {showAdmin && <AdminPanel onClose={closeAdmin} th={th}/>}
      <div style={{background:th.hdrBg,padding:"12px 13px 0",position:"sticky",top:0,zIndex:50,borderBottom:`1px solid ${th.divider}`,backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9,gap:8,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:19,fontWeight:900,color:"#fff",letterSpacing:-0.5,textShadow:"0 1px 6px rgba(0,0,0,0.35)"}}>Karma33</div>
            <div style={{fontSize:8,fontWeight:700,letterSpacing:2,color:th.t4}}>28-DAY TRANSFORMATION · Day {todayDay}</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>setShowAdmin(true)} title="Practice Settings" style={{background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.18)",color:"#fff",borderRadius:9,width:30,height:30,fontSize:14,cursor:"pointer"}}>⚙️</button>
            <PersonaBar persona={persona} setPersona={p=>{setPersona(p);setSel(null);setTab("yoga");}} mode={mode} setMode={setMode}/>
          </div>
        </div>
        {IS_BETA&&persona==="teens"&&<div style={{background:"rgba(255,190,0,0.08)",border:"1px solid rgba(255,190,0,0.18)",borderRadius:6,padding:"4px 9px",marginBottom:6,fontSize:9,color:"#FFD700",fontWeight:700}}>🧪 BETA — Teens mode in development</div>}
        <div style={{display:"flex",gap:3}}>
          {Object.entries(tabCfg).map(([k,v])=>(
            <button key={k} onClick={()=>{setTab(k);setSel(null);}} style={{flex:1,padding:"7px 3px 6px",borderRadius:"8px 8px 0 0",border:`1px solid ${tab===k?th.tabB:"rgba(255,255,255,0.05)"}`,borderBottom:"none",background:tab===k?th.tabAct:"transparent",color:tab===k?"#fff":th.t4,fontWeight:700,fontSize:10,cursor:"pointer",outline:"none",textShadow:tab===k?"0 1px 4px rgba(0,0,0,0.3)":"none"}}>
              <div style={{fontSize:15,marginBottom:1}}>{v.icon}</div>
              <div>{v.short}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:"11px 12px 0",borderTop:`1px solid ${th.divider}`}}>
        {sel ? (
          <DayView day={sel} tab={tab} th={th} isTeens={isTeens} state={state} setState={setState} completedMap={completedMap} onDone={d=>markDone(d,tab)} onBack={()=>setSel(null)} tabCfg={tabCfg} onLaunchPractice={pid=>{setSequenceQueue(null);setActivePractice(pid);}} onLaunchAll={()=>setShowCombinedSetup(true)}/>
        ) : (
          <div>
            <VoiceButton onAction={handleVoice} th={th} completedMap={completedMap} todayDay={todayDay}/>
            {!tabComp.includes(todayDay)&&(
              <div style={{background:th.hero,border:`1px solid ${th.heroB}`,borderRadius:12,padding:"12px 13px",marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:9,background:th.inner,border:`1px solid ${th.innerB}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>⚡</div>
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:12,color:th.t1,textShadow:"0 1px 4px rgba(0,0,0,0.2)"}}>Day {todayDay} — {sched[todayDay-1].type}</div><div style={{fontSize:9,color:th.t3,marginTop:1}}>Tap to begin today's session</div></div>
                <button onClick={()=>setSel(todayDay)} style={{background:`linear-gradient(135deg,${A},${B})`,border:"none",borderRadius:9,padding:"7px 12px",color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer",flexShrink:0}}>Start →</button>
              </div>
            )}
            {missed.length>0&&(
              <div style={{background:th.miss,border:`1px solid ${th.missB}`,borderRadius:10,padding:"9px 12px",marginBottom:10}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5}}><span>⚠️</span><span style={{fontWeight:800,fontSize:11,color:"#ff7777"}}>{missed.length} missed</span></div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{missed.map(d=><button key={d} onClick={()=>setSel(d)} style={{background:"rgba(255,60,60,0.14)",border:"1px solid rgba(255,60,60,0.28)",color:"#ff8888",borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Day {d}</button>)}</div>
              </div>
            )}
            <StreakRow completedMap={completedMap} tabCfg={tabCfg} todayDay={todayDay}/>
            <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:13,padding:"12px",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:800,color:th.t2,letterSpacing:1,marginBottom:9}}>📅 28-DAY PROGRESS</div>
              <DotCal days={sched} completedMap={completedMap} today={todayDay} missed={missed} onSelect={setSel} tabCfg={tabCfg} startDate={startDate}/>
            </div>
            {tab==="comm"&&!isTeens&&<ConnectionsPanel state={state} setState={setState} th={th} todayDate={todayKey()}/>}
            <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:12,padding:"11px 13px",marginBottom:24}}>
              <div style={{fontSize:10,fontWeight:800,color:th.t2,letterSpacing:1,marginBottom:8}}>YOUR DAILY SCHEDULE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                {[{icon:"🌅",label:"Wake Up",val:setup?.wakeTime||"03:30"},{icon:"🧘",label:"Start Yoga",val:setup?.yogaReminder||"04:55"},{icon:"🍽️",label:"Meal Window",val:"11:30 AM"},{icon:"🚫",label:"Fast Starts",val:"6:00 PM"}].map(r=>(
                  <div key={r.label} style={{background:th.inner,border:`1px solid ${th.innerB}`,borderRadius:8,padding:"7px 9px",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:15}}>{r.icon}</span>
                    <div><div style={{fontSize:8,color:th.t3,fontWeight:700}}>{r.label}</div><div style={{fontSize:11,fontWeight:900,color:th.t1}}>{r.val}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {cert&&<CertModal day={cert.day} tab={cert.tab} tabCfg={tabCfg} onClose={()=>setCert(null)}/>}
    </div>
  );
}
