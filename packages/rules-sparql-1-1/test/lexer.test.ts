import { describe, expect, it } from 'vitest';
import { sparql11LexerBuilder } from '../lib/lexer/index.js';
import { pnLocalPattern } from '../lib/lexer/lexerPatterns.js';

describe('lexer', () => {
  const lexer = sparql11LexerBuilder.build();
  it('does not parse escaped URI', ({ expect }) => {
    const valid = lexer.tokenize('aair:appel\\/test');
    expect(valid).toMatchObject({ tokens: [{ tokenType: { name: 'PNameLn' }}]});
    expect(valid.errors.length).toBe(0);
    expect(valid.tokens.length).toBe(1);
    // \\/ is matched by PN_LOCAL_ESC [173]
    expect(pnLocalPattern.test('appel\\/test')).toBe(true);

    const invalid = lexer.tokenize('aair:appel\\test');
    expect(invalid.errors.length).greaterThanOrEqual(1);
    expect(invalid).toMatchObject({ tokens: [{ tokenType: { name: 'PNameLn' }}]});
    expect(new RegExp(`^(${pnLocalPattern.source})$`, 'u').test('appel\\test')).toBe(false);
  });

  it('does not accept an escaped backslash in a local name', ({ expect }) => {
    // A backslash is not one of the characters PN_LOCAL_ESC [173] may escape
    const invalid = lexer.tokenize('aair:appel\\\\test');
    expect(invalid.errors.length).greaterThanOrEqual(1);
    expect(new RegExp(`^(${pnLocalPattern.source})$`, 'u').test('appel\\\\test')).toBe(false);
  });
});

describe('lexer (rdf-array)', () => {
  const lexer = sparql11LexerBuilder.build();
  const names = (input: string): string[] => {
    const result = lexer.tokenize(input);
    expect(result.errors).toHaveLength(0);
    return result.tokens.map(token => token.tokenType.name);
  };

  it('takes `...` before `.`, after an integer and after a local name', ({ expect }) => {
    expect(names('( 1... )')).toEqual([ 'LParen', 'Integer', 'Ellipsis', 'RParen' ]);
    expect(names('( :a... )')).toEqual([ 'LParen', 'PNameLn', 'Ellipsis', 'RParen' ]);
    expect(names('?s :p ?o .')).toEqual([ 'Var1', 'PNameLn', 'Var1', 'Dot' ]);
  });

  it('keeps `:a...b` one prefixed name, as `:a.b` is', ({ expect }) => {
    expect(names(':a...b')).toEqual([ 'PNameLn' ]);
    expect(names(':a.b')).toEqual([ 'PNameLn' ]);
  });

  it('lexes a slice as its ends and `...`, not as decimals', ({ expect }) => {
    expect(names('[2...4]')).toEqual([ 'LSquare', 'Integer', 'Ellipsis', 'Integer', 'RSquare' ]);
    expect(names('[2.5...4]')).toEqual([ 'LSquare', 'Decimal', 'Ellipsis', 'Integer', 'RSquare' ]);
    expect(names('[...4]')).toEqual([ 'LSquare', 'Ellipsis', 'Integer', 'RSquare' ]);
  });

  it('makes a named gap one token, and a gap followed by a variable two', ({ expect }) => {
    expect(names('( ?a ...?b )')).toEqual([ 'LParen', 'Var1', 'GapVar', 'RParen' ]);
    expect(names('( ?a ...$b )')).toEqual([ 'LParen', 'Var1', 'GapVar', 'RParen' ]);
    expect(names('( ?a ... ?b )')).toEqual([ 'LParen', 'Var1', 'Ellipsis', 'Var1', 'RParen' ]);
    expect(lexer.tokenize('...?b').tokens[0].image).toBe('...?b');
  });

  it('knows the keywords UNNEST, AT, SEQ, SEQLEN and isSEQ, SEQLEN before SEQ, AT before a', ({ expect }) => {
    expect(names('UNNEST(?x AS ?y AT ?i)'))
      .toEqual([ 'Unnest', 'LParen', 'Var1', 'As', 'Var1', 'At', 'Var1', 'RParen' ]);
    expect(names('seqlen(seq()) isSEQ(?x)')).toEqual([
      'BuiltInSeqlen',
      'LParen',
      'BuiltInSeq',
      'Nil',
      'RParen',
      'BuiltInIsseq',
      'LParen',
      'Var1',
      'RParen',
    ]);
    expect(names('?s a ?t')).toEqual([ 'Var1', 'a', 'Var1' ]);
  });
});
