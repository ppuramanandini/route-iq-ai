import React from "react";

export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="4" stroke="var(--primary)" strokeWidth="1.5" />
      <path d="M6 16h7l4-7h9M13 16l4 7h9" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="16" r="2.2" fill="var(--success)" />
    </svg>
  );
}
