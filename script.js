function getDoseRange(inr, weeklyDose, bleed) {
  let factor = 1;
  let advice = '';

  if (bleed === 'yes') {
    advice = 'พบแพทย์ทันที เนื่องจากมีภาวะเลือดออก';
    return { min: weeklyDose, max: weeklyDose, advice };
  }

  if (inr < 2) {
    factor = 1.05;
    advice = 'เพิ่มขนาดยาเล็กน้อย';
  } else if (inr > 3) {
    factor = 0.9;
    advice = 'ลดขนาดยาเล็กน้อย';
  } else {
    factor = 1;
    advice = 'คงขนาดยาเดิม';
  }

  const min = weeklyDose * factor * 0.95;
  const max = weeklyDose * factor * 1.05;
  return { min, max, advice };
}

function generate7DayPlan(totalWeeklyDose, tabletOption) {
  let plan = [];
  const daily = totalWeeklyDose / 7;

  for (let i = 0; i < 7; i++) {
    let mg3 = 0, mg2 = 0;
    if (tabletOption === '3') {
      mg3 = Math.round(daily / 3);
    } else if (tabletOption === '2') {
      mg2 = Math.round(daily / 2);
    } else {
      mg3 = Math.floor(daily / 3);
      const remain = daily - mg3 * 3;
      mg2 = Math.round(remain / 2);
    }
    const total = mg3 * 3 + mg2 * 2;
    plan.push({ day: i + 1, mg3, mg2, total });
  }
  return plan;
}

function renderPlanTable(plan, tbody) {
  tbody.innerHTML = '';
  plan.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>Day ${row.day}</td>
                    <td>${row.mg3}</td>
                    <td>${row.mg2}</td>
                    <td>${row.total.toFixed(1)}</td>`;
    tbody.appendChild(tr);
  });
}

function makeSupplySummary(plan, days) {
  let total3 = 0, total2 = 0;
  for (let i = 0; i < days; i++) {
    const row = plan[i % 7];
    total3 += row.mg3;
    total2 += row.mg2;
  }
  return `${total3} เม็ด (3 mg), ${total2} เม็ด (2 mg)`;
}

function calculate() {
  const inr = parseFloat(document.getElementById('inr').value);
  const weeklyDose = parseFloat(document.getElementById('weeklyDose').value);
  const days = parseInt(document.getElementById('days').value);
  const tabletOption = document.querySelector('input[name="tablet"]:checked').value;
  const bleed = document.querySelector('input[name="bleed"]:checked').value;

  const doseRange = getDoseRange(inr, weeklyDose, bleed);
  const minDose = doseRange.min;
  const maxDose = doseRange.max;
  const avgDose = (minDose + maxDose) / 2;

  document.getElementById('newDoseText').innerText =
    `${minDose.toFixed(1)} - ${maxDose.toFixed(1)} mg`;
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
l calculate on load
document.addEventListener('DOMContentLoaded', ()=>{ calculate(); });
