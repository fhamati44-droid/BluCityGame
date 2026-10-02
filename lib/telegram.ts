import { createHmac, timingSafeEqual } from 'node:crypto';
export type Identity = { id: string; name: string; referral?: string };
export function verifyTelegram(initData: string, token: string): Identity | null {
  if (!initData || initData.length > 8192) return null;
  const params = new URLSearchParams(initData);
  if(new Set(params.keys()).size!==[...params.keys()].length)return null;
  const received = params.get('hash'); const authDate = Number(params.get('auth_date'));
  const age=Date.now()/1000-authDate;
  if (!received || !/^[a-f\d]{64}$/i.test(received) || !Number.isSafeInteger(authDate) || authDate<=0 || age>3600 || age < -30) return null;
  const check = [...params.entries()].filter(([k])=>k !== 'hash').sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret = createHmac('sha256','WebAppData').update(token).digest();
  const computed = createHmac('sha256',secret).update(check).digest();
  if (!timingSafeEqual(computed,Buffer.from(received,'hex'))) return null;
  try {
    const user = JSON.parse(params.get('user') || '{}');
    if (!Number.isSafeInteger(user.id) || user.id <= 0) return null;
    const referral = params.get('start_param') || undefined;
    return { id: String(user.id), name: String(user.first_name || 'Player').slice(0,60), referral: referral && /^ref_\d{1,20}$/.test(referral) ? referral.slice(4) : undefined };
  } catch { return null; }
}
