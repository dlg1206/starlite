/** A single code/name pair, e.g. campus, term, or subject. */
export interface Identifier {
  id: string;
  value: string;
}

export interface IdentifierResponse {
  timestamp: string;
  identifiers: Identifier[];
}
