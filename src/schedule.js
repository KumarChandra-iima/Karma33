// IdealWeight 28-day exercise schedule generator. Pure function: given only
// `isTeens`, always returns the same 28-entry schedule (Week 1-2 =
// "Foundation", Week 3-4 = "Intensity", rest days on Thursday and Sunday).
// Extracted from App.jsx so it's independently testable and reusable by a
// future desktop layout without re-deriving the weekly exercise-ID tables.
export function buildSchedule(isTeens) {
  const w12 = [["E1","E2","E3","E4","E5","E6"],["E7","E8","E9","E10","E11","E12"],["E7","E25","E27"],[],["E1","E2","E3","E4","E5","E6"],["E7","E8","E9","E10","E11","E12"],[]];
  const w34 = [["E7","E13","E14","E15","E16","E17","E26"],["E18","E19","E20","E21","E22","E23"],["E24","E25","E27"],[],["E7","E13","E14","E15","E16","E17","E26"],["E18","E19","E20","E21","E22","E23"],[]];
  const tw12 = [["T1","T3"],["T1","T2","T6"],["T1","T6","T7"],[],["T1","T3"],["T1","T2","T5"],[]];
  const tw34 = [["T1","T2","T4"],["T1","T5","T3","T6"],["T6","T7"],[],["T1","T2","T4"],["T1","T5","T3"],["T7"]];
  const t12a = ["Core Activation","Cardio Flow","Active Recovery","Rest Day","Core Activation","Cardio Flow","Rest Day"];
  const t34a = ["HIIT Blast","Strength+Cardio","Cardio+Mobility","Rest Day","HIIT Blast","Strength+Cardio","Rest Day"];
  const dn = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  return Array.from({ length: 28 }, (_, i) => {
    const d = i % 7, w2 = Math.floor(i / 7) < 2;
    return {
      day: i + 1,
      dayName: dn[d],
      type: isTeens ? (w2 ? "Training" : "Boss Mode") : (w2 ? t12a[d] : t34a[d]),
      phase: w2 ? "Foundation" : "Intensity",
      week: Math.floor(i / 7) + 1,
      exIds: isTeens ? (w2 ? tw12[d] : tw34[d]) : (w2 ? w12[d] : w34[d]),
      topicId: `T${i + 1}`,
      isRest: d === 3 || d === 6,
    };
  });
}
