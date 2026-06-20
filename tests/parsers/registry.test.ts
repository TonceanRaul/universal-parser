import { ParserRegistry } from '../../src/parsers/ParserRegistry';
import { JsonParser } from '../../src/parsers/JsonParser';

describe('ParserRegistry', () => {
  let registry: ParserRegistry;

  beforeEach(() => {
    registry = new ParserRegistry();
  });

  it('starts empty', () => {
    expect(registry.formats()).toEqual([]);
  });

  it('registers a parser', () => {
    registry.register(new JsonParser());
    expect(registry.has('json')).toBe(true);
  });

  it('throws when registering duplicate format', () => {
    registry.register(new JsonParser());
    expect(() => registry.register(new JsonParser())).toThrow(/already registered/i);
  });

  it('finds parser by extension', () => {
    registry.register(new JsonParser());
    const p = registry.find('.json');
    expect(p).toBeDefined();
    expect(p?.format).toBe('json');
  });

  it('finds parser by mime type', () => {
    registry.register(new JsonParser());
    const p = registry.find('application/json');
    expect(p).toBeDefined();
  });

  it('returns undefined for unknown extension', () => {
    registry.register(new JsonParser());
    expect(registry.find('.xml')).toBeUndefined();
  });

  it('unregisters a parser', () => {
    registry.register(new JsonParser());
    const removed = registry.unregister('json');
    expect(removed).toBe(true);
    expect(registry.has('json')).toBe(false);
  });

  it('returns false when unregistering unknown format', () => {
    expect(registry.unregister('xml')).toBe(false);
  });

  it('parses with the correct parser by extension', () => {
    registry.register(new JsonParser());
    const result = registry.parse('{"ok":true}', '.json');
    expect(result.success).toBe(true);
  });

  it('throws when parsing with no registered parser', () => {
    expect(() => registry.parse('{}', '.yaml')).toThrow(/no parser/i);
  });

  it('supports chaining register calls', () => {
    const r = new ParserRegistry().register(new JsonParser());
    expect(r).toBeInstanceOf(ParserRegistry);
    expect(r.has('json')).toBe(true);
  });

  it('lists registered formats', () => {
    registry.register(new JsonParser());
    expect(registry.formats()).toContain('json');
  });
});
