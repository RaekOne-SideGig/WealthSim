import { useState, useMemo } from "react";
import { fmt, fmtK } from "../utils.js";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

function calcMonthlyPayment(principal, annualRate, termMonths) {
  if (annualRate === 0) return principal / termMonths;
  const r = annualRate / 100 / 12;
  return principal * r * Math.pow(1+r, termMonths) / (Math.pow(1+r, termMonths) - 1);
}

function amortize(principal, annualRate, termMonths, extraMonthly = 0) {
  const r = annualRate / 100 / 12;
  const basePayment = calcMonthlyPayment(principal, annualRate, termMonths);
  const payment = basePayment + extraMonthly;
  let balance = principal;
  const schedule = [];
  let totalInterest = 0;
  let month = 0;
  while (balance > 0.01 && month < termMonths) {
    const interestThisMonth = balance * r;
    const principalThisMonth = Math.min(payment - interestThisMonth, balance);
    balance = Math.max(0, balance - principalThisMonth);
    totalInterest += interestThisMonth;
    month++;
    if (month % 12 === 0 || balance < 0.01) {
      schedule.push({
        year: Math.ceil(month / 12),
        balance: Math.round(balance),
        totalInterest: Math.round(totalInterest),
        equity: 0, // filled below
      });
    }
  }
  return { schedule, totalInterest, months: month, basePayment };
}

export default function HomeTab({ accounts, currentAge, inflation, inp, sl }) {
  const primaryHome = accounts.find(a => a.isPrimary && a.type === "property");

  const [homeValue,   setHomeValue]   = useState(primaryHome?.balance || 500000);
  const [mortgage,    setMortgage]    = useState(primaryHome?.mortgageAmt || 380000);
  const [rate,        setRate]        = useState(primaryHome?.mortgageRate || 6.5);
  const [termYears,   setTermYears]   = useState(30);
  const [propTax,     setPropTax]     = useState(primaryHome?.propTax || 400);
  const [insurance,   setInsurance]   = useState(primaryHome?.insurance || 150);
  const [extraMonthly,setExtraMonthly]= useState(0);
  const [appreciation,setAppreciation]= useState(primaryHome?.annualReturn || 3.0);

  const termMonths = termYears * 12;
  const base  = useMemo(() => amortize(mortgage, rate, termMonths, 0),            [mortgage, rate, termMonths]);
  const extra = useMemo(() => amortize(mortgage, rate, termMonths, extraMonthly), [mortgage, rate, termMonths, extraMonthly]);

  const basePayment  = base.basePayment;
  const totalPayment = basePayment + propTax + insurance;

  const monthsSaved  = base.months - extra.months;
  const yearsSaved   = Math.floor(monthsSaved / 12);
  const remMonths    = monthsSaved % 12;
  const interestSaved = base.totalInterest - extra.totalInterest;

  // Build chart data combining both schedules
  const maxYears = Math.ceil(base.months / 12);
  const chartData = [];
  for (let y = 1; y <= maxYears; y++) {
    const baseRow  = base.schedule.find(r => r.year === y);
    const extraRow = extra.schedule.find(r => r.year === y);
    const appFactor = Math.pow(1 + appreciation/100, y);
    chartData.push({
      year: `Yr ${y}`,
      age: currentAge + y,
      baseBalance:  baseRow  ? baseRow.balance  : 0,
      extraBalance: extraRow ? extraRow.balance : 0,
      homeValue:    Math.round(homeValue * appFactor),
    });
  }

  const payoffAge      = currentAge + Math.ceil(base.months / 12);
  const earlyPayoffAge = currentAge + Math.ceil(extra.months / 12);
  const currentEquity  = Math.max(0, homeValue - mortgage);
  const equityPct      = homeValue > 0 ? (currentEquity / homeValue * 100) : 0;

  const fields = [
    {l:"Home Value ($)",         v:homeValue,    set:setHomeValue,   min:50000,  max:3000000, step:5000},
    {l:"Mortgage Balance ($)",   v:mortgage,     set:setMortgage,    min:0,      max:3000000, step:5000},
    {l:"Interest Rate (%)",      v:rate,         set:setRate,        min:0.5,    max:15,      step:0.1},
    {l:"Loan Term (years)",      v:termYears,    set:setTermYears,   min:5,      max:30,      step:1},
    {l:"Monthly Property Tax ($)",v:propTax,     set:setPropTax,     min:0,      max:5000,    step:25},
    {l:"Monthly Insurance ($)",  v:insurance,    set:setInsurance,   min:0,      max:2000,    step:25},
    {l:"Annual Appreciation (%)",v:appreciation, set:setAppreciation,min:0,      max:10,      step:0.5},
  ];

  const CustomTooltip = ({active, payload, label}) => {
    if(!active||!payload?.length) return null;
    return (
      <div style={{background:"#0f1117",border:"1px solid #2a2d3a",borderRadius:8,padding:"10px 14px",fontSize:12}}>
        <div style={{color:"#64748b",marginBottom:6,fontWeight:700}}>{label} · Age {payload[0]?.payload?.age}</div>
        {payload.map(p=>(
          <div key={p.dataKey} style={{color:p.color,marginBottom:3}}>
            {p.name}: <strong>{fmtK(p.value)}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {[
          {l:"Current Equity",     v:fmtK(currentEquity),   c:"#4ade80",  sub:`${equityPct.toFixed(1)}% of home value`},
          {l:"Monthly Payment",    v:fmt(totalPayment),      c:"#f59e0b",  sub:`${fmt(basePayment)} P&I · ${fmt(propTax)} tax · ${fmt(insurance)} ins`},
          {l:"Payoff Date",        v:`Age ${payoffAge}`,     c:"#60a5fa",  sub:`${Math.ceil(base.months/12)} years remaining`},
          {l:"Total Interest",     v:fmtK(base.totalInterest),c:"#f87171", sub:"over full loan term"},
        ].map(s=>(
          <div key={s.l} className="card">
            <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
            <div style={{fontSize:11,color:"#334155",marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:14}}>

        {/* Left: inputs + chart */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Mortgage details */}
          <div className="card">
            <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>🏠 Mortgage Details</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {fields.map(f=>(
                <div key={f.l}>
                  <label style={{display:"block",fontSize:10,color:"#475569",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>{f.l}</label>
                  <input style={inp} type="number" step={f.step} min={f.min} max={f.max}
                    value={f.v} onChange={e=>f.set(parseFloat(e.target.value)||0)}/>
                </div>
              ))}
            </div>
          </div>

          {/* Early payoff simulator */}
          <div className="card" style={{border:`1px solid ${extraMonthly>0?"#22c55e":"#1e2130"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:"#4ade80"}}>⚡ Early Payoff Simulator</div>
              {extraMonthly>0&&<span className="tag" style={{background:"#0a1c0a",color:"#4ade80"}}>Active</span>}
            </div>
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <label style={{fontSize:12,color:"#64748b"}}>Extra Monthly Payment</label>
                <span style={{fontSize:14,fontWeight:700,color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmt(extraMonthly)}/mo</span>
              </div>
              <input type="range" style={{width:"100%",accentColor:"#22c55e"}} min={0} max={5000} step={50}
                value={extraMonthly} onChange={e=>setExtraMonthly(parseInt(e.target.value))}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#334155",marginTop:3}}>
                <span>$0</span><span>$1,000</span><span>$2,500</span><span>$5,000</span>
              </div>
            </div>

            {extraMonthly > 0 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[
                  {l:"Time Saved",      v:`${yearsSaved}yr ${remMonths}mo`, c:"#4ade80"},
                  {l:"Interest Saved",  v:fmtK(interestSaved),              c:"#4ade80"},
                  {l:"New Payoff Age",  v:`Age ${earlyPayoffAge}`,          c:"#60a5fa"},
                ].map(s=>(
                  <div key={s.l} style={{background:"#080e18",border:"1px solid #1e2130",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#475569",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>{s.l}</div>
                    <div style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Balance chart */}
          <div className="card">
            <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
              Mortgage Balance vs Home Value Over Time
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{top:5,right:10,left:0,bottom:0}}>
                <defs>
                  <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradExtra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradHome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130"/>
                <XAxis dataKey="year" tick={{fontSize:10,fill:"#475569"}} interval={4}/>
                <YAxis tickFormatter={v=>fmtK(v)} tick={{fontSize:10,fill:"#475569"}} width={55}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="homeValue"   name="Home Value"      stroke="#60a5fa" fill="url(#gradHome)"  strokeWidth={2}/>
                <Area type="monotone" dataKey="baseBalance" name="Balance (standard)" stroke="#f87171" fill="url(#gradBase)" strokeWidth={2}/>
                {extraMonthly>0&&<Area type="monotone" dataKey="extraBalance" name="Balance (extra payments)" stroke="#4ade80" fill="url(#gradExtra)" strokeWidth={2} strokeDasharray="5 3"/>}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Equity breakdown */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>Equity Breakdown</div>
            <div style={{position:"relative",height:120,marginBottom:12}}>
              <div style={{display:"flex",height:"100%",borderRadius:8,overflow:"hidden",gap:2}}>
                <div style={{flex:currentEquity,background:"linear-gradient(135deg,#4ade80,#22c55e)",display:"flex",alignItems:"center",justifyContent:"center",minWidth:40}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#0a1c0a"}}>{equityPct.toFixed(0)}%</span>
                </div>
                <div style={{flex:mortgage,background:"linear-gradient(135deg,#f87171,#dc2626)",display:"flex",alignItems:"center",justifyContent:"center",minWidth:40}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#1c0a0a"}}>{(100-equityPct).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            {[
              {l:"Home Value",       v:fmtK(homeValue),       c:"#e2e8f0"},
              {l:"Mortgage Balance", v:fmtK(mortgage),        c:"#f87171"},
              {l:"Current Equity",   v:fmtK(currentEquity),   c:"#4ade80"},
              {l:"LTV Ratio",        v:`${homeValue>0?(mortgage/homeValue*100).toFixed(1):0}%`, c:"#60a5fa"},
            ].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:12,color:"#475569"}}>{r.l}</span>
                <span style={{fontSize:12,color:r.c,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>Monthly Cost Breakdown</div>
            {[
              {l:"Principal & Interest", v:fmt(basePayment),  c:"#f59e0b", pct:totalPayment>0?basePayment/totalPayment*100:0},
              {l:"Property Tax",         v:fmt(propTax),       c:"#60a5fa", pct:totalPayment>0?propTax/totalPayment*100:0},
              {l:"Insurance",            v:fmt(insurance),     c:"#a78bfa", pct:totalPayment>0?insurance/totalPayment*100:0},
            ].map(r=>(
              <div key={r.l} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{color:"#94a3b8"}}>{r.l}</span>
                  <span style={{color:r.c,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{r.v}</span>
                </div>
                <div className="sbar"><div style={{width:`${r.pct}%`,height:"100%",background:r.c,borderRadius:4}}/></div>
              </div>
            ))}
            <div style={{borderTop:"1px solid #1e2130",paddingTop:10,marginTop:4,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:"#94a3b8",fontWeight:700}}>Total</span>
              <span style={{fontSize:14,color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontWeight:800}}>{fmt(totalPayment)}/mo</span>
            </div>
          </div>

          {/* Full payoff comparison */}
          <div className="card" style={{background:"#080e18",border:"1px solid #1a2a40"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#60a5fa",marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>📊 Payoff Comparison</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                {label:"Standard",    months:base.months,  interest:base.totalInterest,   color:"#f87171", extra:0},
                ...(extraMonthly>0?[{label:"With Extra",  months:extra.months, interest:extra.totalInterest, color:"#4ade80", extra:extraMonthly}]:[]),
              ].map(s=>(
                <div key={s.label} style={{background:"#0f1117",border:`1px solid ${s.color}33`,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:11,color:s.color,fontWeight:700,marginBottom:8}}>{s.label}</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:3}}>Monthly: <span style={{color:"#e2e8f0",fontWeight:600}}>{fmt(basePayment+(s.extra||0))}</span></div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:3}}>Payoff: <span style={{color:"#e2e8f0",fontWeight:600}}>{Math.ceil(s.months/12)} yrs</span></div>
                  <div style={{fontSize:11,color:"#475569"}}>Interest: <span style={{color:s.color,fontWeight:600}}>{fmtK(s.interest)}</span></div>
                </div>
              ))}
            </div>
            {extraMonthly>0&&(
              <div style={{marginTop:10,padding:"10px 12px",background:"#0a1c0a",border:"1px solid #1a4020",borderRadius:8,textAlign:"center"}}>
                <div style={{fontSize:11,color:"#475569",marginBottom:3}}>You save</div>
                <div style={{fontSize:20,fontWeight:800,color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmtK(interestSaved)}</div>
                <div style={{fontSize:11,color:"#475569"}}>in interest · paid off {yearsSaved} years early</div>
              </div>
            )}
          </div>

          {/* Affordability */}
          {(function(){
            const dti = totalPayment > 0 && (inp?.grossIncome||0)>0
              ? totalPayment / ((inp?.grossIncome||0)/12) * 100
              : null;
            return null; // placeholder — grossIncome not in scope here
          })()}
        </div>
      </div>
    </div>
  );
}
