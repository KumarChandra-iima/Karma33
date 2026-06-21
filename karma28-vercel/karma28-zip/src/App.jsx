import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// KARMA28 — Clean build, no inline JSX arrow functions
// Rule: ZERO "const X = (...) => JSX" patterns inside components
// All components are top-level function declarations only
// ═══════════════════════════════════════════════════════════

// ── TAB CONFIG ────────────────────────────────────────────
const ADULT_TABS = {
  yoga:  {label:"Yoga & Dhyan",short:"Yoga",  icon:"🪷",A:"#FF8C00",B:"#D026C8",vivBg:"linear-gradient(150deg,#FF6500,#C0006A,#8B00D0)",dotColor:"#FF8C00",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
  weight:{label:"IdealWeight",  short:"Weight",icon:"🔥",A:"#FF2200",B:"#FFB300",vivBg:"linear-gradient(150deg,#CC1500,#FF5500,#DD8800)",dotColor:"#FF5500",fg:"#fff",fgMid:"rgba(255,255,255,0.88)",fgSoft:"rgba(255,255,255,0.58)",fgGhost:"rgba(255,255,255,0.22)"},
  comm:  {label:"Kommunicate", short:"Speak", icon:"🎙️",A:"#0055FF",B:"#00AADD",vivBg:"linear-gradient(150deg,#001899,#0044CC,#0088BB)",dotColor:"#3399FF",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
};
const TEENS_TABS = {
  yoga:  {label:"Morning Power",short:"Morning",icon:"🌅",A:"#FF6B6B",B:"#FFE66D",vivBg:"linear-gradient(150deg,#CC2244,#DD4400,#CC8800)",dotColor:"#FF6B6B",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
  weight:{label:"Boss Moves",  short:"Moves",  icon:"🦾",A:"#00C87A",B:"#00AACC",vivBg:"linear-gradient(150deg,#006644,#008855,#006688)",dotColor:"#00E890",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
  comm:  {label:"Real Talk",   short:"Talk",   icon:"💬",A:"#9933FF",B:"#DD0099",vivBg:"linear-gradient(150deg,#550099,#8800BB,#AA0077)",dotColor:"#CC66FF",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
};

// ── THEME ─────────────────────────────────────────────────
function buildTheme(mode,tabCfg,tab){
  const t=tabCfg[tab];
  if(mode==="dark") return {
    mode:"dark",appBg:"#06060f",hdrBg:"rgba(6,6,18,0.97)",
    card:"#0d0d20",cardBorder:"#181832",cardHover:t.A+"55",
    inner:"#07071a",innerB:"#11113a",
    t1:"#f0f4ff",t2:"#7788aa",t3:"#334466",t4:"#121830",
    tag:t.A+"22",tagTxt:t.A,tagB:t.A+"44",
    btn:`linear-gradient(135deg,${t.A},${t.B})`,btnTxt:"#fff",
    calDone:t.A+"44",calToday:t.A+"33",acc:t.A,accB:t.B,
    step:`linear-gradient(135deg,${t.A},${t.B})`,stepTxt:"#fff",
    tip:t.A+"14",tipB:t.A+"33",tipTxt:t.A,
    hero:t.A+"14",heroB:t.A+"33",
    miss:"rgba(220,40,40,0.12)",missB:"rgba(220,40,40,0.35)",
    tabAct:t.A+"22",tabB:t.A+"55",
    habitDone:"rgba(0,210,100,0.12)",habitDoneB:"rgba(0,210,100,0.38)",
    on6am:"rgba(255,160,0,0.12)",on6amB:"rgba(255,160,0,0.35)",on6amTxt:"#FFAA00",
    inputBg:"#0d0d20",inputB:"#181832",divider:"rgba(255,255,255,0.06)",
    sectionLabel:"#334466",checkBorder:"#334466",
  };
  const {fg,fgMid,fgSoft,fgGhost}=t;
  return {
    mode:"vivid",appBg:t.vivBg,hdrBg:"rgba(0,0,0,0.22)",
    card:"rgba(255,255,255,0.13)",cardBorder:"rgba(255,255,255,0.22)",cardHover:"rgba(255,255,255,0.30)",
    inner:"rgba(255,255,255,0.12)",innerB:"rgba(255,255,255,0.20)",
    t1:fg,t2:fgMid,t3:fgSoft,t4:fgGhost,
    tag:"rgba(255,255,255,0.22)",tagTxt:fg,tagB:"rgba(255,255,255,0.35)",
    btn:"rgba(0,0,0,0.28)",btnTxt:"#fff",
    calDone:"rgba(255,255,255,0.35)",calToday:"rgba(255,255,255,0.18)",
    acc:fg,accB:fgMid,
    step:"rgba(0,0,0,0.28)",stepTxt:"#fff",
    tip:"rgba(255,255,255,0.14)",tipB:"rgba(255,255,255,0.28)",tipTxt:fg,
    hero:"rgba(255,255,255,0.12)",heroB:"rgba(255,255,255,0.26)",
    miss:"rgba(255,40,40,0.18)",missB:"rgba(255,40,40,0.40)",
    tabAct:"rgba(255,255,255,0.18)",tabB:"rgba(255,255,255,0.50)",
    habitDone:"rgba(255,255,255,0.20)",habitDoneB:"rgba(255,255,255,0.42)",
    on6am:"rgba(255,200,0,0.18)",on6amB:"rgba(255,200,0,0.38)",on6amTxt:fg,
    inputBg:"rgba(255,255,255,0.12)",inputB:"rgba(255,255,255,0.25)",
    divider:"rgba(255,255,255,0.10)",sectionLabel:fgSoft,checkBorder:"rgba(255,255,255,0.30)",
  };
}

const IS_BETA=true;

// ── VOICE ─────────────────────────────────────────────────
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
function safeNotify(title,body){try{if(typeof Notification==="undefined")return;if(Notification.permission==="granted")new Notification(title,{body});}catch(e){}}
function safeRequestNotif(){try{if(typeof Notification==="undefined")return;if(Notification.permission==="default")Notification.requestPermission();}catch(e){}}

// ── DATA ──────────────────────────────────────────────────
const YP=[
  {id:"surya",name:"Surya Namaskar",sanskrit:"सूर्य नमस्कार",dur:"12 min · 3 rounds",emoji:"☀️",color:"#FF8C00",desc:"12-pose sun salutation. 3 rounds minimum. Complete body-mind warm-up.",steps:[{n:"Pranamasana",e:"Prayer",c:"Stand tall. Palms at heart. EXHALE."},{n:"Hasta Uttanasana",e:"Raised Arms",c:"INHALE. Sweep arms up. Arch gently."},{n:"Hasta Padasana",e:"Forward Bend",c:"EXHALE. Fold forward. Hands by feet."},{n:"Ashwa Sanchalanasana L",e:"Equestrian L",c:"INHALE. Left leg back, deep lunge."},{n:"Dandasana",e:"Plank",c:"HOLD. Right foot joins. Straight plank."},{n:"Ashtanga",e:"Eight-Limbed",c:"EXHALE. Chest and chin to floor."},{n:"Bhujangasana",e:"Cobra",c:"INHALE. Chest forward and up."},{n:"Adho Mukha",e:"Down Dog",c:"EXHALE. Hips high. Heels down."},{n:"Ashwa Sanchalanasana R",e:"Equestrian R",c:"INHALE. Right foot forward."},{n:"Hasta Padasana",e:"Forward Bend",c:"EXHALE. Left foot joins."},{n:"Hasta Uttanasana",e:"Raised Arms",c:"INHALE. Sweep up."},{n:"Pranamasana",e:"Prayer Return",c:"EXHALE. Palms to heart."}],tip:"1 round ≈ 14 cal. 3 rounds = 42 cal in 12 min."},
  {id:"kriya",name:"Sudarshan Kriya",sanskrit:"सुदर्शन क्रिया",dur:"20 min",emoji:"🌀",color:"#D026C8",desc:"Art of Living breathwork by Sri Sri. Cortisol –56%, happiness +68%.",steps:[{n:"Ujjayi",e:"Victorious Breath",c:"Ocean sound. Rhythm 2-4-6-2. 10 rounds."},{n:"Bhastrika",e:"Bellows",c:"3 rounds × 30 rapid pumps."},{n:"Om",e:"Resonance",c:"3 Oms on extended exhale."},{n:"SKY Breath",e:"Kriya",c:"Slow → Medium → Fast cycles."},{n:"Savasana",e:"Integration",c:"Lie flat 5 min. Don't move."}],tip:"🙏 Jai Gurudev — cortisol –56%, happiness +68%."},
  {id:"padmasana",name:"Padmasana Dhyan",sanskrit:"पद्मासन ध्यान",dur:"10 min",emoji:"🪷",color:"#FF4488",desc:"Lotus meditation. 10 min = 4 hours deep sleep restoration.",steps:[{n:"Asana",e:"Lotus",c:"Cross-legged. Spine straight."},{n:"Chin Mudra",e:"Hand Seal",c:"Palms UP. Index touches thumb."},{n:"Watch",e:"Min 1–3",c:"Observe natural breath."},{n:"So-Hum",e:"Min 3–8",c:"So inhale. Hum exhale."},{n:"Return",e:"Min 8–10",c:"Rub palms. Cup eyes. Open slowly."}],tip:"10 min = 4 hours deep sleep restoration."},
  {id:"sanyam",name:"Sanyam Dhyan",sanskrit:"सन्यम ध्यान",dur:"8 min",emoji:"🌙",color:"#7744FF",desc:"Evening closing. Review, release, reset.",steps:[{n:"Shithilasana",e:"Release",c:"Release every muscle. 2 min."},{n:"Reflection",e:"3 Questions",c:"Gratitude. Improve. Beautiful thing."},{n:"Pranayama",e:"Rest Breath",c:"Inhale 4 → Hold 2 → Exhale 8. × 10."},{n:"Sankalpa",e:"Intention",c:"Tomorrow I wake fresh."},{n:"Shanti",e:"Closing",c:"Om Shanti × 3."}],tip:"What you do before sleep determines tomorrow."},
];
const TY=[
  {id:"surya",name:"Sun Flow",dur:"8 min",emoji:"☀️",color:"#FF6B6B",desc:"12 moves to wake your whole body fast!",steps:["Stand like a superhero 🦸","Reach way up to the sky","Fold down touch toes","Step back lunge 🦁","Hold plank! 💪","Lower chest to floor","Push chest up cobra 🐍","Hips high V shape","Other leg forward","Both feet together fold","Sweep arms up 🌟","Hands at heart. Done! 😤"],tip:"Do this daily and feel the difference in 7 days."},
  {id:"kriya",name:"Power Breathing",dur:"10 min",emoji:"⚡",color:"#FF8E53",desc:"Breathing that clears head and boosts focus.",steps:["Sit comfortably","Ujjayi ocean breath 10 rounds","Bhastrika fast pumps × 30","3 Om chants","5 min natural breath"],tip:"Athletes, students, CEOs use this. Now you do too."},
  {id:"padmasana",name:"Focus Zone",dur:"8 min",emoji:"🎯",color:"#9933FF",desc:"Meditation that improves focus and memory.",steps:["Cross-legged or chair","Hands on knees palms up","Eyes closed spine straight","Watch your breath","If mind wanders gently return","Last 2 min: visualize your goal"],tip:"8 min daily improves exam scores."},
  {id:"sanyam",name:"Night Reset",dur:"5 min",emoji:"🌙",color:"#00AACC",desc:"5-minute evening wind-down.",steps:["Lie down or sit relaxed","Release tension from feet up","Recall 3 wins today","Breathe: in 4, hold 2, out 8 × 5","Set tomorrow's goal","Om Shanti. Sleep."],tip:"Better than 30 min of doom-scrolling."},
];
const AE={E1:{name:"Brisk Walk",dur:"10 min",emoji:"🚶",steps:["Tall posture core braced","Lift knees hip height","Pump arms opposite legs","Inhale 2 exhale 2","Build pace over 2 min"],tip:"Engine warm-up. Never skip."},E2:{name:"Dead Bug",dur:"3×10",emoji:"🐛",steps:["Back down arms ceiling","Knees 90°","Lower right arm + left leg","Back flat never arch","Return switch sides"],tip:"Deepest ab layer. Slow = effective."},E3:{name:"Plank Hold",dur:"3×20 sec",emoji:"🪨",steps:["Elbows under shoulders","Straight line head to heels","Tuck pelvis","Breathe steadily","Squeeze glutes + core"],tip:"20 perfect seconds > 60 sloppy ones."},E4:{name:"Reverse Crunch",dur:"3×12",emoji:"🔄",steps:["Back down hands beside hips","Knees bent feet off floor","EXHALE curl hips UP","Hips lift not legs","3-count lower"],tip:"Lower abs specifically."},E5:{name:"Bicycle Crunch",dur:"2×15/side",emoji:"🚴",steps:["Back down hands behind head","Shoulders lifted","Right elbow to left knee","Extend right leg","SLOW rotation"],tip:"Slow = 3× more effective."},E6:{name:"Cat-Cow",dur:"1 min",emoji:"🐱",steps:["All fours","INHALE belly down head up","EXHALE arch back chin tuck","Flow smoothly","Feel each vertebra"],tip:"Spinal reset."},E7:{name:"Tai Chi Walk",dur:"5 min",emoji:"🥋",steps:["Feet shoulder-width soft knees","Full weight on left","Lift right heel first","Roll heel to toe","EXHALE as weight shifts"],tip:"Micro-meditation."},E8:{name:"High Knees",dur:"3×30 sec",emoji:"🦵",steps:["Hands at hip height","Right knee to palm","Left knee to palm","Deliberate pace","Torso upright"],tip:"Driving knee fires core."},E9:{name:"Side Steps",dur:"3×30 sec/side",emoji:"↔️",steps:["Slight squat","Step right foot wide","Left joins arm swing","Reverse after 30 sec","Lower = more obliques"],tip:"Obliques without crunch."},E10:{name:"Cross-Body Crunch",dur:"3×15/side",emoji:"✖️",steps:["Hip-width hands behind head","Right knee up left elbow down","Feel oblique compress","1 second pause","Switch sides"],tip:"1-second pause is everything."},E11:{name:"Step-Out Jacks",dur:"3×30 sec",emoji:"⭐",steps:["Feet together arms at sides","Step right arms rise","Step back arms lower","Alternate","Breathe steadily"],tip:"Zero joint stress."},E12:{name:"Breathing Walk",dur:"5 min",emoji:"🌬️",steps:["Slow deliberate pace","Inhale 4 steps","Hold 2 steps","Exhale 6 steps","Shoulders drop on exhale"],tip:"Lowers cortisol."},E13:{name:"Mountain Climbers",dur:"4×30/15",emoji:"🧗",steps:["High plank","Drive right knee to chest","Drive left knee","Rapid alternate","Hips level"],tip:"Slow=core fast=cardio."},E14:{name:"Plank→Push-up",dur:"3×10",emoji:"⬆️",steps:["Elbow plank","Right hand up left hand up","Right elbow down left elbow","Alternate lead hand","Hips still"],tip:"Core + chest + stability."},E15:{name:"Russian Twists",dur:"3×20",emoji:"🔀",steps:["Lean back 45°","Hands clasped","Rotate right floor tap","Rotate left","Feet lifted = advanced"],tip:"Rotation from torso only."},E16:{name:"Flutter Kicks",dur:"3×30 sec",emoji:"🏊",steps:["Back down hands under glutes","Legs straight heels 6in up","Small rapid kicks","Lower back pressed","Hold till set ends"],tip:"Lower abs direct."},E17:{name:"Burpee",dur:"3×8",emoji:"💥",steps:["Stand tall","Squat hands to floor","Jump to plank","Push-up optional","Jump up explode"],tip:"Burns 50% more cal."},E18:{name:"Squat Overhead",dur:"3×15",emoji:"🏋️",steps:["Feet shoulder-width toes out","Squat weight through heels","Reach arms overhead","Drive to stand","Arms down as descend"],tip:"7 muscle groups."},E19:{name:"Lunge+Twist",dur:"3×12/side",emoji:"🔃",steps:["Right foot forward lunge","Back knee near floor","Rotate torso right","Arms chest height","Push back through front heel"],tip:"Twist toward front leg."},E20:{name:"Push-ups",dur:"3×12",emoji:"💪",steps:["Hands shoulder-width","Lower chest 1in floor","Elbows 45°","Push up","Knee push-ups valid"],tip:"45° elbow protects shoulder."},E21:{name:"High Knees Sprint",dur:"4×30/15",emoji:"🏃",steps:["Maximum effort","Knees above hip","Pump arms hard","Balls of feet","Hard exhale every stride"],tip:"30 sec all-out > 5 min jog."},E22:{name:"Glute Bridge",dur:"3×20",emoji:"🌉",steps:["Back down knees bent","Press feet hips up","Squeeze glutes 1 sec","3-count lower","No hyperextension"],tip:"Largest muscle = fat burn."},E23:{name:"Side Plank",dur:"2×25/side",emoji:"📐",steps:["Side-lying elbow under shoulder","Stack feet","Lift hips diagonal","Free hand up","Hold. Don't drop."],tip:"Obliques + hip abductors."},E24:{name:"Walk/Jog",dur:"20 min",emoji:"🏃",steps:["Walk 3 min warm-up","Brisk walk","Light jog min 10","2 min walk/2 jog","3 min cool-down"],tip:"60-70% max HR = fat zone."},E25:{name:"Hip Circles",dur:"2×10/side",emoji:"⭕",steps:["Hip-width hands on hips","Large circles clockwise","Feel hip flexors","10 then switch","Counter-clockwise 10"],tip:"Undoes sitting damage."},E26:{name:"Cobra Stretch",dur:"2 min",emoji:"🐍",steps:["Face down hands under shoulders","INHALE push chest up","Hips to floor","Hold 15-30 sec","Repeat 3-4×"],tip:"Counteracts screen posture."},E27:{name:"Child's Pose",dur:"45 sec",emoji:"🙇",steps:["Kneel sit back to heels","Arms forward forehead down","Deep breath back ribs expand","Hold as long as good","Walk hands side to side"],tip:"Rest pose. Take anytime."},};
const TE={T1:{name:"Hype Warm-Up",dur:"5 min",emoji:"🔥",steps:["Play pump-up song 🎵","Jump on spot × 20","High knees × 30 sec","Arm circles","Neck rolls"],tip:"Music + movement = 3× effort."},T2:{name:"HIIT Circuit",dur:"20 min",emoji:"⚡",steps:["Burpees × 8","Rest 20s","Mountain climbers × 30s","Rest 20s","Jump squats × 12","Rest 20s","Push-ups × 10","Rest 60s × 3"],tip:"20 min HIIT = 45 min cardio."},T3:{name:"Core Challenge",dur:"3 rounds",emoji:"🎯",steps:["Plank 30s","Bicycle crunches 20","Leg raises 15","Russian twists 20","Flutter kicks 30s","Rest 45s"],tip:"Consistency builds the 6-pack."},T4:{name:"Push/Pull",dur:"3 rounds",emoji:"💪",steps:["Push-ups × 12","Squat overhead × 15","Lunges × 12/side","Glute bridge × 20","Rest 60s"],tip:"Compound moves burn all day."},T5:{name:"Cardio Blast",dur:"15 min",emoji:"🏃",steps:["Shadow box 2 min","High knees 30s × 4","Side shuffle 30s/side","Jumping jacks 1 min","Rest 30s × 2"],tip:"Mix it up."},T6:{name:"Flexibility",dur:"10 min",emoji:"🧘",steps:["Hip circles × 10/side","Quad stretch × 30s","Figure-4 glute stretch","Cobra × 3","Child's pose 1 min"],tip:"Flexible = fewer injuries."},T7:{name:"Rest & Recover",dur:"Active rest",emoji:"😎",steps:["Slow walk 20 min","Gentle stretch 10 min","Lots of water 💧","Sleep 8+ hours"],tip:"Recovery = getting stronger."},};
const AH=[{id:"water",icon:"💧",title:"Morning Water 3L",time:"Before 6 AM"},{id:"yoga6",icon:"🧘",title:"Yoga Before 6 AM",time:"Before 6 AM"},{id:"meal",icon:"🍽️",title:"One Meal at Noon",time:"11:30 AM – 1 PM"},{id:"fast",icon:"🚫",title:"No Food After 6 PM",time:"After 6 PM"}];
const TH=[{id:"water",icon:"💧",title:"Drink 8 Glasses",time:"All day"},{id:"move",icon:"🏃",title:"Move 30 Min",time:"Anytime"},{id:"noscreen",icon:"📵",title:"Screens Off 10 PM",time:"10 PM"},{id:"sleep",icon:"😴",title:"8 Hours Sleep",time:"10 PM – 6 AM"}];

function buildSchedule(isTeens){
  const w12=[["E1","E2","E3","E4","E5","E6"],["E7","E8","E9","E10","E11","E12"],["E7","E25","E27"],[],["E1","E2","E3","E4","E5","E6"],["E7","E8","E9","E10","E11","E12"],[]];
  const w34=[["E7","E13","E14","E15","E16","E17","E26"],["E18","E19","E20","E21","E22","E23"],["E24","E25","E27"],[],["E7","E13","E14","E15","E16","E17","E26"],["E18","E19","E20","E21","E22","E23"],[]];
  const tw12=[["T1","T3"],["T1","T2","T6"],["T1","T6","T7"],[],["T1","T3"],["T1","T2","T5"],[]];
  const tw34=[["T1","T2","T4"],["T1","T5","T3","T6"],["T6","T7"],[],["T1","T2","T4"],["T1","T5","T3"],["T7"]];
  const t12a=["Core Activation","Cardio Flow","Active Recovery","Rest Day","Core Activation","Cardio Flow","Rest Day"];
  const t34a=["HIIT Blast","Strength+Cardio","Cardio+Mobility","Rest Day","HIIT Blast","Strength+Cardio","Rest Day"];
  const dn=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  return Array.from({length:28},(_,i)=>{const d=i%7,w2=Math.floor(i/7)<2;return{day:i+1,dayName:dn[d],type:isTeens?(w2?"Training":"Boss Mode"):(w2?t12a[d]:t34a[d]),phase:w2?"Foundation":"Intensity",week:Math.floor(i/7)+1,exIds:isTeens?(w2?tw12[d]:tw34[d]):(w2?w12[d]:w34[d]),topicId:`T${i+1}`,isRest:d===3||d===6};});
}

const SK="karma28_v8";
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
    speak(`Welcome to Karma28, ${name.trim()||"Friend"}! Your journey begins tomorrow. Jai Gurudev!`);
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
            <StepHeader icon="🙏" title="Welcome to Karma28" sub="28 days to transform body, mind, and voice. Takes 60 seconds to set up."/>
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
                {row.map((d,ci)=>{
                  if(!d)return<div key={ci}/>;
                  const isT=d.day===today,isMiss=missed.includes(d.day),fut=d.day>today;
                  const allDone=tabKeys.every(tk=>(completedMap[tk]||[]).includes(d.day));
                  const anyDone=tabKeys.some(tk=>(completedMap[tk]||[]).includes(d.day));
                  return (
                    <button key={d.day} onClick={()=>onSelect(d.day)} style={{borderRadius:8,border:isT?"2px solid rgba(255,255,255,0.75)":isMiss?"1px solid rgba(255,70,70,0.45)":"1px solid rgba(255,255,255,0.07)",background:allDone?"rgba(255,255,255,0.26)":isMiss?"rgba(255,0,0,0.09)":isT?"rgba(255,255,255,0.15)":anyDone?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.03)",cursor:"pointer",outline:"none",padding:"5px 2px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:1,opacity:fut?0.28:1}}>
                      <span style={{fontSize:11,fontWeight:900,lineHeight:1,color:isT?"#fff":isMiss?"#ff7777":fut?"rgba(255,255,255,0.20)":allDone?"#fff":"rgba(255,255,255,0.72)"}}>{d.dateNum}</span>
                      <span style={{fontSize:6,lineHeight:1,color:"rgba(255,255,255,0.25)",fontWeight:700}}>D{d.day}</span>
                      <div style={{display:"flex",gap:1.5,marginTop:1}}>
                        {tabKeys.map(tk=>{const done=(completedMap[tk]||[]).includes(d.day);return<div key={tk} style={{width:3,height:3,borderRadius:"50%",background:done?tabCfg[tk].dotColor:"rgba(255,255,255,0.09)"}}/>;} )}
                      </div>
                    </button>
                  );
                })}
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

function YogaCard({practice,logged,onLog,th,isTeens}){
  const [open,setOpen]=useState(false);
  const late=logged&&logged.hour>=6;
  return (
    <div style={{background:logged?(late?th.on6am:"rgba(0,210,100,0.08)"):"rgba(255,255,255,0.03)",border:`1px solid ${open?th.cardHover:logged?(late?th.on6amB:"rgba(0,210,100,0.30)"):"rgba(255,255,255,0.07)"}`,borderRadius:12,marginBottom:8,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",padding:"11px 13px",background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <div style={{width:38,height:38,borderRadius:10,background:`${practice.color}18`,border:`1px solid ${practice.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{practice.emoji}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:13,color:th.t1}}>{practice.name}</div>
          {!isTeens&&<div style={{fontSize:9,color:practice.color,fontStyle:"italic",marginTop:1}}>{practice.sanskrit}</div>}
          <div style={{fontSize:9,color:th.t3,marginTop:1}}>{practice.dur}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          {logged&&<div style={{fontSize:9,fontWeight:800,color:late?th.on6amTxt:"#00CC88",background:late?th.on6am:"rgba(0,210,100,0.10)",border:`1px solid ${late?th.on6amB:"rgba(0,210,100,0.25)"}`,borderRadius:5,padding:"2px 6px"}}>{late?"⏰":""}{logged.time}</div>}
          <span style={{color:th.t3,fontSize:9,transform:open?"rotate(180deg)":"none"}}>▼</span>
        </div>
      </button>
      {open&&(
        <div style={{padding:"0 13px 13px",borderTop:`1px solid ${th.divider}`}}>
          <p style={{fontSize:11,color:th.t2,lineHeight:1.65,margin:"8px 0 10px"}}>{practice.desc}</p>
          {practice.steps.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:7,padding:"5px 0",borderBottom:i<practice.steps.length-1?`1px solid ${th.divider}`:"none"}}>
              <span style={{background:`${practice.color}18`,color:practice.color,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,flexShrink:0,marginTop:1}}>{i+1}</span>
              {isTeens?<span style={{fontSize:12,color:th.t1,lineHeight:1.5}}>{s}</span>:<div><div style={{fontWeight:700,fontSize:11,color:th.t1}}>{s.n} <span style={{fontWeight:400,color:th.t3}}>· {s.e}</span></div><div style={{fontSize:11,color:th.t2,lineHeight:1.5,marginTop:2}}>{s.c}</div></div>}
            </div>
          ))}
          <div style={{background:`${practice.color}12`,border:`1px solid ${practice.color}22`,borderRadius:7,padding:"7px 10px",fontSize:10,color:practice.color,marginTop:9}}>🙏 {practice.tip}</div>
          {!logged&&<button onClick={()=>onLog(practice.id)} style={{width:"100%",marginTop:10,background:practice.color,border:"none",borderRadius:9,padding:"10px",color:"#fff",fontWeight:900,fontSize:12,cursor:"pointer"}}>✓ Mark Done Now</button>}
          {logged&&late&&<div style={{marginTop:8,background:th.on6am,border:`1px solid ${th.on6amB}`,borderRadius:7,padding:"7px 10px",fontSize:10,color:th.on6amTxt}}>⏰ Done at {logged.time} — after 6 AM. Counts! Aim earlier tomorrow.</div>}
        </div>
      )}
    </div>
  );
}

function ExCard({id,th,isTeens}){
  const [open,setOpen]=useState(false);
  const ex=(isTeens?TE:AE)[id];if(!ex)return null;
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
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:`Expert communication coach for Karma28. Analyze Day ${dayNum}: "${t?.topic}" technique "${t?.tech}". Return ONLY JSON no markdown: {"scores":{"content":7,"structure":6,"delivery":7,"technique":5},"overall":6,"strengths":["s1","s2"],"improvements":["i1","i2"],"coachNote":"Two coaching sentences.","nextStep":"One concrete action tomorrow."}`,messages:[{role:"user",content:tx}]})})
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
  function AddRow({type}){
    return adding===type ? (
      <div style={{display:"flex",gap:5,marginBottom:6}}>
        <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addP(type)} placeholder="Name..." style={{flex:1,background:th.inputBg,border:`1px solid ${th.inputB}`,color:th.t1,borderRadius:7,padding:"6px 9px",fontSize:11,outline:"none"}}/>
        <button onClick={()=>addP(type)} style={{background:th.btn,border:"none",color:th.btnTxt,borderRadius:7,padding:"6px 10px",fontSize:11,fontWeight:800,cursor:"pointer"}}>Add</button>
      </div>
    ) : null;
  }
  return (
    <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:12,padding:"12px 13px",marginBottom:10}}>
      <div style={{fontWeight:800,fontSize:12,color:th.t1,marginBottom:10}}>🤝 Connect Today</div>
      <div style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:10,fontWeight:800,color:th.t2}}>💛 VIP — Family & Close Friends</div>
          <button onClick={()=>setAdding(adding==="vip"?null:"vip")} style={{background:th.tag,border:`1px solid ${th.tagB}`,color:th.tagTxt,borderRadius:6,padding:"3px 8px",fontSize:9,fontWeight:700,cursor:"pointer"}}>{adding==="vip"?"✕":"+ Add"}</button>
        </div>
        <AddRow type="vip"/>
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
        <AddRow type="casual"/>
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
        <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginBottom:16}}>{t.label} · Karma28</div>
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

function DayView({day,tab,th,isTeens,state,setState,completedMap,onDone,onBack,tabCfg}){
  const sched=buildSchedule(isTeens);
  const d=sched[day-1];
  const {A,B}=tabCfg[tab];
  const isDone=(completedMap[tab]||[]).includes(day);
  const todayDate=todayKey();
  const habits=isTeens?TH:AH;
  const habitsDone=state[`h_${todayDate}`]||[];
  const yogaLogged=state[`yoga_${todayDate}`]||{};
  const yp=isTeens?TY:YP;
  const logYoga=useCallback(pid=>{const now=new Date();const ns={...state,[`yoga_${todayDate}`]:{...(state[`yoga_${todayDate}`]||{}),[pid]:{time:now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),hour:now.getHours()}}};setState(ns);save(ns);},[state,setState,todayDate]);
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
          {!isTeens&&<div style={{background:"rgba(255,140,0,0.08)",border:"1px solid rgba(255,140,0,0.20)",borderRadius:8,padding:"7px 11px",marginBottom:8,display:"flex",gap:6,alignItems:"center"}}><span>⏰</span><div style={{fontSize:10,color:"#FF8C00",fontWeight:700}}>Complete all before 6:00 AM — Brahma Muhurta</div></div>}
          {yp.map(p=><YogaCard key={p.id} practice={p} logged={yogaLogged[p.id]} onLog={logYoga} th={th} isTeens={isTeens}/>)}
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
  const markDone=useCallback((day,t)=>{
    const comp=[...(state[`c_${t}`]||[]),day].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
    let streak=1;for(let d=day-1;d>=1;d--){if(comp.includes(d))streak++;else break;}
    const ns={...state,[`c_${t}`]:comp,[`s_${t}`]:streak,[`r_${t}`]:Math.max(streak,state[`r_${t}`]||0)};
    setState(ns);save(ns);setSel(null);setCert({day,tab:t});speak(`Day ${day} complete! ${streak} day streak!`);
  },[state]);
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
  return (
    <div style={{fontFamily:"'Inter','SF Pro Display','Segoe UI',sans-serif",background:mode==="vivid"?tabCfg[tab].vivBg:"#06060f",minHeight:"100vh",color:th.t1,maxWidth:480,margin:"0 auto"}}>
      <div style={{background:th.hdrBg,padding:"12px 13px 0",position:"sticky",top:0,zIndex:50,borderBottom:`1px solid ${th.divider}`,backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9,gap:8,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:19,fontWeight:900,color:"#fff",letterSpacing:-0.5,textShadow:"0 1px 6px rgba(0,0,0,0.35)"}}>Karma28</div>
            <div style={{fontSize:8,fontWeight:700,letterSpacing:2,color:th.t4}}>28-DAY TRANSFORMATION · Day {todayDay}</div>
          </div>
          <PersonaBar persona={persona} setPersona={p=>{setPersona(p);setSel(null);setTab("yoga");}} mode={mode} setMode={setMode}/>
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
          <DayView day={sel} tab={tab} th={th} isTeens={isTeens} state={state} setState={setState} completedMap={completedMap} onDone={d=>markDone(d,tab)} onBack={()=>setSel(null)} tabCfg={tabCfg}/>
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
