
export function handleError(message, error) {
  console.error(`Original error message: ${error.message}`);
  console.error(`Stack trace: ${error.stack}`);

  const newErrorMessage = `${message}: ${error.message}`;
  throw new Error(newErrorMessage);
}
