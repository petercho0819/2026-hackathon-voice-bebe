"use client";

import { useState, useEffect } from "react";
import { loadRecords, updateRecord, deleteRecord, VoiceRecord, CATEGORY_META, Category } from "@/lib/records";

interface Child {
  id: string;
  name: string;
  nicknames: string[];
  gender: "male" | "female";
}

function loadChildren(): Child[] {
  try {
    const raw = localStorage.getItem("registered-children");
    return raw ? (JSON.parse(raw) as Child[]) : [];
  } catch { return []; }
}

const ALL_CATEGORIES: Category[] = ["feeding", "sleep", "diaper", "bath", "other"];

// ── 수정 모달 ─────────────────────────────────────────────────

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

const DT_FIELD: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  border: "1px solid #e5e7eb", borderRadius: 10,
  padding: "9px 10px", fontSize: 13, outline: "none",
  background: "#f9fafb", color: "#374151",
};
const DT_LABEL: React.CSSProperties = {
  fontSize: 12, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4,
};

function RecordEditModal({
  record,
  onSave,
  onClose,
}: {
  record: VoiceRecord;
  onSave: (data: Pick<VoiceRecord, "transcript" | "category" | "timestamp" | "endTime">) => void;
  onClose: () => void;
}) {
  const [transcript, setTranscript] = useState(record.transcript);
  const [category, setCategory]     = useState<Category>(record.category);
  const [startTime, setStartTime]   = useState(toHHMM(record.timestamp));
  const [endTime, setEndTime]       = useState(toHHMM(record.endTime ?? record.timestamp));

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }} />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        background: "#fff", borderRadius: "20px 20px 0 0",
        zIndex: 201, display: "flex", flexDirection: "column",
        maxHeight: "80dvh",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e5e7eb" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 12px" }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>기록 수정</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: "auto", padding: "0 20px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 시작 / 종료 시간 */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={DT_LABEL}>시작 시간</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={DT_FIELD} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={DT_LABEL}>종료 시간</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={DT_FIELD} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>내용</span>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1px solid #e5e7eb", borderRadius: 10,
                padding: "10px 12px", fontSize: 14, color: "#374151",
                lineHeight: 1.6, resize: "vertical", outline: "none",
                background: "#f9fafb", fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>카테고리</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ALL_CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const isSel = cat === category;
                return (
                  <button key={cat} onClick={() => setCategory(cat)} style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                    borderRadius: 20, cursor: "pointer",
                    border: isSel ? `2px solid ${meta.color}` : "1.5px solid #e5e7eb",
                    background: isSel ? meta.bg : "#fff",
                    color: isSel ? meta.color : "#6b7280",
                    fontSize: 12, fontWeight: isSel ? 700 : 500,
                  }}>
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "13px 0", borderRadius: 10,
              border: "1px solid #e5e7eb", background: "#fff",
              fontSize: 15, cursor: "pointer", color: "#374151",
            }}>취소</button>
            <button onClick={() => onSave({
              transcript, category,
              timestamp: startTime ? hhmmToISO(startTime) : record.timestamp,
              endTime: endTime ? hhmmToISO(endTime) : record.endTime,
            })} style={{
              flex: 2, padding: "13px 0", borderRadius: 10, border: "none",
              background: "#3880ff", fontSize: 15, fontWeight: 700,
              cursor: "pointer", color: "#fff",
            }}>저장하기</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 삭제 확인 모달 ────────────────────────────────────────────

function DeleteConfirmModal({
  record,
  onConfirm,
  onClose,
}: {
  record: VoiceRecord;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const meta = CATEGORY_META[record.category];
  const t = new Date(record.timestamp);
  const time = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }} />
      <div style={{
        position: "fixed", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff", borderRadius: 20,
        zIndex: 201, width: "calc(100% - 48px)", maxWidth: 320,
        padding: "28px 20px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          🗑️
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#111827" }}>기록을 삭제할까요?</p>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            {time} · <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
          </p>
          {record.transcript && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
              {record.transcript.length > 40 ? record.transcript.slice(0, 40) + "…" : record.transcript}
            </p>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>삭제한 기록은 복구할 수 없습니다</p>
        <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "13px 0", borderRadius: 10,
            border: "1px solid #e5e7eb", background: "#fff",
            fontSize: 15, cursor: "pointer", color: "#374151", fontWeight: 600,
          }}>취소</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "13px 0", borderRadius: 10, border: "none",
            background: "#ef4444", fontSize: 15, fontWeight: 700,
            cursor: "pointer", color: "#fff",
          }}>삭제</button>
        </div>
      </div>
    </>
  );
}

// ── 날짜 유틸 ────────────────────────────────────────────────

function sameDay(iso: string, date: Date) {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate();
}

function getWeekDates(today: Date): Date[] {
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// ── SVG 도넛 차트 헬퍼 ──────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, rO: number, rI: number, a1: number, a2: number) {
  const p1 = polar(cx, cy, rO, a1);
  const p2 = polar(cx, cy, rO, a2);
  const p3 = polar(cx, cy, rI, a2);
  const p4 = polar(cx, cy, rI, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${p1.x},${p1.y}A${rO},${rO},0,${large},1,${p2.x},${p2.y}L${p3.x},${p3.y}A${rI},${rI},0,${large},0,${p4.x},${p4.y}Z`;
}

// ── 일과표 (도넛 차트) ───────────────────────────────────────

const CHART_CATS: Category[] = ["feeding", "sleep", "diaper", "bath", "other"];

function DailyView({ records, onEdit, onDelete }: { records: VoiceRecord[]; onEdit: (r: VoiceRecord) => void; onDelete: (r: VoiceRecord) => void }) {
  const today = new Date();
  const todayRecords = records
    .filter((r) => sameDay(r.timestamp, today))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // hour → first category
  const hourMap: Record<number, Category> = {};
  for (const r of todayRecords) {
    const h = new Date(r.timestamp).getHours();
    if (!(h in hourMap)) hourMap[h] = r.category;
  }

  const CX = 110, CY = 110, RO = 86, RI = 56, SIZE = 220;
  const hourLabels = [{ h: 0, label: "0" }, { h: 6, label: "6" }, { h: 12, label: "12" }, { h: 18, label: "18" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* 도넛 차트 */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* 배경 링 */}
          <circle cx={CX} cy={CY} r={(RO + RI) / 2} fill="none" stroke="#f3f4f6" strokeWidth={RO - RI} />

          {/* 활동 세그먼트 */}
          {Array.from({ length: 24 }, (_, h) => {
            const cat = hourMap[h];
            if (!cat) return null;
            const a1 = (h / 24) * 360;
            const a2 = ((h + 1) / 24) * 360 - 0.5;
            return <path key={h} d={arcPath(CX, CY, RO, RI, a1, a2)} fill={CATEGORY_META[cat].color} opacity={0.85} />;
          })}

          {/* 시간 눈금 */}
          {Array.from({ length: 24 }, (_, h) => {
            const angle = (h / 24) * 360;
            const isMajor = h % 6 === 0;
            const p1 = polar(CX, CY, RO + 3, angle);
            const p2 = polar(CX, CY, RO + (isMajor ? 9 : 5), angle);
            return <line key={h} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#d1d5db" strokeWidth={isMajor ? 2 : 1} />;
          })}

          {/* 시간 레이블 */}
          {hourLabels.map(({ h, label }) => {
            const p = polar(CX, CY, RO + 18, (h / 24) * 360);
            return (
              <text key={h} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#9ca3af">
                {label}
              </text>
            );
          })}

          {/* 중앙 텍스트 */}
          <text x={CX} y={CY - 12} textAnchor="middle" fontSize={15} fontWeight={800} fill="#111827">
            {`${today.getMonth() + 1}월 ${today.getDate()}일`}
          </text>
          <text x={CX} y={CY + 8} textAnchor="middle" fontSize={12} fill="#6b7280">
            {["일", "월", "화", "수", "목", "금", "토"][today.getDay()]}요일
          </text>
          <text x={CX} y={CY + 26} textAnchor="middle" fontSize={11} fill="#9ca3af">
            {todayRecords.length}건 기록
          </text>
        </svg>
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {CHART_CATS.map((cat) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: CATEGORY_META[cat].color }} />
            <span style={{ fontSize: 11, color: "#6b7280" }}>{CATEGORY_META[cat].label}</span>
          </div>
        ))}
      </div>

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {(["feeding", "sleep", "diaper"] as Category[]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const count = todayRecords.filter((r) => r.category === cat).length;
          return (
            <div key={cat} style={{ background: "#fff", borderRadius: 14, padding: "12px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 22 }}>{meta.emoji}</span>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{meta.label}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: count > 0 ? meta.color : "#d1d5db" }}>{count}</span>
              <span style={{ fontSize: 10, color: "#9ca3af" }}>회</span>
            </div>
          );
        })}
      </div>

      {/* 오늘 기록 리스트 */}
      {todayRecords.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <span style={{ fontSize: 36 }}>🌙</span>
          <p style={{ margin: 0, fontSize: 14, color: "#9ca3af" }}>오늘 기록이 없습니다</p>
          <p style={{ margin: 0, fontSize: 12, color: "#d1d5db" }}>녹음 탭에서 첫 기록을 추가해보세요</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>오늘 기록</p>
          {todayRecords.map((r) => {
            const meta = CATEGORY_META[r.category];
            const fmt = (iso: string) => {
              const d = new Date(iso);
              return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
            };
            const startStr = fmt(r.timestamp);
            const endStr   = fmt(r.endTime ?? r.timestamp);
            const timeRange = startStr === endStr ? startStr : `${startStr} ~ ${endStr}`;
            return (
              <div key={r.id} style={{ background: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{meta.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{timeRange}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: "1px 6px", borderRadius: 6 }}>{meta.label}</span>
                  </div>
                  {r.transcript && (
                    <p style={{ margin: 0, fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.transcript.length > 45 ? r.transcript.slice(0, 45) + "…" : r.transcript}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexShrink: 0 }}>
                  <button onClick={() => onEdit(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3880ff", fontSize: 12, padding: "4px 6px" }}>수정</button>
                  <button onClick={() => onDelete(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 12, padding: "4px 6px" }}>삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 주간 패턴 (그리드) ───────────────────────────────────────

const DAY_SHORT = ["월", "화", "수", "목", "금", "토", "일"];
const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21];
const CELL_H = 13;

function WeeklyView({ records }: { records: VoiceRecord[] }) {
  const today = new Date();
  const weekDates = getWeekDates(today);

  // [dayIndex][hour] = Category | null
  const grid: (Category | null)[][] = Array.from({ length: 7 }, () => Array(24).fill(null));
  for (const r of records) {
    const di = weekDates.findIndex((d) => sameDay(r.timestamp, d));
    if (di >= 0) {
      const h = new Date(r.timestamp).getHours();
      if (!grid[di][h]) grid[di][h] = r.category;
    }
  }

  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const label = `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 - ${weekEnd.getDate()}일`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#374151", textAlign: "center" }}>{label}</p>

      <div style={{ background: "#fff", borderRadius: 16, padding: "14px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", gap: 3 }}>

          {/* 시간 레이블 열 */}
          <div style={{ display: "flex", flexDirection: "column", width: 22, flexShrink: 0 }}>
            <div style={{ height: 32 }} />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ height: CELL_H, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 3 }}>
                {HOUR_LABELS.includes(h) && (
                  <span style={{ fontSize: 8, color: "#9ca3af", lineHeight: 1 }}>{String(h).padStart(2, "0")}</span>
                )}
              </div>
            ))}
          </div>

          {/* 요일 열 */}
          {weekDates.map((date, di) => {
            const isToday = date.toDateString() === today.toDateString();
            return (
              <div key={di} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                {/* 요일 헤더 */}
                <div style={{ height: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  <span style={{ fontSize: 9, color: "#9ca3af", lineHeight: 1 }}>{DAY_SHORT[di]}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, lineHeight: 1,
                    color: isToday ? "#fff" : "#374151",
                    background: isToday ? "#3880ff" : "transparent",
                    width: 18, height: 18, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {date.getDate()}
                  </span>
                </div>

                {/* 시간 셀 */}
                {Array.from({ length: 24 }, (_, h) => {
                  const cat = grid[di][h];
                  return (
                    <div key={h} style={{
                      height: CELL_H,
                      borderRadius: 2,
                      background: cat ? CATEGORY_META[cat].color : "#f3f4f6",
                      opacity: cat ? 0.82 : 1,
                    }} />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {CHART_CATS.map((cat) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_META[cat].color }} />
            <span style={{ fontSize: 11, color: "#6b7280" }}>{CATEGORY_META[cat].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 메인 탭 ──────────────────────────────────────────────────

export default function StatusTab() {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [records, setRecords]           = useState<VoiceRecord[]>([]);
  const [children, setChildren]         = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("all");
  const [editTarget, setEditTarget]     = useState<VoiceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VoiceRecord | null>(null);

  useEffect(() => {
    setRecords(loadRecords());
    setChildren(loadChildren());
  }, []);

  const filteredRecords = selectedChildId === "all"
    ? records
    : records.filter((r) => r.childId === selectedChildId);

  const handleEditSave = (data: Pick<VoiceRecord, "transcript" | "category" | "timestamp" | "endTime">) => {
    if (!editTarget) return;
    updateRecord(editTarget.id, data);
    setRecords(loadRecords());
    setEditTarget(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteRecord(deleteTarget.id);
    setRecords(loadRecords());
    setDeleteTarget(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* 세그먼트 컨트롤 */}
      <div style={{ padding: "12px 16px 0", flexShrink: 0, background: "#f9fafb" }}>
        <div style={{ display: "flex", background: "#e5e7eb", borderRadius: 10, padding: 3 }}>
          {([["daily", "오늘"] as const, ["weekly", "이번 주"] as const]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                background: tab === key ? "#fff" : "transparent",
                color: tab === key ? "#111827" : "#9ca3af",
                boxShadow: tab === key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 아이 선택 */}
      {children.length > 0 && (
        <div style={{ padding: "10px 16px 0", flexShrink: 0, background: "#f9fafb" }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {[{ id: "all", name: "전체" }, ...children].map((c) => {
              const isSel = selectedChildId === c.id;
              return (
                <button key={c.id} onClick={() => setSelectedChildId(c.id)} style={{
                  flexShrink: 0, padding: "5px 14px", borderRadius: 20,
                  border: isSel ? "none" : "1.5px solid #e5e7eb",
                  background: isSel ? "#3880ff" : "#fff",
                  color: isSel ? "#fff" : "#6b7280",
                  fontSize: 13, fontWeight: isSel ? 700 : 500, cursor: "pointer",
                  transition: "all 0.15s",
                }}>{c.name}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 24px", background: "#f9fafb" }}>
        {tab === "daily"
          ? <DailyView records={filteredRecords} onEdit={setEditTarget} onDelete={setDeleteTarget} />
          : <WeeklyView records={filteredRecords} />
        }
      </div>

      {editTarget && (
        <RecordEditModal
          record={editTarget}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          record={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
