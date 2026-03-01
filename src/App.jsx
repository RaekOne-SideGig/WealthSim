import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  fmt, fmtK, COLORS, FULL_SS_AGE, SS_COLA, ACCOUNT_TYPES, fieldLabel,
  calcSSBenefit, calcTax, calcWaterfall, effRate, margRate,
  DEF_SETTINGS, DEF_EARNINGS, DEF_ACCOUNTS, DEF_PROFILE,
  loadCreds, saveCreds, clearCreds,
  jsonbinCreate, jsonbinRead, jsonbinWrite,
  localSave, localLoad,
} from "./utils.js";
import PortfolioTab       from "./components/PortfolioTab.jsx";
import AccountsTab        from "./components/AccountsTab.jsx";
import EarningsTab        from "./components/EarningsTab.jsx";
import ProjectionsTab     from "./components/ProjectionsTab.jsx";
import RetirementTab      from "./components/RetirementTab.jsx";
import PlanningTab        from "./components/PlanningTab.jsx";
import RecommendationsTab from "./components/RecommendationsTab.jsx";
import RentalTab          from "./components/RentalTab.jsx";
import ScenariosTab       from "./components/ScenariosTab.jsx";

export default function App() {

  // ── Profiles & persistence state ─────────────────────────────────────
  const [profiles,        setProfiles]        = useState({ "My Portfolio": JSON.parse(JSON.stringify(DEF_PROFILE)) });
  const [activeProfile,   setActiveProfile]   = useState("My Portfolio");
  const [loading,         setLoading]         = useState(true);
  const [saveStatus,      setSaveStatus]      = useState("idle");
  const [saveMsg,         setSaveMsg]         = useState("");
  const [lastSaved,       setLastSaved]       = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [newProfileName,  setNewProfileName]  = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const profileMenuRef = useRef(null);

  // ── Cloud sync state ──────────────────────────────────────────────────
  const [creds,       setCreds]       = useState(() => loadCreds());
  const [showSetup,   setShowSetup]   = useState(false);
  const [setupApiKey, setSetupApiKey] = useState("");
  const [setupBinId,  setSetupBinId]  = useState("");
  const [setupStep,   setSetupStep]   = useState("enter");
  const [setupError,  setSetupError]  = useState("");
  const isConfigured = !!(creds?.apiKey && creds?.binId);

  // ── UI state ──────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState("portfolio");
  const [editingId,    setEditingId]    = useState(null);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [newAcc,       setNewAcc]       = useState({name:"",type:"savings",balance:0,annualReturn:4,monthlyContribution:0,isPrimary:false});
  const [scenarioMult,    setScenarioMult]    = useState(1.0);
  const [scenarioAccIds,  setScenarioAccIds]  = useState(null); // null = all accounts
  const [reviewAccId,     setReviewAccId]     = useState(null);
  const [simReturns,      setSimReturns]      = useState({});
  const [simContribs,     setSimContribs]     = useState({});
  const [propertySales,   setPropertySales]   = useState({}); // {accId: {saleAge, deployToAccId}}

  // ── Active profile accessors ──────────────────────────────────────────
  const profile  = profiles[activeProfile] || DEF_PROFILE;
  const accounts = profile.accounts || DEF_ACCOUNTS;
  const settings = profile.settings || DEF_SETTINGS;
  const earnings = profile.earnings  || DEF_EARNINGS;
  const {
    currentAge, retirementAge, inflation, lifeExpectancy,
    targetMonthlyIncome, ssClaimAge, ssFullMonthly, targetSustainAge,
    salaryGrowthRate, goGoEnd, slowGoEnd, goGoPct, slowGoPct, noGoPct,
  } = settings;

  // ── Load data on mount ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const local = localLoad();
      if (local?.profiles) {
        setProfiles(local.profiles);
        if (local.activeProfile && local.profiles[local.activeProfile]) setActiveProfile(local.activeProfile);
        if (local.lastSaved) setLastSaved(local.lastSaved);
      }
      if (creds?.apiKey && creds?.binId) {
        try {
          const data = await jsonbinRead(creds.apiKey, creds.binId);
          if (data?.profiles) {
            setProfiles(data.profiles);
            if (data.activeProfile && data.profiles[data.activeProfile]) setActiveProfile(data.activeProfile);
            if (data.lastSaved) setLastSaved(data.lastSaved);
          }
        } catch(e) { console.warn("JSONBin load failed:", e); }
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  // ── Profile helpers ───────────────────────────────────────────────────
  const updateProfile  = (patch) => setProfiles(p=>({...p,[activeProfile]:{...p[activeProfile],...patch}}));
  const setAccounts    = (fn)    => updateProfile({accounts:typeof fn==="function"?fn(accounts):fn});
  const updateSettings = (k,v)   => updateProfile({settings:{...settings,[k]:v}});
  const updateEarnings = (k,v)   => updateProfile({earnings:{...earnings,[k]:v}});

  const createProfile = () => {
    const name = newProfileName.trim();
    if(!name||profiles[name]) return;
    setProfiles(p=>({...p,[name]:{...JSON.parse(JSON.stringify(DEF_PROFILE)),name}}));
    setActiveProfile(name); setNewProfileName(""); setCreatingProfile(false); setShowProfileMenu(false);
  };
  const deleteProfile = (name) => {
    if(Object.keys(profiles).length<=1) return;
    setProfiles(p=>{const n={...p};delete n[name];return n;});
    if(activeProfile===name) setActiveProfile(Object.keys(profiles).find(k=>k!==name)||"My Portfolio");
  };
  const duplicateProfile = (name) => {
    const nn=`${name} (Copy)`;
    setProfiles(p=>({...p,[nn]:{...JSON.parse(JSON.stringify(p[name])),name:nn}}));
    setActiveProfile(nn); setShowProfileMenu(false);
  };

  useEffect(() => {
    const h=e=>{if(profileMenuRef.current&&!profileMenuRef.current.contains(e.target))setShowProfileMenu(false);};
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[]);

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaveStatus("saving"); setSaveMsg("");
    const ts = new Date().toISOString();
    const payload = { profiles, activeProfile, lastSaved: ts };
    localSave(payload);
    if (!isConfigured) {
      setSaveStatus("local"); setSaveMsg("Saved locally (setup cloud sync for cross-device)");
      setLastSaved(ts); setTimeout(()=>setSaveStatus("idle"),4000); return;
    }
    try {
      await jsonbinWrite(creds.apiKey, creds.binId, payload);
      setSaveStatus("saved"); setSaveMsg("✓ Synced to cloud");
      setLastSaved(ts); setTimeout(()=>setSaveStatus("idle"),3500);
    } catch(e) {
      setSaveStatus("error"); setSaveMsg(e.message||"Sync failed");
      setTimeout(()=>setSaveStatus("idle"),6000);
    }
  }, [profiles, activeProfile, creds, isConfigured]);

  const handleSetupConnect = useCallback(async () => {
    if (!setupApiKey.trim()) { setSetupError("API key is required"); return; }
    setSetupError("");
    if (setupBinId.trim()) {
      setSetupStep("creating");
      try {
        await jsonbinRead(setupApiKey.trim(), setupBinId.trim());
        const c = { apiKey: setupApiKey.trim(), binId: setupBinId.trim() };
        saveCreds(c); setCreds(c); setSetupStep("done"); setShowSetup(false);
      } catch(e) { setSetupStep("enter"); setSetupError("Could not read bin: "+(e.message||e)); }
    } else {
      setSetupStep("creating");
      try {
        const ts = new Date().toISOString();
        const binId = await jsonbinCreate(setupApiKey.trim(), { profiles, activeProfile, lastSaved: ts });
        const c = { apiKey: setupApiKey.trim(), binId };
        saveCreds(c); setCreds(c); localSave({ profiles, activeProfile, lastSaved: ts });
        setLastSaved(ts); setSetupStep("done"); setShowSetup(false);
      } catch(e) { setSetupStep("enter"); setSetupError("Create failed: "+(e.message||e)); }
    }
  }, [setupApiKey, setupBinId, profiles, activeProfile]);

  const handleDisconnect = () => { clearCreds(); setCreds(null); setSetupApiKey(""); setSetupBinId(""); };

  // ── Account helpers ───────────────────────────────────────────────────
  const nextId    = useMemo(()=>accounts.length?Math.max(...accounts.map(a=>a.id))+1:1,[accounts]);
  const addAccount= () => { if(!newAcc.name)return; setAccounts(p=>[...p,{...newAcc,id:nextId,color:COLORS[p.length%COLORS.length]}]); setNewAcc({name:"",type:"savings",balance:0,annualReturn:4,monthlyContribution:0,isPrimary:false}); setShowAddForm(false); };
  const updAcc    = (id,f,v)=>setAccounts(p=>p.map(a=>a.id===id?{...a,[f]:(f==="name"||f==="type"||f==="isPrimary")?v:parseFloat(v)||0}:a));
  const remAcc    = (id)=>setAccounts(p=>p.filter(a=>a.id!==id));

  // ── Derived earnings values ───────────────────────────────────────────
  const ssAdjMonthly       = useMemo(()=>calcSSBenefit(ssFullMonthly,ssClaimAge),[ssFullMonthly,ssClaimAge]);
  const monthlySavings     = useMemo(()=>(earnings.grossIncome/12)*(earnings.savingsPct/100),[earnings]);
  const bonusAfterTax      = useMemo(()=>earnings.bonusAmount*(1-earnings.bonusTaxRate/100),[earnings]);
  const bonusSaved         = useMemo(()=>bonusAfterTax*(earnings.bonusSavePct/100),[bonusAfterTax,earnings]);
  const allocMap           = earnings.allocationMap  || {};
  const bonusAllocMap      = earnings.bonusAllocMap  || {};
  const totalAllocPct      = Object.values(allocMap).reduce((s,v)=>s+(parseFloat(v)||0),0);
  const totalBonusAllocPct = Object.values(bonusAllocMap).reduce((s,v)=>s+(parseFloat(v)||0),0);

  const effectiveContrib = useMemo(()=>{
    const map={};
    accounts.forEach(acc=>{
      if(acc.isPrimary&&acc.type==="property"){map[acc.id]=0;return;}
      const reg = monthlySavings*(parseFloat(allocMap[acc.id])||0)/100;
      const bon = (bonusSaved*(parseFloat(bonusAllocMap[acc.id])||0)/100)/12;
      map[acc.id]= acc.monthlyContribution+reg+bon;
    });
    return map;
  },[accounts,allocMap,bonusAllocMap,monthlySavings,bonusSaved]);

  // Plain object snapshot — guarantees projectionData reruns when earnings change
  const earningsSnap = {
    monthlySavings, bonusSaved,
    allocMap, bonusAllocMap, salaryGrowthRate,
  };
  const earningsContribForYear = (acc, yearsFromNow) => {
    if (acc.isPrimary && acc.type === "property") return 0;
    const salaryGrowFactor = Math.pow(1+(earningsSnap.salaryGrowthRate||0)/100, yearsFromNow);
    const regPct = (parseFloat(earningsSnap.allocMap[acc.id])||0)/100;
    const bonPct = (parseFloat(earningsSnap.bonusAllocMap[acc.id])||0)/100;
    return earningsSnap.monthlySavings*salaryGrowFactor*regPct + (earningsSnap.bonusSaved*salaryGrowFactor*bonPct)/12;
  };

  // ── Projections ───────────────────────────────────────────────────────
  const projectionData = useMemo(()=>{
    const maxAge = Math.max(lifeExpectancy,targetSustainAge)+5;
    const data = [];
    for(let yr=0;yr<=maxAge-currentAge;yr++){
      const age=currentAge+yr;
      let nominal=0;
      const bd={};
      const rentalCashPots={};
      accounts.filter(a=>a.type==="property"&&!a.isPrimary&&a.monthlyContribution>0).forEach(a=>{ rentalCashPots[a.id]=0; });
      accounts.forEach(acc=>{
        const rate=acc.annualReturn/100;
        let bal=acc.balance;
        for(let y=0;y<yr;y++){
          if(acc.isPrimary&&acc.type==="property"){ bal=bal*(1+rate); }
          else if(acc.type==="property"&&!acc.isPrimary){
            const sale = propertySales[acc.id];
            const saleAge = sale?.saleAge;
            const ageAtY = currentAge+y;
            // If sold, property stops appreciating and rental income stops
            if(saleAge && ageAtY >= saleAge){ /* property sold, skip */ }
            else {
              bal=bal*(1+rate);
              const cashRate=(acc.rentalInvestReturn||4.5)/100;
              const useScenarioR = !scenarioAccIds || scenarioAccIds.includes(acc.id);
              rentalCashPots[acc.id]=(rentalCashPots[acc.id]||0)*(1+cashRate)+acc.monthlyContribution*12*(useScenarioR?scenarioMult:1.0);
            }
            // At sale year: add sale proceeds to the deploy account's balance (tracked separately)
            if(saleAge && ageAtY === saleAge){
              // Sale proceeds = property value at that year (already computed as bal before this year's growth)
              const saleProceeds = bal; // bal is value before this year
              bal = 0; // property is sold
              rentalCashPots[acc.id] = rentalCashPots[acc.id] || 0; // preserve accumulated cash
              // Mark sale proceeds in bd for the deploy account
              if(sale.deployToAccId){
                const deployKey = "sale_inject_"+sale.deployToAccId;
                rentalCashPots[deployKey] = (rentalCashPots[deployKey]||0) + saleProceeds;
              }
            }
          } else {
            const retired=(currentAge+y)>=retirementAge;
            const useScenario = !scenarioAccIds || scenarioAccIds.includes(acc.id);
            const mult = useScenario ? scenarioMult : 1.0;
            if(retired){ bal=bal*(1+rate); }
            else { bal=bal*(1+rate)+(acc.monthlyContribution*mult+earningsContribForYear(acc,y)*mult)*12; }
          }
        }
        bd[acc.name]=Math.max(0,bal);
        if(!(acc.isPrimary&&acc.type==="property")){
          nominal+=Math.max(0,bal);
          if(acc.type==="property"&&!acc.isPrimary){
            bd[acc.name+"_cash"]=Math.max(0,rentalCashPots[acc.id]||0);
            nominal+=Math.max(0,rentalCashPots[acc.id]||0);
          }
        }
      });
      const inf=Math.pow(1+inflation/100,yr);
      data.push({age,year:yr,nominal:Math.round(nominal),real:Math.round(nominal/inf),isRetired:age>=retirementAge,...bd});
    }
    return data;
  },[accounts,currentAge,retirementAge,lifeExpectancy,targetSustainAge,inflation,scenarioMult,scenarioAccIds,monthlySavings,bonusSaved,allocMap,bonusAllocMap,salaryGrowthRate,propertySales]);

  // ── Retirement calc ───────────────────────────────────────────────────
  const retCalc = useMemo(()=>{
    const rp=projectionData.find(d=>d.age===retirementAge);
    if(!rp) return null;
    const inflYrs=retirementAge-currentAge;
    const inflF=Math.pow(1+inflation/100,inflYrs);
    const annualInflAdj=targetMonthlyIncome*12*inflF;
    const fedTax=calcTax(annualInflAdj);
    const grossNeeded=annualInflAdj+fedTax;
    const ssAtRetireStart=ssClaimAge<=retirementAge?ssAdjMonthly*Math.pow(1+SS_COLA,retirementAge-ssClaimAge):0;
    const wf=calcWaterfall(accounts,targetMonthlyIncome,inflYrs,inflation,ssAtRetireStart);
    const ssAtRetireNominal=ssClaimAge<=retirementAge
      ?ssAdjMonthly*12*Math.pow(1+SS_COLA,retirementAge-ssClaimAge)
      :ssAdjMonthly*12;
    const stageMultiplier=(age)=>{
      const p=age<(goGoEnd||70)?(goGoPct||100):age<(slowGoEnd||80)?(slowGoPct||70):(noGoPct||50);
      return p/100;
    };
    // Blended return weighted by projected balances AT retirement age
    const investAccs = accounts.filter(a=>!(a.isPrimary&&a.type==="property")&&a.type!=="property");
    const totalInvestAtRetire = investAccs.reduce((s,a)=>{
      const b = a.balance * Math.pow(1+a.annualReturn/100, inflYrs);
      return s + b;
    }, 0);
    const blendedGrowth = totalInvestAtRetire > 0
      ? investAccs.reduce((s,a)=>{
          const b = a.balance * Math.pow(1+a.annualReturn/100, inflYrs);
          return s + (a.annualReturn/100) * b;
        }, 0) / totalInvestAtRetire
      : 0.06;
    // No artificial cap — use actual blended return. Min 2% floor.
    const safeGrowth = Math.max(0.02, blendedGrowth);

    // Rental income at retirement (ongoing, grows with inflation)
    const rentalAccs = accounts.filter(a=>a.type==="property"&&!a.isPrimary&&a.monthlyContribution>0);
    const rentalAnnualAtRetire = rentalAccs.reduce((s,a)=>s+a.monthlyContribution*12,0)
      * Math.pow(1+inflation/100, inflYrs);

    // Separate investment pot (exclude rental cash which provides ongoing income)
    const investPot = Math.max(0, rp.nominal);

    let pot=investPot, sustainedUntil=retirementAge;
    let potAtTarget=null, shortfallAtTarget=0, surplusAtTarget=0;
    const drawdownTimeline=[];
    for(let age=retirementAge;age<=130;age++){
      const yr=age-retirementAge;
      const inflScale=Math.pow(1+inflation/100,yr);
      const needThisYear=grossNeeded*inflScale*stageMultiplier(age);
      let ssThisYear=0;
      if(age>=ssClaimAge){
        const colaYears=age-Math.max(retirementAge,ssClaimAge);
        const ssStartNominal=ssClaimAge>=retirementAge
          ?ssAdjMonthly*12*Math.pow(1+inflation/100,ssClaimAge-currentAge)
          :ssAtRetireNominal;
        ssThisYear=ssStartNominal*Math.pow(1+SS_COLA,colaYears);
      }
      // Rental income this year (grows with inflation, stops at sale age)
      const rentalThisYear = rentalAccs.reduce((s,a)=>{
        const sale = propertySales[a.id];
        if(sale?.saleAge && age >= sale.saleAge) return s;
        return s + a.monthlyContribution*12*Math.pow(1+inflation/100,retirementAge-currentAge+yr);
      }, 0);
      const netNeed=Math.max(0,needThisYear-ssThisYear-rentalThisYear);
      const stage=age<(goGoEnd||70)?"goGo":age<(slowGoEnd||80)?"slowGo":"noGo";
      pot=pot*(1+safeGrowth)-netNeed;
      drawdownTimeline.push({age,balance:Math.max(0,pot),ssIncome:Math.round(ssThisYear),
        rentalIncome:Math.round(rentalThisYear),
        drawdown:Math.round(netNeed),totalNeed:Math.round(needThisYear),stage,stagePct:stageMultiplier(age)*100});
      if(age===targetSustainAge){ potAtTarget=pot; if(pot>=0)surplusAtTarget=pot; else shortfallAtTarget=Math.abs(pot); }
      if(pot>0) sustainedUntil=age; else { if(sustainedUntil<age) break; }
    }
    const swr=rp.nominal>0?grossNeeded/rp.nominal*100:0;
    const ssReductionPct=(ssAdjMonthly-ssFullMonthly)/ssFullMonthly*100;
    return {
      pot:rp.nominal,sustainedUntil,swr,yearsOfIncome:sustainedUntil-retirementAge,
      wf,fedTax,effRate:effRate(annualInflAdj),margRate:margRate(annualInflAdj),
      annualInflAdj,grossNeeded,drawdownTimeline,
      potAtTarget,shortfallAtTarget,surplusAtTarget,
      hasSurplus:sustainedUntil>=targetSustainAge,deltaYears:sustainedUntil-targetSustainAge,
      ssAtRetireStart,ssReductionPct,
      safeGrowth, blendedGrowthPct: Math.round(blendedGrowth*1000)/10,
    };
  },[projectionData,retirementAge,currentAge,accounts,targetMonthlyIncome,inflation,
     ssClaimAge,ssAdjMonthly,ssFullMonthly,targetSustainAge,goGoEnd,slowGoEnd,goGoPct,slowGoPct,noGoPct,propertySales]);

  // ── Recommendations calc ──────────────────────────────────────────────
  const nonPrimary = accounts.filter(a=>!(a.isPrimary&&a.type==="property"));
  const recsCalc = useMemo(()=>{
    if(!retCalc) return null;
    const yrsToRetire = retirementAge - currentAge;
    const inflYrs     = yrsToRetire;
    const growth      = retCalc.safeGrowth || 0.06;
    const ssAtRetireNominal = ssClaimAge<=retirementAge
      ? ssAdjMonthly*12*Math.pow(1+SS_COLA, retirementAge-ssClaimAge)
      : ssAdjMonthly*12;
    const stageMultiplier = (age) => {
      const p = age<(goGoEnd||70)?(goGoPct||100):age<(slowGoEnd||80)?(slowGoPct||70):(noGoPct||50);
      return p/100;
    };
    const rentalAccs = accounts.filter(a=>a.type==="property"&&!a.isPrimary&&a.monthlyContribution>0);

    // Core sim — mirrors retCalc exactly. Returns pot balance at targetSustainAge.
    const sim = (startPot, grossNeeded) => {
      let pot = startPot;
      for(let age=retirementAge; age<=targetSustainAge; age++){
        const yr = age - retirementAge;
        const need = grossNeeded * Math.pow(1+inflation/100, yr) * stageMultiplier(age);
        let ss = 0;
        if(age >= ssClaimAge){
          const colaYrs = age - Math.max(retirementAge, ssClaimAge);
          const ssStart = ssClaimAge>=retirementAge
            ? ssAdjMonthly*12*Math.pow(1+inflation/100, ssClaimAge-currentAge)
            : ssAtRetireNominal;
          ss = ssStart * Math.pow(1+SS_COLA, colaYrs);
        }
        const rental = rentalAccs.reduce((s,a)=>{
          if(propertySales[a.id]?.saleAge && age>=propertySales[a.id].saleAge) return s;
          return s + a.monthlyContribution*12*Math.pow(1+inflation/100, inflYrs+yr);
        }, 0);
        pot = pot*(1+growth) - Math.max(0, need - ss - rental);
      }
      return pot;
    };

    const currentPot = retCalc.pot;

    // 1. requiredPot — binary search: minimum starting pot that survives to targetSustainAge
    let rLo=0, rHi=50000000;
    for(let i=0;i<50;i++){const m=(rLo+rHi)/2; sim(m,retCalc.grossNeeded)>=0?rHi=m:rLo=m;}
    const requiredPot = Math.round((rLo+rHi)/2);

    // 2. onTrack derived from requiredPot (consistent with the sim, not retCalc.hasSurplus)
    const onTrack   = currentPot >= requiredPot;
    const potGap    = Math.max(0, requiredPot - currentPot);
    const potSurplus= Math.max(0, currentPot - requiredPot);

    // 3. Extra monthly savings needed (FV of annuity to fill potGap)
    const blendedReturn = nonPrimary.length>0
      ? nonPrimary.filter(a=>a.type!=="property").reduce((s,a)=>s+a.annualReturn,0)
        / Math.max(1, nonPrimary.filter(a=>a.type!=="property").length) / 100
      : 0.07;
    const r=blendedReturn, n=yrsToRetire;
    const fvFactor = n>0&&r>0 ? (Math.pow(1+r,n)-1)/r : n;
    const extraMonthlyNeeded = potGap>0&&fvFactor>0 ? potGap/fvFactor/12 : 0;
    const extraAsSalaryPct   = earnings.grossIncome>0 ? extraMonthlyNeeded/(earnings.grossIncome/12)*100 : 0;
    const extraBonusNeeded   = potGap>0&&fvFactor>0 ? potGap/fvFactor : 0;
    const currentBonusAfterTax = earnings.bonusAmount*(1-earnings.bonusTaxRate/100);
    const extraBonusAsPct    = currentBonusAfterTax>0 ? extraBonusNeeded/currentBonusAfterTax*100 : 0;

    // 4. Earliest retire age and retire-age-to-meet-target
    let earliestRetireAge = null;
    for(let tryAge=currentAge+1; tryAge<=retirementAge; tryAge++){
      const row = projectionData.find(d=>d.age===tryAge);
      if(row && sim(row.nominal, retCalc.grossNeeded)>=0){earliestRetireAge=tryAge; break;}
    }
    let retireAgeToMeetTarget = retirementAge;
    if(!onTrack){
      for(let tryAge=retirementAge; tryAge<=80; tryAge++){
        const row = projectionData.find(d=>d.age===tryAge);
        if(row && sim(row.nominal, retCalc.grossNeeded)>=0){retireAgeToMeetTarget=tryAge; break;}
      }
    }
    const extraYearsWork = Math.max(0, retireAgeToMeetTarget-retirementAge);
    const newMonthlySavings = (earnings.grossIncome/12)*(earnings.savingsPct/100)+extraMonthlyNeeded;
    const newSavingsPct = earnings.grossIncome>0 ? newMonthlySavings/(earnings.grossIncome/12)*100 : 0;

    // 5. Max sustainable monthly spend (today's dollars, pre-tax)
    // Binary search: find monthly X where sim survives with grossNeeded = X*12*inflF + tax(X*12*inflF)
    const inflF = Math.pow(1+inflation/100, inflYrs);
    let spendLo=0, spendHi=50000; // monthly cap $50k
    for(let i=0;i<60;i++){
      const midMonthly = (spendLo+spendHi)/2;
      const annAdj = midMonthly * 12 * inflF;       // today->retirement year $
      const grossN = annAdj + calcTax(annAdj);      // add estimated tax
      sim(currentPot, grossN) >= 0 ? spendLo=midMonthly : spendHi=midMonthly;
    }
    const maxMonthlySpend = Math.round((spendLo+spendHi)/2);
    const maxAnnualSpend  = maxMonthlySpend * 12;

    return {
      requiredPot, currentPot, potGap, potSurplus, onTrack,
      extraMonthlyNeeded, extraAsSalaryPct,
      extraBonusNeeded, extraBonusAsPct,
      earliestRetireAge, retireAgeToMeetTarget, extraYearsWork,
      newSavingsPct: Math.min(100, newSavingsPct),
      blendedReturn: blendedReturn*100, yrsToRetire,
      maxAnnualSpend, maxMonthlySpend,
    };
  },[retCalc,retirementAge,currentAge,inflation,targetSustainAge,ssClaimAge,ssAdjMonthly,
     goGoEnd,slowGoEnd,goGoPct,slowGoPct,noGoPct,projectionData,accounts,earnings,nonPrimary,propertySales]);

  // ── Stat bar values ───────────────────────────────────────────────────
  const totalValue   = nonPrimary.reduce((s,a)=>s+a.balance,0);
  const totalContrib = nonPrimary.reduce((s,a)=>s+(effectiveContrib[a.id]||0),0);
  const projAtRetire = projectionData.find(d=>d.age===retirementAge)?.nominal||0;
  const ssIsEarly    = ssClaimAge<FULL_SS_AGE;
  const ssIsDelayed  = ssClaimAge>FULL_SS_AGE;

  // ── Style helpers ─────────────────────────────────────────────────────
  const inp = {background:"#1a1d27",border:"1px solid #2a2d3a",borderRadius:6,color:"#e2e8f0",padding:"7px 10px",fontSize:13,fontFamily:"inherit",width:"100%",outline:"none"};
  const sl  = {width:"100%",accentColor:"#3b82f6",cursor:"pointer"};
  const tb  = (t)=>({padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:activeTab===t?"#3b82f6":"transparent",color:activeTab===t?"#fff":"#64748b",transition:"all .2s",whiteSpace:"nowrap"});
  const TABS = ["portfolio","accounts","earnings","projections","retirement","planning","recommendations","rental","scenarios"];

  // ── Loading screen ────────────────────────────────────────────────────
  if(loading) return (
    <div style={{height:"100vh",width:"100vw",background:"#080a10",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Mono:wght@500&display=swap'); @keyframes load{0%{transform:translateX(-100%)}100%{transform:translateX(280%)}}`}</style>
      <div style={{fontSize:28,fontWeight:800,background:"linear-gradient(90deg,#60a5fa,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:20}}>WealthSim</div>
      <div style={{color:"#334155",fontSize:14}}>{isConfigured?"Fetching your portfolio from cloud…":"Loading…"}</div>
      <div style={{marginTop:16,width:200,height:3,background:"#1e2130",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",background:"linear-gradient(90deg,#3b82f6,#a78bfa)",borderRadius:2,animation:"load 1.5s ease-in-out infinite",width:"60%"}}/>
      </div>
    </div>
  );

  // ── Setup modal ───────────────────────────────────────────────────────
  const SetupModal = () => (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0f1117",border:"1px solid #2a2d3a",borderRadius:16,padding:28,maxWidth:480,width:"100%",fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{fontSize:18,fontWeight:800,color:"#e2e8f0",marginBottom:6}}>☁️ Set Up Cloud Sync</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:20,lineHeight:1.6}}>
          WealthSim uses <strong style={{color:"#60a5fa"}}>JSONBin.io</strong> for free cross-device storage.
          Your data lives in your own private bin — not shared with anyone.
        </div>
        <div style={{background:"#131520",border:"1px solid #1e2130",borderRadius:10,padding:16,marginBottom:20,fontSize:12,color:"#64748b",lineHeight:1.8}}>
          <div style={{fontWeight:700,color:"#94a3b8",marginBottom:8}}>Quick Setup (2 minutes):</div>
          <div>1. Go to <strong style={{color:"#60a5fa"}}>jsonbin.io</strong> → Sign up free</div>
          <div>2. Click your avatar → <strong style={{color:"#e2e8f0"}}>API Keys</strong> → copy your <strong style={{color:"#e2e8f0"}}>Master Key</strong></div>
          <div>3. Paste it below — WealthSim creates a bin automatically</div>
          <div style={{marginTop:8,color:"#475569"}}>✅ Free tier: 10,000 requests/month</div>
          <div style={{color:"#475569"}}>✅ Your data is private (bin is unlisted by default)</div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:5,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>JSONBin Master API Key *</label>
          <input style={{background:"#1a1d27",border:"1px solid #2a2d3a",borderRadius:6,color:"#e2e8f0",padding:"9px 12px",fontSize:13,fontFamily:"monospace",width:"100%",outline:"none"}}
            type="password" placeholder="$2a$10$..." value={setupApiKey} onChange={e=>setSetupApiKey(e.target.value)}/>
        </div>
        <div style={{marginBottom:18}}>
          <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:5,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>
            Existing Bin ID <span style={{color:"#334155",fontWeight:400,textTransform:"none"}}>(leave blank to create new)</span>
          </label>
          <input style={{background:"#1a1d27",border:"1px solid #2a2d3a",borderRadius:6,color:"#e2e8f0",padding:"9px 12px",fontSize:13,fontFamily:"monospace",width:"100%",outline:"none"}}
            placeholder="67a3f8... (paste if you already have one)" value={setupBinId} onChange={e=>setSetupBinId(e.target.value)}/>
          <div style={{fontSize:11,color:"#334155",marginTop:5}}>If reconnecting from another device, paste the Bin ID shown in your other device's sync card.</div>
        </div>
        {setupError && <div style={{background:"#1c0a0a",border:"1px solid #3f1a1a",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#f87171",marginBottom:14}}>⚠️ {setupError}</div>}
        <div style={{display:"flex",gap:10}}>
          <button className="btn btnp" style={{flex:1,padding:"10px"}} onClick={handleSetupConnect} disabled={setupStep==="creating"}>
            {setupStep==="creating"?"⟳ Connecting…":setupBinId.trim()?"Connect to Existing Bin":"Create New Bin & Connect"}
          </button>
          <button className="btn btng" style={{padding:"10px 16px"}} onClick={()=>{setShowSetup(false);setSetupStep("enter");setSetupError("");}}>Cancel</button>
        </div>
      </div>
    </div>
  );

  // ── Common props passed to all tabs ───────────────────────────────────
  const common = {
    accounts, nonPrimary, settings, earnings,
    totalValue, totalContrib, projAtRetire,
    currentAge, retirementAge, inflation, lifeExpectancy,
    targetSustainAge, targetMonthlyIncome, ssClaimAge, ssFullMonthly,
    salaryGrowthRate, goGoEnd, slowGoEnd, goGoPct, slowGoPct, noGoPct,
    ssAdjMonthly, ssIsEarly, ssIsDelayed,
    effectiveContrib, projectionData, retCalc, recsCalc,
    updateSettings, updateEarnings,
    inp, sl,
    // Earnings-derived values needed by EarningsTab
    monthlySavings, bonusAfterTax, bonusSaved,
    allocMap, bonusAllocMap, totalAllocPct, totalBonusAllocPct,
    earningsContribForYear, scenarioMult, scenarioAccIds, setScenarioAccIds,
    propertySales, setPropertySales,
    updAcc,
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <>
    {showSetup && <SetupModal />}
    <div style={{height:"100vh",width:"100vw",background:"#080a10",color:"#e2e8f0",fontFamily:"'DM Sans','Segoe UI',sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px;} ::-webkit-scrollbar-track{background:#0f1117;} ::-webkit-scrollbar-thumb{background:#2a2d3a;border-radius:3px;}
        input[type=range]{height:4px;} select option{background:#1a1d27;}
        .card{background:#0f1117;border:1px solid #1e2130;border-radius:12px;padding:14px;}
        .scard{background:linear-gradient(135deg,#0f1117 0%,#141620 100%);border:1px solid #1e2130;border-radius:12px;padding:14px;}
        .arow:hover{background:#131520!important;}
        .btn{cursor:pointer;border:none;border-radius:6px;font-family:inherit;font-size:13px;font-weight:600;padding:7px 14px;transition:all .15s;}
        .btnp{background:#3b82f6;color:white;} .btnp:hover{background:#2563eb;}
        .btns{background:#16a34a;color:white;} .btns:hover{background:#15803d;}
        .btnd{background:transparent;color:#ef4444;border:1px solid #3f1a1a;} .btnd:hover{background:#1c0a0a;}
        .btng{background:transparent;color:#64748b;border:1px solid #1e2130;} .btng:hover{background:#131520;color:#94a3b8;}
        .sbar{height:7px;border-radius:4px;overflow:hidden;background:#1e2130;}
        .tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
        .pmenu{position:absolute;top:calc(100% + 8px);right:0;background:#0f1117;border:1px solid #2a2d3a;border-radius:10px;min-width:230px;z-index:200;padding:6px;box-shadow:0 16px 40px rgba(0,0,0,.6);}
        .pmenu-item{padding:8px 12px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-size:13px;} .pmenu-item:hover{background:#1a1d27;}
        .chk{width:14px;height:14px;cursor:pointer;accentColor:#3b82f6;}
        @media(max-width:900px){.main-grid{grid-template-columns:1fr!important;} .stats-grid{grid-template-columns:1fr 1fr!important;}}
        @media(max-width:540px){.stats-grid{grid-template-columns:1fr!important;}}
      `}</style>

      {/* ── Header ── */}
      <div style={{background:"#0a0c14",borderBottom:"1px solid #1e2130",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,flexShrink:0,gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0,overflow:"hidden"}}>
          <h1 style={{fontSize:20,fontWeight:800,letterSpacing:"-0.03em",background:"linear-gradient(90deg,#60a5fa,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",flexShrink:0}}>WealthSim</h1>
          <div style={{display:"flex",gap:2,background:"#0f1117",border:"1px solid #1e2130",borderRadius:8,padding:3,overflowX:"auto"}}>
            {TABS.map(t=><button key={t} style={tb(t)} onClick={()=>setActiveTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <button className={`btn ${saveStatus==="saved"||saveStatus==="local"?"btns":saveStatus==="error"?"btnd":"btnp"}`}
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",fontSize:12}}
            onClick={handleSave} disabled={saveStatus==="saving"}>
            {saveStatus==="saving"?"⟳ Saving…":saveStatus==="saved"?"✓ Cloud Synced":saveStatus==="local"?"✓ Saved Locally":saveStatus==="error"?"✕ Failed":"💾 Save"}
          </button>
          {saveMsg && saveStatus!=="idle" && <span style={{fontSize:10,color:saveStatus==="error"?"#f87171":"#4ade80",maxWidth:160,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={saveMsg}>{saveMsg}</span>}
          {!isConfigured && saveStatus==="idle" && <button className="btn" style={{background:"#1a2a10",color:"#4ade80",border:"1px solid #2a4a20",fontSize:11,padding:"5px 10px"}} onClick={()=>setShowSetup(true)}>☁️ Setup Sync</button>}
          {lastSaved && saveStatus==="idle" && <span style={{fontSize:10,color:"#334155",whiteSpace:"nowrap"}}>{new Date(lastSaved).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
          {/* Profile menu */}
          <div style={{position:"relative"}} ref={profileMenuRef}>
            <button className="btn btng" style={{display:"flex",alignItems:"center",gap:7,fontSize:12}} onClick={()=>setShowProfileMenu(!showProfileMenu)}>
              <span style={{width:7,height:7,borderRadius:"50%",background:"#3b82f6",display:"inline-block"}}/>
              <span style={{maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeProfile}</span> ▾
            </button>
            {showProfileMenu&&(
              <div className="pmenu">
                <div style={{fontSize:10,color:"#334155",fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",padding:"4px 12px 8px"}}>Profiles</div>
                {Object.keys(profiles).map(name=>(
                  <div key={name} className="pmenu-item" style={{background:name===activeProfile?"#131a2e":"transparent"}} onClick={()=>{setActiveProfile(name);setShowProfileMenu(false);}}>
                    <span style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{width:7,height:7,borderRadius:"50%",background:name===activeProfile?"#3b82f6":"#334155"}}/>
                      <span style={{color:name===activeProfile?"#60a5fa":"#94a3b8"}}>{name}</span>
                    </span>
                    <span style={{display:"flex",gap:2}}>
                      <span title="Duplicate" style={{fontSize:12,color:"#475569",cursor:"pointer",padding:"2px 6px"}} onClick={e=>{e.stopPropagation();duplicateProfile(name);}}>⧉</span>
                      {Object.keys(profiles).length>1&&<span title="Delete" style={{fontSize:12,color:"#ef4444",cursor:"pointer",padding:"2px 6px"}} onClick={e=>{e.stopPropagation();deleteProfile(name);}}>✕</span>}
                    </span>
                  </div>
                ))}
                <div style={{borderTop:"1px solid #1e2130",marginTop:4,paddingTop:4}}>
                  {creatingProfile?(
                    <div style={{padding:"6px 8px",display:"flex",gap:6}}>
                      <input style={{...inp,flex:1,padding:"5px 8px",fontSize:12}} placeholder="Profile name" value={newProfileName} onChange={e=>setNewProfileName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createProfile()} autoFocus/>
                      <button className="btn btnp" style={{padding:"5px 10px"}} onClick={createProfile}>✓</button>
                      <button className="btn btng" style={{padding:"5px 8px"}} onClick={()=>{setCreatingProfile(false);setNewProfileName("");}}>✕</button>
                    </div>
                  ):(
                    <div className="pmenu-item" style={{color:"#3b82f6"}} onClick={()=>setCreatingProfile(true)}>+ New Profile</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat bar ── */}
      <div className="stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,padding:"8px 16px",flexShrink:0,borderBottom:"1px solid #1e2130"}}>
        {[
          {label:"Investable Net Worth",        value:fmtK(totalValue),     sub:"excl. primary residence",           color:"#60a5fa"},
          {label:"Monthly Contributions",       value:fmtK(totalContrib),   sub:`${fmtK(totalContrib*12)}/yr`,       color:"#4ade80"},
          {label:`Projected at ${retirementAge}`,value:fmtK(projAtRetire),  sub:"investable, nominal",               color:"#f59e0b"},
          {
            label:"vs Target Sustain Age",
            value:retCalc
              ? retCalc.deltaYears>=0
                ? retCalc.sustainedUntil>=130
                  ? `✅ Fully Funded`
                  : `+${retCalc.deltaYears}yr surplus`
                : `-${Math.abs(retCalc.deltaYears)}yr shortfall`
              : "—",
            sub:retCalc?retCalc.deltaYears>=0
              ?`Pot at age ${targetSustainAge}: ${fmtK(retCalc.surplusAtTarget)} · sustains to ${retCalc.sustainedUntil}`
              :`⚠️ Shortfall at age ${targetSustainAge}: ${fmtK(retCalc.shortfallAtTarget)}`:"",
            color:retCalc?.deltaYears>=0?"#4ade80":"#f87171"
          },
        ].map(s=>(
          <div key={s.label} className="scard" style={{padding:"10px 14px"}}>
            <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:17,fontWeight:700,color:s.color,fontFamily:"'DM Mono',monospace"}}>{s.value}</div>
            <div style={{color:"#334155",fontSize:11,marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{flex:1,overflow:"auto",padding:"14px 16px 24px"}}>

        {activeTab==="portfolio" && <PortfolioTab {...common}
          activeProfile={activeProfile} editingId={editingId} setEditingId={setEditingId}
          showAddForm={showAddForm} setShowAddForm={setShowAddForm}
          newAcc={newAcc} setNewAcc={setNewAcc} addAccount={addAccount} remAcc={remAcc}
          totalValue={totalValue} creds={creds} isConfigured={isConfigured} lastSaved={lastSaved}
          saveStatus={saveStatus} handleDisconnect={handleDisconnect} setShowSetup={setShowSetup}
          fieldLabel={fieldLabel}
        />}

        {activeTab==="accounts" && <AccountsTab {...common}
          reviewAccId={reviewAccId} setReviewAccId={setReviewAccId}
          simReturns={simReturns} setSimReturns={setSimReturns}
          simContribs={simContribs} setSimContribs={setSimContribs}
          COLORS={COLORS} ACCOUNT_TYPES={ACCOUNT_TYPES} TYPE_ICONS={{savings:"🏦",retirement:"🎯",investment:"📈",property:"🏠"}}
        />}

        {activeTab==="earnings" && <EarningsTab {...common}/>}

        {activeTab==="projections" && <ProjectionsTab {...common}/>}

        {activeTab==="retirement" && retCalc && <RetirementTab {...common}/>}

        {activeTab==="planning" && <PlanningTab {...common}/>}

        {activeTab==="recommendations" && recsCalc && <RecommendationsTab {...common}/>}

        {activeTab==="rental" && <RentalTab {...common}
          simReturns={simReturns} setSimReturns={setSimReturns}
        />}

        {activeTab==="scenarios" && <ScenariosTab {...common}
          scenarioMult={scenarioMult} setScenarioMult={setScenarioMult}
        />}

        <div style={{marginTop:16,textAlign:"center",color:"#1a1d27",fontSize:11}}>
          For illustrative purposes only — not financial advice. Tax estimates based on 2024 federal brackets (single filer). SS benefit adjustments per SSA rules. State taxes not included.
        </div>
      </div>
    </div>
    </>
  );
}
