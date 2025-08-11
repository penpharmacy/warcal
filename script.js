const dayNames = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

// ฟังก์ชันหลักคำนวณแจกแจงยา 7 วัน
function distributeDoseBothPills(totalDose) {
  // หา combination ที่ใกล้เคียง totalDose ที่สุด โดยใช้เม็ดครึ่ง (1.5 = ครึ่งของ 3 mg) และเต็ม 1 (2 mg)
  // โดยเราจะเก็บจำนวนครึ่งเม็ด 3 mg (h3) และจำนวนครึ่งเม็ด 2 mg (h2)
  // 1.5 mg = ครึ่งเม็ดของ 3 mg; 1.0 mg = ครึ่งเม็ดของ 2 mg

  let bestCombo = null;
  let bestDiff = Infinity;

  // สมมติ max ครึ่งเม็ด 3 mg เป็นไม่เกิน 2 เท่าของ totalDose เพื่อจำกัดจำนวนวน loop
  const maxHalf3 = Math.ceil(totalDose / 1.5) + 5;

  for (let h3 = 0; h3 <= maxHalf3; h3++) {
    let rem = totalDose - h3 * 1.5; // คำนวณส่วนที่เหลือสำหรับ 2 mg
    if (rem < 0) break; // ถ้าเกินไม่ต้องตรวจ
    // หาจำนวนครึ่งเม็ด 2 mg ที่ใกล้เคียง rem มากที่สุด (round)
    let h2 = Math.round(rem / 1.0);
    if (h2 < 0) h2 = 0;

    let totalCalc = h3 * 1.5 + h2 * 1.0;
    let diff = Math.abs(totalDose - totalCalc);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestCombo = { h3, h2, totalCalc };
      if (diff === 0) break; // เจอแม่นเป๊ะก็จบเลย
    }
  }

  // แจกแจง h3 และ h2 ให้กระจาย 7 วัน แบบสมดุล (เกลี่ยส่วนที่เหลือใน 7 วัน)
  const perDayH3 = Math.floor(bestCombo.h3 / 7);
  const remH3 = bestCombo.h3 % 7;
  const perDayH2 = Math.floor(bestCombo.h2 / 7);
  const remH2 = bestCombo.h2 % 7;

  const result = [];

  for (let i = 0; i < 7; i++) {
    let dayH3 = perDayH3 + (i < remH3 ? 1 : 0);
    let dayH2 = perDayH2 + (i < remH2 ? 1 : 0);

    // แปลงครึ่งเม็ด 3 mg (h3) เป็นเม็ด 3 mg ครึ่งเม็ด (1.5 mg)
    // และครึ่งเม็ด 2 mg (h2) เป็น 1 mg (2 mg ครึ่งเม็ด)

    // สร้าง array เม็ดยา
    const pills = [];
    for (let j = 0; j < dayH3; j++) pills.push(1.5); // ครึ่งเม็ด 3 mg
    for (let j = 0; j < dayH2; j++) pills.push(1);   // ครึ่งเม็ด 2 mg

    const totalDosePerDay = dayH3 * 1.5 + dayH2 * 1.0;

    result.push({
      totalDose: totalDosePerDay,
      pills
    });
  }

  return result;
}

