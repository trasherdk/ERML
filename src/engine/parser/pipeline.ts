import { Token, Tokens } from "../lexer"

type Keyword = Keywords.ENTITY
type OpeningSymbol = Delimiters.OPENING_BRACE
type ClosingSymbol = Delimiters.CLOSING_BRACE

export const enum Keywords {
  ENTITY = "ENTITY",
}

export const enum Delimiters {
  OPENING_BRACE = "{",
  CLOSING_BRACE = "}",
}

export interface Node {
  type: "entity"
  name: string
  attributes: unknown[]
}

export type ParsingPipeline = ((
  token: Token,
  tokenIndex: number
) => ReturnType<
  | typeof parseKeywordProcess
  | typeof parseIdentifierProcess
  | typeof parseBodyProcess
>)[]

export function parseKeywordProcess(
  token: Token,
  expectedKeyword: Keyword,
  getNodeProp: () => { type: Node["type"] },
  silent = false
) {
  try {
    assertToken(token, expectedKeyword)
    return getNodeProp()
  } catch (e) {
    if (!silent) {
      throw e
    }
    return null
  }
}

export function parseIdentifierProcess(
  token: Token,
  getNodeProp: () => { name: Node["name"] }
) {
  if (!/^[a-zA-Z_]\w{0,29}$/.test(token.value)) {
    throw new Error(
      `"${token.value}" at position ${token.position}, line ${token.line} is not a valid identifier`
    )
  }
  return getNodeProp()
}

export function parseBodyProcess(
  tokens: Tokens,
  tokenIndex: number,
  openingSymbol: OpeningSymbol,
  closingSymbol: ClosingSymbol,
  bodyParser: (
    bodyStart: number,
    bodyEnd: number
  ) => [number, { attributes: Node["attributes"] }]
) {
  const token = tokens[tokenIndex]
  assertToken(token, openingSymbol)
  const closingSymbolPosition = groupingSymbolsMatchAt(
    tokens,
    tokenIndex,
    openingSymbol,
    closingSymbol
  )

  if (!closingSymbolPosition) {
    throw new Error(
      `Grouping symbols ("${openingSymbol}" and "${closingSymbol}") don't match after "${openingSymbol}" at position ${token.position}, line ${token.line}`
    )
  }

  return bodyParser(tokenIndex + 1, closingSymbolPosition - 1)
}

export function walkPipeline(
  parsingPipeline: ParsingPipeline,
  tokens: Tokens,
  currentTokenIndex: number
): [number, Node | null] {
  let node = {} as Node
  const startIndex = currentTokenIndex

  for (const process of parsingPipeline) {
    if (!tokens[currentTokenIndex]) {
      const previousToken = tokens[currentTokenIndex - 1]
      throw new Error(
        `Didn't expect to reach the end after token "${previousToken.value}" at position ${previousToken.position}, line ${previousToken.line}`
      )
    }

    const processResult = process(
      tokens[currentTokenIndex],
      currentTokenIndex++
    )

    if (!processResult) {
      return [startIndex, null]
    }

    if (processResult.constructor === Array) {
      currentTokenIndex = processResult[0]
      node = { ...node, ...processResult[1] }
    } else {
      node = { ...node, ...processResult }
    }
  }

  return [currentTokenIndex, node]
}

function assertToken(token: Token, expectedValue: string) {
  if (token.value !== expectedValue) {
    throw new Error(
      `Expected to find "${expectedValue}" at at position ${token.position}, line ${token.line}. Instead found "${token.value}"`
    )
  }
}

function groupingSymbolsMatchAt(
  tokens: Tokens,
  currentPosition: number,
  openingSymbol: OpeningSymbol,
  closingSymbol: ClosingSymbol
) {
  let groupingSymbolsScales = 0

  do {
    groupingSymbolsScales +=
      tokens[currentPosition].value === openingSymbol
        ? 1
        : tokens[currentPosition].value === closingSymbol
        ? -1
        : 0

    if (groupingSymbolsScales === 0) {
      return currentPosition
    }
  } while (++currentPosition < tokens.length)

  return null
}
