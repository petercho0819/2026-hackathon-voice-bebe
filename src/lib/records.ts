export type Category = "feeding" | "sleep" | "diaper" | "bath" | "medication" | "other";

export interface VoiceRecord {
  id: string;
  childId: string | null;
  timestamp: string; // startTime (ISO)
  endTime: string;   // endTime (ISO)
  transcript: string;
  category: Category;
}

export const CATEGORY_META: Record<
  Category,
  { label: string; emoji: string; color: string; bg: string }
> = {
  feeding:    { label: "수유", emoji: "🍼", color: "#f97316", bg: "#fff7ed" },
  sleep:      { label: "수면", emoji: "💤", color: "#6366f1", bg: "#eef2ff" },
  diaper:     { label: "기저귀", emoji: "🩲", color: "#06b6d4", bg: "#ecfeff" },
  bath:       { label: "목욕", emoji: "🛁", color: "#3b82f6", bg: "#eff6ff" },
  medication: { label: "투약", emoji: "💊", color: "#10b981", bg: "#ecfdf5" },
  other:      { label: "기타", emoji: "📝", color: "#6b7280", bg: "#f9fafb" },
};

const STORAGE_KEY = "voice-records";

export function loadRecords(): VoiceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 구 데이터 마이그레이션: endTime 없으면 timestamp로 채움
    return (parsed as VoiceRecord[]).map((r) =>
      r.endTime ? r : { ...r, endTime: r.timestamp }
    );
  } catch {
    return [];
  }
}

export function saveRecord(record: VoiceRecord): void {
  try {
    const existing = loadRecords();
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
}

export function updateRecord(
  id: string,
  data: Partial<Pick<VoiceRecord, "transcript" | "category" | "timestamp" | "endTime">>
): void {
  try {
    const existing = loadRecords();
    const updated = existing.map((r) => r.id === id ? { ...r, ...data } : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function deleteRecord(id: string): void {
  try {
    const existing = loadRecords();
    const updated = existing.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function detectCategory(text: string): Category {
  const t = text.toLowerCase();
  if (/수유|모유|분유|이유식|맘마|식사|밥|먹었|먹음|먹어|먹이|먹는|먹고|먹자|먹였|젖|우유|간식|죽|미음|퓨레/.test(t)) return "feeding";
  if (/잠|수면|재웠|깼|잤/.test(t)) return "sleep";
  if (/기저귀|응가|쉬|소변|대변/.test(t)) return "diaper";
  if (/목욕|씻/.test(t)) return "bath";
  if (/투약|약|복용|먹였|시럽|해열|진통|항생/.test(t)) return "medication";
  return "other";
}
