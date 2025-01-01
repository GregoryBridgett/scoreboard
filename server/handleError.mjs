import { logger } from './server.mjs';

export function handleError(error, context) {
  logger.error({ 
    module: context.module, 
    function: context.function, 
    message: error.message, 
    stack: error.stack 
  });

  if (context.context === 'apiRequest') {
    // Assuming you have a way to send a response in this context (e.g., 'res' object in Express)
    // res.status(500).json({ error: 'Internal Server Error' }); 
  } else {
    logger.warn({ module: context.module, function: context.function, message: 'Error handled, but not an API request', error: error.message });
  }
}
