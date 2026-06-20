import type { ParseResult, FormatOptions } from '../types/index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chalk = require('chalk') as typeof import('chalk');

export class PrettyPrinter {
  printResult(result: ParseResult, opts: Partial<FormatOptions>, formatted: string): void {
    this.printHeader(result, opts.colorize ?? true);
    process.stdout.write(formatted + '\n');
    if (opts.showStats ?? true) this.printStats(result, opts.colorize ?? true);
  }

  private printHeader(result: ParseResult, colorize: boolean): void {
    const bar = '─'.repeat(60);
    if (colorize) {
      process.stdout.write(chalk.gray(bar) + '\n');
      if (result.success) {
        process.stdout.write(
          chalk.bold.green(' ✔  Parsed successfully') +
          chalk.gray(`  [${result.metadata.format.toUpperCase()}]`) + '\n',
        );
      } else {
        process.stdout.write(chalk.bold.red(' ✖  Parse failed') + '\n');
        if (result.error) {
          process.stdout.write(chalk.red(`    ${result.error.message}`) + '\n');
          process.stdout.write(chalk.gray(`    at line ${result.error.line}, column ${result.error.column}`) + '\n');
          if (result.error.snippet) {
            process.stdout.write(chalk.yellow(`    near: …${result.error.snippet}…`) + '\n');
          }
        }
      }
      process.stdout.write(chalk.gray(bar) + '\n');
    } else {
      process.stdout.write(bar + '\n');
      process.stdout.write(result.success ? ' OK  Parsed successfully\n' : ' ERR Parse failed\n');
      if (!result.success && result.error) {
        process.stdout.write(`     ${result.error.message}\n`);
        process.stdout.write(`     at line ${result.error.line}, column ${result.error.column}\n`);
      }
      process.stdout.write(bar + '\n');
    }
  }

  private printStats(result: ParseResult, colorize: boolean): void {
    const m = result.metadata;
    const rows: [string, string][] = [
      ['Format',     m.format.toUpperCase()],
      ['Input size', this.formatBytes(m.inputSizeBytes)],
      ['Parse time', `${m.parseTimeMs} ms`],
      ['Nodes',      String(m.nodeCount)],
      ['Keys',       String(m.keyCount)],
      ['Max depth',  String(m.depth)],
    ];

    const bar = '─'.repeat(60);
    if (colorize) {
      process.stdout.write('\n' + chalk.gray(bar) + '\n');
      process.stdout.write(chalk.bold(' Statistics\n'));
      for (const [k, v] of rows) {
        process.stdout.write(`  ${chalk.gray(k.padEnd(14))} ${chalk.white(v)}\n`);
      }
      process.stdout.write(chalk.gray(bar) + '\n');
    } else {
      process.stdout.write('\n' + bar + '\n Statistics\n');
      for (const [k, v] of rows) process.stdout.write(`  ${k.padEnd(14)} ${v}\n`);
      process.stdout.write(bar + '\n');
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  printError(message: string, colorize = true): void {
    if (colorize) process.stderr.write(chalk.red(`Error: ${message}\n`));
    else process.stderr.write(`Error: ${message}\n`);
  }
}
