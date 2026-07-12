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
import polygonClipping from "polygon-clipping";
import { useAuth } from "../../context/AuthContext";
import "../../assets/style/translator/TranslateWorkspace.css";

const API_BASE = "http://localhost:8081/api";
const TOKEN_KEY = "token";
const IS_DEV = process.env.NODE_ENV === "development";

// =============================================================================
// Constants
// =============================================================================

const TABS = [
  { id: "translate", label: "Translate" },
  { id: "glossary", label: "Glossary" },
  { id: "chat", label: "Chat" },
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

// =============================================================================
// Small presentational components
// =============================================================================

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
              const pageIndex = page.pageNumber - 1; // API returns pageNumber (1-based), state uses index (0-based)
              const isSameChapter = ch.chapterId === currentChapterId;
              const isCurrent = isSameChapter && pageIndex === currentPageIndex;
              // Real status from the DB (DONE/TODO); the currently open page always shows "current" first
              const status = isCurrent ? "current" : page.status === "DONE" ? "done" : "todo";
              return (
                <button
                  key={page.pageId}
                  className={`tw-page-row ${isCurrent ? "current" : ""}`}
                  onClick={() => isSameChapter && onSelectPage(ch.chapterId, pageIndex)}
                  disabled={!isSameChapter}
                  title={isSameChapter ? undefined : "View only — you can't switch chapters from here"}
                  style={!isSameChapter ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
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

function TranslateHeaderBar({ comicTitle, chapterTitle, onBack, onSaveProgress, saveStatus }) {
  // Inline @keyframes for the spinning "saving" icon — scoped here since this is the
  // only place in the app that needs a spin animation; no need to touch the external CSS file.
  const badgeConfig = {
    saving: { icon: <Loader2 size={11} strokeWidth={3} className="tw-spin" />, label: "SAVING", color: "#5472b0" },
    saved: { icon: <Check size={11} strokeWidth={3} />, label: "SAVED", color: "#16a34a" },
    unsaved: { icon: <AlertCircle size={11} strokeWidth={3} />, label: "UNSAVED", color: "#c1440e" },
  }[saveStatus ?? "unsaved"];

  return (
    <header className="tw-header">
      <style>{`
        @keyframes tw-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tw-spin { animation: tw-spin 0.8s linear infinite; }
      `}</style>
      <div className="tw-header-left">
        <button onClick={onBack} className="tw-btn">
          <ChevronLeft size={16} />
          Project list
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
        <span
          className="tw-badge-saved tw-font-mono"
          style={{ color: badgeConfig.color, borderColor: `${badgeConfig.color}66`, background: `${badgeConfig.color}1a` }}
        >
          {badgeConfig.icon} {badgeConfig.label}
        </span>
        <button className="tw-btn">
          <Upload size={14} /> Upload
        </button>
        <button className="tw-btn" onClick={onSaveProgress}>
          <Save size={14} /> Save progress
        </button>
        <button className="tw-btn-primary">
          <Send size={14} /> Send
        </button>
      </div>
    </header>
  );
}

// Dropdown chọn font TỰ LÀM (không dùng <select> gốc) — vì <select>/<option> của
// trình duyệt rất khó ép màu chữ/nền (phần lớn do OS/browser tự vẽ, CSS không can
// thiệp được triệt để), và không kiểm soát được số dòng hiện ra trước khi cuộn.
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

  // Đóng dropdown khi click ra ngoài
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
    <div ref={containerRef} style={{ position: "relative", opacity: hasActiveSelection ? 1 : 0.4 }}>
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
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: 180,
            // 5 dòng vừa đủ hiện ra (mỗi dòng ~28px), quá số đó sẽ cuộn thay vì kéo dài mãi
            maxHeight: 28 * 5,
            overflowY: "auto",
            background: "#ffffff",
            color: "#111111",
            border: "1px solid #d0d0d0",
            borderRadius: 6,
            boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
            zIndex: 50,
          }}
        >
          {Object.entries(fontGroups).map(([groupName, fonts]) => (
            <div key={groupName}>
              <div
                style={{
                  padding: "6px 10px 2px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6b7280",
                  background: "#f5f5f5",
                  position: "sticky",
                  top: 0,
                }}
              >
                {groupName}
              </div>
              {fonts.map((font) => (
                <div
                  key={font.name}
                  onClick={() => {
                    onChangeFontFamily(font.value);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "6px 10px",
                    fontSize: 13,
                    color: "#111111",
                    background: font.value === fontFamily ? "#e5e7eb" : "#ffffff",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = font.value === fontFamily ? "#e5e7eb" : "#ffffff")
                  }
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
      <button type="button" onClick={onToggleBold} className={`tw-btn-icon ${isBold ? "active" : ""}`} title="Bold">
        <Bold size={14} />
      </button>
      <button type="button" onClick={onToggleItalic} className={`tw-btn-icon ${isItalic ? "active" : ""}`} title="Italic">
        <Italic size={14} />
      </button>
      <button type="button" onClick={() => onSetTextAlign("left")} className={`tw-btn-icon ${textAlign === "left" ? "active" : ""}`} title="Align left">
        <AlignLeft size={14} />
      </button>
      <button type="button" onClick={() => onSetTextAlign("center")} className={`tw-btn-icon ${textAlign === "center" ? "active" : ""}`} title="Align center">
        <AlignCenter size={14} />
      </button>
      <button type="button" onClick={() => onSetTextAlign("right")} className={`tw-btn-icon ${textAlign === "right" ? "active" : ""}`} title="Align right">
        <AlignRight size={14} />
      </button>

      {/* Font size — ONLY applies to the currently selected area, not a global setting (same pattern as text/bg color below) */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4, opacity: hasActiveSelection ? 1 : 0.4 }}>
        <button
          type="button"
          onClick={onDecreaseFontSize}
          disabled={!hasActiveSelection}
          className="tw-btn-icon"
          title={hasActiveSelection ? "Decrease font size" : "Select an area first"}
        >
          <Minus size={13} />
        </button>
        <span style={{ fontSize: 12, color: "#8286A0", width: 24, textAlign: "center" }}>{fontSize}</span>
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

      {/* Text color — ONLY applies to the currently selected area, not a global setting */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 8, opacity: hasActiveSelection ? 1 : 0.4 }}>
        <label
          title={hasActiveSelection ? "Text color of the selected area" : "Select an area first"}
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.3)",
            background: textColor,
            cursor: hasActiveSelection ? "pointer" : "not-allowed",
            display: "inline-block",
          }}
        >
          <input
            type="color"
            value={textColor}
            disabled={!hasActiveSelection}
            onChange={(e) => onChangeTextColor(e.target.value)}
            style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
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

      {/* Background color (of the box/text) — ONLY applies to the currently selected area */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4, opacity: hasActiveSelection ? 1 : 0.4 }}>
        <label
          title={hasActiveSelection ? "Background color of the selected area" : "Select an area first"}
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.3)",
            background: textBgColor,
            cursor: hasActiveSelection ? "pointer" : "not-allowed",
            display: "inline-block",
          }}
        >
          <input
            type="color"
            value={textBgColor}
            disabled={!hasActiveSelection}
            onChange={(e) => onChangeTextBgColor(e.target.value)}
            style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
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

      <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 8 }}>
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
          style={{
            fontSize: 12,
            color: "#8286A0",
            width: 40,
            textAlign: "center",
            cursor: zoomScale !== 1 ? "pointer" : "default",
          }}
        >
          {Math.round(zoomScale * 100)}%
        </span>
      </div>
    </div>
  );
}

// PageImage receives the "selections" list (multiple speech bubbles) to render over the image
const RESIZE_HANDLES = ["nw", "ne", "sw", "se"];
const HANDLE_CURSOR = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize" };

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
  textStyle,
  isPickingColor,
  zoomScale,
  zoomOrigin,
  isPickingZoomPoint,
}) {
  return (
    <div className="tw-canvas">
      {/* In color-picking mode -> remind the user to click the image, or press Esc to cancel */}
      {isPickingColor && (
        <div
          style={{
            marginBottom: 8,
            padding: "4px 10px",
            fontSize: 12,
            color: "#fff",
            background: "#2563eb",
            borderRadius: 4,
            display: "inline-block",
          }}
        >
          Click the image to pick the color at that point — press Esc to cancel
        </div>
      )}

      {/* Polygon in progress -> show finish/cancel buttons */}
      {polygonDraft && polygonDraft.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#8286A0" }}>
            Drawing freeform shape: {polygonDraft.length} points (minimum 3)
          </span>
          <button type="button" onClick={onFinishPolygon} className="tw-btn" style={{ padding: "2px 10px", fontSize: 12 }}>
            Xong
          </button>
          <button type="button" onClick={onCancelPolygon} className="tw-btn" style={{ padding: "2px 10px", fontSize: 12 }}>
            Cancel
          </button>
        </div>
      )}

      <div
        className="tw-page"
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          position: "relative",
          cursor: isPickingZoomPoint ? "zoom-in" : "crosshair",
          transform: `scale(${zoomScale})`,
          transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
          // NO CSS transition here on purpose — if zoom animates over time, any click/draw
          // that happens DURING the animation reads getBoundingClientRect() at an
          // INTERMEDIATE (not-yet-final) visual size, but the code divides by the FINAL
          // zoomScale value (React state updates instantly) — mismatched intermediate vs
          // final values cause selections to be stored at the wrong position. Instant zoom
          // (no transition) guarantees bounds always match the current zoomScale exactly.
        }}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={`Page ${currentPageIndex + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            draggable={false}
            onLoad={(e) => onImageLoad?.({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
          />
        ) : (
          <div style={{ padding: 24, color: "#8286A0" }}>This chapter has no images yet.</div>
        )}

        {/* Dashed outline: rect/ellipse being dragged out */}
        {drawing && (
          <div
            style={{
              position: "absolute",
              left: drawing.x,
              top: drawing.y,
              width: drawing.width,
              height: drawing.height,
              border: "2px dashed #3b82f6",
              background: "rgba(59,130,246,0.15)",
              borderRadius: activeTool === "ellipse" ? "50%" : 0,
              pointerEvents: "none",
            }}
          />
        )}

        {/* SVG overlaying the whole frame, containing every polygon (finished + in progress) */}
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}
        >
          {/* Polygon in progress */}
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

          {/* Finished polygons */}
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
                  style={{ pointerEvents: "auto", cursor: isPickingZoomPoint ? "zoom-in" : isActive ? "move" : "pointer" }}
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

          {/* Per-vertex drag handles — shown as soon as a polygon is selected, no tool switch needed */}
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
                  style={{ pointerEvents: "auto", cursor: isPickingZoomPoint ? "zoom-in" : "grab" }}
                  onMouseDown={(e) => {
                    if (isPickingZoomPoint) return;
                    e.stopPropagation();
                    onStartVertexDrag(e, sel.id, i);
                  }}
                />
              ))
            )}

        </svg>

        {/* Translation input for polygons — <textarea> can't be embedded in SVG, so it's a separate
            HTML overlay, positioned via the bounding box */}
        {selections
          .filter((s) => s.shape === "polygon")
          .map((sel) => {
            const isActive = sel.id === activeId;
            const box = getBoundingBox(sel);
            return (
              <textarea
                key={`text-${sel.id}`}
                className="tw-inline-translation-textarea"
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
                  position: "absolute",
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                  resize: "none",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: sel.textColor ?? "#000000",
                  fontSize: `${sel.fontSize ?? 13}px`,
                  fontFamily: sel.fontFamily ?? COMIC_FONT_LIBRARY[0].value,
                  ...textStyle,
                  lineHeight: 1.25,
                  padding: 4,
                  cursor: isPickingZoomPoint ? "zoom-in" : isActive ? "move" : "text",
                  pointerEvents: "auto",
                  overflow: "hidden",
                }}
              />
            );
          })}

        {/* List of finished rect/ellipse selections */}
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
                style={{
                  position: "absolute",
                  left: sel.x,
                  top: sel.y,
                  width: sel.width,
                  height: sel.height,
                  border: isActive ? "2px solid #16a34a" : "2px solid #f59e0b",
                  background: sel.textBgColor ?? "#ffffff",
                  borderRadius: sel.shape === "ellipse" ? "50%" : 0,
                  cursor: isPickingZoomPoint ? "zoom-in" : isActive ? "move" : "pointer",
                }}
              >
                {isActive ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -20,
                      left: 0,
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#16a34a",
                      background: "rgba(0,0,0,0.75)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      whiteSpace: "nowrap",
                      maxWidth: 240,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      zIndex: 5,
                    }}
                    title={sel.text || undefined}
                  >
                    {sel.text ? sel.text.replace(/\n/g, " / ") : `Bubble ${index + 1}`}
                  </span>
                ) : (
                  <span
                    style={{
                      position: "absolute",
                      top: -9,
                      left: -9,
                      width: 18,
                      height: 18,
                      lineHeight: "18px",
                      textAlign: "center",
                      fontSize: 10,
                      fontWeight: 500,
                      color: "#b45309",
                      background: "rgba(0,0,0,0.75)",
                      borderRadius: "50%",
                      border: "1px solid #f59e0b",
                    }}
                    title={sel.text || `Bubble ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                )}

                {/* Translation input DIRECTLY OVER the selection — type right there, see the text in its real position */}
                <textarea
                  className="tw-inline-translation-textarea"
                  value={sel.translation ?? ""}
                  onChange={(e) => onChangeTranslation(sel.id, e.target.value)}
                  onMouseDown={(e) => {
                    if (isPickingZoomPoint) return;
                    // Allow clicking to place the text cursor, without triggering move/resize/reselect
                    e.stopPropagation();
                    if (!isActive) onSelectArea(sel.id);
                  }}
                  placeholder={isActive ? "Type translation..." : ""}
                  readOnly={!isActive}
                  onWheel={(e) => e.preventDefault()}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    resize: "none",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: sel.textColor ?? "#000000",
                    fontSize: `${sel.fontSize ?? 13}px`,
                    fontFamily: sel.fontFamily ?? COMIC_FONT_LIBRARY[0].value,
                    ...textStyle,
                    lineHeight: 1.25,
                    padding: 4,
                    cursor: isPickingZoomPoint ? "zoom-in" : isActive ? "move" : "text",
                    overflow: "hidden",
                  }}
                />

                {/* 4-corner resize handles — shown as soon as the area is selected, no tool switch needed */}
                {isActive &&
                  RESIZE_HANDLES.map((handle) => (
                    <div
                      key={handle}
                      onMouseDown={(e) => {
                        if (isPickingZoomPoint) return;
                        e.stopPropagation();
                        onStartResize(e, sel.id, handle);
                      }}
                      style={{
                        position: "absolute",
                        width: 10,
                        height: 10,
                        background: "#16a34a",
                        border: "1.5px solid #fff",
                        borderRadius: sel.shape === "ellipse" ? "50%" : 2,
                        cursor: isPickingZoomPoint ? "zoom-in" : HANDLE_CURSOR[handle],
                        top: handle.includes("n") ? -5 : undefined,
                        bottom: handle.includes("s") ? -5 : undefined,
                        left: handle.includes("w") ? -5 : undefined,
                        right: handle.includes("e") ? -5 : undefined,
                        zIndex: 7,
                      }}
                    />
                  ))}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// Crop a region of the comic page image into a separate preview — pure CSS (no canvas needed).
// NOTE 1: the main image uses objectFit:"contain" so it may be "letterboxed" (empty bars
// top/bottom or left/right) if the container's aspect ratio differs from the image's — this
// letterbox must be compensated for, otherwise the crop preview will be off by exactly that amount.
// NOTE 2: uses CSS clip-path to crop to the EXACT SHAPE (oval/polygon), not just the
// rectangular bounding box as before.
function SourceImageCrop({ imageSrc, canvasRef, selection, imageNaturalSize, isPickingColor, onPickColorInCrop, zoomScale }) {
  const PREVIEW_WIDTH = 260;

  if (!selection || !canvasRef.current || !imageSrc || !imageNaturalSize) return null;

  const box = getBoundingBox(selection);
  if (!box || box.width === 0) return null;

  const rawContainer = canvasRef.current.getBoundingClientRect();
  if (rawContainer.width === 0 || rawContainer.height === 0) return null;

  // Use offsetWidth/offsetHeight (LAYOUT size) instead of getBoundingClientRect().width
  // divided by zoomScale — offsetWidth/Height are the element's own LOGICAL size and are
  // NEVER affected by CSS transform (unlike getBoundingClientRect, which reflects the
  // VISUAL/scaled size and depends on zoomScale being perfectly in sync at read-time).
  // This sidesteps any risk of a stale/out-of-sync zoomScale causing the wrong divisor.
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

  // Selection coordinates measured FROM THE REAL IMAGE'S CORNER (letterbox subtracted), not from the container's corner
  const boxXInImage = box.x - offsetX;
  const boxYInImage = box.y - offsetY;

  const scale = PREVIEW_WIDTH / box.width;
  const previewHeight = Math.min(box.height * scale, 320);
  // If constrained by previewHeight (a very tall/narrow box), the actual vertical scale
  // would differ from the horizontal scale — but for simplicity we keep a single width-based
  // scale, accepting that the bottom gets clipped by overflow:hidden if the box is too tall.

  // Compute the clip-path based on shape — coordinates in px, RELATIVE to the preview
  // container's top-left corner (scale already applied).
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
    clipPath = "none"; // rect: no clip-path needed, the outer container's overflow:hidden is enough
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
      style={{
        width: PREVIEW_WIDTH,
        height: previewHeight,
        overflow: "hidden",
        position: "relative",
        background: "#000",
        borderRadius: selection.shape === "rect" ? 6 : 0,
        cursor: isPickingColor ? "crosshair" : "default",
      }}
    >
      <div style={{ position: "absolute", inset: 0, clipPath }}>
        <img
          src={imageSrc}
          alt="Selected source area"
          draggable={false}
          style={{
            position: "absolute",
            left: -boxXInImage * scale,
            top: -boxYInImage * scale,
            width: displayedWidth * scale,
            height: displayedHeight * scale,
            maxWidth: "none",
          }}
        />
      </div>
    </div>
  );
}

function TranslateTabPanel({
  activeSelection,
  bubbleIndex,
  bubbleTotal,
  onSelectPrev,
  onSelectNext,
  onChangeTranslation,
  textStyle,
  onSaveAndNext,
  currentImage,
  canvasRef,
  imageNaturalSize,
  isPickingColor,
  onPickColorInCrop,
  onDeleteArea,
  zoomScale,
}) {
  const hasActiveSelection = activeSelection != null;
  const translationValue = activeSelection?.translation ?? "";

  return (
    <div className="tw-tabpanel">
      {/* Navigate back and forth between bubbles on the current page */}
      {bubbleTotal > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#8286A0" }}>
            Bubble #{hasActiveSelection ? bubbleIndex + 1 : "-"} / {bubbleTotal}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
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
              className="tw-btn-icon"
              title={hasActiveSelection ? "Delete the selected area" : "Select an area first"}
              style={{ color: hasActiveSelection ? "#ef4444" : undefined, marginLeft: 4 }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* The ORIGINAL image of the selected area — for visual reference, no OCR text reading needed */}
      <div className="tw-translation-block" style={{ marginBottom: 16 }}>
        <p className="tw-caption" style={{ marginBottom: 8, marginTop: 0 }}>
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
          <div
            style={{
              width: 260,
              height: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8286A0",
              fontSize: 13,
              background: "var(--tw-surface, #1a1a1a)",
              borderRadius: 6,
            }}
          >
            Select an area on the image to view it here
          </div>
        )}
      </div>

      <div className="tw-translation-block">
        <p className="tw-caption" style={{ marginBottom: 8, marginTop: 0 }}>
          TRANSLATION
        </p>
        {/* This box ALWAYS keeps a fixed white text color — it does NOT follow the custom
            text color of the bubble on the canvas (the 2 are intentionally independent). */}
        <textarea
          value={translationValue}
          onChange={(e) => onChangeTranslation(e.target.value)}
          className="tw-textarea"
          style={{ ...textStyle, color: "#ffffff" }}
          placeholder={hasActiveSelection ? "Enter translation for this area..." : "Select an area first"}
          disabled={!hasActiveSelection}
        />
        <div className="tw-textarea-footer">
          <span>{translationValue.length} CHARS</span>
        </div>
      </div>

      <button onClick={onSaveAndNext} className="tw-save-next-btn">
        Save and next →
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

function ChatTabPanel() {
  return (
    <div className="tw-placeholder">
      <MessageSquare size={24} />
      <p style={{ margin: 0 }}>Ask about tone, context, or phrasing for this page.</p>
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
  onSaveAndNext,
  currentImage,
  canvasRef,
  imageNaturalSize,
  isPickingColor,
  onPickColorInCrop,
  onDeleteArea,
  zoomScale,
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
            onSaveAndNext={onSaveAndNext}
            currentImage={currentImage}
            canvasRef={canvasRef}
            imageNaturalSize={imageNaturalSize}
            isPickingColor={isPickingColor}
            onPickColorInCrop={onPickColorInCrop}
            onDeleteArea={onDeleteArea}
            zoomScale={zoomScale}
          />
        )}
        {activeTab === "glossary" && <GlossaryTabPanel />}
        {activeTab === "chat" && <ChatTabPanel />}

        <div className="tw-panel-footer">
          <button className="tw-help-btn">
            <HelpCircle size={14} />
          </button>
        </div>
    </aside>
  );
}

// =============================================================================
// Data layer
// =============================================================================

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

// Fetch chapter details by ID (used both for the initial task load and when
// the user switches to another chapter from the sidebar).
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

  return fetchChapterById(chapterId, signal);
}

// Fetch the REAL list of pages (image + status) for a task, sorted by page_number —
// this is the OFFICIAL image source now, replacing chapter.images (the old text[]
// array, no longer updated since the page_translation table was introduced).
// Real route: /api/translate-workspace/{taskId} — CONFIRMED to have "/api" prefix
// (tested directly in the browser, returns valid JSON, not a "No static resource" error).
async function fetchPagesForTask(taskId, signal) {
  const list = await fetchJson(`${API_BASE}/translate-workspace/${taskId}`, signal);
  return Array.isArray(list) ? list : [];
}

// Save the bubbles (selections + translations + colors + shapes) AND the page-wide text
// style settings (font family/size/bold/italic/align — these apply to the whole page, not
// per-bubble) for ONE page. "payload" is {selections, textStyle}; the backend only reads
// the "bubbles" field of the body (a raw JSON string of this whole payload object).
async function saveBubblesForPage(pageId, payload, signal) {
  const res = await fetch(`${API_BASE}/translate-workspace/pages/${pageId}/bubbles`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ bubbles: JSON.stringify(payload) }),
    signal,
  });
  if (!res.ok) {
    console.error(`Failed to save bubbles for page ${pageId}: HTTP ${res.status}`);
    return false;
  }
  return true;
}

// [LEGACY] No longer used — kept in case a temporary rollback is needed.
// The official image source is now fetchPagesForTask() above.
function normalizeImages(chapterData) {
  const raw = chapterData?.images || [];
  return raw.map((item) => (typeof item === "string" ? item : item?.url)).filter(Boolean);
}

// =============================================================================
// Drawing logic — pure calculation functions (NOT Hooks, defined outside, any name)
// =============================================================================

function calculateRect(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(start.x - end.x);
  const height = Math.abs(start.y - end.y);
  return { x, y, width, height };
}

// Compute the bounding box of a selection REGARDLESS of its shape —
// rect/ellipse already have x,y,width,height; polygon must be computed from the "points" array.
// Used by: SourceImageCrop, resize handle rendering, etc.
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

// Scale an entire "points" array (polygon) from the OLD bounding box to the NEW one —
// used when resizing via a corner handle, since a polygon has no direct width/height
// to change like rect/ellipse; it must be derived from each point's relative position
// inside the bounding box.
function scalePointsToNewBox(origPoints, origBox, newBox) {
  const scaleX = origBox.width > 0 ? newBox.width / origBox.width : 1;
  const scaleY = origBox.height > 0 ? newBox.height / origBox.height : 1;
  return origPoints.map((p) => ({
    x: newBox.x + (p.x - origBox.x) * scaleX,
    y: newBox.y + (p.y - origBox.y) * scaleY,
  }));
}

// ============================== Merge 2 overlapping selections into 1 (precise geometric union) ==============================

// Convert every shape type (rect/ellipse/polygon) into a closed [x,y] point ring —
// used as input for the polygon-clipping library. Ellipses are APPROXIMATED with a
// many-sided polygon (48 points) since the library only works with straight-edged
// polygons and has no concept of an "ellipse" — 48 points is smooth enough that the
// naked eye won't notice it's actually a polygon.
function shapeToRing(selection) {
  if (selection.shape === "polygon") {
    const pts = selection.points.map((p) => [p.x, p.y]);
    return [...pts, pts[0]]; // the ring must be closed: last point = first point
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

  // rect
  const { x, y, width, height } = selection;
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
    [x, y],
  ];
}

// Check whether 2 selections' bounding boxes might touch/overlap — used as a FAST
// filter before calling the polygon-clipping library (the precise geometric
// computation is much more expensive; no need to run it for pairs that are clearly far apart).
function boundingBoxesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Merge 2 selections into 1 — returns a NEW "polygon"-shaped selection containing the
// exact union of both, or null if they don't actually overlap (bounding boxes touch
// but the real shapes don't, e.g. two ellipse corners near each other).
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

  // The result may contain several sub-polygons (if the 2 shapes barely touch or have
  // holes) — take the polygon with the LARGEST AREA as the main shape, ignore small fragments.
  if (!unionResult || unionResult.length === 0) return null;

  const ringArea = (ring) => {
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    return Math.abs(area / 2);
  };

  // unionResult: MultiPolygon = Polygon[] = Ring[][] (each Polygon can have multiple rings: 1 outer ring + holes)
  let biggestRing = null;
  let biggestArea = -1;
  for (const polygon of unionResult) {
    const outerRing = polygon[0]; // the first ring is always the OUTER ring (not a hole)
    const area = ringArea(outerRing);
    if (area > biggestArea) {
      biggestArea = area;
      biggestRing = outerRing;
    }
  }

  if (!biggestRing) return null;

  // Drop the last point (duplicate of the first, since the library's ring is closed), convert to our internal {x,y} format
  const points = biggestRing.slice(0, -1).map(([x, y]) => ({ x, y }));

  return {
    id: ++selectionIdCounter,
    shape: "polygon",
    points,
    // Prefer keeping selection "a"'s info (usually the one just acted on / newer),
    // concatenate both translations if both have text.
    textColor: a.textColor ?? b.textColor ?? "#000000",
    textBgColor: a.textBgColor ?? b.textBgColor ?? "#ffffff",
    translation: [a.translation, b.translation].filter(Boolean).join(" ") || undefined,
  };
}

// Compute the ACTUAL displayed image area inside a container (containerWidth/Height)
// when using objectFit:"contain" — the image may be "letterboxed" (empty bars top/bottom
// or left/right) if the container's aspect ratio differs from the image's. Shared by:
// SourceImageCrop, the eyedropper on the main image, the eyedropper on the crop preview —
// avoids duplicating this logic in 3 places.
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

// =============================================================================
// Selection logic — custom hook managing MULTIPLE selections (speech bubbles) on a page
// (name MUST start with "use" since it calls Hooks internally)
// =============================================================================

let selectionIdCounter = 0;

function useSelectionAreas() {
  const [selections, setSelections] = useState([]); // [{id, shape:'rect'|'ellipse', x,y,width,height} | {id, shape:'polygon', points:[{x,y}]}]
  const [drawing, setDrawing] = useState(null);      // rect/ellipse currently being dragged out
  const [activeId, setActiveId] = useState(null);
  const [activeTool, setActiveTool] = useState("rect"); // 'rect' | 'ellipse' | 'polygon'
  const [polygonDraft, setPolygonDraft] = useState(null); // in-progress polygon's point array

  // Zoom state — zoomScale is a CSS transform:scale() applied to the whole canvas,
  // zoomOrigin is the point (in % of the container) the scale grows FROM, and
  // isPickingZoomPoint is true while waiting for the user to click a point to zoom into.
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [isPickingZoomPoint, setIsPickingZoomPoint] = useState(false);
  const ZOOM_STEP = 1.5;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 6;

  // State for dragging to MOVE or RESIZE an existing selection (not drawing a new one)
  const dragState = useRef(null); // { mode: 'move'|'resize'|'vertex', id, handle?, vertexIndex?, startPos, originalSelection }

  const startPoint = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // IMPORTANT: getBoundingClientRect() already reflects the VISUAL (zoomed) size of the
  // container after CSS transform:scale() — but selections are stored in the UNSCALED
  // logical coordinate space (children render at their normal position, then the whole
  // box is visually scaled). So a raw click position must be DIVIDED by zoomScale to land
  // back in the same coordinate space as stored selections.
  const getRelativePos = (e) => {
    const bounds = containerRef.current.getBoundingClientRect();
    // Derive the ACTUAL current scale by comparing the live VISUAL width (bounds.width,
    // affected by transform) against the live LOGICAL width (offsetWidth, never affected
    // by transform) — this is self-correcting and doesn't depend on the zoomScale state
    // variable being perfectly in sync with what's actually rendered on screen right now.
    const actualScale = bounds.width / containerRef.current.offsetWidth;
    return {
      x: (e.clientX - bounds.left) / actualScale,
      y: (e.clientY - bounds.top) / actualScale,
    };
  };

  // Toggle "pick a point to zoom into" mode — while ON, EVERY click on the image zooms
  // in further (repeatable), staying active until the button is clicked again (toggle off)
  // or Esc is pressed.
  const toggleZoomIn = () => setIsPickingZoomPoint((v) => !v);
  const cancelZoomPick = () => setIsPickingZoomPoint(false);

  // Zoom out by one step, centered on the CURRENT zoom origin — if back at 1x, reset
  // the origin to center too so the next zoom-in starts fresh.
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

  // ============================== Drawing new shapes (rect/ellipse/polygon) ==============================

  const handleMouseDown = (e) => {
    // Zoom-point picking takes priority over everything else — clicking anywhere while
    // armed zooms in further, centered on the clicked point. Stays ON (doesn't auto-exit)
    // so the user can click repeatedly to keep zooming in; toggle the button off to stop.
    if (isPickingZoomPoint) {
      const bounds = containerRef.current.getBoundingClientRect();
      const percentX = ((e.clientX - bounds.left) / bounds.width) * 100;
      const percentY = ((e.clientY - bounds.top) / bounds.height) * 100;
      setZoomOrigin({ x: percentX, y: percentY });
      setZoomScale((prev) => Math.min(ZOOM_MAX, prev * ZOOM_STEP));
      return;
    }

    // If a move/resize/vertex drag is in progress (started from a handle or shape body), skip — already handled elsewhere
    if (dragState.current) return;

    const pos = getRelativePos(e);

    if (activeTool === "polygon") {
      // Each click adds a point to the in-progress polygon, no drag-and-drop
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

  // After a selection is created/moved/resized/vertex-edited, check whether it now
  // overlaps any other selection — if so, MERGE FOR REAL (precise geometric union,
  // not just a bounding-box merge). Repeat until no more overlaps remain, in case the
  // just-merged shape now overlaps a third selection.
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
          if (!mergedSelection) continue; // bounding boxes touch but the real shapes don't overlap

          list = list.filter((s) => s.id !== current.id && s.id !== other.id);
          list.push(mergedSelection);
          currentId = mergedSelection.id;
          keepMerging = true;
          break; // go back to the while loop, check again with the just-merged shape (it might still overlap another one)
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
      mergeOverlappingWith(changedId); // move/resize/vertex-drag finished -> check for overlaps
      return;
    }

    if (drawing && drawing.width > 8 && drawing.height > 8) {
      const newArea = {
        id: ++selectionIdCounter,
        shape: activeTool === "ellipse" ? "ellipse" : "rect",
        textColor: "#000000",
        textBgColor: "#ffffff",
        fontSize: 13,
        fontFamily: COMIC_FONT_LIBRARY[0].value,
        ...drawing,
      };
      setSelections((prev) => [...prev, newArea]);
      setActiveId(newArea.id);
      mergeOverlappingWith(newArea.id); // new shape drawn -> check for overlaps
    }
    setDrawing(null);
  };

  // Close the in-progress polygon into a finished selection (needs at least 3 points)
  const finishPolygon = () => {
    if (polygonDraft && polygonDraft.length >= 3) {
      const newArea = {
        id: ++selectionIdCounter,
        shape: "polygon",
        points: polygonDraft,
        textColor: "#000000",
        textBgColor: "#ffffff",
        fontSize: 13,
        fontFamily: COMIC_FONT_LIBRARY[0].value,
      };
      setSelections((prev) => [...prev, newArea]);
      setActiveId(newArea.id);
      mergeOverlappingWith(newArea.id);
    }
    setPolygonDraft(null);
  };

  const cancelPolygon = () => setPolygonDraft(null);

  // ============================== Select / delete / translate ==============================

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
      ...box,
      id: ++selectionIdCounter, // ALWAYS assign a fresh id last, overriding any "id" the
      // loaded box might already carry (e.g. restored from a previous save) — old ids
      // could otherwise collide with ids assigned in this session, causing 2 different
      // selections to share the same React key / update target.
    }));
    setSelections((prev) => [...prev, ...withIds]);
  };

  const updateTranslation = (id, translation) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, translation } : s)));
  };

  // Set a custom name for a selection — applies to all 3 shape types (rect/ellipse/polygon)
  const updateName = (id, name) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  // Change text/background color for ONE selection only — doesn't affect other selections
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

  // ============================== Move / Resize / drag polygon vertex ==============================
  // Start dragging: called from a shape body's onMouseDown (move) or a handle (resize/vertex).
  // stopPropagation must be called at the call site so it doesn't trigger handleMouseDown's new-shape drawing.

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
      handle, // 'nw' | 'ne' | 'sw' | 'se'
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
          // Polygon — has no direct x/y/width/height, only "points".
          // Must compute the new bounding box then RESCALE all points proportionally —
          // can't apply the x/y/width/height formula directly like rect/ellipse.
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

          // Rect / Ellipse — already have x/y/width/height, compute directly as before
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

          // Don't allow negative width/height (dragging past the opposite edge) — keep a minimum of 8px
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

// =============================================================================
// Main component
// =============================================================================

export default function TranslateWorkspace() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [chapterData, setChapterData] = useState(null);
  const [taskPages, setTaskPages] = useState([]); // OFFICIAL image source — fetched from /tasks/{taskId}/pages
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // ID of the chapter CURRENTLY shown on the canvas
  const [currentChapterId, setCurrentChapterId] = useState(null);

  const [activeTab, setActiveTab] = useState("translate");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  // Starts empty — will auto-open the current chapter once the real list finishes loading
  const [open, setOpen] = useState({});
  // NOTE: fontSize/fontFamily are NOT global/page-wide settings — each selection stores
  // its own "fontSize"/"fontFamily" field (see updateSelectionStyle calls in
  // CanvasToolbar's onIncrease/DecreaseFontSize and onChangeFontFamily below), same
  // pattern as textColor/textBgColor.
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState("left");
  // No more GLOBAL text/background color state — each selection now stores its own
  // textColor/textBgColor, see updateSelectionStyle() and the defaults set on creation below.

  // Hidden canvas (not rendered to the DOM) — redrawn with the current page image whenever
  // it changes, used to READ THE PIXEL VALUE DIRECTLY at a click point — the same approach
  // offline software (Photoshop, GIMP...) uses, instead of relying on an OS-level API like
  // window.EyeDropper (that API previously caused the page to "freeze" by entering a
  // whole-screen color-picking mode).
  const pixelCanvasRef = useRef(null);
  if (!pixelCanvasRef.current && typeof document !== "undefined") {
    pixelCanvasRef.current = document.createElement("canvas");
  }

  // null | "text" | "bg" — currently waiting for the user to click the image to pick a color
  const [pickingColorFor, setPickingColorFor] = useState(null);

  const handleImageLoad = (size) => {
    setImageNaturalSize(size);

    // Redraw the image onto the hidden canvas at its ACTUAL original size (not the displayed
    // size) so pixels are read accurately, without distortion from on-screen scaling.
    const img = new Image();
    // MUST be set before assigning src — otherwise, even if the server (Cloudinary) sends
    // Access-Control-Allow-Origin, the browser will still treat the canvas as "tainted" and
    // block getImageData(). crossOrigin must be set BEFORE the image starts loading.
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

  // Read the color at a point on the image (coordinates in DISPLAY SPACE, same coordinate
  // system as "selections"), converting to original-image coordinates before reading the
  // pixel, accounting for the letterbox from objectFit:contain.
  // Read a pixel's color BY ORIGINAL-IMAGE COORDINATES (naturalX/naturalY) — low-level helper,
  // shared by both eyedropper entry points (main image + crop preview panel).
  const readColorAtNaturalPixel = (naturalX, naturalY) => {
    try {
      const ctx = pixelCanvasRef.current.getContext("2d");
      const [r, g, b] = ctx.getImageData(naturalX, naturalY, 1, 1).data;
      return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      // The most common error here is CORS ("tainted canvas") — happens when the image is
      // loaded from a DIFFERENT domain and that server doesn't send a header allowing pixel reads.
      console.error("Failed to read pixel color:", err);
      return "CORS_ERROR";
    }
  };

  // Pick a color when clicking the MAIN IMAGE — click coordinates are relative to the container (containerBounds)
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
      return null; // click landed on the empty letterbox area, not the real image
    }

    const naturalX = Math.floor((xInImage / displayedWidth) * imageNaturalSize.width);
    const naturalY = Math.floor((yInImage / displayedHeight) * imageNaturalSize.height);

    return readColorAtNaturalPixel(naturalX, naturalY);
  };

  // Pick a color when clicking the CROP PREVIEW in the side panel — receives numbers already
  // computed by SourceImageCrop (scale, offset within the image, displayed image size) to
  // derive the correct pixel on the original image, without recomputing the letterbox logic here.
  const readColorInCrop = (clickX, clickY, scale, boxXInImage, boxYInImage, displayedWidth, displayedHeight) => {
    if (!imageNaturalSize) return null;

    const xInDisplayedImage = clickX / scale + boxXInImage;
    const yInDisplayedImage = clickY / scale + boxYInImage;

    const naturalX = Math.floor((xInDisplayedImage / displayedWidth) * imageNaturalSize.width);
    const naturalY = Math.floor((yInDisplayedImage / displayedHeight) * imageNaturalSize.height);

    return readColorAtNaturalPixel(naturalX, naturalY);
  };

  // Clicking the "Pick color" button -> only enables a WAITING MODE; the actual color read
  // happens when the user clicks the image (see handleCanvasMouseDown below) — no popup/API is opened.
  const pickTextColorFromScreen = () => {
    if (activeId == null) return; // must select an area first, otherwise there's nowhere to apply the picked color
    cancelZoomPick();
    setPickingColorFor("text");
  };
  const pickBackgroundColorFromScreen = () => {
    if (activeId == null) return;
    cancelZoomPick();
    setPickingColorFor("bg");
  };

  // Allow pressing Esc to cancel color-picking mode partway through
  useEffect(() => {
    if (!pickingColorFor) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setPickingColorFor(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickingColorFor]);

  // Call the custom hook here — same level (top-level) as the other useState calls
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
  } = useSelectionAreas();

  // Allow pressing Esc to cancel zoom-point-picking mode partway through
  useEffect(() => {
    if (!isPickingZoomPoint) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") cancelZoomPick();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPickingZoomPoint, cancelZoomPick]);

  // Clicking ANY other control (toolbar buttons, sidebar, panels...) while zoom-point-picking
  // is active should automatically cancel it — EXCEPT clicking inside the canvas itself
  // (that's the intended zoom-in click) or the zoom toggle button (it manages its own state).
  useEffect(() => {
    if (!isPickingZoomPoint) return;
    const onMouseDown = (e) => {
      if (canvasRef.current && canvasRef.current.contains(e.target)) return; // clicking the canvas -> let it zoom in
      if (e.target.closest("[data-zoom-toggle]")) return; // clicking the toggle button itself -> let it handle on/off
      cancelZoomPick();
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isPickingZoomPoint, cancelZoomPick, canvasRef]);

  // Kept in sync with the latest "selections" — read from inside a useEffect cleanup
  // function (see the auto-save effect below), where a normal closure would otherwise
  // capture a STALE (outdated) copy of selections from when the effect was first set up.
  const selectionsRef = useRef(selections);
  useEffect(() => {
    selectionsRef.current = selections;
  }, [selections]);

  // "unsaved" | "saving" | "saved" — drives the badge in the header.
  const [saveStatus, setSaveStatus] = useState("unsaved");
  // While true, the NEXT "watched state changed" event is a result of LOADING previously-
  // saved data (page switch, initial mount) rather than a real user edit — should NOT
  // flip the badge to "unsaved". Set to true right before clearSelections()/loadSelections()/
  // setIsBold/setIsItalic/setTextAlign run in the page-change effect below, consumed
  // (reset to false) by this effect right after (React 18 batches all those setState calls
  // into a single re-render, so this fires exactly once per page load, not once per field).
  const isLoadingPageRef = useRef(false);
  useEffect(() => {
    if (isLoadingPageRef.current) {
      isLoadingPageRef.current = false;
      return;
    }
    setSaveStatus("unsaved");
  }, [selections, isBold, isItalic, textAlign]);

  // Same staleness problem as selectionsRef above, but for the page-wide text style
  // settings (bold/italic/align — fontSize/fontFamily are now PER-SELECTION, not here)
  // — need to be saved ALONGSIDE selections so a full reload doesn't silently reset them.
  const textStyleSettingsRef = useRef(null);
  useEffect(() => {
    textStyleSettingsRef.current = { isBold, isItalic, textAlign };
  }, [isBold, isItalic, textAlign]);

  // The currently selected area (if any) — used to populate the source text + translation in the side panel
  const activeSelection = selections.find((s) => s.id === activeId) ?? null;
  const activeSelectionIndex = selections.findIndex((s) => s.id === activeId);

  // Press Delete/Backspace to remove the selected area — SKIP this if the user is currently
  // typing in an input/textarea (avoids accidentally deleting a selection while just editing a translation).
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

  // The REAL size (naturalWidth/naturalHeight) of the current page image — needed so
  // SourceImageCrop can correctly compute the letterbox area caused by objectFit:"contain".
  const [imageNaturalSize, setImageNaturalSize] = useState(null);

  const textStyle = useMemo(
    () => ({
      fontWeight: isBold ? 700 : 400,
      fontStyle: isItalic ? "italic" : "normal",
      textAlign,
    }),
    [isBold, isItalic, textAlign]
  );

  useEffect(() => {
    if (!taskId) return;

    const controller = new AbortController();

    setStatus("loading");
    setError(null);

    // Fetch in parallel: chapter (metadata: title, comicId...) + pages (real images + status)
    Promise.all([
      fetchChapterForTask(taskId, controller.signal),
      fetchPagesForTask(taskId, controller.signal),
    ])
      .then(([chapterResult, pagesResult]) => {
        setChapterData(chapterResult);
        setTaskPages(pagesResult);
        setCurrentChapterId(chapterResult.id);
        setCurrentPageIndex(0);
        setStatus("ready");
        // Automatically expand the currently viewed chapter in the sidebar
        setOpen({ [chapterResult.id]: true });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error loading chapter:", err);
        setError(err.message);
        setStatus("error");
      });

    return () => controller.abort();
  }, [taskId]);

  // OFFICIAL image source — comes from taskPages (API /translate-workspace/{taskId}), NO
  // longer read from chapterData.images (the old text[] array, obsolete since page_translation was introduced).
  const images = useMemo(() => taskPages.map((p) => p.imageUrl).filter(Boolean), [taskPages]);
  const currentImage = images[currentPageIndex];
  // Full metadata for the current page (pageId, status...) — used by future features
  // that need the real page ID, e.g. a "Mark as done" button.
  const currentPageMeta = taskPages[currentPageIndex] ?? null;

  // "PROJECT FILES" sidebar — since switching chapters is NOT allowed, there's no need to
  // call a separate API for all of a comic's chapters. Build an array containing ONLY the
  // current chapter, reading page data directly from the already-fetched taskPages.
  const sidebarChapters = useMemo(() => {
    if (!chapterData) return [];
    const doneCount = taskPages.filter((p) => p.status === "DONE").length;
    return [
      {
        chapterId: chapterData.id,
        title: chapterData.title || `Chapter ${chapterData.chapterNumber ?? ""}`,
        progress: `${doneCount}/${taskPages.length}`,
        pages: taskPages,
      },
    ];
  }, [chapterData, taskPages]);

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

  // Clicking a page in the sidebar — ONLY works if that page belongs to the currently
  // open chapter (other chapters' buttons are already disabled in ChapterList; this is just
  // an extra safety check in case this function gets called from elsewhere later).
  const handleSelectPage = useCallback(
    (chapterId, pageIndex) => {
      if (chapterId !== currentChapterId) return;
      setCurrentPageIndex(pageIndex);
    },
    [currentChapterId]
  );

  const gotoProjectList = useCallback(() => {
    navigate("/translator/dashboard");
  }, [navigate]);

  // Save bubbles for a page AND update the local "taskPages" state to match — without
  // this second step, re-visiting a page within the SAME session would still show the
  // OLD (stale) bubbles fetched at initial page-load time, since taskPages is only
  // fetched once from the server; only a full reload would show the newly-saved data.
  //
  // "textStyleSettings" (font family/size/bold/italic/align) is saved ALONGSIDE the
  // selections in the same JSON payload — these are page-wide settings, not stored per
  // selection, but were previously ONLY kept in React state (never persisted), so a full
  // reload silently reset them back to defaults even though "selections" saved correctly.
  const persistBubbles = useCallback((pageId, selectionsArray, textStyleSettings) => {
    if (!pageId) return;
    setSaveStatus("saving");
    const payload = { selections: selectionsArray, textStyle: textStyleSettings };
    const bubblesJson = JSON.stringify(payload);
    saveBubblesForPage(pageId, payload).then((success) => {
      if (!success) {
        setSaveStatus("unsaved");
        return;
      }
      setTaskPages((prev) => prev.map((p) => (p.pageId === pageId ? { ...p, bubbles: bubblesJson } : p)));
      setSaveStatus("saved");
    });
  }, []);

  const handleSaveAndNext = useCallback(() => {
    // Save explicitly here rather than relying only on the page-change effect's cleanup
    // (see below) — if already on the LAST page, goToPage() is a no-op (currentPageIndex
    // won't change), so that cleanup would never fire and nothing would get saved.
    if (currentPageMeta?.pageId) {
      persistBubbles(currentPageMeta.pageId, selectionsRef.current, textStyleSettingsRef.current);
    }
    goToPage(currentPageIndex + 1);
  }, [goToPage, currentPageIndex, currentPageMeta, persistBubbles]);

  // Manual "Save progress" button (header) — same explicit save, without navigating away.
  const handleSaveProgress = useCallback(() => {
    if (currentPageMeta?.pageId) {
      persistBubbles(currentPageMeta.pageId, selectionsRef.current, textStyleSettingsRef.current);
    }
  }, [currentPageMeta, persistBubbles]);

  // Ctrl+S (Windows/Linux) or Cmd+S (Mac) also saves — preventDefault() is REQUIRED here,
  // otherwise the browser's native "Save Page As..." dialog would pop up instead.
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

  // Runs every time the user arrives at a (page, chapter) — loads that page's
  // previously-saved bubbles (if any). The RETURNED cleanup function runs right before
  // this effect re-runs for the NEXT page (or on unmount) — used to AUTO-SAVE whatever
  // the user had on the page they're LEAVING, so work is never silently lost just by
  // switching pages/chapters.
  useEffect(() => {
    isLoadingPageRef.current = true;
    clearSelections();
    setImageNaturalSize(null);
    setSaveStatus("saved"); // freshly loaded from the server -> nothing unsaved yet

    if (currentPageMeta?.bubbles) {
      try {
        const parsed = JSON.parse(currentPageMeta.bubbles);

        // NEW format: { selections: [...], textStyle: {...} }. OLD format (saved before
        // this fix): a plain array of selections, with no page-wide text style at all —
        // kept working here so previously-saved pages don't break/lose their bubbles.
        const selectionsToLoad = Array.isArray(parsed) ? parsed : parsed?.selections;
        const savedTextStyle = Array.isArray(parsed) ? null : parsed?.textStyle;

        if (Array.isArray(selectionsToLoad) && selectionsToLoad.length > 0) {
          loadSelections(selectionsToLoad);
        }
        if (savedTextStyle) {
          if (typeof savedTextStyle.isBold === "boolean") setIsBold(savedTextStyle.isBold);
          if (typeof savedTextStyle.isItalic === "boolean") setIsItalic(savedTextStyle.isItalic);
          if (typeof savedTextStyle.textAlign === "string") setTextAlign(savedTextStyle.textAlign);
        }
      } catch (err) {
        console.error("Could not parse this page's saved bubbles:", err);
      }
    }

    const pageIdBeingViewed = currentPageMeta?.pageId;

    return () => {
      if (pageIdBeingViewed) {
        persistBubbles(pageIdBeingViewed, selectionsRef.current, textStyleSettingsRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Deliberately NOT including currentPageMeta/persistBubbles here — persistBubbles
    // updates taskPages on save, which would change currentPageMeta's identity and
    // re-trigger this whole effect (re-running clearSelections + reload) right after
    // saving, wiping out what was just saved. Only currentPageIndex/currentChapterId
    // should determine when this effect actually re-runs.
  }, [currentPageIndex, currentChapterId]);

  // Apply the just-picked color to the right place (text or background) — shared by both eyedropper entry points
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
    // hex === null means the click landed on the letterbox (empty bars around the image) — ignore, don't change the color
    setPickingColorFor(null);
  };

  // Wrap the original handleMouseDown: if in color-picking mode, block the normal
  // draw/select behavior, read the color at the click point, then exit picking mode.
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

  // Pick a color when clicking the CROP PREVIEW in the side panel (SourceImageCrop already
  // computes the geometry parameters and passes them up here via onPickColorInCrop)
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
        onSaveProgress={handleSaveProgress}
        saveStatus={saveStatus}
      />

      <div className="tw-body">
        <aside
          className="tw-sidebar"
          style={leftSidebarOpen ? undefined : { width: 0, minWidth: 0, borderRight: "none", overflow: "hidden" }}
        >
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

        <div style={{ position: "relative", width: 0, flexShrink: 0, zIndex: 5 }}>
          <button
            type="button"
            onClick={() => setLeftSidebarOpen((v) => !v)}
            title={leftSidebarOpen ? "Hide left panel" : "Show left panel"}
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              transform: "translateY(-50%)",
              width: 24,
              height: 44,
              borderRadius: "0 6px 6px 0",
              border: "1px solid var(--ink-line, #33364a)",
              borderLeft: "none",
              background: "var(--ink-900, #1b1e2b)",
              color: "var(--ink-text-2, #c7c9d6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {leftSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Row 1: drawing tool + page navigation/zoom */}
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

            {/* Row 2: text styling — font, weight/style, alignment, size, colors */}
            <div className="tw-canvas-toolbar" style={{ borderTop: "1px solid var(--ink-line-soft, #242737)" }}>
              <CanvasToolbar
                isBold={isBold}
                isItalic={isItalic}
                textAlign={textAlign}
                fontSize={activeSelection?.fontSize ?? 13}
                fontFamily={activeSelection?.fontFamily ?? COMIC_FONT_LIBRARY[0].value}
                textColor={activeSelection?.textColor ?? "#000000"}
                textBgColor={activeSelection?.textBgColor ?? "#ffffff"}
                hasActiveSelection={activeSelection != null}
                onToggleBold={() => setIsBold((v) => !v)}
                onToggleItalic={() => setIsItalic((v) => !v)}
                onSetTextAlign={setTextAlign}
                onIncreaseFontSize={() =>
                  activeId != null &&
                  updateSelectionStyle(activeId, { fontSize: Math.min((activeSelection?.fontSize ?? 13) + 1, 48) })
                }
                onDecreaseFontSize={() =>
                  activeId != null &&
                  updateSelectionStyle(activeId, { fontSize: Math.max((activeSelection?.fontSize ?? 13) - 1, 8) })
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
            textStyle={textStyle}
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
          onSaveAndNext={handleSaveAndNext}
          currentImage={currentImage}
          canvasRef={canvasRef}
          imageNaturalSize={imageNaturalSize}
          isPickingColor={pickingColorFor != null}
          onPickColorInCrop={handleCropColorPick}
          onDeleteArea={deleteArea}
          zoomScale={zoomScale}
        />
      </div>
    </div>
  );
}