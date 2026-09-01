/** Formats a JS number array as a pgvector literal, e.g. "[0.1,0.2,0.3]". */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
