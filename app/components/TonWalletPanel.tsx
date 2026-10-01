'use client';
import { useEffect, useRef, useState } from 'react';
import { CHAIN, TonConnectUIProvider, useTonConnectUI, useTonWallet, useIsConnectionRestored } from '@tonconnect/ui-react';
import { BLU_JETTON_MASTER, TON_TESTNET } from '@/lib/ton-config';
import { getSyncStatus, refreshProgress, useSyncStatus } from '@/lib/progress-store';
import type { Lang } from '@/lib/levels';
const copy = {
  he: { title: 'ארנק BLU', test: 'רשת בדיקה · ללא ערך כספי', connect: 'חבר ארנק בדיקה', disconnect: 'נתק ארנק', balance: 'BLU בארנק', refresh: 'רענן יתרה', loading: 'בודק יתרה…', error: 'לא ניתן לקרוא את היתרה כרגע. נסה שוב.', wrong: 'הארנק מחובר ל־Mainnet. נתק אותו, בחר Testnet בארנק וחבר מחדש.', internal: 'BLU במשחק נפרד מ־BLU בארנק. בקשת משיכה משריינת BLU מהיתרה בענן.', unavailable: 'בקשות משיכה עדיין לא הופעלו.', request: 'בקש העברה לארנק', amount: 'כמות BLU', destination: 'כתובת היעד', confirm: 'אני מאשר את הכתובת להעברת טוקנים ברשת הבדיקה.', queued: 'הבקשה נרשמה וממתינה להעברה. הטוקנים עדיין לא נשלחו.', pending: 'ממתינה', processing: 'בטיפול', confirmed: 'אושרה בבלוקצ׳יין', refunded: 'הוחזרה', history: 'בקשות אחרונות', insufficient: 'אין מספיק BLU מסונכרן במשחק.', daily: 'מגבלת הניסוי היא 10 BLU ביום.', cloud: 'פתח דרך Telegram והמתן לסנכרון בענן.', failure: 'הבקשה לא אושרה. אפשר לנסות שוב.', manual: 'עד 10 BLU ביום בניסוי. הבקשה מאושרת רק לאחר אימות ההעברה בבלוקצ׳יין.', explorer: 'צפה בחוזה BLU', checking: 'בודק זמינות…' },
  ar: { title: 'محفظة BLU', test: 'شبكة تجريبية · بدون قيمة نقدية', connect: 'اربط محفظة تجريبية', disconnect: 'افصل المحفظة', balance: 'BLU بالمحفظة', refresh: 'حدّث الرصيد', loading: 'جاري فحص الرصيد…', error: 'تعذّر قراءة الرصيد. جرّب مرة ثانية.', wrong: 'المحفظة على Mainnet. افصلها وغيّر إلى Testnet ثم اربطها من جديد.', internal: 'BLU داخل اللعبة منفصل عن BLU بالمحفظة. طلب السحب يحجز BLU من الرصيد السحابي.', unavailable: 'طلبات السحب مش مفعّلة بعد.', request: 'اطلب تحويل للمحفظة', amount: 'كمية BLU', destination: 'عنوان الاستلام', confirm: 'أؤكد عنوان الاستلام لتحويل توكنات على الشبكة التجريبية.', queued: 'تم تسجيل الطلب وبانتظار التحويل. التوكنات لسه ما انبعتت.', pending: 'بانتظار التحويل', processing: 'قيد المعالجة', confirmed: 'مؤكد على الشبكة', refunded: 'تمت الإعادة', history: 'آخر الطلبات', insufficient: 'ما عندك BLU كافي متزامن باللعبة.', daily: 'الحد التجريبي 10 BLU باليوم.', cloud: 'افتح من تليجرام واستنى التزامن السحابي.', failure: 'الطلب ما تأكد. بتقدر تحاول مرة ثانية.', manual: 'حتى 10 BLU باليوم. الطلب يتأكد فقط بعد التحقق من التحويل على الشبكة.', explorer: 'شوف عقد BLU', checking: 'جاري فحص التوفر…' },
  en: { title: 'BLU wallet', test: 'Testnet · no cash value', connect: 'Connect test wallet', disconnect: 'Disconnect wallet', balance: 'BLU in wallet', refresh: 'Refresh balance', loading: 'Checking balance…', error: 'Balance is unavailable. Try again.', wrong: 'Wallet is on Mainnet. Disconnect, select Testnet in your wallet and reconnect.', internal: 'Game BLU is separate from wallet BLU. Requests reserve BLU from your cloud balance.', unavailable: 'Withdrawal requests are not enabled yet.', request: 'Request wallet transfer', amount: 'BLU amount', destination: 'Destination address', confirm: 'I confirm this destination for testnet tokens.', queued: 'Request recorded and awaiting transfer. Tokens have not been sent yet.', pending: 'Pending', processing: 'Processing', confirmed: 'Confirmed on chain', refunded: 'Refunded', history: 'Recent requests', insufficient: 'Not enough synced game BLU.', daily: 'The test limit is 10 BLU per day.', cloud: 'Open through Telegram and wait for cloud sync.', failure: 'Request was not confirmed. You can retry.', manual: 'Up to 10 BLU per day. A request is confirmed only after its on-chain transfer is verified.', explorer: 'View BLU contract', checking: 'Checking availability…' },
};
type Withdrawal = { id: string; amount: number; status: 'pending' | 'processing' | 'confirmed' | 'refunded'; tx_hash: string | null; created_at: string };
async function api(body: object) {
  const initData = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || '';
  const response = await fetch('/api/ton/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, initData }), signal: AbortSignal.timeout(12000) });
  const data = await response.json();
  if (!response.ok) throw Error(data.code || 'FAILED');
  return data;
}
function Wallet({ lang }: { lang: Lang }) {
  const restored=useIsConnectionRestored();
  const t = copy[lang], wallet = useTonWallet(), [ui] = useTonConnectUI(), sync = useSyncStatus();
  const [balance, setBalance] = useState<string | null>(null), [balanceState, setBalanceState] = useState('idle');
  const [refresh, setRefresh] = useState(0), [enabled, setEnabled] = useState<boolean | null>(null), [requests, setRequests] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState('1'), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [restoring,setRestoring]=useState(false);
  const [balanceError,setBalanceError]=useState('');
  const pending = useRef<{ id: string; address: string; amount: number } | null>(null);
  const address = wallet?.account.address, network = wallet?.account.chain, correct = network === TON_TESTNET;
  useEffect(() => { if(restored&&!wallet)ui.setConnectionNetwork(CHAIN.TESTNET); }, [ui,wallet,restored]);
  useEffect(() => { setConfirmed(false); setMessage(''); }, [address, correct]);
  useEffect(() => {
    setBalance(null); setBalanceError('');
    if (!address || !correct) { setBalanceState('idle'); return; }
    const abort = new AbortController(); setBalanceState('loading');
    fetch(`/api/ton/balance?address=${encodeURIComponent(address)}`, { signal: abort.signal }).then(async r => { const data=await r.json(); if (!r.ok) throw Error(data.code||'BALANCE_UNAVAILABLE'); return data; }).then(d => { if (!abort.signal.aborted) { setBalance(d.balance); setBalanceState('ready'); } }).catch(error => { if (!abort.signal.aborted) {setBalanceState('error');setBalanceError(error instanceof Error&&/^BALANCE_[A-Z_]+$/.test(error.message)?error.message:'BALANCE_UNAVAILABLE');} });
    return () => abort.abort();
  }, [address, correct, refresh]);
  useEffect(() => {
    let active = true;
    if (sync !== 'cloud') { setEnabled(false); return; }
    api({ action: 'status' }).then(d => { if (active) { setEnabled(d.enabled); setRequests(d.requests); } }).catch(() => { if (active) setEnabled(false); });
    return () => { active = false; };
  }, [sync, refresh]);
  async function requestTransfer() {
    const count = Number(amount);
    if (busy || !address || !correct || !confirmed || sync !== 'cloud' || !enabled || !Number.isInteger(count) || count < 1 || count > 10) return;
    setBusy(true); setMessage('');
    try {
      await refreshProgress();
      if (getSyncStatus() !== 'cloud') throw Error('OPEN_TELEGRAM');
      const retryKey = `blu_testnet_request_v1:${address}:${count}`;
      if (!pending.current || pending.current.address !== address || pending.current.amount !== count) {
        const savedId = sessionStorage.getItem(retryKey);
        pending.current = { id: savedId && /^[a-f\d-]{36}$/i.test(savedId) ? savedId : crypto.randomUUID(), address, amount: count };
        sessionStorage.setItem(retryKey, pending.current.id);
      }
      await api({ action: 'request', address, network, amount: count, requestId: pending.current.id });
      sessionStorage.removeItem(retryKey);
      pending.current = null; setMessage(t.queued); setConfirmed(false);
      await refreshProgress(); setRefresh(n => n + 1);
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      setMessage(code === 'INSUFFICIENT_BLU' ? t.insufficient : code === 'DAILY_LIMIT' ? t.daily : code === 'OPEN_TELEGRAM' ? t.cloud : t.failure);
    } finally { setBusy(false); }
  }
  return <section className="hub-card ton-wallet-panel" aria-label={t.title}>
    <div className="hub-card-top"><h2>{t.title}</h2><span className="hub-state">TESTNET</span></div><p>{t.test}</p>
    {!wallet&&<button className="hub-button secondary" disabled={restoring} onClick={async()=>{setRestoring(true);try{await ui.connector.restoreConnection();if(!ui.connector.connected)setMessage(lang==='he'?'לא נמצא חיבור קודם. לחץ על חבר ארנק בדיקה.':lang==='ar'?'لا يوجد اتصال سابق. اربط المحفظة من جديد.':'No previous connection found. Connect a test wallet.');}catch{setMessage(t.failure);}finally{setRestoring(false);}}}>{restoring?'…':lang==='he'?'שחזר חיבור קודם':lang==='ar'?'استعادة الاتصال السابق':'Restore previous connection'}</button>}
    {!wallet ? <button className="hub-button" disabled={!restored} onClick={() => { ui.openModal().catch(() => setMessage(t.failure)); }}>{restored?t.connect:lang==='he'?'משחזר חיבור לארנק…':lang==='ar'?'جاري استعادة اتصال المحفظة…':'Restoring wallet connection…'}</button> : <>
      <p className="ton-address" dir="ltr">{address}</p><button className="hub-button secondary" onClick={() => { ui.disconnect().catch(() => setMessage(t.failure)); }}>{t.disconnect}</button>
      {!correct ? <p role="alert">{t.wrong}</p> : <><p>{t.balance}: <strong dir="ltr">{balanceState === 'loading' ? t.loading : balance === null ? '—' : `${balance} BLU`}</strong></p>{balanceState === 'error' && <p role="alert">{t.error} <span dir="ltr">{balanceError}</span></p>}<button className="hub-button secondary" disabled={balanceState === 'loading'} onClick={() => setRefresh(n => n + 1)}>{t.refresh}</button></>}
    </>}
    <p>{t.internal}</p><a href={`https://testnet.tonviewer.com/${BLU_JETTON_MASTER}`} target="_blank" rel="noreferrer">{t.explorer}</a>
    {sync !== 'cloud' ? <p>{t.cloud}</p> : enabled === null ? <p>{t.checking}</p> : !enabled ? <p>{t.unavailable}</p> : <>
      <p>{t.manual}</p>{wallet && correct && <><label>{t.amount}<input type="number" min="1" max="10" step="1" value={amount} disabled={busy} onChange={e => { setAmount(e.target.value); setConfirmed(false); }} /></label><p>{t.destination}</p><p className="ton-address" dir="ltr">{address}</p><label className="ton-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />{t.confirm}</label><button className="hub-button" disabled={!confirmed || busy || !Number.isInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > 10} onClick={() => { void requestTransfer(); }}>{busy ? '…' : t.request}</button></>}
      {requests.length > 0 && <><h3>{t.history}</h3><ul>{requests.map(r => <li key={r.id}><span>{r.amount} BLU · {t[r.status]}</span>{r.tx_hash && <a href={`https://testnet.tonviewer.com/transaction/${encodeURIComponent(r.tx_hash)}`} target="_blank" rel="noreferrer"> ↗</a>}</li>)}</ul></>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
export default function TonWalletPanel({ lang }: { lang: Lang }) {
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
  return <TonConnectUIProvider manifestUrl={manifestUrl} restoreConnection={false} actionsConfiguration={{twaReturnUrl:"https://t.me/BluCityGame_bot?startapp"}}><Wallet lang={lang} /></TonConnectUIProvider>;
}
