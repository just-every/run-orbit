declare module '@runeditrun/rer/modules/portability/journal' {
  /** Fences the source's portability checkpoint for rows kept with their personal values replaced. */
  export function redactionStatements(db: D1Database): Promise<D1PreparedStatement[]>;
}
