export function log(message: any, timestamp?: Date) {
  message = `${message}`;
  const timestampStr = (timestamp ?? new Date(Date.now())).toISOString();
  if (!message.endsWith('\n')) message += '\n';
  process.stderr.write(`${timestampStr} ${message}`);
}
