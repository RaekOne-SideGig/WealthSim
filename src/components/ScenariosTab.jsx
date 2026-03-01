import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { fmt, fmtK, pct, COLORS, ACCOUNT_TYPES, TYPE_ICONS, FULL_SS_AGE, SS_COLA } from "../utils.js";

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


export default function ScenariosTab({projectionData, accounts, nonPrimary, scenarioMult, setScenarioMult, scenarioAccIds, setScenarioAccIds, currentAge, retirementAge, lifeExpectancy, effectiveContrib, inp, sl, targetMonthlyIncome, earningsContribForYear, totalContrib, projAtRetire}) {
  const toggleAccId = (id) => {
    if(!scenarioAccIds){
      // Was "all" — switch to all except this one
      setScenarioAccIds(nonPrimary.filter(a=>a.id!==id).map(a=>a.id));
    } else if(scenarioAccIds.includes(id)){
      const next = scenarioAccIds.filter(x=>x!==id);
      setScenarioAccIds(next.length===0?null:next.length===nonPrimary.length?null:next);
    } else {
      const next = [...scenarioAccIds,id];
      setScenarioAccIds(next.length===nonPrimary.length?null:next);
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>Contribution Scenario Simulator</div>
              
              {/* Account selector */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>
                  Apply to: <span style={{color:"#60a5fa"}}>{!scenarioAccIds?"All Accounts":`${scenarioAccIds.length} account${scenarioAccIds.length!==1?"s":""}`}</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  <button className="btn" style={{background:!scenarioAccIds?"#1e3a5f":"#131520",border:`1px solid ${!scenarioAccIds?"#3b82f6":"#1e2130"}`,color:!scenarioAccIds?"#60a5fa":"#475569",padding:"4px 10px",fontSize:11}}
                    onClick={()=>setScenarioAccIds(null)}>All</button>
                  {nonPrimary.map(acc=>{
                    const active = !scenarioAccIds||scenarioAccIds.includes(acc.id);
                    return(
                      <button key={acc.id} className="btn" style={{background:active?"#0f1520":"#0a0c14",border:`1px solid ${active?acc.color:"#1e2130"}`,color:active?acc.color:"#475569",padding:"4px 10px",fontSize:11}}
                        onClick={()=>toggleAccId(acc.id)}>
                        {acc.name}
                      </button>
                    );
                  })}
                </div>
                {scenarioAccIds&&<div style={{fontSize:11,color:"#f59e0b",marginTop:6}}>⚠️ Scenario applies to selected accounts only. Note: retirement account contributions are federally capped ($23k/yr 401k, $7k IRA).</div>}
              </div>

              <div style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <label style={{fontSize:14,color:"#94a3b8"}}>Adjust contributions by</label>
                  <span style={{fontSize:18,fontWeight:700,color:scenarioMult>1?"#4ade80":scenarioMult<1?"#f87171":"#60a5fa",fontFamily:"'DM Mono',monospace"}}>
                    {scenarioMult===1?"Baseline":scenarioMult>1?`+${((scenarioMult-1)*100).toFixed(0)}%`:`-${((1-scenarioMult)*100).toFixed(0)}%`}
                  </span>
                </div>
                <input type="range" style={sl} min={0} max={3} step={0.05} value={scenarioMult} onChange={e=>setScenarioMult(parseFloat(e.target.value))}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
                {[0,0.5,1,1.5,2,3].map(m=>(
                  <button key={m} className="btn" style={{background:scenarioMult===m?"#3b82f6":"#131520",border:`1px solid ${scenarioMult===m?"#3b82f6":"#1e2130"}`,color:scenarioMult===m?"#fff":"#64748b",padding:"8px 10px",borderRadius:8,fontSize:12}} onClick={()=>setScenarioMult(m)}>
                    {m===0?"Stop All":m===0.5?"Halve":m===1?"Baseline":m===1.5?"+50%":m===2?"Double":"Triple"}
                  </button>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[
                  {l:"Monthly Contributions",  v:totalContrib*scenarioMult, base:totalContrib, c:"#60a5fa"},
                  {l:`Pot at ${retirementAge}`,v:projAtRetire,                                 c:"#f59e0b"},
                  {l:"Monthly Target",          v:targetMonthlyIncome,                          c:"#a78bfa"},
                ].map(s=>(
                  <div key={s.l} className="scard">
                    <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>{s.l}</div>
                    <div style={{fontSize:16,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace"}}>{fmtK(s.v)}</div>
                    {s.base&&s.base!==s.v&&<div style={{fontSize:11,color:s.v>s.base?"#4ade80":"#f87171",marginTop:3}}>{s.v>s.base?"▲":"▼"} was {fmtK(s.base)}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>Scenario vs Baseline at Retirement</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={nonPrimary.map(acc=>{
                  const rate=acc.annualReturn/100, yrs=retirementAge-currentAge;
                  let base=acc.balance, scenario=acc.balance;
                  for(let y=0;y<yrs;y++){
                    const ec=acc.monthlyContribution + earningsContribForYear(acc,y);
                    base    = base    *(1+rate) + ec*12;
                    scenario= scenario*(1+rate) + ec*scenarioMult*12;
                  }
                  return {name:acc.name.split(" ")[0],base:Math.round(base),scenario:Math.round(scenario)};
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="name" stroke="#334155" tick={{fill:"#475569",fontSize:11}}/>
                  <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:11}} tickFormatter={fmtK} width={70}/>
                  <Tooltip content={<CT/>}/>
                  <Legend wrapperStyle={{fontSize:12,color:"#64748b"}}/>
                  <Bar dataKey="base" name="Baseline" fill="#3b82f6" fillOpacity={.7} radius={[4,4,0,0]}/>
                  <Bar dataKey="scenario" name="Scenario" fill="#4ade80" fillOpacity={.7} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>Account Detail</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr>{["Account","Type","Current Monthly (yr 0)","Scenario (yr 0)","At Retirement","Share"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"7px 10px",color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",borderBottom:"1px solid #1e2130"}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {nonPrimary.map(acc=>{
                      const rate=acc.annualReturn/100,yrs=retirementAge-currentAge;
                      let proj=acc.balance;
                      for(let y=0;y<yrs;y++){
                        const ec=acc.monthlyContribution + earningsContribForYear(acc,y);
                        proj=proj*(1+rate)+ec*scenarioMult*12;
                      }
                      const totalProj=projAtRetire||1;
                      const share=proj/totalProj*100;
                      return(
                        <tr key={acc.id} style={{borderBottom:"1px solid #0f1117"}}>
                          <td style={{padding:"9px 10px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:7}}>
                              <div style={{width:7,height:7,borderRadius:"50%",background:acc.color,flexShrink:0}}/>
                              <span style={{fontWeight:500}}>{acc.name}</span>
                            </div>
                          </td>
                          <td style={{padding:"9px 10px"}}><span className="tag" style={{background:"#1a1d27",color:"#64748b"}}>{TYPE_ICONS[acc.type]} {acc.type}</span></td>
                          <td style={{padding:"9px 10px",fontFamily:"'DM Mono',monospace",color:"#60a5fa"}}>{fmt(acc.monthlyContribution + earningsContribForYear(acc,0))}</td>
                          <td style={{padding:"9px 10px",fontFamily:"'DM Mono',monospace",color:acc.type==="property"?"#c084fc":"#4ade80"}}>{fmt((acc.monthlyContribution + earningsContribForYear(acc,0))*scenarioMult)}</td>
                          <td style={{padding:"9px 10px",fontFamily:"'DM Mono',monospace",color:acc.color,fontWeight:700}}>{fmtK(proj)}</td>
                          <td style={{padding:"9px 10px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:7}}>
                              <div className="sbar" style={{flex:1}}><div style={{width:`${Math.min(100,share)}%`,height:"100%",background:acc.color,borderRadius:4}}/></div>
                              <span style={{fontSize:11,color:"#64748b",fontFamily:"'DM Mono',monospace",flexShrink:0}}>{share.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
  );
}
