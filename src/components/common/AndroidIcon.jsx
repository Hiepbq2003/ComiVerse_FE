import React from 'react';

const AndroidIcon = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg 
    role="img" 
    viewBox="0 0 576 512" 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    fill={color}
    className={className}
    aria-hidden="true"
  >
    <path d="M420.55,301.93a24,24,0,1,1,24-24,24,24,0,0,1-24,24m-265.1,0a24,24,0,1,1,24-24,24,24,0,0,1-24,24m273.7-144.48,47.94-83a10,10,0,1,0-17.27-10h0l-48.54,84.07a301.25,301.25,0,0,0-246.56,0L116.18,64.45a10,10,0,1,0-17.27,10h0l48,83.17C64.94,202.62,8.15,285.55,0,384H576c-8.15-98.45-64.94-181.38-146.85-226.55"/>
  </svg>
);

export default AndroidIcon;
