"use client";

import { useState, useEffect } from "react";

interface Child {
  id: string;
  name: string;
  nicknames: string[];
  gender: "male" | "female";
  birthDate: string; // YYYY-MM-DD
  weight: string;    // kg
  height: string;    // cm
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

function Row({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: 15 }}>{label}</span>
      {right}
    </div>
  );
}

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
      <input type="checkbox" defaultChecked={defaultChecked} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{
        position: "absolute", inset: 0, borderRadius: 12,
        background: defaultChecked ? "#3880ff" : "#d1d5db",
        cursor: "pointer", display: "flex", alignItems: "center", padding: "0 2px",
      }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", marginLeft: defaultChecked ? "auto" : 0, transition: "margin .2s" }} />
      </span>
    </label>
  );
}

function ChildCard({ child, onEdit, onDelete }: { child: Child; onEdit: () => void; onDelete: () => void }) {
  const age = calcAge(child.birthDate);
  const emoji = child.gender === "female" ? "👧" : "👦";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: child.gender === "female" ? "#fdf2f8" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {emoji}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {child.name}
            {child.nicknames.length > 0 && (
              <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 6 }}>
                ({child.nicknames.join(" · ")})
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            만 {age}세 · {child.height ? `${child.height}cm` : "키 미등록"} · {child.weight ? `${child.weight}kg` : "몸무게 미등록"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#3880ff", fontSize: 13, padding: "4px 8px" }}>
          수정
        </button>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13, padding: "4px 8px" }}>
          삭제
        </button>
      </div>
    </div>
  );
}

const FIELD: React.CSSProperties = {
  border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 12px",
  fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box", background: "#fff",
};
const LABEL: React.CSSProperties = {
  fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 4, display: "block",
};

function ChildModal({ initial, onSave, onClose }: {
  initial?: Child;
  onSave: (child: Omit<Child, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nicknames, setNicknames] = useState<string[]>(initial?.nicknames ?? [""]);
  const [gender, setGender] = useState<"male" | "female">(initial?.gender ?? "male");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [weight, setWeight] = useState(initial?.weight ?? "");
  const [height, setHeight] = useState(initial?.height ?? "");

  const canSubmit = name.trim() && birthDate;

  const updateNickname = (idx: number, value: string) =>
    setNicknames((prev) => prev.map((n, i) => (i === idx ? value : n)));
  const addNickname = () => setNicknames((prev) => [...prev, ""]);
  const removeNickname = (idx: number) =>
    setNicknames((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!canSubmit) return;
    const filtered = nicknames.map((n) => n.trim()).filter(Boolean);
    onSave({ name: name.trim(), nicknames: filtered, gender, birthDate, weight, height });
  };

  return (
    <>
      {/* 백드롭 */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }}
      />
      {/* 바텀 시트 */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        background: "#fff", borderRadius: "20px 20px 0 0",
        zIndex: 201, display: "flex", flexDirection: "column",
        maxHeight: "90dvh",
      }}>
        {/* 핸들 */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e5e7eb" }} />
        </div>

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 12px" }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>{initial ? "아이 정보 수정" : "아이 등록"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af", lineHeight: 1 }}>×</button>
        </div>

        {/* 폼 */}
        <div style={{ overflowY: "auto", padding: "0 20px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 성별 */}
          <div>
            <span style={LABEL}>성별 *</span>
            <div style={{ display: "flex", gap: 8 }}>
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    border: gender === g ? "2px solid #3880ff" : "1px solid #e5e7eb",
                    background: gender === g ? "#eff6ff" : "#fff",
                    color: gender === g ? "#3880ff" : "#374151",
                  }}
                >
                  {g === "male" ? "👦 남자" : "👧 여자"}
                </button>
              ))}
            </div>
          </div>

          {/* 이름 */}
          <div>
            <label style={LABEL}>이름 *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="홍길동" style={FIELD} />
          </div>

          {/* 애칭 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...LABEL, marginBottom: 0 }}>애칭 ({nicknames.length}/3)</label>
              {nicknames.length < 3 && (
                <button onClick={addNickname} style={{ background: "none", border: "none", cursor: "pointer", color: "#3880ff", fontSize: 13, fontWeight: 600, padding: 0 }}>
                  + 추가
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {nicknames.map((n, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    value={n}
                    onChange={(e) => updateNickname(idx, e.target.value)}
                    placeholder={`애칭 ${idx + 1}`}
                    style={{ ...FIELD, flex: 1 }}
                  />
                  {nicknames.length > 1 && (
                    <button onClick={() => removeNickname(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 생년월일 */}
          <div>
            <label style={LABEL}>생년월일 *</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)} style={FIELD} />
          </div>

          {/* 키 / 몸무게 */}
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: -8 }}>태어났을 때</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>키 (cm)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                placeholder="100" min={30} max={220} style={FIELD} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>몸무게 (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                placeholder="15" min={1} max={200} style={FIELD} />
            </div>
          </div>

          {/* 버튼 */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "13px 0", borderRadius: 10, border: "1px solid #e5e7eb",
              background: "#fff", fontSize: 15, cursor: "pointer", color: "#374151",
            }}>취소</button>
            <button onClick={handleSubmit} disabled={!canSubmit} style={{
              flex: 2, padding: "13px 0", borderRadius: 10, border: "none",
              background: canSubmit ? "#3880ff" : "#d1d5db",
              fontSize: 15, fontWeight: 700, cursor: canSubmit ? "pointer" : "default", color: "#fff",
            }}>{initial ? "저장하기" : "등록하기"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

interface InviteCode {
  code: string;
  createdAt: string; // ISO string
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "BEBE-" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function InviteCodeSection() {
  const [invite, setInvite] = useState<InviteCode | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("invite-code");
      if (saved) setInvite(JSON.parse(saved));
    } catch {}
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

  const createdLabel = invite
    ? new Date(invite.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <>
      <div style={{ padding: "16px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>초대코드</span>
        <button
          onClick={issue}
          style={{ background: "#3880ff", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}
        >
          {invite ? "재발급" : "발급"}
        </button>
      </div>

      {invite ? (
        <div style={{ background: "#fff", borderBottom: "1px solid #f3f4f6", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, letterSpacing: 2, color: "#111827", flex: 1 }}>
              {invite.code}
            </span>
            <button
              onClick={copy}
              style={{
                border: "1px solid #e5e7eb", borderRadius: 8, background: copied ? "#f0fdf4" : "#fff",
                color: copied ? "#16a34a" : "#374151", fontSize: 13, fontWeight: 600,
                padding: "6px 14px", cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
              }}
            >
              {copied ? "복사됨 ✓" : "복사"}
            </button>
          </div>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>발급일: {createdLabel}</span>
        </div>
      ) : (
        <div style={{ padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: 14 }}>발급된 초대코드가 없습니다.</p>
        </div>
      )}
    </>
  );
}

export default function SettingsTab() {
  const [children, setChildren] = useState<Child[]>([]);
  const [modalTarget, setModalTarget] = useState<Child | null | "new">(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("registered-children");
      if (saved) {
        const parsed = JSON.parse(saved);
        // migrate old `nickname: string` → `nicknames: string[]`
        const migrated = parsed.map((c: Child & { nickname?: string }) => {
          if (!c.nicknames) {
            const { nickname, ...rest } = c;
            return { ...rest, nicknames: nickname ? [nickname] : [] };
          }
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

  const handleSave = (data: Omit<Child, "id">) => {
    if (modalTarget === "new") {
      saveChildren([...children, { id: crypto.randomUUID(), ...data }]);
    } else if (modalTarget) {
      saveChildren(children.map((c) => c.id === modalTarget.id ? { ...modalTarget, ...data } : c));
    }
    setModalTarget(null);
  };

  const deleteChild = (id: string) => {
    saveChildren(children.filter((c) => c.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", background: "#f9fafb" }}>
        {/* 아이 등록 섹션 */}
        <div style={{ padding: "16px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>아이 등록</span>
          <button
            onClick={() => setModalTarget("new")}
            style={{ background: "#3880ff", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}
          >
            + 추가
          </button>
        </div>

        {children.length === 0 ? (
          <div style={{ padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: 14 }}>등록된 아이가 없습니다.</p>
          </div>
        ) : (
          children.map((child) => (
            <ChildCard key={child.id} child={child} onEdit={() => setModalTarget(child)} onDelete={() => deleteChild(child.id)} />
          ))
        )}

        {/* 초대코드 */}
        <InviteCodeSection />

        {/* 음성 인식 */}
        <div style={{ padding: "16px 16px 4px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>음성 인식</div>
        <Row label="자동 녹음 시작" right={<Toggle />} />
        <Row label="소음 필터" right={<Toggle defaultChecked />} />

        <div style={{ padding: "16px 16px 4px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>알림</div>
        <Row label="기록 알림" right={<Toggle />} />

        <div style={{ padding: "16px 16px 4px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>앱 정보</div>
        <Row label="버전" right={<span style={{ color: "#9ca3af", fontSize: 14 }}>1.0.0</span>} />
      </div>

      {modalTarget !== null && (
        <ChildModal
          initial={modalTarget === "new" ? undefined : modalTarget}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}
