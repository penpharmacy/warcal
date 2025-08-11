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

    // แก้ไขการแสดงจำนวนเม็ดยาให้ถูกต้อง
    const pillCounts = d.pills.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    const pillTextArr = [];
    if (pillCounts[3]) pillTextArr.push(`${pillCounts[3]} x 3 mg`);
    if (pillCounts[2]) pillTextArr.push(`${pillCounts[2]} x 2 mg`);
    if (pillCounts[1]) pillTextArr.push(`${pillCounts[1]} x 1 mg`);
    if (pillCounts[1.5]) pillTextArr.push(`${pillCounts[1.5]} x 1.5 mg`);

    row.innerHTML = `
      <td>${dayNames[i]}</td>
      <td>${d.totalDose.toFixed(1)} mg</td>
      <td>${pillTextArr.join(', ') || '-'}</td>
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
  const results = [];

  // คำนวณจำนวนเม็ด 3 mg เต็มๆ ต่อสัปดาห์
  let threeMgCount = Math.floor(total / 3);

  // เศษที่เหลือหลังหัก 3 mg
  let remainder = total - threeMgCount * 3;

  // สร้างแผน 7 วัน โดยแต่ละวันมี pills และ totalDose เริ่มต้น 0
  const dayPlan = Array(7).fill(null).map(() => ({ pills: [], totalDose: 0 }));

  // แจกเม็ด 3 mg วันละ 1 เม็ด ตามจำนวนที่มี (ไม่เกิน 7 วัน)
  for (let i = 0; i < 7 && threeMgCount > 0; i++) {
    dayPlan[i].pills.push(3);
    dayPlan[i].totalDose += 3;
    threeMgCount--;
  }

  // จำนวนวันที่มียา 3 mg ตอนนี้
  const daysWith3mg = dayPlan.filter(d => d.pills.includes(3)).length;

  // จำนวนเม็ด 2 mg ที่ต้องแจกเต็มเม็ด (ปัดเศษใกล้เคียง)
  let twoMgCount = Math.round(remainder / 2);

  // แจกเม็ด 2 mg ในวันที่มียา 3 mg ก่อน
  for (let i = 0; i < 7 && twoMgCount > 0; i++) {
    if (dayPlan[i].pills.includes(3)) {
      dayPlan[i].pills.push(2);
      dayPlan[i].totalDose += 2;
      twoMgCount--;
    }
  }

  // หากเม็ด 2 mg ยังเหลือ และมีวันที่ไม่มี 3 mg แจกเม็ด 2 mg วันละ 1 เม็ด
  for (let i = 0; i < 7 && twoMgCount > 0; i++) {
    if (!dayPlan[i].pills.includes(3) && !dayPlan[i].pills.includes(2)) {
      dayPlan[i].pills.push(2);
      dayPlan[i].totalDose += 2;
      twoMgCount--;
    }
  }

  // ถ้ายังเหลือเม็ด 2 mg เกิน จะไม่ได้แจก (กรณีนี้ไม่รองรับ)

  return dayPlan;
}
