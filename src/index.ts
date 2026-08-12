export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export type LogSink = (entry: LogEntry) => void | Promise<void>;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

export interface StructuredLoggerOptions {
  /**
   * Minimum log level to output. Default: 'info'
   */
  level?: LogLevel;
  /**
   * Keys to redact in all entries. Values replaced with '[REDACTED]'.
   * Deep redaction applied to nested objects. Default: []
   */
  redactKeys?: string[];
  /**
   * Custom sink function. Called for each log entry.
   * Default: writes to stdout as line-delimited JSON.
   */
  sink?: LogSink;
}

function redact(value: any, keys: string[]): any {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(v => redact(v, keys));
  }

  const redactSet = new Set(keys.map(k => k.toLowerCase()));
  const result: Record<string, any> = {};

  for (const [k, v] of Object.entries(value)) {
    if (redactSet.has(k.toLowerCase())) {
      result[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      result[k] = redact(v, keys);
    } else {
      result[k] = v;
    }
  }

  return result;
}

function formatError(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  return { error: String(error) };
}

export class StructuredLogger {
  private level: LogLevel;
  private redactKeys: string[];
  private sink: LogSink;
  private boundContext: Record<string, any> = {};

  constructor(options: StructuredLoggerOptions = {}) {
    this.level = options.level || 'info';
    this.redactKeys = options.redactKeys || [];
    this.sink =
      options.sink ||
      ((entry: LogEntry) => {
        console.log(JSON.stringify(entry));
      });
  }

  /**
   * Create a child logger with bound context fields.
   * All logs from the child will include these fields.
   */
  child(context: Record<string, any>): StructuredLogger {
    const child = new StructuredLogger({
      level: this.level,
      redactKeys: this.redactKeys,
      sink: this.sink,
    });
    child.boundContext = { ...this.boundContext, ...context };
    return child;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.level];
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    const merged = { ...this.boundContext, ...context };
    const redacted = this.redactKeys.length > 0 ? redact(merged, this.redactKeys) : merged;

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(Object.keys(redacted).length > 0 && { context: redacted }),
    };
  }

  private emit(entry: LogEntry): void {
    // Synchronous sink
    const result = this.sink(entry);
    // Ignore promises; async sinks should handle their own errors
    if (result instanceof Promise) {
      result.catch(() => {
        // Silently ignore sink errors to avoid logger crashes
      });
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      this.emit(this.createEntry('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      this.emit(this.createEntry('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      this.emit(this.createEntry('warn', message, context));
    }
  }

  error(message: string, error?: unknown, context?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      const errorFields = error ? formatError(error) : {};
      const merged = { ...context, ...errorFields };
      this.emit(this.createEntry('error', message, merged));
    }
  }
}
