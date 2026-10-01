import React, { useState, useEffect, useRef } from "react";

export function AnimatedNumber({ value, decimals = 0, suffix = "", prefix = "" }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = performance.now();
    const prev = prevRef.current;
    let rafId = 0;

    const animate = (time) => {
      const progress = Math.min(1, (time - start) / 600);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(prev + (value - prev) * ease);
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        prevRef.current = value;
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  );
}
