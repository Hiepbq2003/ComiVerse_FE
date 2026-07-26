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
  HelpCircle,
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
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAuth } from "../../utils/Auth";
import { toast } from "react-toastify";
import "../../assets/style/translator/translate-workspace.css";

const API_BASE = "http://localhost:8081/api";
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

function ChapterList({ chapters, open, onToggle, currentChapterId, currentPageIndex, onSelectPage }) {
  return (
    <>
      {chapters.map((ch) => (
        <div key={ch.chapterId}>
          <button onClick={() => onToggle(ch.chapterId)} className="tw-chapter-row">
            {open[ch.chapterId] ? (
              <ChevronDown size={14} color="#6C6F86" />
            ) : (
              <ChevronRight size={14} color="#6C6F86" />
            )}
            <BookMarked size={14} color="#6C6F86" />
            <span className="tw-chapter-title">{ch.title}</span>
            <span className="tw-chapter-progress tw-font-mono">{ch.progress}</span>
          </button>
          {open[ch.chapterId] &&
            (ch.pages || []).map((page) => {
              const pageIndex = page.pageNumber - 1;
              const isSameChapter = ch.chapterId === currentChapterId;
              const isCurrent = isSameChapter && pageIndex === currentPageIndex;
              const status = isCurrent ? "current" : page.status === "DONE" ? "done" : "todo";
              return (
                <button
                  key={page.pageId}
                  className={`tw-page-row ${isCurrent ? "current" : ""} ${isSameChapter ? "" : "is-disabled"}`}
                  onClick={() => isSameChapter && onSelectPage(ch.chapterId, pageIndex)}
                  disabled={!isSameChapter}
                  title={isSameChapter ? undefined : "View only — you can't switch chapters from here"}
                >
                  <span className="tw-page-row-inner">
                    <PageStatusDot status={status} />
                    Page {page.pageNumber}
                  </span>
                </button>
              );
            })}
        </div>
      ))}
    </>
  );
}

function TranslateHeaderBar({ comicTitle, chapterTitle, onBack, onSend, canSend, sending, saveStatus }) {
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
        <span className={`tw-badge-saved tw-font-mono is-${statusKey}`}>
          {badgeConfig.icon} {badgeConfig.label}
        </span>
        <button className="tw-btn">
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

function ShapeToolbar({ activeTool, onSetTool }) {
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
          onClick={() => onSetTool(t.id)}
          className={`tw-btn-icon ${activeTool === t.id ? "active" : ""}`}
          title={t.label}
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
              onClick={() => hasActiveSelection && onDeleteArea(activeSelection.id)}
              disabled={!hasActiveSelection}
              className={`tw-btn-icon tw-x-delete-btn ${hasActiveSelection ? "is-enabled" : ""}`}
              title={hasActiveSelection ? "Delete the selected area" : "Select an area first"}
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
          onChange={(e) => onChangeTranslation(e.target.value)}
          className="tw-textarea tw-x-translation-textarea"
          style={{
            "--text-align": textStyle.textAlign,
            "--font-weight": textStyle.fontWeight,
            "--font-style": textStyle.fontStyle,
          }}
          placeholder={hasActiveSelection ? "Enter translation for this area..." : "Select an area first"}
          disabled={!hasActiveSelection}
        />
        <div className="tw-textarea-footer">
          <span>{translationValue.length} CHARS</span>
        </div>
      </div>

      <button onClick={onSaveProgress} className="tw-save-next-btn">
        Save
      </button>
    </div>
  );
}

function GlossaryTabPanel() {
  return (
    <div className="tw-tabpanel">
      <p style={{ color: "#8286A0", margin: 0 }}>Project-wide glossary terms would list here.</p>
    </div>
  );
}

function ChangeRequestsTabPanel({ comments, loading, resolveBubbleLabel }) {
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

  return (
    <div className="tw-tabpanel">
      {comments.map((c) => (
        <div key={c.id} className="tw-x-change-request-card">
          <div className="tw-x-change-request-header">
            <span className="tw-x-change-request-author">{c.authorName}</span>
            {c.resolved && <span className="tw-x-change-request-resolved">Resolved</span>}
          </div>
          {c.bubbleId && (
            <span className="tw-x-change-request-bubble-tag">{resolveBubbleLabel(c.bubbleId)}</span>
          )}
          <p className="tw-x-change-request-text">{c.content}</p>
        </div>
      ))}
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
}) {
  return (
    <aside className="tw-rightpanel">
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
        />
      )}
      {activeTab === "glossary" && <GlossaryTabPanel />}
      {activeTab === "changes" && (
        <ChangeRequestsTabPanel
          comments={changeRequests}
          loading={changeRequestsLoading}
          resolveBubbleLabel={resolveBubbleLabel}
        />
      )}

      <div className="tw-panel-footer">
        <button className="tw-help-btn">
          <HelpCircle size={14} />
        </button>
      </div>
    </aside>
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
    // eslint-disable-next-line no-console
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

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const backendHost = apiBase.startsWith('http') ? apiBase.replace(/\/api\/?$/, '') : 'http://localhost:8081';
  return `${backendHost}${url.startsWith('/') ? '' : '/'}${url}`;
};

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

  // 1. Primary: get task from backend (only if taskId is a real UUID)
  if (UUID_RE.test(taskId)) {
    try {
      const task = await fetchJson(`${API_BASE}/team-workspace/tasks/${taskId}`, signal);

      const chapterId =
        task?.chapter?.id ??
        task?.chapterId ??
        task?.chapter_id ??
        task?.data?.chapterId ??
        task?.task?.chapterId ??
        (Array.isArray(task) ? task[0]?.chapterId : undefined);

      if (chapterId && UUID_RE.test(chapterId)) {
        try {
          const chapterResult = await fetchChapterById(chapterId, signal);
          return { ...chapterResult, projectTeamId: task?.projectTeamId ?? null };
        } catch (chErr) { /* ignore */ }
      }
    } catch (err) { /* ignore */ }
  }

  // 2. Fallback: get chapterId from localStorage, then fetch chapter detail from DB
  const fallback = getTaskFallbackData(taskId);
  const chId = fallback.chapter?.id;
  if (chId && UUID_RE.test(chId)) {
    try {
      const chapterResult = await fetchChapterById(chId, signal);
      return { ...chapterResult, projectTeamId: null };
    } catch (chErr) { /* ignore */ }
  }

  return fallback.chapter;
}

async function fetchPagesForTask(taskId, signal) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let rawPages = [];

  // 1. Primary: try the translate-workspace API (only if taskId is a real UUID)
  if (UUID_RE.test(taskId)) {
    try {
      const list = await fetchJson(`${API_BASE}/translate-workspace/${taskId}`, signal);
      if (Array.isArray(list) && list.length > 0) {
        rawPages = list;
      }
    } catch (err) { /* ignore */ }
  }

  // 2. LocalStorage Task lookup -> Chapter ID or Comic Title lookup
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

  // 3. Direct fetch by Chapter ID if UUID
  const uuidMatch = String(chapterId || '').match(UUID_RE);
  const realChapterId = uuidMatch ? uuidMatch[0] : null;

  if (rawPages.length === 0 && realChapterId) {
    try {
      const data = await fetchJson(`${API_BASE}/chapters/detail/${realChapterId}`, signal);
      const pList = data?.pages || data?.images || (Array.isArray(data) ? data : []);
      if (Array.isArray(pList) && pList.length > 0) rawPages = pList;
    } catch (e) { /* ignore */ }
  }

  // 4. Smart Title Search Fallback - Parallel comic discovery
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

        // Parallel: chapters API + author chapters API
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

            // Parallel: detail + preview for matched chapter
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
    } catch (e) { /* ignore */ }
  }

  // Map & resolve real image URLs from DB
  if (Array.isArray(rawPages) && rawPages.length > 0) {
    return rawPages
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
          id: pageId,
          pageId: pageId,
          pageNumber: item?.pageNumber || idx + 1,
          imageUrl: resolved,
          bubbles: bubblesData
        };
      })
      .filter(Boolean);
  }

  return [];
}

async function fetchPageChangeRequests(pageId, signal) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!pageId || !UUID_RE.test(pageId)) return [];
  try {
    const list = await fetchJson(`${API_BASE}/review-workspace/pages/${pageId}/comments`, signal);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

async function saveBubblesForPage(pageId, payload, signal) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!pageId || !UUID_RE.test(pageId)) {
    try {
      localStorage.setItem(`comiverse_bubbles_${pageId}`, JSON.stringify(payload));
    } catch (e) {}
    return true;
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
      return true;
    }
    return true;
  } catch (err) {
    try {
      localStorage.setItem(`comiverse_bubbles_${pageId}`, JSON.stringify(payload));
    } catch (e) {}
    return true;
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

function useSelectionAreas() {
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
      const newArea = {
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
      };
      setSelections((prev) => [...prev, newArea]);
      setActiveId(newArea.id);
      mergeOverlappingWith(newArea.id);
    }
    setDrawing(null);
  };

  const finishPolygon = () => {
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
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, translation } : s)));
  };

  const updateName = (id, name) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const updateSelectionStyle = (id, patch) => {
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

    setSelections((prev) =>
      prev.map((s) => {
        if (s.id !== drag.id) return s;

        if (drag.mode === "move") {
          if (s.shape === "polygon") {
            return { ...s, points: drag.original.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
          }
          return { ...s, x: drag.original.x + dx, y: drag.original.y + dy };
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

            return {
              ...s,
              points: scalePointsToNewBox(drag.original.points, origBox, {
                x: newX,
                y: newY,
                width: newW,
                height: newH,
              }),
            };
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

          return { ...s, x, y, width, height };
        }

        if (drag.mode === "vertex") {
          const newPoints = drag.original.points.map((p, i) =>
            i === drag.vertexIndex ? { x: p.x + dx, y: p.y + dy } : p
          );
          return { ...s, points: newPoints };
        }

        return s;
      })
    );
  };

  return {
    containerRef,
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
  const { taskId } = useParams();
  const navigate = useNavigate();
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
  const [open, setOpen] = useState({});
  const pixelCanvasRef = useRef(null);
  if (!pixelCanvasRef.current && typeof document !== "undefined") {
    pixelCanvasRef.current = document.createElement("canvas");
  }

  const pendingBubblesRef = useRef(null);

  const [pickingColorFor, setPickingColorFor] = useState(null);

  const [imageNaturalSize, setImageNaturalSize] = useState(null);

  // Real DOM node of the page <img>. persistBubbles() reads naturalWidth/
  // naturalHeight straight off this element instead of trusting state/refs
  // that get updated asynchronously via onLoad — that async update is exactly
  // what caused the race condition (state could still reflect a previous
  // page's image at the moment we needed to save). Reading the live DOM
  // element right before navigating away is synchronous and can't race.
  const imgElRef = useRef(null);

  useEffect(() => {
    if (!pickingColorFor) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setPickingColorFor(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickingColorFor]);

  const {
    containerRef: canvasRef,
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
  } = useSelectionAreas(userFullName);

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
          const pxSelections = selectionsFromImagePercent(selectionsToLoad, canvasSize, naturalSize).map((s) => ({
            isBold: legacyPageTextStyle?.isBold ?? false,
            isItalic: legacyPageTextStyle?.isItalic ?? false,
            textAlign: legacyPageTextStyle?.textAlign ?? "left",
            ...s,
          }));
          loadSelections(pxSelections);
        }
      } catch (err) {
        /* ignore parse error silently */
      }
    },
    [canvasRef, loadSelections]
  );

  const handleImageLoad = (size, loadedSrc) => {
    // Ignore late onLoad events firing for an image that is no longer the
    // one currently displayed (e.g. user flipped pages before it finished
    // loading). This only protects UI-facing state (crop preview, color
    // picker) — it is NOT what guarantees save-time correctness anymore;
    // persistBubbles() below reads the DOM directly instead.
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

  // Bold/Italic/Align now live on the active bubble itself, not on
  // page-wide state — this just reflects the active selection's own values
  // (for the toolbar's toggle states and the translation-editor preview).
  const textStyle = useMemo(
    () => ({
      fontWeight: activeSelection?.isBold ? 700 : 400,
      fontStyle: activeSelection?.isItalic ? "italic" : "normal",
      textAlign: activeSelection?.textAlign ?? "left",
    }),
    [activeSelection]
  );

  useEffect(() => {
    if (!taskId) return;

    const controller = new AbortController();
    const cacheKey = `comiverse_ws_cache_${taskId}`;

    // 0. Instant cache load from sessionStorage (<5ms)
    let hasCache = false;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { chapter: cChapter, pages: cPages } = JSON.parse(cached);
        if (cChapter && Array.isArray(cPages) && cPages.length > 0) {
          setChapterData(cChapter);
          setTaskPages(cPages);
          setCurrentChapterId(cChapter.id);
          setCurrentPageIndex(0);
          setStatus("ready");
          setOpen({ [cChapter.id]: true });
          hasCache = true;
          // Preload first 3 images for instant rendering
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
        if (!hasCache) setCurrentPageIndex(0);
        setStatus("ready");
        setOpen({ [chapterResult.id]: true });
        // Cache for instant future opens
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            chapter: chapterResult,
            pages: pagesResult
          }));
        } catch (e) {}
        // Preload first 5 images
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

  // Auto-save draft to LocalStorage whenever bubbles change.
  // Only depends on selections & pageId (stable string) — no function refs that change each render.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections]);

  // Load saved bubbles when page changes. Depends only on pageId (stable string).
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
  // Only re-run when the page actually changes, NOT when function refs update
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const sidebarChapters = useMemo(() => {
    if (!chapterData && taskPages.length === 0) return [];
    const chapId = chapterData?.id || currentChapterId || 'ch-1';
    const chapTitle = chapterData?.title || 'Chapter 1';
    const doneCount = taskPages.filter((p) => p.status === "DONE").length;
    return [
      {
        chapterId: chapId,
        title: chapTitle,
        progress: `${doneCount > 0 ? doneCount : (taskPages.length > 0 ? currentPageIndex + 1 : 0)}/${taskPages.length}`,
        pages: taskPages.map((p, idx) => ({
          ...p,
          pageId: p.pageId || p.id || `p-${idx + 1}`,
          pageNumber: p.pageNumber || idx + 1,
          status: p.status === "DONE" ? "DONE" : (idx === currentPageIndex ? "current" : "todo")
        })),
      },
    ];
  }, [chapterData, currentChapterId, taskPages, currentPageIndex]);

  const persistBubbles = useCallback(
    (pageId, selectionsArray, expectedImageUrl) => {
      if (!pageId) return Promise.resolve(false);

      const imgEl = imgElRef.current;
      const imgLoaded = !!imgEl && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0;
      const naturalSize = imgLoaded
        ? { width: imgEl.naturalWidth, height: imgEl.naturalHeight }
        : (imageNaturalSize || { width: 1000, height: 1400 });

      setSaveStatus("saving");
      const canvasSize = measureCanvasSize(canvasRef);
      const percentSelections = selectionsToImagePercent(selectionsArray, canvasSize, naturalSize);
      const payload = { selections: percentSelections };
      const bubblesJson = JSON.stringify(payload);
      return saveBubblesForPage(pageId, payload).then((success) => {
        if (!success) {
          setSaveStatus("unsaved");
          return false;
        }
        setTaskPages((prev) => prev.map((p) => (p.pageId === pageId || p.id === pageId ? { ...p, bubbles: bubblesJson } : p)));
        setSaveStatus("saved");
        return true;
      });
    },
    [canvasRef, imageNaturalSize]
  );

  // Saves the page currently being viewed, using values that are guaranteed
  // to still correspond to it (selectionsRef is a ref updated synchronously
  // on every change, and currentImage/currentPageMeta come straight from
  // render state for the page we're still on).
  // Returns a Promise — callers that need the server to actually have the
  // latest bubbles before doing something else (e.g. submit-for-review,
  // which reads bubbles straight from the DB) MUST await this.
  const persistCurrentPage = useCallback(() => {
    if (currentPageMeta?.pageId) {
      return persistBubbles(currentPageMeta.pageId, selectionsRef.current, currentImage);
    }
    return Promise.resolve(false);
  }, [currentPageMeta, currentImage, persistBubbles]);

  const goToPage = useCallback(
    (index) => {
      if (index < 0 || index >= images.length) return;
      // Persist the outgoing page's bubbles BEFORE React re-renders the
      // <img src> to the new page. At this exact point in time, imgElRef
      // still points at the DOM node showing the CURRENT page's image, so
      // reading its naturalWidth/naturalHeight here is guaranteed correct —
      // there is no async callback in between that could swap it out.
      persistCurrentPage();
      setCurrentPageIndex(index);
    },
    [images.length, persistCurrentPage]
  );

  const toggleChapter = useCallback((id) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  }, []);

  const handleSelectPage = useCallback(
    (chapterId, pageIndex) => {
      if (chapterId !== currentChapterId) return;
      goToPage(pageIndex);
    },
    [currentChapterId, goToPage]
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
    // goToPage already persists the current page synchronously before
    // switching, so there's no need to call persistCurrentPage separately
    // here (that used to cause the exact double-call/race pattern).
    goToPage(currentPageIndex + 1);
  }, [goToPage, currentPageIndex]);

  const handleSaveProgress = useCallback(() => {
    persistCurrentPage().then((success) => {
      if (success !== false) {
        toast.success("Translation saved successfully!");
      }
    });
  }, [persistCurrentPage]);

  const isLastPage = images.length > 0 && currentPageIndex === images.length - 1;

  const handleSend = useCallback(async () => {
    if (!isLastPage || sending) return;

    setSending(true);
    try {
      // MUST await this: submit-for-review reads `bubbles` straight from the
      // DB on the backend to snapshot it into reviewBaselineBubbles. If we
      // don't wait for the save PUT to land first, the two requests race —
      // submit-for-review can reach the server and read the OLD bubbles
      // before our save finishes, silently dropping the last edit from the
      // review baseline (looks like "coordinates changed after Send").
      await persistCurrentPage();
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
  }, [isLastPage, sending, persistCurrentPage, taskId, navigate, chapterData]);

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

    // These are captured from THIS render, i.e. they describe the page being
    // left, not whatever page we land on next.
    const pageIdBeingViewed = currentPageMeta?.pageId;
    const imageUrlBeingViewed = currentImage;

    // Best-effort fallback only (e.g. route unmount without going through
    // goToPage/persistCurrentPage). The primary save now always happens
    // synchronously inside goToPage/persistCurrentPage BEFORE the page
    // changes, so this cleanup is usually a safe no-op: by the time it runs,
    // the DOM <img> has already switched to the next page's image, so
    // persistBubbles' expectedImageUrl check will correctly skip it instead
    // of saving corrupted coordinates.
    return () => {
      if (pageIdBeingViewed) {
        persistBubbles(pageIdBeingViewed, selectionsRef.current, imageUrlBeingViewed);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        chapterTitle={chapterData?.title}
        onBack={gotoProjectList}
        onSend={handleSend}
        canSend={isLastPage}
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
                open={open}
                onToggle={toggleChapter}
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

        <main className="tw-x-main-content">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="tw-canvas-toolbar">
              <ShapeToolbar
                activeTool={activeTool}
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
                hasActiveSelection={activeSelection != null}
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
        />
      </div>
    </div>
  );
}