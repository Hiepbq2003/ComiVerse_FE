import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Maximize2,
  Upload,
  Save,
  Send,
  MessageSquare,
  BookMarked,
  HelpCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../assets/style/translator/TranslateWorkspace.css";

const API_BASE = "http://localhost:8081/api";
const TOKEN_KEY = "token";

// Static sidebar mock data — replace with a real API call when the
// project-files endpoint is ready.
const STATIC_CHAPTERS = [
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

const TABS = [
  { id: "translate", label: "Translate" },
  { id: "glossary", label: "Glossary" },
  { id: "chat", label: "Chat" },
];

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

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

function ChapterList({ chapters, open, onToggle }) {
  return (
    <>
      {chapters.map((ch) => (
        <div key={ch.id}>
          <button onClick={() => onToggle(ch.id)} className="tw-chapter-row">
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
            ch.pages.map((p) => (
              <button key={p.id} className="tw-page-row">
                <span className="tw-page-row-inner">
                  <PageStatusDot status={p.status} />
                  Page {p.id}
                </span>
              </button>
            ))}
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Data layer — isolated so the component itself stays about rendering
// ---------------------------------------------------------------------------

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchJson(url, signal) {
  const res = await fetch(url, { headers: authHeaders(), signal });
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Phản hồi không hợp lệ từ ${url}`);
  }

  // eslint-disable-next-line no-console
  console.log(`[fetchJson] ${url} →`, json);

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Yêu cầu thất bại (${res.status})`);
  }

  // Some endpoints wrap the payload in { success, data }, others return the
  // payload directly at the top level. Handle both.
  return json?.data !== undefined ? json.data : json;
}

async function fetchChapterForTask(taskId, signal) {
  const task = await fetchJson(`${API_BASE}/team-workspace/tasks/${taskId}`, signal);

  const chapterId =
    task?.chapterId ??
    task?.chapter_id ??
    task?.data?.chapterId ??
    task?.task?.chapterId ??
    (Array.isArray(task) ? task[0]?.chapterId : undefined);

  if (!chapterId) {
    throw new Error(
      `Task does not have a chapterId. Check the console log "[fetchJson]" to see the actual structure of the response.`
    );
  }

  const chapter = await fetchJson(`${API_BASE}/chapters/detail/${chapterId}`, signal);

  
  let comicTitle = null;
  if (chapter?.comicId) {
    try {
      const comic = await fetchJson(`${API_BASE}/comics/${chapter.comicId}`, signal);
      comicTitle = comic?.title ?? comic?.name ?? null;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Unable to fetch comic title:", err);
      }
    }
  }

  return { ...chapter, comicTitle };
}

// Normalizes whatever shape `images` comes back as (array of strings, or
// array of { url }) into a flat array of URL strings.
function normalizeImages(chapterData) {
  const raw = chapterData?.images || [];
  return raw.map((item) => (typeof item === "string" ? item : item?.url)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TranslateWorkspace() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [chapterData, setChapterData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [activeTab, setActiveTab] = useState("translate");
  const [open, setOpen] = useState(() =>
    Object.fromEntries(STATIC_CHAPTERS.map((c) => [c.id, c.expanded]))
  );
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [fontSize] = useState(13);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState("left");
  const [draft, setDraft] = useState("");

  const textStyle = useMemo(
    () => ({
      fontSize: `${fontSize}px`,
      fontWeight: isBold ? 700 : 400,
      fontStyle: isItalic ? "italic" : "normal",
      textAlign,
    }),
    [fontSize, isBold, isItalic, textAlign]
  );

  // Load chapter data whenever the taskId changes. AbortController prevents
  // a slow request from an old taskId overwriting the state for a new one.
  useEffect(() => {
    if (!taskId) return;

    const controller = new AbortController();

    setStatus("loading");
    setError(null);

    fetchChapterForTask(taskId, controller.signal)
      .then((data) => {
        setChapterData(data);
        setCurrentPageIndex(0);
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error loading chapter:", err);
        setError(err.message);
        setStatus("error");
      });

    return () => controller.abort();
  }, [taskId]);

  const images = useMemo(() => normalizeImages(chapterData), [chapterData]);
  const currentImage = images[currentPageIndex];

  const goToPage = useCallback(
    (index) => {
      setCurrentPageIndex((prev) => {
        if (index < 0 || index >= images.length) return prev;
        return index;
      });
    },
    [images.length]
  );

  const toggleChapter = useCallback((id) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  }, []);

  const gotoProjectList = useCallback(() => {
    navigate("/translator/dashboard");
  }, [navigate]);

  if (status === "loading") {
    return <div className="tw-root tw-loading">Loading chapter…</div>;
  }

  if (status === "error") {
    return (
      <div className="tw-root tw-loading">
        Loading error: {error}
      </div>
    );
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
            <p className="tw-project-title tw-font-display">
              {chapterData?.comicTitle}
            </p>
            <p className="tw-project-sub tw-font-mono">
              {chapterData?.title}
            </p>
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
          <ChapterList chapters={STATIC_CHAPTERS} open={open} onToggle={toggleChapter} />
        </aside>

        {/* Center: page viewer */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div className="tw-canvas-toolbar">
            <div className="tw-toolbar-group">
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
            </div>

            <div className="tw-page-nav">
              <span>
                PAGE {images.length ? currentPageIndex + 1 : 0} / {images.length}
              </span>
              <button
                className="tw-page-nav-btn"
                onClick={() => goToPage(currentPageIndex - 1)}
                disabled={currentPageIndex === 0}
              >
                Prev
              </button>
              <button
                className="tw-page-nav-btn"
                onClick={() => goToPage(currentPageIndex + 1)}
                disabled={currentPageIndex >= images.length - 1}
              >
                Next <ChevronRight size={14} />
              </button>
              <Maximize2 size={16} style={{ marginLeft: 4 }} />
            </div>
          </div>

          {/* Page canvas */}
          <div className="tw-canvas">
            <div className="tw-page">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={`Page ${currentPageIndex + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div style={{ padding: 24, color: "#8286A0" }}>
                  Chapter này chưa có ảnh nào.
                </div>
              )}
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
            {TABS.map((t) => (
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
              <div className="tw-translation-block">
                <p className="tw-caption" style={{ marginBottom: 8, marginTop: 0 }}>
                  TRANSLATION
                </p>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="tw-textarea"
                  style={textStyle}
                  placeholder="Nhập bản dịch cho trang này..."
                />
                <div className="tw-textarea-footer">
                  <span>{draft.length} CHARS</span>
                </div>
              </div>

              <button
                onClick={() => {
                  goToPage(currentPageIndex + 1);
                  setDraft("");
                }}
                className="tw-save-next-btn"
              >
                Save and next →
              </button>
            </div>
          )}

          {activeTab === "glossary" && (
            <div className="tw-tabpanel">
              <p style={{ color: "#8286A0", margin: 0 }}>
                Project-wide glossary terms would list here.
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