export class MockLogger {
  errors: unknown[][] = [];
  warnings: unknown[][] = [];
  infos: unknown[][] = [];

  error(...args: unknown[]): void {
    this.errors.push(args);
  }

  warn(...args: unknown[]): void {
    this.warnings.push(args);
  }

  info(...args: unknown[]): void {
    this.infos.push(args);
  }

  reset(): void {
    this.errors = [];
    this.warnings = [];
    this.infos = [];
  }
}
