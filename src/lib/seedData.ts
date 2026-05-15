import type { VoiceRecord } from "./records";
import { ensureFixedCaregivers, setActiveCaregiverId } from "./caregivers";

const MOM_ID = "caregiver-mom";
const DAD_ID = "caregiver-dad";

// ── 공통 헬퍼 ─────────────────────────────────────────────────

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** 시/분 → "HH:MM" (범위 클램프) */
function hm(h: number, m: number): string {
  return `${String(Math.max(0, Math.min(23, Math.round(h)))).padStart(2, "0")}:${String(Math.max(0, Math.min(59, Math.round(m)))).padStart(2, "0")}`;
}

/** YYYY-MM-DD + HH:MM → ISO 한국 시간 */
function iso(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00+09:00`;
}

/** ISO + 분 → ISO */
function addMin(isoStr: string, min: number): string {
  return new Date(new Date(isoStr).getTime() + min * 60_000).toISOString();
}

/** 오늘 기준 N일 전 YYYY-MM-DD */
function ago(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** ±range/2 랜덤 정수 */
function vary(base: number, range: number): number {
  return base + Math.floor(Math.random() * range) - Math.floor(range / 2);
}

// ── VoiceRecord 이벤트 정의 ────────────────────────────────────

interface Ev {
  hhmm: string;
  endHhmm: string;   // 같은 날짜 기준. 더 이른 시간이면 "다음날 새벽"이 아닌 강제 당일로 취급
  memo: string;
  cat: VoiceRecord["category"];
}

function makeRecord(childId: string, dateStr: string, ev: Ev, caregiverId?: string): VoiceRecord {
  const start = iso(dateStr, ev.hhmm);
  const end   = iso(dateStr, ev.endHhmm);
  return { id: uuid(), childId, caregiverId, timestamp: start, endTime: end, transcript: ev.memo, category: ev.cat };
}

/** 수유 이벤트 */
function feeding(h: number, m: number, dur: number, memo: string): Ev {
  const startH = Math.max(0, Math.min(23, Math.round(h)));
  const startM = Math.max(0, Math.min(59, Math.round(m)));
  const endTotal = startH * 60 + startM + dur;
  return { hhmm: hm(startH, startM), endHhmm: hm(Math.floor(endTotal / 60), endTotal % 60), memo, cat: "feeding" };
}

/** 수면 이벤트 — 같은 날짜 안에서만 */
function sleep(startH: number, startM: number, endH: number, endM: number, memo: string): Ev {
  return { hhmm: hm(startH, startM), endHhmm: hm(endH, endM), memo, cat: "sleep" };
}

/** 기저귀 */
function diaper(hhmm: string, memo: string): Ev {
  return { hhmm, endHhmm: hhmm.replace(/:(\d{2})$/, (_, m) => `:${String(Math.min(59, parseInt(m) + 1)).padStart(2, "0")}`), memo, cat: "diaper" };
}

/** 목욕 */
function bath(hhmm: string, dur: number, memo: string): Ev {
  const [h, m] = hhmm.split(":").map(Number);
  const end = h * 60 + m + dur;
  return { hhmm, endHhmm: hm(Math.floor(end / 60), end % 60), memo, cat: "bath" };
}

/** 투약 */
function med(hhmm: string, memo: string): Ev {
  return { hhmm, endHhmm: hhmm, memo, cat: "medication" };
}

// ── 일별 계획 (밤잠은 전날 저녁 + 당일 새벽으로 분리) ─────────────

/**
 * 첫째 (~7개월): 이유식+분유, 낮잠 2회
 * 밤잠: 21:30 → 23:59 (저녁), 00:00 → 06:30 (새벽) — 자정을 기준으로 분리
 */
function eventsFirst(dayIndex: number): Ev[] {
  const evs: Ev[] = [];

  // ── 새벽: 전날 밤잠 이어서 기상까지 ──
  evs.push(sleep(0, 0, 6, vary(20, 20), "밤잠 (이어서)"));

  // ── 수유 ──
  evs.push(feeding(vary(7, 2), 0,          vary(22, 8), "이유식 + 분유 80ml"));
  evs.push(feeding(10,         vary(30,20), vary(20, 8), "분유 140ml"));
  evs.push(feeding(13,         vary(10,20), vary(25, 8), "이유식 두 번째"));
  evs.push(feeding(16,         vary(30,20), vary(20, 8), "분유 160ml"));
  evs.push(feeding(19,         vary(10,20), vary(25, 8), "이유식 저녁"));
  evs.push(feeding(22,         vary(0, 20), vary(20, 8), "취침 전 분유 120ml"));

  // ── 낮잠 ──
  evs.push(sleep(vary(10,1), vary(0,15),  vary(11,1), vary(30,15), "오전 낮잠"));
  evs.push(sleep(vary(14,1), vary(30,15), vary(15,1), vary(50,15), "오후 낮잠"));

  // ── 저녁 밤잠 시작 (자정 전까지) ──
  evs.push(sleep(vary(21,1), vary(30,20), 23, 59, "밤잠 시작"));

  // ── 기저귀 ──
  evs.push(diaper("07:30", "소변"));
  evs.push(diaper("09:15", "소변"));
  evs.push(diaper("11:30", "소변 + 대변"));
  evs.push(diaper("13:30", "소변"));
  evs.push(diaper("16:00", "소변"));
  evs.push(diaper("19:30", "소변 + 대변"));

  // ── 목욕 (격일) ──
  if (dayIndex % 2 === 0) evs.push(bath("20:00", 15, "목욕, 순한 샴푸 사용"));

  // ── 투약 (주 1회 비타민D) ──
  if (dayIndex % 7 === 0) evs.push(med("09:00", "비타민 D 드롭 0.4ml"));

  return evs;
}

/**
 * 둘째 (~3개월): 모유+분유 7회, 밤중 수유 포함
 * 밤잠: 22:00→02:30 수유→03:00→23:59 / 당일 00:00→05:30
 */
function eventsSecond(dayIndex: number): Ev[] {
  const evs: Ev[] = [];

  // ── 새벽: 밤중 수유 후 다시 잠 ──
  evs.push(sleep(0, 0, vary(2,1), vary(20,20), "밤잠 (이어서)"));
  evs.push(feeding(vary(2,1), vary(30,30), vary(22,8), "밤중 수유"));
  evs.push(sleep(vary(3,1), vary(0,20), vary(5,1), vary(30,20), "밤중 수유 후 재취침"));

  // ── 수유 ──
  evs.push(feeding(vary(6,2),  0,           vary(25,8), "모유 수유"));
  evs.push(feeding(vary(9,2),  vary(10,20), vary(25,8), "모유 수유"));
  evs.push(feeding(12,         vary(10,20), vary(22,8), "모유 수유"));
  evs.push(feeding(15,         vary(10,20), vary(25,8), "분유 보충 100ml"));
  evs.push(feeding(18,         vary(10,20), vary(25,8), "모유 수유"));
  evs.push(feeding(21,         vary(0, 20), vary(22,8), "모유 수유"));

  // ── 낮잠 ──
  evs.push(sleep(vary(7,1), vary(0,15),  vary(8,1), vary(30,15), "낮잠 1"));
  evs.push(sleep(vary(10,1),vary(30,15), vary(12,1),vary(0, 15), "낮잠 2"));
  evs.push(sleep(vary(15,1),vary(30,15), vary(17,1),vary(0, 15), "낮잠 3"));

  // ── 저녁 밤잠 시작 ──
  evs.push(sleep(vary(22,1), vary(0,20), 23, 59, "밤잠 시작"));

  // ── 기저귀 ──
  ["06:30","08:30","10:00","12:30","14:00","16:30","19:00","21:30"].forEach((t, i) =>
    evs.push(diaper(t, i === 2 || i === 5 ? "대변" : "소변"))
  );

  // ── 목욕 (매일) ──
  evs.push(bath("19:30", 15, "통목욕, 잘 견딤"));

  void dayIndex;
  return evs;
}

/**
 * 셋째 (~1개월): 신생아, 잦은 수유, 짧은 수면
 * 새벽 수유 2회 포함
 */
function eventsThird(dayIndex: number): Ev[] {
  const evs: Ev[] = [];

  // ── 새벽 ──
  evs.push(sleep(0, 0, vary(0,1), vary(30,20), "밤잠 (이어서)"));
  evs.push(feeding(vary(0,1), vary(30,30), vary(28,10), "새벽 수유 1"));
  evs.push(sleep(vary(1,1), vary(20,20), vary(3,1), vary(0, 20), "새벽 재취침"));
  evs.push(feeding(vary(3,1), vary(0, 30), vary(28,10), "새벽 수유 2"));
  evs.push(sleep(vary(4,1), vary(0, 20), vary(5,1), vary(30,20), "새벽 재취침 2"));

  // ── 수유 ──
  evs.push(feeding(vary(6,2),  0,            vary(28,10), "아침 수유"));
  evs.push(feeding(vary(8,2),  vary(30,30),  vary(25,10), "모유 수유"));
  evs.push(feeding(vary(11,2), 0,            vary(28,10), "모유 수유"));
  evs.push(feeding(vary(13,2), vary(30,30),  vary(25,10), "분유 60ml"));
  evs.push(feeding(vary(16,2), 0,            vary(28,10), "모유 수유"));
  evs.push(feeding(vary(18,2), vary(30,30),  vary(25,10), "모유 수유"));
  evs.push(feeding(vary(21,2), 0,            vary(28,10), "취침 전 수유"));

  // ── 낮잠 ──
  evs.push(sleep(vary(7,1),  vary(0,20), vary(8,1),  vary(0,20), "낮잠"));
  evs.push(sleep(vary(9,1),  vary(30,20),vary(11,1), vary(0,20), "낮잠"));
  evs.push(sleep(vary(13,1), vary(0,20), vary(15,1), vary(0,20), "낮잠"));
  evs.push(sleep(vary(17,1), vary(0,20), vary(18,1), vary(0,20), "낮잠"));

  // ── 저녁 밤잠 ──
  evs.push(sleep(vary(22,1), vary(0,20), 23, 59, "밤잠 시작"));

  // ── 기저귀 ──
  ["06:30","09:00","11:30","13:00","15:00","17:30","20:00","22:00"].forEach((t, i) =>
    evs.push(diaper(t, i % 3 === 1 ? "소변 + 대변" : "소변"))
  );

  // ── 목욕 (3일마다) ──
  if (dayIndex % 3 === 0) evs.push(bath("18:00", 10, "스펀지 목욕"));

  // ── 투약 (매일 비타민D) ──
  evs.push(med("10:00", "비타민 D 드롭 0.5ml"));

  return evs;
}

// ── 건강기록 시드 ─────────────────────────────────────────────

interface HealthRecord { id: string; childId: string; caregiverId?: string; date: string; height: string; weight: string; headCircumference: string; }

interface ChildInfo { id: string; birthDate?: string; height?: string; weight?: string; gender?: string; }

function seedHealthRecords(children: ChildInfo[]): void {
  // 월별 성장치 (p50 근사): [개월수, 키cm, 몸무게kg, 머리둘레cm]
  const maleRef: Record<number, [number, number, number]> = {
    0: [49.9, 3.3, 34.5], 1: [54.7, 4.5, 37.3], 2: [58.4, 5.6, 39.1],
    3: [61.4, 6.4, 40.5], 4: [63.9, 7.0, 41.6], 5: [65.9, 7.5, 42.6],
    6: [67.6, 7.9, 43.3], 7: [69.2, 8.3, 44.0], 8: [70.6, 8.6, 44.5],
    9: [72.0, 8.9, 45.0], 10:[73.3, 9.2, 45.4], 11:[74.5, 9.4, 45.8],
    12:[75.7, 9.6, 46.1],
  };
  const femaleRef: Record<number, [number, number, number]> = {
    0: [49.1, 3.2, 33.9], 1: [53.7, 4.2, 36.5], 2: [57.1, 5.1, 38.3],
    3: [59.8, 5.8, 39.5], 4: [62.1, 6.4, 40.6], 5: [64.0, 6.9, 41.5],
    6: [65.7, 7.3, 42.2], 7: [67.3, 7.6, 42.8], 8: [68.7, 7.9, 43.4],
    9: [70.1, 8.2, 43.8], 10:[71.5, 8.5, 44.2], 11:[72.8, 8.7, 44.6],
    12:[74.0, 8.9, 44.9],
  };

  const newRecords: HealthRecord[] = [];

  children.slice(0, 3).forEach((child) => {
    if (!child.birthDate) return;

    const birth = new Date(child.birthDate);
    const today = new Date();
    const totalMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    const ref = child.gender === "female" ? femaleRef : maleRef;

    // 등록된 실제 키/몸무게와 WHO 기준치의 차이를 오프셋으로 적용
    const refAtCurrent = ref[Math.min(totalMonths, 12)] ?? ref[12];
    const heightOffset = child.height ? parseFloat(child.height) - refAtCurrent[0] : 0;
    const weightOffset = child.weight ? parseFloat(child.weight) - refAtCurrent[1] : 0;

    // 매달 1회 측정 (최근 6개월치)
    for (let m = Math.max(0, totalMonths - 5); m <= totalMonths; m++) {
      const measureDate = new Date(birth);
      measureDate.setMonth(measureDate.getMonth() + m);
      const dateStr = measureDate.toISOString().slice(0, 10);

      const base = ref[Math.min(m, 12)] ?? ref[12];
      const isCurrent = m === totalMonths;

      // 현재 시점은 등록값 그대로, 과거는 오프셋 적용 + 미세 변동
      const height = isCurrent && child.height
        ? child.height
        : (base[0] + heightOffset + vary(0, 4) * 0.1).toFixed(1);
      const weight = isCurrent && child.weight
        ? child.weight
        : (base[1] + weightOffset + vary(0, 4) * 0.1).toFixed(1);
      const head = (base[2] + vary(0, 2) * 0.1).toFixed(1);

      const caregiverId = m % 2 === 0 ? MOM_ID : DAD_ID;
      newRecords.push({ id: uuid(), childId: child.id, caregiverId, date: dateStr, height, weight, headCircumference: head });
    }
  });

  localStorage.setItem("health-records", JSON.stringify(newRecords));
}

// ── 성장일기 시드 ─────────────────────────────────────────────

interface DiaryRecord { id: string; childId: string; caregiverId?: string; date: string; content: string; emoji: string; }

const DIARY_POOL = [
  ["😊", "오늘 처음으로 혼자 앉아 있었어! 10초 정도 버텼는데 너무 기특했다 💕"],
  ["🌙", "밤에 두 번 깼는데 안아주니까 금방 다시 잠들었어. 엄마도 힘들지만 이 순간이 소중하다."],
  ["🍼", "이유식 처음 먹여봤는데 인상 찡그리면서도 다 먹었어 ㅋㅋ 맛있었나봐"],
  ["😴", "낮잠을 두 번이나 길게 자서 밤에 잘 잘 수 있을지 걱정됐는데 다행히 잘 잤다."],
  ["🎵", "자장가 틀어주니까 눈이 스르르 감기는 거 보고 심쿵했다 ❤️"],
  ["😂", "뒤집기 연습 중인데 엎드리면 울어버림 ㅋㅋ 아직 인내심 수련 중"],
  ["🌟", "웃음소리가 점점 커지고 있어. 오늘은 까르르 웃는 소리에 나도 따라 웃었다."],
  ["🤒", "조금 열이 나서 걱정했는데 해열제 먹고 자고 나니 괜찮아져서 다행이야."],
  ["👶", "손발을 엄청 열심히 흔들어요. 세상이 신기한가봐!"],
  ["🌈", "오늘 처음으로 '아' 소리를 냈어! 말 배우는 시작인가 싶어서 너무 기뻤다."],
  ["💪", "목 가누기가 점점 좋아지고 있어. 터미 타임 때 훨씬 오래 버텨요."],
  ["🥰", "아빠 얼굴 보고 방긋 웃었어. 아빠가 엄청 좋아하더라 ㅎㅎ"],
  ["😪", "성장통인지 유독 칭얼거린 하루. 안고 있으면 괜찮아지더라."],
  ["🛁", "목욕 시간이 점점 재밌어지는 것 같아. 물장구 치려고 발을 버둥거림 ㅋㅋ"],
];

function seedDiaryRecords(children: ChildInfo[]): void {
  const newRecords: DiaryRecord[] = [];

  children.slice(0, 3).forEach((child, ci) => {
    // 2주 중 4~5일 일기 작성 (간헐적으로)
    const writeDays = [0, 2, 5, 8, 11, 13].slice(0, 5);
    writeDays.forEach((daysAgoN, wi) => {
      const poolIdx = (ci * 5 + wi) % DIARY_POOL.length;
      const [emoji, content] = DIARY_POOL[poolIdx];
      const caregiverId = daysAgoN % 2 === 0 ? MOM_ID : DAD_ID;
      newRecords.push({ id: uuid(), childId: child.id, caregiverId, date: ago(daysAgoN), content, emoji });
    });
  });

  localStorage.setItem("diary-records", JSON.stringify(newRecords));
}

// ── 데모 아이 시드 ────────────────────────────────────────────

const DEMO_TWIN_GROUP = "demo-twin-group-2026";

interface RegisteredChild {
  id: string; name: string; nicknames: string[];
  gender: "male" | "female"; birthDate: string;
  height: string; weight: string; twinGroupId?: string;
}

const DEMO_CHILDREN: RegisteredChild[] = [
  {
    id: "demo-child-seoa",
    name: "이서아", nicknames: ["첫째"],
    gender: "female", birthDate: "2025-02-01",
    height: "48.4", weight: "3.32",
  },
  {
    id: "demo-child-seoyun",
    name: "이서윤", nicknames: ["서윤이", "유니"],
    gender: "female", birthDate: "2026-02-14",
    height: "45", weight: "2.85",
    twinGroupId: DEMO_TWIN_GROUP,
  },
  {
    id: "demo-child-seojun",
    name: "이서준", nicknames: ["서준이", "막내", "쭈니"],
    gender: "male", birthDate: "2026-02-14",
    height: "46", weight: "2.9",
    twinGroupId: DEMO_TWIN_GROUP,
  },
];

// ── 메인 ─────────────────────────────────────────────────────

function calcAgeMonths(birthDate?: string): number {
  if (!birthDate) return 6;
  const birth = new Date(birthDate);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()));
}

function selectPlanner(child: ChildInfo): (dayIndex: number) => Ev[] {
  const months = calcAgeMonths(child.birthDate);
  if (months <= 2) return eventsThird;   // 신생아 (~2개월)
  if (months <= 5) return eventsSecond;  // 영아 초기 (3~5개월)
  return eventsFirst;                    // 영아 후기 (6개월~)
}

export function seedDemoData(): number {
  let children: ChildInfo[] = [];
  try { children = JSON.parse(localStorage.getItem("registered-children") ?? "[]"); } catch { children = []; }

  // 등록된 아이가 없으면 데모 아이 자동 등록
  if (children.length === 0) {
    localStorage.setItem("registered-children", JSON.stringify(DEMO_CHILDREN));
    children = DEMO_CHILDREN;
  }

  // 양육자 등록 및 현재 양육자 → 아빠(이해커톤)
  ensureFixedCaregivers();
  setActiveCaregiverId(DAD_ID);

  const records: VoiceRecord[] = [];

  children.slice(0, 3).forEach((child) => {
    const planner = selectPlanner(child);

    for (let daysAgoN = 13; daysAgoN >= 0; daysAgoN--) {
      const dateStr = ago(daysAgoN);
      const events = planner(daysAgoN);
      const caregiverId = daysAgoN % 2 === 0 ? MOM_ID : DAD_ID;

      for (const ev of events) {
        if (daysAgoN === 0 && ev.hhmm >= "10:00") continue;
        try {
          records.push(makeRecord(child.id, dateStr, ev, caregiverId));
        } catch {
          // 잘못된 이벤트 건너뜀
        }
      }
    }
  });

  // 기존 데이터 초기화 후 새로 삽입
  localStorage.setItem("voice-records", JSON.stringify(records));

  // 건강기록 + 성장일기 (기존 데이터 덮어쓰기)
  seedHealthRecords(children);
  seedDiaryRecords(children);

  return records.length;
}
