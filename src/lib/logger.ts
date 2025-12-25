import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isVercel = !!process.env.VERCEL;

/**
 * Format context object as a readable string for log messages
 */
function formatMeta(meta: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(meta)) {
    if (key === "module" || key === "level" || key === "time") continue;
    if (key === "err" && value && typeof value === "object") {
      const err = value as { message?: string };
      parts.push(`error="${err.message || "Unknown"}"`);
    } else if (value !== undefined && value !== null) {
      const strValue =
        typeof value === "string" ? value : JSON.stringify(value);
      parts.push(`${key}=${strValue}`);
    }
  }
  return parts.length > 0 ? ` | ${parts.join(" ")}` : "";
}

/**
 * Pino logger configured for Next.js and Vercel
 *
 * In production/Vercel: Human-readable single-line logs
 * In development: Pretty printed logs with colors
 */
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    formatters: {
      level: (label) => ({ level: label }),
      bindings: () => ({}),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isProduction || isVercel
    ? // Production: Human-readable format
      {
        write(msg: string) {
          try {
            const obj = JSON.parse(msg);
            const level = (obj.level || "INFO").toUpperCase().padEnd(5);
            const moduleName = obj.module ? `[${obj.module}]` : "";
            const message = obj.msg || "";
            const meta = formatMeta(obj);
            const time = obj.time
              ? new Date(obj.time).toISOString().slice(11, 23)
              : "";
            console.log(`${time} ${level} ${moduleName} ${message}${meta}`);
          } catch {
            console.log(msg);
          }
        },
      }
    : // Development: Use pino-pretty via stdout
      undefined
);

// In development, reconfigure with pretty printing
let devLogger = logger;
if (!isProduction && !isVercel) {
  devLogger = pino({
    level: process.env.LOG_LEVEL || "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  });
}

const baseLogger = isProduction || isVercel ? logger : devLogger;

/**
 * Create a child logger with a specific context/module name
 */
export function createLogger(module: string) {
  return baseLogger.child({ module });
}

// Pre-configured loggers for common modules
export const storageLogger = createLogger("storage");
export const prismaLogger = createLogger("prisma");
export const uploadLogger = createLogger("upload");
export const apiLogger = createLogger("api");

export default logger;
