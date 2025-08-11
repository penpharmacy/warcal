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
  // เริ่มแจก 3 mg เต็มก่อน
  const dayDoses = Array(7).fill(0);
  let remaining = total;

  // แจก 3 mg เต็มวันละ 1 เม็ดให้ครบ 7 วัน หรือจนหมด
  for (let i = 0; i < 7; i++) {
    if (remaining >= 3) {
      dayDoses[i] = 3;
      remaining -= 3;
    }
  }

  // แจก 2 mg เต็มวันละ 1 เม็ดให้ครบ หรือจนหมด
  for (let i = 0; i < 7 && remaining >= 2; i++) {
    dayDoses[i] += 2;
    remaining -= 2;
  }

  // แจก 3 mg ครึ่งเม็ด (1.5 mg) หากเหลือ >= 1.5 mg
  for (let i = 0; i < 7 && remaining >= 1.5; i++) {
    dayDoses[i] += 1.5;
    remaining -= 1.5;
  }

  // แจก 2 mg ครึ่งเม็ด (1 mg) หากเหลือ >= 1 mg
  for (let i = 0; i < 7 && remaining >= 1; i++) {
    dayDoses[i] += 1;
    remaining -= 1;
  }

  // หากเหลือเศษเล็กน้อย (ต่ำกว่า 1 mg) เติมวันสุดท้าย
  if (remaining > 0.1) {
    dayDoses[6] += remaining;
    remaining = 0;
  }

  // ตรวจสอบว่ามีวันใดที่มีทั้ง 3 mg และ 2 mg พร้อมกันไหม (รวม >= 5 mg)
  // ถ้าไม่มีย้าย 2 mg หรือ 2 mg ครึ่งเม็ด มารวมกับ 3 mg ในวันเดียวกัน
  const hasBoth = dayDoses.some(d => d >= 5);
  if (!hasBoth) {
    // หาวันที่มี 3 mg เต็มหรือครึ่ง (>=3)
    const dayWith3mg = dayDoses.findIndex(d => d >= 3);
    // หาวันที่มี 2 mg เต็มหรือครึ่ง (อย่างน้อย 1)
    const dayWith2mg = dayDoses.findIndex(d => d > 0 && d < 3);

    if (dayWith3mg !== -1 && dayWith2mg !== -1 && dayWith3mg !== dayWith2mg) {
      // ย้ายปริมาณยา 2 mg จากวันที่แยก ไปไว้กับวันที่มียา 3 mg
      dayDoses[dayWith3mg] += dayDoses[dayWith2mg] > 2 ? 2 : dayDoses[dayWith2mg];
      dayDoses[dayWith2mg] -= dayDoses[dayWith2mg] > 2 ? 2 : dayDoses[dayWith2mg];
    }
  }

  // แปลงแต่ละวันให้เป็นจำนวนเม็ด 3 mg, 3 mg ครึ่ง, 2 mg, 2 mg ครึ่ง
  const results = dayDoses.map(dose => {
    const pills = [];
    let left = dose;

    // แบ่ง 3 mg เต็มเม็ด
    while (left >= 3) {
      pills.push(3);
      left -= 3;
    }
    // แบ่ง 3 mg ครึ่งเม็ด (1.5 mg)
    if (left >= 1.4) {
      pills.push(1.5);
      left -= 1.5;
    }
    // แบ่ง 2 mg เต็มเม็ด
    while (left >= 2) {
      pills.push(2);
      left -= 2;
    }
    // แบ่ง 2 mg ครึ่งเม็ด (1 mg)
    if (left >= 0.9) {
      pills.push(1);
      left -= 1;
    }
    // หากเหลือเศษน้อยกว่า 0.9 mg ไม่ใส่ เพราะไม่ใช้เม็ดเล็กกว่านี้

    return { totalDose: dose, pills };
  });

  return results;

}
