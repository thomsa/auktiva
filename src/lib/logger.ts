import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isVercel = !!process.env.VERCEL;

/**
 * Pino logger configured for Next.js and Vercel
 *
 * In production/Vercel: JSON logs for structured logging
 * In development: Pretty printed logs
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  ...(isProduction || isVercel
    ? {
        // Production: JSON format for Vercel/structured logging
        formatters: {
          level: (label) => ({ level: label }),
        },
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
export function createLogger(module: string) {
  return logger.child({ module });
}

// Pre-configured loggers for common modules
export const storageLogger = createLogger("storage");
export const prismaLogger = createLogger("prisma");
export const uploadLogger = createLogger("upload");
export const apiLogger = createLogger("api");

export default logger;
