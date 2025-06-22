interface LogData {
  [key: string]: any;
}

class Logger {
  info(message: string, data?: LogData): void {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  error(message: string, data?: LogData): void {
    console.error(`[ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  warn(message: string, data?: LogData): void {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  debug(message: string, data?: LogData): void {
    console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

export const logger = new Logger(); 