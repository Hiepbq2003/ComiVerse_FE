import React, { useState } from "react";
import {
  ChevronLeft,
  BookOpen,
  Check,
  Circle,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  AlignCenter,
  AlignLeft,
  Square,
  Maximize2,
  Upload,
  Save,
  Send,
  MessageSquare,
  BookMarked,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../context/AuthContext";
import "../../assets/style/translator/TranslateWorkspace.css";

// ---------------------------------------------------------------------------
// Mock data — stand-ins for a real project. Swap with API data.
// ---------------------------------------------------------------------------

const chapters = [
  {
    id: "ch1",
    title: "Chapter 1 — First Light",
    progress: "4/6",
    expanded: true,
    pages: [
      { id: 1, status: "done" },
      { id: 2, status: "done" },
      { id: 3, status: "done" },
      { id: 4, status: "done" },
      { id: 5, status: "current" },
      { id: 6, status: "todo" },
    ],
  },
  {
    id: "ch2",
    title: "Chapter 2 — The Gate Opens",
    progress: "1/5",
    expanded: true,
    pages: [
      { id: 1, status: "done" },
      { id: 2, status: "current" },
      { id: 3, status: "todo" },
      { id: 4, status: "todo" },
      { id: 5, status: "todo" },
    ],
  },
  {
    id: "ch3",
    title: "Chapter 3 — Old Debts",
    progress: "0/3",
    expanded: false,
    pages: [],
  },
];

const bubbles = [
  {
    id: 1,
    source: "誰だ、お前は？\n答えろ……\n名を名乗れ。",
    glossary: [{ from: "名を名乗れ", to: "state your name", note: "stock challenge line" }],
    translation: "Who are you?\nAnswer me...\nState your name.",
    color: "blue",
  },
  {
    id: 2,
    source: "……知る必要はない。",
    glossary: [],
    translation: "...you don't need to know.",
    color: "red",
  },
  {
    id: 3,
    source: "そうか。\nなら力ずくで聞き出すまでだ。",
    glossary: [],
    translation: "I see.\nThen I'll just have to beat it out of you.",
    color: "red",
  },
  {
    id: 4,
    source: "やれるものならな。",
    glossary: [],
    translation: "Go ahead and try.",
    color: "green",
  },
  {
    id: 5,
    source: "上等だ。",
    glossary: [],
    translation: "Fine by me.",
    color: "green",
  },
];

// Speech-bubble color coding — kept distinct from the ink/shu chrome accents
// so they read as content markers, not UI state.
const bubbleTheme = {
  blue: "#5472B0",
  red: "#C1440E",
  green: "#6B7F5E",
};

function PageStatusDot({ status }) {
  if (status === "done") {
    return (
      <span className="tw-status-dot-done">
        <Check size={10} color="#12141C" strokeWidth={3} />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="tw-status-dot-current-wrap">
        <span className="tw-status-dot-current-pulse" />
        <span className="tw-status-dot-current-core" />
      </span>
    );
  }
  return (
    <span className="tw-status-dot-todo">
      <Circle size={6} color="#33364A" fill="#33364A" />
    </span>
  );
}

// ---------------------------------------------------------------------------

export default function TranslateWorkspace() {
  const [activeTab, setActiveTab] = useState("translate");
  const [activeBubble, setActiveBubble] = useState(0);
  const [draft, setDraft] = useState(bubbles[0].translation);
  const [open, setOpen] = useState(
    Object.fromEntries(chapters.map((c) => [c.id, c.expanded]))
  );
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [fontSize, setFontSize] = useState(13);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState("left");

  const bubble = bubbles[activeBubble];

  const textStyle = {
    fontSize: `${fontSize}px`,
    fontWeight: isBold ? 700 : 400,
    fontStyle: isItalic ? "italic" : "normal",
    textAlign,
  };

  function selectBubble(i) {
    setActiveBubble(i);
    setDraft(bubbles[i].translation);
  }

  const bubblePositions = [
    { top: 40, left: 40, width: 220 },
    { top: 40, left: 380, width: 200 },
    { top: 230, left: 60, width: 240 },
    { top: 470, left: 340, width: 220 },
    { top: 620, left: 60, width: 200 },
  ];

  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const gotoProjectList = () => {
    if (!isLoggedIn) {
      navigate('/translator/dashboard');
    }
    navigate('/translator/dashboard');
  }
  return (
    <div className="tw-root">
      {/* Top bar */}
      <header className="tw-header">
        <div className="tw-header-left">
          <button onClick={gotoProjectList} className="tw-btn">
            <ChevronLeft size={16} />
            Project list
          </button>
          <div className="tw-divider-v" />
          <div className="tw-project-icon">
            <BookOpen size={16} />
          </div>
          <div>
            <p className="tw-project-title tw-font-display">Aurora Blade — project</p>
            <p className="tw-project-sub tw-font-mono">Chapter 1 · Page 5</p>
          </div>
        </div>

        <div className="tw-header-right">
          <span className="tw-badge-saved tw-font-mono">
            <Check size={11} strokeWidth={3} /> SAVED
          </span>
          <button className="tw-btn">
            <Upload size={14} /> Upload
          </button>
          <button className="tw-btn">
            <Save size={14} /> Save progress
          </button>
          <button className="tw-btn-primary">
            <Send size={14} /> Send
          </button>
        </div>
      </header>

      <div className="tw-body">
        {/* Sidebar: project files */}
        <aside className="tw-sidebar">
          <p className="tw-sidebar-label">PROJECT FILES</p>
          {chapters.map((ch) => (
            <div key={ch.id}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [ch.id]: !o[ch.id] }))}
                className="tw-chapter-row"
              >
                {open[ch.id] ? (
                  <ChevronDown size={14} color="#6C6F86" />
                ) : (
                  <ChevronRight size={14} color="#6C6F86" />
                )}
                <BookMarked size={14} color="#6C6F86" />
                <span className="tw-chapter-title">{ch.title}</span>
                <span className="tw-chapter-progress tw-font-mono">{ch.progress}</span>
              </button>
              {open[ch.id] &&
                ch.pages.map((p) => {
                  const isCurrent = ch.id === "ch1" && p.id === 5;
                  return (
                    <button
                      key={p.id}
                      className={`tw-page-row ${isCurrent ? "current" : ""}`}
                    >
                      <span className="tw-page-row-inner">
                        <PageStatusDot status={p.status} />
                        Page {p.id}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </aside>

        {/* Center: page viewer */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div className="tw-canvas-toolbar">
            <div className="tw-toolbar-group">
              <select className="tw-select">
                <option>Inter</option>
              </select>
              <select
                className="tw-select"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              >
                {[11, 12, 13, 14, 16, 18, 20, 24].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="tw-toolbar-divider" />
              <button
                type="button"
                onClick={() => setIsBold((v) => !v)}
                className={`tw-btn-icon ${isBold ? "active" : ""}`}
                title="In đậm"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsItalic((v) => !v)}
                className={`tw-btn-icon ${isItalic ? "active" : ""}`}
                title="In nghiêng"
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onClick={() => setTextAlign("left")}
                className={`tw-btn-icon ${textAlign === "left" ? "active" : ""}`}
                title="Canh trái"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setTextAlign("center")}
                className={`tw-btn-icon ${textAlign === "center" ? "active" : ""}`}
                title="Canh giữa"
              >
                <AlignCenter size={14} />
              </button>
              <div className="tw-toolbar-divider" />
              <button className="tw-btn-icon">
                <Square size={12} />
              </button>
              <button className="tw-btn-icon">
                <Square size={12} fill="currentColor" />
              </button>
              <button className="tw-btn-icon" style={{ color: "#5472B0" }}>
                <Square size={12} fill="currentColor" />
              </button>
              <button className="tw-btn-icon outline-active">
                <Circle size={12} />
              </button>
            </div>

            <div className="tw-page-nav">
              <span>PAGE 5 / 6</span>
              <button className="tw-page-nav-btn">Prev</button>
              <button className="tw-page-nav-btn">
                Next <ChevronRight size={14} />
              </button>
              <Maximize2 size={16} style={{ marginLeft: 4 }} />
            </div>
          </div>

          {/* Page canvas — lit like a lightbox: dark desk, warm paper page */}
          <div className="tw-canvas">
            <div className="tw-page">
              {/* panel gutter lines, like a printed page layout */}
              <svg
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                viewBox="0 0 640 820"
              >
                <line x1="0" y1="410" x2="640" y2="410" stroke="#2A2620" strokeOpacity="0.18" strokeWidth="2" />
                <line x1="320" y1="0" x2="320" y2="410" stroke="#2A2620" strokeOpacity="0.18" strokeWidth="2" />
                <line x1="320" y1="0" x2="60" y2="410" stroke="#2A2620" strokeOpacity="0.12" strokeWidth="1" />
                <line x1="320" y1="0" x2="600" y2="410" stroke="#2A2620" strokeOpacity="0.12" strokeWidth="1" />
              </svg>

              {bubbles.map((b, i) => {
                const color = bubbleTheme[b.color];
                const isActive = activeBubble === i;
                const pos = bubblePositions[i];
                return (
                  <button
                    key={b.id}
                    onClick={() => selectBubble(i)}
                    className={`tw-bubble ${isActive ? "active" : ""}`}
                    style={{ ...pos, borderColor: color }}
                  >
                    <span className="tw-bubble-index" style={{ borderColor: color }}>
                      {i + 1}
                    </span>
                    {(isActive ? draft : b.translation).split("\n").map((line, li) => (
                      <p key={li} style={isActive ? textStyle : undefined}>
                        {line}
                      </p>
                    ))}
                    <span className="tw-bubble-tail" style={{ borderColor: color }} />
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        {/* Toggle: collapse / expand right panel */}
        <div className="tw-panel-toggle-col">
          <button
            type="button"
            className="tw-panel-collapse-btn"
            onClick={() => setRightPanelOpen((v) => !v)}
            title={rightPanelOpen ? "Ẩn panel bên phải" : "Hiện panel bên phải"}
          >
            {rightPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Right panel */}
        <aside className={`tw-rightpanel ${!rightPanelOpen ? "tw-rightpanel-collapsed" : ""}`}>
          <div className="tw-tabs">
            {[
              { id: "translate", label: "Translate" },
              { id: "glossary", label: "Glossary" },
              { id: "chat", label: "Chat" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`tw-tab ${activeTab === t.id ? "active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "translate" && (
            <div className="tw-tabpanel">
              <div className="tw-bubble-nav-row">
                <span>
                  BUBBLE {String(activeBubble + 1).padStart(2, "0")} / {String(bubbles.length).padStart(2, "0")}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => selectBubble(Math.max(0, activeBubble - 1))}
                    className="tw-btn"
                    style={{ padding: 6 }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() =>
                      selectBubble(Math.min(bubbles.length - 1, activeBubble + 1))
                    }
                    className="tw-btn"
                    style={{ padding: 6 }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div>
                <p className="tw-section-label" style={{ color: "#E38058" }}>
                  <span className="tw-dot" style={{ background: "#C1440E" }} /> SOURCE TEXT
                </p>
                <div className="tw-card">{bubble.source}</div>
                <p className="tw-caption">JAPANESE · DETECTED</p>
              </div>

              {bubble.glossary.length > 0 && (
                <div>
                  <p className="tw-section-label" style={{ color: "#7C93C9" }}>
                    <span className="tw-dot" style={{ background: "#5472B0" }} /> GLOSSARY MATCHES
                  </p>
                  <div className="tw-glossary-list">
                    {bubble.glossary.map((g, gi) => (
                      <div key={gi} className="tw-glossary-row">
                        <span style={{ color: "#C7C9D6" }}>{g.from}</span>
                        <span style={{ color: "#7C93C9" }}>→ {g.to}</span>
                        <span className="tw-caption" style={{ margin: 0 }}>{g.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="tw-translation-block">
                <p className="tw-caption" style={{ marginBottom: 8, marginTop: 0 }}>TRANSLATION</p>
                <div className="tw-translation-toolbar">
                  <select className="tw-select">
                    <option>Inter</option>
                  </select>
                  <select
                    className="tw-select"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                  >
                    {[11, 12, 13, 14, 16, 18, 20, 24].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="tw-toolbar-divider" />
                  <button
                    type="button"
                    onClick={() => setIsBold((v) => !v)}
                    className={`tw-btn-icon ${isBold ? "active" : ""}`}
                    title="In đậm"
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsItalic((v) => !v)}
                    className={`tw-btn-icon ${isItalic ? "active" : ""}`}
                    title="In nghiêng"
                  >
                    <Italic size={13} />
                  </button>
                  <div className="tw-toolbar-divider" />
                  <button
                    type="button"
                    onClick={() => setTextAlign("left")}
                    className={`tw-btn-icon ${textAlign === "left" ? "active" : ""}`}
                    title="Canh trái"
                  >
                    <AlignLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign("center")}
                    className={`tw-btn-icon ${textAlign === "center" ? "active" : ""}`}
                    title="Canh giữa"
                  >
                    <AlignCenter size={13} />
                  </button>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="tw-textarea"
                  style={textStyle}
                />
                <div className="tw-textarea-footer">
                  <span>{draft.length} CHARS</span>
                  <span className="saved">
                    <Check size={12} strokeWidth={3} /> AUTO-SAVED
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  selectBubble(Math.min(bubbles.length - 1, activeBubble + 1))
                }
                className="tw-save-next-btn"
              >
                Save and next →
              </button>
            </div>
          )}

          {activeTab === "glossary" && (
            <div className="tw-tabpanel">
              <p style={{ color: "#8286A0", margin: 0 }}>
                Project-wide glossary terms would list here — names, honorifics,
                and recurring phrases with their approved translations.
              </p>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="tw-placeholder">
              <MessageSquare size={24} />
              <p style={{ margin: 0 }}>Ask about tone, context, or phrasing for this page.</p>
            </div>
          )}

          <div className="tw-panel-footer">
            <button className="tw-help-btn">
              <HelpCircle size={14} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}