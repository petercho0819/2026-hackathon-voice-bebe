"use client";

import { useState, useEffect } from "react";
import { seedDemoData } from "@/lib/seedData";
import { useTheme } from "@/contexts/ThemeContext";

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

function calcAge(birthDate: string) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const notYet = today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (notYet) age--;
  return age;
}

// ── 공통 UI ──────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <div style={{ padding: "16px 16px 4px", fontSize: 12, color: theme.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </div>
  );
}

function Row({ label, right }: { label: string; right?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: theme.card, borderBottom: `1px solid ${theme.borderLight}` }}>
      <span style={{ fontSize: 15, color: theme.text1 }}>{label}</span>
      {right}
    </div>
  );
}

function DarkModeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: isDark ? "#3880ff" : "#d1d5db",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", left: isDark ? 22 : 2,
      }} />
    </button>
  );
}

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: on ? "#3880ff" : "#d1d5db",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", left: on ? 22 : 2,
      }} />
    </button>
  );
}

// ── ChildCard ─────────────────────────────────────────────────

function ChildCard({ child, onEdit, onDelete }: { child: Child; onEdit: () => void; onDelete: () => void }) {
  const { theme } = useTheme();
  const age = calcAge(child.birthDate);
  const emoji = child.gender === "female" ? "👧" : "👦";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: theme.card, borderBottom: `1px solid ${theme.borderLight}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: child.gender === "female" ? "#fdf2f8" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {emoji}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: theme.text1 }}>
            {child.name}
            {child.nicknames.length > 0 && (
              <span style={{ fontSize: 12, color: theme.text4 }}>
                ({child.nicknames.join(" · ")})
              </span>
            )}
            {child.twinGroupId && (
              <span style={{ fontSize: 11, color: "#8b5cf6", background: "#f5f3ff", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>쌍둥이</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: theme.text4, marginTop: 2 }}>
            만 {age}세 · {child.height ? `${child.height}cm` : "키 미등록"} · {child.weight ? `${child.weight}kg` : "몸무게 미등록"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#3880ff", fontSize: 13, padding: "4px 8px" }}>수정</button>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13, padding: "4px 8px" }}>삭제</button>
      </div>
    </div>
  );
}

// ── ChildModal ────────────────────────────────────────────────

function ChildModal({ initial, existingChildren, onSave, onClose }: {
  initial?: Child;
  existingChildren: Child[];
  onSave: (child: Omit<Child, "id" | "twinGroupId">, twinSiblingId: string | null) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [name, setName]           = useState(initial?.name ?? "");
  const [nicknames, setNicknames] = useState<string[]>(initial?.nicknames ?? [""]);
  const [gender, setGender]       = useState<"male" | "female">(initial?.gender ?? "male");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [weight, setWeight]       = useState(initial?.weight ?? "");
  const [height, setHeight]       = useState(initial?.height ?? "");

  const currentTwinSibling = initial?.twinGroupId
    ? existingChildren.find((c) => c.twinGroupId === initial.twinGroupId) ?? null : null;
  const [isTwin, setIsTwin] = useState(!!initial?.twinGroupId);
  const [twinSiblingId, setTwinSiblingId] = useState<string>(currentTwinSibling?.id ?? "");

  const canSubmit = name.trim() && birthDate;
  const updateNickname = (idx: number, v: string) => setNicknames((p) => p.map((n, i) => i === idx ? v : n));
  const addNickname    = () => setNicknames((p) => [...p, ""]);
  const removeNickname = (idx: number) => setNicknames((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave(
      { name: name.trim(), nicknames: nicknames.map((n) => n.trim()).filter(Boolean), gender, birthDate, weight, height },
      isTwin && twinSiblingId ? twinSiblingId : null,
    );
  };

  const FIELD: React.CSSProperties = {
    border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: "9px 12px",
    fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box",
    background: theme.inputBg, color: theme.text1,
  };
  const LABEL: React.CSSProperties = { fontSize: 12, color: theme.text3, fontWeight: 600, marginBottom: 4, display: "block" };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: theme.overlayBg, zIndex: 200 }} />
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: theme.card, borderRadius: "20px 20px 0 0", zIndex: 201, display: "flex", flexDirection: "column", maxHeight: "90dvh" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 12px" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.text1 }}>{initial ? "아이 정보 수정" : "아이 등록"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: theme.text4, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: "auto", padding: "0 20px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 성별 */}
          <div>
            <span style={LABEL}>성별 *</span>
            <div style={{ display: "flex", gap: 8 }}>
              {(["male", "female"] as const).map((g) => (
                <button key={g} onClick={() => setGender(g)} style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  border: gender === g ? "2px solid #3880ff" : `1px solid ${theme.inputBorder}`,
                  background: gender === g ? "#eff6ff" : theme.inputBg,
                  color: gender === g ? "#3880ff" : theme.text2,
                }}>
                  {g === "male" ? "👦 남자" : "👧 여자"}
                </button>
              ))}
            </div>
          </div>

          {/* 이름 */}
          <div>
            <label style={LABEL}>이름 *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" style={FIELD} />
          </div>

          {/* 애칭 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...LABEL, marginBottom: 0 }}>애칭 ({nicknames.length}/3)</label>
              {nicknames.length < 3 && (
                <button onClick={addNickname} style={{ background: "none", border: "none", cursor: "pointer", color: "#3880ff", fontSize: 13, fontWeight: 600, padding: 0 }}>+ 추가</button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {nicknames.map((n, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="text" value={n} onChange={(e) => updateNickname(idx, e.target.value)} placeholder={`애칭 ${idx + 1}`} style={{ ...FIELD, flex: 1 }} />
                  {nicknames.length > 1 && (
                    <button onClick={() => removeNickname(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 생년월일 */}
          <div>
            <label style={LABEL}>생년월일 *</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} style={FIELD} />
          </div>

          {/* 키/몸무게 */}
          <div style={{ fontSize: 13, color: theme.text3, fontWeight: 600, marginBottom: -8 }}>태어났을 때</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>키 (cm)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="50" min={30} max={220} style={FIELD} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>몸무게 (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="3.5" min={1} max={200} style={FIELD} />
            </div>
          </div>

          {/* 쌍둥이 */}
          <div style={{ background: theme.subtleBg, borderRadius: 12, padding: "14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: theme.text2 }}>쌍둥이</span>
                <span style={{ fontSize: 12, color: theme.text4, marginLeft: 6 }}>다른 아이와 쌍둥이 관계 설정</span>
              </div>
              <button onClick={() => { setIsTwin((v) => !v); setTwinSiblingId(""); }} style={{
                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: isTwin ? "#8b5cf6" : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}>
                <span style={{ position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", left: isTwin ? 22 : 2 }} />
              </button>
            </div>
            {isTwin && (
              existingChildren.length > 0 ? (
                <div>
                  <label style={{ ...LABEL, color: "#8b5cf6" }}>쌍둥이 형제/자매 선택</label>
                  <select value={twinSiblingId} onChange={(e) => setTwinSiblingId(e.target.value)} style={{ ...FIELD, border: "1.5px solid #8b5cf6" }}>
                    <option value="">선택하세요</option>
                    {existingChildren.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.nicknames.length > 0 ? ` (${c.nicknames[0]})` : ""}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: theme.text4 }}>쌍둥이 형제/자매를 먼저 등록한 후 연결할 수 있습니다.</p>
              )
            )}
          </div>

          {/* 버튼 */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 15, cursor: "pointer", color: theme.text2 }}>취소</button>
            <button onClick={handleSubmit} disabled={!canSubmit} style={{ flex: 2, padding: "13px 0", borderRadius: 10, border: "none", background: canSubmit ? "#3880ff" : "#d1d5db", fontSize: 15, fontWeight: 700, cursor: canSubmit ? "pointer" : "default", color: "#fff" }}>
              {initial ? "저장하기" : "등록하기"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── ChildDeleteModal ──────────────────────────────────────────

function ChildDeleteModal({ child, onConfirm, onClose }: { child: Child; onConfirm: () => void; onClose: () => void }) {
  const { theme } = useTheme();
  const emoji = child.gender === "female" ? "👧" : "👦";
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: theme.overlayBg, zIndex: 200 }} />
      <div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", background: theme.card, borderRadius: 20, zIndex: 201, width: "calc(100% - 48px)", maxWidth: 320, padding: "28px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🗑️</div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: theme.text1 }}>아이를 삭제할까요?</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>{emoji}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.text2 }}>{child.name}</span>
            {child.twinGroupId && <span style={{ fontSize: 11, color: "#8b5cf6", background: "#f5f3ff", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>쌍둥이</span>}
          </div>
          {child.nicknames.length > 0 && <p style={{ margin: "4px 0 0", fontSize: 13, color: theme.text4 }}>{child.nicknames.join(" · ")}</p>}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: theme.text4, textAlign: "center" }}>삭제하면 이 아이의 모든 기록 연결이 해제됩니다</p>
        <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 15, cursor: "pointer", color: theme.text2, fontWeight: 600 }}>취소</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "none", background: "#ef4444", fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#fff" }}>삭제</button>
        </div>
      </div>
    </>
  );
}

// ── InviteCodeSection ─────────────────────────────────────────

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "BEBE-" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

interface InviteCode { code: string; createdAt: string; }

function InviteCodeSection() {
  const { theme } = useTheme();
  const [invite, setInvite] = useState<InviteCode | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem("invite-code"); if (s) setInvite(JSON.parse(s)); } catch {}
  }, []);

  const issue = () => {
    const next: InviteCode = { code: generateCode(), createdAt: new Date().toISOString() };
    setInvite(next);
    localStorage.setItem("invite-code", JSON.stringify(next));
  };

  const copy = async () => {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createdLabel = invite ? new Date(invite.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <>
      <div style={{ padding: "16px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: theme.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>초대코드</span>
        <button onClick={issue} style={{ background: "#3880ff", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}>
          {invite ? "재발급" : "발급"}
        </button>
      </div>
      {invite ? (
        <div style={{ background: theme.card, borderBottom: `1px solid ${theme.borderLight}`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, letterSpacing: 2, color: theme.text1, flex: 1 }}>{invite.code}</span>
            <button onClick={copy} style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: copied ? "#f0fdf4" : theme.card, color: copied ? "#16a34a" : theme.text2, fontSize: 13, fontWeight: 600, padding: "6px 14px", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}>
              {copied ? "복사됨 ✓" : "복사"}
            </button>
          </div>
          <span style={{ fontSize: 12, color: theme.text4 }}>발급일: {createdLabel}</span>
        </div>
      ) : (
        <div style={{ padding: "14px 16px", background: theme.card, borderBottom: `1px solid ${theme.borderLight}` }}>
          <p style={{ margin: 0, color: theme.text4, fontSize: 14 }}>발급된 초대코드가 없습니다.</p>
        </div>
      )}
    </>
  );
}

// ── 메인 ─────────────────────────────────────────────────────

export default function SettingsTab() {
  const { theme } = useTheme();
  const [children, setChildren] = useState<Child[]>([]);
  const [modalTarget, setModalTarget] = useState<Child | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Child | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("registered-children");
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((c: Child & { nickname?: string }) => {
          if (!c.nicknames) { const { nickname, ...rest } = c; return { ...rest, nicknames: nickname ? [nickname] : [] }; }
          return c;
        });
        setChildren(migrated);
      }
    } catch {}
  }, []);

  const saveChildren = (updated: Child[]) => {
    setChildren(updated);
    localStorage.setItem("registered-children", JSON.stringify(updated));
  };

  const handleSave = (data: Omit<Child, "id" | "twinGroupId">, twinSiblingId: string | null) => {
    if (modalTarget === "new") {
      const newId = crypto.randomUUID();
      if (twinSiblingId) {
        const groupId = children.find((c) => c.id === twinSiblingId)?.twinGroupId ?? crypto.randomUUID();
        saveChildren([...children.map((c) => c.id === twinSiblingId ? { ...c, twinGroupId: groupId } : c), { id: newId, ...data, twinGroupId: groupId }]);
      } else {
        saveChildren([...children, { id: newId, ...data }]);
      }
    } else if (modalTarget) {
      const oldGroupId = modalTarget.twinGroupId;
      if (twinSiblingId) {
        const groupId = oldGroupId ?? children.find((c) => c.id === twinSiblingId)?.twinGroupId ?? crypto.randomUUID();
        saveChildren(children.map((c) => {
          if (c.id === modalTarget.id) return { ...modalTarget, ...data, twinGroupId: groupId };
          if (c.id === twinSiblingId) return { ...c, twinGroupId: groupId };
          if (oldGroupId && c.twinGroupId === oldGroupId) return { ...c, twinGroupId: undefined };
          return c;
        }));
      } else {
        saveChildren(children.map((c) => {
          if (c.id === modalTarget.id) return { ...modalTarget, ...data, twinGroupId: undefined };
          if (oldGroupId && c.twinGroupId === oldGroupId) return { ...c, twinGroupId: undefined };
          return c;
        }));
      }
    }
    setModalTarget(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", background: theme.bg }}>

        {/* 아이 등록 */}
        <div style={{ padding: "16px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: theme.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>아이 등록</span>
          <button onClick={() => setModalTarget("new")} style={{ background: "#3880ff", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}>
            + 추가
          </button>
        </div>

        {children.length === 0 ? (
          <div style={{ padding: "14px 16px", background: theme.card, borderBottom: `1px solid ${theme.borderLight}` }}>
            <p style={{ margin: 0, color: theme.text4, fontSize: 14 }}>등록된 아이가 없습니다.</p>
          </div>
        ) : (
          children.map((child) => (
            <ChildCard key={child.id} child={child} onEdit={() => setModalTarget(child)} onDelete={() => setDeleteTarget(child)} />
          ))
        )}

        <InviteCodeSection />

        {/* 화면 */}
        <SectionLabel label="화면" />
        <Row label="다크모드" right={<DarkModeToggle />} />

        {/* 음성 인식 */}
        <SectionLabel label="음성 인식" />
        <Row label="자동 녹음 시작" right={<Toggle />} />
        <Row label="소음 필터" right={<Toggle defaultChecked />} />

        {/* 알림 */}
        <SectionLabel label="알림" />
        <Row label="기록 알림" right={<Toggle />} />

        {/* 앱 정보 */}
        <SectionLabel label="앱 정보" />
        <Row label="버전" right={<span style={{ color: theme.text4, fontSize: 14 }}>1.0.0</span>} />

        {/* 개발자 */}
        <SectionLabel label="개발자" />
        <div style={{ padding: "8px 16px 24px" }}>
          <button
            onClick={() => {
              const count = seedDemoData();
              if (count > 0) alert(`데모 데이터 ${count}건이 추가되었습니다.\n(최근 2주치, 등록된 아이 최대 3명)`);
              else alert("먼저 아이를 등록해주세요.");
            }}
            style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: `1.5px dashed ${theme.border}`, background: theme.subtleBg, fontSize: 14, fontWeight: 600, color: theme.text3, cursor: "pointer" }}
          >
            데모 데이터 삽입 (최근 2주)
          </button>
        </div>
      </div>

      {modalTarget !== null && (
        <ChildModal
          initial={modalTarget === "new" ? undefined : modalTarget}
          existingChildren={modalTarget === "new" ? children : children.filter((c) => c.id !== modalTarget.id)}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
      {deleteTarget && (
        <ChildDeleteModal
          child={deleteTarget}
          onConfirm={() => { saveChildren(children.filter((c) => c.id !== deleteTarget.id)); setDeleteTarget(null); }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
