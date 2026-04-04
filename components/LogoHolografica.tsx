"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type LogoHolograficaProps = {
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
      "left-[14%] top-[28%] h-[2px] w-[16%] rotate-[-22deg] bg-gradient-to-r from-transparent via-cyan-200 to-transparent",
    duration: 1.9,
    delay: 0.15,
  },
  {
    className:
      "left-[17%] top-[31%] h-[7px] w-[7px] rounded-full bg-[radial-gradient(circle,_rgba(255,240,170,0.95),rgba(250,204,21,0.38)_55%,transparent_75%)]",
    duration: 2.5,
    delay: 0.3,
  },
  {
    className:
      "left-[52%] top-[38%] h-[2px] w-[12%] rotate-[7deg] bg-gradient-to-r from-transparent via-amber-100 to-transparent",
    duration: 1.7,
    delay: 0.55,
  },
  {
    className:
      "left-[66%] top-[35%] h-[2px] w-[12%] rotate-[-12deg] bg-gradient-to-r from-transparent via-cyan-100 to-transparent",
    duration: 2.1,
    delay: 0.2,
  },
  {
    className:
      "left-[70%] top-[43%] h-[6px] w-[6px] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.95),rgba(34,211,238,0.42)_50%,transparent_72%)]",
    duration: 2.2,
    delay: 0.85,
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

export default function LogoHolografica({
  size = 200,
  className = "",
  alt = "World Tech Manager",
  subtitle,
  priority = false,
  showWordmark = false,
  wordmarkSize = "md",
  animate = true,
}: LogoHolograficaProps) {
  const wordmark = wordmarkClasses[wordmarkSize];

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
            ? {
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
      >
        <motion.div
          className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.34),rgba(34,211,238,0.16)_28%,transparent_72%)] blur-3xl"
          animate={
            animate
              ? {
                  opacity: [0.55, 0.9, 0.55],
                  scale: [0.96, 1.03, 0.96],
                }
              : undefined
          }
          transition={
            animate
              ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        />
        <motion.div
          className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,_rgba(250,204,21,0.38),rgba(250,204,21,0.14)_34%,transparent_72%)] blur-2xl"
          animate={
            animate
              ? {
                  opacity: [0.35, 0.72, 0.35],
                  scale: [0.97, 1.02, 0.97],
                }
              : undefined
          }
          transition={
            animate
              ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        />
        <motion.div
          className="absolute inset-[9%] rounded-full opacity-55 blur-md"
          style={{
            background:
              "conic-gradient(from 180deg, transparent 0deg, rgba(255,255,255,0.18) 58deg, transparent 115deg, rgba(34,211,238,0.22) 212deg, transparent 302deg)",
          }}
          animate={animate ? { rotate: [0, 360] } : undefined}
          transition={
            animate
              ? { duration: 18, repeat: Infinity, ease: "linear" }
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
                    opacity: [0.18, 1, 0.18],
                    scale: [0.82, 1.18, 0.9],
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
          className="relative h-full w-full"
          animate={animate ? { rotate: [0, 1.5, 0, -1.5, 0] } : undefined}
          transition={
            animate
              ? { duration: 9, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        >
          <Image
            src="/wtm-float.png"
            alt={alt}
            fill
            sizes={`${size}px`}
            priority={priority}
            className="object-contain"
            style={{
              filter:
                "drop-shadow(0 0 24px rgba(250,204,21,0.22)) drop-shadow(0 0 56px rgba(34,211,238,0.16)) saturate(1.08) contrast(1.04)",
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
