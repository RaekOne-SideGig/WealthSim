import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ACCOUNT_TYPES, BRACKETS, COLORS, FULL_SS_AGE, SS_COLA, STD_DED, SS_WAGE_BASE, TYPE_ICONS, calcTax, calcFICA, calcTotalTaxMonthly, effRate, fmt, fmtK, margRate, pct } from "../utils.js";

export default function EarningsTab({accounts, nonPrimary, earnings, settings, currentAge, retirementAge, effectiveContrib, inp, updateEarnings, sl, monthlySavings, bonusAfterTax, bonusSaved, allocMap, bonusAllocMap, totalAllocPct, totalBonusAllocPct, earningsContribForYear, scenarioMult, salaryGrowthRate, expenses, rentalCashflowMonthly}) {

  // ── Partner income ─────────────────────────────────────────────────────
  const partnerIncome = earnings.partnerIncome || 0;

  // ── Household income summary ───────────────────────────────────────────
  const grossAnnual         = earnings.grossIncome || 0;
  const grossMonthly        = grossAnnual / 12;
  const myFedTax            = calcTax(grossAnnual) / 12;
  const myFICA              = calcFICA(grossAnnual) / 12;
  const employerBenefits    = earnings.employerBenefits || 0; // monthly, pre-set by user
  const myTotalTax          = myFedTax + myFICA;
  const myNetMonthly        = grossMonthly - myTotalTax - employerBenefits;
  const partnerNetMonthly   = partnerIncome; // already net as entered
  const rentalNet           = rentalCashflowMonthly || 0;
  const combinedNetMonthly  = myNetMonthly + partnerNetMonthly + rentalNet;

  // ── Expenses cap ──────────────────────────────────────────────────────
  const totalExpenses = expenses?.items
    ? Object.values(expenses.items).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    : 0;

  // Max saveable = combined net minus all fixed expenses (hard cap)
  // Residual = what's left after tax and expenses — this is the savings pool
  const residualMonthly    = Math.max(0, combinedNetMonthly - totalExpenses);
  // savingsPct is now % of residual (not gross). 100% = save everything left.
  const mySavingsMonthly   = residualMonthly * ((earnings.savingsPct || 0) / 100);
  const spendEnjoyMonthly  = residualMonthly - mySavingsMonthly;
  // Legacy: keep maxSaveableMonthly alias for household summary
  const maxSaveableMonthly = residualMonthly;
  const isCapped           = false; // can't go over — slider is capped at 100%

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

        {/* ── Salary & Savings ── */}
        <div className="card">
          <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>Salary & Savings Rate</div>

          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:5,fontWeight:700,textTransform:"uppercase"}}>Gross Annual Salary</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:14}}>$</span>
              <input style={{...inp,paddingLeft:22}} type="number" value={earnings.grossIncome}
                onChange={e=>updateEarnings("grossIncome",parseFloat(e.target.value)||0)}/>
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <label style={{fontSize:12,color:"#94a3b8"}}>Savings Rate of Residual Income</label>
              <span style={{fontSize:16,fontWeight:700,color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{earnings.savingsPct}%</span>
            </div>
            <div style={{fontSize:10,color:"#475569",marginBottom:6}}>
              {residualMonthly > 0
                ? `Residual after tax${totalExpenses>0?" & expenses":""}: ${fmt(residualMonthly)}/mo · 100% = ${fmt(residualMonthly)} saved`
                : totalExpenses > 0 ? "No residual — expenses exceed combined net income" : "Add expenses to see your true residual"}
            </div>
            <input type="range" style={{...sl,accentColor:"#4ade80"}}
              min={0} max={100} step={1}
              value={earnings.savingsPct}
              onChange={e=>updateEarnings("savingsPct",parseInt(e.target.value))}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#334155",marginTop:2}}>
              <span>0% (save nothing)</span><span>100% (save all residual)</span>
            </div>
          </div>

          {/* Salary breakdown */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:5,fontWeight:700,textTransform:"uppercase"}}>Employer Benefit Expenses</label>
            <div style={{fontSize:10,color:"#334155",marginBottom:6}}>Monthly pre-tax deductions: health insurance, dental, 401k employer plan fees, FSA, etc.</div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:14}}>$</span>
              <input style={{...inp,paddingLeft:22}} type="number" min="0" step="10" placeholder="0"
                value={earnings.employerBenefits||""}
                onChange={e=>updateEarnings("employerBenefits",parseFloat(e.target.value)||0)}/>
            </div>
          </div>

          {[
            {l:"Monthly Gross",          v:grossMonthly,              c:"#60a5fa"},
            {l:"Federal Tax",            v:-myFedTax,                 c:"#f87171"},
            {l:"SS & Medicare (FICA)",   v:-myFICA,                   c:"#f87171"},
            ...(employerBenefits>0?[{l:"Employer Benefit Deductions",v:-employerBenefits,c:"#f87171"}]:[]),
            {l:"Monthly Net (you)",      v:myNetMonthly,              c:"#94a3b8"},
            ...(partnerIncome>0?[{l:"Partner Monthly Net",v:partnerNetMonthly,c:"#a78bfa"}]:[]),
            ...(rentalNet!==0?[{l:"Rental Net Cashflow",v:rentalNet,c:rentalNet>=0?"#4ade80":"#f87171"}]:[]),
            ...(totalExpenses>0?[{l:"Expenses",v:-totalExpenses,c:"#f87171"}]:[]),
            {l:"Residual Income",        v:residualMonthly,           c:"#e2e8f0", bold:true},
            {l:"Monthly Savings",        v:mySavingsMonthly,          c:"#4ade80", bold:true},
            {l:"Spend / Enjoy",          v:spendEnjoyMonthly,         c:"#f59e0b"},
            {l:"Annual Federal Tax",     v:calcTax(grossAnnual),      c:"#f87171"},
            {l:"Annual FICA",            v:calcFICA(grossAnnual),     c:"#f87171"},
            {l:"Total Tax Rate (fed+FICA)",v:null, label2:`${((calcTax(grossAnnual)+calcFICA(grossAnnual))/grossAnnual*100).toFixed(1)}%`, c:"#a78bfa"},
            {l:"Marginal Fed Rate",      v:null, label2:`${margRate(grossAnnual).toFixed(0)}%`,c:"#fb923c"},
          ].map(r=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #131520"}}>
              <span style={{fontSize:13,color:"#94a3b8"}}>{r.l}</span>
              <span style={{fontSize:14,fontWeight:700,color:r.c,fontFamily:"'DM Mono',monospace"}}>
                {r.label2 || (r.v < 0 ? `-${fmt(Math.abs(r.v))}` : fmt(r.v))}/mo
              </span>
            </div>
          ))}
        </div>

        {/* ── Bonus ── */}
        <div className="card">
          <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>💰 Annual Bonus</div>
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:5,fontWeight:700,textTransform:"uppercase"}}>Gross Bonus Amount</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:14}}>$</span>
              <input style={{...inp,paddingLeft:22}} type="number" value={earnings.bonusAmount}
                onChange={e=>updateEarnings("bonusAmount",parseFloat(e.target.value)||0)}/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <label style={{fontSize:12,color:"#94a3b8"}}>Bonus Tax Rate (supplemental)</label>
              <span style={{fontSize:14,fontWeight:700,color:"#f87171",fontFamily:"'DM Mono',monospace"}}>{earnings.bonusTaxRate}%</span>
            </div>
            <input type="range" style={{...sl,accentColor:"#f87171"}} min={22} max={65} step={1}
              value={earnings.bonusTaxRate} onChange={e=>updateEarnings("bonusTaxRate",parseInt(e.target.value))}/>
            <div style={{fontSize:10,color:"#334155",marginTop:4}}>Federal supplemental rate is 22% flat; total with state/FICA is typically 40–50%</div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <label style={{fontSize:12,color:"#94a3b8"}}>% of After-Tax Bonus to Save</label>
              <span style={{fontSize:14,fontWeight:700,color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{earnings.bonusSavePct}%</span>
            </div>
            <input type="range" style={{...sl,accentColor:"#4ade80"}} min={0} max={100} step={5}
              value={earnings.bonusSavePct} onChange={e=>updateEarnings("bonusSavePct",parseInt(e.target.value))}/>
          </div>
          {[
            {l:"Gross Bonus",          v:earnings.bonusAmount,                             c:"#f59e0b"},
            {l:"Tax (supplemental)",   v:earnings.bonusAmount*(earnings.bonusTaxRate/100), c:"#f87171"},
            {l:"After-Tax Bonus",      v:bonusAfterTax,                                    c:"#4ade80"},
            {l:"Amount Saved",         v:bonusSaved,                                       c:"#60a5fa"},
            {l:"Spend / Enjoy",        v:bonusAfterTax-bonusSaved,                         c:"#a78bfa"},
            {l:"Monthly Equiv (saved)",v:bonusSaved/12,                                    c:"#34d399"},
          ].map(r=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #131520"}}>
              <span style={{fontSize:12,color:"#94a3b8"}}>{r.l}</span>
              <span style={{fontSize:13,fontWeight:700,color:r.c,fontFamily:"'DM Mono',monospace"}}>{fmtK(r.v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Partner Income & Household Summary ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

        <div className="card" style={{border:"1px solid #1a2540"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>👫 Partner Income</div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:5,fontWeight:700,textTransform:"uppercase"}}>Partner Monthly Net Income</label>
            <div style={{fontSize:10,color:"#334155",marginBottom:6}}>Enter their actual take-home after tax (not gross). This is added directly to household net.</div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:14}}>$</span>
              <input style={{...inp,paddingLeft:22}} type="number" placeholder="0"
                value={partnerIncome||""}
                onChange={e=>updateEarnings("partnerIncome",parseFloat(e.target.value)||0)}/>
            </div>
          </div>
          {partnerIncome > 0 && (
            <div>
              {[
                {l:"Partner Monthly Net",   v:partnerIncome,             c:"#a78bfa"},
                {l:"Partner Annual Net",    v:partnerIncome*12,          c:"#a78bfa"},
              ].map(r=>(
                <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #131520"}}>
                  <span style={{fontSize:12,color:"#94a3b8"}}>{r.l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:r.c,fontFamily:"'DM Mono',monospace"}}>{fmtK(r.v)}</span>
                </div>
              ))}
              <div style={{marginTop:10,fontSize:10,color:"#475569",lineHeight:1.5}}>
                Partner income is added to household net for max savings calculations. It does not affect your salary tax brackets or bonus calculations.
              </div>
            </div>
          )}
        </div>

        {/* Household summary */}
        <div className="card" style={{border:"1px solid #1a2a40",background:"#080e18"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#60a5fa",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>🏠 Household Income Summary</div>
          {[
            {l:"Your Monthly Net",          v:myNetMonthly,          c:"#60a5fa"},
            ...(partnerIncome>0?[{l:"Partner Monthly Net",     v:partnerNetMonthly,    c:"#a78bfa"}]:[]),
            {l:"Combined Monthly Net",      v:combinedNetMonthly,    c:"#e2e8f0", bold:true},
            ...(totalExpenses>0?[
              {l:"Total Monthly Expenses",  v:-totalExpenses,        c:"#f87171"},
              {l:"Max Saveable Monthly",    v:maxSaveableMonthly,    c:maxSaveableMonthly>0?"#4ade80":"#f87171", bold:true},
            ]:[]),
            {l:"Currently Saving (salary)", v:mySavingsMonthly,      c:"#4ade80"},
            ...(totalExpenses>0?[{l:"Remaining Headroom",      v:Math.max(0,maxSaveableMonthly-mySavingsMonthly), c:"#34d399"}]:[]),
          ].map(r=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:r.bold?"9px 0":"6px 0",
              borderBottom:"1px solid #131520",
              ...(r.bold?{borderTop:"1px solid #1e2130",marginTop:4}:{})}}>
              <span style={{fontSize:r.bold?13:12,color:"#94a3b8",fontWeight:r.bold?700:400}}>{r.l}</span>
              <span style={{fontSize:r.bold?15:13,fontWeight:700,color:r.c,fontFamily:"'DM Mono',monospace"}}>
                {r.v<0?`-${fmt(Math.abs(r.v))}`:fmt(r.v)}/mo
              </span>
            </div>
          ))}
          {totalExpenses===0&&(
            <div style={{fontSize:11,color:"#334155",marginTop:8}}>
              Add expenses on the <strong style={{color:"#a78bfa"}}>Expenses tab</strong> to see your max saveable cap here.
            </div>
          )}

        </div>
      </div>

      {/* ── Savings allocation ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div className="card">
          <div style={{fontSize:13,fontWeight:700,color:"#4ade80",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Monthly Salary Savings Allocation</div>
          <div style={{fontSize:12,color:"#334155",marginBottom:12}}>Distribute {fmt(monthlySavings)}/mo across accounts</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:12,color:"#64748b"}}>Allocated</span>
            <span style={{fontSize:13,fontWeight:700,color:totalAllocPct>100?"#f87171":totalAllocPct===100?"#4ade80":"#f59e0b",fontFamily:"'DM Mono',monospace"}}>
              {totalAllocPct.toFixed(0)}%{totalAllocPct>100?" ⚠️ Over":totalAllocPct===100?" ✅":` (${(100-totalAllocPct).toFixed(0)}% unallocated)`}
            </span>
          </div>
          {nonPrimary.map(acc=>{
            const p=parseFloat(allocMap[acc.id])||0;
            return(
              <div key={acc.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,color:"#94a3b8",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:acc.color,display:"inline-block"}}/> {acc.name}
                  </span>
                  <span style={{fontSize:12,fontWeight:600,color:acc.color,fontFamily:"'DM Mono',monospace"}}>{p}% · {fmt(monthlySavings*p/100)}/mo</span>
                </div>
                <input type="range" style={{...sl,accentColor:acc.color}} min={0} max={100} step={1} value={p}
                  onChange={e=>updateEarnings("allocationMap",{...allocMap,[acc.id]:parseInt(e.target.value)})}/>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Annual Bonus Savings Allocation</div>
          <div style={{fontSize:12,color:"#334155",marginBottom:12}}>Distribute {fmt(bonusSaved)} saved bonus across accounts</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:12,color:"#64748b"}}>Allocated</span>
            <span style={{fontSize:13,fontWeight:700,color:totalBonusAllocPct>100?"#f87171":totalBonusAllocPct===100?"#4ade80":"#f59e0b",fontFamily:"'DM Mono',monospace"}}>
              {totalBonusAllocPct.toFixed(0)}%{totalBonusAllocPct>100?" ⚠️ Over":totalBonusAllocPct===100?" ✅":` (${(100-totalBonusAllocPct).toFixed(0)}% unallocated)`}
            </span>
          </div>
          {nonPrimary.map(acc=>{
            const p=parseFloat(bonusAllocMap[acc.id])||0;
            return(
              <div key={acc.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,color:"#94a3b8",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:acc.color,display:"inline-block"}}/> {acc.name}
                  </span>
                  <span style={{fontSize:12,fontWeight:600,color:acc.color,fontFamily:"'DM Mono',monospace"}}>{p}% · {fmt(bonusSaved*p/100)}/yr</span>
                </div>
                <input type="range" style={{...sl,accentColor:acc.color}} min={0} max={100} step={1} value={p}
                  onChange={e=>updateEarnings("bonusAllocMap",{...bonusAllocMap,[acc.id]:parseInt(e.target.value)})}/>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tax snapshot ── */}
      <div className="card">
        <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>Tax Snapshot — 2024 (Federal + FICA)</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:14}}>
          {[
            {l:"Gross Income",      v:fmt(earnings.grossIncome),                                                                           c:"#60a5fa"},
            {l:"Std Deduction",     v:fmt(STD_DED),                                                                                        c:"#64748b"},
            {l:"Federal Tax",       v:fmt(calcTax(earnings.grossIncome)),                                                                   c:"#f87171"},
            {l:"SS Tax (6.2%)",     v:fmt(Math.min(earnings.grossIncome,SS_WAGE_BASE)*0.062),                                               c:"#fb923c"},
            {l:"Medicare (1.45%+)", v:fmt(earnings.grossIncome*0.0145+Math.max(0,earnings.grossIncome-200000)*0.009),                       c:"#fb923c"},
            {l:"Total FICA",        v:fmt(calcFICA(earnings.grossIncome)),                                                                  c:"#f87171"},
            {l:"Fed Effective Rate",v:`${effRate(earnings.grossIncome).toFixed(1)}%`,                                                       c:"#a78bfa"},
            {l:"Total Tax Rate",    v:`${((calcTax(earnings.grossIncome)+calcFICA(earnings.grossIncome))/Math.max(1,earnings.grossIncome)*100).toFixed(1)}%`, c:"#e879f9"},
          ].map(s=>(
            <div key={s.l} className="scard" style={{padding:"10px 12px"}}>
              <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>{s.l}</div>
              <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:12,color:"#475569",marginBottom:8}}>Tax Brackets</div>
        <div style={{display:"flex",gap:2,height:14,borderRadius:6,overflow:"hidden"}}>
          {BRACKETS.filter(b=>b.up!==Infinity).map((b,i)=>{
            const taxable=Math.max(0,earnings.grossIncome-STD_DED);
            const prev=i>0?BRACKETS[i-1].up:0;
            const inB=Math.min(taxable,b.up)-prev;
            const p=taxable>0?Math.max(0,inB/taxable*100):0;
            if(p<=0)return null;
            const bc=["#4ade80","#a3e635","#fbbf24","#fb923c","#f87171","#e879f9","#c084fc"];
            return <div key={i} style={{width:`${p}%`,height:"100%",background:bc[i]}} title={`${b.rate*100}%`}/>;
          })}
        </div>
      </div>

      {/* ── Year-over-year projection ── */}
      {(()=>{
        const accBalances = {};
        nonPrimary.forEach(acc => { accBalances[acc.id] = acc.balance; });

        const earningsRows = Array.from({length: retirementAge - currentAge}, (_, i) => {
          const yr         = i;
          const age        = currentAge + yr;
          const growFactor = Math.pow(1 + (salaryGrowthRate||0)/100, yr);
          const salary     = earnings.grossIncome * growFactor;
          const bonus      = earnings.bonusAmount * growFactor;
          const bonusNet   = bonus * (1 - earnings.bonusTaxRate/100) * (earnings.bonusSavePct/100);
          const salarySaved= salary * (earnings.savingsPct/100);
          const totalSaved = salarySaved + bonusNet;

          const accBreakdown = {};
          const accBals      = {};
          let totalBalance   = 0;

          nonPrimary.forEach(acc => {
            const rate   = acc.annualReturn / 100;
            const regPct = (parseFloat((earnings.allocationMap||{})[acc.id])||0) / 100;
            const bonPct = (parseFloat((earnings.bonusAllocMap||{})[acc.id])||0) / 100;
            const earningsContrib = (salarySaved/12 * regPct + bonusNet/12 * bonPct) * 12;
            const baseContrib     = acc.monthlyContribution * 12;
            const totalContribAcc = earningsContrib + baseContrib;

            accBalances[acc.id] = accBalances[acc.id] * (1 + rate) + totalContribAcc;

            accBreakdown[acc.name] = Math.round(totalContribAcc);
            accBals[acc.name + "_bal"] = Math.round(accBalances[acc.id]);
            totalBalance += accBalances[acc.id];
          });

          return {
            age, yr, salary, bonus, bonusNet, salarySaved,
            totalSaved, monthly: totalSaved/12,
            totalBalance: Math.round(totalBalance),
            ...accBreakdown,
            ...accBals,
          };
        });

        return (
          <>
          <div className="card">
            <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
              📈 Annual Savings Contributions — Growth to Retirement
            </div>
            <div style={{fontSize:12,color:"#334155",marginBottom:16}}>
              Salary grows at <strong style={{color:"#4ade80"}}>{(salaryGrowthRate||0).toFixed(1)}%/yr</strong> — savings and bonus scale with it.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
              {[
                {l:"Portfolio at retirement",   v:fmtK(earningsRows[earningsRows.length-1]?.totalBalance), c:"#f59e0b"},
                {l:"Starting contributions/mo", v:fmtK(earningsRows[0]?.monthly),                         c:"#60a5fa"},
                {l:"Final contributions/mo",    v:fmtK(earningsRows[earningsRows.length-1]?.monthly),      c:"#4ade80"},
                {l:"Avg bonus saved/yr",        v:fmtK(earningsRows.reduce((s,r)=>s+r.bonusNet,0)/Math.max(1,earningsRows.length)), c:"#a78bfa"},
              ].map(s=>(
                <div key={s.l} style={{background:"#131520",border:"1px solid #1e2130",borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{s.l}</div>
                  <div style={{fontSize:15,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:6,fontSize:11,color:"#475569"}}>Annual savings by account allocation</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={earningsRows} margin={{top:5,right:10,left:10,bottom:5}} barSize={Math.max(4, Math.floor(600/(retirementAge-currentAge+1))-2)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false}/>
                <XAxis dataKey="age" stroke="#334155" tick={{fill:"#475569",fontSize:10}} tickFormatter={v=>v%5===0?v:""} interval={0}/>
                <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:10}} tickFormatter={fmtK} width={65}/>
                <Tooltip content={({active,payload,label})=>{
                  if(!active||!payload?.length) return null;
                  const row = earningsRows.find(r=>r.age===label);
                  return (
                    <div style={{background:"#0a0c14",border:"1px solid #2a2d3a",borderRadius:8,padding:"10px 14px",fontSize:12,minWidth:180}}>
                      <div style={{color:"#94a3b8",fontWeight:700,marginBottom:6}}>Age {label} — Saved {fmtK(row?.totalSaved)}/yr</div>
                      {payload.map(p=>(
                        <div key={p.name} style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:2}}>
                          <span style={{color:p.fill,opacity:.9}}>{p.name}</span>
                          <strong style={{color:p.fill}}>{fmtK(p.value)}</strong>
                        </div>
                      ))}
                      <div style={{borderTop:"1px solid #1e2130",marginTop:6,paddingTop:6,color:"#60a5fa"}}>
                        Salary: {fmtK(row?.salary)} · Bonus saved: {fmtK(row?.bonusNet)}
                      </div>
                    </div>
                  );
                }}/>
                <Legend wrapperStyle={{fontSize:11,color:"#64748b"}}/>
                {nonPrimary.map(acc=>(
                  <Bar key={acc.id} dataKey={acc.name} stackId="a" fill={acc.color} fillOpacity={0.85}/>
                ))}
              </BarChart>
            </ResponsiveContainer>

            <div style={{marginTop:18,marginBottom:6,fontSize:11,color:"#475569"}}>Cumulative total saved</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={earningsRows} margin={{top:5,right:10,left:10,bottom:5}}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="salGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false}/>
                <XAxis dataKey="age" stroke="#334155" tick={{fill:"#475569",fontSize:10}} tickFormatter={v=>v%5===0?v:""} interval={0}/>
                <YAxis stroke="#334155" tick={{fill:"#475569",fontSize:10}} tickFormatter={fmtK} width={65}/>
                <Tooltip content={({active,payload,label})=>{
                  if(!active||!payload?.length) return null;
                  return (
                    <div style={{background:"#0a0c14",border:"1px solid #2a2d3a",borderRadius:8,padding:"10px 14px",fontSize:12}}>
                      <div style={{color:"#94a3b8",fontWeight:700,marginBottom:5}}>Age {label}</div>
                      {payload.map(p=>(
                        <div key={p.name} style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:2}}>
                          <span style={{color:p.stroke||p.fill,opacity:.9}}>{p.name}</span>
                          <strong style={{color:p.stroke||p.fill}}>{fmtK(p.value)}</strong>
                        </div>
                      ))}
                    </div>
                  );
                }}/>
                <Legend wrapperStyle={{fontSize:11,color:"#64748b"}}/>
                <Area type="monotone" dataKey="totalBalance" name="Total Portfolio (compounded)" stroke="#f59e0b" fill="url(#cumGrad)" strokeWidth={2.5} dot={false}/>
                <Area type="monotone" dataKey="totalSaved" name="Annual Contributions" stroke="#60a5fa" fill="url(#salGrad)" strokeWidth={1.5} dot={false} strokeDasharray="4 3"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{fontSize:13,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>Year-by-Year Compounding Breakdown</div>
            <div style={{fontSize:12,color:"#334155",marginBottom:14}}>Account balances compound each year: prior balance × (1 + return%) + annual contributions.</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #1e2130"}}>
                    <th style={{textAlign:"left",padding:"6px 10px",color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap",position:"sticky",left:0,background:"#0f1117"}}>Age</th>
                    <th style={{textAlign:"left",padding:"6px 10px",color:"#4ade80",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>Contrib/mo</th>
                    {nonPrimary.map(acc=>(
                      <th key={acc.id} style={{textAlign:"left",padding:"6px 10px",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap",color:acc.color}}>
                        {acc.name.split(" ").slice(0,2).join(" ")} Balance
                      </th>
                    ))}
                    <th style={{textAlign:"left",padding:"6px 10px",color:"#f59e0b",fontSize:10,fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>Total Portfolio</th>
                  </tr>
                </thead>
                <tbody>
                  {earningsRows.map(row=>{
                    const isHighlight = row.yr%5===0 || row.age===retirementAge-1;
                    return (
                      <tr key={row.age} style={{borderBottom:"1px solid #0c0e14",background:isHighlight?"#0f1520":"transparent"}}>
                        <td style={{padding:"5px 10px",fontWeight:isHighlight?700:400,color:isHighlight?"#60a5fa":"#94a3b8",fontFamily:"'DM Mono',monospace",position:"sticky",left:0,background:isHighlight?"#0f1520":"#080a10"}}>{row.age}</td>
                        <td style={{padding:"5px 10px",color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>{fmtK(row.monthly)}</td>
                        {nonPrimary.map(acc=>(
                          <td key={acc.id} style={{padding:"5px 10px",color:acc.color,fontFamily:"'DM Mono',monospace",fontWeight:isHighlight?700:400}}>
                            {fmtK(row[acc.name+"_bal"]||0)}
                          </td>
                        ))}
                        <td style={{padding:"5px 10px",color:"#f59e0b",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtK(row.totalBalance)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{borderTop:"2px solid #3b82f6",background:"#0e1a2e"}}>
                    <td style={{padding:"8px 10px",fontWeight:700,color:"#f87171",fontFamily:"'DM Mono',monospace"}}>{retirementAge} 🎯</td>
                    <td style={{padding:"8px 10px",color:"#f87171",fontSize:11}}>Retired</td>
                    {nonPrimary.map(acc=>(
                      <td key={acc.id} style={{padding:"8px 10px",color:acc.color,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>
                        {fmtK(earningsRows[earningsRows.length-1]?.[acc.name+"_bal"]||0)}
                      </td>
                    ))}
                    <td style={{padding:"8px 10px",color:"#f59e0b",fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtK(earningsRows[earningsRows.length-1]?.totalBalance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </>
        );
      })()}
    </div>
  );
}
