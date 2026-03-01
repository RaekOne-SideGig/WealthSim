import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ACCOUNT_TYPES, COLORS, FULL_SS_AGE, SS_COLA, TYPE_ICONS, effRate, fmt, fmtK, margRate, pct } from "../utils.js";

// ── Shared chart tooltip ───────────────────────────────────────────────────
const CT = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:"#0a0c14",border:"1px solid #2a2d3a",borderRadius:8,padding:"10px 14px",fontSize:12}}>
      <div style={{color:"#94a3b8",marginBottom:5,fontWeight:600}}>Age {label}</div>
      {payload.slice(0,8).map(p=>(
        <div key={p.name} style={{color:p.color||"#fff",marginBottom:2,display:"flex",justifyContent:"space-between",gap:14}}>
          <span style={{opacity:.8}}>{p.name}</span><strong>{typeof p.value==="number"?("$"+(p.value>=1e6?(p.value/1e6).toFixed(2)+"m":p.value>=1e3?(p.value/1e3).toFixed(0)+"k":p.value.toFixed(0))):p.value}</strong>
        </div>
      ))}
    </div>
  );
};


export default function RetirementTab({retCalc, settings, accounts, nonPrimary, currentAge, retirementAge, ssAdjMonthly, ssFullMonthly, ssClaimAge, inflation, targetMonthlyIncome, lifeExpectancy, targetSustainAge, projectionData, ssIsEarly, updateSettings}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Top stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <div className="scard" style={{gridColumn:"span 2"}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div>
                    <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Retirement Pot at Age {retirementAge}</div>
                    <div style={{fontSize:30,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#f59e0b"}}>{fmtK(retCalc.pot)}</div>
                    <div style={{fontSize:12,color:"#334155",marginTop:4}}>Target: {fmt(targetMonthlyIncome)}/mo today · {fmt(retCalc.annualInflAdj/12)}/mo at retire</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>SWR</div>
                    <div style={{fontSize:26,fontWeight:800,fontFamily:"'DM Mono',monospace",color:retCalc.swr<=4?"#4ade80":retCalc.swr<=6?"#f59e0b":"#f87171"}}>{retCalc.swr.toFixed(2)}%</div>
                    <div style={{fontSize:11,color:"#334155"}}>{retCalc.swr<=4?"✅ Below 4% rule":"⚠️ Above 4% threshold"}</div>
                  </div>
                </div>
              </div>

              <div className="scard">
                <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Target Sustain Age Delta</div>
                <div style={{fontSize:26,fontWeight:800,fontFamily:"'DM Mono',monospace",color:retCalc.deltaYears>=0?"#4ade80":"#f87171"}}>
                  {retCalc.deltaYears>=0?`+${retCalc.deltaYears}`:`${retCalc.deltaYears}`} yrs
                </div>
                <div style={{fontSize:11,color:"#334155",marginTop:4}}>
                  {retCalc.hasSurplus
                    ?`✅ Surplus of ${fmtK(retCalc.surplusAtTarget)} at ${targetSustainAge}`
                    :`⚠️ Shortfall of ${fmtK(retCalc.shortfallAtTarget)} at ${targetSustainAge}`}
                </div>
              </div>
            </div>

            {/* SS panel */}
            <div className="card" style={{border:"1px solid #1a2a40"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#38bdf8",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>🛡️ Social Security Income Stream</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                {[
                  {l:"Full Benefit (67)",  v:fmt(ssFullMonthly)+"/mo",                                                          c:"#64748b"},
                  {l:"Your Claim Age",     v:`Age ${ssClaimAge}`,                                                                c:"#38bdf8"},
                  {l:"Adjusted Benefit",   v:fmt(ssAdjMonthly)+"/mo",                                                           c:"#38bdf8"},
                  {l:"Annual SS at Retire",v:fmt(retCalc.ssAtRetireStart)+"/yr",                                                c:"#4ade80"},
                  {l:"vs Full Benefit",    v:`${retCalc.ssReductionPct>=0?"+":""}${retCalc.ssReductionPct.toFixed(1)}%`,        c:retCalc.ssReductionPct>=0?"#4ade80":"#f87171"},
                  {l:"Lifetime Extra SS",  v:fmtK(ssAdjMonthly*12*(lifeExpectancy-ssClaimAge)),                                c:"#a78bfa"},
                ].map(s=>(
                  <div key={s.l} className="scard" style={{padding:"10px 12px"}}>
                    <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                  </div>
                ))}
              </div>
              {ssIsEarly&&(
                <div style={{background:"#1c0a0a",border:"1px solid #3f1a1a",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#f87171",marginTop:12}}>
                  ⚠️ <strong>Early Claim Impact:</strong> Claiming at {ssClaimAge} permanently reduces your monthly benefit by {Math.abs(retCalc.ssReductionPct).toFixed(1)}% compared to waiting until 67. Over {lifeExpectancy-ssClaimAge} years this costs approximately {fmtK(Math.abs(retCalc.ssReductionPct/100)*ssFullMonthly*12*(lifeExpectancy-ssClaimAge))} in lifetime benefits.
                </div>
              )}
            </div>

            {/* Tax impact */}
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>💸 Tax Impact at Retirement</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                {[
                  {l:"Monthly Target (today)",      v:fmt(targetMonthlyIncome),          c:"#60a5fa"},
                  {l:`Inflation-Adj at ${retirementAge}`, v:fmt(retCalc.annualInflAdj/12)+"/mo", c:"#f59e0b"},
                  {l:"Annual Federal Tax",          v:fmt(retCalc.fedTax),              c:"#f87171"},
                  {l:"Effective Rate",              v:`${retCalc.effRate.toFixed(1)}%`,  c:"#a78bfa"},
                  {l:"Gross Needed/yr",             v:fmt(retCalc.grossNeeded),          c:"#fb923c"},
                  {l:"Marginal Rate",               v:`${retCalc.margRate.toFixed(0)}%`, c:"#f87171"},
                ].map(s=>(
                  <div key={s.l} className="scard" style={{padding:"10px 12px"}}>
                    <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Waterfall */}
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>🪣 Drawdown Waterfall — Priority Order</div>
              <div style={{fontSize:12,color:"#334155",marginBottom:14}}>Income sources tapped in sequence before drawing down principal</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {retCalc.wf.steps.map((step,i)=>{
                  const p=retCalc.wf.target>0?step.amount/retCalc.wf.target*100:0;
                  return(
                    <div key={step.label} style={{background:"#131520",border:"1px solid #1e2130",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{background:step.color+"30",color:step.color,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4}}>{["SS","1st","2nd","3rd","4th"][i]}</span>
                          <span style={{fontSize:13,color:"#94a3b8"}}>{step.label}</span>
                        </div>
                        <div style={{display:"flex",gap:12,alignItems:"center"}}>
                          <span style={{fontSize:11,color:"#475569"}}>{p.toFixed(1)}% of target</span>
                          <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,color:step.amount>0?step.color:"#334155",fontSize:14}}>
                            {step.amount>0?fmtK(step.amount):"—"}
                          </span>
                        </div>
                      </div>
                      <div className="sbar"><div style={{width:`${p}%`,height:"100%",background:step.color,borderRadius:4,transition:"width .4s"}}/></div>
                    </div>
                  );
                })}
                {retCalc.wf.shortfall>0
                  ?<div style={{background:"#1c0a0a",border:"1px solid #3f1a1a",borderRadius:8,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:"#f87171",fontSize:13,fontWeight:600}}>⚠️ Annual Shortfall vs Target</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#f87171",fontSize:14}}>{fmtK(retCalc.wf.shortfall)}</span>
                   </div>
                  :<div style={{background:"#0a1c0a",border:"1px solid #1a3f1a",borderRadius:8,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:"#4ade80",fontSize:13,fontWeight:600}}>✅ Target fully covered by income streams</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#4ade80",fontSize:14}}>{fmt(targetMonthlyIncome)}/mo</span>
                   </div>}
              </div>
            </div>

            {/* Pot timeline */}
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>Pot Balance Through Retirement</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={retCalc.drawdownTimeline}>
                  <defs>
                    <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="age" stroke="#334155" tick={{fill:"#475569",fontSize:11}}/>
                  <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:11}} tickFormatter={fmtK} width={70}/>
                  <Tooltip content={<CT/>}/>
                  <Area type="monotone" dataKey="balance" name="Pot Balance" stroke="#f59e0b" fill="url(#dg)" strokeWidth={2.5} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Retire-age comparison */}
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>Retirement Age Comparison — tap to select</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:10}}>
                {[55,58,60,62,65,67,70].filter(a=>a>currentAge).map(rAge=>{
                  const row=projectionData.find(d=>d.age===rAge); if(!row) return null;
                  const pot=row.nominal, swr=pot>0?retCalc.grossNeeded/pot*100:999;
                  let aro=rAge, p=pot;
                  for(let a=rAge;a<=120;a++){
                    const yr=a-rAge;
                    const ss=a>=ssClaimAge?ssAdjMonthly*12*Math.pow(1+SS_COLA,a-ssClaimAge):0;
                    p=p*1.03-Math.max(0,retCalc.grossNeeded*Math.pow(1+inflation/100,yr)-ss);
                    if(p>0)aro=a; else break;
                  }
                  const delta=aro-targetSustainAge;
                  return(
                    <div key={rAge} style={{background:rAge===retirementAge?"#0e1a2e":"#131520",border:`1px solid ${rAge===retirementAge?"#3b82f6":"#1e2130"}`,borderRadius:8,padding:12,textAlign:"center",cursor:"pointer"}} onClick={()=>updateSettings("retirementAge",rAge)}>
                      <div style={{fontSize:18,fontWeight:800,color:"#60a5fa",fontFamily:"'DM Mono',monospace"}}>{rAge}</div>
                      <div style={{fontSize:9,color:"#334155",marginBottom:5}}>retire at</div>
                      <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0",fontFamily:"'DM Mono',monospace"}}>{fmtK(pot)}</div>
                      <div style={{fontSize:10,color:swr<=4?"#4ade80":"#f87171",marginTop:3,fontWeight:600}}>{swr.toFixed(1)}% SWR</div>
                      <div style={{fontSize:10,color:delta>=0?"#4ade80":"#f87171",marginTop:2,fontWeight:600}}>{delta>=0?`+${delta}yr`:`${delta}yr`} vs target</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
  );
}
