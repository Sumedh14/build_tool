export class Logger {
  constructor(scope = 'rbuild') {
    this.scope = scope;
  }
  _prefix(level) {
    return `[${this.scope}] ${level}:`;
  }
  debug(...args) { console.debug(this._prefix('debug'), ...args); }
  info(...args) { console.info(this._prefix('info'), ...args); }
  warn(...args) { console.warn(this._prefix('warn'), ...args); }
  error(...args) { console.error(this._prefix('error'), ...args); }
}