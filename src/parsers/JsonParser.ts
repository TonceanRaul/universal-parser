import { BaseParser } from './BaseParser';
import type {
  JsonValue,
  ParseResult,
  ParseError,
  ParseMetadata,
  FormatOptions,
} from '../types/index';
import { JsonFormatter } from '../formatters/JsonFormatter';

// ─── Lexer ────────────────────────────────────────────────────────────────────

export const enum TokenType {
  STRING        = 'STRING',
  NUMBER        = 'NUMBER',
  TRUE          = 'TRUE',
  FALSE         = 'FALSE',
  NULL          = 'NULL',
  LEFT_BRACE    = 'LEFT_BRACE',
  RIGHT_BRACE   = 'RIGHT_BRACE',
  LEFT_BRACKET  = 'LEFT_BRACKET',
  RIGHT_BRACKET = 'RIGHT_BRACKET',
  COLON         = 'COLON',
  COMMA         = 'COMMA',
  EOF           = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  position: number;
}

export class JsonLexer {
  private pos = 0;
  private line = 1;
  private lineStart = 0;
  private readonly src: string;

  constructor(src: string) {
    this.src = src;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (true) {
      this.skipWhitespace();
      if (this.pos >= this.src.length) {
        tokens.push(this.makeToken(TokenType.EOF, ''));
        break;
      }
      tokens.push(this.nextToken());
    }
    return tokens;
  }

  private makeToken(type: TokenType, value: string, startPos?: number): Token {
    const position = startPos ?? this.pos;
    return { type, value, line: this.line, column: position - this.lineStart + 1, position };
  }

  private skipWhitespace(): void {
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === '\n') { this.line++; this.lineStart = this.pos + 1; this.pos++; }
      else if (ch === '\r') {
        this.pos++;
        if (this.src[this.pos] === '\n') this.pos++;
        this.line++;
        this.lineStart = this.pos;
      }
      else if (ch === ' ' || ch === '\t') { this.pos++; }
      else break;
    }
  }

  private nextToken(): Token {
    const startPos = this.pos;
    const ch = this.src[this.pos];

    if (ch === '{') { this.pos++; return this.makeToken(TokenType.LEFT_BRACE,    '{', startPos); }
    if (ch === '}') { this.pos++; return this.makeToken(TokenType.RIGHT_BRACE,   '}', startPos); }
    if (ch === '[') { this.pos++; return this.makeToken(TokenType.LEFT_BRACKET,  '[', startPos); }
    if (ch === ']') { this.pos++; return this.makeToken(TokenType.RIGHT_BRACKET, ']', startPos); }
    if (ch === ':') { this.pos++; return this.makeToken(TokenType.COLON,         ':', startPos); }
    if (ch === ',') { this.pos++; return this.makeToken(TokenType.COMMA,         ',', startPos); }
    if (ch === '"') return this.readString(startPos);
    if (ch === '-' || (ch >= '0' && ch <= '9')) return this.readNumber(startPos);
    if (this.src.startsWith('true',  this.pos)) { this.pos += 4; return this.makeToken(TokenType.TRUE,  'true',  startPos); }
    if (this.src.startsWith('false', this.pos)) { this.pos += 5; return this.makeToken(TokenType.FALSE, 'false', startPos); }
    if (this.src.startsWith('null',  this.pos)) { this.pos += 4; return this.makeToken(TokenType.NULL,  'null',  startPos); }

    throw this.lexError(`Unexpected character '${ch}'`, startPos);
  }

  private readString(startPos: number): Token {
    this.pos++; // skip opening "
    let result = '';
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === '"') { this.pos++; return this.makeToken(TokenType.STRING, result, startPos); }
      if (ch === '\\') {
        this.pos++;
        const esc = this.src[this.pos];
        switch (esc) {
          case '"':  result += '"';  break;
          case '\\': result += '\\'; break;
          case '/':  result += '/';  break;
          case 'b':  result += '\b'; break;
          case 'f':  result += '\f'; break;
          case 'n':  result += '\n'; break;
          case 'r':  result += '\r'; break;
          case 't':  result += '\t'; break;
          case 'u': {
            const hex = this.src.slice(this.pos + 1, this.pos + 5);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
              throw this.lexError(`Invalid unicode escape \\u${hex}`, this.pos - 1);
            }
            result += String.fromCharCode(parseInt(hex, 16));
            this.pos += 4;
            break;
          }
          default:
            throw this.lexError(`Invalid escape sequence '\\${esc}'`, this.pos - 1);
        }
        this.pos++;
      } else if (ch === '\n' || ch === '\r') {
        throw this.lexError('Unterminated string (newline in string)', startPos);
      } else {
        result += ch;
        this.pos++;
      }
    }
    throw this.lexError('Unterminated string', startPos);
  }

  private readNumber(startPos: number): Token {
    let raw = '';
    if (this.src[this.pos] === '-') { raw += '-'; this.pos++; }
    if (this.src[this.pos] === '0') {
      raw += '0'; this.pos++;
    } else if (this.src[this.pos] >= '1' && this.src[this.pos] <= '9') {
      while (this.pos < this.src.length && this.src[this.pos] >= '0' && this.src[this.pos] <= '9') {
        raw += this.src[this.pos++];
      }
    } else {
      throw this.lexError('Invalid number', startPos);
    }
    if (this.pos < this.src.length && this.src[this.pos] === '.') {
      raw += '.'; this.pos++;
      if (!(this.src[this.pos] >= '0' && this.src[this.pos] <= '9')) {
        throw this.lexError('Expected digit after decimal point', this.pos);
      }
      while (this.pos < this.src.length && this.src[this.pos] >= '0' && this.src[this.pos] <= '9') {
        raw += this.src[this.pos++];
      }
    }
    if (this.pos < this.src.length && (this.src[this.pos] === 'e' || this.src[this.pos] === 'E')) {
      raw += this.src[this.pos++];
      if (this.src[this.pos] === '+' || this.src[this.pos] === '-') { raw += this.src[this.pos++]; }
      if (!(this.src[this.pos] >= '0' && this.src[this.pos] <= '9')) {
        throw this.lexError('Expected digit in exponent', this.pos);
      }
      while (this.pos < this.src.length && this.src[this.pos] >= '0' && this.src[this.pos] <= '9') {
        raw += this.src[this.pos++];
      }
    }
    return this.makeToken(TokenType.NUMBER, raw, startPos);
  }

  private lexError(msg: string, pos: number): LexError {
    const col = pos - this.lineStart + 1;
    const snippet = this.src.slice(Math.max(0, pos - 10), pos + 20);
    return new LexError(msg, this.line, col, pos, snippet);
  }
}

export class LexError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    public readonly position: number,
    public readonly snippet: string,
  ) {
    super(message);
    this.name = 'LexError';
  }
}

// ─── Recursive Descent Parser ─────────────────────────────────────────────────

export class JsonRecursiveParser {
  private readonly tokens: Token[];
  private pos = 0;
  private _depth = 0;
  private _maxDepth = 0;
  private _nodeCount = 0;
  private _keyCount = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  get maxDepth(): number  { return this._maxDepth; }
  get nodeCount(): number { return this._nodeCount; }
  get keyCount(): number  { return this._keyCount; }

  parseRoot(): JsonValue {
    const val = this.parseValue();
    const next = this.peek();
    if (next.type !== TokenType.EOF) {
      throw this.parseError(`Unexpected token '${next.value}' after root value`, next);
    }
    return val;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(expected?: TokenType): Token {
    const tok = this.tokens[this.pos++];
    if (expected !== undefined && tok.type !== expected) {
      throw this.parseError(`Expected ${expected} but got ${tok.type} ('${tok.value}')`, tok);
    }
    return tok;
  }

  private parseValue(): JsonValue {
    this._nodeCount++;
    this._depth++;
    if (this._depth > this._maxDepth) this._maxDepth = this._depth;

    const tok = this.peek();
    let result: JsonValue;

    switch (tok.type) {
      case TokenType.LEFT_BRACE:   result = this.parseObject(); break;
      case TokenType.LEFT_BRACKET: result = this.parseArray();  break;
      case TokenType.STRING:       this.pos++; result = tok.value; break;
      case TokenType.NUMBER:       this.pos++; result = parseFloat(tok.value); break;
      case TokenType.TRUE:         this.pos++; result = true;  break;
      case TokenType.FALSE:        this.pos++; result = false; break;
      case TokenType.NULL:         this.pos++; result = null;  break;
      default:
        throw this.parseError(`Unexpected token '${tok.value}' (${tok.type})`, tok);
    }

    this._depth--;
    return result;
  }

  private parseObject(): JsonValue {
    this.consume(TokenType.LEFT_BRACE);
    const obj: Record<string, JsonValue> = {};

    if (this.peek().type === TokenType.RIGHT_BRACE) {
      this.consume(TokenType.RIGHT_BRACE);
      return obj;
    }

    while (true) {
      const keyTok = this.peek();
      if (keyTok.type !== TokenType.STRING) {
        throw this.parseError(`Object key must be a string, got ${keyTok.type}`, keyTok);
      }
      this.pos++;
      const key = keyTok.value;
      this._keyCount++;

      this.consume(TokenType.COLON);
      obj[key] = this.parseValue();

      const next = this.peek();
      if (next.type === TokenType.RIGHT_BRACE) { this.pos++; break; }
      if (next.type === TokenType.COMMA) { this.pos++; continue; }
      throw this.parseError(`Expected ',' or '}' in object, got ${next.type} ('${next.value}')`, next);
    }

    return obj;
  }

  private parseArray(): JsonValue {
    this.consume(TokenType.LEFT_BRACKET);
    const arr: JsonValue[] = [];

    if (this.peek().type === TokenType.RIGHT_BRACKET) {
      this.consume(TokenType.RIGHT_BRACKET);
      return arr;
    }

    while (true) {
      arr.push(this.parseValue());
      const next = this.peek();
      if (next.type === TokenType.RIGHT_BRACKET) { this.pos++; break; }
      if (next.type === TokenType.COMMA) { this.pos++; continue; }
      throw this.parseError(`Expected ',' or ']' in array, got ${next.type} ('${next.value}')`, next);
    }

    return arr;
  }

  private parseError(msg: string, tok: Token): ParseSyntaxError {
    return new ParseSyntaxError(msg, tok.line, tok.column, tok.position);
  }
}

export class ParseSyntaxError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    public readonly position: number,
  ) {
    super(message);
    this.name = 'ParseSyntaxError';
  }
}

// ─── JsonParser (public API) ──────────────────────────────────────────────────

export class JsonParser extends BaseParser<JsonValue> {
  readonly format = 'json';
  readonly extensions = ['.json', 'json'];
  readonly mimeTypes = ['application/json', 'text/json'];

  parse(input: string): ParseResult<JsonValue> {
    const startTime = Date.now();
    const baseMeta: Omit<ParseMetadata, 'depth' | 'nodeCount' | 'keyCount' | 'parseTimeMs'> = {
      format: this.format,
      inputSizeBytes: Buffer.byteLength(input, 'utf8'),
    };

    if (input.trim() === '') {
      return {
        success: false,
        error: { message: 'Input is empty', line: 1, column: 1, position: 0 },
        metadata: { ...baseMeta, parseTimeMs: 0, depth: 0, nodeCount: 0, keyCount: 0 },
      };
    }

    try {
      const tokens = new JsonLexer(input).tokenize();
      const rp = new JsonRecursiveParser(tokens);
      const data = rp.parseRoot();

      return {
        success: true,
        data,
        metadata: {
          ...baseMeta,
          parseTimeMs: Date.now() - startTime,
          depth: rp.maxDepth,
          nodeCount: rp.nodeCount,
          keyCount: rp.keyCount,
        },
      };
    } catch (e) {
      const err = e as { message: string; line?: number; column?: number; position?: number; snippet?: string };
      const parseError: ParseError = {
        message: err.message,
        line: err.line ?? 1,
        column: err.column ?? 1,
        position: err.position ?? 0,
        snippet: err.snippet,
      };
      return {
        success: false,
        error: parseError,
        metadata: { ...baseMeta, parseTimeMs: Date.now() - startTime, depth: 0, nodeCount: 0, keyCount: 0 },
      };
    }
  }

  format_output(data: JsonValue, options: Partial<FormatOptions> = {}): string {
    return new JsonFormatter().format(data, options);
  }
}
