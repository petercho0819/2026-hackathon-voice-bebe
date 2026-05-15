"use client";

import { useState, useEffect } from "react";
import {
  loadRecords,
  saveRecord,
  updateRecord,
  deleteRecord,
  VoiceRecord,
  CATEGORY_META,
  Category,
} from "@/lib/records";
import {
  Caregiver,
  loadCaregivers,
  loadActiveCaregiverId,
  caregiverEmoji,
} from "@/lib/caregivers";
import { useTheme } from "@/contexts/ThemeContext";

interface Child {
  id: string;
  name: string;
  nicknames: string[];
  gender: "male" | "female";
  birthDate?: string;
  twinGroupId?: string;
}

function loadChildren(): Child[] {
  try {
    const raw = localStorage.getItem("registered-children");
    return raw ? (JSON.parse(raw) as Child[]) : [];
  } catch {
    return [];
  }
}

const ALL_CATEGORIES: Category[] = [
  "feeding",
  "sleep",
  "diaper",
  "bath",
  "medication",
  "other",
];
const INSTANT_CATS = new Set<Category>(["diaper", "medication"]);

// ── 성장일기 타입 & 스토리지 ──────────────────────────────────

interface DiaryRecord {
  id: string;
  childId: string;
  caregiverId?: string;
  date: string; // YYYY-MM-DD
  content: string;
  emoji: string;
}

function loadDiaryRecords(): DiaryRecord[] {
  try {
    const raw = localStorage.getItem("diary-records");
    return raw ? (JSON.parse(raw) as DiaryRecord[]) : [];
  } catch {
    return [];
  }
}

function saveDiaryRecords(records: DiaryRecord[]) {
  localStorage.setItem("diary-records", JSON.stringify(records));
}

const DIARY_EMOJIS = [
  "🌱",
  "🎉",
  "😊",
  "🚶",
  "💬",
  "🍼",
  "🌟",
  "😴",
  "🎂",
  "💪",
  "🤗",
  "📸",
];

function formatDiaryDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function calcAgeLabel(birthDate: string | undefined, onDate: string): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const target = new Date(onDate + "T00:00:00");
  const months =
    (target.getFullYear() - birth.getFullYear()) * 12 +
    (target.getMonth() - birth.getMonth());
  if (months < 1) return "0개월";
  if (months < 24) return `${months}개월`;
  return `만 ${Math.floor(months / 12)}세`;
}

// ── 성장일기 입력 모달 ────────────────────────────────────────

function DiaryEntryModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: DiaryRecord;
  onSave: (data: Pick<DiaryRecord, "date" | "content" | "emoji">) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [date, setDate] = useState(
    initial?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [content, setContent] = useState(initial?.content ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🌱");

  const canSubmit = date && content.trim();

  const diaryField: React.CSSProperties = {
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: theme.bg,
    color: theme.text2,
  };
  const diaryLabel: React.CSSProperties = {
    fontSize: 12,
    color: theme.text3,
    fontWeight: 600,
    display: "block",
    marginBottom: 6,
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: theme.overlayBg,
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.card,
          borderRadius: "20px 20px 0 0",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          maxHeight: "88dvh",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0 4px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: theme.border,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 20px 12px",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.text1 }}>
            {initial ? "일기 수정" : "일기 쓰기"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              color: theme.text4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            padding: "0 20px 40px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* 날짜 */}
          <div>
            <label style={diaryLabel}>날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              style={diaryField}
            />
          </div>

          {/* 이모지 */}
          <div>
            <label style={diaryLabel}>오늘의 순간</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DIARY_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    fontSize: 22,
                    cursor: "pointer",
                    border:
                      emoji === e
                        ? "2px solid #3880ff"
                        : `1.5px solid ${theme.border}`,
                    background: emoji === e ? "#eff6ff" : theme.card,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.12s",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label style={diaryLabel}>내용 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="오늘 있었던 일을 기록해보세요"
              style={{
                ...diaryField,
                lineHeight: 1.7,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "13px 0",
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                fontSize: 15,
                cursor: "pointer",
                color: theme.text2,
              }}
            >
              취소
            </button>
            <button
              onClick={() =>
                canSubmit && onSave({ date, content: content.trim(), emoji })
              }
              disabled={!canSubmit}
              style={{
                flex: 2,
                padding: "13px 0",
                borderRadius: 10,
                border: "none",
                background: canSubmit ? "#3880ff" : "#d1d5db",
                fontSize: 15,
                fontWeight: 700,
                cursor: canSubmit ? "pointer" : "default",
                color: "#fff",
              }}
            >
              {initial ? "저장하기" : "기록하기"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 성장일기 뷰 ───────────────────────────────────────────────

function DiaryView({
  childId,
  childBirthDate,
  caregiverMap,
}: {
  childId: string;
  childBirthDate?: string;
  caregiverMap: Record<string, Caregiver>;
}) {
  const { theme } = useTheme();
  const [records, setRecords] = useState<DiaryRecord[]>([]);
  const [modalTarget, setModalTarget] = useState<DiaryRecord | null | "new">(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<DiaryRecord | null>(null);

  useEffect(() => {
    setRecords(loadDiaryRecords());
  }, [childId]);

  const childRecords = records
    .filter((r) => r.childId === childId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleSave = (
    data: Pick<DiaryRecord, "date" | "content" | "emoji">,
  ) => {
    if (modalTarget === "new") {
      const next = [
        ...records,
        {
          id: crypto.randomUUID(),
          childId,
          caregiverId: loadActiveCaregiverId() ?? undefined,
          ...data,
        },
      ];
      saveDiaryRecords(next);
      setRecords(next);
    } else if (modalTarget) {
      const next = records.map((r) =>
        r.id === modalTarget.id ? { ...modalTarget, ...data } : r,
      );
      saveDiaryRecords(next);
      setRecords(next);
    }
    setModalTarget(null);
  };

  const handleDelete = (id: string) => {
    const next = records.filter((r) => r.id !== id);
    saveDiaryRecords(next);
    setRecords(next);
    setDeleteTarget(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 추가 버튼 */}
      <button
        onClick={() => setModalTarget("new")}
        style={{
          width: "100%",
          padding: "13px 0",
          borderRadius: 14,
          border: `2px dashed ${theme.border}`,
          background: theme.card,
          fontSize: 14,
          fontWeight: 600,
          color: theme.text3,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 18 }}>✏️</span> 오늘의 일기 쓰기
      </button>

      {/* 일기 목록 */}
      {childRecords.length === 0 ? (
        <div
          style={{
            background: theme.card,
            borderRadius: 16,
            padding: "40px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            boxShadow: `0 1px 4px ${theme.shadow}`,
          }}
        >
          <span style={{ fontSize: 40 }}>📖</span>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: theme.text2,
            }}
          >
            아직 일기가 없습니다
          </p>
          <p style={{ margin: 0, fontSize: 13, color: theme.text4 }}>
            소중한 순간을 기록해보세요
          </p>
        </div>
      ) : (
        childRecords.map((r) => {
          const ageLabel = calcAgeLabel(childBirthDate, r.date);
          return (
            <div
              key={r.id}
              style={{
                background: theme.card,
                borderRadius: 16,
                boxShadow: `0 1px 6px ${theme.shadow}`,
                overflow: "hidden",
              }}
            >
              {/* 헤더 */}
              <div
                style={{
                  background: theme.cardAlt,
                  padding: "10px 16px",
                  borderBottom: `1px solid ${theme.borderLight}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{r.emoji}</span>
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: theme.text1,
                      }}
                    >
                      {formatDiaryDate(r.date)}
                    </span>
                    {ageLabel && (
                      <span
                        style={{
                          fontSize: 12,
                          color: theme.text4,
                          marginLeft: 6,
                        }}
                      >
                        {ageLabel}
                      </span>
                    )}
                    {r.caregiverId && caregiverMap[r.caregiverId] && (
                      <span
                        style={{
                          fontSize: 10,
                          color: theme.text4,
                          background: theme.subtleBg,
                          padding: "1px 6px",
                          borderRadius: 6,
                          marginLeft: 6,
                        }}
                      >
                        {caregiverEmoji(caregiverMap[r.caregiverId].role)}{" "}
                        {caregiverMap[r.caregiverId].name} (
                        {caregiverMap[r.caregiverId].role})
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    onClick={() => setModalTarget(r)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#3880ff",
                      fontSize: 13,
                      padding: "2px 8px",
                    }}
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontSize: 13,
                      padding: "2px 8px",
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
              {/* 본문 */}
              <div style={{ padding: "14px 16px" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: theme.text2,
                    lineHeight: 1.75,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {r.content}
                </p>
              </div>
            </div>
          );
        })
      )}

      {/* 입력/수정 모달 */}
      {modalTarget !== null && (
        <DiaryEntryModal
          initial={modalTarget === "new" ? undefined : modalTarget}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <>
          <div
            onClick={() => setDeleteTarget(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: theme.overlayBg,
              zIndex: 200,
            }}
          />
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: theme.card,
              borderRadius: 20,
              zIndex: 201,
              width: "calc(100% - 48px)",
              maxWidth: 320,
              padding: "28px 20px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              🗑️
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 16,
                  fontWeight: 700,
                  color: theme.text1,
                }}
              >
                일기를 삭제할까요?
              </p>
              <p style={{ margin: 0, fontSize: 13, color: theme.text3 }}>
                {formatDiaryDate(deleteTarget.date)}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: theme.text4 }}>
              삭제한 일기는 복구할 수 없습니다
            </p>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: theme.card,
                  fontSize: 15,
                  cursor: "pointer",
                  color: theme.text2,
                  fontWeight: 600,
                }}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "#ef4444",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── 수동 입력 모달 ───────────────────────────────────────────

function AddRecordModal({
  date,
  children,
  defaultChildId,
  onSave,
  onClose,
}: {
  date: Date;
  children: Child[];
  defaultChildId: string;
  onSave: () => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const nowStr = toHHMM(new Date().toISOString());
  const [category, setCategory] = useState<Category>("other");
  const [startTime, setStartTime] = useState(nowStr);
  const [endTime, setEndTime] = useState(nowStr);
  const [childId, setChildId] = useState(defaultChildId);
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);

  const isInstant = INSTANT_CATS.has(category);

  const handleSave = () => {
    const ts = hhmmToISO(startTime, date);
    saveRecord({
      id: crypto.randomUUID(),
      childId: childId || null,
      timestamp: ts,
      endTime: isInstant ? plusOneMinute(ts) : hhmmToISO(endTime, date),
      transcript: memo,
      category,
    });
    setSaved(true);
    setTimeout(() => {
      onSave();
      onClose();
    }, 900);
  };

  const dtField: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 10,
    padding: "9px 10px",
    fontSize: 13,
    outline: "none",
    background: theme.bg,
    color: theme.text2,
  };
  const dtLabel: React.CSSProperties = {
    fontSize: 12,
    color: theme.text3,
    fontWeight: 600,
    display: "block",
    marginBottom: 4,
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: theme.overlayBg,
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.card,
          borderRadius: "20px 20px 0 0",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          maxHeight: "88dvh",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0 4px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: theme.border,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 20px 12px",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.text1 }}>
            기록 추가
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              color: theme.text4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            padding: "0 20px 40px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* 카테고리 */}
          <div>
            <span style={{ fontSize: 12, color: theme.text3, fontWeight: 600 }}>
              카테고리
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginTop: 8,
              }}
            >
              {ALL_CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const isSel = cat === category;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    style={{
                      padding: "12px 4px",
                      borderRadius: 12,
                      cursor: "pointer",
                      border: isSel
                        ? `2px solid ${meta.color}`
                        : `1.5px solid ${theme.border}`,
                      background: isSel ? meta.bg : theme.card,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{meta.emoji}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: isSel ? 700 : 500,
                        color: isSel ? meta.color : theme.text2,
                      }}
                    >
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
              <label style={dtLabel}>시간</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={dtField}
              />
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={dtLabel}>시작 시간</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={dtField}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={dtLabel}>종료 시간</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={dtField}
                />
              </div>
            </div>
          )}

          {/* 메모 */}
          <div>
            <label style={dtLabel}>메모 (선택사항)</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="기록할 내용을 입력하세요"
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                color: theme.text2,
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                background: theme.bg,
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* 아이 선택 */}
          {children.length > 0 && (
            <div>
              <label style={dtLabel}>아이</label>
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${theme.inputBorder}`,
                  fontSize: 13,
                  color: theme.text2,
                  background: theme.inputBg,
                  outline: "none",
                }}
              >
                <option value="">선택 안함</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.nicknames.length > 0 ? ` (${c.nicknames[0]})` : ""}
                    {c.twinGroupId ? " · 쌍둥이" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saved}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 12,
              border: "none",
              background: saved ? "#16a34a" : "#3880ff",
              fontSize: 15,
              fontWeight: 700,
              cursor: saved ? "default" : "pointer",
              color: "#fff",
              transition: "background 0.2s",
            }}
          >
            {saved ? "저장 완료 ✓" : "기록 저장"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── 수정 모달 ─────────────────────────────────────────────────

function toHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function hhmmToISO(hhmm: string, base?: Date): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = base ? new Date(base) : new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function plusOneMinute(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + 1);
  return d.toISOString();
}

function RecordEditModal({
  record,
  onSave,
  onClose,
}: {
  record: VoiceRecord;
  onSave: (
    data: Pick<
      VoiceRecord,
      "transcript" | "category" | "timestamp" | "endTime"
    >,
  ) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [transcript, setTranscript] = useState(record.transcript);
  const [category, setCategory] = useState<Category>(record.category);
  const [startTime, setStartTime] = useState(toHHMM(record.timestamp));
  const [endTime, setEndTime] = useState(
    toHHMM(record.endTime ?? record.timestamp),
  );

  const isInstant = INSTANT_CATS.has(category);

  const dtField: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 10,
    padding: "9px 10px",
    fontSize: 13,
    outline: "none",
    background: theme.bg,
    color: theme.text2,
  };
  const dtLabel: React.CSSProperties = {
    fontSize: 12,
    color: theme.text3,
    fontWeight: 600,
    display: "block",
    marginBottom: 4,
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: theme.overlayBg,
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.card,
          borderRadius: "20px 20px 0 0",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          maxHeight: "80dvh",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0 4px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: theme.border,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 20px 12px",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.text1 }}>
            기록 수정
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              color: theme.text4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            padding: "0 20px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* 시간 */}
          {isInstant ? (
            <div>
              <label style={dtLabel}>시간</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={dtField}
              />
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={dtLabel}>시작 시간</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={dtField}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={dtLabel}>종료 시간</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={dtField}
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: theme.text3, fontWeight: 600 }}>
              내용
            </span>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                color: theme.text2,
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                background: theme.bg,
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 12, color: theme.text3, fontWeight: 600 }}>
              카테고리
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ALL_CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const isSel = cat === category;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 12px",
                      borderRadius: 20,
                      cursor: "pointer",
                      border: isSel
                        ? `2px solid ${meta.color}`
                        : `1.5px solid ${theme.border}`,
                      background: isSel ? meta.bg : theme.card,
                      color: isSel ? meta.color : theme.text3,
                      fontSize: 12,
                      fontWeight: isSel ? 700 : 500,
                    }}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "13px 0",
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                fontSize: 15,
                cursor: "pointer",
                color: theme.text2,
              }}
            >
              취소
            </button>
            <button
              onClick={() => {
                const ts = startTime ? hhmmToISO(startTime) : record.timestamp;
                onSave({
                  transcript,
                  category,
                  timestamp: ts,
                  endTime: isInstant
                    ? plusOneMinute(ts)
                    : endTime
                      ? hhmmToISO(endTime)
                      : record.endTime,
                });
              }}
              style={{
                flex: 2,
                padding: "13px 0",
                borderRadius: 10,
                border: "none",
                background: "#3880ff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                color: "#fff",
              }}
            >
              저장하기
            </button>
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
  const { theme } = useTheme();
  const meta = CATEGORY_META[record.category];
  const t = new Date(record.timestamp);
  const time = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: theme.overlayBg,
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: theme.card,
          borderRadius: 20,
          zIndex: 201,
          width: "calc(100% - 48px)",
          maxWidth: 320,
          padding: "28px 20px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
          }}
        >
          🗑️
        </div>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 16,
              fontWeight: 700,
              color: theme.text1,
            }}
          >
            기록을 삭제할까요?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: theme.text3 }}>
            {time} ·{" "}
            <span style={{ color: meta.color, fontWeight: 600 }}>
              {meta.label}
            </span>
          </p>
          {record.transcript && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 12,
                color: theme.text4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 240,
              }}
            >
              {record.transcript.length > 40
                ? record.transcript.slice(0, 40) + "…"
                : record.transcript}
            </p>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: theme.text4 }}>
          삭제한 기록은 복구할 수 없습니다
        </p>
        <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: theme.card,
              fontSize: 15,
              cursor: "pointer",
              color: theme.text2,
              fontWeight: 600,
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 10,
              border: "none",
              background: "#ef4444",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              color: "#fff",
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </>
  );
}

// ── 날짜 유틸 ────────────────────────────────────────────────

function sameDay(iso: string, date: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

function getWeekDates(today: Date, offset = 0): Date[] {
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7) + offset * 7);
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

function arcPath(
  cx: number,
  cy: number,
  rO: number,
  rI: number,
  a1: number,
  a2: number,
) {
  const p1 = polar(cx, cy, rO, a1);
  const p2 = polar(cx, cy, rO, a2);
  const p3 = polar(cx, cy, rI, a2);
  const p4 = polar(cx, cy, rI, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${p1.x},${p1.y}A${rO},${rO},0,${large},1,${p2.x},${p2.y}L${p3.x},${p3.y}A${rI},${rI},0,${large},0,${p4.x},${p4.y}Z`;
}

// ── 일과표 (도넛 차트) ───────────────────────────────────────

const CHART_CATS: Category[] = [
  "feeding",
  "sleep",
  "diaper",
  "bath",
  "medication",
  "other",
];

function calcAgeWeeksAndDays(
  birthDate: string | undefined,
  onDate: Date,
): { weeks: number; days: number; total: number } | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate + "T00:00:00");
  const totalDays = Math.floor(
    (onDate.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (totalDays < 0) return null;
  return {
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    total: totalDays,
  };
}

function DailyView({
  records,
  date,
  childBirthDate,
  caregiverMap,
  onEdit,
  onDelete,
}: {
  records: VoiceRecord[];
  date: Date;
  childBirthDate?: string;
  caregiverMap: Record<string, Caregiver>;
  onEdit: (r: VoiceRecord) => void;
  onDelete: (r: VoiceRecord) => void;
}) {
  const { theme } = useTheme();
  const dayRecords = records
    .filter((r) => sameDay(r.timestamp, date))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  // hour → first category
  const hourMap: Record<number, Category> = {};
  for (const r of dayRecords) {
    const h = new Date(r.timestamp).getHours();
    if (!(h in hourMap)) hourMap[h] = r.category;
  }

  const CX = 110,
    CY = 110,
    RO = 86,
    RI = 56,
    SIZE = 220;
  const hourLabels = [
    { h: 0, label: "0" },
    { h: 6, label: "6" },
    { h: 12, label: "12" },
    { h: 18, label: "18" },
  ];
  const ageInfo = calcAgeWeeksAndDays(childBirthDate, date);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 상단 고정 영역 */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "16px 16px 0",
        }}
      >
        {/* 도넛 차트 */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* 배경 링 */}
            <circle
              cx={CX}
              cy={CY}
              r={(RO + RI) / 2}
              fill="none"
              stroke={theme.borderLight}
              strokeWidth={RO - RI}
            />

            {/* 활동 세그먼트 */}
            {Array.from({ length: 24 }, (_, h) => {
              const cat = hourMap[h];
              if (!cat) return null;
              const a1 = (h / 24) * 360;
              const a2 = ((h + 1) / 24) * 360 - 0.5;
              return (
                <path
                  key={h}
                  d={arcPath(CX, CY, RO, RI, a1, a2)}
                  fill={CATEGORY_META[cat].color}
                  opacity={0.85}
                />
              );
            })}

            {/* 시간 눈금 */}
            {Array.from({ length: 24 }, (_, h) => {
              const angle = (h / 24) * 360;
              const isMajor = h % 6 === 0;
              const p1 = polar(CX, CY, RO + 3, angle);
              const p2 = polar(CX, CY, RO + (isMajor ? 9 : 5), angle);
              return (
                <line
                  key={h}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={theme.border}
                  strokeWidth={isMajor ? 2 : 1}
                />
              );
            })}

            {/* 시간 레이블 */}
            {hourLabels.map(({ h, label }) => {
              const p = polar(CX, CY, RO + 18, (h / 24) * 360);
              return (
                <text
                  key={h}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill={theme.text4}
                >
                  {label}
                </text>
              );
            })}

            {/* 중앙 텍스트 */}
            <text
              x={CX}
              y={CY - 12}
              textAnchor="middle"
              fontSize={15}
              fontWeight={800}
              fill={theme.text1}
            >
              {`${date.getMonth() + 1}월 ${date.getDate()}일`}
            </text>
            <text
              x={CX}
              y={CY + 8}
              textAnchor="middle"
              fontSize={12}
              fill={theme.text3}
            >
              {["일", "월", "화", "수", "목", "금", "토"][date.getDay()]}요일
            </text>
            {ageInfo ? (
              <>
                <text
                  x={CX}
                  y={CY + 24}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={theme.text2}
                >
                  {ageInfo.weeks}주 {ageInfo.days}일
                </text>
                <text
                  x={CX}
                  y={CY + 38}
                  textAnchor="middle"
                  fontSize={10}
                  fill={theme.text4}
                >
                  D+{ageInfo.total}일
                </text>
              </>
            ) : (
              <text
                x={CX}
                y={CY + 26}
                textAnchor="middle"
                fontSize={11}
                fill={theme.text4}
              >
                {dayRecords.length}건 기록
              </text>
            )}
          </svg>
        </div>

        {/* 범례 */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {CHART_CATS.map((cat) => (
            <div
              key={cat}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: CATEGORY_META[cat].color,
                }}
              />
              <span style={{ fontSize: 11, color: theme.text3 }}>
                {CATEGORY_META[cat].label}
              </span>
            </div>
          ))}
        </div>

        {/* 요약 카드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          {(["feeding", "sleep", "diaper"] as Category[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const count = dayRecords.filter((r) => r.category === cat).length;
            return (
              <div
                key={cat}
                style={{
                  background: theme.card,
                  borderRadius: 14,
                  padding: "12px 8px",
                  boxShadow: `0 1px 4px ${theme.shadow}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 22 }}>{meta.emoji}</span>
                <span
                  style={{ fontSize: 11, color: theme.text3, fontWeight: 600 }}
                >
                  {meta.label}
                </span>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: count > 0 ? meta.color : theme.text5,
                  }}
                >
                  {count}
                </span>
                <span style={{ fontSize: 10, color: theme.text4 }}>회</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* /상단 고정 영역 */}

      {/* 기록 리스트 (스크롤) */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 24px",
          minHeight: 0,
        }}
      >
        {dayRecords.length === 0 ? (
          <div
            style={{
              background: theme.card,
              borderRadius: 16,
              padding: "32px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 1px 4px ${theme.shadow}`,
            }}
          >
            <span style={{ fontSize: 36 }}>🌙</span>
            <p style={{ margin: 0, fontSize: 14, color: theme.text4 }}>
              이 날 기록이 없습니다
            </p>
            <p style={{ margin: 0, fontSize: 12, color: theme.text5 }}>
              녹음 탭에서 첫 기록을 추가해보세요
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                color: theme.text4,
              }}
            >
              기록
            </p>
            {dayRecords.map((r) => {
              const meta = CATEGORY_META[r.category];
              const fmt = (iso: string) => {
                const d = new Date(iso);
                return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
              };
              const startStr = fmt(r.timestamp);
              const endStr = fmt(r.endTime ?? r.timestamp);
              const timeRange = INSTANT_CATS.has(r.category)
                ? startStr
                : startStr === endStr
                  ? startStr
                  : `${startStr} ~ ${endStr}`;
              return (
                <div
                  key={r.id}
                  style={{
                    background: theme.card,
                    borderRadius: 12,
                    padding: "10px 14px",
                    boxShadow: `0 1px 4px ${theme.shadow}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: meta.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 17,
                      flexShrink: 0,
                    }}
                  >
                    {meta.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        marginBottom: 2,
                      }}
                    >
                      <span style={{ fontSize: 11, color: theme.text4 }}>
                        {timeRange}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: meta.color,
                          background: meta.bg,
                          padding: "1px 6px",
                          borderRadius: 6,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {r.transcript && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: theme.text2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.transcript.length > 45
                          ? r.transcript.slice(0, 45) + "…"
                          : r.transcript}
                      </p>
                    )}
                    {r.caregiverId && caregiverMap[r.caregiverId] && (
                      <span
                        style={{
                          fontSize: 10,
                          color: theme.text4,
                          background: theme.subtleBg,
                          padding: "1px 6px",
                          borderRadius: 6,
                          display: "inline-block",
                          marginTop: 2,
                        }}
                      >
                        {caregiverEmoji(caregiverMap[r.caregiverId].role)}{" "}
                        {caregiverMap[r.caregiverId].name} (
                        {caregiverMap[r.caregiverId].role})
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexShrink: 0 }}>
                    <button
                      onClick={() => onEdit(r)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#3880ff",
                        fontSize: 12,
                        padding: "4px 6px",
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(r)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#ef4444",
                        fontSize: 12,
                        padding: "4px 6px",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 주간 패턴 (그리드) ───────────────────────────────────────

const DAY_SHORT = ["월", "화", "수", "목", "금", "토", "일"];
const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21];
const CELL_H = 13;

function WeeklyView({ records }: { records: VoiceRecord[] }) {
  const { theme } = useTheme();
  const [offset, setOffset] = useState(0);
  const today = new Date();
  const weekDates = getWeekDates(today, offset);

  // [dayIndex][hour] = Category | null
  const grid: (Category | null)[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(null),
  );
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => setOffset((o) => o - 1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            color: theme.text3,
            padding: "0 8px",
            lineHeight: 1,
          }}
        >
          ‹
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text2 }}>
          {label}
        </span>
        <button
          onClick={() => setOffset((o) => o + 1)}
          disabled={offset >= 0}
          style={{
            background: "none",
            border: "none",
            fontSize: 20,
            padding: "0 8px",
            lineHeight: 1,
            color: offset >= 0 ? theme.text5 : theme.text3,
            cursor: offset >= 0 ? "default" : "pointer",
          }}
        >
          ›
        </button>
      </div>

      <div
        style={{
          background: theme.card,
          borderRadius: 16,
          padding: "14px 12px",
          boxShadow: `0 1px 4px ${theme.shadow}`,
        }}
      >
        <div style={{ display: "flex", gap: 3 }}>
          {/* 시간 레이블 열 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 22,
              flexShrink: 0,
            }}
          >
            <div style={{ height: 32 }} />
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                style={{
                  height: CELL_H,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 3,
                }}
              >
                {HOUR_LABELS.includes(h) && (
                  <span
                    style={{ fontSize: 8, color: theme.text4, lineHeight: 1 }}
                  >
                    {String(h).padStart(2, "0")}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 요일 열 */}
          {weekDates.map((date, di) => {
            const isToday = date.toDateString() === today.toDateString();
            return (
              <div
                key={di}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {/* 요일 헤더 */}
                <div
                  style={{
                    height: 32,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  <span
                    style={{ fontSize: 9, color: theme.text4, lineHeight: 1 }}
                  >
                    {DAY_SHORT[di]}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: isToday ? "#fff" : theme.text2,
                      background: isToday ? "#3880ff" : "transparent",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {date.getDate()}
                  </span>
                </div>

                {/* 시간 셀 */}
                {Array.from({ length: 24 }, (_, h) => {
                  const cat = grid[di][h];
                  return (
                    <div
                      key={h}
                      style={{
                        height: CELL_H,
                        borderRadius: 2,
                        background: cat
                          ? CATEGORY_META[cat].color
                          : theme.subtleBg,
                        opacity: cat ? 0.82 : 1,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {CHART_CATS.map((cat) => (
          <div
            key={cat}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: CATEGORY_META[cat].color,
              }}
            />
            <span style={{ fontSize: 11, color: theme.text3 }}>
              {CATEGORY_META[cat].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 메인 탭 ──────────────────────────────────────────────────

function getDayOffset(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayLabel(offset: number): string {
  if (offset === -1) return "어제";
  if (offset === 0) return "오늘";
  if (offset === 1) return "내일";
  const d = getDayOffset(offset);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function StatusTab() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<"daily" | "weekly" | "diary">("daily");
  const [dayOffset, setDayOffset] = useState(0);
  const [records, setRecords] = useState<VoiceRecord[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [editTarget, setEditTarget] = useState<VoiceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VoiceRecord | null>(null);
  const [addingRecord, setAddingRecord] = useState(false);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  useEffect(() => {
    setRecords(loadRecords());
    const kids = loadChildren();
    setChildren(kids);
    if (kids.length > 0) setSelectedChildId(kids[0].id);
    setCaregivers(loadCaregivers());
  }, []);

  const filteredRecords = selectedChildId
    ? records.filter((r) => r.childId === selectedChildId)
    : records;

  const handleEditSave = (
    data: Pick<
      VoiceRecord,
      "transcript" | "category" | "timestamp" | "endTime"
    >,
  ) => {
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

  const selectedDate = getDayOffset(dayOffset);
  const caregiverMap: Record<string, Caregiver> = Object.fromEntries(
    caregivers.map((c) => [c.id, c]),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 세그먼트 컨트롤 */}
      <div
        style={{ padding: "12px 16px 0", flexShrink: 0, background: theme.bg }}
      >
        <div
          style={{
            display: "flex",
            background: theme.segBg,
            borderRadius: 10,
            padding: 3,
          }}
        >
          {[["daily", "일별"] as const, ["weekly", "이번 주"] as const].map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.15s",
                  background: tab === key ? theme.segActive : "transparent",
                  color: tab === key ? theme.text1 : theme.text4,
                  boxShadow: tab === key ? `0 1px 3px ${theme.shadow}` : "none",
                }}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* 날짜 네비게이션 (일별 탭에서만) */}
      {tab === "daily" && (
        <div
          style={{
            padding: "10px 16px 0",
            flexShrink: 0,
            background: theme.bg,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: theme.card,
                borderRadius: 12,
                padding: "6px 4px",
                boxShadow: `0 1px 3px ${theme.shadow}`,
              }}
            >
              <button
                onClick={() => setDayOffset((o) => o - 1)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 22,
                  color: theme.text3,
                  padding: "0 12px",
                  lineHeight: 1,
                }}
              >
                ‹
              </button>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <span
                  style={{ fontSize: 14, fontWeight: 700, color: theme.text1 }}
                >
                  {dayLabel(dayOffset)}
                </span>
                <span style={{ fontSize: 11, color: theme.text4 }}>
                  {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 (
                  {
                    ["일", "월", "화", "수", "목", "금", "토"][
                      selectedDate.getDay()
                    ]
                  }
                  )
                </span>
              </div>
              <button
                onClick={() => setDayOffset((o) => o + 1)}
                disabled={dayOffset >= 1}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 22,
                  padding: "0 12px",
                  lineHeight: 1,
                  color: dayOffset >= 1 ? theme.text5 : theme.text3,
                  cursor: dayOffset >= 1 ? "default" : "pointer",
                }}
              >
                ›
              </button>
            </div>
            <button
              onClick={() => setAddingRecord(true)}
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: 12,
                border: "none",
                background: "#3880ff",
                color: "#fff",
                fontSize: 22,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: `0 1px 3px ${theme.shadow}`,
              }}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* 아이 선택 */}
      {children.length > 0 && (
        <div
          style={{
            padding: "10px 16px 0",
            flexShrink: 0,
            background: theme.bg,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 2,
            }}
          >
            {children.map((c) => {
              const isSel = selectedChildId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  style={{
                    flexShrink: 0,
                    padding: "5px 14px",
                    borderRadius: 20,
                    border: isSel ? "none" : `1.5px solid ${theme.border}`,
                    background: isSel ? "#3880ff" : theme.card,
                    color: isSel ? "#fff" : theme.text3,
                    fontSize: 13,
                    fontWeight: isSel ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {c.name}
                  {c.twinGroupId && (
                    <span
                      style={{ marginLeft: 4, fontSize: 11, opacity: 0.85 }}
                    >
                      (쌍둥이)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: theme.bg,
        }}
      >
        {tab === "daily" ? (
          <DailyView
            records={filteredRecords}
            date={selectedDate}
            childBirthDate={
              children.find((c) => c.id === selectedChildId)?.birthDate
            }
            caregiverMap={caregiverMap}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        ) : tab === "weekly" ? (
          <div
            style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}
          >
            <WeeklyView records={filteredRecords} />
          </div>
        ) : (
          <div
            style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}
          >
            <DiaryView
              childId={selectedChildId}
              childBirthDate={
                children.find((c) => c.id === selectedChildId)?.birthDate
              }
              caregiverMap={caregiverMap}
            />
          </div>
        )}
      </div>

      {addingRecord && (
        <AddRecordModal
          date={selectedDate}
          children={children}
          defaultChildId={selectedChildId}
          onSave={() => setRecords(loadRecords())}
          onClose={() => setAddingRecord(false)}
        />
      )}
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
