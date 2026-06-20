import type { BaseParser } from './BaseParser';
import type { ParseResult } from '../types/index';

export class ParserRegistry {
  private readonly parsers = new Map<string, BaseParser>();

  register(parser: BaseParser): this {
    if (this.parsers.has(parser.format)) {
      throw new Error(`Parser for format '${parser.format}' is already registered`);
    }
    this.parsers.set(parser.format, parser);
    return this;
  }

  unregister(format: string): boolean {
    return this.parsers.delete(format);
  }

  find(extensionOrMime: string): BaseParser | undefined {
    for (const parser of this.parsers.values()) {
      if (parser.canHandle(extensionOrMime)) return parser;
    }
    return undefined;
  }

  get(format: string): BaseParser | undefined {
    return this.parsers.get(format);
  }

  parse(input: string, extensionOrMime: string): ParseResult {
    const parser = this.find(extensionOrMime);
    if (!parser) {
      throw new Error(`No parser registered for '${extensionOrMime}'. Registered: ${this.formats().join(', ')}`);
    }
    return parser.parse(input);
  }

  formats(): string[] {
    return [...this.parsers.keys()];
  }

  has(format: string): boolean {
    return this.parsers.has(format);
  }
}
