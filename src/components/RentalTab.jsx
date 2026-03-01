import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { fmt, fmtK, pct, COLORS, ACCOUNT_TYPES, TYPE_ICONS, FULL_SS_AGE, SS_COLA } from "../utils.js";

export default function RentalTab({accounts, currentAge, retirementAge, lifeExpectancy, simReturns, setSimReturns, settings, inp, simContribs, propertySales, setPropertySales, updAcc}) {
  const rentalAccs = accounts.filter(a=>a.type==="property"&&!a.isPrimary);
          const [selPropId, setSelPropId] = (()=>{
            // Use a ref-like pattern via simReturns keyed by "rental_sel"
            const sel = simReturns["rental_sel"]??rentalAccs[0]?.id??null;
            return [sel, (id)=>setSimReturns(p=>({...p, rental_sel:id}))];
          })();
          const prop = rentalAccs.find(a=>a.id===selPropId) || rentalAccs[0] || null;

          // Per-property simulator overrides stored in simReturns/simContribs
          const getPropSim = (acc) => ({
            propValue:    simReturns["rpv_"+acc.id]  ?? acc.balance,
            mortgageAmt:  simReturns["rmg_"+acc.id]  ?? (acc.mortgageAmt||0),
            mortgageRate: simReturns["rmr_"+acc.id]  ?? (acc.mortgageRate||6.5),
            equityGrowth: simReturns["reg_"+acc.id]  ?? acc.annualReturn,
            propTax:      simReturns["rpt_"+acc.id]  ?? (acc.propTax||0),
            insurance:    simReturns["rin_"+acc.id]  ?? (acc.insurance||0),
            monthlyRent:  simReturns["rmt_"+acc.id]  ?? acc.monthlyContribution,
            cashInvRate:  simReturns["rci_"+acc.id]  ?? (acc.rentalInvestReturn||4.5),
          });
          // Map sim keys to actual account fields so changes propagate to retCalc
          const SIM_TO_ACC = {
            rmt: "monthlyContribution",
            rpv: "balance",
            reg: "annualReturn",
            rmg: "mortgageAmt",
            rmr: "mortgageRate",
            rpt: "propTax",
            rin: "insurance",
            rci: "rentalInvestReturn",
          };
          const setSim = (acc,key,val) => {
            const numVal = parseFloat(val)||0;
            // Update local sim state for display
            setSimReturns(p=>({...p, [key+"_"+acc.id]: numVal}));
            // Also write to actual account so it propagates globally
            const accField = SIM_TO_ACC[key];
            if(accField && updAcc) updAcc(acc.id, accField, numVal);
          };

          // Build year-by-year projection for one property
          const buildPropRows = (acc) => {
            const s = getPropSim(acc);
            const equity0    = Math.max(0, s.propValue - s.mortgageAmt);
            const annualRent = s.monthlyRent * 12;
            const annualExp  = (s.propTax + s.insurance) * 12;
            const netAnnualCashflow = annualRent - annualExp;
            // Mortgage: monthly payment using standard amortisation
            const mr = s.mortgageRate/100/12;
            const n  = 30*12; // 30 year mortgage
            const monthlyMortgage = s.mortgageAmt>0 && mr>0
              ? s.mortgageAmt * mr * Math.pow(1+mr,n) / (Math.pow(1+mr,n)-1)
              : 0;
            const annualMortgage = monthlyMortgage * 12;
            const netAfterMortgage = netAnnualCashflow - annualMortgage;
            const cashRate = s.cashInvRate/100;
            const eqRate   = s.equityGrowth/100;
            const yrs = lifeExpectancy - currentAge + 1;
            return Array.from({length: yrs}, (_,i)=>{
              const age = currentAge+i;
              const yr  = i;
              // Property value and equity grow at equityGrowth
              const propVal = s.propValue * Math.pow(1+eqRate, yr);
              // Mortgage balance amortises
              let mortBal = s.mortgageAmt;
              for(let m=0;m<yr*12;m++){
                const interest = mortBal*mr;
                const principal = Math.max(0, monthlyMortgage - interest);
                mortBal = Math.max(0, mortBal - principal);
              }
              const equity = Math.max(0, propVal - mortBal);
              // Cash pot: net cashflow reinvested at cashInvRate
              // If cashflow is redirected to earnings (includeInEarnings), it's spent — cashPot = 0
              const saveable = acc.includeInEarnings ? 0 : Math.max(0, netAfterMortgage);
              const cashPot = cashRate>0
                ? saveable * (Math.pow(1+cashRate,yr)-1)/cashRate
                : saveable * yr;
              return {
                age, yr, propVal:Math.round(propVal), mortBal:Math.round(mortBal),
                equity:Math.round(equity), cashPot:Math.round(cashPot),
                combined:Math.round(equity+cashPot),
                monthlyRent:s.monthlyRent,
                monthlyExp: Math.round((s.propTax+s.insurance)),
                monthlyMortgage:Math.round(monthlyMortgage),
                netMonthly:Math.round((netAnnualCashflow-annualMortgage)/12),
              };
            });
          };

          const propRows = prop ? buildPropRows(prop) : [];
          const propAtRetire = propRows.find(r=>r.age===retirementAge);

          // Sale simulation
          const saleData = propertySales[prop?.id];
          const saleAge  = saleData?.saleAge ?? null;
          const deployAccId = saleData?.deployToAccId ?? null;
          const deployAcc = deployAccId ? accounts.find(a=>a.id===deployAccId) : null;
          const investableAccounts = accounts.filter(a=>a.type!=="property"||!a.isPrimary);
          const setSaleAge  = (v) => prop && setPropertySales(p=>({...p,[prop.id]:{...saleData,saleAge:v?parseInt(v):null}}));
          const setDeployTo = (v) => prop && setPropertySales(p=>({...p,[prop.id]:{...saleData,deployToAccId:v?parseInt(v):null}}));
          // Row at sale age
          const saleRow = saleAge ? propRows.find(r=>r.age===saleAge) : null;
          const saleProceeds = saleRow ? saleRow.equity : 0; // Net equity (after mortgage payoff) at sale
          // If deployed, model the lump sum growing from saleAge to lifeExpectancy
          const deployReturn = deployAcc ? (deployAcc.annualReturn/100) : 0.04;
          const yearsDeployed = saleAge ? lifeExpectancy - saleAge : 0;
          const deployedFV = saleProceeds * Math.pow(1+deployReturn, yearsDeployed);
          const deployedFVAtRetire = saleAge && retirementAge >= saleAge
            ? saleProceeds * Math.pow(1+deployReturn, retirementAge-saleAge)
            : saleAge && retirementAge < saleAge ? 0 : 0;

          // Portfolio summary across all rentals
          const allSummary = rentalAccs.map(acc=>{
            const s   = getPropSim(acc);
            const rows= buildPropRows(acc);
            const atRetire = rows.find(r=>r.age===retirementAge)||{};
            const mr  = s.mortgageRate/100/12;
            const n   = 30*12;
            const mp  = s.mortgageAmt>0&&mr>0 ? s.mortgageAmt*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1) : 0;
            const netMo = s.monthlyRent - s.propTax - s.insurance - mp;
            return { acc, s, atRetire, netMo:Math.round(netMo), mp:Math.round(mp) };
          });

          return (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>

              {rentalAccs.length===0&&(
                <div className="card" style={{textAlign:"center",padding:50}}>
                  <div style={{fontSize:28,marginBottom:10}}>🏘️</div>
                  <div style={{fontSize:14,color:"#64748b",marginBottom:6}}>No rental properties yet</div>
                  <div style={{fontSize:12,color:"#334155"}}>Add a property in the <strong style={{color:"#60a5fa"}}>Portfolio tab</strong> with "Primary Residence" unchecked.</div>
                </div>
              )}

              {rentalAccs.length>0&&(
                <>
                {/* Property selector tabs */}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {rentalAccs.map(acc=>(
                    <button key={acc.id} onClick={()=>setSelPropId(acc.id)}
                      style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${selPropId===acc.id?acc.color:"#1e2130"}`,
                        background:selPropId===acc.id?"#0f1520":"transparent",color:selPropId===acc.id?acc.color:"#64748b",
                        cursor:"pointer",fontSize:13,fontWeight:600,transition:"all .15s"}}>
                      🏠 {acc.name}
                    </button>
                  ))}
                  <div style={{marginLeft:"auto",fontSize:11,color:"#475569",alignSelf:"center"}}>
                    Portfolio total rent: <strong style={{color:"#4ade80"}}>{fmt(allSummary.reduce((s,x)=>s+x.s.monthlyRent,0))}/mo</strong>
                  </div>
                </div>

                {prop&&(()=>{
                  const s   = getPropSim(prop);
                  const mr  = s.mortgageRate/100/12;
                  const n30 = 30*12;
                  const mp  = s.mortgageAmt>0&&mr>0 ? s.mortgageAmt*mr*Math.pow(1+mr,n30)/(Math.pow(1+mr,n30)-1) : 0;
                  const netMo = s.monthlyRent - s.propTax - s.insurance - mp;
                  const grossYield = s.propValue>0 ? (s.monthlyRent*12/s.propValue*100) : 0;
                  const netYield   = s.propValue>0 ? (netMo*12/s.propValue*100) : 0;
                  const cashOnCash = (s.mortgageAmt>0&&s.propValue>0) ? (netMo*12/Math.max(1,s.propValue-s.mortgageAmt)*100) : 0;

                  return (
                    <>
                    {/* Net cashflow to earnings toggle */}
                    <div className="card" style={{border:`1px solid ${prop.includeInEarnings?"#22c55e":"#1e2130"}`,background:prop.includeInEarnings?"#071210":"#0f1117"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:prop.includeInEarnings?"#4ade80":"#64748b",marginBottom:4}}>
                            💵 Include Net Cashflow in Earnings
                          </div>
                          <div style={{fontSize:11,color:"#475569",lineHeight:1.5}}>
                            Adds this property's net monthly cashflow ({fmt(netMo)}/mo) to your household income on the Earnings tab, increasing your disposable income and max saveable amount.
                          </div>
                        </div>
                        <button
                          onClick={()=>updAcc(prop.id,"includeInEarnings",!prop.includeInEarnings)}
                          style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:"none",border:"none",padding:0,flexShrink:0}}>
                          <div style={{position:"relative",width:44,height:24,flexShrink:0}}>
                            <div style={{position:"absolute",inset:0,borderRadius:12,background:prop.includeInEarnings?"#16a34a":"#1e2130",transition:"background .2s"}}/>
                            <div style={{position:"absolute",top:3,left:prop.includeInEarnings?22:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
                          </div>
                          <span style={{fontSize:12,color:prop.includeInEarnings?"#4ade80":"#475569",fontWeight:600}}>
                            {prop.includeInEarnings?"Active":"Off"}
                          </span>
                        </button>
                      </div>
                      {prop.includeInEarnings && netMo < 0 && (
                        <div style={{marginTop:10,fontSize:11,color:"#f87171",background:"#1c0a0a",border:"1px solid #3f1a1a",borderRadius:6,padding:"6px 10px"}}>
                          ⚠️ This property currently has negative cashflow ({fmt(netMo)}/mo). Including it will reduce your household income.
                        </div>
                      )}
                    </div>

                    {/* Property inputs */}
                    <div className="card">
                      <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                        🏠 {prop.name} — Property Details
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                        {[
                          {l:"Property Value ($)",      k:"rpv", v:s.propValue,    min:0,    max:5000000, step:5000},
                          {l:"Mortgage Balance ($)",    k:"rmg", v:s.mortgageAmt,  min:0,    max:5000000, step:5000},
                          {l:"Mortgage Rate (%)",       k:"rmr", v:s.mortgageRate, min:0,    max:15,      step:0.1},
                          {l:"Equity Growth % p.a.",   k:"reg", v:s.equityGrowth, min:0,    max:20,      step:0.1},
                          {l:"Monthly Property Tax ($)",k:"rpt", v:s.propTax,      min:0,    max:5000,    step:50},
                          {l:"Monthly Insurance ($)",  k:"rin", v:s.insurance,     min:0,    max:2000,    step:25},
                          {l:"Monthly Rent ($)",        k:"rmt", v:s.monthlyRent,  min:0,    max:20000,   step:100},
                          {l:"Cash Invest Return %",   k:"rci", v:s.cashInvRate,   min:0,    max:15,      step:0.25},
                        ].map(f=>(
                          <div key={f.k}>
                            <label style={{display:"block",fontSize:10,color:"#475569",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>{f.l}</label>
                            <input style={{background:"#1a1d27",border:"1px solid #2a2d3a",borderRadius:6,color:"#e2e8f0",
                              padding:"7px 10px",fontSize:13,fontFamily:"inherit",width:"100%",outline:"none",boxSizing:"border-box"}}
                              type="number" step={f.step} value={f.v}
                              onChange={e=>setSim(prop,f.k,e.target.value)}/>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key metrics */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
                      {[
                        {l:"Current Equity",       v:fmtK(Math.max(0,s.propValue-s.mortgageAmt)),  c:prop.color},
                        {l:"Monthly Mortgage",     v:fmt(mp),                                        c:"#f87171"},
                        {l:"Net Monthly Cashflow", v:fmt(netMo),                                     c:netMo>=0?"#4ade80":"#f87171"},
                        {l:"Gross Yield",          v:`${grossYield.toFixed(2)}%`,                    c:"#f59e0b"},
                        {l:"Cash-on-Cash Return",  v:`${cashOnCash.toFixed(2)}%`,                    c:"#60a5fa"},
                      ].map(s=>(
                        <div key={s.l} className="scard">
                          <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>{s.l}</div>
                          <div style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Monthly cashflow breakdown */}
                    <div className="card">
                      <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>Monthly Cashflow Breakdown</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {[
                          {l:"Gross Rent",         v:fmt(s.monthlyRent),              c:"#4ade80",  sign:"+"},
                          {l:"Mortgage Payment",   v:fmt(-mp),                         c:"#f87171",  sign:"-"},
                          {l:"Property Tax",       v:fmt(-s.propTax),                  c:"#f59e0b",  sign:"-"},
                          {l:"Insurance",          v:fmt(-s.insurance),                c:"#f59e0b",  sign:"-"},
                          {l:"Net Cashflow",       v:fmt(netMo),                       c:netMo>=0?"#4ade80":"#f87171", sign:"=", bold:true},
                        ].map(r=>(
                          <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                            padding:"8px 12px",borderRadius:6,background:r.bold?"#0f1520":"transparent",
                            borderBottom:r.bold?"none":"1px solid #131520"}}>
                            <span style={{fontSize:13,color:r.bold?"#e2e8f0":"#64748b",fontWeight:r.bold?700:400}}>
                              <span style={{color:r.c,marginRight:8,fontFamily:"monospace"}}>{r.sign}</span>{r.l}
                            </span>
                            <span style={{fontSize:14,fontWeight:700,color:r.c,fontFamily:"'DM Mono',monospace"}}>{r.v}/mo</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Property Sale Simulation ── */}
                    <div className="card" style={{border:"1px solid #2a1f3f",background:"#0a0812"}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#c084fc",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                        🏷️ Property Sale Simulation
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                        <div>
                          <label style={{display:"block",fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Sell at Age (leave blank to keep)</label>
                          <input style={{...inp,borderColor:"#2a1f3f"}} type="number" min={currentAge} max={lifeExpectancy}
                            placeholder="e.g. 55"
                            value={saleAge||""}
                            onChange={e=>setSaleAge(e.target.value||null)}/>
                        </div>
                        <div>
                          <label style={{display:"block",fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Deploy proceeds to</label>
                          <select style={{...inp,borderColor:"#2a1f3f"}} value={deployAccId||""} onChange={e=>setDeployTo(e.target.value||null)}>
                            <option value="">-- choose account --</option>
                            {investableAccounts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.annualReturn}%)</option>)}
                          </select>
                        </div>
                      </div>
                      {saleRow&&(
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                          {[
                            {l:"Sale Age",             v:`Age ${saleAge}`,              c:"#c084fc"},
                            {l:"Property Value",       v:fmtK(saleRow.propVal),         c:"#e2e8f0"},
                            {l:"Net Equity (proceeds)",v:fmtK(saleProceeds),            c:"#4ade80"},
                            ...(deployAcc?[
                              {l:`Deployed to ${deployAcc.name}`,  v:fmtK(saleProceeds),  c:"#60a5fa"},
                              {l:`Return Rate`,                     v:`${deployAcc.annualReturn}%`, c:"#60a5fa"},
                              {l:`Value at Age ${lifeExpectancy}`, v:fmtK(deployedFV),    c:"#4ade80"},
                            ]:[]),
                          ].map(s=>(
                            <div key={s.l} className="scard" style={{padding:"10px 12px"}}>
                              <div style={{fontSize:9,color:"#475569",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{s.l}</div>
                              <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {saleAge&&!saleRow&&<div style={{color:"#f87171",fontSize:12}}>Sale age {saleAge} is outside projection range.</div>}
                      {saleAge&&saleRow&&(()=>{
                        // ── Sell vs Hold analysis ──────────────────────────────
                        const COST_PCT       = 0.25; // capital gains + closing costs
                        const netAfterCosts  = saleProceeds * (1 - COST_PCT);
                        const annualCashflow = netMo * 12;
                        // Years of equivalent cashflow the net proceeds would fund
                        const yearsOfCashflow = annualCashflow > 0
                          ? netAfterCosts / annualCashflow
                          : null;
                        // Deployed FV at lifeExpectancy (already computed above)
                        // Hold: cashflow pot grown to lifeExpectancy
                        const holdYrs      = lifeExpectancy - saleAge;
                        const cashRate     = s.cashInvRate / 100;
                        const annSaveable  = Math.max(0, netMo) * 12;
                        const holdCashPotFV = cashRate > 0
                          ? annSaveable * (Math.pow(1+cashRate, holdYrs) - 1) / cashRate
                          : annSaveable * holdYrs;
                        // Equity still growing if held
                        const holdEquityFV = saleRow.propVal * Math.pow(1 + s.equityGrowth/100, holdYrs);
                        const holdTotalFV  = holdCashPotFV + holdEquityFV;
                        // Sell: deployed proceeds FV
                        const sellFV = deployAcc ? deployedFV : netAfterCosts;
                        const sellWins = deployAcc ? sellFV > holdTotalFV : null;
                        const recommendation = !deployAcc
                          ? null
                          : sellWins
                            ? "sell"
                            : "hold";

                        return (
                          <div style={{display:"flex",flexDirection:"column",gap:10}}>
                            {/* Sell vs Hold stat cards */}
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                              {/* SELL */}
                              <div style={{background:"#0d0820",border:`2px solid ${recommendation==="sell"?"#a855f7":"#2a1f3f"}`,borderRadius:10,padding:"12px 14px"}}>
                                <div style={{fontSize:11,fontWeight:700,color:"#c084fc",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>
                                  🏷️ Sell at Age {saleAge}
                                  {recommendation==="sell"&&<span style={{marginLeft:8,background:"#4c1d95",color:"#e9d5ff",fontSize:9,padding:"2px 6px",borderRadius:4}}>RECOMMENDED</span>}
                                </div>
                                {[
                                  {l:"Gross Proceeds",       v:fmt(saleProceeds)},
                                  {l:"Costs (25% cap gains + closing)", v:`-${fmt(saleProceeds*COST_PCT)}`},
                                  {l:"Net After Costs",      v:fmt(netAfterCosts), bold:true, c:"#e2e8f0"},
                                  ...(annualCashflow>0?[{l:"Equivalent cashflow funded", v:`${yearsOfCashflow?.toFixed(1)} yrs`}]:[]),
                                  ...(deployAcc?[
                                    {l:`Deployed to ${deployAcc.name}`,v:fmt(netAfterCosts)},
                                    {l:`Value at Age ${lifeExpectancy}`,v:fmtK(sellFV), bold:true, c:"#a855f7"},
                                  ]:[{l:"Select an account above","v":"to model growth"}]),
                                ].map(r=>(
                                  <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #1e1030",fontSize:11}}>
                                    <span style={{color:"#64748b"}}>{r.l}</span>
                                    <span style={{color:r.c||(r.v?.toString().startsWith("-")?"#f87171":"#e2e8f0"),fontWeight:r.bold?700:500,fontFamily:"'DM Mono',monospace"}}>{r.v}</span>
                                  </div>
                                ))}
                              </div>

                              {/* HOLD */}
                              <div style={{background:"#080e18",border:`2px solid ${recommendation==="hold"?"#22c55e":"#1e2130"}`,borderRadius:10,padding:"12px 14px"}}>
                                <div style={{fontSize:11,fontWeight:700,color:"#4ade80",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>
                                  🏠 Hold from Age {saleAge}
                                  {recommendation==="hold"&&<span style={{marginLeft:8,background:"#052e16",color:"#86efac",fontSize:9,padding:"2px 6px",borderRadius:4}}>RECOMMENDED</span>}
                                </div>
                                {[
                                  {l:"Monthly Net Cashflow",       v:fmt(netMo)},
                                  {l:"Annual Cashflow",            v:fmt(netMo*12)},
                                  {l:`Cashflow invested at ${s.cashInvRate}%`, v:""},
                                  {l:`Cashflow pot at age ${lifeExpectancy}`,  v:fmtK(holdCashPotFV), c:"#4ade80"},
                                  {l:`Equity value at age ${lifeExpectancy}`,  v:fmtK(holdEquityFV),  c:"#60a5fa"},
                                  {l:"Total (equity + cashflow)",  v:fmtK(holdTotalFV), bold:true, c:"#4ade80"},
                                ].map(r=>(
                                  <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #0e1a10",fontSize:11}}>
                                    <span style={{color:"#64748b"}}>{r.l}</span>
                                    <span style={{color:r.c||"#e2e8f0",fontWeight:r.bold?700:500,fontFamily:"'DM Mono',monospace"}}>{r.v}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Recommendation banner */}
                            {recommendation&&(
                              <div style={{
                                background: recommendation==="sell"?"#150d2a":"#071a0f",
                                border:`1px solid ${recommendation==="sell"?"#7c3aed":"#16a34a"}`,
                                borderRadius:8, padding:"12px 14px", fontSize:12, lineHeight:1.7,
                                color: recommendation==="sell"?"#e9d5ff":"#bbf7d0"
                              }}>
                                {recommendation==="sell"?(
                                  <>
                                    <strong>📊 Recommendation: Sell</strong><br/>
                                    Selling at age {saleAge} nets {fmt(netAfterCosts)} after costs. Deployed to <strong>{deployAcc.name}</strong> at {deployAcc.annualReturn}%,
                                    it grows to <strong>{fmtK(sellFV)}</strong> by age {lifeExpectancy} —{" "}
                                    <strong>{fmtK(sellFV - holdTotalFV)} more</strong> than holding.
                                    {annualCashflow>0&&<> The net proceeds fund {yearsOfCashflow?.toFixed(1)} years of equivalent cashflow ({fmt(netAfterCosts)} ÷ {fmt(annualCashflow)}/yr).</>}
                                  </>
                                ):(
                                  <>
                                    <strong>📊 Recommendation: Hold</strong><br/>
                                    Holding generates {fmt(netMo*12)}/yr in cashflow. Invested at {s.cashInvRate}%, the cashflow pot reaches <strong>{fmtK(holdCashPotFV)}</strong> plus
                                    property equity of <strong>{fmtK(holdEquityFV)}</strong> = <strong>{fmtK(holdTotalFV)}</strong> by age {lifeExpectancy} —{" "}
                                    <strong>{fmtK(holdTotalFV - sellFV)} more</strong> than selling and deploying.
                                    {annualCashflow>0&&<> Selling would only fund {yearsOfCashflow?.toFixed(1)} years of equivalent cashflow.</>}
                                  </>
                                )}
                              </div>
                            )}
                            {deployAcc&&retirementAge>=saleAge&&(
                              <div style={{fontSize:11,color:"#475569"}}>
                                → Deployed proceeds at retirement (age {retirementAge}): <strong style={{color:"#f59e0b"}}>{fmtK(deployedFVAtRetire)}</strong>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {!saleAge&&<div style={{fontSize:11,color:"#334155"}}>Enter a sale age above to model selling this property and deploying the proceeds.</div>}
                    </div>

                                        {/* Growth chart */}
                    <div className="card">
                      <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
                        Property Equity & Invested Cashflow Growth
                      </div>
                      <div style={{fontSize:11,color:"#334155",marginBottom:14}}>
                        Equity grows as property appreciates and mortgage is paid down. Net cashflow ({fmt(Math.max(0,netMo))}/mo) is invested at {s.cashInvRate}%.
                        {netMo<0&&<span style={{color:"#f87171"}}> ⚠️ Negative cashflow — no cash pot accumulates until cashflow turns positive.</span>}
                      </div>
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={propRows.filter((_,i)=>i%2===0||propRows[i]?.age===retirementAge)} margin={{top:5,right:10,left:10,bottom:5}}>
                          <defs>
                            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={prop.color} stopOpacity={0.35}/>
                              <stop offset="95%" stopColor={prop.color} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="cpGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false}/>
                          <XAxis dataKey="age" stroke="#334155" tick={{fill:"#475569",fontSize:11}}/>
                          <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:11}} tickFormatter={fmtK} width={72}/>
                          <Tooltip content={({active,payload,label})=>{
                            if(!active||!payload?.length) return null;
                            return(
                              <div style={{background:"#0a0c14",border:"1px solid #2a2d3a",borderRadius:8,padding:"10px 14px",fontSize:12}}>
                                <div style={{color:"#94a3b8",fontWeight:700,marginBottom:6}}>Age {label}</div>
                                {payload.map(p=>(
                                  <div key={p.name} style={{display:"flex",justifyContent:"space-between",gap:14,marginBottom:3}}>
                                    <span style={{color:p.stroke,opacity:.9}}>{p.name}</span>
                                    <strong style={{color:p.stroke}}>{fmtK(p.value)}</strong>
                                  </div>
                                ))}
                              </div>
                            );
                          }}/>
                          <Legend wrapperStyle={{fontSize:11,color:"#64748b"}}/>
                          <Area type="monotone" dataKey="equity"   name="Property Equity"     stroke={prop.color} fill="url(#eqGrad)" strokeWidth={2.5} dot={false}/>
                          <Area type="monotone" dataKey="cashPot"  name="Invested Cashflow"   stroke="#4ade80"    fill="url(#cpGrad)" strokeWidth={2}   dot={false}/>
                          <Area type="monotone" dataKey="combined" name="Total Combined"       stroke="#f59e0b"    fill="none"         strokeWidth={1.5} dot={false} strokeDasharray="4 3"/>
                        </AreaChart>
                      </ResponsiveContainer>
                      <div style={{display:"flex",gap:16,marginTop:8,fontSize:11,color:"#475569"}}>
                        <span><span style={{color:"#f87171"}}>●</span> Retirement (age {retirementAge}): Equity {fmtK(propAtRetire?.equity||0)} · Cash {fmtK(propAtRetire?.cashPot||0)} · Total {fmtK(propAtRetire?.combined||0)}</span>
                      </div>
                    </div>

                    {/* Year by year table */}
                    <div className="card">
                      <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                        Year-by-Year Mortgage, Equity & Cashflow
                      </div>
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                          <thead>
                            <tr style={{borderBottom:"1px solid #1e2130"}}>
                              {["Age","Prop Value","Mortgage Bal","Equity","Net Mo. CF","Invested Cash","Combined"].map(h=>(
                                <th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {propRows.map(row=>{
                              const isRetire   = row.age===retirementAge;
                              const isHighlight= (row.yr%5===0)||isRetire||row.age===lifeExpectancy;
                              return(
                                <tr key={row.age} style={{borderBottom:"1px solid #0c0e14",
                                  background:isRetire?"#0f1a0a":isHighlight?"#0f1520":"transparent",
                                  borderLeft:isRetire?`3px solid ${prop.color}`:"3px solid transparent"}}>
                                  <td style={{padding:"5px 10px",fontWeight:isHighlight?700:400,color:isRetire?prop.color:isHighlight?"#60a5fa":"#94a3b8",fontFamily:"'DM Mono',monospace"}}>
                                    {row.age}{isRetire?" 🎯":""}
                                  </td>
                                  <td style={{padding:"5px 10px",color:"#e2e8f0",fontFamily:"'DM Mono',monospace"}}>{fmtK(row.propVal)}</td>
                                  <td style={{padding:"5px 10px",color:"#f87171",fontFamily:"'DM Mono',monospace"}}>{row.mortBal>0?fmtK(row.mortBal):"✅ Paid off"}</td>
                                  <td style={{padding:"5px 10px",color:prop.color,fontWeight:isHighlight?700:400,fontFamily:"'DM Mono',monospace"}}>{fmtK(row.equity)}</td>
                                  <td style={{padding:"5px 10px",color:row.netMonthly>=0?"#4ade80":"#f87171",fontFamily:"'DM Mono',monospace"}}>{fmt(row.netMonthly)}</td>
                                  <td style={{padding:"5px 10px",color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmtK(row.cashPot)}</td>
                                  <td style={{padding:"5px 10px",color:"#f59e0b",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtK(row.combined)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Portfolio summary (all rentals) */}
                    {rentalAccs.length>1&&(
                      <div className="card">
                        <div style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
                          📊 Full Rental Portfolio at Retirement (Age {retirementAge})
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead>
                            <tr style={{borderBottom:"1px solid #1e2130"}}>
                              {["Property","Net Mo. CF","Equity at Retire","Cash at Retire","Combined"].map(h=>(
                                <th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {allSummary.map(({acc,netMo,atRetire})=>(
                              <tr key={acc.id} style={{borderBottom:"1px solid #0c0e14"}}>
                                <td style={{padding:"6px 10px",color:acc.color,fontWeight:600}}>{acc.name}</td>
                                <td style={{padding:"6px 10px",color:netMo>=0?"#4ade80":"#f87171",fontFamily:"'DM Mono',monospace"}}>{fmt(netMo)}</td>
                                <td style={{padding:"6px 10px",color:acc.color,fontFamily:"'DM Mono',monospace"}}>{fmtK(atRetire?.equity||0)}</td>
                                <td style={{padding:"6px 10px",color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmtK(atRetire?.cashPot||0)}</td>
                                <td style={{padding:"6px 10px",color:"#f59e0b",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtK(atRetire?.combined||0)}</td>
                              </tr>
                            ))}
                            <tr style={{borderTop:"2px solid #3b82f6",background:"#0e1a2e"}}>
                              <td style={{padding:"7px 10px",fontWeight:700,color:"#60a5fa"}}>TOTAL</td>
                              <td style={{padding:"7px 10px",color:allSummary.reduce((s,x)=>s+x.netMo,0)>=0?"#4ade80":"#f87171",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmt(allSummary.reduce((s,x)=>s+x.netMo,0))}</td>
                              <td style={{padding:"7px 10px",color:"#60a5fa",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtK(allSummary.reduce((s,x)=>s+(x.atRetire?.equity||0),0))}</td>
                              <td style={{padding:"7px 10px",color:"#4ade80",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtK(allSummary.reduce((s,x)=>s+(x.atRetire?.cashPot||0),0))}</td>
                              <td style={{padding:"7px 10px",color:"#f59e0b",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtK(allSummary.reduce((s,x)=>s+(x.atRetire?.combined||0),0))}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    </>
                  );
                })()}
                </>
              )}
            </div>
          );
}
