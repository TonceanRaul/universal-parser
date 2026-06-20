import { JsonParser, JsonLexer, TokenType } from '../../src/parsers/JsonParser';

describe('JsonLexer', () => {
  const lex = (src: string) => new JsonLexer(src).tokenize();

  it('tokenizes an empty object', () => {
    const toks = lex('{}');
    expect(toks[0].type).toBe(TokenType.LEFT_BRACE);
    expect(toks[1].type).toBe(TokenType.RIGHT_BRACE);
    expect(toks[2].type).toBe(TokenType.EOF);
  });

  it('tokenizes a string', () => {
    const toks = lex('"hello world"');
    expect(toks[0].type).toBe(TokenType.STRING);
    expect(toks[0].value).toBe('hello world');
  });

  it('handles escape sequences in strings', () => {
    const toks = lex('"line1\\nline2\\ttab"');
    expect(toks[0].value).toBe('line1\nline2\ttab');
  });

  it('handles unicode escapes', () => {
    const toks = lex('"\\u0041"'); // A
    expect(toks[0].value).toBe('A');
  });

  it('tokenizes integers', () => {
    expect(lex('42')[0]).toMatchObject({ type: TokenType.NUMBER, value: '42' });
    expect(lex('-7')[0]).toMatchObject({ type: TokenType.NUMBER, value: '-7' });
    expect(lex('0')[0]).toMatchObject({ type: TokenType.NUMBER, value: '0' });
  });

  it('tokenizes floats and scientific notation', () => {
    expect(lex('3.14')[0].value).toBe('3.14');
    expect(lex('1e10')[0].value).toBe('1e10');
    expect(lex('2.5E-3')[0].value).toBe('2.5E-3');
    expect(lex('-1.5e+2')[0].value).toBe('-1.5e+2');
  });

  it('tokenizes true, false, null', () => {
    expect(lex('true')[0].type).toBe(TokenType.TRUE);
    expect(lex('false')[0].type).toBe(TokenType.FALSE);
    expect(lex('null')[0].type).toBe(TokenType.NULL);
  });

  it('tokenizes punctuation', () => {
    const toks = lex('[]:,');
    expect(toks[0].type).toBe(TokenType.LEFT_BRACKET);
    expect(toks[1].type).toBe(TokenType.RIGHT_BRACKET);
    expect(toks[2].type).toBe(TokenType.COLON);
    expect(toks[3].type).toBe(TokenType.COMMA);
  });

  it('tracks line and column numbers', () => {
    const toks = lex('{\n  "key": 1\n}');
    const keyTok = toks.find(t => t.type === TokenType.STRING);
    expect(keyTok?.line).toBe(2);
    expect(keyTok?.column).toBe(3);
  });

  it('throws on unexpected character', () => {
    expect(() => lex('?')).toThrow();
  });

  it('throws on unterminated string', () => {
    expect(() => lex('"hello')).toThrow(/unterminated string/i);
  });

  it('throws on invalid escape', () => {
    expect(() => lex('"\\q"')).toThrow(/invalid escape/i);
  });

  it('throws on invalid unicode escape', () => {
    expect(() => lex('"\\uGGGG"')).toThrow(/invalid unicode/i);
  });
});

// ─── Parser ──────────────────────────────────────────────────────────────────

describe('JsonParser', () => {
  const parser = new JsonParser();
  const parse = (s: string) => parser.parse(s);
  const ok = (s: string) => { const r = parse(s); expect(r.success).toBe(true); return r.data; };
  const fail = (s: string) => { const r = parse(s); expect(r.success).toBe(false); return r; };

  // ── Primitives ─────────────────────────────────────────────────────────────

  it('parses null', () => expect(ok('null')).toBeNull());
  it('parses true', () => expect(ok('true')).toBe(true));
  it('parses false', () => expect(ok('false')).toBe(false));
  it('parses integer', () => expect(ok('42')).toBe(42));
  it('parses negative integer', () => expect(ok('-7')).toBe(-7));
  it('parses zero', () => expect(ok('0')).toBe(0));
  it('parses float', () => expect(ok('3.14')).toBeCloseTo(3.14));
  it('parses scientific notation', () => expect(ok('1e3')).toBe(1000));
  it('parses negative scientific', () => expect(ok('-2.5e-1')).toBeCloseTo(-0.25));
  it('parses simple string', () => expect(ok('"hello"')).toBe('hello'));
  it('parses empty string', () => expect(ok('""')).toBe(''));
  it('parses string with escapes', () => expect(ok('"a\\nb"')).toBe('a\nb'));

  // ── Objects ────────────────────────────────────────────────────────────────

  it('parses empty object', () => expect(ok('{}')).toEqual({}));

  it('parses flat object', () => {
    expect(ok('{"a":1,"b":"x","c":true}')).toEqual({ a: 1, b: 'x', c: true });
  });

  it('parses nested objects', () => {
    expect(ok('{"outer":{"inner":42}}')).toEqual({ outer: { inner: 42 } });
  });

  it('parses object with null value', () => {
    expect(ok('{"k":null}')).toEqual({ k: null });
  });

  // ── Arrays ─────────────────────────────────────────────────────────────────

  it('parses empty array', () => expect(ok('[]')).toEqual([]));
  it('parses number array', () => expect(ok('[1,2,3]')).toEqual([1, 2, 3]));
  it('parses mixed array', () => expect(ok('[1,"a",true,null]')).toEqual([1, 'a', true, null]));
  it('parses nested arrays', () => expect(ok('[[1,2],[3,4]]')).toEqual([[1, 2], [3, 4]]));

  it('parses array of objects', () => {
    expect(ok('[{"id":1},{"id":2}]')).toEqual([{ id: 1 }, { id: 2 }]);
  });

  // ── Complex / deep ─────────────────────────────────────────────────────────

  it('parses deeply nested structure', () => {
    const data = ok('{"a":{"b":{"c":{"d":1}}}}');
    expect(data).toEqual({ a: { b: { c: { d: 1 } } } });
  });

  it('handles whitespace around tokens', () => {
    expect(ok('  {  "k"  :  1  }  ')).toEqual({ k: 1 });
  });

  it('handles newlines and tabs', () => {
    expect(ok('{\n\t"key":\t"value"\n}')).toEqual({ key: 'value' });
  });

  // ── Metadata ───────────────────────────────────────────────────────────────

  it('reports correct depth for nested object', () => {
    const r = parse('{"a":{"b":1}}');
    expect(r.metadata.depth).toBeGreaterThanOrEqual(2);
  });

  it('counts keys', () => {
    const r = parse('{"x":1,"y":2,"z":3}');
    expect(r.metadata.keyCount).toBe(3);
  });

  it('reports format as json', () => {
    expect(parse('{}').metadata.format).toBe('json');
  });

  it('reports non-zero parse time', () => {
    const r = parse('{"big":true}');
    expect(r.metadata.parseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('reports input size in bytes', () => {
    const input = '{"k":1}';
    expect(parse(input).metadata.inputSizeBytes).toBe(Buffer.byteLength(input, 'utf8'));
  });

  // ── Error cases ────────────────────────────────────────────────────────────

  it('fails on empty input', () => {
    const r = fail('');
    expect(r.error?.message).toMatch(/empty/i);
  });

  it('fails on whitespace-only input', () => {
    expect(fail('   ').success).toBe(false);
  });

  it('fails on trailing garbage', () => {
    expect(fail('{}garbage').success).toBe(false);
  });

  it('fails on missing colon', () => {
    expect(fail('{"key" "value"}').success).toBe(false);
  });

  it('fails on missing closing brace', () => {
    expect(fail('{"key":1').success).toBe(false);
  });

  it('fails on missing closing bracket', () => {
    expect(fail('[1,2,3').success).toBe(false);
  });

  it('fails on trailing comma in object', () => {
    expect(fail('{"a":1,}').success).toBe(false);
  });

  it('fails on trailing comma in array', () => {
    expect(fail('[1,2,]').success).toBe(false);
  });

  it('fails on single-quoted strings', () => {
    expect(fail("{'key':1}").success).toBe(false);
  });

  it('fails on numeric keys in objects', () => {
    expect(fail('{1:"value"}').success).toBe(false);
  });

  it('fails on bare words', () => {
    expect(fail('undefined').success).toBe(false);
  });

  it('fails on leading decimal', () => {
    expect(fail('.5').success).toBe(false);
  });

  it('returns error line and column for syntax errors', () => {
    const r = fail('{"key" 1}');
    expect(r.error?.line).toBeGreaterThanOrEqual(1);
    expect(r.error?.column).toBeGreaterThanOrEqual(1);
  });

  // ── canHandle ──────────────────────────────────────────────────────────────

  it('canHandle .json extension', () => expect(parser.canHandle('.json')).toBe(true));
  it('canHandle application/json mime', () => expect(parser.canHandle('application/json')).toBe(true));
  it('does not handle .xml', () => expect(parser.canHandle('.xml')).toBe(false));
});

// ─── Real-world fixtures ─────────────────────────────────────────────────────

describe('JsonParser — real-world fixtures', () => {
  const parser = new JsonParser();

  it('parses a typical config object', () => {
    const input = JSON.stringify({
      version: '1.0',
      database: { host: 'localhost', port: 5432, name: 'mydb' },
      features: ['auth', 'logging'],
      debug: false,
    });
    const result = parser.parse(input);
    expect(result.success).toBe(true);
  });

  it('parses a JSON array of records', () => {
    const records = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `item-${i}`, active: i % 2 === 0 }));
    const result = parser.parse(JSON.stringify(records));
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('parses deeply nested (10 levels)', () => {
    let obj: Record<string, unknown> = { value: 42 };
    for (let i = 0; i < 10; i++) obj = { nested: obj };
    const result = parser.parse(JSON.stringify(obj));
    expect(result.success).toBe(true);
    expect(result.metadata.depth).toBeGreaterThanOrEqual(10);
  });

  it('preserves floating point values', () => {
    const result = parser.parse('[0.1, 0.2, 1e-10, 9.99999]');
    expect(result.success).toBe(true);
    const data = result.data as number[];
    expect(data[0]).toBeCloseTo(0.1);
    expect(data[2]).toBeCloseTo(1e-10);
  });

  it('handles unicode strings', () => {
    const result = parser.parse('"caf\\u00E9 \\u4e2d\\u6587"');
    expect(result.success).toBe(true);
    expect(result.data).toBe('café 中文');
  });
});
