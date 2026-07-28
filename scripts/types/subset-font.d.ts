declare module 'subset-font' {
  // subset-font ships no types. API surface we use: subset a font buffer to
  // the given text and return the target-format buffer.
  function subsetFont(
    buffer: Buffer | Uint8Array | ArrayBuffer,
    text: string,
    options?: { targetFormat?: 'woff2' | 'woff' | 'sfnt' | 'truetype' }
  ): Promise<Buffer>;
  export default subsetFont;
}
