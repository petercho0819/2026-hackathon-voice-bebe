"use client";

import { useState, useRef, useEffect } from "react";
import { IonIcon } from "@ionic/react";
import { closeOutline, paperPlaneOutline, warningOutline } from "ionicons/icons";
import { useTheme } from "@/contexts/ThemeContext";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "model";
  text: string;
}

interface Child {
  id: string;
  name: string;
  nicknames: string[];
  gender: "male" | "female";
  birthDate: string;
  twinGroupId?: string;
}

interface HealthRecord {
  id: string;
  childId: string;
  date: string;
  height: string;
  weight: string;
  headCircumference: string;
}

function loadChildren(): Child[] {
  try {
    return JSON.parse(localStorage.getItem("registered-children") ?? "[]");
  } catch { return []; }
}

function loadLatestHealthByChild(): Record<string, HealthRecord> {
  try {
    const records: HealthRecord[] = JSON.parse(localStorage.getItem("health-records") ?? "[]");
    const map: Record<string, HealthRecord> = {};
    for (const r of records) {
      const prev = map[r.childId];
      if (!prev || r.date > prev.date) map[r.childId] = r;
    }
    return map;
  } catch { return {}; }
}

function calcMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

function buildChildrenContext(children: Child[], healthMap: Record<string, HealthRecord>): string {
  if (children.length === 0) return "";
  const lines = children.map((c, i) => {
    const months = calcMonths(c.birthDate);
    const ageStr = months >= 12
      ? `${Math.floor(months / 12)}세 ${months % 12}개월 (${months}개월)`
      : `${months}개월`;
    const gender = c.gender === "female" ? "여아" : "남아";
    const nick = c.nicknames.length > 0 ? ` / 애칭: ${c.nicknames.join(", ")}` : "";
    const twin = c.twinGroupId ? " [쌍둥이]" : "";
    const h = healthMap[c.id];
    let measurements: string;
    if (h) {
      const daysSince = Math.floor((Date.now() - new Date(h.date).getTime()) / 86_400_000);
      const stale = daysSince > 14 ? ` ⚠️ 측정일로부터 ${daysSince}일 경과 — 최신 수치 재확인 필요` : "";
      measurements = `체중: ${h.weight}kg, 키: ${h.height}cm, 머리둘레: ${h.headCircumference}cm (${h.date} 측정${stale})`;
    } else {
      measurements = "건강기록 없음";
    }
    return `  ${i + 1}. ${c.name}${twin} — ${gender}, 생년월일: ${c.birthDate}, 나이: ${ageStr}${nick}\n     최근 신체계측: ${measurements}`;
  });
  return `[등록된 아이 정보 — 이미 알고 있으므로 다시 묻지 마세요]\n${lines.join("\n")}`;
}

const WELCOME =
  "안녕하세요! 저는 베베케어 응급 상담 AI예요 🍼\n\n아이 증상이 걱정되시나요? 상황을 편하게 말씀해 주세요. 응급도 판단과 초기 대처법을 안내해 드릴게요.\n\n⚠️ 생명이 위험한 응급 상황은 즉시 119에 전화하세요.";

export default function EmergencyChat({ onClose, onExit }: { onClose: () => void; onExit: () => void }) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [childrenContext] = useState<string>(() =>
    buildChildrenContext(loadChildren(), loadLatestHealthByChild())
  );
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [locationContext, setLocationContext] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ko`,
            { headers: { "Accept-Language": "ko" } }
          );
          const data = await res.json();
          const a = data.address ?? {};
          const parts = [
            a.city ?? a.county ?? a.town ?? a.village,
            a.city_district ?? a.suburb ?? a.neighbourhood,
          ].filter(Boolean);
          const label = parts.length > 0 ? parts.join(" ") : `위도 ${lat.toFixed(4)}, 경도 ${lon.toFixed(4)}`;
          setLocationContext(`[현재 위치] ${label} (좌표: ${lat.toFixed(5)}, ${lon.toFixed(5)})`);
          setLocationStatus("granted");
        } catch {
          setLocationContext(`[현재 위치] 좌표: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
          setLocationStatus("granted");
        }
      },
      () => setLocationStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const next: Message[] = [...messages, { role: "user", text }];
    setMessages(next);
    setLoading(true);

    // placeholder for streaming model reply
    setMessages((prev) => [...prev, { role: "model", text: "" }]);

    try {
      // Build Gemini conversation history — skip static welcome
      const geminiMessages = next.slice(1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: geminiMessages, childrenContext, locationContext }),
      });

      if (!res.ok || !res.body) throw new Error("API 오류");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const chunk = JSON.parse(json);
            const chunkText: string =
              chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (chunkText) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "model") {
                  updated[updated.length - 1] = {
                    ...last,
                    text: last.text + chunkText,
                  };
                }
                return updated;
              });
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "model",
          text: "죄송해요, 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isTyping = loading && messages[messages.length - 1]?.text === "";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", height: "90dvh",
          background: theme.bg,
          borderRadius: "20px 20px 0 0",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px 12px",
          background: "#ef4444",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>🚨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>베베케어 응급 상담</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>AI 영유아 응급 도우미</div>
          </div>
          {/* 나가기 — 확인 모달 후 세션 종료 */}
          <button
            onClick={() => setExitConfirm(true)}
            style={{
              height: 28, padding: "0 10px", borderRadius: 14, border: "1.5px solid rgba(255,255,255,0.5)",
              background: "transparent", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: "#fff", flexShrink: 0,
            }}
          >
            나가기
          </button>
          {/* 닫기 — 세션 유지, 모달만 숨김 */}
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,0.2)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", flexShrink: 0,
            }}
          >
            <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* 119 경고 + 위치 상태 배너 */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "8px 16px",
          background: "#fff7ed",
          borderBottom: `1px solid ${theme.borderLight}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <IonIcon icon={warningOutline} style={{ fontSize: 13, color: "#ea580c", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#9a3412" }}>
              의식 불명·경련 시 즉시 <strong>119</strong>
            </span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
            padding: "3px 8px", borderRadius: 10,
            background: locationStatus === "granted" ? "#dcfce7"
              : locationStatus === "denied" ? "#fee2e2"
              : "#f1f5f9",
          }}>
            <span style={{ fontSize: 10 }}>
              {locationStatus === "loading" ? "⏳"
                : locationStatus === "granted" ? "📍"
                : locationStatus === "denied" ? "🚫"
                : "📍"}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: locationStatus === "granted" ? "#16a34a"
                : locationStatus === "denied" ? "#dc2626"
                : "#64748b",
            }}>
              {locationStatus === "loading" ? "위치 확인 중"
                : locationStatus === "granted" ? locationContext.replace("[현재 위치] ", "").split(" (좌표")[0]
                : locationStatus === "denied" ? "위치 거부됨"
                : "위치 대기"}
            </span>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "16px 16px 8px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-end", gap: 8,
            }}>
              {msg.role === "model" && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "#fee2e2", fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>🚨</div>
              )}
              <div style={{
                maxWidth: "75%",
                padding: "10px 13px",
                borderRadius: msg.role === "user"
                  ? "16px 16px 4px 16px"
                  : "4px 16px 16px 16px",
                background: msg.role === "user" ? "#ef4444" : theme.card,
                color: msg.role === "user" ? "#fff" : theme.text1,
                fontSize: 13, lineHeight: 1.65,
                boxShadow: `0 1px 4px ${theme.shadow}`,
                wordBreak: "keep-all",
              }}>
                {isTyping && i === messages.length - 1 ? (
                  <span style={{ letterSpacing: 2, opacity: 0.5 }}>●●●</span>
                ) : msg.role === "model" ? (
                  <div className="md-chat">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 추천 질문 칩 */}
        <div style={{
          flexShrink: 0,
          display: "flex", gap: 7, overflowX: "auto",
          padding: "8px 16px 0",
          background: theme.card,
          borderTop: `1px solid ${theme.border}`,
          scrollbarWidth: "none",
        }}>
          {[
            { label: "🏥 인근 병원 추천", text: "지금 제 위치 근처에서 진료 가능한 병원을 추천해 주세요." },
            { label: "🌙 야간 진료 병원", text: "지금 야간 진료가 가능한 소아과나 응급실을 알려주세요." },
            { label: "🚑 응급실 안내", text: "가장 가까운 소아 응급실은 어디인가요?" },
            { label: "📋 상담 내용 정리", text: "지금까지 상담한 내용을 의료 인계용으로 정리해 주세요." },
          ].map(({ label, text }) => (
            <button
              key={label}
              onClick={() => { setInput(text); inputRef.current?.focus(); }}
              style={{
                flexShrink: 0,
                padding: "6px 12px", borderRadius: 16,
                border: `1.5px solid ${theme.border}`,
                background: theme.bg, cursor: "pointer",
                fontSize: 12, color: theme.text2, fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 입력창 */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "flex-end", gap: 8,
          padding: "8px 16px",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
          borderTop: "none",
          background: theme.card,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="증상이나 상황을 입력하세요… (Enter로 전송)"
            rows={1}
            style={{
              flex: 1,
              border: `1.5px solid ${theme.border}`,
              borderRadius: 16, padding: "10px 14px",
              fontSize: 13, color: theme.text1,
              background: theme.bg, outline: "none",
              resize: "none", fontFamily: "inherit",
              lineHeight: 1.5, maxHeight: 90,
              overflowY: "auto",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: "50%", border: "none",
              background: !input.trim() || loading ? theme.border : "#ef4444",
              cursor: !input.trim() || loading ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <IonIcon icon={paperPlaneOutline} style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* 종료 확인 모달 */}
      {exitConfirm && (
        <div
          onClick={() => setExitConfirm(false)}
          style={{
            position: "absolute", inset: 0, zIndex: 10,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 32px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", background: theme.card,
              borderRadius: 20, padding: "28px 24px 20px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <span style={{ fontSize: 36 }}>💬</span>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text1, textAlign: "center" }}>
              상담을 종료할까요?
            </p>
            <p style={{ margin: 0, fontSize: 13, color: theme.text3, textAlign: "center", lineHeight: 1.6 }}>
              종료하면 지금까지의 대화 내용이<br />모두 삭제됩니다.
            </p>
            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 8 }}>
              <button
                onClick={() => setExitConfirm(false)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  border: `1.5px solid ${theme.border}`, background: theme.card,
                  fontSize: 14, fontWeight: 600, color: theme.text2, cursor: "pointer",
                }}
              >
                계속 상담
              </button>
              <button
                onClick={onExit}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  border: "none", background: "#ef4444",
                  fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer",
                }}
              >
                종료
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .md-chat p { margin: 0 0 6px; }
        .md-chat p:last-child { margin-bottom: 0; }
        .md-chat ul, .md-chat ol { margin: 4px 0 6px; padding-left: 18px; }
        .md-chat li { margin-bottom: 3px; }
        .md-chat strong { font-weight: 700; }
        .md-chat code { background: rgba(0,0,0,0.08); border-radius: 4px; padding: 1px 5px; font-size: 12px; font-family: monospace; }
        .md-chat pre { background: rgba(0,0,0,0.06); border-radius: 8px; padding: 8px 10px; overflow-x: auto; margin: 6px 0; }
        .md-chat pre code { background: none; padding: 0; }
        .md-chat h1, .md-chat h2, .md-chat h3 { margin: 6px 0 4px; font-weight: 700; }
        .md-chat h1 { font-size: 15px; }
        .md-chat h2 { font-size: 14px; }
        .md-chat h3 { font-size: 13px; }
        .md-chat hr { border: none; border-top: 1px solid rgba(0,0,0,0.12); margin: 8px 0; }
        .md-chat a { color: #3880ff; text-decoration: underline; }
        .md-chat blockquote { border-left: 3px solid rgba(0,0,0,0.15); margin: 4px 0; padding: 2px 8px; color: inherit; opacity: 0.8; }
      `}</style>
    </div>
  );
}
