// script.js

const dayNames = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

document.getElementById('calculateBtn').addEventListener('click', calculateDose);

function calculateDose() {
  const mode = document.getElementById('mode').value;
  const inr = parseFloat(document.getElementById('inr').value);
  const bleeding = document.getElementById('bleeding').value;
  const currentWeeklyDose = parseFloat(document.getElementById('weeklyDose').value);
  const manualPercent = parseFloat(document.getElementById('manualPercent').value || 0) / 100;

  const resultBox = document.getElementById('output');
  resultBox.innerHTML = '';

  if (isNaN(inr) || isNaN(currentWeeklyDose)) {
    resultBox.innerHTML = `<div class="card">กรุณากรอกค่า INR และขนาดยาเดิมให้ครบถ้วน</div>`;
    return;
  }

  let newWeeklyDose = currentWeeklyDose;
  let advice = '';
  let override = false;

  if (mode === 'auto') {
    const adj = getAdjustment(inr, bleeding);
    advice = adj.text;
    override = adj.override;
    newWeeklyDose = override ? 0 : currentWeeklyDose * (1 + adj.percent);
  } else {
    advice = `ผู้ใช้เลือกปรับขนาดยา ${manualPercent > 0 ? '+' : ''}${manualPercent * 100}%`;
    newWeeklyDose = currentWeeklyDose * (1 + manualPercent);
  }

  const summary = document.createElement('div');
  summary.className = 'card info';
  summary.innerHTML = `
    <strong>ขนาดยาใหม่:</strong> ${newWeeklyDose.toFixed(2)} mg/สัปดาห์<br>
    <strong>เฉลี่ย:</strong> ${(newWeeklyDose / 7).toFixed(2)} mg/วัน
  `;
  resultBox.appendChild(summary);

  const recommendation = document.createElement('div');
  recommendation.className = 'card';
  recommendation.innerHTML = `<strong>คำแนะนำ:</strong> ${advice}`;
  resultBox.appendChild(recommendation);

  if (override) return;

  const dailyPlan = distributeDose(newWeeklyDose);

  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <tr>
      <th>วัน</th>
      <th>ขนาดยา</th>
      <th>เม็ดยา</th>
      <th>ภาพ</th>
    </tr>
  `;

  for (let i = 0; i < dailyPlan.length; i++) {
    const d = dailyPlan[i];
    const row = document.createElement('tr');
    const pills = [];

    for (let p of d.pills) {
      if (p === 2) pills.push('<span class="pill pill-2mg"></span>');
      else if (p === 3) pills.push('<span class="pill pill-3mg"></span>');
      else if (p === 1) pills.push('<span class="pill pill-half-2mg"></span>');
      else if (p === 1.5) pills.push('<span class="pill pill-half-3mg"></span>');
    }

    row.innerHTML = `
      <td>${dayNames[i]}</td>
      <td>${d.totalDose.toFixed(1)} mg</td>
      <td>${pills.map(p => p.includes('pill-2mg') ? '2' : '3').join(', ')} mg</td>
      <td><div class="day-pill">${pills.join('')}</div></td>
    `;
    table.appendChild(row);
  }

  resultBox.appendChild(table);
}

function getAdjustment(inr, bleeding) {
  if (bleeding === 'major') {
    return { percent: 0, text: "ให้ Vitamin K₁ 10 mg IV + FFP และ repeat ทุก 12 ชม.", override: true };
  }
  if (inr >= 9.0) return { percent: 0, text: "ให้ Vitamin K₁ 5–10 mg oral", override: true };
  if (inr > 5.0) return { percent: 0, text: "หยุดยา 1–2 วัน + Vitamin K₁ 1 mg oral", override: true };
  if (inr > 4.0) return { percent: -0.10, text: "หยุดยา 1 วัน แล้วลดขนาดยา 10%" };
  if (inr > 3.0) return { percent: -0.075, text: "ลดขนาดยา 5–10%" };
  if (inr >= 2.0) return { percent: 0, text: "ให้ขนาดยาเท่าเดิม" };
  if (inr >= 1.5) return { percent: 0.075, text: "เพิ่มขนาดยา 5–10%" };
  return { percent: 0.15, text: "เพิ่มขนาดยา 10–20%" };
}

function distributeDose(total) {
  const dayCount = 7;
  const dayDoses = new Array(dayCount).fill({ n3: 0, n2: 0, totalDose: 0 });
  
  // หาเม็ด 3 mg มากที่สุดก่อน
  let max3 = Math.floor(total / 3);
  let remainder = total - max3 * 3;

  // เติมเม็ด 2 mg สำหรับส่วนที่เหลือ
  let max2 = Math.round(remainder / 2);

  // ถ้าจำนวนเม็ดยารวมเกิน 7 เม็ด ให้ลดเม็ด 3 mg ลงทีละเม็ด
  while (max3 + max2 > dayCount) {
    max3--;
    remainder = total - max3 * 3;
    max2 = Math.round(remainder / 2);
    if (max3 < 0) {
      max3 = 0;
      break;
    }
  }

  // แจกแจงเม็ด 3 mg และ 2 mg เท่า ๆ กันใน 7 วัน
  function distributeInt(units) {
    const base = Math.floor(units / dayCount);
    let rem = units % dayCount;
    const arr = new Array(dayCount).fill(base);
    for (let i = 0; i < rem; i++) arr[i]++;
    return arr;
  }

  const arr3 = distributeInt(max3);
  const arr2 = distributeInt(max2);

  const results = [];
  for (let i = 0; i < dayCount; i++) {
    const n3 = arr3[i];
    const n2 = arr2[i];
    const totalDose = n3 * 3 + n2 * 2;
    results.push({
      totalDose,
      pills: [].concat(
        Array(n3).fill(3),
        Array(n2).fill(2)
      )
    });
  }
  
  return results;
}

}
