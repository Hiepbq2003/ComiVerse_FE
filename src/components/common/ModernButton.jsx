import React from 'react';
import '../../assets/style/common/modern-button.css';

export const ModernButton = ({
  variant = 1,
  label = 'Button',
  tooltip = 'Size: 20Mb',
  onClick = () => {},
  className = '',
  style = {},
  type = 'button',
  disabled = false
}) => {
  return (
    <div className="modern-btn-container" style={style}>
      {/* 1. Download with Tooltip */}
      {variant === 1 && (
        <button 
          type={type} 
          className={`btn-1 ${className}`} 
          data-tooltip={tooltip}
          onClick={onClick}
          disabled={disabled}
        >
          <div className="btn-1-wrapper">
            <div className="text">{label || 'Download'}</div>
            <span className="icon">
              <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="2em" height="2em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"></path></svg>
            </span>
          </div>
        </button>
      )}

      {/* 2. Slide Skew Login */}
      {variant === 2 && (
        <button 
          type={type} 
          className={`btn-2 ${className}`} 
          onClick={onClick}
          disabled={disabled}
        >
          <span>{label || 'Login'}</span>
        </button>
      )}

      {/* 3. Send with Airplane */}
      {variant === 3 && (
        <button 
          type={type} 
          className={`btn-6 ${className}`} 
          onClick={onClick}
          disabled={disabled}
        >
          <div className="svg-wrapper-1">
            <div className="svg-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                <path fill="none" d="M0 0h24v24H0z"></path>
                <path fill="currentColor" d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"></path>
              </svg>
            </div>
          </div>
          <span>{label || 'Send'}</span>
        </button>
      )}

      {/* 4. Explore All with Double Arrow */}
      {variant === 4 && (
        <button 
          type={type} 
          className={`btn-4 ${className}`} 
          onClick={onClick}
          disabled={disabled}
        >
          <span className="button__icon-wrapper">
            <svg viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="button__icon-svg" width="10">
              <path d="M13.376 11.552l-.264-10.44-10.44-.24.024 2.28 6.96-.048L.2 12.56l1.488 1.488 9.432-9.432-.048 6.912 2.304.024z" fill="currentColor"></path>
            </svg>
            <svg viewBox="0 0 14 15" fill="none" width="10" xmlns="http://www.w3.org/2000/svg" className="button__icon-svg button__icon-svg--copy">
              <path d="M13.376 11.552l-.264-10.44-10.44-.24.024 2.28 6.96-.048L.2 12.56l1.488 1.488 9.432-9.432-.048 6.912 2.304.024z" fill="currentColor"></path>
            </svg>
          </span>
          {label || 'Explore All'}
        </button>
      )}

      {/* 5. Border Fill Signup */}
      {variant === 5 && (
        <button 
          type={type} 
          className={`btn-5 ${className}`} 
          onClick={onClick}
          disabled={disabled}
        >
          {label || 'Sign Up'}
        </button>
      )}

      {/* 6. Back to Top Circle to Capsule */}
      {variant === 6 && (
        <button 
          type={type} 
          className={`btn-3 ${className}`} 
          onClick={onClick}
          disabled={disabled}
        >
          <svg className="svgIcon" viewBox="0 0 384 512">
            <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

export default ModernButton;
