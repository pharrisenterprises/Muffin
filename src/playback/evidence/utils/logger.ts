export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3, none: 99
};

class Logger {
  private level: LogLevel = 'warn';
  private prefix: string;
  private static instances: Map<string, Logger> = new Map();
  
  constructor(prefix: string) {
    this.prefix = prefix;
  }
  
  static for(moduleName: string): Logger {
    if (!Logger.instances.has(moduleName)) {
      Logger.instances.set(moduleName, new Logger(`[${moduleName}]`));
    }
    return Logger.instances.get(moduleName)!;
  }
  
  static setGlobalLevel(level: LogLevel): void {
    Logger.instances.forEach(logger => { logger.level = level; });
  }
  
  setLevel(level: LogLevel): void { this.level = level; }
  
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }
  
  debug(...args: any[]): void {
    if (this.shouldLog('debug')) console.debug(this.prefix, ...args);
  }
  
  info(...args: any[]): void {
    if (this.shouldLog('info')) console.info(this.prefix, ...args);
  }
  
  warn(...args: any[]): void {
    if (this.shouldLog('warn')) console.warn(this.prefix, ...args);
  }
  
  error(...args: any[]): void {
    if (this.shouldLog('error')) console.error(this.prefix, ...args);
  }
}

export const createLogger = (moduleName: string): Logger => Logger.for(moduleName);
export const setGlobalLogLevel = Logger.setGlobalLevel;
export const enableDebugLogging = () => Logger.setGlobalLevel('debug');
export const disableLogging = () => Logger.setGlobalLevel('none');
