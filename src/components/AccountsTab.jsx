import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { fmt, fmtK, pct, COLORS, ACCOUNT_TYPES, TYPE_ICONS, FULL_SS_AGE, SS_COLA } from "../utils.js";
import { useState } from "react";

export default function AccountsTab({accounts, nonPrimary, currentAge, retirementAge, lifeExpectancy, reviewAccId, setReviewAccId, simReturns, setSimReturns, simContribs, setSimContribs, inp, settings}) {
  const reviewAcc = reviewAccId ? accounts.find(a=>a.id===reviewAccId) : null;
          const simReturn = reviewAcc ? (simReturns[reviewAcc.id]??reviewAcc.annualReturn) : 0;
          const simContrib= reviewAcc ? (simContribs[reviewAcc.id]??reviewAcc.monthlyContribution) : 0;

          // Build growth projection for the reviewed account
          const accProjection = reviewAcc ? Array.from({length: lifeExpectancy-currentAge+1}, (_,i)=>{
            const age = currentAge+i;
            const yr  = i;
            const rate = simReturn/100;
            // Pre-retirement: compound with contributions; post-retirement: compound only
            let bal = reviewAcc.balance;
            for(let y=0;y<yr;y++){
              const retired = (currentAge+y) >= retirementAge;
              if(retired) bal = bal*(1+rate);
              else        bal = bal*(1+rate) + simContrib*12;
            }
            // Baseline (original settings)
            let baseBal = reviewAcc.balance;
            const baseRate = reviewAcc.annualReturn/100;
            const baseContrib = reviewAcc.monthlyContribution;
            for(let y=0;y<yr;y++){
              const retired = (currentAge+y) >= retirementAge;
              if(retired) baseBal = baseBal*(1+baseRate);
              else        baseBal = baseBal*(1+baseRate) + baseContrib*12;
            }
            return {age, simulated:Math.round(bal), baseline:Math.round(baseBal)};
          }) : [];

          // Multi-return scenario lines (3%, 5%, 7%, 9%, 11%)
          const scenarioLines = reviewAcc ? [3,5,7,9,11].map(r=>({
            rate:r,
            data: Array.from({length:retirementAge-currentAge+1},(_,i)=>{
              const yr=i; let bal=reviewAcc.balance;
              for(let y=0;y<yr;y++) bal=bal*(1+r/100)+simContrib*12;
              return {age:currentAge+i, value:Math.round(bal)};
            })
          })) : [];

          const grouped = ACCOUNT_TYPES.reduce((g,t)=>{
            g[t]=accounts.filter(a=>a.type===t&&!(a.isPrimary&&a.type==="property"));
            return g;
          },{});

          return (
            <div style={{display:"flex",gap:14,height:"100%"}}>
              {/* Left: account list */}
              <div style={{width:260,flexShrink:0,display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
                {ACCOUNT_TYPES.map(type=>(
                  grouped[type].length>0&&(
                    <div key={type}>
                      <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6,paddingLeft:4}}>
                        {TYPE_ICONS[type]} {type==="retirement"?"Retirement Accounts":type.charAt(0).toUpperCase()+type.slice(1)}
                      </div>
                      {grouped[type].map(acc=>(
                        <div key={acc.id}
                          onClick={()=>setReviewAccId(acc.id===reviewAccId?null:acc.id)}
                          style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${acc.id===reviewAccId?acc.color:"#1e2130"}`,
                            background:acc.id===reviewAccId?"#0f1520":"#0a0c14",cursor:"pointer",marginBottom:6,transition:"all .15s"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:8,height:8,borderRadius:"50%",background:acc.color}}/>
                              <span style={{fontSize:13,fontWeight:600,color:acc.id===reviewAccId?acc.color:"#e2e8f0"}}>{acc.name}</span>
                            </div>
                            <span style={{fontSize:12,fontWeight:700,color:acc.color,fontFamily:"'DM Mono',monospace"}}>{fmtK(acc.balance)}</span>
                          </div>
                          <div style={{fontSize:10,color:"#475569",marginTop:4,paddingLeft:16}}>
                            {acc.annualReturn}% return · {fmt(acc.monthlyContribution)}/mo
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ))}
                {!reviewAccId&&(
                  <div style={{fontSize:12,color:"#334155",textAlign:"center",marginTop:20,padding:"0 10px"}}>
                    ← Click an account to review it
                  </div>
                )}
              </div>

              {/* Right: account detail */}
              <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
                {!reviewAcc&&(
                  <div className="card" style={{textAlign:"center",padding:60}}>
                    <div style={{fontSize:32,marginBottom:12}}>📊</div>
                    <div style={{fontSize:15,color:"#64748b",marginBottom:8}}>Select an account to analyse</div>
                    <div style={{fontSize:12,color:"#334155"}}>Click any account on the left to see projections, simulate different returns, and model contribution changes.</div>
                  </div>
                )}

                {reviewAcc&&(()=>{
                  const type = reviewAcc.type;
                  const atRetire  = accProjection.find(r=>r.age===retirementAge);
                  const atLife    = accProjection.find(r=>r.age===lifeExpectancy);
                  const diff      = (atRetire?.simulated||0)-(atRetire?.baseline||0);

                  // Type-specific config
                  const typeConfig = {
                    savings:    {label:"Savings Account",      icon:"🏦", returnLabel:"APY %",          returnMin:0, returnMax:10,  returnStep:0.1,  contribMax:10000, scenarioRates:[2,3,4,5,6],    tip:"Savings accounts are low-risk. APY typically ranges 3–5% for high-yield accounts."},
                    investment: {label:"Investment Account",   icon:"📈", returnLabel:"Annual Return %", returnMin:0, returnMax:25,  returnStep:0.5,  contribMax:10000, scenarioRates:[4,6,8,10,12],  tip:"Stock-based investments historically return 7–10% annually. Higher returns come with higher volatility."},
                    retirement: {label:"Retirement Account",   icon:"🎯", returnLabel:"Annual Return %", returnMin:0, returnMax:20,  returnStep:0.5,  contribMax:5000,  scenarioRates:[3,5,7,9,11],   tip:"401k/IRA returns depend on fund allocation. Target-date funds average 6–8% long term."},
                  };
                  const cfg = typeConfig[type] || typeConfig.investment;

                  // Savings-specific: interest breakdown
                  const monthlyInterest = type==="savings" ? reviewAcc.balance * simReturn/100/12 : null;
                  const annualInterest  = type==="savings" ? reviewAcc.balance * simReturn/100 : null;

                  // Investment-specific: allocation scenarios
                  const allocScenarios = type==="investment" ? [
                    {label:"Conservative (bonds heavy)",  rate:4,  split:"20% stocks / 80% bonds"},
                    {label:"Moderate (balanced)",          rate:7,  split:"60% stocks / 40% bonds"},
                    {label:"Growth (stocks heavy)",        rate:9,  split:"80% stocks / 20% bonds"},
                    {label:"Aggressive (all stocks)",      rate:11, split:"100% stocks"},
                    {label:"Custom (your slider)",         rate:simReturn, split:"Your scenario"},
                  ] : null;

                  return (
                    <>
                    {/* Header */}
                    <div style={{background:"#0f1117",border:`1px solid ${reviewAcc.color}40`,borderRadius:14,padding:"18px 22px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                        <div>
                          <div style={{fontSize:20,fontWeight:800,color:reviewAcc.color}}>{cfg.icon} {reviewAcc.name}</div>
                          <div style={{fontSize:12,color:"#475569",marginTop:3}}>{cfg.label} · Base {reviewAcc.annualReturn}% · {fmt(reviewAcc.monthlyContribution)}/mo</div>
                          <div style={{fontSize:11,color:"#334155",marginTop:6,maxWidth:420,lineHeight:1.5}}>{cfg.tip}</div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,minWidth:340}}>
                          {[
                            {l:"Current Balance",    v:fmtK(reviewAcc.balance),        c:reviewAcc.color},
                            {l:"At Retirement",      v:fmtK(atRetire?.simulated||0),   c:"#f59e0b"},
                            {l:"At Life Expectancy", v:fmtK(atLife?.simulated||0),     c:"#60a5fa"},
                          ].map(s=>(
                            <div key={s.l} style={{background:"#131520",border:"1px solid #1e2130",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
                              <div style={{fontSize:9,color:"#475569",textTransform:"uppercase",fontWeight:700,marginBottom:4}}>{s.l}</div>
                              <div style={{fontSize:15,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Simulators row */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

                      {/* Return/APY simulator */}
                      <div className="card">
                        <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                          {type==="savings"?"💰 APY Simulator":"📈 Return Rate Simulator"}
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <label style={{fontSize:12,color:"#94a3b8"}}>{cfg.returnLabel}</label>
                          <span style={{fontSize:18,fontWeight:800,color:reviewAcc.color,fontFamily:"'DM Mono',monospace"}}>{simReturn.toFixed(1)}%</span>
                        </div>
                        <input type="range" style={{width:"100%",accentColor:reviewAcc.color,cursor:"pointer",marginBottom:4}}
                          min={cfg.returnMin} max={cfg.returnMax} step={cfg.returnStep} value={simReturn}
                          onChange={e=>setSimReturns(p=>({...p,[reviewAcc.id]:parseFloat(e.target.value)}))}/>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#334155",marginBottom:14}}>
                          <span>{cfg.returnMin}%</span><span>{cfg.returnMax/2}%</span><span>{cfg.returnMax}%</span>
                        </div>

                        {/* Savings: show interest breakdown */}
                        {type==="savings"&&(
                          <div style={{background:"#0a1020",border:"1px solid #1a2030",borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                            <div style={{fontSize:11,color:"#475569",marginBottom:6,fontWeight:700,textTransform:"uppercase"}}>Interest on current balance</div>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                              <span style={{fontSize:11,color:"#64748b"}}>Monthly interest</span>
                              <span style={{fontSize:13,fontWeight:700,color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmt(monthlyInterest)}</span>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between"}}>
                              <span style={{fontSize:11,color:"#64748b"}}>Annual interest</span>
                              <span style={{fontSize:13,fontWeight:700,color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmt(annualInterest)}</span>
                            </div>
                          </div>
                        )}

                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {[
                            {l:"Simulated at retire",  v:fmtK(atRetire?.simulated||0), c:reviewAcc.color},
                            {l:"Baseline at retire",   v:fmtK(atRetire?.baseline||0),  c:"#475569"},
                            {l:"Difference",           v:(diff>=0?"+":"")+fmtK(diff),  c:diff>=0?"#4ade80":"#f87171"},
                          ].map(r=>(
                            <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #131520"}}>
                              <span style={{fontSize:11,color:"#475569"}}>{r.l}</span>
                              <span style={{fontSize:12,fontWeight:700,color:r.c,fontFamily:"'DM Mono',monospace"}}>{r.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Contribution simulator */}
                      <div className="card">
                        <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                          💵 Contribution Simulator
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <label style={{fontSize:12,color:"#94a3b8"}}>Monthly Contribution</label>
                          <span style={{fontSize:18,fontWeight:800,color:reviewAcc.color,fontFamily:"'DM Mono',monospace"}}>{fmt(simContrib)}/mo</span>
                        </div>
                        <input type="range" style={{width:"100%",accentColor:reviewAcc.color,cursor:"pointer",marginBottom:4}}
                          min={0} max={cfg.contribMax} step={50} value={simContrib}
                          onChange={e=>setSimContribs(p=>({...p,[reviewAcc.id]:parseFloat(e.target.value)}))}/>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#334155",marginBottom:14}}>
                          <span>$0</span><span>{fmt(cfg.contribMax/2)}</span><span>{fmt(cfg.contribMax)}</span>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {[
                            {l:"Current contribution",  v:fmt(reviewAcc.monthlyContribution)+"/mo"},
                            {l:"Simulated contribution", v:fmt(simContrib)+"/mo"},
                            {l:"Extra per year",         v:(simContrib>=reviewAcc.monthlyContribution?"+":"")+fmt((simContrib-reviewAcc.monthlyContribution)*12)+"/yr"},
                            {l:"At retirement",          v:fmtK(atRetire?.simulated||0)},
                            {l:"Extra at retirement",    v:(diff>=0?"+":"")+fmtK(diff)},
                          ].map(r=>(
                            <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #131520"}}>
                              <span style={{fontSize:11,color:"#475569"}}>{r.l}</span>
                              <span style={{fontSize:12,fontWeight:700,color:reviewAcc.color,fontFamily:"'DM Mono',monospace"}}>{r.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Investment: allocation scenarios */}
                    {type==="investment"&&allocScenarios&&(
                      <div className="card">
                        <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                          🎯 Allocation Scenarios at Retirement
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
                          {allocScenarios.map((s,i)=>{
                            let bal=reviewAcc.balance;
                            for(let y=0;y<retirementAge-currentAge;y++) bal=bal*(1+s.rate/100)+simContrib*12;
                            const isActive = s.label.includes("Custom");
                            return(
                              <div key={s.label} style={{background:isActive?"#0f1a10":"#0a0c14",border:`1px solid ${isActive?"#4ade80":"#1e2130"}`,
                                borderRadius:8,padding:"12px 10px",textAlign:"center"}}>
                                <div style={{fontSize:10,color:isActive?"#4ade80":"#475569",fontWeight:700,marginBottom:6,lineHeight:1.4}}>{s.label}</div>
                                <div style={{fontSize:9,color:"#334155",marginBottom:8}}>{s.split}</div>
                                <div style={{fontSize:14,fontWeight:800,color:isActive?"#4ade80":COLORS[i],fontFamily:"'DM Mono',monospace"}}>{fmtK(bal)}</div>
                                <div style={{fontSize:9,color:"#475569",marginTop:3}}>{s.rate}% return</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Savings: rate comparison table */}
                    {type==="savings"&&(
                      <div className="card">
                        <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                          🏦 APY Comparison — What Different Rates Yield
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead>
                            <tr style={{borderBottom:"1px solid #1e2130"}}>
                              {["APY","Monthly Interest (today)","Annual Interest (today)","Balance at Retirement"].map(h=>(
                                <th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[1,2,3,4,5,6,7,8].map(r=>{
                              let bal=reviewAcc.balance;
                              for(let y=0;y<retirementAge-currentAge;y++) bal=bal*(1+r/100)+simContrib*12;
                              const isActive = Math.round(simReturn)===r;
                              return(
                                <tr key={r} style={{borderBottom:"1px solid #0c0e14",background:isActive?"#0f1a10":"transparent",
                                  borderLeft:isActive?`3px solid ${reviewAcc.color}`:"3px solid transparent"}}>
                                  <td style={{padding:"6px 10px",color:isActive?reviewAcc.color:"#94a3b8",fontWeight:isActive?700:400,fontFamily:"'DM Mono',monospace"}}>{r}%{isActive?" ←":""}</td>
                                  <td style={{padding:"6px 10px",color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmt(reviewAcc.balance*r/100/12)}</td>
                                  <td style={{padding:"6px 10px",color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmt(reviewAcc.balance*r/100)}</td>
                                  <td style={{padding:"6px 10px",color:isActive?reviewAcc.color:"#f59e0b",fontWeight:isActive?700:400,fontFamily:"'DM Mono',monospace"}}>{fmtK(bal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Multi-scenario growth chart */}
                    <div className="card">
                      <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
                        📊 Growth Scenarios — {cfg.scenarioRates.join("% · ")}% Returns
                      </div>
                      <div style={{fontSize:11,color:"#334155",marginBottom:14}}>
                        Each line shows compounding growth to retirement at {fmt(simContrib)}/mo contributions. Solid line = closest to your current slider setting.
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart margin={{top:5,right:10,left:10,bottom:5}}>
                          <defs>
                            {cfg.scenarioRates.map((r,i)=>(
                              <linearGradient key={r} id={`sg${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false}/>
                          <XAxis dataKey="age" type="number" domain={[currentAge,retirementAge]} allowDuplicatedCategory={false}
                            stroke="#334155" tick={{fill:"#475569",fontSize:10}}/>
                          <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:10}} tickFormatter={fmtK} width={72}/>
                          <Tooltip content={({active,payload,label})=>{
                            if(!active||!payload?.length) return null;
                            return(
                              <div style={{background:"#0a0c14",border:"1px solid #2a2d3a",borderRadius:8,padding:"10px 14px",fontSize:12}}>
                                <div style={{color:"#94a3b8",fontWeight:700,marginBottom:6}}>Age {label}</div>
                                {payload.map(p=>(
                                  <div key={p.name} style={{display:"flex",justifyContent:"space-between",gap:14,marginBottom:2}}>
                                    <span style={{color:p.stroke}}>{p.name}</span>
                                    <strong style={{color:p.stroke}}>{fmtK(p.value)}</strong>
                                  </div>
                                ))}
                              </div>
                            );
                          }}/>
                          <Legend wrapperStyle={{fontSize:11}}/>
                          {cfg.scenarioRates.map((r,i)=>{
                            const data=Array.from({length:retirementAge-currentAge+1},(_,j)=>{
                              let bal=reviewAcc.balance;
                              for(let y=0;y<j;y++) bal=bal*(1+r/100)+simContrib*12;
                              return {age:currentAge+j,value:Math.round(bal)};
                            });
                            const isActive=Math.abs(r-simReturn)<1;
                            return(
                              <Area key={r} data={data} type="monotone" dataKey="value" name={`${r}% return`}
                                stroke={COLORS[i]} fill={`url(#sg${i})`} strokeWidth={isActive?3:1.5}
                                dot={false} strokeDasharray={isActive?"":"4 2"}/>
                            );
                          })}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Year-by-year table */}
                    <div className="card">
                      <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                        Year-by-Year Compounding
                      </div>
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                          <thead>
                            <tr style={{borderBottom:"1px solid #1e2130"}}>
                              {["Age","Simulated Balance","Baseline Balance","Difference",type==="savings"?"Annual Interest":"Annual Growth","Monthly Contrib"].map(h=>(
                                <th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {accProjection.map((row,i)=>{
                              const isHighlight = (row.age-currentAge)%5===0||row.age===retirementAge||row.age===lifeExpectancy;
                              const isRetire = row.age===retirementAge;
                              const d = row.simulated-row.baseline;
                              const prevSim = i>0?accProjection[i-1].simulated:reviewAcc.balance;
                              const annualGrowth = row.simulated - prevSim - simContrib*12;
                              return(
                                <tr key={row.age} style={{borderBottom:"1px solid #0c0e14",
                                  background:isRetire?"#0f1a10":isHighlight?"#0f1520":"transparent",
                                  borderLeft:isRetire?`3px solid ${reviewAcc.color}`:"3px solid transparent"}}>
                                  <td style={{padding:"5px 10px",fontWeight:isHighlight?700:400,color:isHighlight?reviewAcc.color:"#94a3b8",fontFamily:"'DM Mono',monospace"}}>
                                    {row.age}{isRetire?" 🎯":""}
                                  </td>
                                  <td style={{padding:"5px 10px",color:reviewAcc.color,fontWeight:isHighlight?700:400,fontFamily:"'DM Mono',monospace"}}>{fmtK(row.simulated)}</td>
                                  <td style={{padding:"5px 10px",color:"#475569",fontFamily:"'DM Mono',monospace"}}>{fmtK(row.baseline)}</td>
                                  <td style={{padding:"5px 10px",color:d>=0?"#4ade80":"#f87171",fontFamily:"'DM Mono',monospace"}}>{d>=0?"+":""}{fmtK(d)}</td>
                                  <td style={{padding:"5px 10px",color:"#f59e0b",fontFamily:"'DM Mono',monospace"}}>{fmtK(Math.max(0,annualGrowth))}</td>
                                  <td style={{padding:"5px 10px",color:"#64748b",fontFamily:"'DM Mono',monospace"}}>
                                    {row.age<retirementAge?fmt(simContrib)+"/mo":"—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    </>
                  );
                })()}
              </div>
            </div>
          );
}
