import type { FormatOptions } from '../types/index';

export abstract class BaseFormatter<T = unknown> {
  abstract readonly name: string;
  abstract format(data: T, options: Partial<FormatOptions>): string;
}
