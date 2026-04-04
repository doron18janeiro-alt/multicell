"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export type LogoProps = {
  size?: number;
  className?: string;
  alt?: string;
  subtitle?: string;
  priority?: boolean;
  showWordmark?: boolean;
  wordmarkSize?: "sm" | "md" | "lg";
  animate?: boolean;
};

const sparkBursts = [
  {
    className:
      "left-[15%] top-[28%] h-[2px] w-[17%] rotate-[-20deg] bg-gradient-to-r from-transparent via-cyan-100 to-transparent",
    duration: 1.6,
    delay: 0.1,
  },
  {
    className:
      "left-[17%] top-[31%] h-[8px] w-[8px] rounded-full bg-[radial-gradient(circle,_rgba(255,250,205,0.95),rgba(250,204,21,0.42)_52%,transparent_72%)]",
    duration: 2.1,
    delay: 0.25,
  },
  {
    className:
      "left-[48%] top-[37%] h-[2px] w-[13%] rotate-[8deg] bg-gradient-to-r from-transparent via-amber-100 to-transparent",
    duration: 1.8,
    delay: 0.55,
  },
  {
    className:
      "left-[65%] top-[35%] h-[2px] w-[14%] rotate-[-14deg] bg-gradient-to-r from-transparent via-cyan-100 to-transparent",
    duration: 2.3,
    delay: 0.4,
  },
  {
    className:
      "left-[71%] top-[43%] h-[7px] w-[7px] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.95),rgba(56,189,248,0.45)_52%,transparent_74%)]",
    duration: 1.9,
    delay: 0.9,
  },
];

const wordmarkClasses = {
  sm: {
    line: "text-[10px] tracking-[0.34em]",
    divider: "w-16",
    subtitle: "text-[10px] tracking-[0.22em]",
  },
  md: {
    line: "text-xs tracking-[0.42em]",
    divider: "w-20",
    subtitle: "text-[11px] tracking-[0.24em]",
  },
  lg: {
    line: "text-sm tracking-[0.52em]",
    divider: "w-24",
    subtitle: "text-xs tracking-[0.3em]",
  },
} as const;

export default function Logo({
  size = 200,
  className = "",
  alt = "World Tech Manager",
  subtitle,
  priority = false,
  showWordmark = false,
  wordmarkSize = "md",
  animate = true,
}: LogoProps) {
  const wordmark = wordmarkClasses[wordmarkSize];
  const radialMask =
    "radial-gradient(circle at center, rgba(0,0,0,1) 0 54%, rgba(0,0,0,0.96) 64%, transparent 78%)";

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`.trim()}
      style={{ width: size }}
    >
      <motion.div
        className="relative aspect-square w-full"
        animate={
          animate
            ? {
                y: [0, -8, 0],
                scale: [1, 1.015, 1],
              }
            : undefined
        }
        transition={
          animate
            ? { duration: 7, repeat: Infinity, ease: "easeInOut" }
            : undefined
        }
      >
        <motion.div
          className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.3),rgba(34,211,238,0.14)_28%,transparent_72%)] blur-3xl"
          animate={
            animate
              ? { opacity: [0.4, 0.85, 0.4], scale: [0.97, 1.03, 0.97] }
              : undefined
          }
          transition={
            animate
              ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        />
        <motion.div
          className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,_rgba(250,204,21,0.34),rgba(250,204,21,0.12)_34%,transparent_72%)] blur-2xl"
          animate={
            animate
              ? { opacity: [0.3, 0.75, 0.3], scale: [0.98, 1.02, 0.98] }
              : undefined
          }
          transition={
            animate
              ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        />
        <motion.div
          className="absolute inset-[9%] rounded-full opacity-55 blur-md"
          style={{
            background:
              "conic-gradient(from 185deg, transparent 0deg, rgba(255,255,255,0.16) 60deg, transparent 120deg, rgba(34,211,238,0.22) 210deg, transparent 300deg)",
          }}
          animate={animate ? { rotate: [0, 360] } : undefined}
          transition={
            animate
              ? { duration: 16, repeat: Infinity, ease: "linear" }
              : undefined
          }
        />
        <div className="absolute inset-[11%] rounded-full border border-white/10 shadow-[0_0_28px_rgba(34,211,238,0.14)]" />

        {sparkBursts.map((spark, index) => (
          <motion.span
            key={index}
            className={`absolute ${spark.className}`}
            animate={
              animate
                ? {
                    opacity: [0.2, 1, 0.2],
                    scale: [0.85, 1.18, 0.92],
                  }
                : undefined
            }
            transition={
              animate
                ? {
                    duration: spark.duration,
                    delay: spark.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
                : undefined
            }
          />
        ))}

        <motion.div
          className="absolute inset-[8%]"
          style={{
            WebkitMaskImage: radialMask,
            maskImage: radialMask,
          }}
          animate={animate ? { rotate: [0, 1.2, 0, -1.2, 0] } : undefined}
          transition={
            animate
              ? { duration: 8.5, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        >
          <Image
            src="/wtm.jpg"
            alt={alt}
            fill
            sizes={`${size}px`}
            priority={priority}
            className="object-cover"
            style={{
              mixBlendMode: "multiply",
              filter:
                "contrast(1.2) brightness(1.08) saturate(1.12) drop-shadow(0 0 24px rgba(250,204,21,0.22)) drop-shadow(0 0 56px rgba(34,211,238,0.14))",
            }}
          />
        </motion.div>
      </motion.div>

      {showWordmark ? (
        <div className="mt-4 text-center">
          <p
            className={`font-black uppercase text-[#F7E6A2] [text-shadow:0_0_14px_rgba(250,204,21,0.34)] ${wordmark.line}`}
          >
            WORLD TECH
          </p>
          <p
            className={`-mt-0.5 font-black uppercase text-[#F7E6A2] [text-shadow:0_0_14px_rgba(250,204,21,0.34)] ${wordmark.line}`}
          >
            MANAGER
          </p>
          <div
            className={`mx-auto mt-2 h-px bg-gradient-to-r from-transparent via-[#FACC15]/70 to-transparent ${wordmark.divider}`}
          />
          {subtitle ? (
            <p
              className={`mt-3 font-medium uppercase text-slate-400 ${wordmark.subtitle}`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
