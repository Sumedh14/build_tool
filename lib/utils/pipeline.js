// Simple pipeline that runs transform hooks from pluginManager over a set of virtual files
export async function runPipeline(files, pluginManager, { logger } = {}) {
  const results = [];
  for (const file of files) {
    try {
      const transformed = await pluginManager.transform(file);
      results.push(transformed);
    } catch (err) {
      logger?.error('Pipeline transform error', err);
      throw err;
    }
  }
  return results;
}