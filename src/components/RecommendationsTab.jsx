import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { fmt, fmtK, pct, COLORS, ACCOUNT_TYPES, TYPE_ICONS, FULL_SS_AGE, SS_COLA } from "../utils.js";

export default function RecommendationsTab({recsCalc, retCalc, settings, earnings, projectionData, currentAge, retirementAge, targetSustainAge, targetMonthlyIncome, inflation, accounts}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* ── Status hero ── */}
            <div style={{background:recsCalc.onTrack?"#0a1c0a":"#1c0a0a",border:`1px solid ${recsCalc.onTrack?"#1a4020":"#4a1a1a"}`,borderRadius:14,padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
              <div>
                <div style={{fontSize:22,fontWeight:800,color:recsCalc.onTrack?"#4ade80":"#f87171",marginBottom:6}}>
                  {recsCalc.onTrack?"✅ On Track":"⚠️ Gap Identified"}
                </div>
                <div style={{fontSize:13,color:"#94a3b8",maxWidth:500,lineHeight:1.6}}>
                  {recsCalc.onTrack
                    ?`Your current plan sustains to age ${targetSustainAge} with a surplus of ${fmtK(recsCalc.potSurplus)}. You have ${recsCalc.extraYearsWork===0?"flexibility to retire earlier or spend more.":"headroom."}`
                    :`To sustain spending to age ${targetSustainAge}, your pot at retirement needs to be ${fmtK(recsCalc.requiredPot)}, but you're currently projected to have ${fmtK(recsCalc.currentPot)}. Below are three ways to close the gap.`}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
                  {recsCalc.onTrack?"Surplus at target age":"Gap to close"}
                </div>
                <div style={{fontSize:32,fontWeight:800,fontFamily:"'DM Mono',monospace",color:recsCalc.onTrack?"#4ade80":"#f87171"}}>
                  {fmtK(recsCalc.onTrack?recsCalc.potSurplus:recsCalc.potGap)}
                </div>
                <div style={{fontSize:11,color:"#475569",marginTop:4}}>
                  Need {fmtK(recsCalc.requiredPot)} · Have {fmtK(recsCalc.currentPot)}
                </div>
              </div>
            </div>

            {/* ── Key numbers ── */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[
                {l:"Required Pot at Retire",  v:fmtK(recsCalc.requiredPot),           c:"#60a5fa", sub:"to sustain to target age"},
                {l:"Projected Pot",           v:fmtK(recsCalc.currentPot),            c:recsCalc.onTrack?"#4ade80":"#f87171", sub:`at age ${retirementAge}`},
                {l:"Sustains Until",          v:`Age ${retCalc.sustainedUntil}`,       c:retCalc.sustainedUntil>=targetSustainAge?"#4ade80":"#f87171", sub:`target is ${targetSustainAge}`},
                {l:"Blended Return",          v:`${recsCalc.blendedReturn.toFixed(1)}%`,c:"#a78bfa", sub:"avg across accounts"},
              ].map(s=>(
                <div key={s.l} className="scard">
                  <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>{s.l}</div>
                  <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#334155",marginTop:3}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Three paths ── */}
            {!recsCalc.onTrack&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>

                {/* Path 1: Save more from salary */}
                <div className="card" style={{border:"1px solid #1a3040"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#60a5fa",marginBottom:4}}>💼 Path 1 — Save More from Salary</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:16,lineHeight:1.6}}>Increase your monthly savings rate to close the gap over your remaining {recsCalc.yrsToRetire} working years.</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {[
                      {l:"Extra needed/mo",        v:fmt(recsCalc.extraMonthlyNeeded),                             c:"#f87171"},
                      {l:"As % of gross salary",   v:`${recsCalc.extraAsSalaryPct.toFixed(1)}% of monthly gross`,  c:"#f87171"},
                      {l:"Current savings rate",   v:`${earnings.savingsPct}% (${fmt((earnings.grossIncome/12)*(earnings.savingsPct/100))}/mo)`, c:"#64748b"},
                      {l:"New savings rate needed",v:`${recsCalc.newSavingsPct.toFixed(1)}% (${fmt((earnings.grossIncome/12)*(recsCalc.newSavingsPct/100))}/mo)`, c:"#4ade80"},
                    ].map(r=>(
                      <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 0",borderBottom:"1px solid #131520",gap:8}}>
                        <span style={{fontSize:11,color:"#64748b",flex:1}}>{r.l}</span>
                        <span style={{fontSize:12,fontWeight:700,color:r.c,fontFamily:"'DM Mono',monospace",textAlign:"right"}}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:14,background:"#0a1020",border:"1px solid #1a2a40",borderRadius:8,padding:"10px 12px",fontSize:11,color:"#475569",lineHeight:1.6}}>
                    💡 Go to <strong style={{color:"#60a5fa"}}>Earnings → Monthly Salary Savings Allocation</strong> and increase your savings rate slider to {recsCalc.newSavingsPct.toFixed(0)}%.
                  </div>
                </div>

                {/* Path 2: Higher bonus savings */}
                <div className="card" style={{border:"1px solid #2a1a00"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#f59e0b",marginBottom:4}}>🎁 Path 2 — Redirect More Bonus</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:16,lineHeight:1.6}}>Save a larger portion of your annual bonus each year instead of spending it.</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {[
                      {l:"Extra bonus to save/yr",   v:fmt(recsCalc.extraBonusNeeded),                                                 c:"#f87171"},
                      {l:"As % of after-tax bonus",  v:`${Math.min(100,recsCalc.extraBonusAsPct).toFixed(1)}% of after-tax bonus`,     c:"#f87171"},
                      {l:"Current bonus saved",      v:`${earnings.bonusSavePct}% (${fmt(earnings.bonusAmount*(1-earnings.bonusTaxRate/100)*(earnings.bonusSavePct/100))}/yr)`, c:"#64748b"},
                      {l:"New bonus save % needed",  v:`${Math.min(100,earnings.bonusSavePct+recsCalc.extraBonusAsPct).toFixed(0)}%`,  c:"#4ade80"},
                    ].map(r=>(
                      <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 0",borderBottom:"1px solid #131520",gap:8}}>
                        <span style={{fontSize:11,color:"#64748b",flex:1}}>{r.l}</span>
                        <span style={{fontSize:12,fontWeight:700,color:r.c,fontFamily:"'DM Mono',monospace",textAlign:"right"}}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:14,background:"#0f0a00",border:"1px solid #2a1a00",borderRadius:8,padding:"10px 12px",fontSize:11,color:"#475569",lineHeight:1.6}}>
                    💡 Go to <strong style={{color:"#f59e0b"}}>Earnings → Annual Bonus Savings</strong> and increase the save % slider to {Math.min(100,earnings.bonusSavePct+recsCalc.extraBonusAsPct).toFixed(0)}%.
                  </div>
                </div>

                {/* Path 3: Work longer */}
                <div className="card" style={{border:"1px solid #1a2a10"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#4ade80",marginBottom:4}}>📅 Path 3 — Retire Later</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:16,lineHeight:1.6}}>Keep everything the same but delay retirement — more years of contributions and a shorter drawdown period.</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {[
                      {l:"Current retirement age",   v:`Age ${retirementAge}`,                         c:"#64748b"},
                      {l:"Retire age to meet target",v:`Age ${recsCalc.retireAgeToMeetTarget}`,        c:"#4ade80"},
                      {l:"Extra years of work",      v:`${recsCalc.extraYearsWork} yr${recsCalc.extraYearsWork!==1?"s":""}`, c:"#f87171"},
                      {l:"Pot at that age",          v:fmtK(projectionData.find(d=>d.age===recsCalc.retireAgeToMeetTarget)?.nominal||0), c:"#4ade80"},
                    ].map(r=>(
                      <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 0",borderBottom:"1px solid #131520",gap:8}}>
                        <span style={{fontSize:11,color:"#64748b",flex:1}}>{r.l}</span>
                        <span style={{fontSize:12,fontWeight:700,color:r.c,fontFamily:"'DM Mono',monospace",textAlign:"right"}}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:14,background:"#0a1000",border:"1px solid #1a2a10",borderRadius:8,padding:"10px 12px",fontSize:11,color:"#475569",lineHeight:1.6}}>
                    💡 Go to <strong style={{color:"#4ade80"}}>Portfolio → Global Parameters</strong> and move Retirement Age to {recsCalc.retireAgeToMeetTarget}.
                  </div>
                </div>
              </div>
            )}

            {/* ── On track bonuses ── */}
            {recsCalc.onTrack&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div className="card" style={{border:"1px solid #1a4020"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#4ade80",marginBottom:8}}>🎯 Could You Retire Early?</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:14,lineHeight:1.6}}>Based on your current contributions and account returns, the earliest age your pot would sustain to {targetSustainAge}:</div>
                  <div style={{fontSize:36,fontWeight:800,color:"#4ade80",fontFamily:"'DM Mono',monospace",marginBottom:4}}>Age {recsCalc.earliestRetireAge||retirementAge}</div>
                  <div style={{fontSize:12,color:"#334155"}}>
                    {recsCalc.earliestRetireAge&&recsCalc.earliestRetireAge<retirementAge
                      ?`That's ${retirementAge-recsCalc.earliestRetireAge} years earlier than your current plan.`
                      :`Your current retirement age of ${retirementAge} is already optimal.`}
                  </div>
                </div>
                <div className="card" style={{border:"1px solid #1a4020"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#4ade80",marginBottom:8}}>💸 Max Sustainable Spend</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:14,lineHeight:1.6}}>The maximum monthly income you can draw and still sustain to age {targetSustainAge}:</div>
                  <div style={{fontSize:36,fontWeight:800,color:"#4ade80",fontFamily:"'DM Mono',monospace",marginBottom:4}}>{fmt(recsCalc.maxMonthlySpend)}/mo</div>
                  <div style={{fontSize:12,color:"#334155"}}>{fmt(recsCalc.maxAnnualSpend)}/yr · vs target {fmt(targetMonthlyIncome)}/mo</div>
                </div>
              </div>
            )}

            {/* ── Max sustainable spend when there's a gap ── */}
            {!recsCalc.onTrack&&recsCalc.maxMonthlySpend>0&&(
              <div className="card" style={{border:"1px solid #1a2a40",background:"#080e18"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#60a5fa",marginBottom:8}}>💡 What Can You Actually Spend?</div>
                <div style={{fontSize:11,color:"#475569",marginBottom:14,lineHeight:1.6}}>
                  Based on your current trajectory, the maximum sustainable monthly income to age {targetSustainAge}:
                </div>
                <div style={{display:"flex",alignItems:"flex-end",gap:16,marginBottom:12,flexWrap:"wrap"}}>
                  <div>
                    <div style={{fontSize:36,fontWeight:800,color:recsCalc.maxMonthlySpend>=targetMonthlyIncome?"#4ade80":"#60a5fa",fontFamily:"'DM Mono',monospace"}}>{fmt(recsCalc.maxMonthlySpend)}/mo</div>
                    <div style={{fontSize:12,color:"#334155"}}>{fmt(recsCalc.maxAnnualSpend)}/yr · today's dollars, pre-tax</div>
                  </div>
                  <div>
                    <div style={{fontSize:20,color:recsCalc.maxMonthlySpend>=targetMonthlyIncome?"#4ade80":"#f87171",fontFamily:"'DM Mono',monospace"}}>
                      vs {fmt(targetMonthlyIncome)}/mo target
                    </div>
                    {recsCalc.maxMonthlySpend<targetMonthlyIncome
                      ? <div style={{fontSize:13,color:"#f87171",marginTop:2}}>= {fmt(targetMonthlyIncome-recsCalc.maxMonthlySpend)}/mo below target</div>
                      : <div style={{fontSize:13,color:"#4ade80",marginTop:2}}>✅ Your target is fully sustainable</div>
                    }
                  </div>
                </div>
                <div style={{fontSize:11,color:"#475569"}}>Adjust your target monthly income on the Portfolio tab to model this scenario.</div>
              </div>
            )}

            {/* ── Combined path ── */}
            {!recsCalc.onTrack&&(
              <div className="card" style={{border:"1px solid #2a2040"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#a78bfa",marginBottom:8}}>⚡ Combined Approach — Split the Gap</div>
                <div style={{fontSize:12,color:"#475569",marginBottom:14,lineHeight:1.6}}>
                  Instead of doing one thing entirely, splitting across all three levers is often the most manageable path.
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  {[
                    {l:"Extra salary savings/mo",  v:fmt(recsCalc.extraMonthlyNeeded/3),      c:"#60a5fa", desc:"⅓ of gap via salary"},
                    {l:"Extra bonus saved/yr",      v:fmt(recsCalc.extraBonusNeeded/3),        c:"#f59e0b", desc:"⅓ of gap via bonus"},
                    {l:"Extra years of work",       v:`~${Math.ceil(recsCalc.extraYearsWork/3)} yr`, c:"#4ade80", desc:"⅓ of gap via time"},
                  ].map(r=>(
                    <div key={r.l} style={{background:"#0f0f1a",border:"1px solid #2a2040",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>{r.l}</div>
                      <div style={{fontSize:18,fontWeight:800,color:r.c,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{r.v}</div>
                      <div style={{fontSize:10,color:"#334155"}}>{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Pot required vs projected chart ── */}
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                Projected Pot vs Required Pot — Retirement Age Sensitivity
              </div>
              <div style={{fontSize:12,color:"#334155",marginBottom:14}}>
                Each bar shows your projected pot at that retirement age. The red line shows what's needed to sustain to age {targetSustainAge}. Bars above the line mean you're on track.
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[55,57,59,61,63,65,67,69,71,73,75].filter(a=>a>currentAge&&a<=80).map(rAge=>{
                  const row=projectionData.find(d=>d.age===rAge);
                  return {age:rAge, projected:Math.round(row?.nominal||0), required:Math.round(recsCalc.requiredPot)};
                })} margin={{top:5,right:10,left:10,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false}/>
                  <XAxis dataKey="age" stroke="#334155" tick={{fill:"#475569",fontSize:11}} tickFormatter={v=>`${v}`}/>
                  <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:11}} tickFormatter={fmtK} width={72}/>
                  <Tooltip content={({active,payload,label})=>{
                    if(!active||!payload?.length) return null;
                    const proj=payload.find(p=>p.dataKey==="projected")?.value||0;
                    const req=recsCalc.requiredPot;
                    const gap=proj-req;
                    return(
                      <div style={{background:"#0a0c14",border:"1px solid #2a2d3a",borderRadius:8,padding:"10px 14px",fontSize:12}}>
                        <div style={{color:"#94a3b8",fontWeight:700,marginBottom:6}}>Retire at {label}</div>
                        <div style={{color:"#60a5fa",marginBottom:3}}>Projected: {fmtK(proj)}</div>
                        <div style={{color:"#f87171",marginBottom:3}}>Required: {fmtK(req)}</div>
                        <div style={{color:gap>=0?"#4ade80":"#f87171",fontWeight:700,marginTop:6}}>
                          {gap>=0?`✅ Surplus: ${fmtK(gap)}`:`⚠️ Gap: ${fmtK(Math.abs(gap))}`}
                        </div>
                      </div>
                    );
                  }}/>
                  <Legend wrapperStyle={{fontSize:11,color:"#64748b"}}/>
                  <Bar dataKey="projected" name="Projected Pot" fill="#3b82f6" fillOpacity={0.8} radius={[4,4,0,0]}
                    label={false}
                  >
                    {[55,57,59,61,63,65,67,69,71,73,75].filter(a=>a>currentAge&&a<=80).map((rAge,i)=>{
                      const row=projectionData.find(d=>d.age===rAge);
                      const proj=row?.nominal||0;
                      return <cell key={i} fill={proj>=recsCalc.requiredPot?"#4ade80":"#3b82f6"}/>;
                    })}
                  </Bar>
                  <Bar dataKey="required" name="Required Pot" fill="#f87171" fillOpacity={0} stroke="#f87171" strokeWidth={2} strokeDasharray="5 3" radius={[0,0,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
  );
}
