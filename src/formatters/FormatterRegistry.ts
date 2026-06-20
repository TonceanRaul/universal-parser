import type { JsonFormatter } from './JsonFormatter';

type AnyFormatter = JsonFormatter;

export class FormatterRegistry {
  private readonly formatters = new Map<string, AnyFormatter>();

  register(formatter: AnyFormatter): this {
    this.formatters.set(formatter.name, formatter);
    return this;
  }

  get(formatName: string): AnyFormatter | undefined {
    return this.formatters.get(formatName);
  }

  formats(): string[] {
    return [...this.formatters.keys()];
  }
}
