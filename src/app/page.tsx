"use client";

import { useState } from "react";
import { IonIcon } from "@ionic/react";
import { micOutline, happyOutline, timeOutline, leafOutline, settingsOutline } from "ionicons/icons";
import RecordingTab from "@/components/tabs/RecordingTab";
import StatusTab from "@/components/tabs/StatusTab";
import TimelineTab from "@/components/tabs/TimelineTab";
import GrowthTab from "@/components/tabs/GrowthTab";
import SettingsTab from "@/components/tabs/SettingsTab";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#fff", overflow: "hidden" }}>
      {/* 앱 헤더 */}
      <header style={{
        flexShrink: 0,
        padding: "16px 20px 12px",
        paddingTop: "calc(16px + env(safe-area-inset-top))",
        background: "#fff",
        borderBottom: "1px solid #f3f4f6",
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>보이스 베베</span>
      </header>

      {/* 탭 콘텐츠 */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "recording" && <RecordingTab />}
        {activeTab === "status" && <StatusTab />}
        {activeTab === "timeline" && <TimelineTab />}
        {activeTab === "growth" && <GrowthTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>

      {/* 하단 탭바 */}
      <nav style={{
        display: "flex",
        flexShrink: 0,
        background: "#ffffff",
        borderTop: "1px solid #e5e7eb",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
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
              color: activeTab === id ? "#3880ff" : "#9ca3af",
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
