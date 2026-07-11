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
  Square,
  Pentagon,
  Eraser,
  Minus,
  Plus,
  Pipette,
  Trash2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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
  { name: "Bangers", value: "'Bangers', cursive" },
  { name: "Comic Neue", value: "'Comic Neue', cursive" },
  { name: "Luckiest Guy", value: "'Luckiest Guy', cursive" },
  { name: "Pangolin", value: "'Pangolin', cursive" },
  { name: "Rock Salt", value: "'Rock Salt', cursive" },
  { name: "Noto Sans JP", value: "'Noto Sans JP', sans-serif" },
  { name: "Kosugi Maru", value: "'Kosugi Maru', sans-serif" },
  { name: "M PLUS 1p", value: "'M PLUS 1p', sans-serif" },
  { name: "Sawarabi Gothic", value: "'Sawarabi Gothic', sans-serif" },
  { name: "Zen Kurenaido", value: "'Zen Kurenaido', sans-serif" },
  { name: "Nanum Gothic", value: "'Nanum Gothic', sans-serif" },
  { name: "Nanum Myeongjo", value: "'Nanum Myeongjo', serif" },
  { name: "Gowun Dodum", value: "'Gowun Dodum', sans-serif" },
  { name: "Poor Story", value: "'Poor Story', cursive" },
  { name: "Hi Melody", value: "'Hi Melody', cursive" },
  { name: "Special Elite", value: "'Special Elite', cursive" },
  { name: "IM Fell English", value: "'IM Fell English', serif" },
  { name: "Cinzel", value: "'Cinzel', serif" },
  { name: "EB Garamond", value: "'EB Garamond', serif" },
  { name: "Pirata One", value: "'Pirata One', cursive" },
  { name: "Caveat", value: "'Caveat', cursive" },
  { name: "Shadows Into Light", value: "'Shadows Into Light', cursive" },
  { name: "Gloria Hallelujah", value: "'Gloria Hallelujah', cursive" },
  { name: "Architects Daughter", value: "'Architects Daughter', cursive" },
  { name: "Handlee", value: "'Handlee', cursive" },
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
              const pageIndex = page.pageNumber - 1; // API trả pageNumber (1-based), state dùng index (0-based)
              const isSameChapter = ch.chapterId === currentChapterId;
              const isCurrent = isSameChapter && pageIndex === currentPageIndex;
              // Trạng thái thật từ DB (DONE/TODO), riêng trang đang mở luôn ưu tiên hiện "current"
              const status = isCurrent ? "current" : page.status === "DONE" ? "done" : "todo";
              return (
                <button
                  key={page.pageId}
                  className={`tw-page-row ${isCurrent ? "current" : ""}`}
                  onClick={() => isSameChapter && onSelectPage(ch.chapterId, pageIndex)}
                  disabled={!isSameChapter}
                  title={isSameChapter ? undefined : "Chỉ xem được, không chuyển sang chapter khác từ đây"}
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

function TranslateHeaderBar({ comicTitle, chapterTitle, onBack }) {
  return (
    <header className="tw-header">
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
  );
}

function CanvasToolbar({
  isBold,
  isItalic,
  textAlign,
  fontSize,
  textColor,
  textBgColor,
  onToggleBold,
  onToggleItalic,
  onSetTextAlign,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onChangeTextColor,
  onChangeTextBgColor,
  onPickTextColor,
  onPickTextBgColor,
  hasActiveSelection,
}) {
  return (
    <div className="tw-toolbar-group">
      <button type="button" onClick={onToggleBold} className={`tw-btn-icon ${isBold ? "active" : ""}`} title="In đậm">
        <Bold size={14} />
      </button>
      <button type="button" onClick={onToggleItalic} className={`tw-btn-icon ${isItalic ? "active" : ""}`} title="In nghiêng">
        <Italic size={14} />
      </button>
      <button type="button" onClick={() => onSetTextAlign("left")} className={`tw-btn-icon ${textAlign === "left" ? "active" : ""}`} title="Canh trái">
        <AlignLeft size={14} />
      </button>
      <button type="button" onClick={() => onSetTextAlign("center")} className={`tw-btn-icon ${textAlign === "center" ? "active" : ""}`} title="Canh giữa">
        <AlignCenter size={14} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4 }}>
        <button type="button" onClick={onDecreaseFontSize} className="tw-btn-icon" title="Giảm cỡ chữ">
          <Minus size={13} />
        </button>
        <span style={{ fontSize: 12, color: "#8286A0", width: 24, textAlign: "center" }}>{fontSize}</span>
        <button type="button" onClick={onIncreaseFontSize} className="tw-btn-icon" title="Tăng cỡ chữ">
          <Plus size={13} />
        </button>
      </div>

      {/* Màu chữ — CHỈ áp dụng cho vùng đang được chọn, không phải cài đặt chung */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 8, opacity: hasActiveSelection ? 1 : 0.4 }}>
        <label
          title={hasActiveSelection ? "Màu chữ của vùng đang chọn" : "Chọn 1 vùng trước đã"}
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
          title={hasActiveSelection ? "Hút màu chữ từ ảnh" : "Chọn 1 vùng trước đã"}
        >
          <Pipette size={13} />
        </button>
      </div>

      {/* Màu nền (background của khung/chữ) — CHỈ áp dụng cho vùng đang được chọn */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4, opacity: hasActiveSelection ? 1 : 0.4 }}>
        <label
          title={hasActiveSelection ? "Màu nền của vùng đang chọn" : "Chọn 1 vùng trước đã"}
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
          title={hasActiveSelection ? "Hút màu nền từ ảnh gốc/ảnh crop" : "Chọn 1 vùng trước đã"}
        >
          <Pipette size={13} />
        </button>
      </div>
      {!hasActiveSelection && (
        <span style={{ fontSize: 11, color: "#8286A0", marginLeft: 4 }}>Chọn 1 vùng để đổi màu riêng</span>
      )}
    </div>
  );
}

function PageNav({ images, currentPageIndex, goToPage }) {
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
      <Maximize2 size={16} style={{ marginLeft: 4 }} />
    </div>
  );
}

// PageImage nhận danh sách "selections" (nhiều bong bóng thoại) để render đè lên ảnh
const RESIZE_HANDLES = ["nw", "ne", "sw", "se"];
const HANDLE_CURSOR = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize" };

function ShapeToolbar({ activeTool, onSetTool }) {
  const tools = [
    { id: "rect", label: "Chữ nhật", Icon: Square },
    { id: "ellipse", label: "Oval", Icon: Circle },
    { id: "polygon", label: "Tự do", Icon: Pentagon },
    { id: "eraser", label: "Tẩy", Icon: Eraser },
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
  brushDraft,
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
}) {
  return (
    <div className="tw-canvas">
      {/* Đang ở chế độ hút màu -> nhắc người dùng click vào ảnh, hoặc Esc để hủy */}
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
          Click vào ảnh để hút màu tại điểm đó — nhấn Esc để hủy
        </div>
      )}

      {/* Đang vẽ polygon dở -> hiện nút chốt/hủy */}
      {polygonDraft && polygonDraft.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#8286A0" }}>
            Đang vẽ hình tự do: {polygonDraft.length} điểm (tối thiểu 3)
          </span>
          <button type="button" onClick={onFinishPolygon} className="tw-btn" style={{ padding: "2px 10px", fontSize: 12 }}>
            Xong
          </button>
          <button type="button" onClick={onCancelPolygon} className="tw-btn" style={{ padding: "2px 10px", fontSize: 12 }}>
            Hủy
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
          cursor: "crosshair",
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
          <div style={{ padding: 24, color: "#8286A0" }}>Chapter này chưa có ảnh nào.</div>
        )}

        {/* Khung nét đứt: hình rect/ellipse đang kéo dở */}
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

        {/* SVG phủ toàn bộ khung, chứa mọi polygon (đã chốt + đang vẽ dở) */}
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {/* Polygon đang vẽ dở */}
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

          {/* Polygon đã chốt */}
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
                  style={{ pointerEvents: "auto", cursor: isActive ? "move" : "pointer" }}
                  onMouseDown={(e) => {
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
            

          {/* Handle kéo từng đỉnh — hiện ngay khi polygon HOẶC brush (tẩy) đang được chọn,
              không cần chuyển tool. Brush có thể có RẤT NHIỀU điểm (lấy mẫu liên tục lúc
              kéo chuột) nên chỉ hiện handle CÁCH QUÃNG (tối đa ~20 điểm) cho đỡ rối mắt —
              polygon thường ít điểm (click tay từng điểm) nên hiện đủ như cũ. */}
          {selections
            .filter((s) => (s.shape === "polygon" || s.shape === "brush") && s.id === activeId)
            .flatMap((sel) => {
              const step = sel.shape === "brush" ? Math.max(1, Math.floor(sel.points.length / 20)) : 1;
              return sel.points
                .map((p, i) => ({ p, i }))
                .filter(({ i }) => i % step === 0)
                .map(({ p, i }) => (
                  <circle
                    key={`${sel.id}-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={6}
                    fill="#16a34a"
                    stroke="#fff"
                    strokeWidth={1.5}
                    style={{ pointerEvents: "auto", cursor: "grab" }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onStartVertexDrag(e, sel.id, i);
                    }}
                  />
                ));
            })}
          {/* Nét tẩy ĐANG VẼ DỞ — hiện ngay lập tức khi kéo chuột, giống Paint thật */}
          {brushDraft && brushDraft.length > 1 && (
            <polyline
              points={brushDraft.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#ffffff"
              strokeWidth={28}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          )}

          {/* Nét tẩy đã chốt */}
          {selections
            .filter((s) => s.shape === "brush")
            .map((sel) => {
              const isActive = sel.id === activeId;
              return (
                <g key={sel.id}>
                  <polyline
                    points={sel.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={sel.textBgColor ?? "#ffffff"}
                    strokeWidth={sel.brushSize ?? 28}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Viền mảnh báo trạng thái active/inactive, vẽ đè lên trên nét trắng */}
                  <polyline
                    points={sel.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={isActive ? "#16a34a" : "#f59e0b"}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: "auto", cursor: isActive ? "move" : "pointer" }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (isActive) {
                        onStartMove(e, sel.id);
                      } else {
                        onSelectArea(sel.id);
                      }
                    }}
                  />
                  {/* Vệt trong suốt, DÀY hơn nét thật — chỉ để bắt sự kiện click/kéo dễ hơn (nét mảnh khó trúng) */}
                  <polyline
                    points={sel.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={(sel.brushSize ?? 28) + 12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: "auto", cursor: isActive ? "move" : "pointer" }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (isActive) {
                        onStartMove(e, sel.id);
                      } else {
                        onSelectArea(sel.id);
                      }
                    }}
                  />
                </g>
              );
            })}
        </svg>

        {/* Ô nhập bản dịch cho polygon/brush — không nhúng được <textarea> vào SVG nên overlay HTML riêng,
            định vị theo khung bao (bounding box) */}
        {selections
          .filter((s) => s.shape === "polygon" || s.shape === "brush")
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
                  e.stopPropagation();
                  if (!isActive) onSelectArea(sel.id);
                }}
                placeholder={isActive ? "Gõ bản dịch..." : ""}
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
                  ...textStyle,
                  lineHeight: 1.25,
                  padding: 4,
                  cursor: isActive ? "move" : "text",
                  fontFamily: "inherit",
                  pointerEvents: "auto",
                  overflow: "hidden",
                }}
              />
            );
          })}

        {/* Danh sách vùng rect/ellipse đã chốt */}
        {selections
          .filter((s) => s.shape !== "polygon" && s.shape !== "brush")
          .map((sel) => {
            const isActive = sel.id === activeId;
            const index = selections.findIndex((s) => s.id === sel.id);
            return (
              <div
                key={sel.id}
                onMouseDown={(e) => {
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
                  cursor: isActive ? "move" : "pointer",
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

                {/* Ô nhập bản dịch NGAY TRÊN vùng chọn — gõ trực tiếp, xem chữ nằm đúng vị trí thật */}
                <textarea
                  className="tw-inline-translation-textarea"
                  value={sel.translation ?? ""}
                  onChange={(e) => onChangeTranslation(sel.id, e.target.value)}
                  onMouseDown={(e) => {
                    // Cho phép click vào để đặt con trỏ gõ chữ, không kích hoạt move/resize/chọn lại
                    e.stopPropagation();
                    if (!isActive) onSelectArea(sel.id);
                  }}
                  placeholder={isActive ? "Gõ bản dịch..." : ""}
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
                    ...textStyle,
                    lineHeight: 1.25,
                    padding: 4,
                    cursor: isActive ? "move" : "text",
                    fontFamily: "inherit",
                    overflow: "hidden",
                  }}
                />

                {/* Handle resize 4 góc — hiện ngay khi vùng đang được chọn, không cần chuyển tool */}
                {isActive &&
                  RESIZE_HANDLES.map((handle) => (
                    <div
                      key={handle}
                      onMouseDown={(e) => {
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
                        cursor: HANDLE_CURSOR[handle],
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

// Cắt 1 vùng của ảnh trang truyện ra hiển thị riêng — dùng thuần CSS (không cần canvas).
// LƯU Ý 1: ảnh chính dùng objectFit:"contain" nên có thể bị "letterbox" (viền trống
// trên/dưới hoặc trái/phải) nếu tỉ lệ khung khác tỉ lệ ảnh — phải tính bù trừ phần
// letterbox này, nếu không khung crop sẽ bị lệch đúng bằng phần viền trống đó.
// LƯU Ý 2: dùng CSS clip-path để cắt ĐÚNG HÌNH DẠNG (oval/đa giác), không chỉ cắt
// theo khung chữ nhật bao quanh (bounding box) như trước.
function SourceImageCrop({ imageSrc, canvasRef, selection, imageNaturalSize, isPickingColor, onPickColorInCrop }) {
  const PREVIEW_WIDTH = 260;

  if (!selection || !canvasRef.current || !imageSrc || !imageNaturalSize) return null;

  const box = getBoundingBox(selection);
  if (!box || box.width === 0) return null;

  const container = canvasRef.current.getBoundingClientRect();
  if (container.width === 0 || container.height === 0) return null;

  const { displayedWidth, displayedHeight, offsetX, offsetY } = computeDisplayedImageGeometry(
    container.width,
    container.height,
    imageNaturalSize.width,
    imageNaturalSize.height
  );

  // Tọa độ vùng chọn tính TỪ GÓC ẢNH THẬT (trừ đi phần letterbox), không phải từ góc khung chứa
  const boxXInImage = box.x - offsetX;
  const boxYInImage = box.y - offsetY;

  const scale = PREVIEW_WIDTH / box.width;
  const previewHeight = Math.min(box.height * scale, 320);
  // Nếu bị giới hạn bởi previewHeight (box quá cao/hẹp), scale thực tế theo chiều cao
  // sẽ khác scale theo chiều rộng — nhưng để đơn giản, giữ 1 scale duy nhất theo chiều
  // rộng, chấp nhận phần dưới bị cắt bởi overflow:hidden nếu box quá cao.

  // Tính clip-path tùy theo hình dạng — tọa độ tính bằng px, TƯƠNG ĐỐI so với góc
  // trên-trái của khung preview (đã bao gồm scale).
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
    clipPath = "none"; // rect: không cần clip-path, overflow:hidden của khung ngoài là đủ
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
          alt="Vùng gốc đang chọn"
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
}) {
  const hasActiveSelection = activeSelection != null;
  const translationValue = activeSelection?.translation ?? "";

  return (
    <div className="tw-tabpanel">
      {/* Điều hướng qua lại giữa các bong bóng trên trang hiện tại */}
      {bubbleTotal > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#8286A0" }}>
            Bubble #{hasActiveSelection ? bubbleIndex + 1 : "-"} / {bubbleTotal}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={onSelectPrev} className="tw-btn-icon" title="Bong bóng trước">
              <ChevronLeft size={14} />
            </button>
            <button type="button" onClick={onSelectNext} className="tw-btn-icon" title="Bong bóng kế tiếp">
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => hasActiveSelection && onDeleteArea(activeSelection.id)}
              disabled={!hasActiveSelection}
              className="tw-btn-icon"
              title={hasActiveSelection ? "Xóa vùng đang chọn" : "Chọn 1 vùng trước đã"}
              style={{ color: hasActiveSelection ? "#ef4444" : undefined, marginLeft: 4 }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Ảnh GỐC của vùng đang chọn — để đối chiếu bằng mắt, không cần OCR đọc chữ */}
      <div className="tw-translation-block" style={{ marginBottom: 16 }}>
        <p className="tw-caption" style={{ marginBottom: 8, marginTop: 0 }}>
          SOURCE IMAGE {isPickingColor && <span style={{ color: "#2563eb" }}>— click để hút màu</span>}
        </p>
        {hasActiveSelection ? (
          <SourceImageCrop
            imageSrc={currentImage}
            canvasRef={canvasRef}
            selection={activeSelection}
            imageNaturalSize={imageNaturalSize}
            isPickingColor={isPickingColor}
            onPickColorInCrop={onPickColorInCrop}
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
            Chọn 1 vùng trên ảnh để xem tại đây
          </div>
        )}
      </div>

      <div className="tw-translation-block">
        <p className="tw-caption" style={{ marginBottom: 8, marginTop: 0 }}>
          TRANSLATION
        </p>
        {/* Ô này LUÔN giữ màu chữ trắng cố định — KHÔNG ăn theo màu chữ tùy chỉnh
            của bubble trên canvas (2 nơi độc lập nhau theo đúng yêu cầu). */}
        <textarea
          value={translationValue}
          onChange={(e) => onChangeTranslation(e.target.value)}
          className="tw-textarea"
          style={{ ...textStyle, color: "#ffffff" }}
          placeholder={hasActiveSelection ? "Nhập bản dịch cho vùng này..." : "Chọn 1 vùng trước đã"}
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
  isOpen,
  onToggleOpen,
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
}) {
  return (
    <>
      <div className="tw-panel-toggle-col">
        <button type="button" className="tw-panel-collapse-btn" onClick={onToggleOpen} title={isOpen ? "Ẩn panel bên phải" : "Hiện panel bên phải"}>
          {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <aside className={`tw-rightpanel ${!isOpen ? "tw-rightpanel-collapsed" : ""}`}>
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
    </>
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
    throw new Error(`Phản hồi không hợp lệ từ ${url}`);
  }

  if (IS_DEV) {
    // eslint-disable-next-line no-console
    console.log(`[fetchJson] ${url} →`, json);
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Yêu cầu thất bại (${res.status})`);
  }

  return json?.data !== undefined ? json.data : json;
}

// Lấy chi tiết 1 chapter theo ID (dùng chung cho cả lúc load task ban đầu lẫn lúc
// người dùng bấm chuyển sang chapter khác trong sidebar).
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

// Lấy danh sách trang (ảnh + trạng thái) THẬT của 1 task, đã sắp theo page_number —
// đây là nguồn dữ liệu ảnh CHÍNH THỨC, thay cho chapter.images (mảng text[] cũ,
// không còn cập nhật kể từ khi chuyển sang bảng page_translation).
// Route thật: /api/translate-workspace/{taskId} — ĐÃ XÁC NHẬN có "/api" ở đầu
// (test trực tiếp trên browser ra JSON hợp lệ, không phải lỗi "No static resource").
async function fetchPagesForTask(taskId, signal) {
  const list = await fetchJson(`${API_BASE}/translate-workspace/${taskId}`, signal);
  return Array.isArray(list) ? list : [];
}

// [LEGACY] Không còn dùng — giữ lại phòng trường hợp cần rollback tạm thời.
// Nguồn ảnh chính thức giờ là fetchPagesForTask() ở trên.
function normalizeImages(chapterData) {
  const raw = chapterData?.images || [];
  return raw.map((item) => (typeof item === "string" ? item : item?.url)).filter(Boolean);
}

// =============================================================================
// Drawing logic — hàm tính toán thuần túy (KHÔNG phải Hook, đặt ngoài, tên tự do)
// =============================================================================

function calculateRect(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(start.x - end.x);
  const height = Math.abs(start.y - end.y);
  return { x, y, width, height };
}

// Tính khung bao (bounding box) của 1 vùng chọn BẤT KỂ hình dạng gì —
// rect/ellipse đã có sẵn x,y,width,height; polygon phải tính từ mảng "points".
// Dùng cho: SourceImageCrop, hiển thị handle resize, v.v.
function getBoundingBox(selection) {
  if (selection.shape === "polygon" && selection.points?.length) {
    const xs = selection.points.map((p) => p.x);
    const ys = selection.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
  }
  if (selection.shape === "brush" && selection.points?.length) {
    // Nét cọ có BỀ DÀY (brushSize) — vệt trắng thực tế lan rộng ra thêm brushSize/2
    // về mỗi phía so với đường tâm đi qua các điểm, nên phải nở rộng bounding box ra
    // tương ứng, không chỉ tính theo đúng tọa độ các điểm (sẽ bị hụt mất viền cọ).
    const half = (selection.brushSize ?? 24) / 2;
    const xs = selection.points.map((p) => p.x);
    const ys = selection.points.map((p) => p.y);
    const minX = Math.min(...xs) - half;
    const minY = Math.min(...ys) - half;
    const maxX = Math.max(...xs) + half;
    const maxY = Math.max(...ys) + half;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return { x: selection.x, y: selection.y, width: selection.width, height: selection.height };
}

// Tính vùng ảnh THỰC SỰ hiển thị bên trong 1 khung chứa (containerWidth/Height) khi
// dùng objectFit:"contain" — ảnh có thể bị "letterbox" (viền trống trên/dưới hoặc
// trái/phải) nếu tỉ lệ khung khác tỉ lệ ảnh gốc. Dùng chung cho: SourceImageCrop,
// hàm hút màu trên ảnh chính, hàm hút màu trên ảnh crop — tránh viết lặp lại 3 nơi.
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
// Selection logic — custom hook quản lý NHIỀU vùng chọn (bong bóng thoại) trên 1 trang
// (BẮT BUỘC tên bắt đầu bằng "use" vì có gọi Hook bên trong)
// =============================================================================

let selectionIdCounter = 0;

function useSelectionAreas() {
  const [selections, setSelections] = useState([]); // [{id, shape:'rect'|'ellipse', x,y,width,height} | {id, shape:'polygon'|'brush', points:[{x,y}]}]
  const [drawing, setDrawing] = useState(null);      // hình rect/ellipse đang kéo dở
  const [activeId, setActiveId] = useState(null);
  const [activeTool, setActiveTool] = useState("rect"); // 'rect' | 'ellipse' | 'polygon' | 'eraser'
  const [polygonDraft, setPolygonDraft] = useState(null); // mảng điểm đang vẽ dở của polygon
  const [brushDraft, setBrushDraft] = useState(null); // mảng điểm đang vẽ dở của tẩy (brush stroke)
  const BRUSH_SIZE = 28; // độ dày nét tẩy (px) — giống cỡ đầu cọ trong Paint

  // Trạng thái đang kéo để MOVE hoặc RESIZE 1 vùng đã có (không phải vẽ mới)
  const dragState = useRef(null); // { mode: 'move'|'resize'|'vertex', id, handle?, vertexIndex?, startPos, originalSelection }

  const startPoint = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const getRelativePos = (e) => {
    const bounds = containerRef.current.getBoundingClientRect();
    return { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
  };

  // ============================== Vẽ mới (rect/ellipse/polygon/eraser) ==============================

  const handleMouseDown = (e) => {
    // Nếu đang kéo move/resize/vertex (bắt đầu từ 1 handle hoặc thân hình), bỏ qua — đã xử lý ở nơi khác
    if (dragState.current) return;

    const pos = getRelativePos(e);

    if (activeTool === "polygon") {
      // Mỗi click thêm 1 điểm vào polygon đang vẽ dở, không dùng kéo-thả
      setPolygonDraft((prev) => (prev ? [...prev, pos] : [pos]));
      return;
    }

    if (activeTool === "eraser") {
      // Bắt đầu 1 nét tẩy mới — giữ chuột kéo tới đâu, điểm được thêm vào tới đó (xem handleMouseMove)
      setBrushDraft([pos]);
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

    if (activeTool === "eraser") {
      if (!brushDraft) return;
      const pos = getRelativePos(e);
      // Thêm điểm mới vào nét đang vẽ — chính là hiệu ứng "kéo tới đâu, trắng hiện tới đó"
      setBrushDraft((prev) => [...prev, pos]);
      return;
    }

    if (!drawing) return;
    const pos = getRelativePos(e);
    setDrawing(calculateRect(startPoint.current, pos));
  };

  const handleMouseUp = () => {
    if (dragState.current) {
      dragState.current = null;
      return;
    }

    if (activeTool === "eraser") {
      // Chốt nét tẩy thành 1 vùng chọn hoàn chỉnh — cần tối thiểu 2 điểm mới có gì để vẽ
      if (brushDraft && brushDraft.length >= 2) {
        const newArea = {
          id: ++selectionIdCounter,
          shape: "brush",
          points: brushDraft,
          brushSize: BRUSH_SIZE,
          textColor: "#000000",
          textBgColor: "#ffffff",
        };
        setSelections((prev) => [...prev, newArea]);
        setActiveId(newArea.id);
      }
      setBrushDraft(null);
      return;
    }

    if (drawing && drawing.width > 8 && drawing.height > 8) {
      const newArea = {
        id: ++selectionIdCounter,
        shape: activeTool === "ellipse" ? "ellipse" : "rect",
        textColor: "#000000",
        textBgColor: "#ffffff",
        ...drawing,
      };
      setSelections((prev) => [...prev, newArea]);
      setActiveId(newArea.id);
    }
    setDrawing(null);
  };

  // Đóng polygon đang vẽ dở lại thành 1 vùng chọn hoàn chỉnh (cần tối thiểu 3 điểm)
  const finishPolygon = () => {
    if (polygonDraft && polygonDraft.length >= 3) {
      const newArea = {
        id: ++selectionIdCounter,
        shape: "polygon",
        points: polygonDraft,
        textColor: "#000000",
        textBgColor: "#ffffff",
      };
      setSelections((prev) => [...prev, newArea]);
      setActiveId(newArea.id);
    }
    setPolygonDraft(null);
  };

  const cancelPolygon = () => setPolygonDraft(null);

  // ============================== Chọn / xóa / dịch ==============================

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
      id: ++selectionIdCounter,
      shape: "rect",
      textColor: "#000000",
      textBgColor: "#ffffff",
      ...box,
    }));
    setSelections((prev) => [...prev, ...withIds]);
  };

  const updateTranslation = (id, translation) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, translation } : s)));
  };

  // Đặt tên tùy chỉnh cho 1 vùng chọn — áp dụng chung cho cả 3 loại hình (rect/ellipse/polygon)
  const updateName = (id, name) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  // Đổi màu chữ/màu nền RIÊNG cho 1 vùng chọn — không ảnh hưởng các vùng khác
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

  // ============================== Move / Resize / kéo đỉnh polygon ==============================
  // Bắt đầu kéo: gọi từ onMouseDown của thân hình (move) hoặc 1 handle (resize/vertex).
  // stopPropagation phải được gọi ở nơi gọi hàm này để không kích hoạt handleMouseDown vẽ mới.

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
    if (!selection) return;
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
    if (!selection) return;
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
    if (!drag) return;
    const pos = getRelativePos(e);
    const dx = pos.x - drag.startPos.x;
    const dy = pos.y - drag.startPos.y;

    setSelections((prev) =>
      prev.map((s) => {
        if (s.id !== drag.id) return s;

        if (drag.mode === "move") {
          if (s.shape === "polygon" || s.shape === "brush") {
            return { ...s, points: drag.original.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
          }
          return { ...s, x: drag.original.x + dx, y: drag.original.y + dy };
        }

        if (drag.mode === "resize") {
          // Tính lại x,y,width,height dựa trên góc đang kéo (handle) — góc đối diện đứng yên
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

          // Không cho width/height âm (kéo lố qua bên kia) — giữ tối thiểu 8px
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
    brushDraft,
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
  const [taskPages, setTaskPages] = useState([]); // nguồn ảnh CHÍNH THỨC — lấy từ /tasks/{taskId}/pages
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // ID của chapter ĐANG được hiển thị trên canvas
  const [currentChapterId, setCurrentChapterId] = useState(null);

  const [activeTab, setActiveTab] = useState("translate");
  // Bắt đầu rỗng — sẽ tự mở đúng chapter hiện tại sau khi tải xong danh sách thật
  const [open, setOpen] = useState({});
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [fontSize, setFontSize] = useState(13);
  const increaseFontSize = () => setFontSize((v) => Math.min(v + 1, 48));
  const decreaseFontSize = () => setFontSize((v) => Math.max(v - 1, 8));
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState("left");
  // Không còn state màu chữ/nền TOÀN CỤC nữa — mỗi vùng chọn (selection) tự lưu
  // textColor/textBgColor riêng, xem updateSelectionStyle() và default lúc tạo mới bên dưới.

  // Canvas ẩn (không render ra DOM) — vẽ lại ảnh trang hiện tại mỗi khi ảnh đổi,
  // dùng để ĐỌC TRỰC TIẾP GIÁ TRỊ PIXEL tại điểm click — giống cách các phần mềm
  // offline (Photoshop, GIMP...) làm, không phụ thuộc API hệ điều hành như
  // window.EyeDropper (API đó từng gây "đơ" trang vì vào chế độ chọn màu toàn màn hình).
  const pixelCanvasRef = useRef(null);
  if (!pixelCanvasRef.current && typeof document !== "undefined") {
    pixelCanvasRef.current = document.createElement("canvas");
  }

  // null | "text" | "bg" — đang ở chế độ chờ người dùng click vào ảnh để hút màu
  const [pickingColorFor, setPickingColorFor] = useState(null);

  const handleImageLoad = (size) => {
    setImageNaturalSize(size);

    // Vẽ lại ảnh vào canvas ẩn ở ĐÚNG kích thước gốc (không phải kích thước hiển thị)
    // để đọc pixel chính xác, không bị sai lệch do ảnh bị co giãn trên màn hình.
    const img = new Image();
    // BẮT BUỘC set trước khi gán src — nếu không, dù server (Cloudinary) đã gửi
    // Access-Control-Allow-Origin, trình duyệt vẫn coi canvas là "tainted" và
    // chặn getImageData(). Phải set crossOrigin TRƯỚC khi bắt đầu tải ảnh.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = pixelCanvasRef.current;
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size.width, size.height);
    };
    img.onerror = () => {
      console.error("Không tải lại được ảnh để đọc pixel (hút màu sẽ không dùng được).");
    };
    img.src = currentImage;
  };

  // Đọc màu tại 1 điểm trên ảnh (tọa độ THEO KHUNG HIỂN THỊ, giống hệ tọa độ của "selections"),
  // tự quy đổi qua tọa độ ảnh gốc trước khi đọc pixel, có tính cả phần letterbox do objectFit:contain.
  // Đọc màu tại 1 pixel THEO TỌA ĐỘ ẢNH GỐC (naturalX/naturalY) — hàm mức thấp,
  // dùng chung cho cả 2 chỗ hút màu (ảnh chính + ảnh crop bên panel phải).
  const readColorAtNaturalPixel = (naturalX, naturalY) => {
    try {
      const ctx = pixelCanvasRef.current.getContext("2d");
      const [r, g, b] = ctx.getImageData(naturalX, naturalY, 1, 1).data;
      return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      // Lỗi phổ biến nhất ở đây là CORS ("tainted canvas") — xảy ra khi ảnh tải từ
      // server KHÁC domain và server đó không gửi header cho phép đọc pixel.
      console.error("Không đọc được màu pixel:", err);
      return "CORS_ERROR";
    }
  };

  // Hút màu khi click trên ẢNH CHÍNH — tọa độ click tính theo khung chứa (containerBounds)
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
      return null; // click rơi vào phần letterbox trống, không phải ảnh thật
    }

    const naturalX = Math.floor((xInImage / displayedWidth) * imageNaturalSize.width);
    const naturalY = Math.floor((yInImage / displayedHeight) * imageNaturalSize.height);

    return readColorAtNaturalPixel(naturalX, naturalY);
  };

  // Hút màu khi click trên ẢNH CROP bên panel phải — nhận các số đã tính sẵn từ
  // SourceImageCrop (scale, offset trong ảnh, kích thước ảnh hiển thị) để suy ra
  // đúng pixel trên ảnh gốc, không tính lặp lại logic letterbox ở đây.
  const readColorInCrop = (clickX, clickY, scale, boxXInImage, boxYInImage, displayedWidth, displayedHeight) => {
    if (!imageNaturalSize) return null;

    const xInDisplayedImage = clickX / scale + boxXInImage;
    const yInDisplayedImage = clickY / scale + boxYInImage;

    const naturalX = Math.floor((xInDisplayedImage / displayedWidth) * imageNaturalSize.width);
    const naturalY = Math.floor((yInDisplayedImage / displayedHeight) * imageNaturalSize.height);

    return readColorAtNaturalPixel(naturalX, naturalY);
  };

  // Bấm nút "Hút màu" -> chỉ bật CHẾ ĐỘ CHỜ, việc đọc màu thật xảy ra khi người dùng
  // click vào ảnh (xem handleCanvasMouseDown bên dưới) — không mở popup/API nào cả.
  const pickTextColorFromScreen = () => {
    if (activeId == null) return; // phải chọn 1 vùng trước mới hút màu áp vào đâu được
    setPickingColorFor("text");
  };
  const pickBackgroundColorFromScreen = () => {
    if (activeId == null) return;
    setPickingColorFor("bg");
  };

  // Cho phép bấm Esc để hủy chế độ hút màu giữa chừng
  useEffect(() => {
    if (!pickingColorFor) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setPickingColorFor(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickingColorFor]);

  // Gọi custom hook ở đây — cùng cấp (top-level) với các useState khác
  const {
    containerRef: canvasRef,
    selections,
    drawing,
    activeId,
    activeTool,
    setActiveTool,
    polygonDraft,
    brushDraft,
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
  } = useSelectionAreas();

  // Vùng đang được chọn (nếu có) — dùng để đổ chữ gốc + bản dịch vào panel bên phải
  const activeSelection = selections.find((s) => s.id === activeId) ?? null;
  const activeSelectionIndex = selections.findIndex((s) => s.id === activeId);

  // Bấm Delete/Backspace để xóa vùng đang chọn — BỎ QUA nếu người dùng đang gõ chữ
  // trong 1 ô input/textarea (tránh xóa nhầm vùng khi chỉ đang sửa bản dịch).
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

  // Kích thước THẬT (naturalWidth/naturalHeight) của ảnh trang hiện tại — cần để
  // SourceImageCrop tính đúng vùng letterbox do objectFit:"contain" gây ra.
  const [imageNaturalSize, setImageNaturalSize] = useState(null);

  const textStyle = useMemo(
    () => ({
      fontSize: `${fontSize}px`,
      fontWeight: isBold ? 700 : 400,
      fontStyle: isItalic ? "italic" : "normal",
      textAlign,
    }),
    [fontSize, isBold, isItalic, textAlign]
  );

  useEffect(() => {
    if (!taskId) return;

    const controller = new AbortController();

    setStatus("loading");
    setError(null);

    // Gọi song song: chapter (metadata: title, comicId...) + pages (ảnh + trạng thái thật)
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
        // Tự mở sẵn chapter đang xem trong sidebar
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

  // Nguồn ảnh CHÍNH THỨC — lấy từ taskPages (API /translate-workspace/{taskId}), KHÔNG
  // còn đọc từ chapterData.images (mảng text[] cũ, đã lỗi thời từ khi có page_translation).
  const images = useMemo(() => taskPages.map((p) => p.imageUrl).filter(Boolean), [taskPages]);
  const currentImage = images[currentPageIndex];
  // Metadata đầy đủ của trang đang xem (pageId, status...) — dùng cho các tính năng
  // sau này cần biết ID trang thật, ví dụ nút "Đánh dấu hoàn thành".
  const currentPageMeta = taskPages[currentPageIndex] ?? null;

  // Sidebar "PROJECT FILES" — vì KHÔNG cho chuyển sang chapter khác, không cần gọi
  // API riêng để lấy toàn bộ chapters của comic. Tự dựng 1 mảng CHỈ có đúng 1 chapter
  // (chapter hiện tại), lấy dữ liệu trang trực tiếp từ taskPages đã có sẵn.
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

  // Bấm vào 1 trang trong sidebar — CHỈ hoạt động khi trang đó thuộc chapter đang
  // mở (nút của các chapter khác đã bị disable ở ChapterList, đây chỉ là chốt an
  // toàn thêm 1 lớp, phòng trường hợp gọi hàm này từ nơi khác sau này).
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

  const handleSaveAndNext = useCallback(() => {
    goToPage(currentPageIndex + 1);
  }, [goToPage, currentPageIndex]);

  // Xóa hết vùng chọn của trang cũ khi chuyển sang trang khác (hoặc chapter khác) —
  // mỗi trang có bong bóng riêng, không nên giữ lại vùng chọn của trang trước.
  // Cũng xóa imageNaturalSize cũ để tránh dùng nhầm kích thước ảnh trang trước.
  useEffect(() => {
    clearSelections();
    setImageNaturalSize(null);
  }, [currentPageIndex, currentChapterId]);

  // Áp dụng màu vừa hút được vào đúng chỗ (chữ hoặc nền) — dùng chung cho cả 2 nơi hút màu
  const applyPickedColor = (hex) => {
    if (hex === "CORS_ERROR") {
      alert(
        "Không hút được màu — ảnh đến từ server không cho phép đọc pixel (lỗi CORS). " +
          "Cần server ảnh gửi header Access-Control-Allow-Origin để dùng được tính năng này."
      );
    } else if (hex && activeId != null) {
      if (pickingColorFor === "text") updateSelectionStyle(activeId, { textColor: hex });
      else updateSelectionStyle(activeId, { textBgColor: hex });
    }
    // hex === null nghĩa là click trúng phần letterbox (viền trống quanh ảnh) — bỏ qua, không đổi màu
    setPickingColorFor(null);
  };

  // Bọc lại handleMouseDown gốc: nếu đang ở chế độ hút màu, chặn hành vi vẽ/chọn
  // bình thường lại, đọc màu tại điểm click rồi tắt chế độ hút màu.
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

  // Hút màu khi click vào ẢNH CROP bên panel phải (SourceImageCrop tự tính sẵn các
  // tham số hình học rồi truyền lên đây qua onPickColorInCrop)
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
      />

      <div className="tw-body">
        <aside className="tw-sidebar">
          <p className="tw-sidebar-label">PROJECT FILES</p>
          <ChapterList
            chapters={sidebarChapters}
            open={open}
            onToggle={toggleChapter}
            currentChapterId={currentChapterId}
            currentPageIndex={currentPageIndex}
            onSelectPage={handleSelectPage}
          />
        </aside>

        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div className="tw-canvas-toolbar">
            <CanvasToolbar
              isBold={isBold}
              isItalic={isItalic}
              textAlign={textAlign}
              fontSize={fontSize}
              textColor={activeSelection?.textColor ?? "#000000"}
              textBgColor={activeSelection?.textBgColor ?? "#ffffff"}
              hasActiveSelection={activeSelection != null}
              onToggleBold={() => setIsBold((v) => !v)}
              onToggleItalic={() => setIsItalic((v) => !v)}
              onSetTextAlign={setTextAlign}
              onIncreaseFontSize={increaseFontSize}
              onDecreaseFontSize={decreaseFontSize}
              onChangeTextColor={(color) => activeId != null && updateSelectionStyle(activeId, { textColor: color })}
              onChangeTextBgColor={(color) => activeId != null && updateSelectionStyle(activeId, { textBgColor: color })}
              onPickTextColor={pickTextColorFromScreen}
              onPickTextBgColor={pickBackgroundColorFromScreen}
            />
            <ShapeToolbar activeTool={activeTool} onSetTool={setActiveTool} />
            <PageNav images={images} currentPageIndex={currentPageIndex} goToPage={goToPage} />
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
            brushDraft={brushDraft}
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
          />
        </main>

        <TranslationSidePanel
          isOpen={rightPanelOpen}
          onToggleOpen={() => setRightPanelOpen((v) => !v)}
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
        />
      </div>
    </div>
  );
}