export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue; }
export type JsonArray = JsonValue[];

export interface ParseError {
  message: string;
  line: number;
  column: number;
  position: number;
  snippet?: string;
}

export interface ParseMetadata {
  format: string;
  parseTimeMs: number;
  inputSizeBytes: number;
  depth: number;
  nodeCount: number;
  keyCount: number;
}

export interface ParseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ParseError;
  metadata: ParseMetadata;
}

export interface FormatOptions {
  indent: number;
  colorize: boolean;
  showTypes: boolean;
  showStats: boolean;
  treeView: boolean;
  maxDepth?: number;
  compact: boolean;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indent: 2,
  colorize: true,
  showTypes: false,
  showStats: true,
  treeView: false,
  compact: false,
};

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  message: string;
  path: string;
  line?: number;
  column?: number;
}
