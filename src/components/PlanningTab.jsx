import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { fmt, fmtK, pct, COLORS, ACCOUNT_TYPES, TYPE_ICONS, FULL_SS_AGE, SS_COLA } from "../utils.js";

export default function PlanningTab({retCalc, settings, earnings, nonPrimary, currentAge, retirementAge, inflation, targetMonthlyIncome, goGoEnd, slowGoEnd, goGoPct, slowGoPct, noGoPct, updateSettings, inp}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Stage config cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              {[
                {
                  key:"goGo", label:"🏃 Go-Go Years", color:"#4ade80",
                  desc:"Active retirement — travel, hobbies, high activity",
                  ageLabel:`Retire (${retirementAge}) → ${goGoEnd||70}`,
                  pctKey:"goGoPct", pct:goGoPct||100,
                  endKey:"goGoEnd", endVal:goGoEnd||70, endMin:retirementAge+1, endMax:85,
                },
                {
                  key:"slowGo", label:"🚶 Slow-Go Years", color:"#f59e0b",
                  desc:"Reduced activity — less travel, more home-based spending",
                  ageLabel:`${goGoEnd||70} → ${slowGoEnd||80}`,
                  pctKey:"slowGoPct", pct:slowGoPct||70,
                  endKey:"slowGoEnd", endVal:slowGoEnd||80, endMin:(goGoEnd||70)+1, endMax:95,
                },
                {
                  key:"noGo", label:"🛋️ No-Go Years", color:"#f87171",
                  desc:"Low discretionary spending — care-focused costs dominate",
                  ageLabel:`${slowGoEnd||80}+`,
                  pctKey:"noGoPct", pct:noGoPct||50,
                  endKey:null,
                },
              ].map(stage=>{
                const monthlyTarget = targetMonthlyIncome * (stage.pct/100);
                const annualTarget  = monthlyTarget * 12;
                const salaryPct     = earnings.grossIncome > 0 ? monthlyTarget/(earnings.grossIncome/12)*100 : 0;
                const inflYrs       = retirementAge-currentAge;
                const inflF         = Math.pow(1+inflation/100, inflYrs);
                const monthlyAtRetire = monthlyTarget * inflF;
                return (
                  <div key={stage.key} className="card" style={{border:`1px solid ${stage.color}30`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:stage.color}}>{stage.label}</div>
                        <div style={{fontSize:10,color:"#475569",marginTop:2}}>{stage.ageLabel}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:18,fontWeight:800,color:stage.color,fontFamily:"'DM Mono',monospace"}}>{stage.pct}%</div>
                        <div style={{fontSize:10,color:"#475569"}}>of pull-down</div>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:"#475569",marginBottom:14,lineHeight:1.5}}>{stage.desc}</div>

                    {/* Spending % slider */}
                    <div style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <label style={{fontSize:11,color:"#64748b"}}>Spending % of target</label>
                        <span style={{fontSize:12,fontWeight:700,color:stage.color,fontFamily:"'DM Mono',monospace"}}>{stage.pct}%</span>
                      </div>
                      <input type="range" style={{width:"100%",accentColor:stage.color,cursor:"pointer"}}
                        min={10} max={150} step={5} value={stage.pct}
                        onChange={e=>updateSettings(stage.pctKey, parseInt(e.target.value))}/>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#334155",marginTop:2}}>
                        <span>10% (minimal)</span><span>100% (full target)</span><span>150% (high spend)</span>
                      </div>
                    </div>

                    {/* Stage end age slider (except No-Go) */}
                    {stage.endKey && (
                      <div style={{marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                          <label style={{fontSize:11,color:"#64748b"}}>Stage ends at age</label>
                          <span style={{fontSize:12,fontWeight:700,color:stage.color,fontFamily:"'DM Mono',monospace"}}>{stage.endVal}</span>
                        </div>
                        <input type="range" style={{width:"100%",accentColor:stage.color,cursor:"pointer"}}
                          min={stage.endMin} max={stage.endMax} step={1} value={stage.endVal}
                          onChange={e=>updateSettings(stage.endKey, parseInt(e.target.value))}/>
                      </div>
                    )}

                    {/* Summary stats */}
                    <div style={{borderTop:"1px solid #1e2130",paddingTop:10,display:"flex",flexDirection:"column",gap:5}}>
                      {[
                        {l:"Monthly spend (today $)",  v:fmt(monthlyTarget)},
                        {l:"Annual spend (today $)",   v:fmt(annualTarget)},
                        {l:"Monthly at retire (nom.)", v:fmt(monthlyAtRetire)},
                        {l:"% of current salary",      v:`${salaryPct.toFixed(0)}%`},
                      ].map(r=>(
                        <div key={r.l} style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:11,color:"#475569"}}>{r.l}</span>
                          <span style={{fontSize:11,fontWeight:700,color:stage.color,fontFamily:"'DM Mono',monospace"}}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeline chart */}
            {retCalc && (
              <div className="card">
                <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>
                  Spending vs Pot Balance Through Retirement
                </div>
                <div style={{fontSize:12,color:"#334155",marginBottom:14}}>
                  Shaded regions show your three lifestyle stages. Spending line drops as you move through each phase.
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={retCalc.drawdownTimeline} margin={{top:5,right:10,left:10,bottom:5}}>
                    <defs>
                      <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                    <XAxis dataKey="age" stroke="#334155" tick={{fill:"#475569",fontSize:11}}
                      label={{value:"Age",position:"insideBottom",offset:-2,fill:"#475569",fontSize:11}}/>
                    <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:11}} tickFormatter={fmtK} width={72}/>
                    <Tooltip content={({active,payload,label})=>{
                      if(!active||!payload?.length) return null;
                      const d=payload[0]?.payload;
                      const stageLabel = d?.stage==="goGo"?"🏃 Go-Go":d?.stage==="slowGo"?"🚶 Slow-Go":"🛋️ No-Go";
                      return (
                        <div style={{background:"#0a0c14",border:"1px solid #2a2d3a",borderRadius:8,padding:"10px 14px",fontSize:12}}>
                          <div style={{color:"#94a3b8",fontWeight:700,marginBottom:6}}>Age {label} — {stageLabel}</div>
                          {payload.map(p=>(
                            <div key={p.name} style={{color:p.color,marginBottom:3,display:"flex",justifyContent:"space-between",gap:14}}>
                              <span style={{opacity:.8}}>{p.name}</span><strong>{fmtK(p.value)}</strong>
                            </div>
                          ))}
                          {d?.ssIncome>0&&<div style={{color:"#38bdf8",marginTop:4}}>SS Income: {fmtK(d.ssIncome)}/yr</div>}
                          <div style={{color:"#64748b",marginTop:2,fontSize:10}}>Spending: {d?.stagePct}% of target</div>
                        </div>
                      );
                    }}/>
                    <Legend wrapperStyle={{fontSize:12,color:"#64748b"}}/>
                    <Area type="monotone" dataKey="balance" name="Pot Balance" stroke="#f59e0b" fill="url(#balGrad)" strokeWidth={2.5} dot={false}/>
                    <Area type="monotone" dataKey="totalNeed" name="Annual Spending Need" stroke="#f87171" fill="none" strokeWidth={1.5} dot={false} strokeDasharray="4 3"/>
                    <Area type="monotone" dataKey="ssIncome" name="SS Income" stroke="#38bdf8" fill="none" strokeWidth={1.5} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>

                {/* Stage bands legend */}
                <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                  {[
                    {label:`🏃 Go-Go (${retirementAge}–${goGoEnd||70})`, color:"#4ade80", pct:goGoPct||100},
                    {label:`🚶 Slow-Go (${goGoEnd||70}–${slowGoEnd||80})`, color:"#f59e0b", pct:slowGoPct||70},
                    {label:`🛋️ No-Go (${slowGoEnd||80}+)`, color:"#f87171", pct:noGoPct||50},
                  ].map(s=>(
                    <div key={s.label} style={{background:"#131520",border:`1px solid ${s.color}40`,borderRadius:6,padding:"6px 12px",fontSize:11,display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{color:s.color,fontWeight:700}}>{s.label}</span>
                      <span style={{color:"#475569"}}>{s.pct}% of {fmt(targetMonthlyIncome)}/mo = <strong style={{color:s.color}}>{fmt(targetMonthlyIncome*s.pct/100)}/mo</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Year by year table */}
            {retCalc && (
              <div className="card">
                <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                  Year-by-Year Retirement Spending Plan
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{borderBottom:"1px solid #1e2130"}}>
                        {["Age","Stage","Spending %","Monthly Spend","SS Income/mo","Net from Pot/mo","Pot Balance"].map(h=>(
                          <th key={h} style={{textAlign:"left",padding:"7px 10px",color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {retCalc.drawdownTimeline.filter((_,i)=>i%1===0).map(row=>{
                        const stageColor = row.stage==="goGo"?"#4ade80":row.stage==="slowGo"?"#f59e0b":"#f87171";
                        const stageLabel = row.stage==="goGo"?"🏃 Go-Go":row.stage==="slowGo"?"🚶 Slow-Go":"🛋️ No-Go";
                        const isHighlight = row.age%5===0;
                        const isBoundary  = row.age===(goGoEnd||70)||row.age===(slowGoEnd||80);
                        return (
                          <tr key={row.age} style={{
                            borderBottom:"1px solid #0c0e14",
                            background:isBoundary?"#0f1a10":isHighlight?"#0f1117":"transparent",
                            borderLeft:isBoundary?`3px solid ${stageColor}`:"3px solid transparent",
                          }}>
                            <td style={{padding:"5px 10px",fontFamily:"'DM Mono',monospace",fontWeight:isHighlight?700:400,color:isHighlight?"#60a5fa":"#94a3b8"}}>{row.age}</td>
                            <td style={{padding:"5px 10px"}}>
                              <span style={{color:stageColor,fontSize:11,fontWeight:600}}>{stageLabel}</span>
                            </td>
                            <td style={{padding:"5px 10px",color:stageColor,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{row.stagePct}%</td>
                            <td style={{padding:"5px 10px",color:"#e2e8f0",fontFamily:"'DM Mono',monospace"}}>{fmtK(row.totalNeed/12)}</td>
                            <td style={{padding:"5px 10px",color:"#38bdf8",fontFamily:"'DM Mono',monospace"}}>{row.ssIncome>0?fmtK(row.ssIncome/12):"—"}</td>
                            <td style={{padding:"5px 10px",color:row.drawdown>0?"#f87171":"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmtK(row.drawdown/12)}</td>
                            <td style={{padding:"5px 10px",color:row.balance>0?"#f59e0b":"#f87171",fontFamily:"'DM Mono',monospace",fontWeight:700}}>{row.balance>0?fmtK(row.balance):"💀 Depleted"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Salary-based context */}
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                📊 Spending vs Current Income Context
              </div>
              <div style={{fontSize:12,color:"#334155",marginBottom:14}}>
                How each retirement stage compares to your current salary of <strong style={{color:"#60a5fa"}}>{fmt(earnings.grossIncome)}/yr</strong>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[
                  {label:"🏃 Go-Go", pct:goGoPct||100, color:"#4ade80"},
                  {label:"🚶 Slow-Go", pct:slowGoPct||70, color:"#f59e0b"},
                  {label:"🛋️ No-Go", pct:noGoPct||50, color:"#f87171"},
                ].map(s=>{
                  const monthly = targetMonthlyIncome*(s.pct/100);
                  const annualised = monthly*12;
                  const vsCurrentSalary = earnings.grossIncome>0?annualised/earnings.grossIncome*100:0;
                  const barW = Math.min(100,vsCurrentSalary);
                  return (
                    <div key={s.label}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,flexWrap:"wrap",gap:4}}>
                        <span style={{fontSize:13,color:"#94a3b8",fontWeight:600}}>{s.label}</span>
                        <div style={{display:"flex",gap:16,fontSize:12}}>
                          <span style={{color:s.color,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{fmt(monthly)}/mo</span>
                          <span style={{color:"#475569"}}>{vsCurrentSalary.toFixed(0)}% of current salary</span>
                        </div>
                      </div>
                      <div style={{height:10,background:"#1e2130",borderRadius:5,overflow:"hidden",position:"relative"}}>
                        <div style={{width:`${barW}%`,height:"100%",background:s.color,borderRadius:5,transition:"width .4s"}}/>
                        {/* 100% salary marker */}
                        <div style={{position:"absolute",top:0,left:"100%",width:2,height:"100%",background:"#334155",transform:"translateX(-1px)"}}/>
                      </div>
                    </div>
                  );
                })}
                <div style={{fontSize:10,color:"#334155",marginTop:4}}>Bar represents % of current gross salary. Note: retirement spending is post-tax in nature.</div>
              </div>
            </div>

          </div>
  );
}
