function LogoIcon({ size = 32, className = '', color = null }) {
  return (
    <svg 
      viewBox="0 0 240 40" 
      height={size} 
      className={`comiverse-full-logo ${className}`} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="premiumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#ff6b35" />
        </linearGradient>

        <filter id="premiumGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,900&family=Outfit:wght@500;800&display=swap');
          
          .logo-comi { 
            font-family: 'Montserrat', system-ui, sans-serif; 
            font-size: 28px; 
            font-weight: 900; 
            font-style: italic;
            fill: #ffffff;
            letter-spacing: -0.5px;
          }
          html.light .logo-comi {
            fill: #0f172a !important;
          }
          .logo-slash-secondary {
            fill: #ffffff;
            opacity: 0.9;
          }
          html.light .logo-slash-secondary {
            fill: #0f172a !important;
            opacity: 0.85;
          }
          .logo-verse { 
            font-family: 'Outfit', system-ui, sans-serif; 
            font-size: 28px; 
            font-weight: 600; 
            fill: url(#premiumGrad);
            letter-spacing: 1.5px;
          }
          .slash-primary {
            fill: url(#premiumGrad);
            animation: slash-pulse 3s ease-in-out infinite alternate;
          }
          @keyframes slash-pulse {
            0% { opacity: 0.85; filter: drop-shadow(0 0 4px rgba(236,72,153,0.5)); }
            100% { opacity: 1; filter: drop-shadow(0 0 10px rgba(236,72,153,0.9)); }
          }
        `}
      </style>
      
      {/* Speed Slashes */}
      <g transform="translate(0, 0)">
        <path d="M 18 4 L 4 34 L 15 34 L 29 4 Z" className="slash-primary" filter="url(#premiumGlow)" />
        <path d="M 32 14 L 23 34 L 29 34 L 38 14 Z" className="logo-slash-secondary" />
      </g>
      
      {/* Text Logo */}
      <text x="48" y="32" className="logo-comi">COMI</text>
      <text x="126" y="32" className="logo-verse">VERSE</text>
    </svg>
  )
}

export default LogoIcon
