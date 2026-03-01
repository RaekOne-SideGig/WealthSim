import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ACCOUNT_TYPES, COLORS, FULL_SS_AGE, SS_COLA, TYPE_ICONS, fmt, fmtK, pct } from "../utils.js";

const TIPS = {
  balance:             "Current balance or market value of this account today.",
  annualReturn:        "Expected average annual return (%). Savings: use APY (3–5% for HYSA). Investments: historical avg ~7–10% for index funds. Property: expected annual appreciation %.",
  monthlyContribution: "Fixed monthly amount contributed directly from your pocket. Salary-based allocations are set on the Earnings tab and added on top of this.",
  rentalInvestReturn:  "Annual return earned on accumulated net rental cashflow when reinvested. Use your savings or brokerage rate (e.g. 4.5%).",
  currentAge:          "Your current age — the starting point for all projections.",
  retirementAge:       "Age at which you stop working. Contributions stop and drawdown begins.",
  lifeExpectancy:      "How far the projection charts run. Does not affect the target sustain age calculation.",
  targetSustainAge:    "The age your pot must last to. The stat bar turns green when your pot survives to this age. This is the key planning target.",
  inflation:           "Annual inflation rate applied to future spending. US average ~3%. Higher inflation means you need a larger pot.",
  salaryGrowthRate:    "How much your gross salary grows per year. Compounds your earnings-based contributions over time.",
  targetMonthlyIncome: "Monthly spending target in retirement, in today's dollars (pre-tax). Federal tax is estimated and added on top by the model.",
  ssFullMonthly:       "Your estimated Social Security benefit at full retirement age (67). Check your personal estimate at ssa.gov.",
  ssClaimAge:          "Age you plan to claim Social Security. Before 67: permanent reduction up to −30% at age 62. After 67: +8%/yr up to age 70.",
};

function Tip({ k }) {
  const [show, setShow] = useState(false);
  if (!TIPS[k]) return null;
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 4 }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 13, height: 13, borderRadius: "50%", background: "#1e2130",
          color: "#475569", fontSize: 9, fontWeight: 700, cursor: "help", flexShrink: 0,
        }}>?</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 9999,
          background: "#0f1117", border: "1px solid #2a2d3a", borderRadius: 8,
          padding: "8px 12px", fontSize: 11, color: "#94a3b8", lineHeight: 1.5,
          width: 230, boxShadow: "0 4px 20px rgba(0,0,0,.8)", pointerEvents: "none",
        }}>
          {TIPS[k]}
        </div>
      )}
    </span>
  );
}

export default function PortfolioTab({accounts, nonPrimary, totalValue, effectiveContrib, earnings, retCalc, ssAdjMonthly, activeProfile, editingId, setEditingId, showAddForm, setShowAddForm, newAcc, setNewAcc, addAccount, updAcc, remAcc, updateSettings, inp, sl, creds, isConfigured, lastSaved, saveStatus, handleDisconnect, setShowSetup, currentAge, retirementAge, inflation, lifeExpectancy, targetSustainAge, targetMonthlyIncome, ssFullMonthly, ssClaimAge, salaryGrowthRate, ssIsEarly, ssIsDelayed, fieldLabel}) {
  return (
    <div className="main-grid" style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em"}}>Accounts — {activeProfile}</div>
          <button className="btn btnp" onClick={()=>setShowAddForm(!showAddForm)}>+ Add Account</button>
        </div>

        {accounts.some(a=>a.isPrimary&&a.type==="property")&&(
          <div style={{background:"#130d1f",border:"1px solid #2a1f40",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#c084fc",marginBottom:10,display:"flex",gap:8,alignItems:"center"}}>
            🏠 <strong>Primary Residence</strong> is tracked here for reference but <strong>excluded from all projections, drawdowns, and contribution totals</strong>.
          </div>
        )}

        {showAddForm&&(
          <div className="card" style={{marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>New Account</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              {[
                {l:"Name",                                                                         tk:null,                    f:"name",     tp:"text"},
                {l:fieldLabel(newAcc.type,"balance",newAcc.isPrimary),                            tk:"balance",               f:"balance",  tp:"number"},
                {l:fieldLabel(newAcc.type,"annualReturn",newAcc.isPrimary),                       tk:"annualReturn",          f:"annualReturn",tp:"number",st:"0.1"},
                ...(newAcc.type==="property"&&newAcc.isPrimary?[]:[{l:fieldLabel(newAcc.type,"monthlyContribution",newAcc.isPrimary)||"Monthly Contribution ($)", tk:"monthlyContribution", f:"monthlyContribution",tp:"number"}]),
                ...(newAcc.type==="property"&&!newAcc.isPrimary?[{l:"Rental Cash Invested Return %",tk:"rentalInvestReturn",f:"rentalInvestReturn",tp:"number",st:"0.1"}]:[]),
              ].filter(x=>x.l).map(x=>(
                <div key={x.f}>
                  <label style={{display:"flex",alignItems:"center",fontSize:10,color:"#475569",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>
                    {x.l}<Tip k={x.tk}/>
                  </label>
                  {x.f==="name"
                    ? <input style={inp} value={newAcc.name} onChange={e=>setNewAcc(p=>({...p,name:e.target.value}))} placeholder="Account name"/>
                    : <input style={inp} type={x.tp} step={x.st} value={newAcc[x.f]} onChange={e=>setNewAcc(p=>({...p,[x.f]:parseFloat(e.target.value)||0}))}/>
                  }
                </div>
              ))}
              <div>
                <label style={{display:"block",fontSize:10,color:"#475569",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>Type</label>
                <select style={inp} value={newAcc.type} onChange={e=>setNewAcc(p=>({...p,type:e.target.value,isPrimary:false}))}>
                  {ACCOUNT_TYPES.map(t=><option key={t} value={t}>{TYPE_ICONS[t]} {t==="retirement"?"Retirement Account":t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              {newAcc.type==="property"&&(
                <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:20}}>
                  <input className="chk" type="checkbox" id="prim-new" checked={newAcc.isPrimary} onChange={e=>setNewAcc(p=>({...p,isPrimary:e.target.checked}))}/>
                  <label htmlFor="prim-new" style={{fontSize:12,color:"#c084fc",cursor:"pointer"}}>Primary Residence (excluded from simulations)</label>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btnp" onClick={addAccount}>Add</button>
              <button className="btn btng" onClick={()=>setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {accounts.map(acc=>(
            <div key={acc.id} className="arow" style={{
              background:"#0f1117",
              border:`1px solid ${editingId===acc.id?"#22c55e":acc.isPrimary?"#2a1f40":"#1e2130"}`,
              borderRadius:10,padding:14,transition:"border-color .2s",
              opacity:acc.isPrimary&&acc.type==="property"?0.75:1
            }}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:acc.color,flexShrink:0}}/>
                  <span style={{fontSize:14,fontWeight:600}}>{TYPE_ICONS[acc.type]} {acc.name}</span>
                  {acc.isPrimary
                    ?<span className="tag" style={{background:"#1a1527",color:"#c084fc"}}>🏠 Primary · Excluded</span>
                    :<span className="tag" style={{background:"#1a1d27",color:"#64748b"}}>{acc.type==="retirement"?"401k/IRA":acc.type}</span>
                  }
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontWeight:700,color:acc.color,fontSize:14}}>{fmtK(acc.balance)}</div>
                    <div style={{color:"#334155",fontSize:11}}>
                      {acc.isPrimary&&acc.type==="property"?"Not counted in projections"
                        :acc.type==="property"?`${fmt(acc.monthlyContribution)}/mo rent · ${acc.annualReturn}% growth`
                        :`${fmt(effectiveContrib[acc.id]||0)}/mo · ${acc.annualReturn}%`}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {editingId===acc.id
                      ? <button
                          title="Save & close editor"
                          onClick={()=>setEditingId(null)}
                          style={{
                            padding:"5px 14px",background:"#14532d",border:"1px solid #22c55e",
                            color:"#4ade80",fontWeight:900,fontSize:17,borderRadius:6,
                            cursor:"pointer",lineHeight:1,transition:"background .15s"
                          }}>✓</button>
                      : <button className="btn btng" style={{padding:"4px 10px"}} onClick={()=>setEditingId(acc.id)}>Edit</button>
                    }
                    <button className="btn btnd" style={{padding:"4px 9px"}} onClick={()=>remAcc(acc.id)}>✕</button>
                  </div>
                </div>
              </div>

              {editingId===acc.id&&(
                <div style={{marginTop:12}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    {[
                      {l:"Name",                                                               tk:null,                    f:"name",                tp:"text"},
                      {l:fieldLabel(acc.type,"balance",acc.isPrimary),                        tk:"balance",               f:"balance",             tp:"number"},
                      {l:fieldLabel(acc.type,"annualReturn",acc.isPrimary),                   tk:"annualReturn",          f:"annualReturn",        tp:"number",st:"0.1"},
                      ...(acc.type==="property"&&acc.isPrimary?[]:[{l:fieldLabel(acc.type,"monthlyContribution",acc.isPrimary), tk:"monthlyContribution", f:"monthlyContribution",tp:"number"}]),
                      ...(acc.type==="property"&&!acc.isPrimary?[{l:"Rental Cash Invested Return %",tk:"rentalInvestReturn",f:"rentalInvestReturn",tp:"number",st:"0.1"}]:[]),
                    ].filter(x=>x.l).map(x=>(
                      <div key={x.f}>
                        <label style={{display:"flex",alignItems:"center",fontSize:10,color:"#475569",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>
                          {x.l}<Tip k={x.tk}/>
                        </label>
                        <input style={inp} type={x.tp} step={x.st||"1"} value={acc[x.f]??""} onChange={e=>updAcc(acc.id,x.f,e.target.value)}/>
                      </div>
                    ))}
                    {acc.type==="property"&&(
                      <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:20}}>
                        <input className="chk" type="checkbox" id={`prim-${acc.id}`} checked={!!acc.isPrimary} onChange={e=>updAcc(acc.id,"isPrimary",e.target.checked)}/>
                        <label htmlFor={`prim-${acc.id}`} style={{fontSize:12,color:"#c084fc",cursor:"pointer"}}>Primary Residence</label>
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:10,color:"#334155",marginTop:8}}>
                    Changes apply immediately to all projections. Press <span style={{color:"#4ade80",fontWeight:700}}>✓</span> to close.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>Investable Allocation</div>
          {nonPrimary.map(acc=>{
            const p=totalValue>0?acc.balance/totalValue*100:0;
            return(
              <div key={acc.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                  <span style={{color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%"}}>{acc.name}</span>
                  <span style={{color:acc.color,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{p.toFixed(1)}%</span>
                </div>
                <div className="sbar"><div style={{width:`${p}%`,height:"100%",background:acc.color,borderRadius:4,transition:"width .4s"}}/></div>
              </div>
            );
          })}
        </div>

        {/* Global Params */}
        <div className="card">
          <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>Global Parameters</div>
          {[
            {label:"Current Age",       key:"currentAge",       tk:"currentAge",       value:currentAge,       min:18,max:80},
            {label:"Retirement Age",    key:"retirementAge",    tk:"retirementAge",    value:retirementAge,    min:50,max:80},
            {label:"Life Expectancy",   key:"lifeExpectancy",   tk:"lifeExpectancy",   value:lifeExpectancy,   min:70,max:110},
            {label:"Target Sustain Age",key:"targetSustainAge", tk:"targetSustainAge", value:targetSustainAge, min:70,max:115},
            {label:"Inflation %",       key:"inflation",        tk:"inflation",        value:inflation,        min:0, max:10,step:0.5},
          ].map(p=>(
            <div key={p.key} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <label style={{display:"flex",alignItems:"center",fontSize:12,color:p.key==="targetSustainAge"?"#38bdf8":"#64748b"}}>
                  {p.label}<Tip k={p.tk}/>
                </label>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:p.key==="targetSustainAge"?"#38bdf8":"#60a5fa",fontFamily:"'DM Mono',monospace"}}>{p.value}{p.key==="inflation"?"%":""}</span>
                  {p.key==="targetSustainAge"&&retCalc&&(
                    <span style={{fontSize:10,fontWeight:700,color:retCalc.deltaYears>=0?"#4ade80":"#f87171"}}>
                      {retCalc.deltaYears>=0?`+${retCalc.deltaYears}yr`:`${retCalc.deltaYears}yr`}
                    </span>
                  )}
                </div>
              </div>
              <input type="range" style={{...sl,accentColor:p.key==="targetSustainAge"?"#38bdf8":"#3b82f6"}} min={p.min} max={p.max} step={p.step||1} value={p.value} onChange={e=>updateSettings(p.key,parseFloat(e.target.value))}/>
            </div>
          ))}

          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <label style={{display:"flex",alignItems:"center",fontSize:12,color:"#4ade80"}}>
                💼 Annual Salary Growth<Tip k="salaryGrowthRate"/>
              </label>
              <span style={{fontSize:13,fontWeight:700,color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{(salaryGrowthRate||0).toFixed(1)}%/yr</span>
            </div>
            <input type="range" style={{...sl,accentColor:"#4ade80"}} min={0} max={10} step={0.5} value={salaryGrowthRate||0} onChange={e=>updateSettings("salaryGrowthRate",parseFloat(e.target.value))}/>
            <div style={{fontSize:10,color:"#334155",marginTop:3}}>
              Salary at retire ({retirementAge}): <span style={{color:"#4ade80",fontWeight:600}}>{fmt(earnings.grossIncome*Math.pow(1+(salaryGrowthRate||0)/100,retirementAge-currentAge))}/yr</span>
            </div>
          </div>

          <div style={{borderTop:"1px solid #1e2130",paddingTop:12,marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <label style={{display:"flex",alignItems:"center",fontSize:12,color:"#f59e0b",fontWeight:600}}>
                🎯 Target Monthly Pull<Tip k="targetMonthlyIncome"/>
              </label>
              <span style={{fontSize:13,fontWeight:700,color:"#f59e0b",fontFamily:"'DM Mono',monospace"}}>{fmt(targetMonthlyIncome)}</span>
            </div>
            <input type="range" style={{...sl,accentColor:"#f59e0b"}} min={1000} max={30000} step={250} value={targetMonthlyIncome} onChange={e=>updateSettings("targetMonthlyIncome",parseInt(e.target.value))}/>
          </div>

          <div style={{borderTop:"1px solid #1e2130",paddingTop:12,marginTop:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <label style={{fontSize:12,color:"#38bdf8",fontWeight:700}}>🛡️ Social Security</label>
              <span className="tag" style={{background:ssIsEarly?"#1c0a0a":ssIsDelayed?"#0a1c0a":"#0a1020",color:ssIsEarly?"#f87171":ssIsDelayed?"#4ade80":"#38bdf8"}}>
                {ssIsEarly?"Early Draw":ssIsDelayed?"Delayed Credits":"Full Benefit"}
              </span>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <label style={{display:"flex",alignItems:"center",fontSize:12,color:"#64748b"}}>Full Benefit (age 67)<Tip k="ssFullMonthly"/></label>
                <span style={{fontSize:12,fontWeight:700,color:"#38bdf8",fontFamily:"'DM Mono',monospace"}}>{fmt(ssFullMonthly)}/mo</span>
              </div>
              <input type="range" style={{...sl,accentColor:"#38bdf8"}} min={500} max={5000} step={50} value={ssFullMonthly} onChange={e=>updateSettings("ssFullMonthly",parseInt(e.target.value))}/>
            </div>
            <div style={{marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <label style={{display:"flex",alignItems:"center",fontSize:12,color:"#64748b"}}>Claim Age<Tip k="ssClaimAge"/></label>
                <span style={{fontSize:12,fontWeight:700,color:"#38bdf8",fontFamily:"'DM Mono',monospace"}}>Age {ssClaimAge}</span>
              </div>
              <input type="range" style={{...sl,accentColor:"#38bdf8"}} min={62} max={70} step={1} value={ssClaimAge} onChange={e=>updateSettings("ssClaimAge",parseInt(e.target.value))}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#334155",marginTop:3}}><span>62 (early)</span><span>67 (full)</span><span>70 (max)</span></div>
            </div>
            <div style={{background:ssIsEarly?"#1c0a0a":"#0a1020",border:`1px solid ${ssIsEarly?"#3f1a1a":"#1a2a40"}`,borderRadius:8,padding:"8px 12px",fontSize:12}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#64748b"}}>Adjusted benefit:</span>
                <span style={{color:"#38bdf8",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmt(ssAdjMonthly)}/mo</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span style={{color:"#64748b"}}>vs full benefit:</span>
                <span style={{color:ssIsEarly?"#f87171":ssIsDelayed?"#4ade80":"#64748b",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>
                  {retCalc?.ssReductionPct>=0?"+":""}{retCalc?.ssReductionPct?.toFixed(1)}%
                </span>
              </div>
              {ssIsEarly&&<div style={{color:"#f87171",fontSize:10,marginTop:6}}>⚠️ Early claim permanently reduces your benefit by up to 30%</div>}
              {ssIsDelayed&&<div style={{color:"#4ade80",fontSize:10,marginTop:6}}>✅ Delayed credits add 8%/yr above full benefit (capped at 70)</div>}
            </div>
          </div>
        </div>

        <div className="card" style={{background:"#0a0f1a",border:`1px solid ${isConfigured?"#1a4030":"#1a2540"}`}}>
          <div style={{fontSize:10,color:isConfigured?"#4ade80":"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>
            {isConfigured?"☁️ Cloud Sync Active":"💾 Local Only — No Cross-Device Sync"}
          </div>
          {isConfigured ? (
            <div>
              <div style={{fontSize:12,color:"#334155",marginBottom:6}}>Syncing to JSONBin. Press Save to push changes to all devices.</div>
              <div style={{fontSize:10,color:"#1e3a5f",fontFamily:"monospace",wordBreak:"break-all",marginBottom:8}}>Bin: {creds.binId}</div>
              {lastSaved && <div style={{fontSize:11,color:"#1e3a5f",marginBottom:8}}>Last synced: {new Date(lastSaved).toLocaleString()}</div>}
              <button className="btn btng" style={{fontSize:11,padding:"4px 10px"}} onClick={handleDisconnect}>Disconnect</button>
            </div>
          ) : (
            <div>
              <div style={{fontSize:12,color:"#334155",marginBottom:8}}>To sync across phone &amp; PC, set up a free JSONBin account.</div>
              {lastSaved && <div style={{fontSize:11,color:"#1e3a5f",marginBottom:8}}>Last local save: {new Date(lastSaved).toLocaleString()}</div>}
              <button className="btn btnp" style={{fontSize:11,padding:"5px 12px"}} onClick={()=>setShowSetup(true)}>☁️ Set Up Cloud Sync</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
