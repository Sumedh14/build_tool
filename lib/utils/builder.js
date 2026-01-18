import { PluginManager } from '../plugins/pluginManager.js';
import { eventBus } from './events.js';
import { runPipeline } from './pipeline.js';
import { Logger } from './logger.js';

export function createBuilder(config = {}) {
  const logger = config.logger || new Logger('builder');
  const plugins = Array.isArray(config.plugins) ? config.plugins : [];
  const pluginManager = new PluginManager(plugins);
  pluginManager.normalize();

  const hooks = {
    runHook: (...args) => pluginManager.runHook(...args),
  };

  async function build(files = []) {
    logger.info('builder: build start');
    await hooks.runHook('buildStart', { config });
    const out = await runPipeline(files, pluginManager, { logger });
    await hooks.runHook('buildEnd', out);
    eventBus.emit('bundleReady', out);
    logger.info('builder: build end');
    return out;
  }

  async function watch() {
    logger.info('builder: watch started');
    // Very small stub: user should wire actual FS watcher here
    eventBus.on('fileChanged', async (file) => {
      logger.info('file changed, running incremental build:', file.path);
      await build([file]);
    });
    return () => { eventBus.removeAllListeners('fileChanged'); };
  }

  return {
    config,
    hooks,
    build,
    watch,
    pluginManager,
    on: eventBus.on.bind(eventBus),
  };
}