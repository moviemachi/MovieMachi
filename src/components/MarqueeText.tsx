import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export default function MarqueeText({ text, className = "" }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [singleWidth, setSingleWidth] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerW = containerRef.current.clientWidth;
        const textW = textRef.current.getBoundingClientRect().width;
        
        // We know the spacer is exactly 40px (paddingRight: "40px") when overflowing.
        const hasPadding = isOverflowing;
        const naturalTextWidth = hasPadding ? (textW - 40) : textW;
        
        const nextOverflow = naturalTextWidth > containerW;
        const nextSingleWidth = nextOverflow ? (naturalTextWidth + 40) : 0;
        
        if (nextOverflow !== isOverflowing) {
          setIsOverflowing(nextOverflow);
        }
        if (Math.abs(nextSingleWidth - singleWidth) > 1) {
          setSingleWidth(nextSingleWidth);
        }
      }
    };

    // Check overflow initially and on changes
    checkOverflow();
    const timer = setTimeout(checkOverflow, 50);

    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      const observer = new ResizeObserver(() => {
        checkOverflow();
      });
      observer.observe(containerRef.current);
      return () => {
        observer.disconnect();
        clearTimeout(timer);
      };
    }
    return () => clearTimeout(timer);
  }, [text, isOverflowing, singleWidth]);

  if (!isOverflowing || singleWidth === 0) {
    return (
      <div ref={containerRef} className={`w-full overflow-hidden ${className}`}>
        <span ref={textRef} className="whitespace-nowrap inline-block">
          {text}
        </span>
      </div>
    );
  }

  const speed = 35; // Pixels per second for steady premium flow
  const duration = singleWidth / speed;

  return (
    <div ref={containerRef} className={`w-full overflow-hidden relative select-none ${className}`}>
      <motion.div
        className="flex whitespace-nowrap will-change-transform"
        style={{ display: "inline-flex", transform: "translateZ(0)" }}
        animate={{
          x: [0, -singleWidth],
        }}
        transition={{
          duration: duration,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        <span ref={textRef} className="inline-block shrink-0" style={{ paddingRight: "40px" }}>
          {text}
        </span>
        <span className="inline-block shrink-0" style={{ paddingRight: "40px" }}>
          {text}
        </span>
      </motion.div>
    </div>
  );
}
