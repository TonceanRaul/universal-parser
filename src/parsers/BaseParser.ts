import type { ParseResult, FormatOptions } from '../types/index';

export abstract class BaseParser<T = unknown> {
  abstract readonly format: string;
  abstract readonly extensions: string[];
  abstract readonly mimeTypes: string[];

  abstract parse(input: string): ParseResult<T>;

  canHandle(extensionOrMime: string): boolean {
    const lower = extensionOrMime.toLowerCase();
    return this.extensions.includes(lower) || this.mimeTypes.includes(lower);
  }

  abstract format_output(data: T, options: Partial<FormatOptions>): string;
}
