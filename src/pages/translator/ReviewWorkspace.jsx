import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Layers,
  Link2,
  Link2Off,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MessageSquare,
  HelpCircle,
  Send,
  X,
  Trash2,
  Pencil,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "../../assets/style/translator/review-workspace.css";
import { API_BASE_URL as API_BASE } from "../../config/apiConfig";

const TOKEN_KEY = "token";

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

async function fetchTaskAndChapter(taskId, signal) {
  const task = await fetchJson(`${API_BASE}/team-workspace/tasks/${taskId}`, { signal });
  const chapterId =
    task?.chapter?.id ??
    task?.chapterId ??
    task?.chapter_id ??
    (Array.isArray(task) ? task[0]?.chapterId : undefined);

  let chapterTitle = null;
  let comicTitle = null;
  if (chapterId) {
    try {
      const chapter = await fetchJson(`${API_BASE}/chapters/detail/${chapterId}`, { signal });
      chapterTitle = chapter?.title ?? null;
      if (chapter?.comicId) {
        const comic = await fetchJson(`${API_BASE}/comics/${chapter.comicId}`, { signal });
        comicTitle = comic?.title ?? comic?.name ?? null;
      }
    } catch {}
  }

  return {
    chapterTitle,
    comicTitle,
    projectTeamId: task?.projectTeamId ?? null,
  };
}

async function fetchReviewPages(taskId, signal) {
  const list = await fetchJson(`${API_BASE}/review-workspace/${taskId}`, { signal });
  return Array.isArray(list) ? list : [];
}

async function fetchComments(pageId, signal) {
  const list = await fetchJson(`${API_BASE}/review-workspace/pages/${pageId}/comments`, { signal });
  return Array.isArray(list) ? list : [];
}

async function postComment(pageId, payload) {
  return fetchJson(`${API_BASE}/review-workspace/pages/${pageId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function updateCommentApi(commentId, content) {
  return fetchJson(`${API_BASE}/review-workspace/comments/${commentId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

async function deleteCommentApi(commentId) {
  return fetchJson(`${API_BASE}/review-workspace/comments/${commentId}`, {
    method: "DELETE",
  });
}

async function resolveComment(commentId) {
  return fetchJson(`${API_BASE}/review-workspace/comments/${commentId}/resolve`, {
    method: "PUT",
  });
}

async function submitDecision(taskId, decision) {
  return fetchJson(`${API_BASE}/review-workspace/tasks/${taskId}/decision`, {
    method: "PUT",
    body: JSON.stringify({ decision }),
  });
}

function getBoundingBox(selection) {
  if (selection.shape === "polygon" && selection.points?.length) {
    const xs = selection.points.map((p) => p.x);
    const ys = selection.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
  }
  return { x: selection.x, y: selection.y, width: selection.width, height: selection.height };
}

function parseBubblesPayload(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed?.selections) ? parsed.selections : [];
  } catch {
    return [];
  }
}

function computeChangedFlags(currentSelections, baselineSelections) {
  if (!baselineSelections || baselineSelections.length === 0) {
    return currentSelections.map(() => false);
  }
  const baselineById = new Map(baselineSelections.map((b) => [b.id, b]));
  return currentSelections.map((sel) => {
    const base = baselineById.get(sel.id);
    if (!base) return true;
    return (sel.translation ?? "") !== (base.translation ?? "");
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ initials }) {
  return <div className="rvw-avatar">{initials}</div>;
}

function Bubble({ id, box, index, text, changed, selected, showText, fontSizePx, bgColor, textColor, shape, points, onClick }) {
  const shapeClass = shape === "ellipse" ? "rvw-bubble--ellipse" : shape === "polygon" ? "rvw-bubble--polygon" : "";

  const clipPath =
    shape === "polygon" && Array.isArray(points) && points.length > 0 && box.width > 0 && box.height > 0
      ? `polygon(${points
          .map((p) => `${((p.x - box.x) / box.width) * 100}% ${((p.y - box.y) / box.height) * 100}%`)
          .join(", ")})`
      : undefined;

  return (
    <div
      onClick={onClick}
      data-bubble-id={id}
      className={`rvw-bubble ${shapeClass} ${changed ? "rvw-bubble--changed" : ""} ${selected ? "rvw-bubble--selected" : ""} ${showText ? "rvw-bubble--text-only" : "rvw-bubble--outline-only"}`}
      style={{
        "--x": `${box.x}%`,
        "--y": `${box.y}%`,
        "--w": `${box.width}%`,
        "--h": `${box.height}%`,
        ...(clipPath ? { clipPath } : {}),
        ...(fontSizePx ? { fontSize: `${fontSizePx}px` } : {}),
        ...(showText && bgColor ? { "--bg-color": bgColor } : {}),
        ...(showText && textColor ? { "--text-color": textColor } : {}),
      }}
    >
      {!showText && <span className="rvw-bubble-index">{index}</span>}
      {changed && <span className="rvw-bubble-alert">!</span>}
      {showText && text}
    </div>
  );
}

function CommentThread({ comment, onResolve, onDelete, onUpdate, currentUserId, resolveBubbleLabel }) {
  const isOwner = comment.authorId === currentUserId;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content ?? "");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(comment.content ?? "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(comment.content ?? "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      await onUpdate(comment.id, draft.trim());
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rvw-comment">
      <Avatar initials={comment.authorInitials} />
      <div className="rvw-comment-body">
        <div className="rvw-comment-header">
          <span className="rvw-comment-author">{comment.authorName}</span>
          <div className="rvw-comment-header-right">
            <span className="rvw-comment-time">{formatTime(comment.createdAt)}</span>
            {isOwner && !isEditing && (
              <>
                <button type="button" onClick={startEdit} className="rvw-delete-btn" title="Edit comment">
                  <Pencil size={12} />
                </button>
                <button type="button" onClick={() => onDelete(comment.id)} className="rvw-delete-btn" title="Delete comment">
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") cancelEdit();
            }}
            rows={2}
            autoFocus
            className="rvw-comment-text rvw-comment-text--editable"
          />
        ) : (
          <p className="rvw-comment-text">{comment.content}</p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!isEditing && !comment.resolved && (
            <button type="button" onClick={() => onResolve(comment.id)} className="rvw-resolve-btn">
              <CheckCircle2 size={13} /> Resolve
            </button>
          )}

          {!isEditing && comment.resolved && (
            <span className="rvw-resolved-tag">
              <CheckCircle2 size={12} /> Resolved
            </span>
          )}

          {isEditing && (
            <>
              <button type="button" onClick={handleSave} disabled={saving || !draft.trim()} className="rvw-resolve-btn">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={cancelEdit} className="rvw-delete-btn" style={{ fontSize: "12px" }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedBubblePreview({ index, translation, onClear, onPrev, onNext }) {
  return (
    <div className="rvw-selected-preview">
      <div className="rvw-selected-preview-header">
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button type="button" onClick={onPrev} className="rvw-selected-preview-close" title="Previous bubble">
            <ChevronLeft size={14} />
          </button>
          <span className="rvw-selected-preview-title">Bubble {index}</span>
          <button type="button" onClick={onNext} className="rvw-selected-preview-close" title="Next bubble">
            <ChevronRight size={14} />
          </button>
        </div>
        <button type="button" onClick={onClear} className="rvw-selected-preview-close">
          <X size={13} />
        </button>
      </div>
      <p className="rvw-selected-preview-text">{translation || "No translation entered for this bubble yet."}</p>
    </div>
  );
}

function ReviewHeader({
  chapterMeta,
  pageNumber,
  changeCount,
  onBack,
  syncScroll,
  onToggleSyncScroll,
  zoomScale,
  isPickingZoomPoint,
  onToggleZoomIn,
  onZoomOut,
  onResetZoom,
  pageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  deciding,
  isLastPage,
  onApprove,
  onRequestChanges,
}) {
  const actionsDisabled = deciding || !isLastPage;
  const actionsDisabledTitle = !isLastPage ? "Only available on the last page" : undefined;

  return (
    <header className="rvw-header">
      <div className="rvw-header-left">
        <button type="button" onClick={onBack} className="rvw-back-btn">
          <ArrowLeft size={15} /> Back to Task
        </button>

        <div className="rvw-divider-v" />

        <div className="rvw-title-group">
          <div className="rvw-title-icon">
            <Layers size={16} color="#fff" />
          </div>
          <div>
            <p className="rvw-title">Review: {chapterMeta?.chapterTitle || "Chapter"}</p>
            <p className="rvw-subtitle">
              {chapterMeta?.comicTitle || "Comic"} · Page {pageNumber}
            </p>
          </div>
        </div>

        <span className="rvw-changes-badge">{changeCount} changes</span>
      </div>

      <div className="rvw-header-right">
        <button
          type="button"
          onClick={onToggleSyncScroll}
          className={`rvw-sync-btn ${syncScroll ? "rvw-sync-btn--active" : ""}`}
        >
          {syncScroll ? <Link2 size={14} /> : <Link2Off size={14} />} Sync scroll
        </button>

        <div className={`rvw-zoom-group ${isPickingZoomPoint ? "rvw-zoom-group--active" : ""}`}>
          <button
            type="button"
            data-zoom-toggle="true"
            onClick={onToggleZoomIn}
            className={`rvw-zoom-btn ${isPickingZoomPoint ? "rvw-zoom-btn--active" : ""}`}
            title={isPickingZoomPoint ? "Click a point on the image to zoom into (Esc to cancel)" : "Zoom in (pick a point)"}
          >
            <ZoomIn size={15} />
          </button>
          <button type="button" onClick={onZoomOut} className="rvw-zoom-btn" disabled={zoomScale <= 1}>
            <ZoomOut size={15} />
          </button>
          <span
            onClick={onResetZoom}
            title="Reset zoom to 100%"
            className={`rvw-zoom-value ${zoomScale !== 1 ? "rvw-zoom-value--clickable" : ""}`}
          >
            {Math.round(zoomScale * 100)}%
          </span>
        </div>

        <div className="rvw-pagenav-group">
          <button type="button" disabled={pageIndex === 0} onClick={onPrevPage} className="rvw-pagenav-btn">
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="rvw-pagenav-sep">|</span>
          <span className="rvw-pagenav-label">
            Page {pageIndex + 1} / {totalPages}
          </span>
          <span className="rvw-pagenav-sep">|</span>
          <button
            type="button"
            disabled={pageIndex === totalPages - 1}
            onClick={onNextPage}
            className="rvw-pagenav-btn"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>

        <button
          type="button"
          disabled={actionsDisabled}
          onClick={onApprove}
          className="rvw-approve-btn"
          title={actionsDisabledTitle}
        >
          <CheckCircle2 size={15} /> Approve
        </button>

        <button
          type="button"
          disabled={actionsDisabled}
          onClick={onRequestChanges}
          className="rvw-reject-btn"
          title={actionsDisabledTitle}
        >
          <XCircle size={15} /> Request Changes
        </button>
      </div>
    </header>
  );
}

function BubbleOverlayPanel({
  scrollRef,
  onScroll,
  frameRef,
  zoomScale,
  isPickingZoomPoint,
  onFrameMouseDown,
  imageUrl,
  pageIndex,
  labelText,
  labelClassName,
  selections,
  changedFlags,
  showText,
  frameHeight,
  selectedBubbleId,
  onSelectBubble,
}) {
  const imgRef = useRef(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  // Measure the ACTUAL rendered <img> box in pixels, rather than assuming
  // it fills 100% of its parent frame. This is what guarantees bubbles
  // stay pinned to the real artwork even if some other CSS rule in the
  // app (outside review-workspace.css) constrains the image's width —
  // whatever size the image really renders at, the overlay wrapper below
  // is sized to match it exactly.
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const measure = () => {
      setImgSize({ width: el.clientWidth, height: el.clientHeight });
    };

    if (el.complete) measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("load", measure);

    return () => {
      observer.disconnect();
      el.removeEventListener("load", measure);
    };
  }, [imageUrl]);

  const hasSize = imgSize.width > 0 && imgSize.height > 0;

  return (
    <div ref={scrollRef} onScroll={onScroll} className="rvw-panel">
      <p className={`rvw-panel-label ${labelClassName}`}>{labelText}</p>
      <div
        ref={frameRef}
        onMouseDown={(e) => {
          const handled = onFrameMouseDown(e, frameRef.current, scrollRef.current);
          if (handled) e.stopPropagation();
        }}
        className={`rvw-panel-frame ${isPickingZoomPoint ? "rvw-panel-frame--zoom-picking" : ""}`}
        style={{ "--zoom-scale": zoomScale }}
      >
        {imageUrl ? (
          <div style={{ position: "relative" }}>
            <img
              ref={imgRef}
              src={imageUrl}
              alt={`Page ${pageIndex + 1} ${labelText}`}
              className="rvw-panel-image"
              draggable={false}
              onLoad={() => {
                const el = imgRef.current;
                if (el) setImgSize({ width: el.clientWidth, height: el.clientHeight });
              }}
            />
            {hasSize && !isPickingZoomPoint && (
              <div
                className="rvw-bubble-overlay"
                style={{ position: "absolute", top: 0, left: 0, width: imgSize.width, height: imgSize.height }}
              >
                {selections.map((sel, i) => {
                  const fontSizePx =
                    showText && typeof sel.fontSize === "number" && frameHeight > 0
                      ? (sel.fontSize / 100) * frameHeight
                      : undefined;
                  return (
                    <Bubble
                      key={sel.id}
                      id={sel.id}
                      box={getBoundingBox(sel)}
                      index={i + 1}
                      text={sel.translation || ""}
                      changed={showText && changedFlags[i]}
                      showText={showText}
                      fontSizePx={fontSizePx}
                      bgColor={sel.textBgColor}
                      textColor={sel.textColor}
                      shape={sel.shape}
                      points={sel.points}
                      selected={selectedBubbleId === sel.id}
                      onClick={() => onSelectBubble(selectedBubbleId === sel.id ? null : sel.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="rvw-panel-empty">No image for this page.</div>
        )}
      </div>
    </div>
  );
}

function CommentsSidebar({
  comments,
  generalComments,
  totalCommentCount,
  commentsLoading,
  onResolve,
  onDelete,
  onUpdate,
  currentUserId,
  resolveBubbleLabel,
  composeValue,
  onComposeChange,
  onPostComment,
  selectedBubbleId,
  selectedBubbleIndex,
  selectedBubbleTranslation,
  onClearSelectedBubble,
  onPrevBubble,
  onNextBubble,
  bubbleAlreadyHasComment,
  generalComposeValue,
  onGeneralComposeChange,
  onPostGeneralComment,
  alreadyHasGeneralComment,
}) {
  return (
    <aside className="rvw-sidebar">
      <div className="rvw-sidebar-header">
        <MessageSquare size={16} color="#a855f7" />
        <span className="rvw-sidebar-title">Comments</span>
        <span className="rvw-sidebar-count">{totalCommentCount}</span>
      </div>

      {selectedBubbleId != null && (
        <SelectedBubblePreview
          index={selectedBubbleIndex}
          translation={selectedBubbleTranslation}
          onClear={onClearSelectedBubble}
          onPrev={onPrevBubble}
          onNext={onNextBubble}
        />
      )}

      <div>
        {commentsLoading && selectedBubbleId != null && (
          <p className="rvw-sidebar-empty">Loading comments…</p>
        )}
        {!commentsLoading && selectedBubbleId == null && (
          <p className="rvw-sidebar-empty">Select a bubble on the translated image to view its comment.</p>
        )}
        {!commentsLoading && selectedBubbleId != null && comments.length === 0 && (
          <p className="rvw-sidebar-empty">No comment on this bubble yet.</p>
        )}
        {comments.map((c) => (
          <CommentThread
            key={c.id}
            comment={c}
            onResolve={onResolve}
            onDelete={onDelete}
            onUpdate={onUpdate}
            currentUserId={currentUserId}
            resolveBubbleLabel={resolveBubbleLabel}
          />
        ))}
      </div>

      {/* Only for composing a BRAND NEW comment on a bubble that doesn't
          already have one — once it does, editing happens inline on the
          CommentThread above, so this whole block (including the
          "select a bubble..." messaging) is hidden entirely rather than
          showing a placeholder that no longer applies. */}
      {!bubbleAlreadyHasComment && (
        <div className="rvw-composer">
          {selectedBubbleId == null && (
            <p className="rvw-sidebar-empty" style={{ padding: "0 0 8px" }}>
              Select a bubble on the translated image to leave a comment.
            </p>
          )}
          <div className="rvw-composer-row rvw-composer-row--wrap">
            <textarea
              value={composeValue}
              onChange={(e) => onComposeChange(e.target.value)}
              placeholder={selectedBubbleId != null ? `Comment on bubble ${selectedBubbleIndex}...` : "Select a bubble first..."}
              className="rvw-composer-input rvw-composer-textarea"
              rows={2}
              disabled={selectedBubbleId == null}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onPostComment();
                }
              }}
            />
            <button
              type="button"
              onClick={onPostComment}
              className="rvw-composer-send-btn"
              disabled={selectedBubbleId == null}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="rvw-general-comments" style={{ borderTop: "1px solid #212129" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "#8a8a99", margin: "10px 16px 6px" }}>
          Page-level review
        </p>

        {generalComments && generalComments.length > 0 && (
          <div style={{ flex: "0 0 auto", maxHeight: "220px" }}>
            {generalComments.map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                onResolve={onResolve}
                onDelete={onDelete}
                onUpdate={onUpdate}
                currentUserId={currentUserId}
                resolveBubbleLabel={resolveBubbleLabel}
              />
            ))}
          </div>
        )}

        {!alreadyHasGeneralComment && (
          <div className="rvw-composer-row rvw-composer-row--wrap" style={{ padding: "0 16px 12px" }}>
            <textarea
              value={generalComposeValue}
              onChange={(e) => onGeneralComposeChange(e.target.value)}
              placeholder="Overall feedback for this page..."
              className="rvw-composer-input rvw-composer-textarea"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onPostGeneralComment();
                }
              }}
            />
            <button type="button" onClick={onPostGeneralComment} className="rvw-composer-send-btn">
              <Send size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function HelpButton({ style }) {
  return (
    <div className="rvw-help-btn" style={style}>
      <HelpCircle size={16} />
    </div>
  );
}

function useElementHeight(ref) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    let observer;
    let rafId;

    const attach = () => {
      const el = ref.current;
      if (!el) {
        rafId = requestAnimationFrame(attach);
        return;
      }
      setHeight(el.offsetHeight);
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setHeight(entry.contentRect.height);
        }
      });
      observer.observe(el);
    };

    attach();

    return () => {
      if (observer) observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [ref]);

  return height;
}

function useSyncScroll(enabled) {
  const originalRef = useRef(null);
  const translatedRef = useRef(null);
  const isSyncingRef = useRef(false);

  const handleScroll = useCallback(
    (source) => (e) => {
      if (!enabled || isSyncingRef.current) return;
      const target = source === "original" ? translatedRef.current : originalRef.current;
      if (!target) return;
      isSyncingRef.current = true;
      target.scrollTop = e.target.scrollTop;
      target.scrollLeft = e.target.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    },
    [enabled]
  );

  return { originalRef, translatedRef, handleScroll };
}

function useReviewZoom() {
  const ZOOM_STEP = 1.5;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 6;

  const [zoomScale, setZoomScale] = useState(1);
  const [isPickingZoomPoint, setIsPickingZoomPoint] = useState(false);

  // Refs to each scroll container so we can centre on the click point after zoom
  const panelScrollRefs = useRef([]);

  const toggleZoomIn = () => setIsPickingZoomPoint((v) => !v);
  const cancelZoomPick = () => setIsPickingZoomPoint(false);

  const zoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(ZOOM_MIN, prev / ZOOM_STEP);
      return next;
    });
  };

  const resetZoom = () => {
    setZoomScale(1);
    setIsPickingZoomPoint(false);
    // Reset scroll to top-left
    panelScrollRefs.current.forEach((el) => {
      if (el) { el.scrollTop = 0; el.scrollLeft = 0; }
    });
  };

  const handleFrameMouseDown = (e, frameEl, scrollEl) => {
    if (!isPickingZoomPoint || !frameEl) return false;
    const bounds = frameEl.getBoundingClientRect();
    // fraction of the frame where the user clicked
    const fracX = (e.clientX - bounds.left) / bounds.width;
    const fracY = (e.clientY - bounds.top) / bounds.height;

    setZoomScale((prev) => {
      const next = Math.min(ZOOM_MAX, prev * ZOOM_STEP);
      // After the state update re-render widens the frame, scroll so the
      // clicked point stays roughly centred in the viewport.
      requestAnimationFrame(() => {
        panelScrollRefs.current.forEach((el) => {
          if (!el) return;
          const newFrameW = el.scrollWidth;
          const newFrameH = el.scrollHeight;
          el.scrollLeft = fracX * newFrameW - el.clientWidth / 2;
          el.scrollTop  = fracY * newFrameH - el.clientHeight / 2;
        });
      });
      return next;
    });
    return true;
  };

  return {
    zoomScale,
    isPickingZoomPoint,
    toggleZoomIn,
    cancelZoomPick,
    zoomOut,
    resetZoom,
    handleFrameMouseDown,
    panelScrollRefs,
  };
}

function useReviewData(taskId) {
  const [chapterMeta, setChapterMeta] = useState(null);
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!taskId) return;
    const controller = new AbortController();
    setStatus("loading");
    setError(null);

    Promise.all([fetchTaskAndChapter(taskId, controller.signal), fetchReviewPages(taskId, controller.signal)])
      .then(([meta, pagesResult]) => {
        setChapterMeta(meta);
        setPages(pagesResult);
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setStatus("error");
      });

    return () => controller.abort();
  }, [taskId]);

  return { chapterMeta, pages, status, error };
}

function usePageComments(pageId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pageId) {
      setComments([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchComments(pageId, controller.signal)
      .then(setComments)
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Failed to load comments:", err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [pageId]);

  return { comments, setComments, loading };
}

export default function ReviewWorkspace() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.userId ?? null;

  const { chapterMeta, pages, status, error } = useReviewData(taskId);

  const [pageIndex, setPageIndex] = useState(0);
  const currentPage = pages[pageIndex] ?? null;
  const isLastPage = pages.length > 0 && pageIndex === pages.length - 1;

  const { comments, setComments, loading: commentsLoading } = usePageComments(currentPage?.pageId);
  const [composeValue, setComposeValue] = useState("");
  const [generalComposeValue, setGeneralComposeValue] = useState("");
  const [selectedBubbleId, setSelectedBubbleId] = useState(null);

  // Scroll the active bubble into view whenever selection changes (e.g. via
  // Prev/Next or clicking a bubble). There are two panels (Original +
  // Translated) both rendering the same bubble ids, so scroll both.
  useEffect(() => {
    if (selectedBubbleId == null) return;
    const elements = document.querySelectorAll(`[data-bubble-id="${selectedBubbleId}"]`);
    elements.forEach((el) => el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }));
  }, [selectedBubbleId]);

  const [syncScroll, setSyncScroll] = useState(true);
  const [deciding, setDeciding] = useState(false);

  const { originalRef, translatedRef, handleScroll } = useSyncScroll(syncScroll);

  const {
    zoomScale,
    isPickingZoomPoint,
    toggleZoomIn,
    cancelZoomPick,
    zoomOut,
    resetZoom,
    handleFrameMouseDown,
    panelScrollRefs,
  } = useReviewZoom();

  // Register both scroll panels so resetZoom can scroll them back to origin
  const setOriginalScrollRef = useCallback((el) => {
    panelScrollRefs.current[0] = el;
  }, [panelScrollRefs]);
  const setTranslatedScrollRef = useCallback((el) => {
    panelScrollRefs.current[1] = el;
  }, [panelScrollRefs]);

  const originalFrameRef = useRef(null);
  const translatedFrameRef = useRef(null);
  const translatedFrameHeight = useElementHeight(translatedFrameRef);

  useEffect(() => {
    setComposeValue("");
    setGeneralComposeValue("");
  }, [currentPage?.pageId]);

  useEffect(() => {
    if (!isPickingZoomPoint) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") cancelZoomPick();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPickingZoomPoint, cancelZoomPick]);

  useEffect(() => {
    if (!isPickingZoomPoint) return;
    const onMouseDown = (e) => {
      if (originalFrameRef.current && originalFrameRef.current.contains(e.target)) return;
      if (translatedFrameRef.current && translatedFrameRef.current.contains(e.target)) return;
      if (e.target.closest("[data-zoom-toggle]")) return;
      cancelZoomPick();
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isPickingZoomPoint, cancelZoomPick]);

  const currentSelections = useMemo(() => parseBubblesPayload(currentPage?.bubbles), [currentPage]);
  const baselineSelections = useMemo(() => parseBubblesPayload(currentPage?.reviewBaselineBubbles), [currentPage]);
  const changedFlags = useMemo(() => computeChangedFlags(currentSelections, baselineSelections), [currentSelections, baselineSelections]);
  const changeCount = changedFlags.filter(Boolean).length;

  // Default to the first bubble on the page (instead of nothing selected)
  // whenever the page changes.
  useEffect(() => {
    setSelectedBubbleId(currentSelections.length > 0 ? currentSelections[0].id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage?.pageId]);

  const goToBubble = (direction) => {
    if (currentSelections.length === 0) return;
    const currentIndex = currentSelections.findIndex((s) => s.id === selectedBubbleId);
    let nextIndex;
    if (currentIndex === -1) {
      nextIndex = 0;
    } else if (direction === "next") {
      nextIndex = (currentIndex + 1) % currentSelections.length;
    } else {
      nextIndex = (currentIndex - 1 + currentSelections.length) % currentSelections.length;
    }
    setSelectedBubbleId(currentSelections[nextIndex].id);
  };

  useEffect(() => {
    if (selectedBubbleId == null) return;
    const scrollToBubble = (containerRef) => {
      const el = containerRef.current?.querySelector(`[data-bubble-id="${selectedBubbleId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    };
    scrollToBubble(translatedRef);
    scrollToBubble(originalRef);
  }, [selectedBubbleId, translatedRef, originalRef]);

  const resolveBubbleLabel = useCallback(
    (bubbleId) => {
      const idx = currentSelections.findIndex((s) => s.id === bubbleId);
      return idx >= 0 ? `Bubble ${idx + 1}` : "Bubble (deleted)";
    },
    [currentSelections]
  );

  const selectedBubbleIndex = useMemo(() => {
    if (selectedBubbleId == null) return null;
    const idx = currentSelections.findIndex((s) => s.id === selectedBubbleId);
    return idx >= 0 ? idx + 1 : null;
  }, [selectedBubbleId, currentSelections]);

  const selectedBubbleTranslation = useMemo(() => {
    if (selectedBubbleId == null) return "";
    const bubble = currentSelections.find((s) => s.id === selectedBubbleId);
    return bubble?.translation ?? "";
  }, [selectedBubbleId, currentSelections]);

  const displayedComments = useMemo(() => {
    if (selectedBubbleId == null) return [];
    return comments.filter((c) => c.bubbleId === selectedBubbleId);
  }, [comments, selectedBubbleId]);

  const generalComments = useMemo(() => comments.filter((c) => !c.bubbleId), [comments]);

  const alreadyHasGeneralComment = useMemo(
    () => comments.some((c) => !c.bubbleId && c.authorId === currentUserId),
    [comments, currentUserId]
  );

  const bubbleAlreadyHasComment = useMemo(() => {
    if (selectedBubbleId == null) return false;
    return comments.some((c) => c.bubbleId === selectedBubbleId && c.authorId === currentUserId);
  }, [selectedBubbleId, comments, currentUserId]);

  const handlePostComment = async () => {
    if (!composeValue.trim() || !currentPage?.pageId || selectedBubbleId == null) return;

    try {
      const created = await postComment(currentPage.pageId, {
        bubbleId: selectedBubbleId,
        content: composeValue.trim(),
      });
      setComments((prev) => [...prev, created]);
      setComposeValue("");
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert(err?.message || "Failed to post comment. Please try again.");
    }
  };

  const handlePostGeneralComment = async () => {
    if (!generalComposeValue.trim() || !currentPage?.pageId || alreadyHasGeneralComment) return;
    try {
      const created = await postComment(currentPage.pageId, {
        bubbleId: null,
        content: generalComposeValue.trim(),
      });
      setComments((prev) => [...prev, created]);
      setGeneralComposeValue("");
    } catch (err) {
      console.error("Failed to post page-level comment:", err);
      alert(err?.message || "Failed to post comment. Please try again.");
    }
  };

  // Inline edit — called directly from a CommentThread's own textarea, no
  // separate "editing mode" on the shared composer needed anymore.
  const handleUpdateComment = async (commentId, content) => {
    try {
      const updated = await updateCommentApi(commentId, content);
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      console.error("Failed to update comment:", err);
      alert("Failed to update comment. Please try again.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    try {
      await deleteCommentApi(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert("Failed to delete comment. Please try again.");
    }
  };

  const handleResolve = async (commentId) => {
    try {
      await resolveComment(commentId);
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, resolved: true } : c)));
    } catch (err) {
      console.error("Failed to resolve comment:", err);
    }
  };

  const goBackToProjectTeams = useCallback(() => {
    navigate("/translator/project-teams", {
      state: { teamId: chapterMeta?.projectTeamId, tab: "tasks" },
    });
  }, [navigate, chapterMeta]);

  const handleDecision = async (decision) => {
    if (deciding) return;
    const isApprove = decision === "approved";

    const confirmMessage = isApprove
      ? "Are you sure you want to approve this chapter and publish it?"
      : "Are you sure you want to request changes and send this chapter back to the translator?";
    
    if (!window.confirm(confirmMessage)) return;

    setDeciding(true);
    try {
      await submitDecision(taskId, decision);

      if (isApprove) {
        toast.success("The chapter has been approved and published!");
      } else {
        toast.info("Changes requested. The translator has been notified.");
      }

      goBackToProjectTeams();
    } catch (err) {
      console.error("Failed to submit decision:", err);
      toast.error("Failed to submit your decision. Please try again.");
    } finally {
      setDeciding(false);
    }
  };

  if (status === "loading") {
    return <div className="rvw-loading">Loading review…</div>;
  }

  if (status === "error") {
    return <div className="rvw-error">{error}</div>;
  }

  return (
    <div className="rvw-root">
      <ReviewHeader
        chapterMeta={chapterMeta}
        pageNumber={pageIndex + 1}
        changeCount={changeCount}
        onBack={goBackToProjectTeams}
        syncScroll={syncScroll}
        onToggleSyncScroll={() => setSyncScroll((v) => !v)}
        zoomScale={zoomScale}
        isPickingZoomPoint={isPickingZoomPoint}
        onToggleZoomIn={toggleZoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        pageIndex={pageIndex}
        totalPages={pages.length}
        onPrevPage={() => setPageIndex((p) => p - 1)}
        onNextPage={() => setPageIndex((p) => p + 1)}
        deciding={deciding}
        isLastPage={isLastPage}
        onApprove={() => handleDecision("approved")}
        onRequestChanges={() => handleDecision("changes_requested")}
      />

      <div className="rvw-body">
        <BubbleOverlayPanel
          scrollRef={(el) => {
            originalRef.current = el;
            setOriginalScrollRef(el);
          }}
          onScroll={handleScroll("original")}
          frameRef={originalFrameRef}
          zoomScale={zoomScale}
          isPickingZoomPoint={isPickingZoomPoint}
          onFrameMouseDown={handleFrameMouseDown}
          imageUrl={currentPage?.imageUrl}
          pageIndex={pageIndex}
          labelText="ORIGINAL (SOURCE)"
          labelClassName="rvw-panel-label--original"
          selections={currentSelections}
          changedFlags={changedFlags}
          showText={false}
          selectedBubbleId={selectedBubbleId}
          onSelectBubble={setSelectedBubbleId}
        />

        <div className="rvw-divider-h" />

        <BubbleOverlayPanel
          scrollRef={(el) => {
            translatedRef.current = el;
            setTranslatedScrollRef(el);
          }}
          onScroll={handleScroll("translated")}
          frameRef={translatedFrameRef}
          zoomScale={zoomScale}
          isPickingZoomPoint={isPickingZoomPoint}
          onFrameMouseDown={handleFrameMouseDown}
          imageUrl={currentPage?.imageUrl}
          pageIndex={pageIndex}
          labelText="CURRENT TRANSLATION"
          labelClassName="rvw-panel-label--translated"
          selections={currentSelections}
          changedFlags={changedFlags}
          showText={true}
          frameHeight={translatedFrameHeight}
          selectedBubbleId={selectedBubbleId}
          onSelectBubble={setSelectedBubbleId}
        />
      </div>

      <CommentsSidebar
        comments={displayedComments}
        generalComments={generalComments}
        totalCommentCount={comments.length}
        commentsLoading={commentsLoading}
        onResolve={handleResolve}
        onDelete={handleDeleteComment}
        onUpdate={handleUpdateComment}
        currentUserId={currentUserId}
        resolveBubbleLabel={resolveBubbleLabel}
        composeValue={composeValue}
        onComposeChange={setComposeValue}
        onPostComment={handlePostComment}
        selectedBubbleId={selectedBubbleId}
        selectedBubbleIndex={selectedBubbleIndex}
        selectedBubbleTranslation={selectedBubbleTranslation}
        onClearSelectedBubble={() => setSelectedBubbleId(null)}
        onPrevBubble={() => goToBubble("prev")}
        onNextBubble={() => goToBubble("next")}
        bubbleAlreadyHasComment={bubbleAlreadyHasComment}
        generalComposeValue={generalComposeValue}
        onGeneralComposeChange={setGeneralComposeValue}
        onPostGeneralComment={handlePostGeneralComment}
        alreadyHasGeneralComment={alreadyHasGeneralComment}
      />

      <HelpButton />
    </div>
  );
}