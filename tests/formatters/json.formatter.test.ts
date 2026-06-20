import { JsonFormatter } from '../../src/formatters/JsonFormatter';
import type { JsonValue } from '../../src/types';

describe('JsonFormatter', () => {
  const fmt = new JsonFormatter();
  const format = (val: JsonValue, opts = {}) => fmt.format(val, { colorize: false, ...opts });

  // ── Primitives ─────────────────────────────────────────────────────────────

  it('formats null', () => expect(format(null)).toBe('null'));
  it('formats true', () => expect(format(true)).toBe('true'));
  it('formats false', () => expect(format(false)).toBe('false'));
  it('formats integer', () => expect(format(42)).toBe('42'));
  it('formats float', () => expect(format(3.14)).toBe('3.14'));
  it('formats string', () => expect(format('hello')).toBe('"hello"'));
  it('escapes backslash in string', () => expect(format('a\\b')).toContain('\\\\'));
  it('escapes double-quote in string', () => expect(format('say "hi"')).toContain('\\"'));

  // ── Objects ────────────────────────────────────────────────────────────────

  it('formats empty object', () => expect(format({})).toBe('{}'));

  it('formats flat object with correct indentation', () => {
    const out = format({ a: 1, b: 'x' }, { indent: 2 });
    expect(out).toContain('"a"');
    expect(out).toContain('"b"');
    expect(out).toMatch(/^\{/);
    expect(out).toMatch(/\}$/);
  });

  it('indents nested objects', () => {
    const out = format({ outer: { inner: 1 } }, { indent: 2 });
    const lines = out.split('\n');
    const innerLine = lines.find(l => l.includes('"inner"'));
    expect(innerLine).toBeDefined();
    expect(innerLine!.startsWith('    ')).toBe(true); // 4 spaces for depth 2
  });

  // ── Arrays ─────────────────────────────────────────────────────────────────

  it('formats empty array', () => expect(format([])).toBe('[]'));

  it('formats small primitive arrays inline', () => {
    const out = format([1, 2, 3]);
    expect(out).toBe('[1, 2, 3]');
  });

  it('formats long arrays multiline', () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);
    const out = format(arr);
    expect(out.includes('\n')).toBe(true);
  });

  it('formats array of objects multiline', () => {
    const out = format([{ id: 1 }, { id: 2 }]);
    expect(out.includes('\n')).toBe(true);
  });

  // ── Compact mode ───────────────────────────────────────────────────────────

  it('produces compact single-line output', () => {
    const out = format({ a: 1, b: [2, 3] }, { compact: true });
    expect(out).not.toContain('\n');
    expect(JSON.parse(out)).toEqual({ a: 1, b: [2, 3] });
  });

  // ── maxDepth ───────────────────────────────────────────────────────────────

  it('truncates at maxDepth', () => {
    const deep = { a: { b: { c: 1 } } };
    const out = format(deep, { maxDepth: 1 });
    expect(out).toContain('…');
  });

  // ── Tree view ──────────────────────────────────────────────────────────────

  it('renders tree view with box-drawing characters', () => {
    const out = fmt.renderTree({ name: 'Alice', age: 30 }, { colorize: false, indent: 2, compact: false, showTypes: false, showStats: false, treeView: true });
    expect(out).toContain('name');
    expect(out).toContain('age');
    expect(out).toMatch(/[└├─]/);
  });

  it('tree shows array length annotation', () => {
    const out = fmt.renderTree([1, 2, 3], { colorize: false, indent: 2, compact: false, showTypes: false, showStats: false, treeView: true });
    expect(out).toContain('[3]');
  });

  it('tree shows object key count annotation', () => {
    const out = fmt.renderTree({ a: 1, b: 2 }, { colorize: false, indent: 2, compact: false, showTypes: false, showStats: false, treeView: true });
    expect(out).toContain('{2}');
  });

  // ── showTypes ──────────────────────────────────────────────────────────────

  it('annotates types when showTypes is true', () => {
    const out = format({ count: 5, label: 'hi' }, { showTypes: true });
    expect(out).toContain('/*number*/');
    expect(out).toContain('/*string*/');
  });

  // ── Round-trip consistency ─────────────────────────────────────────────────

  it('compact output round-trips through JSON.parse', () => {
    const val = { nested: { arr: [1, 'x', null, true] } };
    const out = format(val, { compact: true });
    expect(JSON.parse(out)).toEqual(val);
  });
});
