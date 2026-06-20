#!/usr/bin/env node
import { readFileSync } from 'fs';
import { extname } from 'path';
import { Command } from 'commander';
import { ParserRegistry } from './parsers/ParserRegistry';
import { JsonParser } from './parsers/JsonParser';
import { FormatterRegistry } from './formatters/FormatterRegistry';
import { JsonFormatter } from './formatters/JsonFormatter';
import { PrettyPrinter } from './ui/PrettyPrinter';
import type { FormatOptions, JsonValue } from './types/index';

const program = new Command();

program
  .name('uparse')
  .description('Universal format parser with pretty-printing')
  .version('1.0.0')
  .argument('<file>', 'File to parse')
  .option('-f, --format <fmt>', 'Force parser format (e.g. json)')
  .option('--no-color', 'Disable color output')
  .option('--tree', 'Render as tree view')
  .option('--stats', 'Show parse statistics (default on)')
  .option('--no-stats', 'Hide parse statistics')
  .option('--compact', 'Compact single-line output')
  .option('--indent <n>', 'Indentation spaces', '2')
  .option('--show-types', 'Annotate values with their types')
  .option('--max-depth <n>', 'Truncate output beyond this depth')
  .option('--stdin', 'Read from stdin instead of file')
  .action((file: string, opts: Record<string, unknown>) => {
    const parsers = new ParserRegistry().register(new JsonParser());
    const formatters = new FormatterRegistry().register(new JsonFormatter());
    const printer = new PrettyPrinter();
    const colorize = opts['color'] !== false;

    let input = '';
    let ext = '.json';

    if (opts['stdin']) {
      input = readFileSync('/dev/stdin', 'utf8');
      ext = typeof opts['format'] === 'string' ? opts['format'] : '.json';
    } else {
      try {
        input = readFileSync(file, 'utf8');
        ext = typeof opts['format'] === 'string' ? opts['format'] : extname(file);
      } catch {
        printer.printError(`Could not read file: ${file}`, colorize);
        process.exit(1);
      }
    }

    const result = parsers.parse(input, ext);
    const formatter = formatters.get(result.metadata.format);

    if (!formatter) {
      printer.printError(`No formatter for format '${result.metadata.format}'`, colorize);
      process.exit(1);
    }

    const fmtOpts: Partial<FormatOptions> = {
      colorize,
      treeView:  Boolean(opts['tree']),
      compact:   Boolean(opts['compact']),
      showStats: opts['stats'] !== false,
      showTypes: Boolean(opts['showTypes']),
      indent:    parseInt(opts['indent'] as string, 10) || 2,
      maxDepth:  opts['maxDepth'] !== undefined ? parseInt(opts['maxDepth'] as string, 10) : undefined,
    };

    const formatted = result.success
      ? formatter.format(result.data as JsonValue, fmtOpts)
      : '';

    printer.printResult(result, fmtOpts, formatted);
    process.exit(result.success ? 0 : 1);
  });

program.parse();
