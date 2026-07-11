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
const IS_DEV = process.env.NODE_ENV === "development";


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

function CanvasToolbar({ isBold, isItalic, textAlign, onToggleBold, onToggleItalic, onSetTextAlign }) {
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

function PageImage({
  currentImage,
  currentPageIndex,
  canvasRef,
  drawing,
  selections,
  activeId,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onSelectArea,
  onDeleteArea,
  onImageLoad,
}) {
  return (
    <div className="tw-canvas">
      <div
        className="tw-page"
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ position: "relative", cursor: "crosshair" }}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={`Page ${currentPageIndex + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            draggable={false}
            // Lấy kích thước THẬT của ảnh (không phải kích thước hiển thị) —
            // cần để tính đúng vùng letterbox khi crop ảnh ở panel bên phải.
            onLoad={(e) => onImageLoad?.({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
          />
        ) : (
          <div style={{ padding: 24, color: "#8286A0" }}>Chapter này chưa có ảnh nào.</div>
        )}

        {/* Khung nét đứt: vùng đang kéo dở, chưa chốt */}
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
              pointerEvents: "none",
            }}
          />
        )}

        {/* Danh sách các vùng chọn đã chốt — mỗi vùng bấm được để chọn, có nút xóa */}
        {selections.map((sel, index) => {
          const isActive = sel.id === activeId;
          return (
            <div
              key={sel.id}
              // stopPropagation để bấm vào vùng này KHÔNG kích hoạt vẽ vùng mới ở container cha
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelectArea(sel.id);
              }}
              style={{
                position: "absolute",
                left: sel.x,
                top: sel.y,
                width: sel.width,
                height: sel.height,
                border: isActive ? "2px solid #16a34a" : "2px solid #f59e0b",
                background: isActive ? "rgba(22,163,74,0.15)" : "rgba(245,158,11,0.12)",
                cursor: "pointer",
              }}
            >
              {isActive ? (
                // Khung ĐANG CHỌN: hiện đầy đủ text — chỉ có 1 khung active tại 1 thời điểm
                // nên không lo chồng nhãn với khung khác.
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
                // Khung CHƯA CHỌN: chỉ hiện số thứ tự nhỏ gọn (không hiện full text),
                // để tránh nhiều nhãn dài đè lên nhau khi các khung đứng sát nhau.
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
              {isActive && sel.confidence != null && (
                <span
                  style={{
                    position: "absolute",
                    bottom: -18,
                    left: 0,
                    fontSize: 10,
                    color: "#8286A0",
                  }}
                >
                  {Math.round(sel.confidence * 100)}%
                </span>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteArea(sel.id);
                }}
                title="Xóa vùng chọn này"
                style={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  width: 18,
                  height: 18,
                  lineHeight: "16px",
                  borderRadius: "50%",
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourceImageCrop({ imageSrc, canvasRef, box, imageNaturalSize }) {
  const PREVIEW_WIDTH = 260;

  if (!box || !canvasRef.current || !imageSrc || !imageNaturalSize) return null;

  const container = canvasRef.current.getBoundingClientRect();
  if (container.width === 0 || container.height === 0 || box.width === 0) return null;

  const containerAspect = container.width / container.height;
  const imageAspect = imageNaturalSize.width / imageNaturalSize.height;

  // Kích thước + vị trí THẬT của ảnh bên trong khung chứa (sau khi áp dụng objectFit:contain)
  let displayedWidth, displayedHeight, offsetX, offsetY;
  if (imageAspect > containerAspect) {
    // Ảnh "nằm ngang" hơn khung -> bị letterbox trên/dưới
    displayedWidth = container.width;
    displayedHeight = container.width / imageAspect;
    offsetX = 0;
    offsetY = (container.height - displayedHeight) / 2;
  } else {
    // Ảnh "đứng" hơn khung -> bị letterbox trái/phải
    displayedHeight = container.height;
    displayedWidth = container.height * imageAspect;
    offsetY = 0;
    offsetX = (container.width - displayedWidth) / 2;
  }

  // Tọa độ vùng chọn tính TỪ GÓC ẢNH THẬT (trừ đi phần letterbox), không phải từ góc khung chứa
  const boxXInImage = box.x - offsetX;
  const boxYInImage = box.y - offsetY;

  const scale = PREVIEW_WIDTH / box.width;
  const previewHeight = Math.min(box.height * scale, 320);

  return (
    <div
      style={{
        width: PREVIEW_WIDTH,
        height: previewHeight,
        overflow: "hidden",
        position: "relative",
        background: "#000",
        borderRadius: 6,
      }}
    >
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
          </div>
        </div>
      )}

      {/* Ảnh GỐC của vùng đang chọn — để đối chiếu bằng mắt, không cần OCR đọc chữ */}
      <div className="tw-translation-block" style={{ marginBottom: 16 }}>
        <p className="tw-caption" style={{ marginBottom: 8, marginTop: 0 }}>
          SOURCE IMAGE
        </p>
        {hasActiveSelection ? (
          <SourceImageCrop
            imageSrc={currentImage}
            canvasRef={canvasRef}
            box={activeSelection}
            imageNaturalSize={imageNaturalSize}
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
            Select a region on the image to view it here
          </div>
        )}
      </div>

      <div className="tw-translation-block">
        <p className="tw-caption" style={{ marginBottom: 8, marginTop: 0 }}>
          TRANSLATION
        </p>
        <textarea
          value={translationValue}
          onChange={(e) => onChangeTranslation(e.target.value)}
          className="tw-textarea"
          style={textStyle}
          placeholder={hasActiveSelection ? "Write translation here..." : "Select a region first"}
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

let selectionIdCounter = 0;

function useSelectionAreas() {
  const [selections, setSelections] = useState([]); // danh sách vùng đã chốt: [{id, x, y, width, height}]
  const [drawing, setDrawing] = useState(null);      // vùng đang kéo dở (null khi không kéo)
  const [activeId, setActiveId] = useState(null);    // id vùng đang được chọn (click vào để xem/sửa)
  const startPoint = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const getRelativePos = (e) => {
    const bounds = containerRef.current.getBoundingClientRect();
    return { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
  };

  // Bấm xuống trên NỀN ảnh -> bắt đầu vẽ vùng mới.
  // (Bấm vào 1 vùng đã có sẽ tự stopPropagation ở nơi khác, không rơi vào đây.)
  const handleMouseDown = (e) => {
    const pos = getRelativePos(e);
    startPoint.current = pos;
    setActiveId(null);
    setDrawing(calculateRect(pos, pos));
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    const pos = getRelativePos(e);
    setDrawing(calculateRect(startPoint.current, pos));
  };

  // Thả chuột -> nếu vùng đủ lớn, thêm vào danh sách "selections" (không ghi đè vùng cũ)
  const handleMouseUp = () => {
    if (drawing && drawing.width > 8 && drawing.height > 8) {
      const newArea = { id: ++selectionIdCounter, ...drawing };
      setSelections((prev) => [...prev, newArea]);
      setActiveId(newArea.id);
    }
    setDrawing(null);
  };

  const selectArea = (id) => setActiveId(id);

  const deleteArea = (id) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  };

  const clearSelections = () => {
    setSelections([]);
    setActiveId(null);
  };

  // Nạp hàng loạt vùng chọn từ nguồn ngoài (ví dụ kết quả nhận diện tự động),
  // gán id tăng dần để không trùng với các vùng vẽ tay đã có.
  const loadSelections = (boxes) => {
    const withIds = boxes.map((box) => ({ id: ++selectionIdCounter, ...box }));
    setSelections((prev) => [...prev, ...withIds]);
  };

  // Cập nhật bản dịch của RIÊNG 1 vùng (không dùng chung 1 ô cho cả trang)
  const updateTranslation = (id, translation) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, translation } : s)));
  };

  // Chuyển sang vùng kế tiếp / trước đó theo thứ tự trong danh sách (dùng cho nút ◁ ▷)
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

  return {
    containerRef,
    selections,
    drawing,
    activeId,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    selectArea,
    deleteArea,
    clearSelections,
    loadSelections,
    updateTranslation,
    selectNext,
    selectPrev,
  };
}

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

  // Gọi custom hook ở đây — cùng cấp (top-level) với các useState khác
  const {
    containerRef: canvasRef,
    selections,
    drawing,
    activeId,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    selectArea,
    deleteArea,
    clearSelections,
    loadSelections,
    updateTranslation,
    selectNext,
    selectPrev,
  } = useSelectionAreas();

  // Vùng đang được chọn (nếu có) — dùng để đổ chữ gốc + bản dịch vào panel bên phải
  const activeSelection = selections.find((s) => s.id === activeId) ?? null;
  const activeSelectionIndex = selections.findIndex((s) => s.id === activeId);

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

  const handleSaveAndNext = useCallback(() => {
    goToPage(currentPageIndex + 1);
  }, [goToPage, currentPageIndex]);

  // Xóa hết vùng chọn của trang cũ khi chuyển sang trang khác — mỗi trang có bong bóng riêng,
  // không nên giữ lại vùng chọn của trang trước. Cũng xóa imageNaturalSize cũ để tránh
  // dùng nhầm kích thước ảnh trang trước trong lúc ảnh mới chưa load xong.
  useEffect(() => {
    clearSelections();
    setImageNaturalSize(null);
  }, [currentPageIndex]);

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
          <ChapterList chapters={STATIC_CHAPTERS} open={open} onToggle={toggleChapter} />
        </aside>

        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div className="tw-canvas-toolbar">
            <CanvasToolbar
              isBold={isBold}
              isItalic={isItalic}
              textAlign={textAlign}
              onToggleBold={() => setIsBold((v) => !v)}
              onToggleItalic={() => setIsItalic((v) => !v)}
              onSetTextAlign={setTextAlign}
            />
            <PageNav images={images} currentPageIndex={currentPageIndex} goToPage={goToPage} />
          </div>

          <PageImage
            currentImage={currentImage}
            currentPageIndex={currentPageIndex}
            canvasRef={canvasRef}
            drawing={drawing}
            selections={selections}
            activeId={activeId}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onSelectArea={selectArea}
            onDeleteArea={deleteArea}
            onImageLoad={setImageNaturalSize}
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
        />
      </div>
    </div>
  );
}