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

function distributeDose(totalWeekly) {
  const dayCount = 7;
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

  // คำนวณขนาดยาเฉลี่ยต่อวัน (mg)
  const avgDailyDose = totalWeekly / dayCount;

  // เริ่มจากให้เม็ด 3 mg เต็มจำนวนที่ใกล้เคียงเฉลี่ยก่อน (ปัดลงจำนวนเต็ม)
  let daily3mgCount = Math.floor(avgDailyDose / 3);
  // คำนวณขนาดยาที่เหลือที่ต้องเติมด้วย 2 mg
  let leftoverMg = avgDailyDose - (daily3mgCount * 3);

  // สำหรับแต่ละวัน จะมียา 3 mg เท่ากัน และยา 2 mg จะเป็น 0 หรือ 1 หรือ 2 เม็ด เพื่อเติมให้ใกล้เคียง
  // เราแปลง leftoverMg ต่อวันเป็นจำนวนเม็ด 2 mg (ปัดเป็น 0, 1 หรือ 2 เม็ด)
  // สร้าง array สำหรับจำนวนเม็ด 2 mg ของแต่ละวัน เพื่อให้ผลรวม 7 วัน ใกล้เคียง leftoverMg * 7
  // โดยเริ่มแจก 1 เม็ด 2 mg ในแต่ละวันจนครบปริมาณที่ต้องการ

  const leftoverTotal = leftoverMg * dayCount; // mg ที่ต้องเติมทั้งหมดในสัปดาห์ (จาก 2mg tablets)
  let total2mgTabletsNeeded = Math.round(leftoverTotal / 2);

  // สร้าง array จำนวนเม็ด 2 mg ในแต่ละวัน เริ่ม 0 ทั้งหมด
  let daily2mgCounts = new Array(dayCount).fill(0);

  // แจกเม็ด 2 mg ไปทีละเม็ดในวันแรก ๆ จนครบจำนวน
  for (let i = 0; i < total2mgTabletsNeeded; i++) {
    daily2mgCounts[i % dayCount] += 1;
  }

  // สร้างผลลัพธ์วันละ object
  const results = [];

  for (let i = 0; i < dayCount; i++) {
    const n3 = daily3mgCount;        // เม็ด 3 mg ต่อวัน (จำนวนเต็ม)
    const n2 = daily2mgCounts[i];    // เม็ด 2 mg ต่อวัน (0,1,2 ...)
    const totalDose = n3 * 3 + n2 * 2;

    results.push({
      day: days[i],
      n3,
      n2,
      totalDose
    });
  }

  return results;

}

}
