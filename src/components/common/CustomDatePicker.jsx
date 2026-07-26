import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CustomDatePicker({ value, onChange, placeholder = 'Select date of birth' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className={`custom-datepicker-container ${isOpen ? 'open' : ''}`} ref={containerRef}>
      {/* Input box displaying selected date */}
      <div 
        className={`custom-datepicker-input ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="custom-datepicker-value">{getFormattedDisplay()}</span>
        <Calendar className="custom-datepicker-icon" size={18} />
      </div>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div className="custom-datepicker-popover fade-in">
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

              return (
                <button
                  type="button"
                  key={`day-${dayNum}`}
                  className={`custom-datepicker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => handleSelectDay(dayNum)}
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
        </div>
      )}
    </div>
  );
}
