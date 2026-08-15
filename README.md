# structured-logger
![CI](https://github.com/FerrowAI/structured-logger/actions/workflows/ci.yml/badge.svg)

Leveled JSON logger with child loggers, key redaction (deep), and pluggable async sink. Outputs ISO timestamps, filters by level, and propagates context through child loggers.

## Installation

```bash
npm install @ferrow/structured-logger
```

## Quick Start

```javascript
import { StructuredLogger } from 'structured-logger';

const logger = new StructuredLogger({
  level: 'info',
  redactKeys: ['password', 'token'],
});

logger.info('user_login', { userId: 123, email: 'user@example.com' });

// Create a child logger with bound context
const requestLogger = logger.child({ requestId: 'req-456' });
requestLogger.info('request_start', { method: 'GET', path: '/api/users' });
```

## API

### `new StructuredLogger(options?): StructuredLogger`

Create a logger.

**Options:**
- `level` (LogLevel, default: 'info'): Minimum level to output (debug, info, warn, error)
- `redactKeys` (string[], default: []): Keys to redact (case-insensitive, deep)
- `sink` (LogSink, default: stdout line-JSON): Custom sink function

### `logger.debug(message, context?): void`

Log at debug level (lowest).

### `logger.info(message, context?): void`

Log at info level.

### `logger.warn(message, context?): void`

Log at warn level.

### `logger.error(message, error?, context?): void`

Log at error level. If an Error object is passed, `message` and `stack` are extracted.

```javascript
try {
  throw new Error('Connection failed');
} catch (err) {
  logger.error('database_error', err, { attempt: 1 });
  // Outputs: { timestamp, level: 'error', message: 'database_error', context: { attempt: 1, message: '...', stack: '...' } }
}
```

### `logger.child(context): StructuredLogger`

Create a child logger with bound context. All logs from the child include the bound fields.

```javascript
const logger = new StructuredLogger();
const child = logger.child({ userId: 123, sessionId: 'abc' });

child.info('action_taken'); // Includes userId and sessionId in context
```

## Log Entry Format

Each entry is JSON-serialized on a single line:

```json
{
  "timestamp": "2026-08-12T01:55:00.123Z",
  "level": "info",
  "message": "request_complete",
  "context": {
    "method": "GET",
    "statusCode": 200,
    "durationMs": 45
  }
}
```

Fields:
- `timestamp` (ISO string): When the log was created
- `level` (string): debug, info, warn, error
- `message` (string): Log message
- `context` (object, optional): Additional fields from both bound and call-time context

## Redaction

Keys are redacted (case-insensitive) to `[REDACTED]` throughout the entire context object, including nested objects and arrays:

```javascript
const logger = new StructuredLogger({
  redactKeys: ['password', 'token', 'secret'],
});

logger.info('user_login', {
  email: 'user@example.com',
  password: 'secret123',
  config: { token: 'abc-xyz' },
  tags: ['admin', 'password'],
});

// Outputs (redacted fields):
// {
//   "email": "user@example.com",
//   "password": "[REDACTED]",
//   "config": { "token": "[REDACTED]" },
//   "tags": ["admin", "password"]  // Note: array values not redacted (keys only)
// }
```

## Level Filtering

Only logs at or above the configured level are emitted:

```javascript
const logger = new StructuredLogger({ level: 'warn' });

logger.debug('debug_message'); // Not emitted
logger.info('info_message'); // Not emitted
logger.warn('warn_message'); // Emitted
logger.error('error_message'); // Emitted
```

## Custom Sink

Replace the default stdout sink with a custom one:

```javascript
const entries = [];
const logger = new StructuredLogger({
  sink: (entry) => {
    entries.push(entry);
  },
});

logger.info('test');
console.log(entries[0]); // { timestamp: '...', level: 'info', message: 'test' }
```

Sinks can be async:

```javascript
const logger = new StructuredLogger({
  sink: async (entry) => {
    await sendToLoggingService(entry);
  },
});
```

Sink errors are silently ignored to prevent logger crashes.

## Examples

### Child logger with context

```javascript
const logger = new StructuredLogger({ level: 'debug' });

// Parent
logger.info('app_start');

// Child with request context
const reqLogger = logger.child({ requestId: 'req-123', userId: 'user-456' });
reqLogger.debug('request_received', { method: 'POST', path: '/api/submit' });
reqLogger.info('validation_passed');

// Grandchild adds more context
const dbLogger = reqLogger.child({ database: 'orders' });
dbLogger.info('query_executed', { rows: 42 });
```

### Redaction with nested objects

```javascript
const logger = new StructuredLogger({
  redactKeys: ['apiKey', 'password'],
});

logger.info('auth_attempt', {
  user: 'alice',
  credentials: {
    password: 'secret',
    apiKey: 'sk-123-abc',
  },
  metadata: {
    ip: '192.168.1.1',
  },
});

// Output:
// {
//   "user": "alice",
//   "credentials": {
//     "password": "[REDACTED]",
//     "apiKey": "[REDACTED]"
//   },
//   "metadata": { "ip": "192.168.1.1" }
// }
```

## Limits

- No structured field types; all values JSON-serialized as-is.
- Circular references in context objects will cause JSON.stringify to fail; ensure context is acyclic.
- Sink errors are silently ignored; implement your own error handling in custom sinks.
- No automatic performance metrics (duration, memory, etc.); pass these as context fields.
- No built-in filtering by context fields; implement in custom sink if needed.

## License: MIT

Sponsored by [Ferrow](https://ferrow.ai)

---
Part of the [ferrow-toolkit](https://github.com/FerrowAI/ferrow-toolkit) collection · Sponsored by [Ferrow](https://ferrow.ai)
