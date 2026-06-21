// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS — colors, gradients, and theme construction shared
// by every layout (mobile today, desktop later per
// CROSS_PLATFORM_PLAN.md). Extracted from App.jsx so "desktop" and
// "mobile" layouts can never drift apart on color or type.
// ═══════════════════════════════════════════════════════════

// ── TAB CONFIG ────────────────────────────────────────────
export const ADULT_TABS = {
  yoga:  {label:"Yoga & Dhyan",short:"Yoga",  icon:"🪷",A:"#FF8C00",B:"#D026C8",vivBg:"linear-gradient(150deg,#FF6500,#C0006A,#8B00D0)",dotColor:"#FF8C00",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
  weight:{label:"IdealWeight",  short:"Weight",icon:"🔥",A:"#FF2200",B:"#FFB300",vivBg:"linear-gradient(150deg,#CC1500,#FF5500,#DD8800)",dotColor:"#FF5500",fg:"#fff",fgMid:"rgba(255,255,255,0.88)",fgSoft:"rgba(255,255,255,0.58)",fgGhost:"rgba(255,255,255,0.22)"},
  comm:  {label:"Kommunicate", short:"Speak", icon:"🎙️",A:"#0055FF",B:"#00AADD",vivBg:"linear-gradient(150deg,#001899,#0044CC,#0088BB)",dotColor:"#3399FF",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
};
export const TEENS_TABS = {
  yoga:  {label:"Morning Power",short:"Morning",icon:"🌅",A:"#FF6B6B",B:"#FFE66D",vivBg:"linear-gradient(150deg,#CC2244,#DD4400,#CC8800)",dotColor:"#FF6B6B",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
  weight:{label:"Boss Moves",  short:"Moves",  icon:"🦾",A:"#00C87A",B:"#00AACC",vivBg:"linear-gradient(150deg,#006644,#008855,#006688)",dotColor:"#00E890",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
  comm:  {label:"Real Talk",   short:"Talk",   icon:"💬",A:"#9933FF",B:"#DD0099",vivBg:"linear-gradient(150deg,#550099,#8800BB,#AA0077)",dotColor:"#CC66FF",fg:"#fff",fgMid:"rgba(255,255,255,0.85)",fgSoft:"rgba(255,255,255,0.55)",fgGhost:"rgba(255,255,255,0.22)"},
};

// ── THEME ─────────────────────────────────────────────────
export function buildTheme(mode,tabCfg,tab){
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
    ring:t.A,ringTrack:"#181832",ringBg:"#0d0d20",
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
    ring:"#fff",ringTrack:"rgba(255,255,255,0.16)",ringBg:"rgba(0,0,0,0.20)",
  };
}
