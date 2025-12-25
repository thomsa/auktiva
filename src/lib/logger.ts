import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isVercel = !!process.env.VERCEL;

/**
 * Pino logger configured for Next.js and Vercel
 *
 * In production/Vercel: JSON logs (Vercel parses these)
 * In development: Pretty printed logs with colors
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  ...(isProduction || isVercel
    ? {
        // Production: Clean JSON format for Vercel
        formatters: {
          level: (label) => ({ level: label }),
          bindings: () => ({}), // Remove pid and hostname
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Development: Pretty print
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
});

/**
 * Create a child logger with a specific context/module name
 */
export function createLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}

// Pre-configured loggers for common modules
export const storageLogger = createLogger("storage");
export const prismaLogger = createLogger("prisma");
export const uploadLogger = createLogger("upload");
export const apiLogger = createLogger("api");

export default logger;
