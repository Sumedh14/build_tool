export class PluginManager {
  constructor(plugins = []) {
    this.plugins = plugins || [];
  }

  normalize() {
    this.plugins = this.plugins.map((p, i) => (typeof p === 'function' ? { name: p.name || `plugin#${i}`, apply: p } : p));
  }

  async runHook(hookName, ...args) {
    for (const p of this.plugins) {
      const fn = p[hookName] || p.apply?.[hookName] || p.apply; 
      if (typeof fn === 'function') {
        try {
          await fn(...args);
        } catch (e) {
          throw e;
        }
      }
    }
  }

  async transform(file) {
    let current = file;
    for (const p of this.plugins) {
      if (typeof p.transform === 'function') {
        const res = await p.transform(current);
        if (res) current = res;
      }
    }
    return current;
  }

  add(plugin) {
    this.plugins.push(plugin);
  }
}