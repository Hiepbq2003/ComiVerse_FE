function LogoIcon({ size = 32, className = '' }) {
  // We use a viewBox of 220 40 to perfectly fit "C [Planet] miVerse"
  return (
    <svg 
      viewBox="0 0 220 40" 
      height={size} 
      className={`comiverse-full-logo ${className}`} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="planetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4b4b" />
          <stop offset="100%" stopColor="#cc0000" />
        </linearGradient>
        <linearGradient id="ringGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffb3b3" />
          <stop offset="50%" stopColor="#ff4b4b" />
          <stop offset="100%" stopColor="#ffb3b3" />
        </linearGradient>
      </defs>
      
      <style>
        {`
          .logo-text-svg { 
            font-family: system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
            font-size: 28px; 
            font-weight: 900; 
            font-style: italic; 
            fill: currentColor; 
            letter-spacing: -0.5px; 
          }
        `}
      </style>
      
      <text x="0" y="30" className="logo-text-svg">C</text>
      
      <g transform="translate(34, 18)">
        {/* Orbit Path */}
        <circle cx="0" cy="0" r="18" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.4"/>
        
        {/* Ring (Back) */}
        <path d="M -16 6 C -10 16, 16 16, 20 2" fill="none" stroke="url(#ringGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
        
        {/* Planet Core */}
        <circle cx="0" cy="0" r="10" fill="url(#planetGrad)" />
        <circle cx="-3" cy="-3" r="3" fill="#ffffff" opacity="0.3" />
        
        {/* Ring (Front) */}
        <path d="M 20 2 C 16 -8, -10 -8, -16 6" fill="none" stroke="url(#ringGrad)" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Little satellites/stars */}
        <circle cx="-12" cy="-12" r="1.5" fill="currentColor" opacity="0.8" />
        <circle cx="14" cy="10" r="1" fill="currentColor" />
        <circle cx="-16" cy="8" r="1.5" fill="currentColor" />
        <circle cx="12" cy="-14" r="1" fill="currentColor" opacity="0.6" />
      </g>
      
      <text x="56" y="30" className="logo-text-svg">miVerse</text>
    </svg>
  )
}

export default LogoIcon
