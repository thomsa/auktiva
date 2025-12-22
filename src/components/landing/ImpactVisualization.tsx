import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface Particle {
  id: number;
  delay: number;
  duration: number;
  xStart: number;
}

interface Sparkle {
  id: number;
  angle: number;
  delay: number;
}

function Counter({
  value,
  duration,
  start,
  onComplete,
}: {
  value: number;
  duration: number;
  start: boolean;
  onComplete?: () => void;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (start) {
      const controls = animate(count, value, {
        duration: duration,
        ease: "easeOut",
        onComplete: onComplete,
      });
      return () => controls.stop();
    }
  }, [value, count, start, duration, onComplete]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      setDisplayValue(
        latest.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        })
      );
    });
    return () => unsubscribe();
  }, [rounded]);

  return <span>{displayValue}</span>;
}

// Generate particles once (stable across renders)
const generateParticles = (): Particle[] =>
  Array.from({ length: 10 }).map((_, i) => ({
    id: i,
    delay: -(i * 0.5), // Staggered delays instead of random for stability
    duration: 3 + (i % 3),
    xStart: (i * 10) % 100,
  }));

const generateSparkles = (): Sparkle[] =>
  Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    angle: (i * 360) / 12,
    delay: (i % 6) * 0.1,
  }));

// Pre-generate to avoid hydration issues
const PARTICLES = generateParticles();
const SPARKLES = generateSparkles();

export function ImpactVisualization() {
  const t = useTranslations("landing.impact");
  const [animationPhase, setAnimationPhase] = useState<
    "idle" | "building" | "active"
  >("idle");
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  // Animation settings
  const BUILD_DURATION = 8;

  useEffect(() => {
    if (isInView && animationPhase === "idle") {
      const timer = setTimeout(() => {
        setAnimationPhase("building");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInView, animationPhase]);

  const particles = PARTICLES;
  const sparkles = SPARKLES;
  const showParticles = animationPhase === "building";
  const showPulse = animationPhase === "active";

  return (
    <section
      className="py-24 bg-base-300 relative overflow-hidden"
      ref={containerRef}
    >
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')]"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t("sectionTitle")}{" "}
            <span className="text-secondary">{t("sectionTitleHighlight")}</span>
          </h2>
          <p className="text-xl opacity-70 max-w-2xl mx-auto">
            {t("sectionDescription")}
          </p>
        </div>

        <div className="relative w-full max-w-4xl mx-auto aspect-video md:aspect-21/9 bg-base-100 rounded-3xl border border-base-content/5 shadow-2xl overflow-hidden flex items-center justify-center">
          {/* Main Visualization SVG */}
          <svg
            viewBox="0 0 800 400"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid slice"
            style={{ willChange: "transform" }}
          >
            <defs>
              <linearGradient
                id="flowGradient"
                x1="0%"
                y1="100%"
                x2="50%"
                y2="50%"
              >
                <stop
                  offset="0%"
                  className="text-primary"
                  stopColor="currentColor"
                  stopOpacity="0"
                />
                <stop
                  offset="50%"
                  className="text-primary"
                  stopColor="currentColor"
                  stopOpacity="0.5"
                />
                <stop
                  offset="100%"
                  className="text-secondary"
                  stopColor="currentColor"
                  stopOpacity="1"
                />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Central "Goal" Container - The Pot */}
            <motion.circle
              cx="400"
              cy="200"
              r="60"
              fill="none"
              className="stroke-base-content"
              strokeOpacity="0.1"
              strokeWidth="2"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={
                animationPhase !== "idle"
                  ? { scale: 1, opacity: 1 }
                  : { scale: 0.8, opacity: 0 }
              }
              transition={{ duration: 1 }}
            />

            {/* Pulsing Core - Only active after build up */}
            <motion.circle
              cx="400"
              cy="200"
              r="40"
              className="fill-secondary"
              fillOpacity="0.2"
              animate={
                showPulse
                  ? {
                      r: [40, 45, 40],
                      opacity: [0.2, 0.4, 0.2],
                    }
                  : { r: 40, opacity: 0.2 }
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Inner Core */}
            <motion.circle
              cx="400"
              cy="200"
              r="30"
              fill="url(#flowGradient)"
              filter="url(#glow)"
              animate={
                showPulse
                  ? {
                      scale: [1, 1.1, 1],
                    }
                  : { scale: 1 }
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Incoming Flow Particles - Only show when active - reduced count for performance */}
            {particles.slice(0, 8).map((p) => (
              <motion.circle
                key={`p-${p.id}`}
                r="3"
                className="fill-primary"
                style={{ willChange: "transform, opacity" }}
                initial={{
                  cx: p.xStart > 50 ? 850 : -50,
                  cy: 450,
                  opacity: 0,
                }}
                animate={
                  showParticles
                    ? {
                        cx: 400,
                        cy: 200,
                        opacity: [0, 1, 0],
                        scale: [1, 1.5, 0.5],
                      }
                    : { opacity: 0 }
                }
                transition={{
                  duration: showParticles ? p.duration : 0.5,
                  repeat: showParticles ? Infinity : 0,
                  delay: showParticles ? p.delay : 0,
                  ease: "easeIn",
                }}
              />
            ))}

            {/* Trails for particles - reduced for performance */}
            {particles.slice(0, 8).map((p) => (
              <motion.path
                key={`t-${p.id}`}
                d={`M ${p.xStart > 50 ? 800 : 0} 400 Q ${
                  p.xStart > 50 ? 600 : 200
                } 300 400 200`}
                className="stroke-primary"
                strokeWidth="1"
                fill="none"
                style={{ willChange: "stroke-dashoffset, opacity" }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={
                  showParticles
                    ? {
                        pathLength: [0, 1],
                        opacity: [0, 0.3, 0],
                      }
                    : { opacity: 0 }
                }
                transition={{
                  duration: showParticles ? p.duration : 0.5,
                  repeat: showParticles ? Infinity : 0,
                  delay: showParticles ? p.delay : 0,
                  ease: "easeIn",
                }}
              />
            ))}

            {/* Sparkles / Explosion effects - Show when active - reduced for performance */}
            {sparkles.slice(0, 6).map((s) => {
              const rad = (s.angle * Math.PI) / 180;
              const xEnd = 400 + Math.cos(rad) * 120;
              const yEnd = 200 + Math.sin(rad) * 120;

              return (
                <motion.g key={`s-${s.id}`}>
                  <motion.circle
                    cx="400"
                    cy="200"
                    r="2"
                    className="fill-accent"
                    style={{ willChange: "transform, opacity" }}
                    initial={{ opacity: 0 }}
                    animate={
                      showParticles
                        ? {
                            cx: [400, xEnd],
                            cy: [200, yEnd],
                            opacity: [0, 1, 0],
                            scale: [0, 1.5, 0],
                          }
                        : { opacity: 0 }
                    }
                    transition={{
                      duration: showParticles ? 2 : 0.5,
                      repeat: showParticles ? Infinity : 0,
                      delay: showParticles ? s.delay : 0,
                      ease: "easeOut",
                      repeatDelay: 1, // Sync somewhat with core pulse
                    }}
                  />
                </motion.g>
              );
            })}

            {/* Text Overlay in SVG */}
            <text
              x="400"
              y="320"
              textAnchor="middle"
              className="text-sm font-bold uppercase tracking-widest opacity-50 fill-base-content"
              style={{ fontSize: "12px" }}
            >
              {t("exampleAuctionName")}
            </text>

            {/* Track for the gauge - top arc */}
            <path
              d="M 320 200 A 80 80 0 1 1 480 200"
              className="stroke-base-content"
              strokeOpacity="0.1"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Progress Arc - Top Half Gauge */}
            <motion.path
              d="M 320 200 A 80 80 0 1 1 480 200"
              className="stroke-accent"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: animationPhase === "idle" ? 0 : 1 }}
              transition={{
                duration: BUILD_DURATION,
                ease: "easeOut",
              }}
            />
          </svg>

          {/* Floating UI Elements on top of SVG */}
          <div className="absolute top-8 left-8 bg-base-100/80 backdrop-blur px-4 py-2 rounded-lg border border-base-content/5 shadow-lg">
            <div className="text-xs text-base-content/60">
              {t("totalValue")}
            </div>
            <div className="text-lg font-bold font-mono text-primary">
              <Counter
                value={124500}
                duration={BUILD_DURATION}
                start={animationPhase === "building"}
                onComplete={() => setAnimationPhase("active")}
              />
            </div>
          </div>

          <div className="absolute bottom-8 right-8 bg-base-100/80 backdrop-blur px-4 py-2 rounded-lg border border-base-content/5 shadow-lg">
            <div className="text-xs text-base-content/60">
              {t("itemsCollected")}
            </div>
            <div className="flex -space-x-2 mt-1">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-base-100"></div>
              <div className="w-6 h-6 rounded-full bg-secondary/20 border border-base-100"></div>
              <div className="w-6 h-6 rounded-full bg-accent/20 border border-base-100"></div>
              <div className="w-6 h-6 rounded-full bg-base-200 border border-base-100 flex items-center justify-center text-[10px] font-bold">
                {t("moreItems", { count: 42 })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
