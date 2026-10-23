declare module 'opencc-js/cn2t' {
  export function Converter(opts: { from: string; to: string }): (s: string) => string;
}
declare module 'opencc-js/t2cn' {
  export function Converter(opts: { from: string; to: string }): (s: string) => string;
}
