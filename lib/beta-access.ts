// Existing Testnet acceptance accounts. Server authentication is authoritative.
// A private deployment variable can replace this list without exposing secrets.
export function walletTestingAllowed(id:string|number){
 const ids=(process.env.BLU_TESTER_IDS??'660174909,8857115965').split(',').map(s=>s.trim()).filter(Boolean);
 return ids.includes(String(id));
}
