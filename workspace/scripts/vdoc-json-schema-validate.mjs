#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(value, expected) {
  switch (expected) {
    case "null":
      return value === null;
    case "array":
      return Array.isArray(value);
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "string":
    case "boolean":
      return typeof value === expected;
    default:
      throw new Error(`unsupported JSON Schema type: ${expected}`);
  }
}

function decodePointerToken(token) {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

function resolveLocalRef(rootSchema, reference) {
  if (!reference.startsWith("#/")) {
    throw new Error(`only local JSON Schema references are supported: ${reference}`);
  }
  let current = rootSchema;
  for (const token of reference.slice(2).split("/").map(decodePointerToken)) {
    if (current === null || typeof current !== "object" || !(token in current)) {
      throw new Error(`unresolvable JSON Schema reference: ${reference}`);
    }
    current = current[token];
  }
  return current;
}

function isStrictUtcTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const parsed = new Date(value);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second &&
    parsed.getUTCMilliseconds() === 0
  );
}

function validateNode(schema, value, rootSchema, instancePath, errors) {
  if (schema === true) return;
  if (schema === false) {
    errors.push(`${instancePath}: value is forbidden by the schema`);
    return;
  }
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error(`invalid JSON Schema node at ${instancePath}`);
  }

  if (schema.$ref !== undefined) {
    if (typeof schema.$ref !== "string") {
      throw new Error(`invalid $ref at ${instancePath}`);
    }
    validateNode(resolveLocalRef(rootSchema, schema.$ref), value, rootSchema, instancePath, errors);
    return;
  }

  if (schema.oneOf !== undefined) {
    if (!Array.isArray(schema.oneOf) || schema.oneOf.length === 0) {
      throw new Error(`invalid oneOf at ${instancePath}`);
    }
    const branchErrors = schema.oneOf.map((branch) => {
      const current = [];
      validateNode(branch, value, rootSchema, instancePath, current);
      return current;
    });
    const matches = branchErrors.filter((current) => current.length === 0).length;
    if (matches !== 1) {
      const detail =
        matches === 0
          ? `; ${branchErrors
              .flat()
              .slice(0, 4)
              .join("; ")}`
          : "";
      errors.push(
        `${instancePath}: must match exactly one oneOf branch (matched ${matches})${detail}`,
      );
    }
    return;
  }

  if (schema.const !== undefined && !sameJson(value, schema.const)) {
    errors.push(`${instancePath}: must equal ${canonicalJson(schema.const)}`);
  }
  if (schema.enum !== undefined) {
    if (!Array.isArray(schema.enum)) throw new Error(`invalid enum at ${instancePath}`);
    if (!schema.enum.some((candidate) => sameJson(value, candidate))) {
      errors.push(`${instancePath}: is not one of ${canonicalJson(schema.enum)}`);
    }
  }

  if (schema.type !== undefined) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expectedTypes.every((entry) => typeof entry === "string")) {
      throw new Error(`invalid type at ${instancePath}`);
    }
    if (!expectedTypes.some((entry) => matchesType(value, entry))) {
      errors.push(
        `${instancePath}: expected ${expectedTypes.join(" or ")}, got ${valueType(value)}`,
      );
      return;
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${instancePath}: string is shorter than ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${instancePath}: string is longer than ${schema.maxLength}`);
    }
    if (schema.pattern !== undefined) {
      let expression;
      try {
        expression = new RegExp(schema.pattern, "u");
      } catch (error) {
        throw new Error(`invalid pattern at ${instancePath}: ${error.message}`);
      }
      if (!expression.test(value)) {
        errors.push(`${instancePath}: does not match pattern ${schema.pattern}`);
      }
    }
    if (schema.format === "date-time" && !isStrictUtcTimestamp(value)) {
      errors.push(`${instancePath}: is not a real UTC timestamp with whole-second precision`);
    } else if (schema.format !== undefined && schema.format !== "date-time") {
      throw new Error(`unsupported JSON Schema format: ${schema.format}`);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${instancePath}: number is less than ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${instancePath}: number is greater than ${schema.maximum}`);
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push(`${instancePath}: number must be greater than ${schema.exclusiveMinimum}`);
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push(`${instancePath}: number must be less than ${schema.exclusiveMaximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${instancePath}: array has fewer than ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${instancePath}: array has more than ${schema.maxItems} items`);
    }
    if (schema.uniqueItems === true) {
      const values = value.map(canonicalJson);
      if (new Set(values).size !== values.length) {
        errors.push(`${instancePath}: array items must be unique`);
      }
    }
    if (schema.items !== undefined) {
      value.forEach((item, index) =>
        validateNode(schema.items, item, rootSchema, `${instancePath}/${index}`, errors),
      );
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties ?? {};
    if (properties === null || typeof properties !== "object" || Array.isArray(properties)) {
      throw new Error(`invalid properties at ${instancePath}`);
    }
    if (schema.required !== undefined) {
      if (!Array.isArray(schema.required)) throw new Error(`invalid required at ${instancePath}`);
      for (const key of schema.required) {
        if (!Object.hasOwn(value, key)) errors.push(`${instancePath}: missing required property ${key}`);
      }
    }
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${instancePath}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
      if (Object.hasOwn(properties, key)) {
        validateNode(properties[key], child, rootSchema, childPath, errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${childPath}: additional property is not allowed`);
      } else if (
        schema.additionalProperties !== undefined &&
        typeof schema.additionalProperties === "object"
      ) {
        validateNode(schema.additionalProperties, child, rootSchema, childPath, errors);
      }
    }
    const propertyCount = Object.keys(value).length;
    if (schema.minProperties !== undefined && propertyCount < schema.minProperties) {
      errors.push(`${instancePath}: object has fewer than ${schema.minProperties} properties`);
    }
    if (schema.maxProperties !== undefined && propertyCount > schema.maxProperties) {
      errors.push(`${instancePath}: object has more than ${schema.maxProperties} properties`);
    }
  }
}

export function validateJsonSchema(schema, value) {
  const errors = [];
  validateNode(schema, value, schema, "$", errors);
  return errors;
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON (${file}): ${error.message}`);
  }
}

function main() {
  if (process.argv.length !== 4) {
    console.error("Usage: scripts/vdoc-json-schema-validate.mjs SCHEMA.json DOCUMENT.json");
    process.exit(2);
  }
  const schemaFile = path.resolve(process.argv[2]);
  const documentFile = path.resolve(process.argv[3]);
  const schema = readJson(schemaFile, "schema");
  const document = readJson(documentFile, "document");
  const errors = validateJsonSchema(schema, document);
  if (errors.length > 0) {
    console.error("FAIL: JSON schema validation failed:");
    for (const error of errors.slice(0, 100)) console.error(`  - ${error}`);
    if (errors.length > 100) console.error(`  - ... ${errors.length - 100} additional errors`);
    process.exit(1);
  }
  console.log(`JSON schema validation passed: ${documentFile}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exit(1);
  }
}
