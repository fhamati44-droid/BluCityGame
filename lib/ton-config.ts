// This integration deliberately supports testnet only. Mainnet needs a separate rollout.
export const BLU_JETTON_MASTER = 'kQCBHdQIyXcjejVkFbxjnRYTdxksqTyJNs2vnTybXuTyT5DW';
export const TON_TESTNET = '-3';
export const BLU_DECIMALS = 9;
export function formatBluUnits(value: string): string {
  if (!/^\d+$/.test(value)) throw Error('INVALID_BALANCE');
  const padded = value.padStart(BLU_DECIMALS + 1, '0');
  const fraction = padded.slice(-BLU_DECIMALS).replace(/0+$/, '');
  return `${padded.slice(0, -BLU_DECIMALS)}${fraction ? '.' + fraction : ''}`;
}
