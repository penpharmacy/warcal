// Main logic for Warfarin calculator (separated file)
function roundToHalf(x){ return Math.round(x*2)/2; }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function getDoseRange(currentWeekly, inr, bleeding){
  let min=currentWeekly, max=currentWeekly;
  let advice = [];
  if(bleeding==='yes'){
    advice.push('ผู้ป่วยมีเลือดออก — ให้การรักษาเฉพาะหน้าและพิจารณาการให้ Vitamin K และ/หรือ FFP/PCC ตามความรุนแรง (ปรึกษาแพทย์).');
  }

  if(inr < 1.5){
    min = currentWeekly * 1.10; max = currentWeekly * 1.20;
    advice.push('INR < 1.5: แนะนำเพิ่มขนาดยารายสัปดาห์ 10–20% และติดตาม INR เร็วขึ้น.');
  } else if(inr >=1.5 && inr <= 1.9){
    min = currentWeekly; max = currentWeekly * 1.10;
    advice.push('INR 1.5–1.9: พิจารณาเพิ่ม 5–10% หรือไม่ปรับ แต่ติดตาม INR บ่อยขึ้น.');
  } else if(inr >=2.0 && inr <=3.0){
    min = max = currentWeekly;
    advice.push('INR 2.0–3.0: ไม่ต้องปรับขนาดยา (ในผู้ป่วยปกติ) — ติดตามตามนัด.');
  } else if(inr >=3.1 && inr <=3.9){
    min = currentWeekly * 0.90; max = currentWeekly * 0.95;
    advice.push('INR 3.1–3.9: แนะนำลดขนาดยารายสัปดาห์ 5–10% และติดตาม.');
  } else if(inr >3.9 && inr < 5.0){
    if(bleeding === 'no'){
      min = max = currentWeekly * 0.90;
      advice.push('INR 3.9–5.0 ไม่มีเลือดออก: หยุดยา 1 วัน แล้วกลับมาเริ่มด้วยขนาดที่ลดลง 10%.');
    } else {
      advice.push('INR 3.9–5.0 และมีเลือดออก: พิจารณาให้ Vitamin K ตามดุลยพินิจและให้การรักษาเฉพาะหน้า.');
    }
  } else if(inr >=5.0 && inr <=9.0){
    if(bleeding === 'no'){
      min = max = currentWeekly * 0.80;
      advice.push('INR 5.0–9.0 ไม่มีเลือดออก: หยุดยา 2 วัน แล้วกลับมาเริ่มด้วยขนาดที่ลดลง 20%. พิจารณาให้ Vitamin K1 1–2.5 mg ถ้าความเสี่ยงเลือดออก.');
    } else {
      advice.push('INR 5.0–9.0 และมีเลือดออก: พิจารณาให้ Vitamin K และการรักษาเฉพาะหน้า.');
    }
  } else if(inr > 9.0){
    min = max = currentWeekly * 0.80;
    advice.push('INR > 9.0: หยุดยา และพิจารณาให้ Vitamin K ทางรับประทาน 2.5–5 mg และติดตามใกล้ชิด. หากมีเลือดออกรุนแรง ให้ Vitamin K 10 mg IV และให้ FFP/PCC/rFVIIa ตามความรุนแรง.');
  }

  min = Number((min).toFixed(2));
  max = Number((max).toFixed(2));
  return {min,max,advice};
}

// Improved generate7DayPlan: distribute half-tablet units precisely
function generate7DayPlan(weeklyTarget, tabletOption){
  const days = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'];

  // Helper: distribute integer units across 7 days (base + remainder)
  function distributeInt(units){
    const base = Math.floor(units / 7);
    let rem = units % 7;
    const arr = new Array(7).fill(base);
    // distribute +1 to the first `rem` days (could rotate for fairness)
    for(let i=0;i<rem;i++) arr[i] += 1;
    return arr;
  }

  // If only 3mg tablets allowed -> half-unit = 0.5 tablet = 1.5 mg
  if(tabletOption === '3'){
    const halfVal = 1.5;
    let totalHalf = Math.round(weeklyTarget / halfVal); // number of half-units (each = 1.5 mg)
    totalHalf = Math.max(0, totalHalf);
    const halfPerDay = distributeInt(totalHalf);
    const plan = halfPerDay.map((h,i)=>{
      const n3 = roundToHalf(h / 2); // h half-units -> h/2 full tablets (0.5-step)
      const mg = Number((n3 * 3).toFixed(2));
      return {day: days[i], n3: n3, n2: 0, mg};
    });
    const totals = plan.reduce((acc,p)=>{acc.n3+=p.n3; acc.n2+=p.n2; acc.mg+=p.mg; return acc;},{n3:0,n2:0,mg:0});
    totals.n3 = roundToHalf(totals.n3);
    totals.mg = Number(totals.mg.toFixed(1));
    return {plan, totals};
  }

  // If only 2mg tablets allowed -> half-unit = 0.5 tablet = 1 mg
  if(tabletOption === '2'){
    const halfVal = 1.0;
    let totalHalf = Math.round(weeklyTarget / halfVal); // number of half-units (each =1 mg)
    totalHalf = Math.max(0, totalHalf);
    const halfPerDay = distributeInt(totalHalf);
    const plan = halfPerDay.map((h,i)=>{
      const n2 = roundToHalf(h / 2); // h half-units -> h/2 full tablets (0.5-step)
      const mg = Number((n2 * 2).toFixed(2));
      return {day: days[i], n3: 0, n2: n2, mg};
    });
    const totals = plan.reduce((acc,p)=>{acc.n3+=p.n3; acc.n2+=p.n2; acc.mg+=p.mg; return acc;},{n3:0,n2:0,mg:0});
    totals.n2 = roundToHalf(totals.n2);
    totals.mg = Number(totals.mg.toFixed(1));
    return {plan, totals};
  }

  // If both allowed: prioritize 3mg halves, fill remainder with 2mg halves
  if(tabletOption === 'both'){
    const half3 = 1.5; // mg per half of 3mg tablet
    const half2 = 1.0; // mg per half of 2mg tablet

    // Strategy: try to use as many 3mg half-units as possible without overshooting by >0.5 mg per week
    let maxHalf3 = Math.floor(weeklyTarget / half3); // candidate number of 3mg half-units
    let bestCombo = null;
    // search nearby values of maxHalf3 to find combination that minimizes absolute weekly error after filling with 2mg halves
    for(let h3 = Math.max(0, maxHalf3-3); h3 <= maxHalf3+3; h3++){
      const mgBy3 = h3 * half3;
      let remMg = Number((weeklyTarget - mgBy3).toFixed(3));
      // number of 2mg half-units to cover remainder (rounded to nearest integer)
      let h2 = Math.round(remMg / half2);
      if(h2 < 0) h2 = 0;
      const totalMg = Number((h3 * half3 + h2 * half2).toFixed(3));
      const err = Math.abs(totalMg - weeklyTarget);
      if(bestCombo === null || err < bestCombo.err){
        bestCombo = {h3, h2, totalMg, err};
      }
    }

    const arr3 = distributeInt(bestCombo.h3);
    const arr2 = distributeInt(bestCombo.h2);

    const plan = days.map((d,i)=>{
      const n3 = roundToHalf(arr3[i] / 2); // halves -> tablets (0.5 step)
      const n2 = roundToHalf(arr2[i] / 2);
      const mg = Number((n3*3 + n2*2).toFixed(2));
      return {day: d, n3, n2, mg};
    });

    const totals = plan.reduce((acc,p)=>{acc.n3+=p.n3; acc.n2+=p.n2; acc.mg+=p.mg; return acc;},{n3:0,n2:0,mg:0});
    totals.n3 = roundToHalf(totals.n3);
    totals.n2 = roundToHalf(totals.n2);
    totals.mg = Number(totals.mg.toFixed(1));
    return {plan, totals};
  }

  return {plan:[], totals:{n3:0,n2:0,mg:0}};
}

function makeSupplySummary(totalsWeekly, days){
  const factor = days/7;
  let need3 = totalsWeekly.n3 * factor;
  let need2 = totalsWeekly.n2 * factor;
  function toWhole(x){ return Math.ceil(x); }
  let whole3 = toWhole(need3);
  let whole2 = toWhole(need2);
  return {
    days:days,
    need3: Number(need3.toFixed(1)),
    need2: Number(need2.toFixed(1)),
    whole3,whole2,
    totalMg: Number((totalsWeekly.mg * factor).toFixed(1))
  };
}

function calculate(){
  const inr = parseFloat(document.getElementById('inr').value);
  const currentWeekly = parseFloat(document.getElementById('weeklyDose').value);
  const days = parseInt(document.getElementById('days').value,10);
  const tabletOption = document.querySelector('input[name=tablet]:checked').value; // '3','2','both'
  const bleeding = document.querySelector('input[name=bleed]:checked').value; // 'yes' or 'no'

  if(isNaN(inr) || isNaN(currentWeekly) || isNaN(days)) return alert('กรุณากรอกข้อมูลให้ถูกต้อง');

  const {min,max,advice} = getDoseRange(currentWeekly, inr, bleeding);
  const adviceText = advice.join('\\n');

  const newDoseText = (min===max) ? `${min} mg / สัปดาห์` : `${min} – ${max} mg / สัปดาห์`;

  const planMin = generate7DayPlan(min, tabletOption);
  const planMax = generate7DayPlan(max, tabletOption);

  const supplyMin = makeSupplySummary(planMin.totals, days);
  const supplyMax = makeSupplySummary(planMax.totals, days);

  document.getElementById('results').style.display = 'block';
  document.getElementById('newDoseText').innerText = newDoseText;
  document.getElementById('advice').innerText = adviceText;

  function fillTable(tableId, planObj){
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';
    planObj.plan.forEach((p,idx)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.day}</td><td>${p.n3}</td><td>${p.n2}</td><td>${p.mg}</td>`;
      tbody.appendChild(tr);
    });
    const tr = document.createElement('tr');
    tr.innerHTML = `<th>รวม</th><th>${planObj.totals.n3}</th><th>${planObj.totals.n2}</th><th>${planObj.totals.mg} mg</th>`;
    tbody.appendChild(tr);
  }

  fillTable('planMin', planMin);
  fillTable('planMax', planMax);

  const ss = `สำหรับช่วงนัด ${days} วัน\n\nต่ำสุด: ต้องใช้รวม ${supplyMin.need3} เม็ด(3 mg) และ ${supplyMin.need2} เม็ด(2 mg) -> จำนวนเม็ดจริงที่ควรจ่าย (ปัดขึ้น): ${supplyMin.whole3} เม็ด(3 mg), ${supplyMin.whole2} เม็ด(2 mg).\n\nสูงสุด: ต้องใช้รวม ${supplyMax.need3} เม็ด(3 mg) และ ${supplyMax.need2} เม็ด(2 mg) -> จำนวนเม็ดจริงที่ควรจ่าย (ปัดขึ้น): ${supplyMax.whole3} เม็ด(3 mg), ${supplyMax.whole2} เม็ด(2 mg).\n\nปริมาณรวม (mg): ต่ำสุด ${supplyMin.totalMg} mg, สูงสุด ${supplyMax.totalMg} mg.`;

  document.getElementById('supplySummary').innerText = ss;
  setTimeout(()=>{ document.getElementById('results').scrollIntoView({behavior:'smooth'}); },100);
}

// initial calculate on load
document.addEventListener('DOMContentLoaded', ()=>{ calculate(); });
