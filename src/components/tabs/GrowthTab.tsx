"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Caregiver, loadCaregivers, loadActiveCaregiverId, caregiverEmoji } from "@/lib/caregivers";

// ── 타입 ─────────────────────────────────────────────────────

interface Child {
  id: string;
  name: string;
  nicknames: string[];
  gender: "male" | "female";
  birthDate?: string;
  twinGroupId?: string;
}

interface DiaryRecord {
  id: string;
  childId: string;
  caregiverId?: string;
  date: string;
  content: string;
  emoji: string;
}

interface PhotoRecord {
  id: string;
  childId: string;
  date: string;     // YYYY-MM-DD
  dataUrl: string;  // base64 compressed
  caption: string;
}

// ── 스토리지 ──────────────────────────────────────────────────

function loadChildren(): Child[] {
  try {
    const raw = localStorage.getItem("registered-children");
    return raw ? (JSON.parse(raw) as Child[]) : [];
  } catch { return []; }
}

function loadDiary(): DiaryRecord[] {
  try {
    const raw = localStorage.getItem("diary-records");
    return raw ? (JSON.parse(raw) as DiaryRecord[]) : [];
  } catch { return []; }
}
function saveDiary(r: DiaryRecord[]) { localStorage.setItem("diary-records", JSON.stringify(r)); }

function loadPhotos(): PhotoRecord[] {
  try {
    const raw = localStorage.getItem("photo-records");
    return raw ? (JSON.parse(raw) as PhotoRecord[]) : [];
  } catch { return []; }
}
function savePhotos(r: PhotoRecord[]) { localStorage.setItem("photo-records", JSON.stringify(r)); }

// ── 유틸 ─────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function ageLabel(birthDate: string | undefined, onDate: string): string {
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

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 900;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── 공통 스타일 ───────────────────────────────────────────────
// FIELD and LABEL are computed per-component to support theming

// ── 성장일기 ─────────────────────────────────────────────────

const DIARY_EMOJIS = ["🌱", "🎉", "😊", "🚶", "💬", "🍼", "🌟", "😴", "🎂", "💪", "🤗", "📸"];

function DiaryEntryModal({
  initial, onSave, onClose,
}: {
  initial?: DiaryRecord;
  onSave: (d: Pick<DiaryRecord, "date" | "content" | "emoji">) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [date, setDate]       = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState(initial?.content ?? "");
  const [emoji, setEmoji]     = useState(initial?.emoji ?? "🌱");
  const ok = date && content.trim();

  const FIELD: React.CSSProperties = {
    border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px",
    fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box",
    background: theme.bg, color: theme.text2,
  };
  const LABEL: React.CSSProperties = {
    fontSize: 12, color: theme.text3, fontWeight: 600, display: "block", marginBottom: 6,
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: theme.overlayBg, zIndex: 200 }} />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        background: theme.card, borderRadius: "20px 20px 0 0",
        zIndex: 201, display: "flex", flexDirection: "column", maxHeight: "88dvh",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 12px" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.text1 }}>{initial ? "일기 수정" : "일기 쓰기"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: theme.text4, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LABEL}>날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)} style={FIELD} />
          </div>
          <div>
            <label style={LABEL}>오늘의 순간</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DIARY_EMOJIS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)} style={{
                  width: 42, height: 42, borderRadius: 10, fontSize: 22, cursor: "pointer",
                  border: emoji === e ? "2px solid #3880ff" : `1.5px solid ${theme.border}`,
                  background: emoji === e ? "#eff6ff" : theme.card,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={LABEL}>내용 *</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5}
              placeholder="오늘 있었던 일을 기록해보세요"
              style={{ ...FIELD, lineHeight: 1.7, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 15, cursor: "pointer", color: theme.text2 }}>취소</button>
            <button onClick={() => ok && onSave({ date, content: content.trim(), emoji })} disabled={!ok}
              style={{ flex: 2, padding: "13px 0", borderRadius: 10, border: "none", background: ok ? "#3880ff" : "#d1d5db", fontSize: 15, fontWeight: 700, cursor: ok ? "pointer" : "default", color: "#fff" }}>
              {initial ? "저장하기" : "기록하기"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DiaryView({ childId, birthDate, caregiverMap }: { childId: string; birthDate?: string; caregiverMap: Record<string, Caregiver> }) {
  const { theme } = useTheme();
  const [all, setAll]                 = useState<DiaryRecord[]>([]);
  const [modal, setModal]             = useState<DiaryRecord | null | "new">(null);
  const [delTarget, setDelTarget]     = useState<DiaryRecord | null>(null);

  useEffect(() => { setAll(loadDiary()); }, [childId]);

  const list = all.filter((r) => r.childId === childId).sort((a, b) => b.date.localeCompare(a.date));

  const save = (data: Pick<DiaryRecord, "date" | "content" | "emoji">) => {
    if (modal === "new") {
      const next = [...all, { id: crypto.randomUUID(), childId, caregiverId: loadActiveCaregiverId() ?? undefined, ...data }];
      saveDiary(next); setAll(next);
    } else if (modal) {
      const next = all.map((r) => r.id === modal.id ? { ...modal, ...data } : r);
      saveDiary(next); setAll(next);
    }
    setModal(null);
  };

  const del = (id: string) => {
    const next = all.filter((r) => r.id !== id);
    saveDiary(next); setAll(next); setDelTarget(null);
  };

  return (
    <>
      {/* 일기 쓰기 버튼 — 상단 고정 (GrowthTab content div의 직접 flex 자식) */}
      <div style={{ flexShrink: 0, paddingBottom: 8 }}>
        <button onClick={() => setModal("new")} style={{
          width: "100%", padding: "13px 0", borderRadius: 14, border: `2px dashed ${theme.border}`,
          background: theme.card, fontSize: 14, fontWeight: 600, color: theme.text3,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <span style={{ fontSize: 18 }}>✏️</span> 오늘의 일기 쓰기
        </button>
      </div>

      {/* 일기 목록 — 스크롤 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 24 }}>
          {list.length === 0 ? (
            <div style={{ background: theme.card, borderRadius: 16, padding: "40px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: `0 1px 4px ${theme.shadow}` }}>
              <span style={{ fontSize: 40 }}>📖</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.text2 }}>아직 일기가 없습니다</p>
              <p style={{ margin: 0, fontSize: 13, color: theme.text4 }}>소중한 순간을 기록해보세요</p>
            </div>
          ) : list.map((r) => (
            <div key={r.id} style={{ background: theme.card, borderRadius: 16, boxShadow: `0 1px 6px ${theme.shadow}`, overflow: "hidden" }}>
              <div style={{ background: theme.cardAlt, padding: "10px 16px", borderBottom: `1px solid ${theme.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{r.emoji}</span>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: theme.text1 }}>{formatDate(r.date)}</span>
                    {ageLabel(birthDate, r.date) && (
                      <span style={{ fontSize: 12, color: theme.text4, marginLeft: 6 }}>{ageLabel(birthDate, r.date)}</span>
                    )}
                    {r.caregiverId && caregiverMap[r.caregiverId] && (
                      <span style={{ fontSize: 10, color: theme.text4, background: theme.subtleBg, padding: "1px 6px", borderRadius: 6, marginLeft: 6 }}>
                        {caregiverEmoji(caregiverMap[r.caregiverId].role)} {caregiverMap[r.caregiverId].name} ({caregiverMap[r.caregiverId].role})
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={() => setModal(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3880ff", fontSize: 13, padding: "2px 8px" }}>수정</button>
                  <button onClick={() => setDelTarget(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13, padding: "2px 8px" }}>삭제</button>
                </div>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ margin: 0, fontSize: 14, color: theme.text2, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal !== null && (
        <DiaryEntryModal initial={modal === "new" ? undefined : modal} onSave={save} onClose={() => setModal(null)} />
      )}
      {delTarget && (
        <>
          <div onClick={() => setDelTarget(null)} style={{ position: "fixed", inset: 0, background: theme.overlayBg, zIndex: 200 }} />
          <div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", background: theme.card, borderRadius: 20, zIndex: 201, width: "calc(100% - 48px)", maxWidth: 320, padding: "28px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🗑️</div>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: theme.text1 }}>일기를 삭제할까요?</p>
              <p style={{ margin: 0, fontSize: 13, color: theme.text3 }}>{formatDate(delTarget.date)}</p>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: theme.text4 }}>삭제한 일기는 복구할 수 없습니다</p>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={() => setDelTarget(null)} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 15, cursor: "pointer", color: theme.text2, fontWeight: 600 }}>취소</button>
              <button onClick={() => del(delTarget.id)} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "none", background: "#ef4444", fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#fff" }}>삭제</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── 사진 앨범 ─────────────────────────────────────────────────

function PhotoView({ childId, birthDate }: { childId: string; birthDate?: string }) {
  const { theme } = useTheme();
  const [all, setAll]             = useState<PhotoRecord[]>([]);
  const [viewer, setViewer]       = useState<PhotoRecord | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [delTarget, setDelTarget] = useState<PhotoRecord | null>(null);
  const [loading, setLoading]     = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const FIELD: React.CSSProperties = {
    border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px",
    fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box",
    background: theme.bg, color: theme.text2,
  };
  const LABEL: React.CSSProperties = {
    fontSize: 12, color: theme.text3, fontWeight: 600, display: "block", marginBottom: 6,
  };

  useEffect(() => { setAll(loadPhotos()); }, [childId]);

  const list = all.filter((r) => r.childId === childId).sort((a, b) => b.date.localeCompare(a.date));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const newPhotos: PhotoRecord[] = await Promise.all(
        files.map(async (f) => ({
          id: crypto.randomUUID(),
          childId,
          date: today,
          dataUrl: await compressImage(f),
          caption: "",
        }))
      );
      const next = [...all, ...newPhotos];
      savePhotos(next);
      setAll(next);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const saveCaption = () => {
    if (!viewer) return;
    const next = all.map((r) => r.id === viewer.id ? { ...r, caption: editCaption } : r);
    savePhotos(next); setAll(next);
    setViewer({ ...viewer, caption: editCaption });
  };

  const del = (id: string) => {
    const next = all.filter((r) => r.id !== id);
    savePhotos(next); setAll(next);
    setDelTarget(null); setViewer(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 추가 버튼 */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileChange} />
      <button onClick={() => fileInputRef.current?.click()} disabled={loading} style={{
        width: "100%", padding: "13px 0", borderRadius: 14, border: `2px dashed ${theme.border}`,
        background: theme.card, fontSize: 14, fontWeight: 600, color: loading ? theme.text4 : theme.text3,
        cursor: loading ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <span style={{ fontSize: 18 }}>📷</span>
        {loading ? "사진 저장 중…" : "사진 추가"}
      </button>

      {list.length === 0 ? (
        <div style={{ background: theme.card, borderRadius: 16, padding: "40px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: `0 1px 4px ${theme.shadow}` }}>
          <span style={{ fontSize: 40 }}>🖼️</span>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.text2 }}>아직 사진이 없습니다</p>
          <p style={{ margin: 0, fontSize: 13, color: theme.text4 }}>소중한 순간을 사진으로 남겨보세요</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {list.map((r) => (
            <button key={r.id} onClick={() => { setViewer(r); setEditCaption(r.caption); }}
              style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "none", cursor: "pointer", padding: 0, background: theme.subtleBg }}>
              <img src={r.dataUrl} alt={r.caption || r.date} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.55))", padding: "16px 8px 8px" }}>
                <p style={{ margin: 0, fontSize: 10, color: "#fff", fontWeight: 600 }}>
                  {new Date(r.date + "T00:00:00").toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                  {ageLabel(birthDate, r.date) && ` · ${ageLabel(birthDate, r.date)}`}
                </p>
                {r.caption && <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.caption}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 사진 뷰어 */}
      {viewer && (
        <>
          <div onClick={() => setViewer(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300 }} />
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 301, background: theme.card, borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column", maxHeight: "92dvh" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 8px" }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: theme.text1 }}>{formatDate(viewer.date)}</span>
                {ageLabel(birthDate, viewer.date) && (
                  <span style={{ fontSize: 12, color: theme.text4, marginLeft: 6 }}>{ageLabel(birthDate, viewer.date)}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setDelTarget(viewer)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13, padding: "4px 8px" }}>삭제</button>
                <button onClick={() => setViewer(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: theme.text4, lineHeight: 1 }}>×</button>
              </div>
            </div>
            <div style={{ overflowY: "auto", padding: "0 0 32px" }}>
              <img src={viewer.dataUrl} alt={viewer.caption} style={{ width: "100%", display: "block", maxHeight: "55dvh", objectFit: "contain", background: theme.subtleBg }} />
              <div style={{ padding: "12px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={LABEL}>메모</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="이 사진에 대한 메모를 남겨보세요"
                    style={{ ...FIELD, flex: 1 }}
                  />
                  <button onClick={saveCaption} style={{ flexShrink: 0, padding: "0 16px", borderRadius: 10, border: "none", background: "#3880ff", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>저장</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 삭제 확인 */}
      {delTarget && (
        <>
          <div onClick={() => setDelTarget(null)} style={{ position: "fixed", inset: 0, background: theme.overlayBg, zIndex: 400 }} />
          <div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", background: theme.card, borderRadius: 20, zIndex: 401, width: "calc(100% - 48px)", maxWidth: 320, padding: "28px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🗑️</div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text1 }}>사진을 삭제할까요?</p>
            <p style={{ margin: 0, fontSize: 12, color: theme.text4 }}>삭제한 사진은 복구할 수 없습니다</p>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={() => setDelTarget(null)} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 15, cursor: "pointer", color: theme.text2, fontWeight: 600 }}>취소</button>
              <button onClick={() => del(delTarget.id)} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "none", background: "#ef4444", fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#fff" }}>삭제</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── 메인 탭 ──────────────────────────────────────────────────

export default function GrowthTab() {
  const { theme } = useTheme();
  const [subTab, setSubTab]   = useState<"diary" | "album">("diary");
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  useEffect(() => {
    const kids = loadChildren();
    setChildren(kids);
    if (kids.length > 0) setSelectedChildId(kids[0].id);
    setCaregivers(loadCaregivers());
  }, []);

  const caregiverMap: Record<string, Caregiver> = Object.fromEntries(caregivers.map((c) => [c.id, c]));

  const selectedChild = children.find((c) => c.id === selectedChildId);

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* 서브 탭 */}
      <div style={{ padding: "12px 16px 0", flexShrink: 0, background: theme.bg }}>
        <div style={{ display: "flex", background: theme.segBg, borderRadius: 10, padding: 3 }}>
          {([["diary", "성장일기"] as const, ["album", "사진 앨범"] as const]).map(([key, label]) => (
            <button key={key} onClick={() => setSubTab(key)} style={{
              flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              background: subTab === key ? theme.segActive : "transparent",
              color: subTab === key ? theme.text1 : theme.text4,
              boxShadow: subTab === key ? `0 1px 3px ${theme.shadow}` : "none",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* 아이 선택 */}
      {children.length > 1 && (
        <div style={{ padding: "10px 16px 0", flexShrink: 0, background: theme.bg }}>
          <div style={{ display: "flex", background: theme.segBg, borderRadius: 10, padding: 3 }}>
            {children.map((c) => (
              <button key={c.id} onClick={() => setSelectedChildId(c.id)} style={{
                flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                background: selectedChildId === c.id ? theme.segActive : "transparent",
                color: selectedChildId === c.id ? theme.text1 : theme.text4,
                boxShadow: selectedChildId === c.id ? `0 1px 3px ${theme.shadow}` : "none",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {c.name}
                {c.twinGroupId && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.8 }}>(쌍둥이)</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 아이 요약 헤더 */}
      {selectedChild && (
        <div style={{ padding: "10px 16px 0", flexShrink: 0, background: theme.bg, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: selectedChild.gender === "female" ? "#fdf2f8" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {selectedChild.gender === "female" ? "👧" : "👦"}
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: theme.text1 }}>{selectedChild.name}</span>
          {selectedChild.twinGroupId && (
            <span style={{ fontSize: 11, color: "#8b5cf6", background: "#f5f3ff", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>쌍둥이</span>
          )}
        </div>
      )}

      {/* 콘텐츠 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: theme.bg, padding: "12px 16px 0" }}>
        {subTab === "diary"
          ? <DiaryView childId={selectedChildId} birthDate={selectedChild?.birthDate} caregiverMap={caregiverMap} />
          : (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 24 }}>
              <PhotoView childId={selectedChildId} birthDate={selectedChild?.birthDate} />
            </div>
          )
        }
      </div>
    </div>
  );
}
