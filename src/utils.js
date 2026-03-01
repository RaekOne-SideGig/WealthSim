// ── USD Formatters ─────────────────────────────────────────────────────────
export const fmt  = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n??0);
export const fmtK = (n) => { const v=n??0; return v>=1e6?`$${(v/1e6).toFixed(2)}m`:v>=1e3?`$${(v/1e3).toFixed(0)}k`:fmt(v); };
export const pct  = (n) => `${(n??0).toFixed(1)}%`;

// ── Constants ──────────────────────────────────────────────────────────────
export const COLORS       = ["#4ade80","#60a5fa","#f59e0b","#c084fc","#34d399","#f87171","#a78bfa","#fb923c","#38bdf8"];
export const ACCOUNT_TYPES= ["savings","retirement","investment","property"];
export const TYPE_ICONS   = { savings:"🏦", retirement:"🎯", investment:"📈", property:"🏠" };
export const FULL_SS_AGE  = 67;
export const SS_COLA      = 0.023;
export const STORAGE_KEY  = "wealthsim_v7_data";

// ── Social Security adjustment ─────────────────────────────────────────────
export function calcSSBenefit(fullMonthly, claimAge) {
  const months = Math.round((claimAge - FULL_SS_AGE) * 12);
  if (months === 0) return fullMonthly;
  if (months > 0) {
    const capped = Math.min(months, 36);
    return fullMonthly * (1 + capped * 8/12/100);
  }
  const early = Math.abs(months);
  return fullMonthly * (1 - Math.min(early,36)*(5/9/100) - Math.max(0,early-36)*(5/12/100));
}

// ── Federal Tax (2024 Single) ──────────────────────────────────────────────
export const BRACKETS = [
  {up:11600,rate:.10},{up:47150,rate:.12},{up:100525,rate:.22},
  {up:191950,rate:.24},{up:243725,rate:.32},{up:609350,rate:.35},{up:Infinity,rate:.37}
];
export const STD_DED = 14600;
export function calcTax(g) {
  const t=Math.max(0,g-STD_DED); let tax=0,prev=0;
  for(const{up,rate}of BRACKETS){if(t<=prev)break;tax+=(Math.min(t,up)-prev)*rate;prev=up;}
  return tax;
}
export const effRate  = (g) => g<=0?0:calcTax(g)/g*100;
export const margRate = (g) => { const t=Math.max(0,g-STD_DED); let prev=0; for(const{up,rate}of BRACKETS){if(t<=up)return rate*100;prev=up;} return 37; };

// ── Field labels ───────────────────────────────────────────────────────────
export const fieldLabel = (type, field, isPrimary) => {
  if(type==="property"){
    if(field==="balance")             return "Property Value ($)";
    if(field==="annualReturn")        return "Equity Growth % p.a.";
    if(field==="monthlyContribution") return isPrimary ? null : "Rental Income ($/mo)";
    if(field==="rentalInvestReturn")  return "Rental Cash Invested Return % p.a.";
  }
  if(field==="balance")             return "Current Balance ($)";
  if(field==="annualReturn")        return "Annual Return %";
  if(field==="monthlyContribution") return "Monthly Contribution ($)";
};

// ── Waterfall ─────────────────────────────────────────────────────────────
export function calcWaterfall(accounts, targetMonthly, inflYears, inflation, ssMonthlyAtRetire) {
  const inflF  = Math.pow(1+inflation/100, inflYears);
  const target = targetMonthly * inflF * 12;
  const nonPrimary = accounts.filter(a=>!(a.type==="property"&&a.isPrimary));
  const savings    = nonPrimary.filter(a=>a.type==="savings");
  const rentals    = nonPrimary.filter(a=>a.type==="property"&&a.monthlyContribution>0);
  const investments= nonPrimary.filter(a=>a.type==="investment");
  const retirement = nonPrimary.filter(a=>a.type==="retirement");
  let rem = target;
  const steps = [];
  const ssAnnual = ssMonthlyAtRetire*12;
  const fromSS   = Math.min(rem, ssAnnual);
  steps.push({label:"Social Security",            amount:fromSS,  color:"#38bdf8"}); rem -= fromSS;
  const cashInt  = savings.reduce((s,a)=>s+a.balance*(a.annualReturn/100)*Math.pow(1+a.annualReturn/100,inflYears),0);
  const fromCash = Math.min(rem, cashInt);
  steps.push({label:"Cash / Savings Interest",    amount:fromCash,color:COLORS[0]}); rem -= fromCash;
  const rentAnn  = rentals.reduce((s,a)=>s+a.monthlyContribution*12*inflF,0);
  const fromRent = Math.min(rem, rentAnn);
  steps.push({label:"Rental Income",              amount:fromRent,color:COLORS[3]}); rem -= fromRent;
  const invCap   = investments.reduce((s,a)=>s+a.balance*Math.pow(1+a.annualReturn/100,inflYears)*0.04,0);
  const fromInv  = Math.min(rem, invCap);
  steps.push({label:"Investment Sales (4% rule)", amount:fromInv, color:COLORS[2]}); rem -= fromInv;
  const retCap   = retirement.reduce((s,a)=>s+a.balance*Math.pow(1+a.annualReturn/100,inflYears)*0.04,0);
  const fromRet  = Math.min(rem, retCap);
  steps.push({label:"Retirement Account (4%)",    amount:fromRet, color:COLORS[1]}); rem -= fromRet;
  return { steps, shortfall:Math.max(0,rem), target, covered:target-Math.max(0,rem) };
}

// ── Defaults ───────────────────────────────────────────────────────────────
export const DEF_SETTINGS = {
  currentAge:35, retirementAge:65, inflation:2.5,
  lifeExpectancy:90, targetSustainAge:90,
  targetMonthlyIncome:7000,
  ssClaimAge:67, ssFullMonthly:2200,
  salaryGrowthRate:3.0,
  goGoEnd:70, slowGoEnd:80,
  goGoPct:100, slowGoPct:70, noGoPct:50,
};
export const DEF_EARNINGS = {
  grossIncome:95000, savingsPct:15, allocationMap:{},
  bonusAmount:10000, bonusTaxRate:45, bonusSavePct:30, bonusAllocMap:{},
};
export const DEF_ACCOUNTS = [
  {id:1,name:"High-Yield Savings",type:"savings",   balance:25000, annualReturn:4.5,monthlyContribution:300, color:COLORS[0],isPrimary:false},
  {id:2,name:"401(k)",            type:"retirement",balance:120000,annualReturn:7.0,monthlyContribution:800, color:COLORS[1],isPrimary:false},
  {id:3,name:"Brokerage (ETFs)",  type:"investment", balance:40000, annualReturn:9.5,monthlyContribution:400, color:COLORS[2],isPrimary:false},
  {id:4,name:"Primary Residence", type:"property",   balance:480000,annualReturn:3.5,monthlyContribution:0,   color:COLORS[3],isPrimary:true },
  {id:5,name:"Rental Property",   type:"property",   balance:320000,annualReturn:3.0,monthlyContribution:1800,rentalInvestReturn:4.5,color:COLORS[4],isPrimary:false},
];
export const DEF_PROFILE = { name:"My Portfolio", accounts:[...DEF_ACCOUNTS], settings:{...DEF_SETTINGS}, earnings:{...DEF_EARNINGS} };

// ── JSONBin.io storage ────────────────────────────────────────────────────
export const CREDS_KEY = "wealthsim_jsonbin_creds";
export function loadCreds() { try { const r=localStorage.getItem(CREDS_KEY); return r?JSON.parse(r):null; } catch { return null; } }
export function saveCreds(c) { try { localStorage.setItem(CREDS_KEY,JSON.stringify(c)); } catch {} }
export function clearCreds() { try { localStorage.removeItem(CREDS_KEY); } catch {} }

export async function jsonbinCreate(apiKey, data) {
  const res = await fetch("https://api.jsonbin.io/v3/b", {
    method:"POST", headers:{"Content-Type":"application/json","X-Master-Key":apiKey,"X-Bin-Name":"WealthSim"},
    body:JSON.stringify(data),
  });
  if(!res.ok){const t=await res.text();throw new Error(`${res.status}: ${t.slice(0,120)}`);}
  return (await res.json()).metadata?.id;
}
export async function jsonbinRead(apiKey, binId) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`,{headers:{"X-Master-Key":apiKey}});
  if(!res.ok){const t=await res.text();throw new Error(`${res.status}: ${t.slice(0,120)}`);}
  return (await res.json()).record;
}
export async function jsonbinWrite(apiKey, binId, data) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`,{
    method:"PUT", headers:{"Content-Type":"application/json","X-Master-Key":apiKey},
    body:JSON.stringify(data),
  });
  if(!res.ok){const t=await res.text();throw new Error(`${res.status}: ${t.slice(0,120)}`);}
  return true;
}
export function localSave(d) { try{localStorage.setItem("wealthsim_local",JSON.stringify(d));return true;}catch{return false;} }
export function localLoad() { try{const r=localStorage.getItem("wealthsim_local");return r?JSON.parse(r):null;}catch{return null;} }
