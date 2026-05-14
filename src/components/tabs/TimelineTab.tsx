"use client";

import { useState, useEffect } from "react";

// ── 타입 ─────────────────────────────────────────────────────

interface Child {
  id: string;
  name: string;
  nicknames: string[];
  gender: "male" | "female";
  birthDate: string;
}

interface HealthRecord {
  id: string;
  childId: string;
  date: string;    // YYYY-MM-DD
  height: string;  // cm
  weight: string;  // kg
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
    return raw ? (JSON.parse(raw) as HealthRecord[]) : [];
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

// ── 모달 ─────────────────────────────────────────────────────

const FIELD: React.CSSProperties = {
  border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 12px",
  fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box", background: "#fff",
};
const LABEL: React.CSSProperties = {
  fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 4, display: "block",
};

function HealthRecordModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: HealthRecord;
  onSave: (data: Omit<HealthRecord, "id" | "childId">) => void;
  onClose: () => void;
}) {
  const [date, setDate]     = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [height, setHeight] = useState(initial?.height ?? "");
  const [weight, setWeight] = useState(initial?.weight ?? "");

  const canSubmit = date && (height || weight);

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
          <span style={{ fontSize: 17, fontWeight: 700 }}>{initial ? "기록 수정" : "기록 추가"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af", lineHeight: 1 }}>×</button>
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

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "13px 0", borderRadius: 10,
              border: "1px solid #e5e7eb", background: "#fff",
              fontSize: 15, cursor: "pointer", color: "#374151",
            }}>취소</button>
            <button onClick={() => canSubmit && onSave({ date, height, weight })} disabled={!canSubmit} style={{
              flex: 2, padding: "13px 0", borderRadius: 10, border: "none",
              background: canSubmit ? "#3880ff" : "#d1d5db",
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
  onEdit,
  onDelete,
}: {
  record: HealthRecord;
  child: Child;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const age = calcAge(child.birthDate, record.date);

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
      overflow: "hidden",
    }}>
      {/* 날짜 헤더 */}
      <div style={{ background: "#f8fafc", padding: "10px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatDate(record.date)}</span>
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>{age}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#3880ff", fontSize: 13, padding: "2px 8px" }}>수정</button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13, padding: "2px 8px" }}>삭제</button>
        </div>
      </div>

      {/* 수치 */}
      <div style={{ padding: "14px 16px", display: "flex", gap: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>키</span>
          {record.height ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: "#3b82f6" }}>{record.height}</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>cm</span>
            </div>
          ) : (
            <span style={{ fontSize: 20, color: "#d1d5db", fontWeight: 700 }}>—</span>
          )}
        </div>

        <div style={{ width: 1, background: "#f3f4f6", margin: "0 8px" }} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>몸무게</span>
          {record.weight ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: "#f97316" }}>{record.weight}</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>kg</span>
            </div>
          ) : (
            <span style={{ fontSize: 20, color: "#d1d5db", fontWeight: 700 }}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 성장 그래프 ───────────────────────────────────────────────

const CW = 320, CH = 160;
const CP = { top: 20, right: 16, bottom: 32, left: 42 };
const PW = CW - CP.left - CP.right;
const PH = CH - CP.top - CP.bottom;

function GrowthChart({ records }: { records: HealthRecord[] }) {
  const [metric, setMetric] = useState<"height" | "weight">("height");

  const color = metric === "height" ? "#3b82f6" : "#f97316";

  const points = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce<{ date: string; value: number }[]>((acc, r) => {
      const raw = metric === "height" ? r.height : r.weight;
      const v = parseFloat(raw);
      if (raw && !isNaN(v) && v > 0) acc.push({ date: r.date, value: v });
      return acc;
    }, []);

  const hasChart = points.length >= 2;

  const vals = points.map((p) => p.value);
  const minV = hasChart ? Math.min(...vals) : 0;
  const maxV = hasChart ? Math.max(...vals) : 1;
  const spread = maxV - minV || 1;
  const yMin = Math.max(0, minV - spread * 0.2);
  const yMax = maxV + spread * 0.2;
  const yRange = yMax - yMin || 1;

  const toX = (i: number) =>
    CP.left + (points.length <= 1 ? PW / 2 : (i / (points.length - 1)) * PW);
  const toY = (v: number) => CP.top + (1 - (v - yMin) / yRange) * PH;

  const pathD = hasChart
    ? points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ")
    : "";

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    t, v: yMin + t * yRange, y: CP.top + (1 - t) * PH,
  }));

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>성장 그래프</span>
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 8, padding: 2 }}>
          {(["height", "weight"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                background: metric === m ? "#fff" : "transparent",
                color: metric === m ? (m === "height" ? "#3b82f6" : "#f97316") : "#9ca3af",
                boxShadow: metric === m ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {m === "height" ? "키" : "몸무게"}
            </button>
          ))}
        </div>
      </div>

      {!hasChart ? (
        <div style={{ padding: "28px 16px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>
            {points.length === 0
              ? "기록을 추가하면 그래프가 표시됩니다"
              : "2개 이상의 기록이 있으면 그래프가 표시됩니다"}
          </span>
        </div>
      ) : (
        <>
          <svg width="100%" viewBox={`0 0 ${CW} ${CH}`} style={{ display: "block" }}>
            {yTicks.map(({ t, v, y }) => (
              <g key={t}>
                <line x1={CP.left} y1={y} x2={CW - CP.right} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                <text x={CP.left - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#b0b7c3">
                  {v.toFixed(1)}
                </text>
              </g>
            ))}

            <path
              d={`${pathD} L${toX(points.length - 1).toFixed(1)},${(CP.top + PH).toFixed(1)} L${toX(0).toFixed(1)},${(CP.top + PH).toFixed(1)} Z`}
              fill={color} opacity={0.08}
            />

            <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

            {points.map((p, i) => {
              const x = toX(i);
              const y = toY(p.value);
              const showVal = points.length <= 8 || i === 0 || i === points.length - 1;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />
                  {showVal && (
                    <text x={x} y={y - 9} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>
                      {p.value}
                    </text>
                  )}
                </g>
              );
            })}

            {points.map((p, i) => {
              const step = Math.ceil(points.length / 5);
              const show = i === 0 || i === points.length - 1 || i % step === 0;
              if (!show) return null;
              const d = new Date(p.date + "T00:00:00");
              return (
                <text key={i} x={toX(i)} y={CH - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">
                  {`${d.getMonth() + 1}/${d.getDate()}`}
                </text>
              );
            })}
          </svg>

          <div style={{ padding: "0 16px 12px", textAlign: "right" }}>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>단위: {metric === "height" ? "cm" : "kg"}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── 메인 탭 ──────────────────────────────────────────────────

export default function TimelineTab() {
  const [children, setChildren]     = useState<Child[]>([]);
  const [records, setRecords]       = useState<HealthRecord[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [modalTarget, setModalTarget] = useState<HealthRecord | null | "new">(null);

  useEffect(() => {
    const kids = loadChildren();
    setChildren(kids);
    if (kids.length > 0) setSelectedChildId(kids[0].id);
    setRecords(loadHealthRecords());
  }, []);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const childRecords = records
    .filter((r) => r.childId === selectedChildId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleSave = (data: Omit<HealthRecord, "id" | "childId">) => {
    if (modalTarget === "new") {
      const updated = [...records, { id: crypto.randomUUID(), childId: selectedChildId, ...data }];
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
  };

  // 아이 미등록
  if (children.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f9fafb" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24 }}>
          <span style={{ fontSize: 40 }}>👶</span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#374151" }}>등록된 아이가 없습니다</p>
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", textAlign: "center" }}>설정 탭에서 아이를 먼저 등록해주세요</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f9fafb" }}>

      {/* 아이 선택 탭 */}
      {children.length > 1 && (
        <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", background: "#e5e7eb", borderRadius: 10, padding: 3 }}>
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                style={{
                  flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                  background: selectedChildId === c.id ? "#fff" : "transparent",
                  color: selectedChildId === c.id ? "#111827" : "#9ca3af",
                  boxShadow: selectedChildId === c.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
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
              <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{selectedChild.name}</span>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{childRecords.length}개 기록</div>
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

      {/* 기록 리스트 */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {childRecords.length === 0 ? (
          <div style={{
            flex: 1, background: "#fff", borderRadius: 20, padding: "40px 16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <span style={{ fontSize: 36 }}>📏</span>
            <p style={{ margin: 0, fontSize: 14, color: "#374151", fontWeight: 600 }}>아직 기록이 없습니다</p>
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>+ 추가 버튼으로 첫 기록을 남겨보세요</p>
          </div>
        ) : (
          <>
            <GrowthChart records={childRecords} />
            {childRecords.map((record) =>
              selectedChild ? (
                <RecordCard
                  key={record.id}
                  record={record}
                  child={selectedChild}
                  onEdit={() => setModalTarget(record)}
                  onDelete={() => handleDelete(record.id)}
                />
              ) : null
            )}
          </>
        )}
      </div>

      {/* 모달 */}
      {modalTarget !== null && (
        <HealthRecordModal
          initial={modalTarget === "new" ? undefined : modalTarget}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}
