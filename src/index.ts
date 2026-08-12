export class StructuredLogger {
  info(action: string, metadata?: Record<string, any>): void {
    console.log(JSON.stringify({ timestamp: new Date(), level: 'INFO', action, ...metadata }));
  }
  
  error(action: string, error: Error, metadata?: Record<string, any>): void {
    console.error(JSON.stringify({ 
      timestamp: new Date(), level: 'ERROR', action, 
      error: error.message, ...metadata 
    }));
  }
}
