export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function text(value, name, max = 150) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new InputError(`Invalid ${name}`);
  return value.trim();
}
