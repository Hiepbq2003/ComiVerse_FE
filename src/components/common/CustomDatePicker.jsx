import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CustomDatePicker({ 
  value, 
  onChange, 
  placeholder = 'Select date of birth',
  style,
  className = '',
  disabled = false,
  minDate = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 310, dropUp: false });

  // Parse YYYY-MM-DD string into date values
  const parseValue = (val) => {
    if (!val) return null;
    const parts = val.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
      }
    }
    return null;
  };

  const parsed = parseValue(value);
  const selectedDate = parsed;

  // Viewing state (defaults to selected date or 1999-04-15 or current date)
  const [viewYear, setViewYear] = useState(selectedDate ? selectedDate.year : 1999);
  const [viewMonth, setViewMonth] = useState(selectedDate ? selectedDate.month : 4);

  // Update view when value prop changes if popover opened
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedContainer = containerRef.current && containerRef.current.contains(event.target);
      const clickedPopover = popoverRef.current && popoverRef.current.contains(event.target);
      if (!clickedContainer && !clickedPopover) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateCoords = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const actualHeight = popoverRef.current ? popoverRef.current.offsetHeight : 345;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top;
    let dropUp = false;

    if (spaceBelow >= actualHeight + 8) {
      top = rect.bottom + 6;
      dropUp = false;
    } else if (spaceAbove >= actualHeight + 8) {
      top = rect.top - actualHeight - 6;
      dropUp = true;
    } else {
      top = Math.max(10, window.innerHeight - actualHeight - 10);
      dropUp = rect.top > window.innerHeight / 2;
    }

    setCoords({
      top,
      left: Math.min(Math.max(10, rect.left), window.innerWidth - 330),
      width: Math.max(rect.width, 310),
      dropUp
    });
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const frameId = requestAnimationFrame(() => {
        updateCoords();
      });
      const handleScrollOrResize = () => updateCoords();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen]);

  const parsedMin = parseValue(minDate);

  const isDateDisabled = (y, m, d) => {
    if (!parsedMin) return false;
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${y}-${mm}-${dd}`;
    return dateStr < minDate;
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    if (isDateDisabled(viewYear, viewMonth, day)) return;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const formatted = `${viewYear}-${mm}-${dd}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    if (isDateDisabled(y, m, d)) return;
    setViewYear(y);
    setViewMonth(m);
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${y}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  // Year select options (1920 to current year + 10)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1920; y--) {
    years.push(y);
  }

  // Format display string e.g. "05/15/1999" or "May 15, 1999"
  const getFormattedDisplay = () => {
    if (!parsed) return placeholder;
    const mm = String(parsed.month + 1).padStart(2, '0');
    const dd = String(parsed.day).padStart(2, '0');
    return `${mm}/${dd}/${parsed.year}`;
  };

  return (
    <div className={`custom-datepicker-container ${isOpen ? 'open' : ''} ${className}`} ref={containerRef}>
      {/* Input box displaying selected date */}
      <div 
        className={`custom-datepicker-input ${isOpen ? 'active' : ''} ${!parsed ? 'is-placeholder-state' : 'has-value-state'}`}
        style={style}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`custom-datepicker-value ${!parsed ? 'is-placeholder' : 'is-selected'}`}>
          {getFormattedDisplay()}
        </span>
        <Calendar className="custom-datepicker-icon" size={18} />
      </div>

      {/* Popover Calendar Modal Rendered via Portal to avoid any clipping from overflow-y modals/containers */}
      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          className={`custom-datepicker-popover fade-in ${coords.dropUp ? 'drop-up' : ''}`}
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`
          }}
        >
          {/* Header Controls */}
          <div className="custom-datepicker-header">
            <div className="custom-datepicker-header-selects">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="custom-datepicker-select"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>{name}</option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="custom-datepicker-select"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="custom-datepicker-nav-btns">
              <button 
                type="button" 
                className="custom-datepicker-nav-btn" 
                onClick={handlePrevMonth}
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                type="button" 
                className="custom-datepicker-nav-btn" 
                onClick={handleNextMonth}
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="custom-datepicker-weekdays">
            {WEEKDAY_NAMES.map(day => (
              <div key={day} className="custom-datepicker-weekday">{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="custom-datepicker-days-grid">
            {/* Previous month trailing days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayOfWeek + i + 1;
              return (
                <div key={`prev-${i}`} className="custom-datepicker-day outside">
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = parsed && 
                parsed.year === viewYear && 
                parsed.month === viewMonth && 
                parsed.day === dayNum;

              const isToday = 
                new Date().getFullYear() === viewYear && 
                new Date().getMonth() === viewMonth && 
                new Date().getDate() === dayNum;

              const isDisabled = isDateDisabled(viewYear, viewMonth, dayNum);

              return (
                <button
                  type="button"
                  key={`day-${dayNum}`}
                  className={`custom-datepicker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                  onClick={() => handleSelectDay(dayNum)}
                  disabled={isDisabled}
                  style={isDisabled ? { opacity: 0.35, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
                >
                  {dayNum}
                </button>
              );
            })}

            {/* Next month leading days to complete grid */}
            {Array.from({ length: (42 - (firstDayOfWeek + daysInMonth)) % 7 }).map((_, i) => (
              <div key={`next-${i}`} className="custom-datepicker-day outside">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="custom-datepicker-footer">
            <button type="button" className="custom-datepicker-footer-btn clear" onClick={handleClear}>
              Clear
            </button>
            <button type="button" className="custom-datepicker-footer-btn today" onClick={handleToday}>
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}