import Ajv from "ajv";

export const ajv = new Ajv({ allErrors: true, strict: true, ownProperties: true });
export function schemaErrors(schema, value) {
  const validate = ajv.compile(schema);
  return validate(value) ? [] : validate.errors.map((error) => ({
    path: error.instancePath || "/", message: error.message, params: error.params,
  }));
}

// A proposal based on one observation. Review it before using it as policy.
export function inferSchema(value) {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    const shapes = [...new Map(value.map((item) => {
      const shape = inferSchema(item); return [JSON.stringify(shape), shape];
    })).values()];
    return { type: "array", ...(shapes.length ? { items: shapes.length === 1 ? shapes[0] : { anyOf: shapes } } : {}) };
  }
  if (typeof value === "object") {
    return { type: "object", properties: Object.fromEntries(Object.keys(value).sort().map((key) => [key, inferSchema(value[key])])), required: Object.keys(value).sort(), additionalProperties: false };
  }
  return { type: typeof value === "number" ? "number" : typeof value };
}
