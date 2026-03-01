import { useState, useMemo } from "react";
import { fmt, fmtK, calcTax, calcFICA, calcTotalTaxMonthly } from "../utils.js";

const FIXED_CATEGORIES = [
  { id:"mortgage",   label:"Mortgage / Rent",      icon:"🏠", color:"#f59e0b" },
  { id:"utilities",  label:"Utilities & Energy",    icon:"⚡", color:"#38bdf8" },
  { id:"insurance",  label:"Insurance (all types)", icon:"🛡️", color:"#a78bfa" },
  { id:"groceries",  label:"Groceries",             icon:"🛒", color:"#4ade80" },
  { id:"transport",  label:"Transport / Car",       icon:"🚗", color:"#60a5fa" },
  { id:"healthcare", label:"Healthcare",            icon:"🏥", color:"#f87171" },
  { id:"childcare",  label:"Childcare / Education", icon:"👶", color:"#fb923c" },
  { id:"subscriptions",label:"Subscriptions",      icon:"📱", color:"#e879f9" },
  { id:"other_fixed",label:"Other Fixed",           icon:"📌", color:"#94a3b8" },
];

const VARIABLE_CATEGORIES = [
  { id:"dining",     label:"Dining Out / Takeout",  icon:"🍽️", color:"#f59e0b" },
  { id:"travel",     label:"Travel & Vacations",    icon:"✈️", color:"#38bdf8" },
  { id:"luxury",     label:"Luxury & Shopping",     icon:"💎", color:"#a78bfa" },
  { id:"hobbies",    label:"Hobbies & Entertainment",icon:"🎮", color:"#4ade80" },
  { id:"personal",   label:"Personal Care & Fitness",icon:"💪", color:"#60a5fa" },
  { id:"gifts",      label:"Gifts & Donations",     icon:"🎁", color:"#fb923c" },
  { id:"other_var",  label:"Other Variable",         icon:"🔀", color:"#94a3b8" },
];

const ALL_CATS = [...FIXED_CATEGORIES, ...VARIABLE_CATEGORIES];

export default function ExpensesTab({ expenses, setExpenses, earnings, currentAge, retirementAge, inflation, inp, monthlySavings }) {
  const [simMode, setSimMode] = useState(false);
  const [simReductions, setSimReductions] = useState({}); // {catId: reduced monthly amount}

  const grossAnnual   = earnings?.grossIncome || 0;
  const grossMonthly  = grossAnnual / 12;
  const partnerNet    = earnings?.partnerIncome || 0;
  // Fed tax + FICA (matches App.jsx monthlySavings formula exactly)
  const totalTaxMo    = calcTotalTaxMonthly(grossAnnual);
  const myNetMonthly  = grossMonthly - totalTaxMo;
  const combinedNet   = myNetMonthly + partnerNet;
  // netMonthly for display = combined net (before savings subtracted — savings shown separately)
  const netMonthly    = combinedNet;

  const items = expenses?.items || {};
  const setItem = (id, val) => setExpenses(p => ({ ...p, items: { ...(p?.items||{}), [id]: Math.max(0, parseFloat(val)||0) } }));

  const totalFixed    = FIXED_CATEGORIES.reduce((s,c)  => s + (items[c.id]||0), 0);
  const totalVariable = VARIABLE_CATEGORIES.reduce((s,c) => s + (items[c.id]||0), 0);
  const totalExpenses = totalFixed + totalVariable;

  const simTotal = simMode
    ? ALL_CATS.reduce((s,c) => s + Math.max(0, (items[c.id]||0) - (simReductions[c.id]||0)), 0)
    : totalExpenses;

  // monthlySaveable = what's actually being saved (from the earnings residual calc)
  const residual        = Math.max(0, combinedNet - (simMode ? simTotal : totalExpenses));
  const monthlySaveable = monthlySavings; // authoritative from App.jsx
  const annualSaveable  = monthlySaveable * 12;
  const savingsRate     = netMonthly > 0 ? (monthlySaveable / netMonthly * 100) : 0;
  const simSaved        = simMode ? (totalExpenses - simTotal) : 0;

  const yrsToRetire = Math.max(1, retirementAge - currentAge);
  const fvSavings   = annualSaveable > 0
    ? annualSaveable * ((Math.pow(1.07, yrsToRetire) - 1) / 0.07)
    : 0;

  const inflF = Math.pow(1 + (inflation||2.5)/100, yrsToRetire);

  const pieData = ALL_CATS.filter(c => (items[c.id]||0) > 0).map(c => ({
    ...c,
    amount: items[c.id] || 0,
    pct: totalExpenses > 0 ? ((items[c.id]||0) / totalExpenses * 100) : 0,
  })).sort((a,b) => b.amount - a.amount);

  const setSim = (id, val) => setSimReductions(p => ({ ...p, [id]: Math.max(0, parseFloat(val)||0) }));

  const budgetColor = savingsRate >= 20 ? "#4ade80" : savingsRate >= 10 ? "#f59e0b" : "#f87171";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* ── Header summary ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { l:"Monthly Net Income",   v:fmt(netMonthly),        c:"#4ade80",  sub:`after fed tax + FICA${partnerNet>0?" · incl. partner":""}`},
          { l:"Total Monthly Expenses",v:fmt(simMode?simTotal:totalExpenses), c: (simMode?simTotal:totalExpenses) > netMonthly ? "#f87171":"#f59e0b", sub: simMode ? `${fmt(totalExpenses)} before sim` : `${fmt(totalFixed)} fixed · ${fmt(totalVariable)} variable` },
          { l:"Monthly Saveable",     v:fmt(monthlySaveable),   c:budgetColor, sub:`${savingsRate.toFixed(1)}% savings rate` },
          { l:"Projected at Retire",  v:fmtK(fvSavings),        c:"#60a5fa",  sub:`at 7% return over ${yrsToRetire}yrs` },
        ].map(s=>(
          <div key={s.l} className="card">
            <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
            <div style={{fontSize:11,color:"#334155",marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:14 }}>
        {/* ── Expense inputs ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Fixed */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",letterSpacing:".06em"}}>📌 Fixed Expenses</div>
              <div style={{fontSize:12,color:"#f59e0b",fontFamily:"'DM Mono',monospace",fontWeight:700}}>{fmt(totalFixed)}/mo</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {FIXED_CATEGORIES.map(cat=>(
                <div key={cat.id} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16,flexShrink:0}}>{cat.icon}</span>
                  <div style={{flex:1}}>
                    <label style={{display:"block",fontSize:10,color:"#475569",marginBottom:3,fontWeight:700,textTransform:"uppercase"}}>{cat.label}</label>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:11,color:"#475569"}}>$</span>
                      <input style={{...inp,padding:"5px 8px",fontSize:13}} type="number" min="0" step="25"
                        value={items[cat.id]||""} placeholder="0"
                        onChange={e=>setItem(cat.id, e.target.value)}/>
                      <span style={{fontSize:10,color:"#334155"}}>/mo</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Variable */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:".06em"}}>🔀 Variable Expenses</div>
              <div style={{fontSize:12,color:"#a78bfa",fontFamily:"'DM Mono',monospace",fontWeight:700}}>{fmt(totalVariable)}/mo</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {VARIABLE_CATEGORIES.map(cat=>(
                <div key={cat.id} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16,flexShrink:0}}>{cat.icon}</span>
                  <div style={{flex:1}}>
                    <label style={{display:"block",fontSize:10,color:"#475569",marginBottom:3,fontWeight:700,textTransform:"uppercase"}}>{cat.label}</label>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:11,color:"#475569"}}>$</span>
                      <input style={{...inp,padding:"5px 8px",fontSize:13}} type="number" min="0" step="25"
                        value={items[cat.id]||""} placeholder="0"
                        onChange={e=>setItem(cat.id, e.target.value)}/>
                      <span style={{fontSize:10,color:"#334155"}}>/mo</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spending simulator */}
          <div className="card" style={{border:`1px solid ${simMode?"#a78bfa":"#1e2130"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:simMode?14:0}}>
              <div style={{fontSize:13,fontWeight:700,color:"#a78bfa"}}>✂️ Spending Reduction Simulator</div>
              <button className="btn" style={{background:simMode?"#2e1065":"transparent",border:`1px solid ${simMode?"#7c3aed":"#1e2130"}`,color:simMode?"#a78bfa":"#475569",padding:"4px 12px",fontSize:12}}
                onClick={()=>{setSimMode(!simMode);setSimReductions({});}}>
                {simMode?"Exit Sim":"Run Sim"}
              </button>
            </div>
            {simMode&&(
              <>
                <div style={{fontSize:11,color:"#475569",marginBottom:14}}>
                  Reduce each category to see the impact on your savings. Drag the sliders below zero to simulate cutting that expense.
                </div>
                {ALL_CATS.filter(c=>(items[c.id]||0)>0).map(cat=>{
                  const current = items[cat.id]||0;
                  const reduced = simReductions[cat.id]||0;
                  const newVal  = Math.max(0, current - reduced);
                  return (
                    <div key={cat.id} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,color:cat.color}}>{cat.icon} {cat.label}</span>
                        <span style={{fontSize:12,fontFamily:"'DM Mono',monospace"}}>
                          <span style={{color:"#475569",textDecoration:"line-through",marginRight:6}}>{fmt(current)}</span>
                          <span style={{color:newVal<current?"#4ade80":"#e2e8f0"}}>{fmt(newVal)}/mo</span>
                        </span>
                      </div>
                      <input type="range" style={{width:"100%",accentColor:cat.color}} min={0} max={current} step={10}
                        value={reduced}
                        onChange={e=>setSim(cat.id, e.target.value)}/>
                      {reduced>0&&<div style={{fontSize:10,color:"#4ade80"}}>Saving {fmt(reduced)}/mo · {fmt(reduced*12)}/yr</div>}
                    </div>
                  );
                })}
                <div style={{borderTop:"1px solid #1e2130",paddingTop:12,marginTop:4,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  {[
                    {l:"Monthly Saving",  v:fmt(simSaved),             c:"#4ade80"},
                    {l:"Annual Saving",   v:fmt(simSaved*12),           c:"#4ade80"},
                    {l:"New Savings Rate",v:`${Math.min(100,(netMonthly>0?(netMonthly-simTotal)/netMonthly*100:0)).toFixed(1)}%`, c:"#60a5fa"},
                  ].map(s=>(
                    <div key={s.l} style={{background:"#080e18",border:"1px solid #1e2130",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:10,color:"#475569",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>{s.l}</div>
                      <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right sidebar: breakdown ── */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Budget health */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>Budget Health</div>
            {netMonthly>0 ? (
              <>
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#94a3b8"}}>Expenses</span>
                    <span style={{fontSize:12,color:"#f87171",fontFamily:"'DM Mono',monospace"}}>{(Math.min(100,totalExpenses/netMonthly*100)).toFixed(1)}%</span>
                  </div>
                  <div className="sbar"><div style={{width:`${Math.min(100,totalExpenses/netMonthly*100)}%`,height:"100%",background:"#f87171",borderRadius:4}}/></div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#94a3b8"}}>Saveable</span>
                    <span style={{fontSize:12,color:budgetColor,fontFamily:"'DM Mono',monospace"}}>{savingsRate.toFixed(1)}%</span>
                  </div>
                  <div className="sbar"><div style={{width:`${Math.min(100,savingsRate)}%`,height:"100%",background:budgetColor,borderRadius:4}}/></div>
                </div>
                <div style={{fontSize:11,color:savingsRate>=20?"#4ade80":savingsRate>=10?"#f59e0b":"#f87171",marginTop:8,lineHeight:1.5}}>
                  {savingsRate>=20?"✅ Great savings rate! Aim to invest your surplus.":savingsRate>=10?"⚠️ Moderate savings rate. Look for cuts in variable spending.":"❌ Low savings rate. Consider reducing fixed and variable costs."}
                </div>
              </>
            ) : (
              <div style={{fontSize:12,color:"#475569"}}>Enter your income on the Earnings tab to see budget health.</div>
            )}
          </div>

          {/* Category breakdown */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>Breakdown by Category</div>
            {pieData.length===0
              ? <div style={{fontSize:12,color:"#334155"}}>Add expense amounts to see breakdown.</div>
              : pieData.map(c=>(
                <div key={c.id} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span style={{color:"#94a3b8"}}>{c.icon} {c.label}</span>
                    <span style={{color:c.color,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{fmt(c.amount)}</span>
                  </div>
                  <div className="sbar"><div style={{width:`${c.pct}%`,height:"100%",background:c.color,borderRadius:4,transition:"width .4s"}}/></div>
                </div>
              ))
            }
          </div>

          {/* Savings projection */}
          {monthlySaveable>0&&(
            <div className="card" style={{border:"1px solid #1a2a40",background:"#080e18"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#60a5fa",marginBottom:10,textTransform:"uppercase",letterSpacing:".06em"}}>💰 If You Invest Your Surplus</div>
              {[
                {l:`Value at retire (age ${retirementAge})`, v:fmtK(fvSavings), c:"#60a5fa"},
                {l:"Annual surplus to invest",               v:fmt(annualSaveable),  c:"#4ade80"},
                {l:"Monthly surplus",                        v:fmt(monthlySaveable), c:"#4ade80"},
              ].map(r=>(
                <div key={r.l} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:12,color:"#475569"}}>{r.l}</span>
                  <span style={{fontSize:12,color:r.c,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{r.v}</span>
                </div>
              ))}
              <div style={{fontSize:10,color:"#334155",marginTop:4}}>Assumes 7% annual return on invested surplus</div>
            </div>
          )}

          {/* 50/30/20 guide */}
          <div className="card" style={{background:"#0a0c14"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:10,textTransform:"uppercase",letterSpacing:".06em"}}>📐 50/30/20 Guide</div>
            {[
              {l:"Needs (50%)",    target:netMonthly*0.5, actual:totalFixed,    c:"#f59e0b"},
              {l:"Wants (30%)",   target:netMonthly*0.3, actual:totalVariable,  c:"#a78bfa"},
              {l:"Savings (20%)", target:netMonthly*0.2, actual:monthlySaveable,c:"#4ade80"},
            ].map(r=>(
              <div key={r.l} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{color:"#94a3b8"}}>{r.l}</span>
                  <span style={{color:r.actual>=r.target?r.c:"#f87171",fontFamily:"'DM Mono',monospace"}}>
                    {fmt(r.actual)} / {fmt(r.target)}
                  </span>
                </div>
                <div className="sbar">
                  <div style={{width:`${Math.min(100,netMonthly>0?r.actual/netMonthly*100:0)}%`,height:"100%",background:r.c,borderRadius:4,transition:"width .4s",opacity:0.7}}/>
                  <div style={{position:"relative",marginTop:-7,marginLeft:`${netMonthly>0?Math.min(100,r.target/netMonthly*100):0}%`,width:1,height:7,background:"#e2e8f0",opacity:0.4}}/>
                </div>
              </div>
            ))}
            <div style={{fontSize:10,color:"#334155",marginTop:4}}>Target lines show 50/30/20 benchmarks of your net income.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
