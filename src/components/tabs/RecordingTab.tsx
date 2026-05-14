"use client";

import { IonIcon } from "@ionic/react";
import { micOutline, stopOutline } from "ionicons/icons";
import { useState, useRef, useEffect } from "react";
import { Category, CATEGORY_META, VoiceRecord, detectCategory, saveRecord, loadRecords } from "@/lib/records";

// ── 타입 ─────────────────────────────────────────────────────

type RecordStatus = "idle" | "recording" | "preview" | "transcribing" | "categorize";

interface Child {
  id: string;
  name: string;
  nicknames: string[];
  gender: "male" | "female";
  birthDate: string;
  weight: string;
  height: string;
  twinGroupId?: string;
}

// ── 유틸 ─────────────────────────────────────────────────────

function loadChildren(): Child[] {
  try {
    const raw = localStorage.getItem("registered-children");
    if (!raw) return [];
    return JSON.parse(raw) as Child[];
  } catch { return []; }
}

function calcAge(birthDate: string) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const notYet = today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (notYet) age--;
  return age;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const s = totalSec % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}

function formatHHMM(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function toHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function hhmmToISO(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function getLastRecord(records: VoiceRecord[], childId: string, category: Category): VoiceRecord | null {
  return records
    .filter((r) => r.category === category && r.childId === childId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;
}

const ALL_CATEGORIES: Category[] = ["feeding", "sleep", "diaper", "bath", "medication", "other"];
const INSTANT_CATS = new Set<Category>(["diaper", "medication"]);

function plusOneMinute(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + 1);
  return d.toISOString();
}

// ── 아이 현황 카드 ────────────────────────────────────────────

function ChildStatusCard({ child, records }: { child: Child; records: VoiceRecord[] }) {
  const now = Date.now();
  const sleepRec  = getLastRecord(records, child.id, "sleep");
  const feedRec   = getLastRecord(records, child.id, "feeding");
  const diaperRec = getLastRecord(records, child.id, "diaper");
  const age       = calcAge(child.birthDate);
  const emoji     = child.gender === "female" ? "👧" : "👦";
  const genderBg  = child.gender === "female" ? "#fdf2f8" : "#eff6ff";

  const rows = [
    {
      icon: "💤",
      label: "일어난 지",
      rec: sleepRec,
      category: "sleep" as Category,
    },
    {
      icon: "🍼",
      label: "맘마 먹은 지",
      rec: feedRec,
      category: "feeding" as Category,
    },
    {
      icon: "🚿",
      label: "기저귀 간 지",
      rec: diaperRec,
      category: "diaper" as Category,
    },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "16px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      {/* 아이 프로필 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: genderBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{child.name}</span>
            {child.nicknames.length > 0 && (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>({child.nicknames[0]})</span>
            )}
            {child.twinGroupId && (
              <span style={{ fontSize: 11, color: "#8b5cf6", background: "#f5f3ff", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>쌍둥이</span>
            )}
          </div>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>만 {age}세 · {child.gender === "female" ? "여아" : "남아"}</span>
        </div>
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, background: "#f3f4f6", marginBottom: 12 }} />

      {/* 활동 현황 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(({ icon, label, rec, category }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, width: 24, textAlign: "center", flexShrink: 0 }}>{icon}</span>
            {rec ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: "#374151" }}>
                  {label}{" "}
                  <span style={{ fontWeight: 700, color: CATEGORY_META[category].color }}>
                    {formatElapsed(now - new Date(rec.timestamp).getTime())}
                  </span>
                  {" "}지났어요
                </span>
                <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                  마지막 시간 : {formatHHMM(rec.timestamp)}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "#d1d5db" }}>기록 없음</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 녹음 영역 ─────────────────────────────────────────────────

const DT_INPUT: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  border: "1px solid #e5e7eb", borderRadius: 10,
  padding: "9px 10px", fontSize: 13, outline: "none",
  background: "#f9fafb", color: "#374151",
};
const DT_LABEL: React.CSSProperties = {
  fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4,
};

function RecordingArea({
  status, audioUrl,
  onStart, onStop, onReset, onTranscribe,
  transcript, onTranscriptChange, error,
  startTime, onStartTimeChange, endTime, onEndTimeChange,
  detectedCategory, selectedCategory, onSelectCategory,
  children, selectedChildId, onSelectChild,
  saved, onSave,
}: {
  status: RecordStatus; audioUrl: string | null;
  onStart: () => void; onStop: () => void; onReset: () => void; onTranscribe: () => void;
  transcript: string; onTranscriptChange: (text: string) => void; error: string;
  startTime: string; onStartTimeChange: (v: string) => void;
  endTime: string; onEndTimeChange: (v: string) => void;
  detectedCategory: Category; selectedCategory: Category; onSelectCategory: (c: Category) => void;
  children: Child[]; selectedChildId: string; onSelectChild: (id: string) => void;
  saved: boolean; onSave: () => void;
}) {
  const isRecording   = status === "recording";
  const isPreview     = status === "preview";
  const isTranscribing = status === "transcribing";
  const isCategorize  = status === "categorize";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, paddingBottom: 8 }}>

      {/* 마이크 버튼 */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <button
          onClick={isRecording ? onStop : onStart}
          disabled={isPreview || isTranscribing || isCategorize}
          style={{
            width: 100, height: 100, borderRadius: "50%", border: "none",
            background: isRecording ? "#dc2626" : (isPreview || isTranscribing || isCategorize) ? "#d1d5db" : "#ef4444",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isRecording
              ? "0 0 0 10px rgba(220,38,38,0.12), 0 4px 18px rgba(239,68,68,0.45)"
              : "0 6px 20px rgba(239,68,68,0.35)",
            cursor: (isPreview || isTranscribing || isCategorize) ? "default" : "pointer",
            transition: "background 0.2s, box-shadow 0.3s",
          }}
        >
          <IonIcon icon={isRecording ? stopOutline : micOutline} style={{ fontSize: 46, color: "white" }} />
        </button>

        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
          {isRecording    ? "녹음 중… 버튼을 눌러 완료"
          : isPreview      ? "녹음 완료 — 아래에서 확인하세요"
          : isTranscribing ? "음성 인식 중…"
          : isCategorize   ? "카테고리를 선택하고 저장하세요"
          : "버튼을 눌러 녹음 시작"}
        </p>

        {isRecording && (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: 4, borderRadius: 2, background: "#ef4444", height: 16, animation: `wave 0.8s ease-in-out ${i * 0.15}s infinite alternate` }} />
            ))}
          </div>
        )}
      </div>

      {/* 미리 듣기 */}
      {isPreview && audioUrl && (
        <div style={{ width: "100%", background: "#f8fafc", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#374151" }}>녹음된 파일 미리 듣기</p>
          <audio src={audioUrl} controls style={{ width: "100%", borderRadius: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onReset} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}>
              다시 녹음
            </button>
            <button onClick={onTranscribe} style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: "#3880ff", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff" }}>
              음성 인식 시작
            </button>
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{error}</p>}

      {/* 카테고리 분류 + 저장 */}
      {isCategorize && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>인식 결과 (수정 가능)</span>
              <button onClick={onReset} style={{
                background: "none", border: "1px solid #e5e7eb", borderRadius: 8,
                fontSize: 11, color: "#6b7280", cursor: "pointer", padding: "3px 10px",
              }}>
                🎙 다시 녹음
              </button>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => onTranscriptChange(e.target.value)}
              rows={3}
              placeholder="인식된 내용이 없습니다"
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1px solid #e5e7eb", borderRadius: 12,
                padding: "10px 14px", fontSize: 13, color: "#374151",
                lineHeight: 1.6, resize: "vertical", outline: "none",
                background: "#f9fafb", fontFamily: "inherit",
              }}
            />
          </div>

          {/* 시간 */}
          {INSTANT_CATS.has(selectedCategory) ? (
            <div>
              <label style={DT_LABEL}>시간</label>
              <input type="time" value={startTime} onChange={(e) => onStartTimeChange(e.target.value)} style={DT_INPUT} />
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={DT_LABEL}>시작 시간</label>
                <input type="time" value={startTime} onChange={(e) => onStartTimeChange(e.target.value)} style={DT_INPUT} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={DT_LABEL}>종료 시간</label>
                <input type="time" value={endTime} onChange={(e) => onEndTimeChange(e.target.value)} style={DT_INPUT} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ALL_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const isAuto = cat === detectedCategory;
              const isSel  = cat === selectedCategory;
              return (
                <button key={cat} onClick={() => onSelectCategory(cat)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                  borderRadius: 20, cursor: "pointer",
                  border: isSel ? `2px solid ${meta.color}` : "1.5px solid #e5e7eb",
                  background: isSel ? meta.bg : "#fff",
                  color: isSel ? meta.color : "#6b7280",
                  fontSize: 12, fontWeight: isSel ? 700 : 500,
                }}>
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                  {isAuto && <span style={{ fontSize: 9, color: "#9ca3af" }}>AI</span>}
                </button>
              );
            })}
          </div>

          {children.length > 0 && (
            <select value={selectedChildId} onChange={(e) => onSelectChild(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", background: "#fff", outline: "none" }}>
              <option value="">아이 선택 (선택사항)</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.nicknames.length > 0 ? ` (${c.nicknames[0]})` : ""}{c.twinGroupId ? " · 쌍둥이" : ""}
                </option>
              ))}
            </select>
          )}

          <button onClick={onSave} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: saved ? "#16a34a" : "#3880ff",
            fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#fff",
            transition: "background 0.2s",
          }}>
            {saved ? "저장 완료 ✓" : "기록 저장"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── 직접 입력 영역 ────────────────────────────────────────────

function ManualInputArea({ kids }: { kids: Child[] }) {
  const nowStr = () => toHHMM(new Date().toISOString());

  const [category, setCategory]   = useState<Category>("feeding");
  const [startTime, setStartTime] = useState(nowStr);
  const [endTime, setEndTime]     = useState(nowStr);
  const [childId, setChildId]     = useState(kids.length > 0 ? kids[0].id : "");
  const [memo, setMemo]           = useState("");
  const [saved, setSaved]         = useState(false);

  const isInstant = INSTANT_CATS.has(category);

  const handleSave = () => {
    const ts = hhmmToISO(startTime);
    saveRecord({
      id: crypto.randomUUID(),
      childId: childId || null,
      timestamp: ts,
      endTime: isInstant ? plusOneMinute(ts) : hhmmToISO(endTime),
      transcript: memo,
      category,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setCategory("feeding");
      setMemo("");
      setStartTime(nowStr());
      setEndTime(nowStr());
      setChildId(kids.length > 0 ? kids[0].id : "");
    }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* 카테고리 버튼 그리드 */}
      <div>
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>카테고리</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          {ALL_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const isSel = cat === category;
            return (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: "16px 8px", borderRadius: 14, cursor: "pointer",
                border: isSel ? `2px solid ${meta.color}` : "1.5px solid #e5e7eb",
                background: isSel ? meta.bg : "#fff",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 26 }}>{meta.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: isSel ? 700 : 500, color: isSel ? meta.color : "#374151" }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 시간 */}
      {isInstant ? (
        <div>
          <label style={DT_LABEL}>시간</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={DT_INPUT} />
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={DT_LABEL}>시작 시간</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={DT_INPUT} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={DT_LABEL}>종료 시간</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={DT_INPUT} />
          </div>
        </div>
      )}

      {/* 아이 선택 */}
      {kids.length > 0 && (
        <select value={childId} onChange={(e) => setChildId(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", background: "#fff", outline: "none" }}>
          <option value="">아이 선택 (선택사항)</option>
          {kids.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.nicknames.length > 0 ? ` (${c.nicknames[0]})` : ""}{c.twinGroupId ? " · 쌍둥이" : ""}</option>
          ))}
        </select>
      )}

      {/* 메모 */}
      <div>
        <label style={{ ...DT_LABEL, marginBottom: 4 }}>메모 (선택사항)</label>
        <textarea
          value={memo} onChange={(e) => setMemo(e.target.value)}
          rows={2} placeholder="기록할 내용을 입력하세요"
          style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#374151", lineHeight: 1.6, resize: "vertical", outline: "none", background: "#f9fafb", fontFamily: "inherit" }}
        />
      </div>

      {/* 저장 */}
      <button onClick={handleSave} style={{
        width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
        background: saved ? "#16a34a" : "#3880ff",
        fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#fff",
        transition: "background 0.2s",
      }}>
        {saved ? "저장 완료 ✓" : "기록 저장"}
      </button>
    </div>
  );
}

// ── 메인 탭 ──────────────────────────────────────────────────

export default function RecordingTab() {
  const [subTab, setSubTab]             = useState<"record" | "manual">("record");
  const [status, setStatus]             = useState<RecordStatus>("idle");
  const [audioUrl, setAudioUrl]         = useState<string | null>(null);
  const [audioBlobRef, setAudioBlobRef] = useState<{ blob: Blob; mimeType: string } | null>(null);
  const [transcript, setTranscript]     = useState("");
  const [error, setError]               = useState("");
  const [startTime, setStartTime]       = useState("");
  const [endTime, setEndTime]           = useState("");
  const [detectedCategory, setDetectedCategory] = useState<Category>("other");
  const [selectedCategory, setSelectedCategory] = useState<Category>("other");
  const [children, setChildren]         = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId]   = useState("");
  const [saved, setSaved]               = useState(false);
  const [records, setRecords]           = useState<VoiceRecord[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);

  useEffect(() => {
    setRecords(loadRecords());
    setChildren(loadChildren());
  }, []);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const startRecording = async () => {
    setError(""); setTranscript(""); setSaved(false);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    setAudioBlobRef(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioUrl(URL.createObjectURL(blob));
        setAudioBlobRef({ blob, mimeType });
        setStatus("preview");
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setStatus("recording");
    } catch {
      setError("마이크 권한이 필요합니다.");
    }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); mediaRecorderRef.current = null; };

  const transcribe = async () => {
    if (!audioBlobRef) return;
    const { blob, mimeType } = audioBlobRef;
    const ext = mimeType.includes("webm") ? "webm" : "mp4";
    const form = new FormData();
    form.append("audio", new File([blob], `recording.${ext}`, { type: mimeType }));
    setStatus("transcribing"); setError("");
    try {
      const res  = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const text: string = data.text ?? "";
      setTranscript(text);
      const VALID = new Set(["feeding", "sleep", "diaper", "bath", "medication", "other"]);
      const cat: Category = VALID.has(data.category) ? (data.category as Category) : detectCategory(text);
      setDetectedCategory(cat);
      setSelectedCategory(cat);
      const nowStr = toHHMM(new Date().toISOString());
      setStartTime(nowStr);
      setEndTime(nowStr);
      const kids = loadChildren();
      setChildren(kids);
      setSelectedChildId(kids.length > 0 ? kids[0].id : "");
      setStatus("categorize");
    } catch (e) {
      setError(e instanceof Error ? e.message : "인식에 실패했습니다.");
      setStatus("idle");
    }
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const ts = startTime ? hhmmToISO(startTime) : now;
    saveRecord({
      id: crypto.randomUUID(),
      childId: selectedChildId || null,
      timestamp: ts,
      endTime: INSTANT_CATS.has(selectedCategory) ? plusOneMinute(ts) : (endTime ? hhmmToISO(endTime) : now),
      transcript,
      category: selectedCategory,
    });
    setSaved(true);
    setRecords(loadRecords());
    setTimeout(() => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null); setAudioBlobRef(null);
      setTranscript(""); setError(""); setSaved(false);
      setStartTime(""); setEndTime("");
      setStatus("idle");
    }, 1200);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null); setAudioBlobRef(null);
    setTranscript(""); setError(""); setSaved(false);
    setStartTime(""); setEndTime("");
    setStatus("idle");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", padding: "20px 16px 24px", display: "flex", flexDirection: "column", gap: 16, background: "#f9fafb" }}>

        {/* 서브 탭 토글 */}
        <div style={{ display: "flex", background: "#e5e7eb", borderRadius: 10, padding: 3 }}>
          {([["record", "🎙 녹음"], ["manual", "✏️ 직접 입력"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSubTab(key)} style={{
              flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              background: subTab === key ? "#fff" : "transparent",
              color: subTab === key ? "#111827" : "#9ca3af",
              boxShadow: subTab === key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>{label}</button>
          ))}
        </div>

        {/* 카드 */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "24px 16px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          {subTab === "record" ? (
            <RecordingArea
              status={status} audioUrl={audioUrl}
              onStart={startRecording} onStop={stopRecording} onReset={reset} onTranscribe={transcribe}
              transcript={transcript} onTranscriptChange={setTranscript} error={error}
              startTime={startTime} onStartTimeChange={setStartTime}
              endTime={endTime} onEndTimeChange={setEndTime}
              detectedCategory={detectedCategory} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory}
              children={children} selectedChildId={selectedChildId} onSelectChild={setSelectedChildId}
              saved={saved} onSave={handleSave}
            />
          ) : (
            <ManualInputArea kids={children} />
          )}
        </div>

        {/* 아이 현황 카드 */}
        {children.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 20, padding: "24px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 32 }}>👶</span>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
              설정에서 아이를 등록하면<br />활동 현황이 표시됩니다
            </p>
          </div>
        ) : (
          children.map((child) => (
            <ChildStatusCard key={child.id} child={child} records={records} />
          ))
        )}
      </div>

      <style>{`@keyframes wave { from { height: 6px; } to { height: 24px; } }`}</style>
    </div>
  );
}
