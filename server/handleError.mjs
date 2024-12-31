
import logger from './logger.mjs';

export function handleError(message, error) {
  logger.error({ module: 'handleError', function: 'handleError', message: `Original error message: ${error.message}` });
  logger.error({ module: 'handleError', function: 'handleError', message: `Stack trace: ${error.stack}` });

  const errorMessage = `${message}: ${error.message}`;
  logger.error({ module: 'handleError', function: 'handleError', message: errorMessage });
  throw new Error(errorMessage);
}
