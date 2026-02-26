import { injectable } from "tsyringe";

@injectable()
export class Logger {
  error(...args: unknown[]): void {
    console.error(...args);
  }

  warn(...args: unknown[]): void {
    console.warn(...args);
  }

  info(...args: unknown[]): void {
    console.info(...args);
  }
}
