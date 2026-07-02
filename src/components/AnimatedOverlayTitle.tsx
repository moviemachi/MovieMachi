import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";

interface AnimatedOverflowTextProps {
  text: string;
  className?: string;
  containerClassName?: string;
  speed?: number; // pixels per second
  pauseDuration?: number; // seconds
}

export function AnimatedOverflowText({
  text,
  className = "",
  containerClassName = "",
  speed = 20, // slow premium speed
  pauseDuration = 2.0, // 2 seconds
}: AnimatedOverflowTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scrollDist, setScrollDist] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        setScrollDist(textWidth > containerWidth ? textWidth - containerWidth : 0);
      }
    };

    // Measure after DOM stabilizes
    const timeoutId = setTimeout(measure, 150);

    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", measure);
    };
  }, [text]);

  const scrollTime = scrollDist / speed;
  const returnTime = Math.max(1.0, scrollDist / (speed * 1.5));
  const totalTime = pauseDuration + scrollTime + pauseDuration + returnTime;

  const times = [
    0,
    pauseDuration / totalTime,
    (pauseDuration + scrollTime) / totalTime,
    (pauseDuration + scrollTime + pauseDuration) / totalTime,
    1
  ];

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap relative ${containerClassName}`}
    >
      {scrollDist > 0 ? (
        <motion.span
          ref={textRef}
          className={`inline-block ${className}`}
          animate={{
            x: [0, 0, -scrollDist, -scrollDist, 0]
          }}
          transition={{
            duration: totalTime,
            times: times,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.5
          }}
          style={{ willChange: "transform" }}
        >
          {text}
        </motion.span>
      ) : (
        <span
          ref={textRef}
          className={`inline-block truncate w-full ${className}`}
        >
          {text}
        </span>
      )}
    </div>
  );
}

interface AnimatedOverlayTitleProps {
  text: string;
}

export default function AnimatedOverlayTitle({ text }: AnimatedOverlayTitleProps) {
  return (
    <AnimatedOverflowText
      text={text}
      className="font-display font-black text-xl md:text-2xl text-white tracking-tight leading-tight"
      containerClassName="w-full"
      speed={20}
    />
  );
}
