/**
 * Integration: parse → format pipeline.
 * These tests own the contract from raw string to rendered output.
 * A bug in the parser OR formatter will break these tests.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { JsonParser } from '../../src/parsers/JsonParser';
import { JsonFormatter } from '../../src/formatters/JsonFormatter';
import { ParserRegistry } from '../../src/parsers/ParserRegistry';
import type { JsonValue } from '../../src/types';

const parser = new JsonParser();
const formatter = new JsonFormatter();
const registry = new ParserRegistry().register(parser);

describe('Parse → Format pipeline', () => {
  it('parses then formats a flat object', () => {
    const result = parser.parse('{"name":"Alice","age":30}');
    expect(result.success).toBe(true);
    const out = formatter.format(result.data as JsonValue, { colorize: false });
    expect(out).toContain('"name"');
    expect(out).toContain('"Alice"');
  });

  it('compact output is valid JSON and equals original data', () => {
    const inputs = [
      '{"a":1}',
      '[1,2,3]',
      'null',
      '"hello"',
      '{"nested":{"arr":[1,2,3],"flag":true}}',
    ];
    for (const input of inputs) {
      const result = parser.parse(input);
      expect(result.success).toBe(true);
      const compact = formatter.format(result.data as JsonValue, { colorize: false, compact: true });
      expect(JSON.parse(compact)).toEqual(result.data);
    }
  });

  it('tree view contains all top-level keys', () => {
    const input = '{"id":1,"name":"Bob","active":true}';
    const result = parser.parse(input);
    expect(result.success).toBe(true);
    const tree = formatter.format(result.data as JsonValue, { colorize: false, treeView: true });
    expect(tree).toContain('id');
    expect(tree).toContain('name');
    expect(tree).toContain('active');
  });

  it('registry routes .json extension correctly', () => {
    const result = registry.parse('{"ok":true}', '.json');
    expect(result.success).toBe(true);
    expect(result.metadata.format).toBe('json');
  });

  it('full pipeline preserves data fidelity over re-parse', () => {
    const original = {
      users: [
        { id: 1, name: 'Alice', score: 99.5, active: true, meta: null },
        { id: 2, name: 'Bob',   score: 82.0, active: false, meta: { note: 'vip' } },
      ],
    };
    const r1 = parser.parse(JSON.stringify(original));
    expect(r1.success).toBe(true);
    const formatted = formatter.format(r1.data as JsonValue, { colorize: false, indent: 2 });
    const r2 = parser.parse(formatted);
    expect(r2.success).toBe(true);
    expect(r2.data).toEqual(original);
  });
});

describe('Demo file parsing', () => {
  const demoFiles = [
    ['small/config.json',  '.json'],
    ['small/user.json',    '.json'],
    ['large/products.json','.json'],
    ['large/analytics.json','.json'],
  ] as const;

  for (const [file, ext] of demoFiles) {
    it(`parses demos/${file}`, () => {
      const path = join(__dirname, '../../demos', file);
      const content = readFileSync(path, 'utf8');
      const result = registry.parse(content, ext);
      expect(result.success).toBe(true);
      expect(result.metadata.nodeCount).toBeGreaterThan(0);
    });
  }
});

describe('Error propagation', () => {
  it('parse failure produces structured error', () => {
    const result = parser.parse('{"broken":}');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.line).toBeGreaterThanOrEqual(1);
    expect(result.error?.column).toBeGreaterThanOrEqual(1);
    expect(result.error?.message).toBeTruthy();
  });

  it('registry throws with helpful message for unknown format', () => {
    expect(() => registry.parse('{}', '.yaml')).toThrow(/json/i);
  });
});
