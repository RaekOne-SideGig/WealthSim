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


export default function ProjectionsTab({projectionData, currentAge, retirementAge, lifeExpectancy, accounts, nonPrimary, inflation, targetSustainAge}) {

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>Total Portfolio — Nominal vs Real</div>
              <ResponsiveContainer width="100%" height={270}>
                <AreaChart data={projectionData}>
                  <defs>
                    <linearGradient id="ng" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4ade80" stopOpacity={.2}/><stop offset="95%" stopColor="#4ade80" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="age" stroke="#334155" tick={{fill:"#475569",fontSize:11}}/>
                  <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:11}} tickFormatter={fmtK} width={70}/>
                  <Tooltip content={<CT/>}/>
                  <Legend wrapperStyle={{fontSize:12,color:"#64748b"}}/>
                  <Area type="monotone" dataKey="nominal" name="Nominal" stroke="#3b82f6" fill="url(#ng)" strokeWidth={2} dot={false}/>
                  <Area type="monotone" dataKey="real" name={`Real (${inflation}% infl.)`} stroke="#4ade80" fill="url(#rg)" strokeWidth={2} dot={false} strokeDasharray="5 5"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>Breakdown by Account (excl. primary residence)</div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                  <XAxis dataKey="age" stroke="#334155" tick={{fill:"#475569",fontSize:11}}/>
                  <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:11}} tickFormatter={fmtK} width={70}/>
                  <Tooltip content={<CT/>}/>
                  <Legend wrapperStyle={{fontSize:12,color:"#64748b"}}/>
                  {nonPrimary.map(acc=><Area key={acc.id} type="monotone" dataKey={acc.name} stroke={acc.color} fill={acc.color} fillOpacity={.15} strokeWidth={2} dot={false} stackId="1"/>)}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>Milestones</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
                {[50,55,60,retirementAge,70,targetSustainAge].filter((v,i,a)=>a.indexOf(v)===i&&v>currentAge&&v<=Math.max(lifeExpectancy,targetSustainAge)+5).sort((a,b)=>a-b).map(age=>{
                  const row=projectionData.find(d=>d.age===age); if(!row) return null;
                  const isTgt=age===targetSustainAge, isRet=age===retirementAge;
                  return(
                    <div key={age} style={{background:"#131520",border:`1px solid ${isRet?"#3b82f6":isTgt?"#38bdf8":"#1e2130"}`,borderRadius:8,padding:12,textAlign:"center"}}>
                      <div style={{fontSize:20,fontWeight:800,color:isRet?"#3b82f6":isTgt?"#38bdf8":"#60a5fa",fontFamily:"'DM Mono',monospace"}}>{age}</div>
                      <div style={{fontSize:10,color:"#475569",marginBottom:5}}>{isRet?"🎯 Retire":isTgt?"🎯 Target":"Age"}</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",fontFamily:"'DM Mono',monospace"}}>{fmtK(row.nominal)}</div>
                      <div style={{fontSize:10,color:"#334155"}}>{fmtK(row.real)} real</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
  );
}
