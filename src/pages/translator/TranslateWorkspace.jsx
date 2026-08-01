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
  AlignRight,
  Upload,
  Save,
  Send,
  MessageSquare,
  BookMarked,
  Square,
  Pentagon,
  Minus,
  Plus,
  Pipette,
  Trash2,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAuth } from "../../utils/Auth";
import { toast } from "react-toastify";
import useWorkspaceSecurity from "../../hooks/useWorkspaceSecurity";
import { useChat } from "../../hooks/useChat";
import "../../assets/style/translator/translate-workspace.css";
import { API_BASE_URL as API_BASE, resolveImageUrl } from "../../config/apiConfig";

const TOKEN_KEY = "token";
const IS_DEV = process.env.NODE_ENV === "development";

const TABS = [
  { id: "translate", label: "Translate" },
  { id: "glossary", label: "Glossary" },
  { id: "changes", label: "Change Requests" },
];

const COMIC_FONT_LIBRARY = [
  { name: "Bangers", value: "'Bangers', cursive", group: "American Comics" },
  { name: "Comic Neue", value: "'Comic Neue', cursive", group: "American Comics" },
  { name: "Luckiest Guy", value: "'Luckiest Guy', cursive", group: "American Comics" },
  { name: "Pangolin", value: "'Pangolin', cursive", group: "American Comics" },
  { name: "Rock Salt", value: "'Rock Salt', cursive", group: "American Comics" },
  { name: "Noto Sans JP", value: "'Noto Sans JP', sans-serif", group: "Manga" },
  { name: "Kosugi Maru", value: "'Kosugi Maru', sans-serif", group: "Manga" },
  { name: "M PLUS 1p", value: "'M PLUS 1p', sans-serif", group: "Manga" },
  { name: "Sawarabi Gothic", value: "'Sawarabi Gothic', sans-serif", group: "Manga" },
  { name: "Zen Kurenaido", value: "'Zen Kurenaido', sans-serif", group: "Manga" },
  { name: "Nanum Gothic", value: "'Nanum Gothic', sans-serif", group: "Manhwa" },
  { name: "Nanum Myeongjo", value: "'Nanum Myeongjo', serif", group: "Manhwa" },
  { name: "Gowun Dodum", value: "'Gowun Dodum', sans-serif", group: "Manhwa" },
  { name: "Poor Story", value: "'Poor Story', cursive", group: "Manhwa" },
  { name: "Hi Melody", value: "'Hi Melody', cursive", group: "Manhwa" },
  { name: "Special Elite", value: "'Special Elite', cursive", group: "Dark Academia" },
  { name: "IM Fell English", value: "'IM Fell English', serif", group: "Dark Academia" },
  { name: "Cinzel", value: "'Cinzel', serif", group: "Dark Academia" },
  { name: "EB Garamond", value: "'EB Garamond', serif", group: "Dark Academia" },
  { name: "Pirata One", value: "'Pirata One', cursive", group: "Dark Academia" },
  { name: "Caveat", value: "'Caveat', cursive", group: "Art & Handwriting" },
  { name: "Shadows Into Light", value: "'Shadows Into Light', cursive", group: "Art & Handwriting" },
  { name: "Gloria Hallelujah", value: "'Gloria Hallelujah', cursive", group: "Art & Handwriting" },
  { name: "Architects Daughter", value: "'Architects Daughter', cursive", group: "Art & Handwriting" },
  { name: "Handlee", value: "'Handlee', cursive", group: "Art & Handwriting" },
];

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

function ChapterList({ chapters, openChapterId, onToggleChapter, chapterPagesLoading, currentChapterId, currentPageIndex, onSelectPage }) {
  return (
    <>
      {chapters.map((ch) => {
        const isCurrent = ch.chapterId === currentChapterId;
        const isOpen = ch.chapterId === openChapterId;
        const isLoadingPages = isOpen && !isCurrent && chapterPagesLoading === ch.taskId;
        return (
          <div key={ch.chapterId}>
            <button
              onClick={() => onToggleChapter(ch)}
              className={`tw-chapter-row ${isCurrent ? "is-current" : ""}`}
            >
              {isOpen ? (
                <ChevronDown size={14} color="#6C6F86" />
              ) : (
                <ChevronRight size={14} color="#6C6F86" />
              )}
              <BookMarked size={14} color="#6C6F86" />
              <span className="tw-chapter-title">{ch.title}</span>
              <span className="tw-chapter-progress tw-font-mono">{ch.progress}</span>
            </button>
            <div
              className="tw-chapter-assignee"
              style={{ fontSize: "10.5px", color: "#6C6F86", padding: "0 8px 6px 34px", display: "flex", alignItems: "center", gap: "4px" }}
              title={ch.assigneeLabel}
            >
              👤 {ch.assigneeLabel}
            </div>
            {isOpen && isLoadingPages && (
              <div style={{ padding: "6px 8px 6px 34px", fontSize: "11px", color: "#6C6F86" }}>Loading pages…</div>
            )}
            {isOpen &&
              !isLoadingPages &&
              (ch.pages || []).map((page) => {
                const pageIndex = page.pageNumber - 1;
                const isCurrentPage = isCurrent && pageIndex === currentPageIndex;
                const status = isCurrentPage ? "current" : page.status === "DONE" ? "done" : "todo";
                return (
                  <button
                    key={page.pageId}
                    className={`tw-page-row ${isCurrentPage ? "current" : ""}`}
                    onClick={() => onSelectPage(ch, pageIndex)}
                  >
                    <span className="tw-page-row-inner">
                      <PageStatusDot status={status} />
                      Page {page.pageNumber}
                    </span>
                  </button>
                );
              })}
          </div>
        );
      })}
    </>
  );
}

function TranslateHeaderBar({ comicTitle, chapterTitle, onBack, onSend, canSend, sending, saveStatus, canEdit = true }) {
  const badgeConfig = {
    saving: { icon: <Loader2 size={11} strokeWidth={3} className="tw-spin" />, label: "SAVING" },
    saved: { icon: <Check size={11} strokeWidth={3} />, label: "SAVED" },
    unsaved: { icon: <AlertCircle size={11} strokeWidth={3} />, label: "UNSAVED" },
  }[saveStatus ?? "unsaved"];
  const statusKey = saveStatus ?? "unsaved";

  return (
    <header className="tw-header">
      <div className="tw-header-left">
        <button onClick={onBack} className="tw-btn" title="Back to Project Teams Tasks">
          <ChevronLeft size={16} />
          Project Teams
        </button>
        <div className="tw-divider-v" />
        <div className="tw-project-icon">
          <BookOpen size={16} />
        </div>
        <div>
          <p className="tw-project-title tw-font-display">{comicTitle}</p>
          <p className="tw-project-sub tw-font-mono">{chapterTitle}</p>
        </div>
      </div>

      <div className="tw-header-right">
        {!canEdit && (
          <span className="tw-badge-saved tw-font-mono" title="You are not assigned to this task">
            🔒 VIEW ONLY
          </span>
        )}
        <span className={`tw-badge-saved tw-font-mono is-${statusKey}`}>
          {badgeConfig.icon} {badgeConfig.label}
        </span>
        <button
          className="tw-btn"
          disabled={!canEdit}
          title={canEdit ? undefined : "You don't have permission to edit this task"}
          style={!canEdit ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          <Upload size={14} /> Upload
        </button>
        <button
          className="tw-btn-primary"
          onClick={onSend}
          disabled={!canSend || sending}
          title={canSend ? "Submit chapter for review" : "Only available on the last page"}
          style={{ opacity: canSend ? 1 : 0.5, cursor: canSend ? "pointer" : "not-allowed" }}
        >
          <Send size={14} /> {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </header>
  );
}

function FontFamilyDropdown({ fontFamily, onChangeFontFamily, hasActiveSelection }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const fontGroups = useMemo(() => {
    const groups = {};
    for (const font of COMIC_FONT_LIBRARY) {
      if (!groups[font.group]) groups[font.group] = [];
      groups[font.group].push(font);
    }
    return groups;
  }, []);

  const selectedFont = COMIC_FONT_LIBRARY.find((f) => f.value === fontFamily);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`tw-x-dropdown-container ${hasActiveSelection ? "" : "is-disabled"}`}>
      <button
        type="button"
        onClick={() => hasActiveSelection && setIsOpen((v) => !v)}
        disabled={!hasActiveSelection}
        title={hasActiveSelection ? "Font family of the selected area" : "Select an area first"}
        className="tw-select"
        style={{
          maxWidth: 130,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          cursor: hasActiveSelection ? "pointer" : "not-allowed",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedFont?.name ?? "Font"}
        </span>
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div className="tw-x-dropdown-menu">
          {Object.entries(fontGroups).map(([groupName, fonts]) => (
            <div key={groupName}>
              <div className="tw-x-dropdown-group-label">{groupName}</div>
              {fonts.map((font) => (
                <div
                  key={font.name}
                  onClick={() => {
                    onChangeFontFamily(font.value);
                    setIsOpen(false);
                  }}
                  className={`tw-x-dropdown-item ${font.value === fontFamily ? "is-selected" : ""}`}
                >
                  {font.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CanvasToolbar({
  isBold,
  isItalic,
  textAlign,
  fontSize,
  fontFamily,
  textColor,
  textBgColor,
  onToggleBold,
  onToggleItalic,
  onSetTextAlign,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onChangeFontFamily,
  onChangeTextColor,
  onChangeTextBgColor,
  onPickTextColor,
  onPickTextBgColor,
  hasActiveSelection,
}) {
  return (
    <div className="tw-toolbar-group">
      <FontFamilyDropdown fontFamily={fontFamily} onChangeFontFamily={onChangeFontFamily} hasActiveSelection={hasActiveSelection} />
      <button
        type="button"
        onClick={onToggleBold}
        disabled={!hasActiveSelection}
        className={`tw-btn-icon ${isBold ? "active" : ""}`}
        title={hasActiveSelection ? "Bold (selected bubble)" : "Select an area first"}
      >
        <Bold size={14} />
      </button>
      <button
        type="button"
        onClick={onToggleItalic}
        disabled={!hasActiveSelection}
        className={`tw-btn-icon ${isItalic ? "active" : ""}`}
        title={hasActiveSelection ? "Italic (selected bubble)" : "Select an area first"}
      >
        <Italic size={14} />
      </button>
      <button
        type="button"
        onClick={() => onSetTextAlign("left")}
        disabled={!hasActiveSelection}
        className={`tw-btn-icon ${textAlign === "left" ? "active" : ""}`}
        title={hasActiveSelection ? "Align left (selected bubble)" : "Select an area first"}
      >
        <AlignLeft size={14} />
      </button>
      <button
        type="button"
        onClick={() => onSetTextAlign("center")}
        disabled={!hasActiveSelection}
        className={`tw-btn-icon ${textAlign === "center" ? "active" : ""}`}
        title={hasActiveSelection ? "Align center (selected bubble)" : "Select an area first"}
      >
        <AlignCenter size={14} />
      </button>
      <button
        type="button"
        onClick={() => onSetTextAlign("right")}
        disabled={!hasActiveSelection}
        className={`tw-btn-icon ${textAlign === "right" ? "active" : ""}`}
        title={hasActiveSelection ? "Align right (selected bubble)" : "Select an area first"}
      >
        <AlignRight size={14} />
      </button>

      <div className={`tw-x-fontsize-group ${hasActiveSelection ? "" : "is-disabled"}`}>
        <button
          type="button"
          onClick={onDecreaseFontSize}
          disabled={!hasActiveSelection}
          className="tw-btn-icon"
          title={hasActiveSelection ? "Decrease font size" : "Select an area first"}
        >
          <Minus size={13} />
        </button>
        <span className="tw-x-fontsize-value">{fontSize}</span>
        <button
          type="button"
          onClick={onIncreaseFontSize}
          disabled={!hasActiveSelection}
          className="tw-btn-icon"
          title={hasActiveSelection ? "Increase font size" : "Select an area first"}
        >
          <Plus size={13} />
        </button>
      </div>

      <div className={`tw-x-color-group ${hasActiveSelection ? "" : "is-disabled"}`}>
        <label
          title={hasActiveSelection ? "Text color of the selected area" : "Select an area first"}
          className={`tw-x-color-swatch ${hasActiveSelection ? "" : "is-disabled"}`}
          style={{ "--swatch-color": textColor }}
        >
          <input
            type="color"
            value={textColor}
            disabled={!hasActiveSelection}
            onChange={(e) => onChangeTextColor(e.target.value)}
            className="tw-x-color-input-hidden"
          />
        </label>
        <button
          type="button"
          onClick={onPickTextColor}
          disabled={!hasActiveSelection}
          className="tw-btn-icon"
          title={hasActiveSelection ? "Pick text color from the image" : "Select an area first"}
        >
          <Pipette size={13} />
        </button>
      </div>

      <div className={`tw-x-color-group tight ${hasActiveSelection ? "" : "is-disabled"}`}>
        <label
          title={hasActiveSelection ? "Background color of the selected area" : "Select an area first"}
          className={`tw-x-color-swatch ${hasActiveSelection ? "" : "is-disabled"}`}
          style={{ "--swatch-color": textBgColor }}
        >
          <input
            type="color"
            value={textBgColor}
            disabled={!hasActiveSelection}
            onChange={(e) => onChangeTextBgColor(e.target.value)}
            className="tw-x-color-input-hidden"
          />
        </label>
        <button
          type="button"
          onClick={onPickTextBgColor}
          disabled={!hasActiveSelection}
          className="tw-btn-icon"
          title={hasActiveSelection ? "Pick background color from the source/crop image" : "Select an area first"}
        >
          <Pipette size={13} />
        </button>
      </div>
    </div>
  );
}

function PageNav({
  images,
  currentPageIndex,
  goToPage,
  zoomScale,
  isPickingZoomPoint,
  onStartZoomIn,
  onZoomOut,
  onResetZoom,
}) {
  return (
    <div className="tw-page-nav">
      <span>
        PAGE {images.length ? currentPageIndex + 1 : 0} / {images.length}
      </span>
      <button className="tw-page-nav-btn" onClick={() => goToPage(currentPageIndex - 1)} disabled={currentPageIndex === 0}>
        Prev
      </button>
      <button className="tw-page-nav-btn" onClick={() => goToPage(currentPageIndex + 1)} disabled={currentPageIndex >= images.length - 1}>
        Next <ChevronRight size={14} />
      </button>

      <div className="tw-x-zoom-controls">
        <button
          type="button"
          data-zoom-toggle="true"
          onClick={onStartZoomIn}
          className={`tw-btn-icon ${isPickingZoomPoint ? "active" : ""}`}
          title={isPickingZoomPoint ? "Click a point on the image to zoom into (Esc to cancel)" : "Zoom in (pick a point)"}
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="tw-btn-icon"
          disabled={zoomScale <= 1}
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <span
          onClick={onResetZoom}
          title="Reset zoom to 100%"
          className={`tw-x-zoom-percent ${zoomScale !== 1 ? "is-clickable" : ""}`}
        >
          {Math.round(zoomScale * 100)}%
        </span>
      </div>
    </div>
  );
}

const RESIZE_HANDLES = ["nw", "ne", "sw", "se"];

function ShapeToolbar({ activeTool, onSetTool, canEdit = true }) {
  const tools = [
    { id: "rect", label: "Rectangle", Icon: Square },
    { id: "ellipse", label: "Oval", Icon: Circle },
    { id: "polygon", label: "Freeform", Icon: Pentagon },
  ];
  return (
    <div className="tw-toolbar-group">
      {tools.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => canEdit && onSetTool(t.id)}
          disabled={!canEdit}
          className={`tw-btn-icon ${activeTool === t.id ? "active" : ""}`}
          title={canEdit ? t.label : "You don't have permission to edit this task"}
        >
          <t.Icon size={14} />
        </button>
      ))}
    </div>
  );
}

function PageImage({
  currentImage,
  currentPageIndex,
  canvasRef,
  imgRef,
  bubbleRefs,
  drawing,
  selections,
  activeId,
  activeTool,
  polygonDraft,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onFinishPolygon,
  onCancelPolygon,
  onSelectArea,
  onImageLoad,
  onStartMove,
  onStartResize,
  onStartVertexDrag,
  onChangeTranslation,
  isPickingColor,
  zoomScale,
  zoomOrigin,
  isPickingZoomPoint,
}) {
  return (
    <div className="tw-canvas">
      {isPickingColor && (
        <div className="tw-x-picking-banner">
          Click the image to pick the color at that point — press Esc to cancel
        </div>
      )}

      {polygonDraft && polygonDraft.length > 0 && (
        <div className="tw-x-polygon-draft-bar">
          <span className="tw-x-polygon-draft-label">
            Drawing freeform shape: {polygonDraft.length} points (minimum 3)
          </span>
          <button type="button" onClick={onFinishPolygon} className="tw-btn tw-x-mini-btn">
            Xong
          </button>
          <button type="button" onClick={onCancelPolygon} className="tw-btn tw-x-mini-btn">
            Cancel
          </button>
        </div>
      )}

      <div
        className={`tw-page tw-x-page-canvas ${isPickingZoomPoint ? "is-zoom-picking" : ""}`}
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          "--zoom-scale": zoomScale,
          "--zoom-origin-x": `${zoomOrigin.x}%`,
          "--zoom-origin-y": `${zoomOrigin.y}%`,
        }}
      >
        {currentImage ? (
          <img
            ref={imgRef}
            src={currentImage}
            alt={`Page ${currentPageIndex + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            draggable={false}
            onLoad={(e) =>
              onImageLoad?.(
                { width: e.target.naturalWidth, height: e.target.naturalHeight },
                e.currentTarget.currentSrc || e.currentTarget.src
              )
            }
          />
        ) : status === "loading" ? (
          <div style={{ width: "100%", height: "100%", minHeight: "450px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", background: "rgba(0,0,0,0.15)" }}>
            <div className="skeleton-dash-shimmer" style={{ width: "70%", height: "80%", minHeight: "380px", borderRadius: "12px" }}></div>
            <div style={{ color: "#c084fc", fontSize: "13.5px", fontWeight: "600", letterSpacing: "0.02em" }}>⚡ Pre-warming translation canvas...</div>
          </div>
        ) : (
          <div style={{ padding: 24, color: "#8286A0" }}>This chapter has no images yet.</div>
        )}

        {drawing && (
          <div
            className={`tw-x-drawing-outline ${activeTool === "ellipse" ? "is-ellipse" : ""}`}
            style={{
              "--x": `${drawing.x}px`,
              "--y": `${drawing.y}px`,
              "--w": `${drawing.width}px`,
              "--h": `${drawing.height}px`,
            }}
          />
        )}

        <svg width="100%" height="100%" className="tw-x-overlay-svg">
          {polygonDraft && polygonDraft.length > 0 && (
            <>
              <polyline
                points={polygonDraft.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              {polygonDraft.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
              ))}
            </>
          )}

          {selections
            .filter((s) => s.shape === "polygon")
            .map((sel) => {
              const isActive = sel.id === activeId;
              return (
                <polygon
                  key={sel.id}
                  ref={(el) => {
                    if (bubbleRefs) bubbleRefs.current[sel.id] = el;
                  }}
                  points={sel.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill={sel.textBgColor ?? "#ffffff"}
                  stroke={isActive ? "#16a34a" : "#f59e0b"}
                  strokeWidth={2}
                  className={`tw-x-polygon-shape ${isActive ? "is-active" : ""} ${isPickingZoomPoint ? "is-zoom-picking" : ""}`}
                  onMouseDown={(e) => {
                    if (isPickingZoomPoint) return;
                    e.stopPropagation();
                    if (isActive) {
                      onStartMove(e, sel.id);
                    } else {
                      onSelectArea(sel.id);
                    }
                  }}
                />
              );
            })}

          {selections
            .filter((s) => s.shape === "polygon" && s.id === activeId)
            .flatMap((sel) =>
              sel.points.map((p, i) => (
                <circle
                  key={`${sel.id}-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill="#16a34a"
                  stroke="#fff"
                  strokeWidth={1.5}
                  className={`tw-x-vertex-handle ${isPickingZoomPoint ? "is-zoom-picking" : ""}`}
                  onMouseDown={(e) => {
                    if (isPickingZoomPoint) return;
                    e.stopPropagation();
                    onStartVertexDrag(e, sel.id, i);
                  }}
                />
              ))
            )}
        </svg>

        {selections
          .filter((s) => s.shape === "polygon")
          .map((sel) => {
            const isActive = sel.id === activeId;
            const box = getBoundingBox(sel);
            return (
              <textarea
                key={`text-${sel.id}`}
                className={`tw-inline-translation-textarea tw-x-inline-textarea ${isActive ? "is-active" : ""} ${isPickingZoomPoint ? "is-zoom-picking" : ""}`}
                value={sel.translation ?? ""}
                onChange={(e) => onChangeTranslation(sel.id, e.target.value)}
                onMouseDown={(e) => {
                  if (isPickingZoomPoint) return;
                  e.stopPropagation();
                  if (!isActive) onSelectArea(sel.id);
                }}
                placeholder={isActive ? "Type translation..." : ""}
                readOnly={!isActive}
                onWheel={(e) => e.preventDefault()}
                style={{
                  "--x": `${box.x}px`,
                  "--y": `${box.y}px`,
                  "--w": `${box.width}px`,
                  "--h": `${box.height}px`,
                  "--text-color": sel.textColor ?? "#000000",
                  "--font-size": `${sel.fontSize ?? 13}px`,
                  "--font-family": sel.fontFamily ?? COMIC_FONT_LIBRARY[0].value,
                  "--text-align": sel.textAlign ?? "left",
                  "--font-weight": sel.isBold ? 700 : 400,
                  "--font-style": sel.isItalic ? "italic" : "normal",
                }}
              />
            );
          })}

        {selections
          .filter((s) => s.shape !== "polygon")
          .map((sel) => {
            const isActive = sel.id === activeId;
            const index = selections.findIndex((s) => s.id === sel.id);
            return (
              <div
                key={sel.id}
                ref={(el) => {
                  if (bubbleRefs) bubbleRefs.current[sel.id] = el;
                }}
                onMouseDown={(e) => {
                  if (isPickingZoomPoint) return;
                  e.stopPropagation();
                  if (isActive) {
                    onStartMove(e, sel.id);
                  } else {
                    onSelectArea(sel.id);
                  }
                }}
                className={`tw-x-selection-box ${sel.shape === "ellipse" ? "is-ellipse" : ""} ${isActive ? "is-active" : ""} ${isPickingZoomPoint ? "is-zoom-picking" : ""}`}
                style={{
                  "--x": `${sel.x}px`,
                  "--y": `${sel.y}px`,
                  "--w": `${sel.width}px`,
                  "--h": `${sel.height}px`,
                  "--bg-color": sel.textBgColor ?? "#ffffff",
                }}
              >
                {isActive ? (
                  <span className="tw-x-bubble-label-active" title={sel.text || undefined}>
                    {sel.text ? sel.text.replace(/\n/g, " / ") : `Bubble ${index + 1}`}
                  </span>
                ) : (
                  <span className="tw-x-bubble-label-index" title={sel.text || `Bubble ${index + 1}`}>
                    {index + 1}
                  </span>
                )}

                <textarea
                  className={`tw-inline-translation-textarea tw-x-inline-textarea tw-x-inline-textarea--fill ${isActive ? "is-active" : ""} ${isPickingZoomPoint ? "is-zoom-picking" : ""}`}
                  value={sel.translation ?? ""}
                  onChange={(e) => onChangeTranslation(sel.id, e.target.value)}
                  onMouseDown={(e) => {
                    if (isPickingZoomPoint) return;
                    e.stopPropagation();
                    if (!isActive) onSelectArea(sel.id);
                  }}
                  placeholder={isActive ? "Type translation..." : ""}
                  readOnly={!isActive}
                  onWheel={(e) => e.preventDefault()}
                  style={{
                    "--text-color": sel.textColor ?? "#000000",
                    "--font-size": `${sel.fontSize ?? 13}px`,
                    "--font-family": sel.fontFamily ?? COMIC_FONT_LIBRARY[0].value,
                    "--text-align": sel.textAlign ?? "left",
                    "--font-weight": sel.isBold ? 700 : 400,
                    "--font-style": sel.isItalic ? "italic" : "normal",
                  }}
                />

                {isActive &&
                  RESIZE_HANDLES.map((handle) => (
                    <div
                      key={handle}
                      onMouseDown={(e) => {
                        if (isPickingZoomPoint) return;
                        e.stopPropagation();
                        onStartResize(e, sel.id, handle);
                      }}
                      className={`tw-x-resize-handle tw-x-resize-handle--${handle} ${sel.shape === "ellipse" ? "is-round" : ""} ${isPickingZoomPoint ? "is-zoom-picking" : ""}`}
                    />
                  ))}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function SourceImageCrop({ imageSrc, canvasRef, selection, imageNaturalSize, isPickingColor, onPickColorInCrop, zoomScale }) {
  const PREVIEW_WIDTH = 260;

  if (!selection || !canvasRef.current || !imageSrc || !imageNaturalSize) return null;

  const box = getBoundingBox(selection);
  if (!box || box.width === 0) return null;

  const rawContainer = canvasRef.current.getBoundingClientRect();
  if (rawContainer.width === 0 || rawContainer.height === 0) return null;

  const container = {
    width: canvasRef.current.offsetWidth,
    height: canvasRef.current.offsetHeight,
  };

  const { displayedWidth, displayedHeight, offsetX, offsetY } = computeDisplayedImageGeometry(
    container.width,
    container.height,
    imageNaturalSize.width,
    imageNaturalSize.height
  );

  const boxXInImage = box.x - offsetX;
  const boxYInImage = box.y - offsetY;

  const scale = PREVIEW_WIDTH / box.width;
  const previewHeight = Math.min(box.height * scale, 320);
  let clipPath;
  if (selection.shape === "ellipse") {
    clipPath = "ellipse(50% 50% at 50% 50%)";
  } else if (selection.shape === "polygon" && selection.points?.length) {
    const pointsStr = selection.points
      .map((p) => {
        const px = (p.x - offsetX - boxXInImage) * scale;
        const py = (p.y - offsetY - boxYInImage) * scale;
        return `${px}px ${py}px`;
      })
      .join(", ");
    clipPath = `polygon(${pointsStr})`;
  } else {
    clipPath = "none";
  }

  return (
    <div
      onClick={(e) => {
        if (!isPickingColor) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        onPickColorInCrop?.(clickX, clickY, box, scale, boxXInImage, boxYInImage, displayedWidth, displayedHeight);
      }}
      className={`tw-x-crop-preview ${selection.shape === "rect" ? "is-rect" : ""} ${isPickingColor ? "is-picking" : ""}`}
      style={{ "--preview-height": `${previewHeight}px` }}
    >
      <div className="tw-x-crop-clip" style={{ "--clip-path": clipPath }}>
        <img
          src={imageSrc}
          alt="Selected source area"
          draggable={false}
          className="tw-x-crop-image"
          style={{
            "--img-left": `${-boxXInImage * scale}px`,
            "--img-top": `${-boxYInImage * scale}px`,
            "--img-w": `${displayedWidth * scale}px`,
            "--img-h": `${displayedHeight * scale}px`,
          }}
        />
      </div>
    </div>
  );
}

function formatBubbleTime(isoOrDate) {
  if (!isoOrDate) return 'Just now';
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return 'Just now';
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
}

function TranslateTabPanel({
  activeSelection,
  bubbleIndex,
  bubbleTotal,
  onSelectPrev,
  onSelectNext,
  onChangeTranslation,
  textStyle,
  onSaveProgress,
  currentImage,
  canvasRef,
  imageNaturalSize,
  isPickingColor,
  onPickColorInCrop,
  onDeleteArea,
  zoomScale,
  userFullName,
  canEdit = true,
}) {
  const hasActiveSelection = activeSelection != null;
  const translationValue = activeSelection?.translation ?? "";

  return (
    <div className="tw-tabpanel">
      {bubbleTotal > 0 && (
        <div className="tw-x-bubble-nav-row">
          <span className="tw-x-bubble-nav-label">
            Bubble #{hasActiveSelection ? bubbleIndex + 1 : "-"} / {bubbleTotal}
          </span>
          <div className="tw-x-bubble-nav-actions">
            <button type="button" onClick={onSelectPrev} className="tw-btn-icon" title="Previous bubble">
              <ChevronLeft size={14} />
            </button>
            <button type="button" onClick={onSelectNext} className="tw-btn-icon" title="Next bubble">
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => hasActiveSelection && canEdit && onDeleteArea(activeSelection.id)}
              disabled={!hasActiveSelection || !canEdit}
              className={`tw-btn-icon tw-x-delete-btn ${hasActiveSelection && canEdit ? "is-enabled" : ""}`}
              title={!canEdit ? "You don't have permission to edit this task" : hasActiveSelection ? "Delete the selected area" : "Select an area first"}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {hasActiveSelection && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#94a3b8",
            margin: "8px 0 12px 0",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            👤 <strong style={{ color: "#e2e8f0" }}>{activeSelection.createdByName || userFullName || "Translator"}</strong>
          </span>
          <span style={{ color: "#64748b" }}>
            🕒 {formatBubbleTime(activeSelection.updatedAt)}
          </span>
        </div>
      )}

      <div className="tw-translation-block tw-x-block-spaced">
        <p className="tw-caption tw-x-caption-tight">
          SOURCE IMAGE {isPickingColor && <span style={{ color: "#2563eb" }}>— click to pick color</span>}
        </p>
        {hasActiveSelection ? (
          <SourceImageCrop
            imageSrc={currentImage}
            canvasRef={canvasRef}
            selection={activeSelection}
            imageNaturalSize={imageNaturalSize}
            isPickingColor={isPickingColor}
            onPickColorInCrop={onPickColorInCrop}
            zoomScale={zoomScale}
          />
        ) : (
          <div className="tw-x-crop-placeholder">
            Select an area on the image to view it here
          </div>
        )}
      </div>

      <div className="tw-translation-block">
        <p className="tw-caption tw-x-caption-tight">
          TRANSLATION
        </p>
        <textarea
          value={translationValue}
          onChange={(e) => canEdit && onChangeTranslation(e.target.value)}
          className="tw-textarea tw-x-translation-textarea"
          style={{
            "--text-align": textStyle.textAlign,
            "--font-weight": textStyle.fontWeight,
            "--font-style": textStyle.fontStyle,
          }}
          placeholder={
            !canEdit
              ? "View only — you're not assigned to this task"
              : hasActiveSelection
              ? "Enter translation for this area..."
              : "Select an area first"
          }
          disabled={!hasActiveSelection || !canEdit}
          readOnly={!canEdit}
        />
        <div className="tw-textarea-footer">
          <span>{translationValue.length} CHARS</span>
        </div>
      </div>

      <button
        onClick={onSaveProgress}
        className="tw-save-next-btn"
        disabled={!canEdit}
        title={canEdit ? undefined : "You don't have permission to edit this task"}
        style={!canEdit ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
      >
        Save
      </button>
    </div>
  );
}

async function fetchGlossaryTerms(comicId, signal) {
  const res = await fetch(`${API_BASE}/glossary/comic/${comicId}`, {
    headers: authHeaders(),
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load glossary (${res.status})`);
  const json = await res.json();
  return json?.data !== undefined ? json.data : json;
}

async function createGlossaryTermApi(comicId, term, signal) {
  const res = await fetch(`${API_BASE}/glossary/comic/${comicId}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(term),
    signal,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || `Failed to add term (${res.status})`);
  return json?.data !== undefined ? json.data : json;
}

async function updateGlossaryTermApi(id, updates, signal) {
  const res = await fetch(`${API_BASE}/glossary/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updates),
    signal,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || `Failed to update term (${res.status})`);
  return json?.data !== undefined ? json.data : json;
}

async function deleteGlossaryTermApi(id, signal) {
  const res = await fetch(`${API_BASE}/glossary/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    signal,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message || `Failed to delete term (${res.status})`);
  }
  return true;
}

async function fetchGlossarySuggestions(comicId, { pageId, imageUrl }, signal) {
  const body = pageId ? { pageId } : { imageUrl };
  const res = await fetch(`${API_BASE}/glossary/comic/${comicId}/suggest`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    signal,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || `Failed to scan page (${res.status})`);
  const data = json?.data !== undefined ? json.data : json;
  return {
    extractedText: data?.extractedText || "",
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
  };
}

const glossarySuggestionCache = new Map();

function GlossaryTabPanel({ comicId, pageId, imageUrl }) {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newSource, setNewSource] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const sourceInputRef = useRef(null);

  const pageKey = pageId || imageUrl || null;
  const [mode, setMode] = useState(pageKey ? "page" : "all");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [extractedText, setExtractedText] = useState("");
  const [showExtractedText, setShowExtractedText] = useState(false);

  useEffect(() => {
    if (!comicId) {
      setTerms([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    fetchGlossaryTerms(comicId, controller.signal)
      .then((data) => setTerms(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err.name !== "AbortError") setLoadError(err.message || "Failed to load glossary");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [comicId]);

  const runSuggestScan = useCallback(
    (forceRefresh = false) => {
      if (!comicId || !pageKey) return;
      const cacheKey = `${comicId}::${pageKey}`;
      if (!forceRefresh && glossarySuggestionCache.has(cacheKey)) {
        const cached = glossarySuggestionCache.get(cacheKey);
        setSuggestions(cached.suggestions);
        setExtractedText(cached.extractedText);
        setSuggestError(null);
        return () => {};
      }
      const controller = new AbortController();
      setSuggestLoading(true);
      setSuggestError(null);
      fetchGlossarySuggestions(comicId, { pageId, imageUrl }, controller.signal)
        .then((result) => {
          glossarySuggestionCache.set(cacheKey, result);
          setSuggestions(result.suggestions);
          setExtractedText(result.extractedText);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setSuggestError(err.message || "Failed to scan this page");
        })
        .finally(() => setSuggestLoading(false));
      return () => controller.abort();
    },
    [comicId, pageId, imageUrl, pageKey]
  );

  useEffect(() => {
    if (mode !== "page") return;
    const cleanup = runSuggestScan(false);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pageKey]);

  useEffect(() => {
    if (addOpen) setTimeout(() => sourceInputRef.current?.focus(), 50);
  }, [addOpen]);

  const displayedTerms = mode === "page" ? suggestions : terms;

  const filtered = useMemo(() => {
    if (!search.trim()) return displayedTerms;
    const q = search.toLowerCase();
    return displayedTerms.filter(
      (t) =>
        t.source.toLowerCase().includes(q) ||
        t.target.toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q)
    );
  }, [displayedTerms, search]);

  function syncTermEverywhere(updatedTerm) {
    setTerms((prev) => prev.map((t) => (t.id === updatedTerm.id ? updatedTerm : t)));
    setSuggestions((prev) => prev.map((t) => (t.id === updatedTerm.id ? { ...t, ...updatedTerm } : t)));
  }

  function removeTermEverywhere(id) {
    setTerms((prev) => prev.filter((t) => t.id !== id));
    setSuggestions((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleAdd() {
    if (!newSource.trim() || !newTarget.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createGlossaryTermApi(comicId, {
        source: newSource.trim(),
        target: newTarget.trim(),
        note: newNote.trim(),
      });
      setTerms((prev) => [created, ...prev]);
      setNewSource("");
      setNewTarget("");
      setNewNote("");
      setAddOpen(false);
      toast.success("Glossary term added");
    } catch (err) {
      toast.error(err.message || "Failed to add term");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id) {
    if (!newSource.trim() || !newTarget.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await updateGlossaryTermApi(id, {
        source: newSource.trim(),
        target: newTarget.trim(),
        note: newNote.trim(),
      });
      syncTermEverywhere(updated);
      setEditId(null);
      setNewSource("");
      setNewTarget("");
      setNewNote("");
      toast.success("Term updated");
    } catch (err) {
      toast.error(err.message || "Failed to update term");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(term) {
    setEditId(term.id);
    setNewSource(term.source);
    setNewTarget(term.target);
    setNewNote(term.note || "");
    setAddOpen(false);
  }

  function cancelEdit() {
    setEditId(null);
    setNewSource("");
    setNewTarget("");
    setNewNote("");
  }

  function confirmDelete(id) {
    setDeleteId(id);
  }

  async function handleDelete() {
    const id = deleteId;
    setDeleteId(null);
    const previousTerms = terms;
    const previousSuggestions = suggestions;
    removeTermEverywhere(id);
    try {
      await deleteGlossaryTermApi(id);
      toast.success("Term removed");
    } catch (err) {
      setTerms(previousTerms);
      setSuggestions(previousSuggestions);
      toast.error(err.message || "Failed to delete term");
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(terms, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glossary_${comicId || "project"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="tw-tabpanel tw-x-glossary-panel">
        <div className="tw-x-glossary-empty">
          <Loader2 size={22} className="tw-spin" />
          <p>Loading glossary…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="tw-tabpanel tw-x-glossary-panel">
        <div className="tw-x-glossary-empty">
          <AlertCircle size={28} strokeWidth={1.5} />
          <p>Couldn't load the glossary.</p>
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-tabpanel tw-x-glossary-panel">
      <div style={{ display: "flex", gap: 6, padding: "0 0 10px" }}>
        <button
          type="button"
          onClick={() => setMode("page")}
          disabled={!pageKey}
          title={pageKey ? "Only terms detected on this page" : "No page loaded yet"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid",
            borderColor: mode === "page" ? "#a855f7" : "rgba(255,255,255,0.12)",
            background: mode === "page" ? "rgba(168,85,247,0.18)" : "transparent",
            color: mode === "page" ? "#c084fc" : "var(--trans-text-secondary, #9ca3af)",
            cursor: pageKey ? "pointer" : "not-allowed",
            opacity: pageKey ? 1 : 0.5,
          }}
        >
          <Sparkles size={12} /> This Page
        </button>
        <button
          type="button"
          onClick={() => setMode("all")}
          title="Every term in the project glossary"
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid",
            borderColor: mode === "all" ? "#a855f7" : "rgba(255,255,255,0.12)",
            background: mode === "all" ? "rgba(168,85,247,0.18)" : "transparent",
            color: mode === "all" ? "#c084fc" : "var(--trans-text-secondary, #9ca3af)",
            cursor: "pointer",
          }}
        >
          All Terms
        </button>
      </div>

      <div className="tw-x-glossary-header">
        <span className="tw-x-glossary-count">
          {mode === "page"
            ? `${suggestions.length} match${suggestions.length !== 1 ? "es" : ""} on this page`
            : `${terms.length} term${terms.length !== 1 ? "s" : ""}`}
        </span>
        <div className="tw-x-glossary-header-actions">
          {mode === "page" && (
            <button
              type="button"
              className="tw-btn tw-x-mini-btn"
              onClick={() => runSuggestScan(true)}
              disabled={suggestLoading || !pageKey}
              title="Re-scan this page's text"
            >
              <RefreshCw size={12} className={suggestLoading ? "tw-spin" : ""} /> Rescan
            </button>
          )}
          {mode === "all" && terms.length > 0 && (
            <button
              type="button"
              className="tw-btn tw-x-mini-btn"
              onClick={handleExport}
              title="Export glossary as JSON"
            >
              Export
            </button>
          )}
          <button
            type="button"
            className="tw-btn-primary tw-x-glossary-add-btn"
            onClick={() => { setAddOpen((v) => !v); setEditId(null); cancelEdit(); }}
            title="Add a new glossary term"
          >
            <Plus size={13} /> Add Term
          </button>
        </div>
      </div>

      {addOpen && (
        <div className="tw-x-glossary-form">
          <div className="tw-x-glossary-form-row">
            <div className="tw-x-glossary-form-field">
              <label className="tw-caption tw-x-caption-tight">ORIGINAL TERM</label>
              <input
                ref={sourceInputRef}
                className="tw-x-glossary-input"
                placeholder="e.g. 先輩"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("glossary-target-input")?.focus()}
              />
            </div>
            <div className="tw-x-glossary-form-field">
              <label className="tw-caption tw-x-caption-tight">TRANSLATION</label>
              <input
                id="glossary-target-input"
                className="tw-x-glossary-input"
                placeholder="e.g. Senpai"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
          </div>
          <div className="tw-x-glossary-form-field">
            <label className="tw-caption tw-x-caption-tight">NOTE (optional)</label>
            <input
              className="tw-x-glossary-input"
              placeholder="Context or usage note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="tw-x-glossary-form-actions">
            <button
              type="button"
              className="tw-btn"
              onClick={() => { setAddOpen(false); setNewSource(""); setNewTarget(""); setNewNote(""); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="tw-btn-primary"
              onClick={handleAdd}
              disabled={!newSource.trim() || !newTarget.trim() || saving}
            >
              {saving ? <Loader2 size={13} className="tw-spin" /> : <Check size={13} />} Save Term
            </button>
          </div>
        </div>
      )}

      {mode === "page" && suggestLoading && (
        <div className="tw-x-glossary-empty">
          <Loader2 size={22} className="tw-spin" />
          <p>Reading text on this page…</p>
          <span>Gemini is scanning the page image, this can take a few seconds.</span>
        </div>
      )}

      {mode === "page" && !suggestLoading && suggestError && (
        <div className="tw-x-glossary-empty">
          <AlertCircle size={28} strokeWidth={1.5} />
          <p>Couldn't scan this page.</p>
          <span>{suggestError}</span>
          <button type="button" className="tw-btn-primary" onClick={() => runSuggestScan(true)}>
            <RefreshCw size={13} /> Try Again
          </button>
        </div>
      )}

      {mode === "page" && !suggestLoading && !suggestError && (
        <>
          {extractedText && (
            <div style={{ marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setShowExtractedText((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                {showExtractedText ? "Hide" : "Show"} text Gemini read on this page
              </button>
              {showExtractedText && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#c8c8d8",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    marginTop: 6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {extractedText}
                </p>
              )}
            </div>
          )}
          {suggestions.length === 0 && (
            <div className="tw-x-glossary-empty">
              <BookMarked size={28} strokeWidth={1.5} />
              <p>No glossary terms detected on this page.</p>
              <span>None of the saved terms matched the text Gemini read here.</span>
              <button type="button" className="tw-btn" onClick={() => setMode("all")}>
                View All Terms
              </button>
            </div>
          )}
        </>
      )}

      {terms.length > 2 && (mode === "all" || suggestions.length > 2) && (
        <div className="tw-x-glossary-search-wrap">
          <input
            className="tw-x-glossary-input tw-x-glossary-search"
            placeholder="🔍  Search terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="tw-x-glossary-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
      )}

      {mode === "all" && terms.length === 0 && !addOpen && (
        <div className="tw-x-glossary-empty">
          <BookMarked size={28} strokeWidth={1.5} />
          <p>No glossary terms yet.</p>
          <span>Add recurring terms like character names, honorifics, or special phrases so the whole team translates them consistently.</span>
          <button type="button" className="tw-btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={13} /> Add First Term
          </button>
        </div>
      )}

      {displayedTerms.length > 0 && filtered.length === 0 && (
        <div className="tw-x-glossary-empty" style={{ paddingTop: 16 }}>
          <p style={{ fontSize: 13 }}>No terms match "{search}"</p>
        </div>
      )}

      <div className="tw-x-glossary-list">
        {filtered.map((term) => (
          <div key={term.id} className={`tw-x-glossary-card ${editId === term.id ? "is-editing" : ""}`}>
            {editId === term.id ? (
              <div className="tw-x-glossary-form" style={{ margin: 0, padding: 0, border: "none", background: "none" }}>
                <div className="tw-x-glossary-form-row">
                  <div className="tw-x-glossary-form-field">
                    <label className="tw-caption tw-x-caption-tight">ORIGINAL</label>
                    <input
                      className="tw-x-glossary-input"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="tw-x-glossary-form-field">
                    <label className="tw-caption tw-x-caption-tight">TRANSLATION</label>
                    <input
                      className="tw-x-glossary-input"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                    />
                  </div>
                </div>
                <div className="tw-x-glossary-form-field">
                  <label className="tw-caption tw-x-caption-tight">NOTE</label>
                  <input
                    className="tw-x-glossary-input"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                </div>
                <div className="tw-x-glossary-form-actions">
                  <button type="button" className="tw-btn" onClick={cancelEdit}>Cancel</button>
                  <button
                    type="button"
                    className="tw-btn-primary"
                    onClick={() => handleUpdate(term.id)}
                    disabled={!newSource.trim() || !newTarget.trim() || saving}
                  >
                    {saving ? <Loader2 size={13} className="tw-spin" /> : <Check size={13} />} Update
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="tw-x-glossary-card-body">
                  <div className="tw-x-glossary-term-pair">
                    <span className="tw-x-glossary-source">{term.source}</span>
                    <span className="tw-x-glossary-arrow">→</span>
                    <span className="tw-x-glossary-target">{term.target}</span>
                  </div>
                  {mode === "page" && term.matchedText && term.matchedText !== term.source && (
                    <p className="tw-x-glossary-note">Matched as "{term.matchedText}"</p>
                  )}
                  {term.note && (
                    <p className="tw-x-glossary-note">{term.note}</p>
                  )}
                </div>
                <div className="tw-x-glossary-card-actions">
                  <button
                    type="button"
                    className="tw-btn-icon tw-x-glossary-action-btn"
                    title="Edit term"
                    onClick={() => startEdit(term)}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="tw-btn-icon tw-x-glossary-action-btn is-danger"
                    title="Delete term"
                    onClick={() => confirmDelete(term.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {deleteId && (
        <div className="tw-x-glossary-modal-backdrop">
          <div className="tw-x-glossary-modal">
            <p className="tw-x-glossary-modal-title">Delete term?</p>
            <p className="tw-x-glossary-modal-body">
              "<strong>{displayedTerms.find((t) => t.id === deleteId)?.source}</strong>" will be permanently removed.
            </p>
            <div className="tw-x-glossary-modal-actions">
              <button type="button" className="tw-btn" onClick={() => setDeleteId(null)}>Cancel</button>
              <button type="button" className="tw-btn-primary is-danger-btn" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function ChangeRequestCard({ comment, resolveBubbleLabel, onSelectBubble }) {
  const isClickable = comment.bubbleId != null && typeof onSelectBubble === "function";
  return (
    <div
      className="tw-x-change-request-card"
      onClick={isClickable ? () => onSelectBubble(comment.bubbleId) : undefined}
      style={isClickable ? { cursor: "pointer" } : undefined}
    >
      <div className="tw-x-change-request-header">
        <span className="tw-x-change-request-author">{comment.authorName}</span>
        {comment.resolved && <span className="tw-x-change-request-resolved">Resolved</span>}
      </div>
      {comment.bubbleId && (
        <span className="tw-x-change-request-bubble-tag">{resolveBubbleLabel(comment.bubbleId)}</span>
      )}
      <p className="tw-x-change-request-text">{comment.content}</p>
    </div>
  );
}

function ChangeRequestsTabPanel({ comments, loading, resolveBubbleLabel, onSelectBubble }) {
  if (loading) {
    return (
      <div className="tw-placeholder">
        <p style={{ margin: 0 }}>Loading change requests…</p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="tw-placeholder">
        <MessageSquare size={24} />
        <p style={{ margin: 0 }}>No change requests on this page.</p>
      </div>
    );
  }

  const bubbleComments = comments.filter((c) => c.bubbleId);
  const pageComments = comments.filter((c) => !c.bubbleId);

  return (
    <div className="tw-tabpanel">
      <p className="tw-x-change-request-section-label">
        Bubble Reviews {bubbleComments.length > 0 ? `(${bubbleComments.length})` : ""}
      </p>
      {bubbleComments.length === 0 ? (
        <p className="tw-x-change-request-empty">No bubble-specific reviews on this page.</p>
      ) : (
        bubbleComments.map((c) => (
          <ChangeRequestCard key={c.id} comment={c} resolveBubbleLabel={resolveBubbleLabel} onSelectBubble={onSelectBubble} />
        ))
      )}

      <p className="tw-x-change-request-section-label" style={{ marginTop: 16 }}>
        Page-level Review {pageComments.length > 0 ? `(${pageComments.length})` : ""}
      </p>
      {pageComments.length === 0 ? (
        <p className="tw-x-change-request-empty">No overall page review yet.</p>
      ) : (
        pageComments.map((c) => (
          <ChangeRequestCard key={c.id} comment={c} resolveBubbleLabel={resolveBubbleLabel} onSelectBubble={onSelectBubble} />
        ))
      )}
    </div>
  );
}

function TranslationSidePanel({
  activeTab,
  onChangeTab,
  activeSelection,
  bubbleIndex,
  bubbleTotal,
  onSelectPrev,
  onSelectNext,
  onChangeTranslation,
  textStyle,
  onSaveProgress,
  currentImage,
  canvasRef,
  imageNaturalSize,
  isPickingColor,
  onPickColorInCrop,
  onDeleteArea,
  zoomScale,
  changeRequests,
  changeRequestsLoading,
  resolveBubbleLabel,
  userFullName,
  onSelectBubble,
  comicId,
  pageId,
  canEdit = true,
  projectTeamId,
}) {
  const [isMsgOpen, setIsMsgOpen] = useState(false);

  return (
    <aside className="tw-rightpanel" style={{ position: "relative" }}>
      <div className="tw-tabs">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => onChangeTab(t.id)} className={`tw-tab ${activeTab === t.id ? "active" : ""}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "translate" && (
        <TranslateTabPanel
          activeSelection={activeSelection}
          bubbleIndex={bubbleIndex}
          bubbleTotal={bubbleTotal}
          onSelectPrev={onSelectPrev}
          onSelectNext={onSelectNext}
          onChangeTranslation={onChangeTranslation}
          textStyle={textStyle}
          onSaveProgress={onSaveProgress}
          currentImage={currentImage}
          canvasRef={canvasRef}
          imageNaturalSize={imageNaturalSize}
          isPickingColor={isPickingColor}
          onPickColorInCrop={onPickColorInCrop}
          onDeleteArea={onDeleteArea}
          zoomScale={zoomScale}
          userFullName={userFullName}
          canEdit={canEdit}
        />
      )}
      {activeTab === "glossary" && (
        <GlossaryTabPanel comicId={comicId} pageId={pageId} imageUrl={currentImage} />
      )}
      {activeTab === "changes" && (
        <ChangeRequestsTabPanel
          comments={changeRequests}
          loading={changeRequestsLoading}
          resolveBubbleLabel={resolveBubbleLabel}
          onSelectBubble={onSelectBubble}
        />
      )}

      <div className="tw-panel-footer" style={{ position: "relative" }}>
        <button
          className="tw-help-btn"
          onClick={() => setIsMsgOpen((v) => !v)}
          title="Team messages"
        >
          <MessageSquare size={14} />
        </button>
        {isMsgOpen && (
          <TeamMessagePopup
            groupId={projectTeamId}
            onClose={() => setIsMsgOpen(false)}
          />
        )}
      </div>
    </aside>
  );
}

function TeamMessagePopup({ groupId, onClose }) {
  const [inputValue, setInputValue] = useState("");
  const {
    messages,
    hasMore,
    isLoadingInitial,
    isLoadingMore,
    isSending,
    currentUser,
    scrollContainerRef,
    isNearBottomRef,
    fetchOlderMessages,
    sendMessage,
  } = useChat("GROUP", groupId);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 30 && hasMore && !isLoadingMore && !isLoadingInitial) {
      fetchOlderMessages();
    }
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (isNearBottomRef) isNearBottomRef.current = distanceFromBottom < 80;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;
    const text = inputValue.trim();
    setInputValue("");
    try {
      await sendMessage(text);
    } catch (err) {
      console.error("Failed to send group message:", err);
    }
  };

  const isMyMessage = (msg) => {
    if (!msg) return false;
    if (msg.isMe) return true;
    if (currentUser?.id && String(msg.senderId) === String(currentUser.id)) return true;
    if (currentUser?.username && (msg.senderName === currentUser.username || msg.sender === currentUser.username)) return true;
    if (currentUser?.fullName && (msg.senderName === currentUser.fullName || msg.sender === currentUser.fullName)) return true;
    return false;
  };
  const getSenderName = (msg) => msg.senderName || msg.sender || msg.sender_name || "Someone";
  const formatMsgTime = (msg) => {
    if (msg.time) return msg.time;
    if (msg.createdAt) {
      const d = new Date(msg.createdAt);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return "";
  };

  return (
    <div className="tw-msg-popup">
      <div className="tw-msg-popup-header">
        <span className="tw-msg-popup-title">
          <MessageSquare size={14} /> Group Chat
        </span>
        <div className="tw-msg-popup-header-actions">
          <span className="tw-msg-popup-badge">
            <span className="tw-msg-popup-badge-dot" /> Live
          </span>
          <button type="button" onClick={onClose} title="Close" className="tw-msg-popup-close">
            ×
          </button>
        </div>
      </div>

      <div ref={scrollContainerRef} onScroll={handleScroll} className="tw-msg-popup-body">
        {isLoadingMore && <div className="tw-msg-popup-loading-more">Loading older messages…</div>}
        {isLoadingInitial ? (
          <div className="tw-msg-popup-status">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="tw-msg-popup-status">No messages yet — say hi to your team!</div>
        ) : (
          messages.map((m, idx) => {
            const isMe = isMyMessage(m);
            const content = m.content || m.text || "";
            const time = formatMsgTime(m);
            return (
              <div key={m.id || idx} className={`tw-msg-row ${isMe ? "is-me" : ""}`}>
                <div className="tw-msg-row-inner">
                  {!isMe && <div className="tw-msg-sender">{getSenderName(m)}</div>}
                  <div className="tw-msg-bubble">{content}</div>
                  {time && <div className="tw-msg-time">{time}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="tw-msg-popup-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message…"
          disabled={isSending}
          className="tw-msg-popup-input"
        />
        <button type="submit" disabled={!inputValue.trim() || isSending} className="tw-msg-popup-send">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

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
    throw new Error(`Invalid response from ${url}`);
  }

  if (IS_DEV) {
    
    console.log(`[fetchJson] ${url} →`, json);
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }

  return json?.data !== undefined ? json.data : json;
}

async function fetchChapterById(chapterId, signal) {
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

function getTaskFallbackData(taskId) {
  let foundTask = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('comiverse_tasks_')) {
      try {
        const tasks = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(tasks)) {
          const match = tasks.find(t => String(t.id) === String(taskId) || String(t._id) === String(taskId));
          if (match) {
            foundTask = match;
            break;
          }
        }
      } catch (e) {}
    }
  }

  const rawTitle = foundTask?.title || 'Chapter 1 - Translation';
  const cleanTitleMatch = rawTitle.match(/^\[(URGENT|HIGH|MEDIUM|LOW)\]\s*(?:\[([^\]]+)\])?\s*(.*)$/i);
  const comicTitle = cleanTitleMatch?.[2] || 'Tạm biệt Long tóc đỏ';
  const chapterName = cleanTitleMatch?.[3] || rawTitle;

  const chapterId = foundTask?.chapterId || `ch-${taskId}`;
  let realPages = foundTask?.pages || foundTask?.chapter?.pages || [];
  if (!Array.isArray(realPages)) realPages = [];

  return {
    task: foundTask || { id: taskId, title: rawTitle, chapterId },
    chapter: {
      id: chapterId,
      title: chapterName.includes('Chapter') ? chapterName : `${comicTitle} - ${chapterName}`,
      comicTitle: comicTitle,
      pagesCount: realPages.length,
      pages: realPages
    },
    pages: realPages.map((item, idx) => {
      const rawUrl = typeof item === 'string' ? item : (item?.imageUrl || item?.url || item?.pageUrl);
      const resolved = resolveImageUrl(rawUrl);
      return {
        id: item?.id || `p-${taskId}-${idx + 1}`,
        pageId: item?.id || `p-${taskId}-${idx + 1}`,
        pageNumber: item?.pageNumber || idx + 1,
        imageUrl: resolved,
        bubbles: item?.bubbles || []
      };
    }).filter(p => p.imageUrl)
  };
}

async function fetchChapterForTask(taskId, signal) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (UUID_RE.test(taskId)) {
    // Real backend task — let failures propagate as real errors instead of
    // silently falling back to generic "Chapter 1 - Translation" demo data.
    // Masking a failed load as fake-but-successful content is exactly what
    // caused chapters to mysteriously "turn into Chapter 1" on switch.
    const task = await fetchJson(`${API_BASE}/team-workspace/tasks/${taskId}`, signal);

    const chapterId =
      task?.chapter?.id ??
      task?.chapterId ??
      task?.chapter_id ??
      task?.data?.chapterId ??
      task?.task?.chapterId ??
      (Array.isArray(task) ? task[0]?.chapterId : undefined);

    const taskAssigneeId = task?.assigneeId ?? null;

    if (!chapterId || !UUID_RE.test(chapterId)) {
      throw new Error(`Task ${taskId} has no valid chapter linked (got chapterId: ${chapterId ?? "none"})`);
    }

    const chapterResult = await fetchChapterById(chapterId, signal);
    return {
      ...chapterResult,
      projectTeamId: task?.projectTeamId ?? null,
      taskAssigneeId,
    };
  }

  // Only synthetic/local-only task IDs (never saved to the backend) fall back
  // to the localStorage demo cache — this is its actual intended use case.
  const fallback = getTaskFallbackData(taskId);
  const fallbackAssigneeId = fallback.task?.assigneeId ?? null;
  const chId = fallback.chapter?.id;
  if (chId && UUID_RE.test(chId)) {
    const chapterResult = await fetchChapterById(chId, signal);
    return {
      ...chapterResult,
      projectTeamId: null,
      taskAssigneeId: fallbackAssigneeId,
    };
  }

  return { ...fallback.chapter, taskAssigneeId: fallbackAssigneeId };
}

// ChapterEntity has no `title` field — only `chapterNumber`. Every place that
// displays a chapter's name must derive it, or it silently falls back to
// whatever hardcoded default happens to be nearby (which is how the sidebar
// ended up always showing "Chapter 1" regardless of which chapter was open).
function deriveChapterTitle(chapter) {
  if (!chapter) return null;
  if (chapter.title) return chapter.title;
  if (chapter.chapterNumber != null) return `Chapter ${chapter.chapterNumber}`;
  return null;
}

// Strips a leading "[PRIORITY] [ComicName]" prefix off a task title, leaving
// just the clean chapter/task name. Used whenever we have to fall back to a
// task's raw title (e.g. when the chapter relation isn't populated) instead of
// the real chapter title.
function stripTaskTitlePrefix(title) {
  if (!title) return title;
  const match = String(title).match(/^\[(URGENT|HIGH|MEDIUM|LOW)\]\s*(?:\[([^\]]+)\])?\s*(.*)$/i);
  return match ? match[3] || title : title;
}

// Fetches the other tasks (chapters) that belong to the same project team, so the
// sidebar can offer chapter switching. GET /team-workspace/{teamId}/tasks
async function fetchProjectTeamTasks(projectTeamId, signal) {
  if (!projectTeamId) return [];
  try {
    const list = await fetchJson(`${API_BASE}/team-workspace/${projectTeamId}/tasks`, signal);
    const arr = Array.isArray(list) ? list : list?.data || list?.content || [];
    return arr.map((t) => ({
      id: t?.id,
      chapterId: t?.chapter?.id ?? t?.chapterId,
      chapterNumber: t?.chapter?.chapterNumber ?? null,
      title: deriveChapterTitle(t?.chapter) ?? stripTaskTitlePrefix(t?.title) ?? "Untitled chapter",
      status: t?.status,
      assigneeId: t?.assigneeId ?? null,
    })).filter((t) => t.id);
  } catch (err) {
    return [];
  }
}

// GET /team-workspace/{teamId}/members -> List<TeamMemberDto> { id, name, role, avatar, online, lastSeenAt }
async function fetchTeamMembers(projectTeamId, signal) {
  if (!projectTeamId) return [];
  try {
    const list = await fetchJson(`${API_BASE}/team-workspace/${projectTeamId}/members`, signal);
    return Array.isArray(list) ? list : list?.data || list?.content || [];
  } catch (err) {
    return [];
  }
}

// Does this single assigneeId belong to the given user?
function isSameUser(assigneeId, userId) {
  if (assigneeId == null || userId == null) return false;
  return String(assigneeId) === String(userId);
}

// Look up a member's display name by id from the fetched team member list.
function resolveMemberName(memberId, teamMembers) {
  if (memberId == null) return null;
  const member = (teamMembers || []).find((m) => String(m.id) === String(memberId));
  return member?.name || null;
}

// Readable "who's assigned" label for the sidebar, resolved against the real team
// member list. Falls back to a short id fragment only if the member list hasn't
// loaded yet or the id isn't found (e.g. member removed from the team).
function formatAssigneeLabel(assigneeId, teamMembers) {
  if (assigneeId == null) return "Unassigned";
  const name = resolveMemberName(assigneeId, teamMembers);
  if (name) return name;
  return `Assignee ${String(assigneeId).slice(0, 8)}`;
}

async function fetchPagesForTask(taskId, signal) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let rawPages = [];

  
  if (UUID_RE.test(taskId)) {
    try {
      const list = await fetchJson(`${API_BASE}/translate-workspace/${taskId}`, signal);
      console.log('[DEBUG] /translate-workspace response:', list);
      if (Array.isArray(list) && list.length > 0) {
        rawPages = list;
      }
    } catch (err) {
      console.warn('[DEBUG] /translate-workspace fetch failed:', err);
    }
  }

  
  const fallback = getTaskFallbackData(taskId);
  const foundTask = fallback.task;
  const chapterId = foundTask?.chapterId || fallback.chapter?.id;
  const comicTitle = fallback.chapter?.comicTitle || foundTask?.title || '';

  if (rawPages.length === 0 && foundTask) {
    if (Array.isArray(foundTask.pages) && foundTask.pages.length > 0) {
      rawPages = foundTask.pages;
    } else if (Array.isArray(foundTask.chapter?.pages) && foundTask.chapter.pages.length > 0) {
      rawPages = foundTask.chapter.pages;
    }
  }

  
  const uuidMatch = String(chapterId || '').match(UUID_RE);
  const realChapterId = uuidMatch ? uuidMatch[0] : null;

  if (rawPages.length === 0 && realChapterId) {
    try {
      const data = await fetchJson(`${API_BASE}/chapters/detail/${realChapterId}`, signal);
      const pList = data?.pages || data?.images || (Array.isArray(data) ? data : []);
      if (Array.isArray(pList) && pList.length > 0) rawPages = pList;
    } catch (e) {  }
  }

  
  if (rawPages.length === 0) {
    try {
      const allComics = await fetchJson(`${API_BASE}/comics/all`, signal);
      const list = Array.isArray(allComics) ? allComics : (allComics?.data || allComics?.content || []);
      const cleanQuery = (comicTitle || '').toLowerCase().trim();

      const foundComic = list.find(c =>
        c.title && (c.title.toLowerCase().includes(cleanQuery) || cleanQuery.includes(c.title.toLowerCase()))
      ) || list.find(c => c.title && c.title.toLowerCase().includes('long tóc đỏ')) || list[0];

      if (foundComic?.id) {
        let chapList = [];

        
        const chapResults = await Promise.allSettled([
          fetchJson(`${API_BASE}/chapters/comic/${foundComic.id}?includeAll=true`, signal),
          fetchJson(`${API_BASE}/author/comics/${foundComic.id}/chapters`, signal)
        ]);

        for (const r of chapResults) {
          if (r.status === 'fulfilled') {
            const cList = Array.isArray(r.value) ? r.value : (r.value?.content || r.value?.data || []);
            if (cList.length > 0) { chapList = cList; break; }
          }
        }

        if (chapList.length > 0) {
          const matchedChap = chapList.find(c =>
            (realChapterId && String(c.id) === String(realChapterId)) ||
            String(c.title || '').toLowerCase().includes('chapter 1') ||
            c.chapterNumber === 1
          ) || chapList[0];

          if (matchedChap) {
            if (Array.isArray(matchedChap.pages) && matchedChap.pages.length > 0) {
              rawPages = matchedChap.pages;
            } else if (Array.isArray(matchedChap.images) && matchedChap.images.length > 0) {
              rawPages = matchedChap.images;
            }

            
            if (rawPages.length === 0 && matchedChap.id) {
              const detailResults = await Promise.allSettled([
                fetchJson(`${API_BASE}/chapters/detail/${matchedChap.id}`, signal),
                foundComic.id ? fetchJson(`${API_BASE}/author/comics/${foundComic.id}/chapters/${matchedChap.id}/preview`, signal) : Promise.reject('skip')
              ]);

              for (const r of detailResults) {
                if (r.status === 'fulfilled') {
                  const pList = r.value?.pages || r.value?.images || (Array.isArray(r.value) ? r.value : []);
                  if (Array.isArray(pList) && pList.length > 0) { rawPages = pList; break; }
                }
              }
            }
          }
        }
      }
    } catch (e) {  }
  }

  
  if (Array.isArray(rawPages) && rawPages.length > 0) {
    let finalPages = rawPages
      .map((item, idx) => {
        const rawUrl = typeof item === 'string'
          ? item
          : (item?.imageUrl || item?.url || item?.pageUrl || item?.path || item?.src);

        const resolved = resolveImageUrl(rawUrl);
        if (!resolved) return null;

        const pageId = item?.id || `p-${taskId}-${idx + 1}`;
        let bubblesData = item?.bubbles || [];
        try {
          const localSaved = localStorage.getItem(`comiverse_bubbles_${pageId}`);
          if (localSaved) {
            bubblesData = localSaved;
          }
        } catch (e) {}

        return {
          id: item?.id || `p-${taskId}-${idx + 1}`,
          pageId: item?.id || `p-${taskId}-${idx + 1}`,
          pageNumber: item?.pageNumber || idx + 1,
          imageUrl: resolved,
          bubbles: bubblesData
        };
      })
      .filter(Boolean);


    

    
    const needsRealPageIds = finalPages.some((p) => !UUID_RE.test(p.pageId));
    if (needsRealPageIds && UUID_RE.test(taskId)) {
      try {
        const realPages = await fetchJson(`${API_BASE}/review-workspace/${taskId}`, signal);
        if (Array.isArray(realPages) && realPages.length > 0) {
          const byPageNumber = new Map(realPages.map((rp) => [rp.pageNumber, rp]));
          finalPages = finalPages.map((p) => {
            const real = byPageNumber.get(p.pageNumber);
            if (!real?.pageId) return p;
            return { ...p, id: real.pageId, pageId: real.pageId };
          });
        }
      } catch (e) {
        console.warn('[DEBUG] Could not backfill real pageIds from /review-workspace:', e);
      }
    }
    return finalPages;
  }

  return [];
}

async function fetchPageChangeRequests(pageId, signal) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  console.log('[DEBUG] fetchPageChangeRequests pageId:', pageId, '| isUUID:', UUID_RE.test(pageId));
  if (!pageId || !UUID_RE.test(pageId)) {
    console.warn('[DEBUG] pageId không phải UUID, bỏ qua fetch comments');
    return [];
  }
  try {
    const list = await fetchJson(`${API_BASE}/review-workspace/pages/${pageId}/comments`, signal);
    console.log('[DEBUG] comments API response:', list);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('[DEBUG] fetchPageChangeRequests error:', e);
    return [];
  }
}

async function saveBubblesForPage(pageId, payload, signal) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!pageId || !UUID_RE.test(pageId)) {

    

    
    try {
      localStorage.setItem(`comiverse_bubbles_${pageId}`, JSON.stringify(payload));
    } catch (e) {}
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/translate-workspace/pages/${pageId}/bubbles`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ bubbles: JSON.stringify(payload) }),
      signal,
    });
    if (!res.ok) {
      try {
        localStorage.setItem(`comiverse_bubbles_${pageId}`, JSON.stringify(payload));
      } catch (e) {}
      return false;
    }
    return true;
  } catch (err) {
    if (err.name === "AbortError") throw err;
    try {
      localStorage.setItem(`comiverse_bubbles_${pageId}`, JSON.stringify(payload));
    } catch (e) {}
    return false;
  }
}

async function submitTaskForReview(taskId, signal) {
  const res = await fetch(`${API_BASE}/team-workspace/tasks/${taskId}/submit-for-review`, {
    method: "PUT",
    headers: authHeaders(),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to submit for review (${res.status})`);
  }
  return true;
}

function normalizeImages(chapterData) {
  const raw = chapterData?.images || [];
  return raw.map((item) => (typeof item === "string" ? item : item?.url)).filter(Boolean);
}

function clampSelectionToCanvas(selection, containerWidth, containerHeight) {
  if (containerWidth <= 0 || containerHeight <= 0) return selection;

  if (selection.shape === "polygon" && selection.points) {
    return {
      ...selection,
      points: selection.points.map((p) => ({
        x: Math.min(Math.max(p.x, 0), containerWidth),
        y: Math.min(Math.max(p.y, 0), containerHeight),
      })),
    };
  }

  let { x, y, width, height } = selection;
  width = Math.min(width, containerWidth);
  height = Math.min(height, containerHeight);
  x = Math.min(Math.max(x, 0), containerWidth - width);
  y = Math.min(Math.max(y, 0), containerHeight - height);
  return { ...selection, x, y, width, height };
}

function calculateRect(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(start.x - end.x);
  const height = Math.abs(start.y - end.y);
  return { x, y, width, height };
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

function scalePointsToNewBox(origPoints, origBox, newBox) {
  const scaleX = origBox.width > 0 ? newBox.width / origBox.width : 1;
  const scaleY = origBox.height > 0 ? newBox.height / origBox.height : 1;
  return origPoints.map((p) => ({
    x: newBox.x + (p.x - origBox.x) * scaleX,
    y: newBox.y + (p.y - origBox.y) * scaleY,
  }));
}

function shapeToRing(selection) {
  if (selection.shape === "polygon") {
    const pts = selection.points.map((p) => [p.x, p.y]);
    return [...pts, pts[0]];
  }

  if (selection.shape === "ellipse") {
    const cx = selection.x + selection.width / 2;
    const cy = selection.y + selection.height / 2;
    const rx = selection.width / 2;
    const ry = selection.height / 2;
    const STEPS = 48;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const angle = (i / STEPS) * Math.PI * 2;
      pts.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
    }
    return pts;
  }

  const { x, y, width, height } = selection;
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
    [x, y],
  ];
}

function boundingBoxesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function mergeTwoSelections(a, b) {
  const ringA = shapeToRing(a);
  const ringB = shapeToRing(b);

  let unionResult;
  try {
    unionResult = polygonClipping.union([ringA], [ringB]);
  } catch (err) {
    console.error("Error merging 2 selections:", err);
    return null;
  }

  if (!unionResult || unionResult.length === 0) return null;

  const ringArea = (ring) => {
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    return Math.abs(area / 2);
  };

  let biggestRing = null;
  let biggestArea = -1;
  for (const polygon of unionResult) {
    const outerRing = polygon[0];
    const area = ringArea(outerRing);
    if (area > biggestArea) {
      biggestArea = area;
      biggestRing = outerRing;
    }
  }

  if (!biggestRing) return null;

  const points = biggestRing.slice(0, -1).map(([x, y]) => ({ x, y }));

  return {
    id: generateId(),
    shape: "polygon",
    points,
    textColor: a.textColor ?? b.textColor ?? "#000000",
    textBgColor: a.textBgColor ?? b.textBgColor ?? "#ffffff",
    isBold: a.isBold ?? b.isBold ?? false,
    isItalic: a.isItalic ?? b.isItalic ?? false,
    textAlign: a.textAlign ?? b.textAlign ?? "left",
    translation: [a.translation, b.translation].filter(Boolean).join(" ") || undefined,
  };
}

function computeDisplayedImageGeometry(containerWidth, containerHeight, naturalWidth, naturalHeight) {
  const containerAspect = containerWidth / containerHeight;
  const imageAspect = naturalWidth / naturalHeight;

  let displayedWidth, displayedHeight, offsetX, offsetY;
  if (imageAspect > containerAspect) {
    displayedWidth = containerWidth;
    displayedHeight = containerWidth / imageAspect;
    offsetX = 0;
    offsetY = (containerHeight - displayedHeight) / 2;
  } else {
    displayedHeight = containerHeight;
    displayedWidth = containerHeight * imageAspect;
    offsetY = 0;
    offsetX = (containerWidth - displayedWidth) / 2;
  }

  return { displayedWidth, displayedHeight, offsetX, offsetY };
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function measureCanvasSize(canvasRef) {
  if (!canvasRef.current) return { width: 0, height: 0 };
  return {
    width: canvasRef.current.offsetWidth,
    height: canvasRef.current.offsetHeight,
  };
}

function waitForValidCanvasSize(canvasRef, maxAttempts = 10) {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      const size = measureCanvasSize(canvasRef);
      if (size.width > 0 && size.height > 0) {
        resolve(size);
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        resolve(size);
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

function toPercent(value, size) {
  return size > 0 ? (value / size) * 100 : 0;
}

function fromPercent(value, size) {
  return (value / 100) * size;
}

function selectionsToImagePercent(selections, canvasSize, naturalSize) {
  if (!naturalSize || canvasSize.width <= 0 || canvasSize.height <= 0) return selections;
  const { displayedWidth, displayedHeight, offsetX, offsetY } = computeDisplayedImageGeometry(
    canvasSize.width,
    canvasSize.height,
    naturalSize.width,
    naturalSize.height
  );
  return selections.map((s) => {
    const fontSizePercent = typeof s.fontSize === "number" ? toPercent(s.fontSize, displayedHeight) : s.fontSize;
    if (s.shape === "polygon") {
      return {
        ...s,
        fontSize: fontSizePercent,
        points: s.points.map((p) => ({
          x: toPercent(p.x - offsetX, displayedWidth),
          y: toPercent(p.y - offsetY, displayedHeight),
        })),
      };
    }
    return {
      ...s,
      fontSize: fontSizePercent,
      x: toPercent(s.x - offsetX, displayedWidth),
      y: toPercent(s.y - offsetY, displayedHeight),
      width: toPercent(s.width, displayedWidth),
      height: toPercent(s.height, displayedHeight),
    };
  });
}

function selectionsFromImagePercent(selections, canvasSize, naturalSize) {
  if (!naturalSize || canvasSize.width <= 0 || canvasSize.height <= 0) return selections;
  const { displayedWidth, displayedHeight, offsetX, offsetY } = computeDisplayedImageGeometry(
    canvasSize.width,
    canvasSize.height,
    naturalSize.width,
    naturalSize.height
  );
  return selections.map((s) => {
    const fontSizePx = typeof s.fontSize === "number" ? fromPercent(s.fontSize, displayedHeight) : s.fontSize;
    if (s.shape === "polygon") {
      return {
        ...s,
        fontSize: fontSizePx,
        points: s.points.map((p) => ({
          x: fromPercent(p.x, displayedWidth) + offsetX,
          y: fromPercent(p.y, displayedHeight) + offsetY,
        })),
      };
    }
    return {
      ...s,
      fontSize: fontSizePx,
      x: fromPercent(s.x, displayedWidth) + offsetX,
      y: fromPercent(s.y, displayedHeight) + offsetY,
      width: fromPercent(s.width, displayedWidth),
      height: fromPercent(s.height, displayedHeight),
    };
  });
}

function useSelectionAreas(canEdit = true) {
  const [selections, setSelections] = useState([]);
  const [drawing, setDrawing] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeTool, setActiveTool] = useState("rect");
  const [polygonDraft, setPolygonDraft] = useState(null);

  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [isPickingZoomPoint, setIsPickingZoomPoint] = useState(false);
  const ZOOM_STEP = 1.5;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 6;

  const dragState = useRef(null);

  const startPoint = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const bubbleRefs = useRef({});

  const getRelativePos = (e) => {
    const bounds = containerRef.current.getBoundingClientRect();
    const actualScale = bounds.width / containerRef.current.offsetWidth;
    return {
      x: (e.clientX - bounds.left) / actualScale,
      y: (e.clientY - bounds.top) / actualScale,
    };
  };

  const toggleZoomIn = () => setIsPickingZoomPoint((v) => !v);
  const cancelZoomPick = () => setIsPickingZoomPoint(false);

  useEffect(() => {
    if (activeId == null) return;
    const el = bubbleRefs.current[activeId];
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }, [activeId]);

  const zoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(ZOOM_MIN, prev / ZOOM_STEP);
      if (next === ZOOM_MIN) setZoomOrigin({ x: 50, y: 50 });
      return next;
    });
  };

  const resetZoom = () => {
    setZoomScale(1);
    setZoomOrigin({ x: 50, y: 50 });
    setIsPickingZoomPoint(false);
  };

  const handleMouseDown = (e) => {
    if (isPickingZoomPoint) {
      const bounds = containerRef.current.getBoundingClientRect();
      const percentX = ((e.clientX - bounds.left) / bounds.width) * 100;
      const percentY = ((e.clientY - bounds.top) / bounds.height) * 100;
      setZoomOrigin({ x: percentX, y: percentY });
      setZoomScale((prev) => Math.min(ZOOM_MAX, prev * ZOOM_STEP));
      return;
    }

    if (dragState.current) return;
    if (!canEdit) return;

    const pos = getRelativePos(e);

    if (activeTool === "polygon") {
      setPolygonDraft((prev) => (prev ? [...prev, pos] : [pos]));
      return;
    }

    startPoint.current = pos;
    setActiveId(null);
    setDrawing(calculateRect(pos, pos));
  };

  const handleMouseMove = (e) => {
    if (dragState.current) {
      handleDragMove(e);
      return;
    }

    if (!drawing) return;
    const pos = getRelativePos(e);
    setDrawing(calculateRect(startPoint.current, pos));
  };

  const mergeOverlappingWith = (changedId) => {
    setSelections((prev) => {
      let list = [...prev];
      let currentId = changedId;
      let keepMerging = true;

      while (keepMerging) {
        keepMerging = false;
        const current = list.find((s) => s.id === currentId);
        if (!current) break;
        const currentBox = getBoundingBox(current);

        for (const other of list) {
          if (other.id === currentId) continue;
          const otherBox = getBoundingBox(other);
          if (!boundingBoxesOverlap(currentBox, otherBox)) continue;

          const mergedSelection = mergeTwoSelections(current, other);
          if (!mergedSelection) continue;

          list = list.filter((s) => s.id !== current.id && s.id !== other.id);
          list.push(mergedSelection);
          currentId = mergedSelection.id;
          keepMerging = true;
          break;
        }
      }

      setActiveId(currentId);
      return list;
    });
  };

  const handleMouseUp = () => {
    if (dragState.current) {
      const changedId = dragState.current.id;
      dragState.current = null;
      mergeOverlappingWith(changedId);
      return;
    }

    if (drawing && drawing.width > 8 && drawing.height > 8) {
      const containerWidth = containerRef.current?.offsetWidth ?? 0;
      const containerHeight = containerRef.current?.offsetHeight ?? 0;
      const newArea = clampSelectionToCanvas(
        {
          id: generateId(),
          shape: activeTool === "ellipse" ? "ellipse" : "rect",
          textColor: "#000000",
          textBgColor: "#ffffff",
          fontSize: 13,
          fontFamily: COMIC_FONT_LIBRARY[0].value,
          isBold: false,
          isItalic: false,
          textAlign: "left",
          ...drawing,
        },
        containerWidth,
        containerHeight
      );
      setSelections((prev) => [...prev, newArea]);
      setActiveId(newArea.id);
      mergeOverlappingWith(newArea.id);
    }
    setDrawing(null);
  };

  const finishPolygon = () => {
    if (!canEdit) return;
    if (polygonDraft && polygonDraft.length >= 3) {
      const newArea = {
        id: generateId(),
        shape: "polygon",
        points: polygonDraft,
        textColor: "#000000",
        textBgColor: "#ffffff",
        fontSize: 13,
        fontFamily: COMIC_FONT_LIBRARY[0].value,
        isBold: false,
        isItalic: false,
        textAlign: "left",
      };
      setSelections((prev) => [...prev, newArea]);
      setActiveId(newArea.id);
      mergeOverlappingWith(newArea.id);
    }
    setPolygonDraft(null);
  };

  const cancelPolygon = () => setPolygonDraft(null);

  const selectArea = (id) => setActiveId(id);

  const deleteArea = (id) => {
    if (!canEdit) return;
    setSelections((prev) => prev.filter((s) => s.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  };

  const clearSelections = () => {
    setSelections([]);
    setActiveId(null);
    setPolygonDraft(null);
  };

  const loadSelections = (boxes) => {
    const withIds = boxes.map((box) => ({
      shape: "rect",
      textColor: "#000000",
      textBgColor: "#ffffff",
      fontSize: 13,
      fontFamily: COMIC_FONT_LIBRARY[0].value,
      isBold: false,
      isItalic: false,
      textAlign: "left",
      ...box,
      id: box.id || generateId(),
    }));
    setSelections((prev) => [...prev, ...withIds]);
  };

  const updateTranslation = (id, translation) => {
    if (!canEdit) return;
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, translation } : s)));
  };

  const updateName = (id, name) => {
    if (!canEdit) return;
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const updateSelectionStyle = (id, patch) => {
    if (!canEdit) return;
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const selectNext = () => {
    setSelections((prev) => {
      if (prev.length === 0) return prev;
      const currentIndex = prev.findIndex((s) => s.id === activeId);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % prev.length;
      setActiveId(prev[nextIndex].id);
      return prev;
    });
  };

  const selectPrev = () => {
    setSelections((prev) => {
      if (prev.length === 0) return prev;
      const currentIndex = prev.findIndex((s) => s.id === activeId);
      const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + prev.length) % prev.length;
      setActiveId(prev[prevIndex].id);
      return prev;
    });
  };

  const startMove = (e, id) => {
    if (!canEdit) return;
    const selection = selections.find((s) => s.id === id);
    if (!selection) return;
    dragState.current = {
      mode: "move",
      id,
      startPos: getRelativePos(e),
      original: selection,
    };
    setActiveId(id);
  };

  const startResize = (e, id, handle) => {
    if (!canEdit) return;
    const selection = selections.find((s) => s.id === id);
    if (!selection) {
      return;
    }
    dragState.current = {
      mode: "resize",
      id,
      handle,
      startPos: getRelativePos(e),
      original: selection,
    };
    setActiveId(id);
  };

  const startVertexDrag = (e, id, vertexIndex) => {
    if (!canEdit) return;
    const selection = selections.find((s) => s.id === id);
    if (!selection) {
      return;
    }
    dragState.current = {
      mode: "vertex",
      id,
      vertexIndex,
      startPos: getRelativePos(e),
      original: selection,
    };
    setActiveId(id);
  };

  const handleDragMove = (e) => {
    const drag = dragState.current;
    if (!drag) {
      return;
    }
    const pos = getRelativePos(e);
    const dx = pos.x - drag.startPos.x;
    const dy = pos.y - drag.startPos.y;
    const containerWidth = containerRef.current?.offsetWidth ?? 0;
    const containerHeight = containerRef.current?.offsetHeight ?? 0;

    setSelections((prev) =>
      prev.map((s) => {
        if (s.id !== drag.id) return s;

        if (drag.mode === "move") {
          if (s.shape === "polygon") {
            return clampSelectionToCanvas(
              { ...s, points: drag.original.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) },
              containerWidth,
              containerHeight
            );
          }
          return clampSelectionToCanvas(
            { ...s, x: drag.original.x + dx, y: drag.original.y + dy },
            containerWidth,
            containerHeight
          );
        }

        if (drag.mode === "resize") {
          if (s.shape === "polygon") {
            const origBox = getBoundingBox(drag.original);

            let newX = origBox.x;
            let newY = origBox.y;
            let newW = origBox.width;
            let newH = origBox.height;

            if (drag.handle.includes("w")) {
              newX = origBox.x + dx;
              newW = origBox.width - dx;
            }
            if (drag.handle.includes("e")) {
              newW = origBox.width + dx;
            }
            if (drag.handle.includes("n")) {
              newY = origBox.y + dy;
              newH = origBox.height - dy;
            }
            if (drag.handle.includes("s")) {
              newH = origBox.height + dy;
            }

            if (newW < 8) newW = 8;
            if (newH < 8) newH = 8;

            return clampSelectionToCanvas(
              {
                ...s,
                points: scalePointsToNewBox(drag.original.points, origBox, {
                  x: newX,
                  y: newY,
                  width: newW,
                  height: newH,
                }),
              },
              containerWidth,
              containerHeight
            );
          }

          let { x, y, width, height } = drag.original;
          const right = drag.original.x + drag.original.width;
          const bottom = drag.original.y + drag.original.height;

          if (drag.handle.includes("w")) {
            x = drag.original.x + dx;
            width = right - x;
          }
          if (drag.handle.includes("e")) {
            width = drag.original.width + dx;
          }
          if (drag.handle.includes("n")) {
            y = drag.original.y + dy;
            height = bottom - y;
          }
          if (drag.handle.includes("s")) {
            height = drag.original.height + dy;
          }

          if (width < 8) width = 8;
          if (height < 8) height = 8;

          return clampSelectionToCanvas({ ...s, x, y, width, height }, containerWidth, containerHeight);
        }

        if (drag.mode === "vertex") {
          const newPoints = drag.original.points.map((p, i) =>
            i === drag.vertexIndex ? { x: p.x + dx, y: p.y + dy } : p
          );
          return clampSelectionToCanvas({ ...s, points: newPoints }, containerWidth, containerHeight);
        }

        return s;
      })
    );
  };

  return {
    containerRef,
    bubbleRefs,
    selections,
    drawing,
    activeId,
    activeTool,
    setActiveTool,
    polygonDraft,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    finishPolygon,
    cancelPolygon,
    selectArea,
    deleteArea,
    clearSelections,
    loadSelections,
    updateTranslation,
    updateName,
    updateSelectionStyle,
    selectNext,
    selectPrev,
    startMove,
    startResize,
    startVertexDrag,
    zoomScale,
    zoomOrigin,
    isPickingZoomPoint,
    toggleZoomIn,
    zoomOut,
    resetZoom,
    cancelZoomPick,
  };
}

export default function TranslateWorkspace() {
  useWorkspaceSecurity({
    targetElementId: "secure-workspace",
    onDevToolsOpen: () => toast.warning("Vui lòng không mở DevTools trên trang này."),
  });

  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const auth = getAuth();
  const authUser = auth?.user;
  const userFullName = authUser?.fullName || authUser?.username || 'Translator';

  const [chapterData, setChapterData] = useState(null);
  const [taskPages, setTaskPages] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [currentChapterId, setCurrentChapterId] = useState(null);

  const [activeTab, setActiveTab] = useState("translate");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const pixelCanvasRef = useRef(null);
  if (!pixelCanvasRef.current && typeof document !== "undefined") {
    pixelCanvasRef.current = document.createElement("canvas");
  }

  const pendingBubblesRef = useRef(null);

  const [pickingColorFor, setPickingColorFor] = useState(null);

  const [imageNaturalSize, setImageNaturalSize] = useState(null);


  

  
  const imgElRef = useRef(null);

  useEffect(() => {
    if (!pickingColorFor) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setPickingColorFor(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickingColorFor]);

  const currentUserId = authUser?.id ?? authUser?.userId ?? null;

  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const projectTeamId = chapterData?.projectTeamId;
    if (!projectTeamId) {
      setTeamMembers([]);
      return;
    }
    const controller = new AbortController();
    fetchTeamMembers(projectTeamId, controller.signal)
      .then(setTeamMembers)
      .catch(() => setTeamMembers([]));
    return () => controller.abort();
  }, [chapterData?.projectTeamId]);

  const isAssignedToTask = isSameUser(chapterData?.taskAssigneeId, currentUserId);

  const isProjectLeader = useMemo(() => {
    const me = (teamMembers || []).find((m) => String(m.id) === String(currentUserId));
    return me?.role === "Group Leader";
  }, [teamMembers, currentUserId]);

  // Nobody is allowed to edit until we've actually loaded the task and know
  // who's assigned — default is read-only, not editable.
  const canEdit = status === "ready" && (isProjectLeader || isAssignedToTask);


  const {
    containerRef: canvasRef,
    bubbleRefs,
    selections,
    drawing,
    activeId,
    activeTool,
    setActiveTool,
    polygonDraft,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    finishPolygon,
    cancelPolygon,
    selectArea,
    deleteArea,
    clearSelections,
    loadSelections,
    updateTranslation,
    updateName,
    updateSelectionStyle,
    selectNext,
    selectPrev,
    startMove,
    startResize,
    startVertexDrag,
    zoomScale,
    zoomOrigin,
    isPickingZoomPoint,
    toggleZoomIn,
    zoomOut,
    resetZoom,
    cancelZoomPick,
  } = useSelectionAreas(canEdit);

  const applyPendingBubbles = useCallback(
    (naturalSize) => {
      const bubblesJson = pendingBubblesRef.current;
      pendingBubblesRef.current = null;
      if (!bubblesJson) return;
      try {
        let parsed;
        if (typeof bubblesJson === "string") {
          if (!bubblesJson.trim()) return;
          parsed = JSON.parse(bubblesJson);
        } else if (typeof bubblesJson === "object") {
          parsed = bubblesJson;
        } else {
          return;
        }
        const selectionsToLoad = Array.isArray(parsed) ? parsed : parsed?.selections;
        const legacyPageTextStyle = Array.isArray(parsed) ? null : parsed?.textStyle;

        if (Array.isArray(selectionsToLoad) && selectionsToLoad.length > 0) {
          const canvasSize = measureCanvasSize(canvasRef);
          const pxSelections = selectionsFromImagePercent(selectionsToLoad, canvasSize, naturalSize).map((s) => {
            const clamped = clampSelectionToCanvas(s, canvasSize.width, canvasSize.height);
            return {
              isBold: legacyPageTextStyle?.isBold ?? false,
              isItalic: legacyPageTextStyle?.isItalic ?? false,
              textAlign: legacyPageTextStyle?.textAlign ?? "left",
              ...clamped,
            };
          });
          loadSelections(pxSelections);
        }
      } catch (err) {
        
      }
    },
    [canvasRef, loadSelections]
  );

  const handleImageLoad = (size, loadedSrc) => {

    

    if (loadedSrc && currentImage && loadedSrc !== currentImage) {
      return;
    }

    setImageNaturalSize(size);
    applyPendingBubbles(size);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = pixelCanvasRef.current;
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size.width, size.height);
    };
    img.onerror = () => {
      console.error("Failed to reload the image for pixel reading (color picking won't work).");
    };
    img.src = currentImage;
  };

  const readColorAtNaturalPixel = (naturalX, naturalY) => {
    try {
      const ctx = pixelCanvasRef.current.getContext("2d");
      const [r, g, b] = ctx.getImageData(naturalX, naturalY, 1, 1).data;
      return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      console.error("Failed to read pixel color:", err);
      return "CORS_ERROR";
    }
  };

  const readColorAtDisplayPoint = (displayX, displayY, containerBounds) => {
    if (!imageNaturalSize) return null;

    const { displayedWidth, displayedHeight, offsetX, offsetY } = computeDisplayedImageGeometry(
      containerBounds.width,
      containerBounds.height,
      imageNaturalSize.width,
      imageNaturalSize.height
    );

    const xInImage = displayX - offsetX;
    const yInImage = displayY - offsetY;
    if (xInImage < 0 || yInImage < 0 || xInImage > displayedWidth || yInImage > displayedHeight) {
      return null;
    }

    const naturalX = Math.floor((xInImage / displayedWidth) * imageNaturalSize.width);
    const naturalY = Math.floor((yInImage / displayedHeight) * imageNaturalSize.height);

    return readColorAtNaturalPixel(naturalX, naturalY);
  };

  const readColorInCrop = (clickX, clickY, scale, boxXInImage, boxYInImage, displayedWidth, displayedHeight) => {
    if (!imageNaturalSize) return null;

    const xInDisplayedImage = clickX / scale + boxXInImage;
    const yInDisplayedImage = clickY / scale + boxYInImage;

    const naturalX = Math.floor((xInDisplayedImage / displayedWidth) * imageNaturalSize.width);
    const naturalY = Math.floor((yInDisplayedImage / displayedHeight) * imageNaturalSize.height);

    return readColorAtNaturalPixel(naturalX, naturalY);
  };

  const pickTextColorFromScreen = () => {
    if (activeId == null) return;
    cancelZoomPick();
    setPickingColorFor("text");
  };
  const pickBackgroundColorFromScreen = () => {
    if (activeId == null) return;
    cancelZoomPick();
    setPickingColorFor("bg");
  };

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
      if (canvasRef.current && canvasRef.current.contains(e.target)) return;
      if (e.target.closest("[data-zoom-toggle]")) return;
      cancelZoomPick();
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isPickingZoomPoint, cancelZoomPick, canvasRef]);

  const selectionsRef = useRef(selections);
  useEffect(() => {
    selectionsRef.current = selections;
  }, [selections]);

  const [saveStatus, setSaveStatus] = useState("unsaved");
  const [sending, setSending] = useState(false);
  const isLoadingPageRef = useRef(false);
  useEffect(() => {
    if (isLoadingPageRef.current) {
      isLoadingPageRef.current = false;
      return;
    }
    setSaveStatus("unsaved");
  }, [selections]);

  const activeSelection = selections.find((s) => s.id === activeId) ?? null;
  const activeSelectionIndex = selections.findIndex((s) => s.id === activeId);

  useEffect(() => {
    if (activeId == null) return;
    const onKeyDown = (e) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
      deleteArea(activeId);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, deleteArea]);


  
  const textStyle = useMemo(
    () => ({
      fontWeight: activeSelection?.isBold ? 700 : 400,
      fontStyle: activeSelection?.isItalic ? "italic" : "normal",
      textAlign: activeSelection?.textAlign ?? "left",
    }),
    [activeSelection]
  );

  const pendingTargetPageRef = useRef(null);
  const consumePendingTargetIndex = (pages) => {
    const target = pendingTargetPageRef.current;
    if (target == null) return null;
    pendingTargetPageRef.current = null;
    const idx = pages.findIndex((p) => p.pageNumber === target);
    if (idx !== -1) return idx;
    return Math.max(0, Math.min(target - 1, pages.length - 1));
  };

  useEffect(() => {
    if (!taskId) return;

    const controller = new AbortController();
    const cacheKey = `comiverse_ws_cache_${taskId}`;

    
    let hasCache = false;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { chapter: cChapter, pages: cPages } = JSON.parse(cached);
        if (cChapter && Array.isArray(cPages) && cPages.length > 0) {
          setChapterData(cChapter);
          setTaskPages(cPages);
          setCurrentChapterId(cChapter.id);
          const pendingIdx = consumePendingTargetIndex(cPages);
          setCurrentPageIndex(pendingIdx != null ? pendingIdx : 0);
          setStatus("ready");
          hasCache = true;
          
          cPages.slice(0, 3).forEach(p => {
            if (p.imageUrl) { const img = new Image(); img.src = p.imageUrl; }
          });
        }
      }
    } catch (e) {}

    if (!hasCache) {
      setStatus("loading");
    }
    setError(null);

    Promise.all([
      fetchChapterForTask(taskId, controller.signal),
      fetchPagesForTask(taskId, controller.signal),
    ])
      .then(([chapterResult, pagesResult]) => {
        setChapterData(chapterResult);
        setTaskPages(pagesResult);
        setCurrentChapterId(chapterResult.id);
        const pendingIdx = consumePendingTargetIndex(pagesResult);
        if (pendingIdx != null) {
          setCurrentPageIndex(pendingIdx);
        } else if (!hasCache) {
          setCurrentPageIndex(0);
        } else {

          

          
          setCurrentPageIndex((prevIndex) => {
            const currentId = currentPageIdRef.current;
            if (currentId) {
              const freshIndex = pagesResult.findIndex(
                (p) => p.pageId === currentId || p.id === currentId
              );
              if (freshIndex !== -1) return freshIndex;
            }
            return prevIndex < pagesResult.length ? prevIndex : 0;
          });
        }
        setStatus("ready");

        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            chapter: chapterResult,
            pages: pagesResult
          }));
        } catch (e) {}
        
        pagesResult.slice(0, 5).forEach(p => {
          if (p.imageUrl) { const img = new Image(); img.src = p.imageUrl; }
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (!hasCache) {
          console.error("Error loading chapter:", err);
          setError(err.message);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [taskId]);

  const images = useMemo(() => taskPages.map((p) => p.imageUrl).filter(Boolean), [taskPages]);
  const currentImage = images[currentPageIndex];
  const currentPageMeta = taskPages[currentPageIndex] ?? null;


  const currentPageIdRef = useRef(null);
  useEffect(() => {
    currentPageIdRef.current = currentPageMeta?.pageId ?? null;
  }, [currentPageMeta?.pageId]);

  useEffect(() => {
    if (isLoadingPageRef.current) return;
    setSaveStatus("unsaved");
    const pageId = currentPageIdRef.current;
    if (!pageId) return;
    try {
      const imgEl = imgElRef.current;
      const naturalSize = (imgEl && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0)
        ? { width: imgEl.naturalWidth, height: imgEl.naturalHeight }
        : { width: 1000, height: 1400 };
      const canvasSize = measureCanvasSize(canvasRef);
      const percentSelections = selectionsToImagePercent(selections, canvasSize, naturalSize);
      localStorage.setItem(`comiverse_bubbles_${pageId}`, JSON.stringify({ selections: percentSelections }));
    } catch (e) {}
  
  }, [selections]);

  
  const clearSelectionsRef = useRef(clearSelections);
  const applyPendingBubblesRef = useRef(applyPendingBubbles);
  useEffect(() => { clearSelectionsRef.current = clearSelections; }, [clearSelections]);
  useEffect(() => { applyPendingBubblesRef.current = applyPendingBubbles; }, [applyPendingBubbles]);

  useEffect(() => {
    const pageId = currentPageMeta?.pageId;
    clearSelectionsRef.current();
    if (!pageId) {
      pendingBubblesRef.current = null;
      return;
    }
    let bubblesJson = currentPageMeta?.bubbles || null;
    try {
      const localSaved = localStorage.getItem(`comiverse_bubbles_${pageId}`);
      if (localSaved) bubblesJson = localSaved;
    } catch (e) {}
    pendingBubblesRef.current = bubblesJson;
    const imgEl = imgElRef.current;
    if (imgEl && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
      applyPendingBubblesRef.current({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
    }

  }, [currentPageMeta?.pageId]);

  const [changeRequests, setChangeRequests] = useState([]);
  const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);

  useEffect(() => {
    if (!currentPageMeta?.pageId) {
      setChangeRequests([]);
      return;
    }
    const controller = new AbortController();
    setChangeRequestsLoading(true);
    fetchPageChangeRequests(currentPageMeta.pageId, controller.signal)
      .then(setChangeRequests)
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Failed to load change requests:", err);
      })
      .finally(() => setChangeRequestsLoading(false));
    return () => controller.abort();
  }, [currentPageMeta?.pageId]);

  const resolveBubbleLabel = useCallback((bubbleId) => {
    const idx = selectionsRef.current.findIndex((s) => s.id === bubbleId);
    return idx >= 0 ? `Bubble ${idx + 1}` : "Bubble (deleted)";
  }, []);

  const [siblingTasks, setSiblingTasks] = useState([]);

  useEffect(() => {
    const projectTeamId = chapterData?.projectTeamId;
    if (!projectTeamId) {
      setSiblingTasks([]);
      return;
    }
    const controller = new AbortController();
    fetchProjectTeamTasks(projectTeamId, controller.signal)
      .then(setSiblingTasks)
      .catch(() => setSiblingTasks([]));
    return () => controller.abort();
  }, [chapterData?.projectTeamId]);

  const [chapterPagesCache, setChapterPagesCache] = useState({});
  const [chapterPagesLoadingId, setChapterPagesLoadingId] = useState(null);
  const [openChapterId, setOpenChapterId] = useState(null);

  // Whenever the actively-open task changes (a real switch happened), that
  // chapter's row should be the one expanded by default.
  useEffect(() => {
    if (currentChapterId) setOpenChapterId(currentChapterId);
  }, [currentChapterId]);

  const sidebarChapters = useMemo(() => {
    if (!chapterData && taskPages.length === 0) return [];
    const chapId = chapterData?.id || currentChapterId || 'ch-1';
    const chapTitle = deriveChapterTitle(chapterData) || 'Chapter';
    const doneCount = taskPages.filter((p) => p.status === "DONE").length;

    const currentEntry = {
      chapterId: chapId,
      taskId,
      chapterNumber: chapterData?.chapterNumber ?? null,
      title: chapTitle,
      progress: `${doneCount > 0 ? doneCount : (taskPages.length > 0 ? currentPageIndex + 1 : 0)}/${taskPages.length}`,
      assigneeLabel: formatAssigneeLabel(chapterData?.taskAssigneeId, teamMembers),
      pages: taskPages.map((p, idx) => ({
        ...p,
        pageId: p.pageId || p.id || `p-${idx + 1}`,
        pageNumber: p.pageNumber || idx + 1,
        status: p.status === "DONE" ? "DONE" : (idx === currentPageIndex ? "current" : "todo")
      })),
    };

    const siblingEntries = (siblingTasks || [])
      .filter((t) => String(t.id) !== String(taskId))
      .map((t) => {
        const cachedPages = chapterPagesCache[t.id];
        return {
          chapterId: t.chapterId || t.id,
          taskId: t.id,
          chapterNumber: t.chapterNumber ?? null,
          title: t.title,
          progress: t.status || '',
          assigneeLabel: formatAssigneeLabel(t.assigneeId, teamMembers),
          pages: (cachedPages || []).map((p, idx) => ({
            ...p,
            pageId: p.pageId || p.id || `p-${idx + 1}`,
            pageNumber: p.pageNumber || idx + 1,
            status: p.status === "DONE" ? "DONE" : "todo",
          })),
        };
      });

    // Keep a stable order by chapter number — switching the active chapter
    // should never reshuffle the list (e.g. bump it to the top).
    const orderKey = (entry) => {
      if (entry.chapterNumber != null) {
        const fromField = Number(entry.chapterNumber);
        if (!Number.isNaN(fromField)) return fromField;
      }
      const match = String(entry.title || "").match(/(\d+)/);
      return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    };
    return [currentEntry, ...siblingEntries].sort((a, b) => {
      const diff = orderKey(a) - orderKey(b);
      if (diff !== 0) return diff;
      return String(a.title).localeCompare(String(b.title));
    });
  }, [chapterData, currentChapterId, taskPages, currentPageIndex, taskId, siblingTasks, teamMembers, chapterPagesCache]);

  // Chapter row clicked: just expand/collapse locally — no navigation, no
  // switching the active editing task. Lazily fetch that chapter's page list
  // the first time it's expanded (skipped for the currently active chapter,
  // which already has its real page list loaded).
  const toggleChapterPreview = useCallback(
    (entry) => {
      setOpenChapterId((prev) => (prev === entry.chapterId ? null : entry.chapterId));
      if (entry.taskId === taskId) return;
      if (chapterPagesCache[entry.taskId]) return;
      setChapterPagesLoadingId(entry.taskId);
      fetchPagesForTask(entry.taskId)
        .then((pages) => {
          setChapterPagesCache((prev) => ({ ...prev, [entry.taskId]: pages || [] }));
        })
        .catch(() => {
          setChapterPagesCache((prev) => ({ ...prev, [entry.taskId]: [] }));
        })
        .finally(() => {
          setChapterPagesLoadingId((prev) => (prev === entry.taskId ? null : prev));
        });
    },
    [taskId, chapterPagesCache]
  );




  

  

  
  const resolveNaturalSize = (imgEl, expectedImageUrl) => {
    const imgLoaded = !!imgEl && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0;
    if (imgLoaded) {
      return Promise.resolve({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
    }
    return new Promise((resolve) => {
      if (!expectedImageUrl) {
        resolve({ width: 1000, height: 1400 });
        return;
      }
      const probe = new Image();
      probe.onload = () => resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
      probe.onerror = () => resolve({ width: 1000, height: 1400 });
      probe.src = expectedImageUrl;
    });
  };

  const persistBubbles = useCallback(
    (pageId, selectionsArray, expectedImageUrl) => {
      if (!pageId) return Promise.resolve(false);
      if (!canEdit) return Promise.resolve(false);

      setSaveStatus("saving");

      return Promise.all([
        waitForValidCanvasSize(canvasRef),
        resolveNaturalSize(imgElRef.current, expectedImageUrl),
      ]).then(([canvasSize, naturalSize]) => {
        if (canvasSize.width <= 0 || canvasSize.height <= 0) {

          

          console.error(
            "[persistBubbles] Aborting save — canvas still has no valid size after waiting. Bubbles were NOT saved to avoid corrupting coordinates."
          );
          setSaveStatus("unsaved");
          return false;
        }
        const percentSelections = selectionsToImagePercent(selectionsArray, canvasSize, naturalSize);
        const payload = { selections: percentSelections };
        const bubblesJson = JSON.stringify(payload);
        return saveBubblesForPage(pageId, payload).then((success) => {
          if (!success) {
            setSaveStatus("unsaved");
            return false;
          }
          setTaskPages((prev) =>
            prev.map((p) => (p.pageId === pageId || p.id === pageId ? { ...p, bubbles: bubblesJson } : p))
          );
          setSaveStatus("saved");
          return true;
        });
      });
    },
    [canvasRef, canEdit]
  );


  

  
  
  const persistCurrentPage = useCallback(() => {
    if (currentPageMeta?.pageId) {
      return persistBubbles(currentPageMeta.pageId, selectionsRef.current, currentImage);
    }
    return Promise.resolve(false);
  }, [currentPageMeta, currentImage, persistBubbles]);

  const switchToTask = useCallback(
    (entry, pageNumber = null) => {
      if (!entry || !entry.taskId || String(entry.taskId) === String(taskId)) return;
      pendingTargetPageRef.current = pageNumber;
      persistCurrentPage();
      const newPath = location.pathname.replace(String(taskId), String(entry.taskId));
      navigate(newPath);
    },
    [taskId, location.pathname, navigate, persistCurrentPage]
  );


  const goToPage = useCallback(
    (index) => {
      if (index < 0 || index >= images.length) return;

      

      persistCurrentPage();
      setCurrentPageIndex(index);
    },
    [images.length, persistCurrentPage]
  );

  const handleSelectPage = useCallback(
    (entry, pageIndex) => {
      if (entry.chapterId === currentChapterId) {
        goToPage(pageIndex);
      } else {
        switchToTask(entry, pageIndex + 1);
      }
    },
    [currentChapterId, goToPage, switchToTask]
  );

  const gotoProjectList = useCallback(() => {
    persistCurrentPage();

    const activeProjectTeamId =
      chapterData?.projectTeamId ||
      chapterData?.project_id ||
      chapterData?.teamId ||
      localStorage.getItem('comiverse_active_project_id') ||
      (taskId && String(taskId).startsWith('task-') ? String(taskId).replace('task-', '') : null);

    if (activeProjectTeamId) {
      navigate('/translator/project-teams', {
        state: { teamId: activeProjectTeamId, tab: 'tasks' },
      });
    } else {
      navigate('/translator/project-teams', {
        state: { tab: 'tasks' },
      });
    }
  }, [navigate, chapterData, taskId, persistCurrentPage]);

  const handleSaveAndNext = useCallback(() => {

    
    goToPage(currentPageIndex + 1);
  }, [goToPage, currentPageIndex]);

  const handleSaveProgress = useCallback(() => {
    if (!canEdit) {
      toast.warning("You don't have permission to edit this task.");
      return;
    }
    persistCurrentPage().then((success) => {
      if (success !== false) {
        toast.success("Translation saved successfully!");
      }
    });
  }, [persistCurrentPage, canEdit]);

  const isLastPage = images.length > 0 && currentPageIndex === images.length - 1;

  const handleSend = useCallback(async () => {
    if (!isLastPage || sending || !canEdit) return;

    setSending(true);
    try {

      

      
      const saved = await persistCurrentPage();
      if (saved === false) {
        alert(
          "Your latest changes on this page couldn't be saved to the server. " +
            "Please check your connection and try Send again — submitting now would send the team an outdated version."
        );
        return;
      }
      await submitTaskForReview(taskId);
      navigate("/translator/project-teams", {
        state: { teamId: chapterData?.projectTeamId, tab: "tasks" },
      });
    } catch (err) {
      console.error("Failed to submit for review:", err);
      alert("Failed to submit chapter for review. Please try again.");
    } finally {
      setSending(false);
    }
  }, [isLastPage, sending, canEdit, persistCurrentPage, taskId, navigate, chapterData]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (!isSaveShortcut) return;
      e.preventDefault();
      handleSaveProgress();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSaveProgress]);

  useEffect(() => {
    isLoadingPageRef.current = true;
    clearSelections();
    setImageNaturalSize(null);
    setSaveStatus("saved");

    pendingBubblesRef.current = currentPageMeta?.bubbles ?? null;

    if (!currentImage) {
      applyPendingBubbles(null);
    }


    const pageIdBeingViewed = currentPageMeta?.pageId;
    const imageUrlBeingViewed = currentImage;


    

    
    
    return () => {
      if (pageIdBeingViewed) {
        persistBubbles(pageIdBeingViewed, selectionsRef.current, imageUrlBeingViewed);
      }
    };
    
  }, [currentPageIndex, currentChapterId]);

  const applyPickedColor = (hex) => {
    if (hex === "CORS_ERROR") {
      alert(
        "Couldn't pick the color — the image comes from a server that doesn't allow pixel reads (CORS error). " +
          "The image server needs to send an Access-Control-Allow-Origin header for this feature to work."
      );
    } else if (hex && activeId != null) {
      if (pickingColorFor === "text") updateSelectionStyle(activeId, { textColor: hex });
      else updateSelectionStyle(activeId, { textBgColor: hex });
    }
    setPickingColorFor(null);
  };

  const handleCanvasMouseDown = (e) => {
    if (pickingColorFor && canvasRef.current) {
      e.stopPropagation();
      const bounds = canvasRef.current.getBoundingClientRect();
      const displayX = e.clientX - bounds.left;
      const displayY = e.clientY - bounds.top;
      applyPickedColor(readColorAtDisplayPoint(displayX, displayY, bounds));
      return;
    }
    handleMouseDown(e);
  };

  const handleCropColorPick = (clickX, clickY, _box, scale, boxXInImage, boxYInImage, displayedWidth, displayedHeight) => {
    if (!pickingColorFor) return;
    applyPickedColor(readColorInCrop(clickX, clickY, scale, boxXInImage, boxYInImage, displayedWidth, displayedHeight));
  };

  if (status === "loading") {
    return <div className="tw-root tw-loading">Loading chapter…</div>;
  }

  if (status === "error") {
    return <div className="tw-root tw-loading">Loading error: {error}</div>;
  }

  return (
    <div className="tw-root">
      <TranslateHeaderBar
        comicTitle={chapterData?.comicTitle}
        chapterTitle={deriveChapterTitle(chapterData)}
        onBack={gotoProjectList}
        onSend={handleSend}
        canSend={isLastPage && canEdit}
        canEdit={canEdit}
        sending={sending}
        saveStatus={saveStatus}
      />

      <div className="tw-body">
        <aside className={`tw-sidebar ${leftSidebarOpen ? "" : "tw-sidebar--collapsed"}`}>
          {leftSidebarOpen && (
            <>
              <p className="tw-sidebar-label">PROJECT FILES</p>
              <ChapterList
                chapters={sidebarChapters}
                openChapterId={openChapterId}
                onToggleChapter={toggleChapterPreview}
                chapterPagesLoading={chapterPagesLoadingId}
                currentChapterId={currentChapterId}
                currentPageIndex={currentPageIndex}
                onSelectPage={handleSelectPage}
              />
            </>
          )}
        </aside>

        <div className="tw-x-sidebar-toggle-wrap">
          <button
            type="button"
            onClick={() => setLeftSidebarOpen((v) => !v)}
            title={leftSidebarOpen ? "Hide left panel" : "Show left panel"}
            className="tw-x-sidebar-toggle-btn"
          >
            {leftSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <main className="tw-x-main-content" id="secure-workspace">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="tw-canvas-toolbar">
              <ShapeToolbar
                activeTool={activeTool}
                canEdit={canEdit}
                onSetTool={(tool) => {
                  cancelZoomPick();
                  setActiveTool(tool);
                }}
              />
              <PageNav
                images={images}
                currentPageIndex={currentPageIndex}
                goToPage={goToPage}
                zoomScale={zoomScale}
                isPickingZoomPoint={isPickingZoomPoint}
                onStartZoomIn={toggleZoomIn}
                onZoomOut={zoomOut}
                onResetZoom={resetZoom}
              />
            </div>

            <div className="tw-canvas-toolbar tw-x-toolbar-row2">
              <CanvasToolbar
                isBold={activeSelection?.isBold ?? false}
                isItalic={activeSelection?.isItalic ?? false}
                textAlign={activeSelection?.textAlign ?? "left"}
                fontSize={activeSelection?.fontSize ?? 13}
                fontFamily={activeSelection?.fontFamily ?? COMIC_FONT_LIBRARY[0].value}
                textColor={activeSelection?.textColor ?? "#000000"}
                textBgColor={activeSelection?.textBgColor ?? "#ffffff"}
                hasActiveSelection={activeSelection != null && canEdit}
                onToggleBold={() =>
                  activeId != null && updateSelectionStyle(activeId, { isBold: !(activeSelection?.isBold) })
                }
                onToggleItalic={() =>
                  activeId != null && updateSelectionStyle(activeId, { isItalic: !(activeSelection?.isItalic) })
                }
                onSetTextAlign={(align) => activeId != null && updateSelectionStyle(activeId, { textAlign: align })}
                onIncreaseFontSize={() =>
                  activeId != null &&
                  updateSelectionStyle(activeId, { fontSize: Math.min((activeSelection?.fontSize ?? 13) + 1, 72) })
                }
                onDecreaseFontSize={() =>
                  activeId != null &&
                  updateSelectionStyle(activeId, { fontSize: Math.max((activeSelection?.fontSize ?? 13) - 1, 1) })
                }
                onChangeFontFamily={(value) => activeId != null && updateSelectionStyle(activeId, { fontFamily: value })}
                onChangeTextColor={(color) => activeId != null && updateSelectionStyle(activeId, { textColor: color })}
                onChangeTextBgColor={(color) => activeId != null && updateSelectionStyle(activeId, { textBgColor: color })}
                onPickTextColor={pickTextColorFromScreen}
                onPickTextBgColor={pickBackgroundColorFromScreen}
              />
            </div>
          </div>

          <PageImage
            currentImage={currentImage}
            currentPageIndex={currentPageIndex}
            canvasRef={canvasRef}
            imgRef={imgElRef}
            bubbleRefs={bubbleRefs}
            drawing={drawing}
            selections={selections}
            activeId={activeId}
            activeTool={activeTool}
            polygonDraft={polygonDraft}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onFinishPolygon={finishPolygon}
            onCancelPolygon={cancelPolygon}
            onSelectArea={selectArea}
            onImageLoad={handleImageLoad}
            onStartMove={startMove}
            onStartResize={startResize}
            onStartVertexDrag={startVertexDrag}
            onChangeTranslation={updateTranslation}
            isPickingColor={pickingColorFor != null}
            zoomScale={zoomScale}
            zoomOrigin={zoomOrigin}
            isPickingZoomPoint={isPickingZoomPoint}
          />
        </main>

        <TranslationSidePanel
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          activeSelection={activeSelection}
          bubbleIndex={activeSelectionIndex}
          bubbleTotal={selections.length}
          onSelectPrev={selectPrev}
          onSelectNext={selectNext}
          onChangeTranslation={(text) => activeId != null && updateTranslation(activeId, text)}
          textStyle={textStyle}
          onSaveProgress={handleSaveProgress}
          currentImage={currentImage}
          canvasRef={canvasRef}
          imageNaturalSize={imageNaturalSize}
          isPickingColor={pickingColorFor != null}
          onPickColorInCrop={handleCropColorPick}
          onDeleteArea={deleteArea}
          zoomScale={zoomScale}
          changeRequests={changeRequests}
          changeRequestsLoading={changeRequestsLoading}
          resolveBubbleLabel={resolveBubbleLabel}
          userFullName={userFullName}
          onSelectBubble={selectArea}
          comicId={chapterData?.comicId}
          pageId={currentPageMeta?.pageId}
          canEdit={canEdit}
          projectTeamId={chapterData?.projectTeamId}
        />
      </div>
    </div>
  );
}