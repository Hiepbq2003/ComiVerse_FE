import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Link2,
  MessageSquare,
  Lightbulb,
  CircleCheck,
  Send,
  HelpCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "../../assets/style/translator/TranslateWorkspace.css";
import { API_BASE_URL as API_BASE } from "../../config/apiConfig";

const TOKEN_KEY = "token";

// =============================================================================
// Data layer — same conventions as TranslateWorkspace.jsx
// =============================================================================

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Invalid response from ${url}`);
  }
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json?.data !== undefined ? json.data : json;
}

async function fetchPagesForTask(taskId, signal) {
  try {
    const list = await fetchJson(`${API_BASE}/translate-workspace/${taskId}`, { signal });
    if (Array.isArray(list) && list.length > 0) return list;
  } catch { /* fall through */ }

  // Fallback: get chapterId from localStorage, fetch chapter pages from DB
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const chapterId = getLocalTaskChapterId(taskId);
  if (chapterId && UUID_RE.test(chapterId)) {
    try {
      const chapter = await fetchJson(`${API_BASE}/chapters/detail/${chapterId}`, { signal });
      const rawPages = chapter?.pages || chapter?.images || [];
      if (Array.isArray(rawPages) && rawPages.length > 0) {
        return rawPages.map((item, idx) => ({
          id: item?.id || `p-${idx + 1}`,
          pageId: item?.id || `p-${idx + 1}`,
          pageNumber: item?.pageNumber || idx + 1,
          imageUrl: typeof item === 'string' ? item : (item?.imageUrl || item?.url || item?.pageUrl),
          bubbles: item?.bubbles || []
        }));
      }
    } catch { /* fall through */ }
  }
  return [];
}

function getLocalTaskChapterId(taskId) {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('comiverse_tasks_')) {
      try {
        const tasks = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(tasks)) {
          const match = tasks.find(t => String(t.id) === String(taskId));
          if (match?.chapterId) return match.chapterId;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

async function fetchChapterForTask(taskId, signal) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // 1. Primary: get task from backend
  try {
    const task = await fetchJson(`${API_BASE}/team-workspace/tasks/${taskId}`, { signal });
    const chapterId = task?.chapterId ?? task?.chapter_id ?? task?.data?.chapterId;
    if (chapterId) {
      const chapter = await fetchJson(`${API_BASE}/chapters/detail/${chapterId}`, { signal });
      let comicTitle = null;
      if (chapter?.comicId) {
        try {
          const comic = await fetchJson(`${API_BASE}/comics/${chapter.comicId}`, { signal });
          comicTitle = comic?.title ?? comic?.name ?? null;
        } catch {
          /* non-fatal */
        }
      }
      return { ...chapter, comicTitle };
    }
  } catch (err) {
    console.warn(`[Translationreview] Task API failed for ${taskId}:`, err?.message);
  }

  // 2. Fallback: get chapterId from localStorage, fetch chapter detail from DB
  const chapterId = getLocalTaskChapterId(taskId);
  if (chapterId && UUID_RE.test(chapterId)) {
    try {
      const chapter = await fetchJson(`${API_BASE}/chapters/detail/${chapterId}`, { signal });
      let comicTitle = null;
      if (chapter?.comicId) {
        try {
          const comic = await fetchJson(`${API_BASE}/comics/${chapter.comicId}`, { signal });
          comicTitle = comic?.title ?? comic?.name ?? null;
        } catch { /* non-fatal */ }
      }
      return { ...chapter, comicTitle };
    } catch (chErr) {
      console.warn('[Translationreview] Fallback chapter detail fetch failed:', chErr?.message);
    }
  }

  // 3. Last resort
  return {
    id: `ch-${taskId}`,
    title: 'Chapter 1 - Translation',
    comicTitle: 'Unknown Comic',
    pagesCount: 0,
    pages: []
  };
}

async function fetchChapterReviewStatus(chapterId, signal) {
  return fetchJson(`${API_BASE}/review/chapters/${chapterId}/status`, { signal });
}

async function setChapterReviewStatus(chapterId, action) {
  return fetchJson(`${API_BASE}/review/chapters/${chapterId}/${action}`, { method: "PUT" });
}

async function fetchComments(pageId, signal) {
  const list = await fetchJson(`${API_BASE}/review/pages/${pageId}/comments`, { signal });
  return Array.isArray(list) ? list : [];
}

async function postComment(pageId, bubbleId, content) {
  return fetchJson(`${API_BASE}/review/pages/${pageId}/comments`, {
    method: "POST",
    body: JSON.stringify({ bubbleId, content }),
  });
}

async function resolveComment(commentId) {
  return fetchJson(`${API_BASE}/review/comments/${commentId}/resolve`, { method: "PUT" });
}

async function fetchSuggestions(pageId, signal) {
  const list = await fetchJson(`${API_BASE}/review/pages/${pageId}/suggestions`, { signal });
  return Array.isArray(list) ? list : [];
}

// =============================================================================
// Small presentational pieces
// =============================================================================

function Avatar({ name }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  // Deterministic color from the name, so the same person always gets the same avatar color
  const hue = [...(name || "")].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: `hsl(${hue}, 55%, 42%)`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function timeAgo(isoString) {
  if (!isoString) return "";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(isoString).toLocaleDateString();
}

function ReviewHeaderBar({
  comicTitle,
  chapterTitle,
  onBack,
  changesCount,
  syncScroll,
  onToggleSyncScroll,
  zoomScale,
  onZoomIn,
  onZoomOut,
  currentPageIndex,
  pageCount,
  onPrevPage,
  onNextPage,
  reviewStatus,
  onApprove,
  onRequestChanges,
}) {
  return (
    <header className="tw-header">
      <div className="tw-header-left">
        <button onClick={onBack} className="tw-btn">
          <ChevronLeft size={16} />
          Back to Task
        </button>
        <div className="tw-divider-v" />
        <div className="tw-project-icon">
          <CircleCheck size={16} />
        </div>
        <div>
          <p className="tw-project-title tw-font-display">Review: {chapterTitle}</p>
          <p className="tw-project-sub tw-font-mono">
            {comicTitle} · Page {currentPageIndex + 1}
          </p>
        </div>
        {changesCount > 0 && (
          <span
            className="tw-font-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(245, 158, 11, 0.4)",
              background: "rgba(245, 158, 11, 0.12)",
              color: "#f59e0b",
              fontSize: 12,
              marginLeft: 4,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
            {changesCount} {changesCount === 1 ? "change" : "changes"}
          </span>
        )}
      </div>

      <div className="tw-header-right">
        <button
          className={`tw-btn ${syncScroll ? "active" : ""}`}
          onClick={onToggleSyncScroll}
          style={syncScroll ? { borderColor: "var(--aizuri)", color: "var(--aizuri)" } : undefined}
          title="Scroll both panels together"
        >
          <Link2 size={14} /> Sync scroll
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button className="tw-btn-icon" onClick={onZoomOut} title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: 12, color: "#8286A0", width: 40, textAlign: "center" }}>
            {Math.round(zoomScale * 100)}%
          </span>
          <button className="tw-btn-icon" onClick={onZoomIn} title="Zoom in">
            <ZoomIn size={14} />
          </button>
        </div>

        <button className="tw-btn" onClick={onPrevPage} disabled={currentPageIndex === 0}>
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="tw-font-mono" style={{ fontSize: 12, color: "#8286A0" }}>
          Page {currentPageIndex + 1} / {pageCount}
        </span>
        <button className="tw-btn" onClick={onNextPage} disabled={currentPageIndex >= pageCount - 1}>
          Next <ChevronRight size={14} />
        </button>

        <div className="tw-divider-v" />

        <button
          className="tw-btn-primary"
          onClick={onApprove}
          disabled={reviewStatus === "APPROVED"}
          style={{ background: "#16a34a" }}
        >
          <Check size={14} /> {reviewStatus === "APPROVED" ? "Approved" : "Approve"}
        </button>
        <button
          className="tw-btn"
          onClick={onRequestChanges}
          style={{ borderColor: "rgba(239,68,68,0.5)", color: "#ef4444" }}
        >
          <X size={14} /> Request Changes
        </button>
      </div>
    </header>
  );
}

// Overlays translated bubbles read-only on top of the page image — no drawing/editing,
// just a visual comparison layer. Bubbles that have unresolved comments get a warning
// outline + a small badge showing how many.
function BubbleOverlay({ bubble, commentCount, isSelected, onSelect }) {
  const isRect = bubble.shape === "rect" || bubble.shape === "ellipse";
  const box = isRect
    ? { left: bubble.x, top: bubble.y, width: bubble.width, height: bubble.height }
    : (() => {
        const xs = bubble.points.map((p) => p.x);
        const ys = bubble.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        return { left: minX, top: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
      })();

  const flagged = commentCount > 0;

  return (
    <div
      onClick={() => onSelect(bubble.id)}
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        borderRadius: bubble.shape === "ellipse" ? "50%" : 6,
        border: `2px solid ${flagged ? "#f59e0b" : isSelected ? "var(--aizuri)" : "rgba(255,255,255,0.25)"}`,
        background: bubble.textBgColor ?? "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 6,
        cursor: "pointer",
        boxShadow: isSelected ? "0 0 0 3px rgba(84,114,176,0.35)" : "none",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: bubble.fontSize ?? 13,
          fontFamily: bubble.fontFamily,
          color: bubble.textColor ?? "#000000",
          textAlign: "center",
          whiteSpace: "pre-wrap",
          lineHeight: 1.25,
        }}
      >
        {bubble.translation || <span style={{ opacity: 0.4 }}>(empty)</span>}
      </p>

      {flagged && (
        <span
          className="tw-font-mono"
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            minWidth: 18,
            height: 18,
            padding: "0 4px",
            borderRadius: 999,
            background: "#f59e0b",
            color: "#12141C",
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {commentCount}
        </span>
      )}
    </div>
  );
}

function CommentCard({ comment, onResolve }) {
  return (
    <div className="tw-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <Avatar name={comment.authorName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{comment.authorName}</span>
            <span className="tw-font-mono" style={{ fontSize: 11, color: "#6C6F86" }}>
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <span
            className="tw-font-mono"
            style={{
              display: "inline-block",
              marginTop: 4,
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(84,114,176,0.15)",
              color: "var(--aizuri)",
              fontSize: 10,
            }}
          >
            Bubble #{comment.bubbleId}
          </span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-text)", whiteSpace: "pre-wrap" }}>{comment.content}</p>

      {!comment.resolved ? (
        <button
          type="button"
          onClick={() => onResolve(comment.id)}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "none",
            color: "#16a34a",
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Check size={12} /> Resolve
        </button>
      ) : (
        <span style={{ fontSize: 12, color: "#6C6F86", display: "flex", alignItems: "center", gap: 4 }}>
          <Check size={12} /> Resolved
        </span>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion }) {
  return (
    <div className="tw-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <Avatar name={suggestion.authorName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{suggestion.authorName}</span>
            <span className="tw-font-mono" style={{ fontSize: 11, color: "#6C6F86" }}>
              {timeAgo(suggestion.createdAt)}
            </span>
          </div>
          <span
            className="tw-font-mono"
            style={{
              display: "inline-block",
              marginTop: 4,
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(84,114,176,0.15)",
              color: "var(--aizuri)",
              fontSize: 10,
            }}
          >
            Bubble #{suggestion.bubbleId}
          </span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-text-hi)", fontStyle: "italic" }}>
        “{suggestion.suggestedText}”
      </p>
      {suggestion.reason && <p style={{ margin: 0, fontSize: 12, color: "#8286A0" }}>{suggestion.reason}</p>}

      {suggestion.accepted && (
        <span style={{ fontSize: 12, color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
          <Check size={12} /> Accepted
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export default function TranslationReview() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [chapterData, setChapterData] = useState(null);
  const [taskPages, setTaskPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const [reviewStatus, setReviewStatus] = useState("PENDING");
  const [comments, setComments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState("comments");
  const [selectedBubbleId, setSelectedBubbleId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [zoomScale, setZoomScale] = useState(1);
  const [syncScroll, setSyncScroll] = useState(true);

  const sourceScrollRef = useRef(null);
  const translationScrollRef = useRef(null);
  const isSyncingRef = useRef(false); // prevents the 2 scroll listeners from bouncing off each other

  // ---- Initial load: chapter + pages + review status ----
  useEffect(() => {
    if (!taskId) return;
    const controller = new AbortController();
    setStatus("loading");
    setError(null);

    fetchChapterForTask(taskId, controller.signal)
      .then(async (chapter) => {
        setChapterData(chapter);
        const pages = await fetchPagesForTask(taskId, controller.signal);
        setTaskPages(pages);
        setCurrentPageIndex(0);
        try {
          const reviewData = await fetchChapterReviewStatus(chapter.id, controller.signal);
          setReviewStatus(reviewData?.reviewStatus ?? "PENDING");
        } catch (err) {
          if (err.name !== "AbortError") console.error("Could not load review status:", err);
        }
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setStatus("error");
      });

    return () => controller.abort();
  }, [taskId]);

  const currentPage = taskPages[currentPageIndex] ?? null;

  const bubbles = useMemo(() => {
    if (!currentPage?.bubbles) return [];
    try {
      const parsed = JSON.parse(currentPage.bubbles);
      return Array.isArray(parsed) ? parsed : parsed?.selections ?? [];
    } catch {
      return [];
    }
  }, [currentPage]);

  // ---- Load comments + suggestions whenever the page changes ----
  useEffect(() => {
    if (!currentPage?.pageId) {
      setComments([]);
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    setSelectedBubbleId(null);

    fetchComments(currentPage.pageId, controller.signal)
      .then(setComments)
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Could not load comments:", err);
      });
    fetchSuggestions(currentPage.pageId, controller.signal)
      .then(setSuggestions)
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Could not load suggestions:", err);
      });

    return () => controller.abort();
  }, [currentPage?.pageId]);

  const commentCountByBubble = useMemo(() => {
    const map = {};
    for (const c of comments) {
      if (c.resolved) continue;
      map[c.bubbleId] = (map[c.bubbleId] ?? 0) + 1;
    }
    return map;
  }, [comments]);

  const changesCount = useMemo(
    () => comments.filter((c) => !c.resolved).length + suggestions.filter((s) => !s.accepted).length,
    [comments, suggestions]
  );

  // ---- Scroll sync between the 2 panels ----
  const handlePanelScroll = useCallback(
    (sourcePanel, targetRef) => (e) => {
      if (!syncScroll || isSyncingRef.current) return;
      const target = targetRef.current;
      if (!target) return;
      isSyncingRef.current = true;
      target.scrollTop = e.target.scrollTop;
      target.scrollLeft = e.target.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    },
    [syncScroll]
  );

  // ---- Actions ----
  const handleApprove = useCallback(async () => {
    if (!chapterData?.id) return;
    try {
      const result = await setChapterReviewStatus(chapterData.id, "approve");
      setReviewStatus(result?.reviewStatus ?? "APPROVED");
    } catch (err) {
      alert(`Could not approve: ${err.message}`);
    }
  }, [chapterData]);

  const handleRequestChanges = useCallback(async () => {
    if (!chapterData?.id) return;
    try {
      const result = await setChapterReviewStatus(chapterData.id, "request-changes");
      setReviewStatus(result?.reviewStatus ?? "CHANGES_REQUESTED");
    } catch (err) {
      alert(`Could not request changes: ${err.message}`);
    }
  }, [chapterData]);

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || selectedBubbleId == null || !currentPage?.pageId) return;
    try {
      const created = await postComment(currentPage.pageId, selectedBubbleId, replyText.trim());
      setComments((prev) => [...prev, created]);
      setReplyText("");
    } catch (err) {
      alert(`Could not post comment: ${err.message}`);
    }
  }, [replyText, selectedBubbleId, currentPage]);

  const handleResolve = useCallback(async (commentId) => {
    try {
      await resolveComment(commentId);
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, resolved: true } : c)));
    } catch (err) {
      alert(`Could not resolve comment: ${err.message}`);
    }
  }, []);

  const goToPage = useCallback(
    (index) => {
      setCurrentPageIndex((prev) => (index < 0 || index >= taskPages.length ? prev : index));
    },
    [taskPages.length]
  );

  if (status === "loading") {
    return <div className="tw-root tw-loading">Loading review…</div>;
  }
  if (status === "error") {
    return <div className="tw-root tw-loading">Loading error: {error}</div>;
  }

  return (
    <div className="tw-root">
      <ReviewHeaderBar
        comicTitle={chapterData?.comicTitle}
        chapterTitle={chapterData?.title}
        onBack={() => navigate(-1)}
        changesCount={changesCount}
        syncScroll={syncScroll}
        onToggleSyncScroll={() => setSyncScroll((v) => !v)}
        zoomScale={zoomScale}
        onZoomIn={() => setZoomScale((v) => Math.min(v + 0.25, 3))}
        onZoomOut={() => setZoomScale((v) => Math.max(v - 0.25, 0.5))}
        currentPageIndex={currentPageIndex}
        pageCount={taskPages.length}
        onPrevPage={() => goToPage(currentPageIndex - 1)}
        onNextPage={() => goToPage(currentPageIndex + 1)}
        reviewStatus={reviewStatus}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
      />

      <div className="tw-body">
        <main style={{ flex: 1, minWidth: 0, display: "flex", overflow: "hidden" }}>
          {/* ---- Left: original source image, no bubbles ---- */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, borderRight: "1px solid var(--ink-line-soft)" }}>
            <p className="tw-caption" style={{ textAlign: "center", padding: "10px 0 0", letterSpacing: "0.05em" }}>
              ORIGINAL (SOURCE)
            </p>
            <div
              ref={sourceScrollRef}
              onScroll={handlePanelScroll("source", translationScrollRef)}
              style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: 24 }}
            >
              {currentPage?.imageUrl ? (
                <img
                  src={currentPage.imageUrl}
                  alt="Original source"
                  draggable={false}
                  style={{ width: `${zoomScale * 100}%`, height: "auto", flexShrink: 0 }}
                />
              ) : (
                <div style={{ color: "#8286A0", padding: 40 }}>No image for this page.</div>
              )}
            </div>
          </div>

          {/* ---- Center divider: sync indicator ---- */}
          <div
            style={{
              width: 0,
              position: "relative",
              zIndex: 3,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 60,
                left: -16,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: syncScroll ? "var(--aizuri)" : "var(--ink-900)",
                border: "1px solid var(--ink-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: syncScroll ? "var(--ink-950)" : "#8286A0",
              }}
              title={syncScroll ? "Scroll sync is ON" : "Scroll sync is OFF"}
            >
              <Link2 size={14} />
            </div>
          </div>

          {/* ---- Right: translation, bubbles overlaid read-only ---- */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <p
              className="tw-caption"
              style={{ textAlign: "center", padding: "10px 0 0", letterSpacing: "0.05em", color: "var(--aizuri)" }}
            >
              CURRENT TRANSLATION
            </p>
            <div
              ref={translationScrollRef}
              onScroll={handlePanelScroll("translation", sourceScrollRef)}
              style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: 24 }}
            >
              {currentPage?.imageUrl ? (
                <div style={{ position: "relative", width: `${zoomScale * 100}%`, flexShrink: 0 }}>
                  <img src={currentPage.imageUrl} alt="Translated page" draggable={false} style={{ width: "100%", height: "auto", display: "block" }} />
                  {bubbles.map((bubble) => (
                    <BubbleOverlay
                      key={bubble.id}
                      bubble={bubble}
                      commentCount={commentCountByBubble[bubble.id] ?? 0}
                      isSelected={selectedBubbleId === bubble.id}
                      onSelect={setSelectedBubbleId}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ color: "#8286A0", padding: 40 }}>No image for this page.</div>
              )}
            </div>
          </div>
        </main>

        {/* ---- Right sidebar: Comments / Suggestions ---- */}
        <aside className="tw-rightpanel">
          <div className="tw-tabs">
            <button className={`tw-tab ${activeTab === "comments" ? "active" : ""}`} onClick={() => setActiveTab("comments")}>
              <MessageSquare size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
              Comments {comments.length > 0 && `(${comments.length})`}
            </button>
            <button className={`tw-tab ${activeTab === "suggestions" ? "active" : ""}`} onClick={() => setActiveTab("suggestions")}>
              <Lightbulb size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
              Suggestions {suggestions.length > 0 && `(${suggestions.length})`}
            </button>
          </div>

          <div className="tw-tabpanel">
            {activeTab === "comments" && (
              <>
                {comments.length === 0 ? (
                  <p style={{ color: "#8286A0", fontSize: 13, margin: 0 }}>No comments on this page yet.</p>
                ) : (
                  comments.map((c) => <CommentCard key={c.id} comment={c} onResolve={handleResolve} />)
                )}

                <div className="tw-translation-block">
                  <p className="tw-caption" style={{ marginBottom: 8, marginTop: 0 }}>
                    {selectedBubbleId != null ? `REPLY TO BUBBLE #${selectedBubbleId}` : "SELECT A BUBBLE TO COMMENT"}
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                      placeholder={selectedBubbleId != null ? "Reply…" : "Click a bubble on the right first"}
                      disabled={selectedBubbleId == null}
                      className="tw-textarea"
                      style={{ minHeight: "auto", padding: "8px 12px" }}
                    />
                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={selectedBubbleId == null || !replyText.trim()}
                      className="tw-btn-primary"
                      style={{ padding: "0 14px" }}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "suggestions" && (
              <>
                {suggestions.length === 0 ? (
                  <p style={{ color: "#8286A0", fontSize: 13, margin: 0 }}>No suggestions on this page yet.</p>
                ) : (
                  suggestions.map((s) => <SuggestionCard key={s.id} suggestion={s} />)
                )}
              </>
            )}
          </div>

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