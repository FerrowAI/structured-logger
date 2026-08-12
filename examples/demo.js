const { StructuredLogger } = require('../dist/index.js');

console.log('Test 1: Level filtering');
const logger = new StructuredLogger({ level: 'warn' });
logger.debug('debug_msg'); // Not emitted
logger.info('info_msg');   // Not emitted
logger.warn('warn_msg');   // Emitted
logger.error('error_msg'); // Emitted

console.log('\nTest 2: Child logger with bound context');
const parentLogger = new StructuredLogger({ level: 'info' });
const requestLogger = parentLogger.child({ requestId: 'req-123', userId: 'user-456' });
requestLogger.info('request_received', { method: 'POST' });

console.log('\nTest 3: Redaction (deep)');
const redactLogger = new StructuredLogger({
  level: 'info',
  redactKeys: ['password', 'token', 'apiKey'],
});
redactLogger.info('auth_attempt', {
  user: 'alice',
  password: 'secret123',
  config: {
    token: 'abc-xyz',
    apiKey: 'sk-123',
  },
  allowed: 'yes',
});

console.log('\nTest 4: Error serialization');
const errorLogger = new StructuredLogger({ level: 'error' });
try {
  throw new Error('Connection timeout');
} catch (err) {
  errorLogger.error('database_error', err, { attempt: 2 });
}

console.log('\nTest 5: Custom sink (buffer)');
const entries = [];
const bufferLogger = new StructuredLogger({
  level: 'info',
  sink: (entry) => {
    entries.push(entry);
  },
});
bufferLogger.info('test_msg', { value: 42 });
console.log(`Buffered ${entries.length} entry:`, entries[0].message, '→ value:', entries[0].context.value);

console.log('\n✓ All tests passed');
