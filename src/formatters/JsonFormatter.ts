import type { JsonValue, JsonObject, JsonArray, FormatOptions } from '../types/index';
import { DEFAULT_FORMAT_OPTIONS } from '../types/index';

// chalk@4 is CommonJS — use require so ts-jest is happy under commonjs module mode
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chalk = require('chalk') as typeof import('chalk');

export class JsonFormatter {
  readonly name = 'json';

  format(data: JsonValue, opts: Partial<FormatOptions> = {}): string {
    const options: FormatOptions = { ...DEFAULT_FORMAT_OPTIONS, ...opts };
    if (options.treeView) return this.renderTree(data, options);
    if (options.compact)  return JSON.stringify(data);
    return this.renderPretty(data, options, 0);
  }

  // ─── Pretty JSON ────────────────────────────────────────────────────────────

  private renderPretty(val: JsonValue, opts: FormatOptions, depth: number): string {
    if (opts.maxDepth !== undefined && depth >= opts.maxDepth) {
      return opts.colorize ? chalk.gray('…') : '…';
    }

    if (val === null)             return opts.colorize ? chalk.bold.red('null')                  : 'null';
    if (typeof val === 'boolean') return opts.colorize ? chalk.yellow(String(val))               : String(val);
    if (typeof val === 'number')  return opts.colorize ? chalk.cyan(String(val))                 : String(val);
    if (typeof val === 'string')  return opts.colorize ? chalk.green(`"${this.escapeStr(val)}"`) : `"${this.escapeStr(val)}"`;

    if (Array.isArray(val)) return this.renderArray(val, opts, depth);
    return this.renderObject(val, opts, depth);
  }

  private renderObject(obj: JsonObject, opts: FormatOptions, depth: number): string {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    const pad = ' '.repeat((depth + 1) * opts.indent);
    const closePad = ' '.repeat(depth * opts.indent);
    const colon = opts.colorize ? chalk.white(': ') : ': ';

    const entries = keys.map(k => {
      const key = opts.colorize ? chalk.bold.blue(`"${k}"`) : `"${k}"`;
      const val = this.renderPretty(obj[k], opts, depth + 1);
      const typeHint = opts.showTypes
        ? (opts.colorize ? chalk.gray(` /*${this.typeOf(obj[k])}*/`) : ` /*${this.typeOf(obj[k])}*/`)
        : '';
      return `${pad}${key}${colon}${val}${typeHint}`;
    });

    return `{\n${entries.join(',\n')}\n${closePad}}`;
  }

  private renderArray(arr: JsonArray, opts: FormatOptions, depth: number): string {
    if (arr.length === 0) return '[]';

    const allPrimitive = arr.every(v => v === null || typeof v !== 'object');
    if (allPrimitive && arr.length <= 8) {
      const inline = arr.map(v => this.renderPretty(v, opts, depth + 1)).join(', ');
      if (inline.length < 80) return `[${inline}]`;
    }

    const pad = ' '.repeat((depth + 1) * opts.indent);
    const closePad = ' '.repeat(depth * opts.indent);
    const items = arr.map(v => `${pad}${this.renderPretty(v, opts, depth + 1)}`);
    return `[\n${items.join(',\n')}\n${closePad}]`;
  }

  // ─── Tree View ──────────────────────────────────────────────────────────────

  renderTree(val: JsonValue, opts: Partial<FormatOptions>, path = '$', depth = 0): string {
    const options: FormatOptions = { ...DEFAULT_FORMAT_OPTIONS, ...opts };
    const lines: string[] = [];
    this.buildTree(val, options, path, depth, '', true, lines);
    return lines.join('\n');
  }

  private buildTree(
    val: JsonValue,
    opts: FormatOptions,
    label: string,
    depth: number,
    prefix: string,
    isLast: boolean,
    out: string[],
  ): void {
    if (opts.maxDepth !== undefined && depth > opts.maxDepth) {
      const connector = isLast ? '└── ' : '├── ';
      out.push(`${prefix}${connector}${opts.colorize ? chalk.gray(label + ' …') : label + ' …'}`);
      return;
    }

    const connector = depth === 0 ? '' : (isLast ? '└── ' : '├── ');
    const childPrefix = depth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');

    if (val === null || typeof val !== 'object') {
      const primitive = this.colorPrimitive(val, opts);
      const typeHint = opts.showTypes
        ? (opts.colorize ? chalk.gray(` [${this.typeOf(val)}]`) : ` [${this.typeOf(val)}]`)
        : '';
      out.push(`${prefix}${connector}${opts.colorize ? chalk.bold(label) : label}: ${primitive}${typeHint}`);
      return;
    }

    if (Array.isArray(val)) {
      const arrLabel = opts.colorize ? chalk.magenta(label) : label;
      const meta = opts.colorize ? chalk.gray(` [${val.length}]`) : ` [${val.length}]`;
      out.push(`${prefix}${connector}${arrLabel}${meta}`);
      val.forEach((item, i) => {
        this.buildTree(item, opts, `[${i}]`, depth + 1, childPrefix, i === val.length - 1, out);
      });
    } else {
      const objKeys = Object.keys(val);
      const objLabel = opts.colorize ? chalk.blue(label) : label;
      const meta = opts.colorize ? chalk.gray(` {${objKeys.length}}`) : ` {${objKeys.length}}`;
      out.push(`${prefix}${connector}${objLabel}${meta}`);
      objKeys.forEach((k, i) => {
        this.buildTree(val[k], opts, k, depth + 1, childPrefix, i === objKeys.length - 1, out);
      });
    }
  }

  private colorPrimitive(val: JsonValue, opts: FormatOptions): string {
    if (!opts.colorize) return val === null ? 'null' : String(val);
    if (val === null)             return chalk.bold.red('null');
    if (typeof val === 'boolean') return chalk.yellow(String(val));
    if (typeof val === 'number')  return chalk.cyan(String(val));
    if (typeof val === 'string')  return chalk.green(`"${this.escapeStr(val)}"`);
    return String(val);
  }

  private typeOf(val: JsonValue): string {
    if (val === null)            return 'null';
    if (Array.isArray(val))      return `array[${val.length}]`;
    if (typeof val === 'object') return `object{${Object.keys(val).length}}`;
    return typeof val;
  }

  private escapeStr(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}
