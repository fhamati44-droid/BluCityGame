export const COIN_PACKS=[{id:'small',coins:500,stars:50},{id:'medium',coins:1200,stars:100},{id:'large',coins:3000,stars:200}] as const;
export function paymentsEnabled(){return process.env.BLU_PAYMENTS_ENABLED==='true'&&!!process.env.TELEGRAM_WEBHOOK_SECRET&&!!process.env.BLU_SUPPORT_USERNAME;}
