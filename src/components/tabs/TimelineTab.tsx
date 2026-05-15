"use client";

import { useState, useEffect } from "react";
import { GROWTH_REF, getPercentileBand, type GenderKey } from "@/lib/growthReference";
import { useTheme } from "@/contexts/ThemeContext";
import { Caregiver, loadCaregivers, loadActiveCaregiverId, caregiverEmoji } from "@/lib/caregivers";

// ── 타입 ─────────────────────────────────────────────────────

interface Child {
  id: string;
  name: string;
  nicknames: string[];
  gender: "male" | "female";
  birthDate: string;
  height?: string;   // cm (출생 시)
  weight?: string;   // kg (출생 시)
}

interface HealthRecord {
  id: string;
  childId: string;
  caregiverId?: string;
  date: string;             // YYYY-MM-DD
  height: string;           // cm
  weight: string;           // kg
  headCircumference: string; // cm
}

// ── 스토리지 ──────────────────────────────────────────────────

function loadChildren(): Child[] {
  try {
    const raw = localStorage.getItem("registered-children");
    return raw ? (JSON.parse(raw) as Child[]) : [];
  } catch { return []; }
}

function loadHealthRecords(): HealthRecord[] {
  try {
    const raw = localStorage.getItem("health-records");
    if (!raw) return [];
    return (JSON.parse(raw) as HealthRecord[]).map((r) => ({
      ...r,
      headCircumference: r.headCircumference ?? "",
    }));
  } catch { return []; }
}

function saveHealthRecords(records: HealthRecord[]) {
  localStorage.setItem("health-records", JSON.stringify(records));
}

// ── 유틸 ─────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function calcAge(birthDate: string, onDate: string): string {
  const birth = new Date(birthDate);
  const target = new Date(onDate + "T00:00:00");
  const months =
    (target.getFullYear() - birth.getFullYear()) * 12 +
    (target.getMonth() - birth.getMonth());
  if (months < 24) return `${months}개월`;
  return `만 ${Math.floor(months / 12)}세`;
}

// ── 삭제 확인 모달 ───────────────────────────────────────────

function DeleteConfirmModal({
  record,
  onConfirm,
  onClose,
}: {
  record: HealthRecord;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: theme.overlayBg, zIndex: 200 }} />
      <div style={{
        position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
        background: theme.card, borderRadius: 20, zIndex: 201,
        width: "calc(100% - 48px)", maxWidth: 320,
        padding: "28px 20px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🗑️</div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: theme.text1 }}>기록을 삭제할까요?</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.text2 }}>{formatDate(record.date)}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 6 }}>
            {record.height && <span style={{ fontSize: 13, color: "#3b82f6" }}>키 {record.height}cm</span>}
            {record.weight && <span style={{ fontSize: 13, color: "#f97316" }}>몸무게 {record.weight}kg</span>}
            {record.headCircumference && <span style={{ fontSize: 13, color: "#10b981" }}>머리 {record.headCircumference}cm</span>}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: theme.text4 }}>삭제한 기록은 복구할 수 없습니다</p>
        <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 15, cursor: "pointer", color: theme.text2, fontWeight: 600 }}>취소</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "none", background: "#ef4444", fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#fff" }}>삭제</button>
        </div>
      </div>
    </>
  );
}

// ── 모달 ─────────────────────────────────────────────────────

function HealthRecordModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: HealthRecord;
  onSave: (data: Omit<HealthRecord, "id" | "childId" | "caregiverId">) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [date, setDate]                   = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [height, setHeight]               = useState(initial?.height ?? "");
  const [weight, setWeight]               = useState(initial?.weight ?? "");
  const [headCircumference, setHeadCircumference] = useState(initial?.headCircumference ?? "");

  const canSubmit = date && (height || weight || headCircumference);

  const FIELD: React.CSSProperties = {
    border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: "9px 12px",
    fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box",
    background: theme.inputBg, color: theme.text2,
  };
  const LABEL: React.CSSProperties = {
    fontSize: 12, color: theme.text3, fontWeight: 600, marginBottom: 4, display: "block",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: theme.overlayBg, zIndex: 200 }} />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        background: theme.card, borderRadius: "20px 20px 0 0",
        zIndex: 201, display: "flex", flexDirection: "column",
        maxHeight: "80dvh",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 12px" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.text1 }}>{initial ? "기록 수정" : "기록 추가"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: theme.text4, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: "auto", padding: "0 20px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LABEL}>날짜 *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)} style={FIELD} />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>키 (cm)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                placeholder="50.0" min={30} max={250} step={0.1} style={FIELD} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>몸무게 (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                placeholder="3.5" min={0.5} max={200} step={0.1} style={FIELD} />
            </div>
          </div>

          <div>
            <label style={LABEL}>머리 둘레 (cm)</label>
            <input type="number" value={headCircumference} onChange={(e) => setHeadCircumference(e.target.value)}
              placeholder="34.0" min={20} max={70} step={0.1} style={FIELD} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "13px 0", borderRadius: 10,
              border: `1px solid ${theme.border}`, background: theme.card,
              fontSize: 15, cursor: "pointer", color: theme.text2,
            }}>취소</button>
            <button onClick={() => canSubmit && onSave({ date, height, weight, headCircumference })} disabled={!canSubmit} style={{
              flex: 2, padding: "13px 0", borderRadius: 10, border: "none",
              background: canSubmit ? "#3880ff" : theme.text5,
              fontSize: 15, fontWeight: 700, cursor: canSubmit ? "pointer" : "default", color: "#fff",
            }}>{initial ? "저장하기" : "추가하기"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 기록 카드 ─────────────────────────────────────────────────

function RecordCard({
  record,
  child,
  caregiverMap,
  onEdit,
  onDelete,
}: {
  record: HealthRecord;
  child: Child;
  caregiverMap: Record<string, Caregiver>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const age = calcAge(child.birthDate, record.date);

  return (
    <div style={{
      background: theme.card, borderRadius: 16,
      boxShadow: `0 1px 6px ${theme.shadow}`,
      overflow: "hidden",
    }}>
      {/* 날짜 헤더 */}
      <div style={{ background: theme.cardAlt, padding: "10px 16px", borderBottom: `1px solid ${theme.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text1 }}>{formatDate(record.date)}</span>
          <span style={{ fontSize: 12, color: theme.text4, marginLeft: 8 }}>{age}</span>
          {record.caregiverId && caregiverMap[record.caregiverId] && (
            <span style={{ fontSize: 10, color: theme.text4, background: theme.subtleBg, padding: "1px 6px", borderRadius: 6, marginLeft: 8 }}>
              {caregiverEmoji(caregiverMap[record.caregiverId].role)} {caregiverMap[record.caregiverId].name} ({caregiverMap[record.caregiverId].role})
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#3880ff", fontSize: 13, padding: "2px 8px" }}>수정</button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13, padding: "2px 8px" }}>삭제</button>
        </div>
      </div>

      {/* 수치 */}
      <div style={{ padding: "14px 16px", display: "flex", gap: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: theme.text4, fontWeight: 600 }}>키</span>
          {record.height ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#3b82f6" }}>{record.height}</span>
              <span style={{ fontSize: 12, color: theme.text4 }}>cm</span>
            </div>
          ) : (
            <span style={{ fontSize: 20, color: theme.text5, fontWeight: 700 }}>—</span>
          )}
        </div>

        <div style={{ width: 1, background: theme.borderLight, margin: "0 8px" }} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: theme.text4, fontWeight: 600 }}>몸무게</span>
          {record.weight ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#f97316" }}>{record.weight}</span>
              <span style={{ fontSize: 12, color: theme.text4 }}>kg</span>
            </div>
          ) : (
            <span style={{ fontSize: 20, color: theme.text5, fontWeight: 700 }}>—</span>
          )}
        </div>

        <div style={{ width: 1, background: theme.borderLight, margin: "0 8px" }} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: theme.text4, fontWeight: 600 }}>머리 둘레</span>
          {record.headCircumference ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>{record.headCircumference}</span>
              <span style={{ fontSize: 12, color: theme.text4 }}>cm</span>
            </div>
          ) : (
            <span style={{ fontSize: 20, color: theme.text5, fontWeight: 700 }}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 성장 그래프 ───────────────────────────────────────────────

const CW = 340, CH = 220;
const CP = { top: 24, right: 28, bottom: 40, left: 44 };
const PW = CW - CP.left - CP.right;
const PH = CH - CP.top - CP.bottom;

const METRIC_META = {
  height:           { label: "키",      unit: "cm", color: "#3b82f6" },
  weight:           { label: "몸무게",  unit: "kg", color: "#f97316" },
  headCircumference:{ label: "머리 둘레", unit: "cm", color: "#10b981" },
} as const;

type Metric = keyof typeof METRIC_META;

const REF_META = [
  { stroke: "#cbd5e1", dash: "4,3",  width: 0.9, label: "3"  },
  { stroke: "#94a3b8", dash: "4,3",  width: 0.9, label: "10" },
  { stroke: "#64748b", dash: "3,2",  width: 1.0, label: "25" },
  { stroke: "#475569", dash: "",     width: 1.3, label: "50" },
  { stroke: "#64748b", dash: "3,2",  width: 1.0, label: "75" },
  { stroke: "#94a3b8", dash: "4,3",  width: 0.9, label: "90" },
  { stroke: "#cbd5e1", dash: "4,3",  width: 0.9, label: "97" },
];

function calcAgeMonths(birthDate: string, onDate: string): number {
  const b = new Date(birthDate);
  const d = new Date(onDate + "T00:00:00");
  return (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
}

function GrowthChart({ records, child }: { records: HealthRecord[]; child: Child }) {
  const { theme } = useTheme();
  const [metric, setMetric] = useState<Metric>("height");

  const { color, unit } = METRIC_META[metric];
  const refTable = GROWTH_REF[metric];
  const gender: GenderKey = child.gender === "female" ? "female" : "male";
  const hasBirth = !!child.birthDate;

  const recordPoints = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce<{ date: string; value: number; month: number; isBirth?: boolean }[]>((acc, r) => {
      const raw = r[metric];
      const v = parseFloat(raw);
      if (!raw || isNaN(v) || v <= 0) return acc;
      const month = hasBirth ? Math.max(0, calcAgeMonths(child.birthDate, r.date)) : 0;
      acc.push({ date: r.date, value: v, month });
      return acc;
    }, []);

  const birthValue = metric === "height" ? child.height : metric === "weight" ? child.weight : undefined;
  const birthV = birthValue ? parseFloat(birthValue) : NaN;
  const hasBirthRecord = recordPoints.some((p) => p.month === 0);
  const birthPoint = hasBirth && !isNaN(birthV) && birthV > 0 && !hasBirthRecord
    ? [{ date: child.birthDate, value: birthV, month: 0, isBirth: true }]
    : [];

  const childPoints = [...birthPoint, ...recordPoints];

  if (!hasBirth) {
    return (
      <div style={{ background: theme.card, borderRadius: 16, boxShadow: `0 1px 6px ${theme.shadow}`, padding: "20px 16px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 13, color: theme.text4 }}>성장도표를 보려면 설정에서 생년월일을 입력해주세요</p>
      </div>
    );
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentMonth = Math.max(0, calcAgeMonths(child.birthDate, todayStr));
  const refKeys = Object.keys(refTable[gender]).map(Number);
  const maxRefMonth = refKeys.length ? Math.max(...refKeys) : 72;
  const xMax = Math.min(currentMonth + 1, maxRefMonth);
  const xMin = 0;

  const refVals: number[] = [];
  for (let m = xMin; m <= xMax; m++) {
    const row = refTable[gender]?.[m];
    if (row) refVals.push(row[0], row[6]);
  }
  const allVals = [...refVals, ...childPoints.map((p) => p.value)];
  const rawMin = allVals.length ? Math.min(...allVals) : 0;
  const rawMax = allVals.length ? Math.max(...allVals) : 1;
  const pad = (rawMax - rawMin) * 0.05;
  const yMin = Math.max(0, rawMin - pad);
  const yMax = rawMax + pad;
  const yRange = yMax - yMin || 1;

  const toX = (m: number) => CP.left + ((m - xMin) / Math.max(xMax - xMin, 1)) * PW;
  const toY = (v: number) => CP.top + (1 - (v - yMin) / yRange) * PH;

  const refPaths = REF_META.map((meta, pIdx) => {
    const segs: string[] = [];
    for (let m = xMin; m <= xMax; m++) {
      const row = refTable[gender]?.[m];
      if (!row) continue;
      segs.push(`${segs.length === 0 ? "M" : "L"}${toX(m).toFixed(1)},${toY(row[pIdx]).toFixed(1)}`);
    }
    return { d: segs.join(" "), meta, pIdx };
  });

  const childPathD = childPoints.length >= 2
    ? childPoints.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.month).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ")
    : "";

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    v: yMin + t * yRange,
    y: CP.top + (1 - t) * PH,
  }));

  const xTickCount = Math.min(6, xMax - xMin + 1);
  const xTicks: number[] = [];
  for (let i = 0; i <= xTickCount; i++) {
    const m = Math.round(xMin + (i / xTickCount) * (xMax - xMin));
    if (m >= xMin && m <= xMax && !xTicks.includes(m)) xTicks.push(m);
  }

  const latest = childPoints[childPoints.length - 1];
  const bandLabel = latest ? getPercentileBand(refTable, gender, latest.month, latest.value) : "";

  const bandTopSegs: string[] = [];
  const bandBotSegs: string[] = [];
  for (let m = xMin; m <= xMax; m++) {
    const row = refTable[gender]?.[m];
    if (!row) continue;
    bandTopSegs.push(`${bandTopSegs.length === 0 ? "M" : "L"}${toX(m).toFixed(1)},${toY(row[4]).toFixed(1)}`);
    bandBotSegs.unshift(`L${toX(m).toFixed(1)},${toY(row[2]).toFixed(1)}`);
  }
  const bandPath = bandTopSegs.length >= 2
    ? `${bandTopSegs.join(" ")} ${bandBotSegs.join(" ")} Z`
    : "";

  return (
    <div style={{ background: theme.card, borderRadius: 16, boxShadow: `0 1px 6px ${theme.shadow}`, overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: theme.text1 }}>성장도표</span>
        <div style={{ display: "flex", background: theme.subtleBg, borderRadius: 8, padding: 2 }}>
          {(Object.keys(METRIC_META) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600, transition: "all 0.15s",
                background: metric === m ? theme.segActive : "transparent",
                color: metric === m ? METRIC_META[m].color : theme.text4,
                boxShadow: metric === m ? `0 1px 2px ${theme.shadow}` : "none",
              }}
            >
              {METRIC_META[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG 성장도표 */}
      <svg width="100%" viewBox={`0 0 ${CW} ${CH}`} style={{ display: "block" }}>
        {yTicks.map(({ v, y }) => (
          <g key={y}>
            <line x1={CP.left} y1={y} x2={CW - CP.right} y2={y} stroke={theme.borderLight} strokeWidth={1} />
            <text x={CP.left - 5} y={y} textAnchor="end" dominantBaseline="middle" fontSize={8.5} fill={theme.text4}>
              {v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}
            </text>
          </g>
        ))}

        <line x1={CP.left} y1={CP.top + PH} x2={CP.left + PW} y2={CP.top + PH} stroke={theme.border} strokeWidth={1} />

        {xTicks.map((m) => (
          <text key={m} x={toX(m)} y={CP.top + PH + 14} textAnchor="middle" fontSize={8} fill={theme.text4}>
            {m === 0 ? "0" : m < 24 ? `${m}m` : `${Math.floor(m / 12)}세`}
          </text>
        ))}
        <text x={CP.left + PW / 2} y={CH - 4} textAnchor="middle" fontSize={7.5} fill={theme.text5}>개월 수</text>

        {bandPath && (
          <path d={bandPath} fill={color} opacity={0.07} />
        )}

        {refPaths.map(({ d, meta, pIdx }) => d.length > 0 && (
          <path
            key={pIdx}
            d={d}
            fill="none"
            stroke={meta.stroke}
            strokeWidth={meta.width}
            strokeDasharray={meta.dash || undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {refPaths.map(({ d, meta, pIdx }) => {
          if (!d) return null;
          const lastSeg = d.split(" ").filter((s) => s.startsWith("L") || s.startsWith("M")).pop() ?? "";
          const coords = lastSeg.replace(/^[ML]/, "").split(",");
          if (coords.length < 2) return null;
          const lx = parseFloat(coords[0]);
          const ly = parseFloat(coords[1]);
          return (
            <text key={`l${pIdx}`} x={lx + 3} y={ly} dominantBaseline="middle" fontSize={7.5} fill={meta.stroke} fontWeight={pIdx === 3 ? 700 : 400}>
              {meta.label}
            </text>
          );
        })}

        {childPathD && (
          <path d={childPathD} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {childPoints.map((p, i) => {
          const x = toX(p.month);
          const y = toY(p.value);
          const isLatest = i === childPoints.length - 1;
          const showLabel = childPoints.length <= 6 || i === 0 || isLatest;
          return (
            <g key={i}>
              {isLatest && <circle cx={x} cy={y} r={7} fill={color} opacity={0.15} />}
              {p.isBirth ? (
                <polygon
                  points={`${x},${y - 5} ${x + 4},${y} ${x},${y + 5} ${x - 4},${y}`}
                  fill={color}
                  stroke={theme.card}
                  strokeWidth={1.5}
                />
              ) : (
                <circle cx={x} cy={y} r={isLatest ? 4.5 : 3.5} fill={color} stroke={theme.card} strokeWidth={1.5} />
              )}
              {showLabel && (
                <text
                  x={x}
                  y={y - (isLatest || p.isBirth ? 12 : 10)}
                  textAnchor="middle"
                  fontSize={isLatest ? 10 : 8.5}
                  fontWeight={700}
                  fill={color}
                >
                  {p.value}
                </text>
              )}
              {p.isBirth && (
                <text x={x} y={y + 16} textAnchor="middle" fontSize={7} fill={color} opacity={0.8}>출생</text>
              )}
            </g>
          );
        })}

        {currentMonth <= xMax && (
          <line
            x1={toX(currentMonth)}
            y1={CP.top}
            x2={toX(currentMonth)}
            y2={CP.top + PH}
            stroke={color}
            strokeWidth={0.8}
            strokeDasharray="2,3"
            opacity={0.4}
          />
        )}
      </svg>

      {/* 하단 정보 */}
      <div style={{ padding: "4px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {bandLabel ? (
            <span style={{ fontSize: 12, color: theme.text2, fontWeight: 600 }}>
              현재 <span style={{ color }}>{bandLabel}백분위</span>
              <span style={{ fontSize: 10, color: theme.text4, fontWeight: 400, marginLeft: 4 }}>
                ({currentMonth}개월)
              </span>
            </span>
          ) : (
            <span style={{ fontSize: 11, color: theme.text4 }}>기록을 추가하면 백분위가 표시됩니다</span>
          )}
          <span style={{ fontSize: 9, color: theme.text5 }}>질병관리청 소아청소년 성장도표 2017</span>
        </div>
        <span style={{ fontSize: 10, color: theme.text4 }}>단위: {unit}</span>
      </div>
    </div>
  );
}

// ── 메인 탭 ──────────────────────────────────────────────────

export default function TimelineTab() {
  const { theme } = useTheme();
  const [children, setChildren]     = useState<Child[]>([]);
  const [records, setRecords]       = useState<HealthRecord[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [modalTarget, setModalTarget] = useState<HealthRecord | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<HealthRecord | null>(null);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  useEffect(() => {
    const kids = loadChildren();
    setChildren(kids);
    if (kids.length > 0) setSelectedChildId(kids[0].id);
    setRecords(loadHealthRecords());
    setCaregivers(loadCaregivers());
  }, []);

  const caregiverMap: Record<string, Caregiver> = Object.fromEntries(caregivers.map((c) => [c.id, c]));

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const childRecords = records
    .filter((r) => r.childId === selectedChildId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleSave = (data: Omit<HealthRecord, "id" | "childId" | "caregiverId">) => {
    if (modalTarget === "new") {
      const updated = [...records, { id: crypto.randomUUID(), childId: selectedChildId, caregiverId: loadActiveCaregiverId() ?? undefined, ...data }];
      saveHealthRecords(updated);
      setRecords(updated);
    } else if (modalTarget) {
      const updated = records.map((r) => r.id === modalTarget.id ? { ...modalTarget, ...data } : r);
      saveHealthRecords(updated);
      setRecords(updated);
    }
    setModalTarget(null);
  };

  const handleDelete = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    saveHealthRecords(updated);
    setRecords(updated);
    setDeleteTarget(null);
  };

  if (children.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: theme.bg }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24 }}>
          <span style={{ fontSize: 40 }}>👶</span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.text2 }}>등록된 아이가 없습니다</p>
          <p style={{ margin: 0, fontSize: 13, color: theme.text4, textAlign: "center" }}>설정 탭에서 아이를 먼저 등록해주세요</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: theme.bg }}>

      {/* 아이 선택 탭 */}
      {children.length > 1 && (
        <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", background: theme.segBg, borderRadius: 10, padding: 3 }}>
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                style={{
                  flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                  background: selectedChildId === c.id ? theme.segActive : "transparent",
                  color: selectedChildId === c.id ? theme.text1 : theme.text4,
                  boxShadow: selectedChildId === c.id ? `0 1px 3px ${theme.shadow}` : "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 아이 요약 + 추가 버튼 */}
      {selectedChild && (
        <div style={{ padding: "12px 16px 0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: selectedChild.gender === "female" ? "#fdf2f8" : "#eff6ff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>
              {selectedChild.gender === "female" ? "👧" : "👦"}
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: theme.text1 }}>{selectedChild.name}</span>
              <div style={{ fontSize: 12, color: theme.text4 }}>{childRecords.length}개 기록</div>
            </div>
          </div>
          <button
            onClick={() => setModalTarget("new")}
            style={{
              background: "#3880ff", border: "none", borderRadius: 10,
              color: "#fff", fontSize: 13, fontWeight: 700,
              padding: "8px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            + 추가
          </button>
        </div>
      )}

      {/* 성장도표 — 고정 */}
      {selectedChild && (
        <div style={{ flexShrink: 0, padding: "12px 16px 0" }}>
          <GrowthChart records={childRecords} child={selectedChild} />
        </div>
      )}

      {/* 기록 리스트 — 스크롤 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px 24px" }}>
          {childRecords.length === 0 ? (
            <div style={{
              background: theme.card, borderRadius: 16, padding: "28px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              boxShadow: `0 1px 4px ${theme.shadow}`,
            }}>
              <span style={{ fontSize: 32 }}>📏</span>
              <p style={{ margin: 0, fontSize: 14, color: theme.text2, fontWeight: 600 }}>아직 기록이 없습니다</p>
              <p style={{ margin: 0, fontSize: 13, color: theme.text4 }}>+ 추가 버튼으로 첫 기록을 남겨보세요</p>
            </div>
          ) : (
            <>
              {childRecords.map((record) =>
                selectedChild ? (
                  <RecordCard
                    key={record.id}
                    record={record}
                    child={selectedChild}
                    caregiverMap={caregiverMap}
                    onEdit={() => setModalTarget(record)}
                    onDelete={() => setDeleteTarget(record)}
                  />
                ) : null
              )}
            </>
          )}
        </div>
      </div>

      {/* 모달 */}
      {modalTarget !== null && (
        <HealthRecordModal
          initial={modalTarget === "new" ? undefined : modalTarget}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          record={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
