function calculate(){
  const inr = parseFloat(document.getElementById('inr').value);
  const weeklyDose = parseFloat(document.getElementById('weeklyDose').value);
  const days = parseInt(document.getElementById('days').value);
  const tabletOption = document.querySelector('input[name="tablet"]:checked').value;
  const bleed = document.querySelector('input[name="bleed"]:checked').value;

  if (isNaN(inr) || isNaN(weeklyDose) || isNaN(days)) {
    alert("กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  const doseRange = getDoseRange(inr, weeklyDose, bleed);
  const minDose = doseRange.min;
  const maxDose = doseRange.max;
  const avgDose = (minDose + maxDose) / 2;

  document.getElementById('newDoseText').innerText =
    `${minDose.toFixed(1)} - ${maxDose.toFixed(1)} (เฉลี่ย ${avgDose.toFixed(1)})`;
  document.getElementById('advice').innerText = doseRange.advice;

  const planMin = generate7DayPlan(minDose, tabletOption);
  const planAvg = generate7DayPlan(avgDose, tabletOption);
  const planMax = generate7DayPlan(maxDose, tabletOption);

  renderPlanTable(planMin, document.querySelector('#planMin tbody'));
  renderPlanTable(planAvg, document.querySelector('#planAvg tbody'));
  renderPlanTable(planMax, document.querySelector('#planMax tbody'));

  const supplyMin = makeSupplySummary(planMin, days);
  const supplyAvg = makeSupplySummary(planAvg, days);
  const supplyMax = makeSupplySummary(planMax, days);

  document.getElementById('supplySummary').innerHTML =
    `<strong>ต่ำสุด:</strong> ${supplyMin}<br>
     <strong>เฉลี่ย:</strong> ${supplyAvg}<br>
     <strong>สูงสุด:</strong> ${supplyMax}`;

  document.getElementById('results').style.display = 'block';
}

function getDoseRange(inr, weeklyDose, bleed){
  if (bleed === 'yes') {
    return { min: 0, max: 0, advice: "หยุดยาและรีบพบแพทย์" };
  }
  let factor;
  if (inr < 2) factor = 1.1;
  else if (inr <= 3) factor = 1;
  else if (inr <= 4) factor = 0.9;
  else factor = 0.8;

  const min = weeklyDose * factor * 0.95;
  const max = weeklyDose * factor * 1.05;
  return { min, max, advice: "ปรับขนาดยาตามช่วงที่แนะนำ" };
}

function generate7DayPlan(weeklyDose, tabletOption){
  const daily = weeklyDose / 7;
  const plan = [];
  for (let i=0; i<7; i++){
    const tab3 = Math.floor(daily / 3);
    const remainder = daily - tab3 * 3;
    const tab2 = Math.round(remainder / 2);
    plan.push({ day: i+1, tab3, tab2, total: tab3*3 + tab2*2 });
  }
  return plan;
}

function renderPlanTable(plan, tbody){
  tbody.innerHTML = '';
  plan.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.day}</td>
                    <td>${row.tab3}</td>
                    <td>${row.tab2}</td>
                    <td>${row.total.toFixed(1)}</td>`;
    tbody.appendChild(tr);
  });
}

function makeSupplySummary(plan, days){
  const weeks = days / 7;
  let total3 = 0, total2 = 0;
  plan.forEach(row => {
    total3 += row.tab3;
    total2 += row.tab2;
  });
  total3 *= weeks;
  total2 *= weeks;
  return `${total3} เม็ด (3mg), ${total2} เม็ด (2mg)`;
}