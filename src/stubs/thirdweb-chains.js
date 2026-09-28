export const polygon = { id: 137, name: 'Polygon' };
export const ethereum = { id: 1, name: 'Ethereum' };
export const base = { id: 8453, name: 'Base' };
export const defineChain = (x) => (typeof x === 'object' ? x : { id: x });
