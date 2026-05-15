"use client";

import { useState } from "react";
import { IonIcon } from "@ionic/react";
import { useTheme } from "@/contexts/ThemeContext";
import { micOutline, happyOutline, timeOutline, leafOutline, settingsOutline, chatbubblesOutline } from "ionicons/icons";
import RecordingTab from "@/components/tabs/RecordingTab";
import StatusTab from "@/components/tabs/StatusTab";
import TimelineTab from "@/components/tabs/TimelineTab";
import GrowthTab from "@/components/tabs/GrowthTab";
import SettingsTab from "@/components/tabs/SettingsTab";
import EmergencyChat from "@/components/EmergencyChat";

type Tab = "recording" | "status" | "timeline" | "growth" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "recording", label: "녹음", icon: micOutline },
  { id: "status", label: "생활패턴", icon: happyOutline },
  { id: "timeline", label: "건강기록", icon: timeOutline },
  { id: "growth", label: "성장기록", icon: leafOutline },
  { id: "settings", label: "설정", icon: settingsOutline },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("recording");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMounted, setChatMounted] = useState(false);

  const openChat = () => { setChatMounted(true); setChatOpen(true); };
  const closeChat = () => setChatOpen(false);
  const exitChat = () => { setChatOpen(false); setChatMounted(false); };
  const { theme, isDark } = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: theme.card, overflow: "hidden" }}>
      {/* 앱 헤더 */}
      <header style={{
        flexShrink: 0,
        padding: "16px 20px 12px",
        paddingTop: "calc(16px + env(safe-area-inset-top))",
        background: theme.headerBg,
        borderBottom: `1px solid ${theme.headerBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <img
          src={isDark ? "/assest/dark_mode.png" : "/assest/light_mode.png"}
          alt="보이스 베베"
          style={{ height: isDark ? 36 : 28, display: "block" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 녹음 버튼 */}
          <button
            onClick={() => setActiveTab("recording")}
            style={{
              width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
              background: activeTab === "recording" ? "#3880ff" : `${theme.subtleBg}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: activeTab === "recording" ? "#fff" : theme.text3,
              transition: "all 0.15s",
            }}
          >
            <IonIcon icon={micOutline} style={{ fontSize: 20 }} />
          </button>
          {/* 응급챗 버튼 */}
          <button
            onClick={openChat}
            style={{
              height: 36, padding: "0 14px", borderRadius: 18, border: "none", cursor: "pointer",
              background: "#ef4444",
              display: "flex", alignItems: "center", gap: 5,
              color: "#fff", fontSize: 13, fontWeight: 700,
              boxShadow: "0 2px 8px rgba(239,68,68,0.35)",
            }}
          >
            <IonIcon icon={chatbubblesOutline} style={{ fontSize: 16 }} />
            응급챗
          </button>
        </div>
      </header>

      {/* 탭 콘텐츠 */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "recording" && <RecordingTab />}
        {activeTab === "status" && <StatusTab />}
        {activeTab === "timeline" && <TimelineTab />}
        {activeTab === "growth" && <GrowthTab />}
        {activeTab === "settings" && <SettingsTab onSeedComplete={() => setActiveTab("recording")} />}
      </div>

      {/* 응급챗 모달 — 마운트 유지, display로 숨김 */}
      {chatMounted && (
        <div style={{ display: chatOpen ? "block" : "none" }}>
          <EmergencyChat onClose={closeChat} onExit={exitChat} />
        </div>
      )}

      {/* 하단 탭바 */}
      <nav style={{
        display: "flex",
        flexShrink: 0,
        background: theme.navBg,
        borderTop: `1px solid ${theme.navBorder}`,
        boxShadow: `0 -2px 8px ${theme.shadow}`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "10px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: activeTab === id ? "#3880ff" : theme.text4,
            }}
          >
            <IonIcon icon={icon} style={{ fontSize: 22 }} />
            <span style={{ fontSize: 9, fontWeight: activeTab === id ? 700 : 400, lineHeight: 1 }}>
              {label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
