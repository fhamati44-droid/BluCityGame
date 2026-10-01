'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import GameHub, {type PlayRequest} from './components/GameHub';
import {unlockedLevel} from '../lib/levels';
import { getProgress, initializeProgress, refreshProgress } from '../lib/progress-store';
const PlayableCity = dynamic(() => import('./components/PlayableCity'), { ssr: false, loading: () => <div className="play-boot">POWERING UP BLU CITY…</div> });

type Lang = 'en' | 'he' | 'ar';
type Action = 'mission' | 'charge' | 'upgrade' | 'district';
type Player = { sparks: number; charge: number; level: number; district: number; missions: number; lastCharge: string | null; lastMission: string | null; referrals: number };
type Tg = { initData: string; initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string; language_code?: string } }; ready: () => void; expand: () => void; openInvoice?: (url:string,callback:(status:string)=>void)=>void; HapticFeedback?: { impactOccurred: (s: string) => void }; BackButton?: { show: () => void; hide: () => void; onClick: (fn: () => void) => void; offClick: (fn: () => void) => void } };
declare global { interface Window { Telegram?: { WebApp?: Tg } } }

const initial: Player = { sparks: 50, charge: 70, level: 1, district: 1, missions: 0, lastCharge: null, lastMission: null, referrals: 0 };
const words = {
  en: { cityName: 'CITY OF ENERGY', welcome: 'YOUR ENERGY ADVENTURE', hello: 'Hey', heroTitle: 'Let’s light up the city.', heroText: 'Charge BLU, take on missions and bring your city to life.', home: 'Home', tasks: 'Tasks', city: 'City', friends: 'Friends', profile: 'Profile', sparks: 'Sparks', energy: 'Energy', level: 'Level', district: 'District', live: 'Connected to Telegram', demo: 'Browser preview · progress stays here', loading: 'Connecting to BLU City…', connectionError: 'Could not connect to the game server. Your progress is unavailable. Reopen the app in Telegram or try again.', retry: 'Try again', energyTitle: 'BLU energy', energyFull: 'Fully charged and ready to go', energyLow: 'BLU needs a recharge', energyNormal: 'Every spark brings the city to life', ready: 'Ready to play', mission: 'Energy run', missionDesc: 'Send BLU on a quick mission.', missionCost: 'Uses 10 energy', missionReward: 'Earn +{n} sparks', run: 'Start mission', recharge: 'Recharge station', rechargeDesc: 'Collect 30 energy every 3 hours.', collect: 'Collect energy', nextIn: 'Ready in {n} min', upgrade: 'Power up BLU', upgradeDesc: 'Each level adds 5 sparks to every mission.', upgradeAction: 'Upgrade BLU', nextLevel: 'Next level', cost: 'Cost', moreEach: '+5 sparks per mission', cityTitle: 'Your city is waking up', cityDesc: 'Light a district to make the world brighter.', lit: 'districts lit', unlock: 'Light next district', maxCity: 'The whole city is lit!', friendsTitle: 'Power up together', friendsDesc: 'Share BLU with a friend. When they finish 3 missions, you get 50 sparks.', invited: 'Friends joined', invite: 'Invite friends', copy: 'Copy invite link', referralHint: 'Your personal invite link becomes available in Telegram.', profileTitle: 'Your journey with BLU', totalMissions: 'Missions completed', cityProgress: 'City progress', member: 'BLU explorer', language: 'Language', coming: 'Coming soon', comingDesc: 'Leaderboards, daily rewards and skins are planned for a future update.', backHome: 'Back to home', playNow: 'Play now', today: 'TODAY’S ADVENTURE', quickActions: 'KEEP THE MOMENTUM', explore: 'EXPLORE YOUR WORLD', soon: 'More districts are waiting beyond the horizon.', low_charge: 'Not enough energy. Recharge BLU first.', low_sparks: 'You need more sparks. Complete a mission.', cooldown: 'This action is cooling down.', max_level: 'BLU reached the maximum level.', max_district: 'Every district is lit!', successMission: 'Mission complete! +{n} sparks', successCharge: 'BLU is charged up!', successUpgrade: 'Level up! BLU is stronger.', successDistrict: 'A new district lights up!', offline: 'Connection failed. Please try again.', notReady: 'Open the Mini App inside Telegram for your invite link.', copied: 'Invite link copied!', gameOnly: 'Sparks are game points. They have no cash value.', claimLater: 'New adventures are on the way', shareTitle: 'Play BLU City with me!' },
  he: { cityName: 'עיר האנרגיה', welcome: 'הרפתקת האנרגיה שלך', hello: 'היי', heroTitle: 'בוא נאיר את העיר.', heroText: 'טען את BLU, צא למשימות והחזר את האור לעיר.', home: 'בית', tasks: 'משימות', city: 'העיר', friends: 'חברים', profile: 'פרופיל', sparks: 'ניצוצות', energy: 'אנרגיה', level: 'רמה', district: 'אזור', live: 'מחובר לטלגרם', demo: 'תצוגת דפדפן · ההתקדמות נשמרת כאן', loading: 'מתחברים לעיר של BLU…', connectionError: 'לא הצלחנו להתחבר לשרת המשחק. ההתקדמות שלך אינה זמינה כרגע. פתח מחדש בטלגרם או נסה שוב.', retry: 'נסה שוב', energyTitle: 'האנרגיה של BLU', energyFull: 'טעון ומוכן לפעולה', energyLow: 'BLU צריך להיטען', energyNormal: 'כל ניצוץ מחזיר חיים לעיר', ready: 'מוכן למשחק', mission: 'משימת אנרגיה', missionDesc: 'שלח את BLU למשימה קצרה.', missionCost: 'עולה 10 אנרגיה', missionReward: 'קבל {n} ניצוצות', run: 'צא למשימה', recharge: 'תחנת טעינה', rechargeDesc: 'אסוף 30 אנרגיה בכל 3 שעות.', collect: 'אסוף אנרגיה', nextIn: 'מוכן בעוד {n} דק׳', upgrade: 'שדרג את BLU', upgradeDesc: 'כל רמה מוסיפה 5 ניצוצות לכל משימה.', upgradeAction: 'שדרג את BLU', nextLevel: 'הרמה הבאה', cost: 'עלות', moreEach: 'עוד 5 ניצוצות למשימה', cityTitle: 'העיר שלך מתעוררת', cityDesc: 'האר אזור נוסף והרחב את העולם שלך.', lit: 'אזורים מוארים', unlock: 'האר את האזור הבא', maxCity: 'כל העיר מוארת!', friendsTitle: 'ביחד יש יותר אנרגיה', friendsDesc: 'שתף חבר. כשישלים 3 משימות תקבל 50 ניצוצות.', invited: 'חברים שהצטרפו', invite: 'הזמן חברים', copy: 'העתק קישור הזמנה', referralHint: 'קישור אישי יופיע כשתפתח את המשחק מתוך טלגרם.', profileTitle: 'המסע שלך עם BLU', totalMissions: 'משימות שהושלמו', cityProgress: 'התקדמות בעיר', member: 'חוקר העיר', language: 'שפה', coming: 'בקרוב', comingDesc: 'טבלת מובילים, פרס יומי וסקינים מתוכננים לעדכון עתידי.', backHome: 'בחזרה לבית', playNow: 'שחק עכשיו', today: 'ההרפתקה של היום', quickActions: 'ממשיכים להתקדם', explore: 'מגלים את העולם', soon: 'אזורים נוספים מחכים מעבר לאופק.', low_charge: 'אין מספיק אנרגיה. טען את BLU תחילה.', low_sparks: 'צריך עוד ניצוצות. השלם משימה.', cooldown: 'הפעולה זמינה שוב בסיום ההמתנה.', max_level: 'BLU הגיע לרמה המרבית.', max_district: 'כל האזורים מוארים!', successMission: 'המשימה הושלמה! קיבלת {n} ניצוצות', successCharge: 'BLU שוב מלא אנרגיה!', successUpgrade: 'עלית רמה! BLU התחזק.', successDistrict: 'אזור חדש הואר!', offline: 'החיבור נכשל. נסה שוב.', notReady: 'פתח את המשחק מתוך טלגרם כדי לקבל קישור הזמנה.', copied: 'קישור ההזמנה הועתק!', gameOnly: 'ניצוצות הם נקודות משחק ללא ערך כספי.', claimLater: 'הרפתקאות חדשות בדרך', shareTitle: 'בוא לשחק איתי ב־BLU City!' },
  ar: { cityName: 'مدينة الطاقة', welcome: 'مغامرتك مع الطاقة', hello: 'أهلًا', heroTitle: 'يلا ننوّر المدينة.', heroText: 'اشحن BLU، خلّص مهمات ورجّع الحياة للمدينة.', home: 'الرئيسية', tasks: 'المهام', city: 'المدينة', friends: 'الأصحاب', profile: 'الملف', sparks: 'شرارات', energy: 'طاقة', level: 'المستوى', district: 'المنطقة', live: 'متصل بتليجرام', demo: 'وضع المتصفح · التقدم محفوظ هنا', loading: 'نتصل بمدينة BLU…', connectionError: 'ما قدرنا نتصل بسيرفر اللعبة. تقدمك مش متاح حاليًا. افتح اللعبة من تليجرام أو جرّب مرة ثانية.', retry: 'جرّب ثانية', energyTitle: 'طاقة BLU', energyFull: 'مشحون وجاهز للانطلاق', energyLow: 'BLU محتاج شحن', energyNormal: 'كل شرارة بترجع الحياة للمدينة', ready: 'جاهز للعب', mission: 'مهمة الطاقة', missionDesc: 'ابعث BLU لمهمة سريعة.', missionCost: 'بتكلف 10 طاقة', missionReward: 'اكسب {n} شرارة', run: 'ابدأ المهمة', recharge: 'محطة الشحن', rechargeDesc: 'اجمع 30 طاقة كل 3 ساعات.', collect: 'اجمع الطاقة', nextIn: 'جاهز بعد {n} دقيقة', upgrade: 'طوّر BLU', upgradeDesc: 'كل مستوى بزيد 5 شرارات بكل مهمة.', upgradeAction: 'طوّر BLU', nextLevel: 'المستوى الجاي', cost: 'التكلفة', moreEach: '5 شرارات زيادة لكل مهمة', cityTitle: 'مدينتك عم تصحى', cityDesc: 'نوّر منطقة جديدة ووسّع عالمك.', lit: 'مناطق مضاءة', unlock: 'نوّر المنطقة الجاية', maxCity: 'كل المدينة مضاءة!', friendsTitle: 'سوا الطاقة أقوى', friendsDesc: 'ادعُ صاحبك. بعد ما يخلص 3 مهمات بتاخد 50 شرارة.', invited: 'أصحاب انضمّوا', invite: 'ادعُ أصحابك', copy: 'انسخ رابط الدعوة', referralHint: 'رابطك الخاص بيظهر لما تفتح اللعبة من تليجرام.', profileTitle: 'رحلتك مع BLU', totalMissions: 'مهمات مكتملة', cityProgress: 'تقدم المدينة', member: 'مستكشف المدينة', language: 'اللغة', coming: 'قريبًا', comingDesc: 'جدول المتصدرين، المكافأة اليومية والسكينات مخطط لها بتحديث جاي.', backHome: 'ارجع للرئيسية', playNow: 'العب هسا', today: 'مغامرة اليوم', quickActions: 'كمّل التقدم', explore: 'اكتشف عالمك', soon: 'مناطق ثانية بتستناك ورا الأفق.', low_charge: 'الطاقة مش كافية. اشحن BLU أولًا.', low_sparks: 'بدك شرارات أكثر. خلّص مهمة.', cooldown: 'استنى لحد ما تخلص المهلة.', max_level: 'BLU وصل لأعلى مستوى.', max_district: 'كل المناطق مضاءة!', successMission: 'خلصت المهمة! ربحت {n} شرارة', successCharge: 'BLU رجع مليان طاقة!', successUpgrade: 'طلعت مستوى! BLU صار أقوى.', successDistrict: 'منطقة جديدة نوّرت!', offline: 'فشل الاتصال. جرّب ثانية.', notReady: 'افتح اللعبة من تليجرام عشان يطلع رابط الدعوة.', copied: 'نسخنا رابط الدعوة!', gameOnly: 'الشرارات نقاط داخل اللعبة، وما إلها قيمة نقدية.', claimLater: 'مغامرات جديدة بالطريق', shareTitle: 'تعال العب BLU City معي!' }
} as const;

type Copy = { [K in keyof typeof words.en]: string };
function fill(template: string, n: number) { return template.replace('{n}', String(n)); }
function remaining(time: string | null, hours: number, now: number) { if (!time) return 0; return Math.max(0, Math.ceil((new Date(time).getTime() + hours * 3600000 - now) / 60000)); }
function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  const paths: Record<string, React.ReactNode> = {
    bolt: <path d="M13 2 4 13h7l-1 9 10-12h-7l1-8Z"/>,
    home: <><path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-6h6v6"/></>,
    tasks: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 10 1.5 1.5L12 9m2 2h3M8 16h9"/></>,
    city: <><path d="M3 21V9l7-3v15m0-10 5-2v12m0-15 6-3v18H3"/><path d="M6 12v1m0 3v1m6-3v1m6-7v1m0 4v1"/></>,
    friends: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3Zm14-15a3 3 0 0 1 0 6m0 3a5 5 0 0 1 4 5v1h-3"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0H4Z"/></>,
    spark: <><path d="m12 2 2.1 7.9L22 12l-7.9 2.1L12 22l-2.1-7.9L2 12l7.9-2.1L12 2Z"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    gift: <><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12M12 9c-5-1-6-5-3-6 2-1 3 2 3 6Zm0 0c5-1 6-5 3-6-2-1-3 2-3 6Z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg {...common}>{paths[name] || paths.spark}</svg>;
}
function GameButton({ children, onClick, disabled = false, secondary = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; secondary?: boolean }) { return <button className={`game-button ${secondary ? 'secondary' : ''}`} onClick={onClick} disabled={disabled}>{children}<Icon name="arrow" size={18}/></button>; }
function BLUCharacter({ low = false, celebrate = false }: { low?: boolean; celebrate?: boolean }) { return <div className={`blu-character ${low ? 'is-low' : ''} ${celebrate ? 'celebrate' : ''}`}><span className="character-halo"/><span className="orbit orbit-one"/><span className="orbit orbit-two"/><Image src="/blu.webp" alt="BLU, the blue battery character" width={380} height={380} priority /></div>; }

export default function Home() {
  const [connectionCode, setConnectionCode] = useState('');
  const [lang, setLang] = useState<Lang>('en'); const [player, setPlayer] = useState<Player>(initial); const [mode, setMode] = useState<'loading' | 'live' | 'demo' | 'error'>('loading'); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [tick, setTick] = useState(0); const [telegram, setTelegram] = useState<Tg | null>(null); const [celebrate, setCelebrate] = useState(false); const [playing, setPlaying] = useState(false); const [playRequest,setPlayRequest]=useState<PlayRequest>({mode:'story',mission:1});
  const t: Copy = words[lang]; const rtl = lang !== 'en';
  useEffect(() => {
    const tg = window.Telegram?.WebApp || null; setTelegram(tg); tg?.ready(); tg?.expand();
    const pref = tg?.initDataUnsafe?.user?.language_code || navigator.language || 'en'; setLang(pref.startsWith('he') ? 'he' : pref.startsWith('ar') ? 'ar' : 'en');
    if (tg?.initData) {
      fetch('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: tg.initData, action: 'open' }), signal: AbortSignal.timeout(15000) }).then(async r => {
        const d = await r.json();
        if (!r.ok) {
          let code = d.code || `HTTP_${r.status}`;
          if (d.dbCode) code += ` (${d.dbCode})`;
          if (r.status === 401) { try { const check = await fetch('/api/game', { cache: 'no-store', signal: AbortSignal.timeout(15000) }); const health = await check.json(); if (health.code && health.code !== 'SETUP_OK') code = health.code; } catch { /* keep original authentication code */ } }
          setConnectionCode(code); setMode('error'); return;
        }
        setPlayer(d.player); await initializeProgress(tg.initData); setMode('live');
      }).catch(() => { setConnectionCode('NETWORK_OR_TIMEOUT'); setMode('error'); });
    } else {
      void (async()=>{try{
        const ticket=new URLSearchParams(location.search).get('connect');
        if(ticket){const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'connect',ticket})});history.replaceState(null,'',location.pathname);if(!r.ok){setConnectionCode('LINK_EXPIRED');setMessage('Browser connection expired. Open a new link from your Telegram profile.');}}
        await initializeProgress();
        try{const saved=localStorage.getItem('blu_demo');if(saved)setPlayer(JSON.parse(saved));}catch{}
      }catch{setMessage('Could not connect. Please reopen the game.');}finally{setMode('demo');}})();
    }
    const timer = setInterval(() => setTick(Date.now()), 30000); setTick(Date.now()); return () => clearInterval(timer);
  }, []);

  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 4200); return () => clearTimeout(timer); }, [message]);
  useEffect(() => {
    const back = telegram?.BackButton; if (!back || !playing) return;
    const leaveCity = () => setPlaying(false); back.show(); back.onClick(leaveCity);
    return () => { back.offClick(leaveCity); back.hide(); };
  }, [playing, telegram]);
  async function act(action: Action) {
    if (busy || mode === 'error' || mode === 'loading') return; setBusy(true); setMessage(''); let response: { message: string; player: Player } | null = null;
    try {
      if (mode === 'live' && telegram?.initData) { const r = await fetch('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: telegram.initData, action }) }); if (!r.ok) throw Error(); response = await r.json(); }
      else { const p = { ...player }; let code = 'ok'; const now = Date.now(); if (action === 'charge') { if (remaining(p.lastCharge, 3, now)) code = 'cooldown'; else { p.charge = Math.min(100, p.charge + 30); p.lastCharge = new Date(now).toISOString(); } } if (action === 'mission') { if (p.charge < 10) code = 'low_charge'; else if (remaining(p.lastMission, 1, now)) code = 'cooldown'; else { p.charge -= 10; p.sparks += 30 + 5 * (p.level - 1); p.missions++; p.lastMission = new Date(now).toISOString(); } } if (action === 'upgrade') { if (p.sparks < 80 * p.level) code = 'low_sparks'; else if (p.level >= 100) code = 'max_level'; else { p.sparks -= 80 * p.level; p.level++; } } if (action === 'district') { if (p.sparks < 100 * p.district) code = 'low_sparks'; else if (p.district >= 20) code = 'max_district'; else { p.sparks -= 100 * p.district; p.district++; } } response = { message: code, player: p }; if (code === 'ok') localStorage.setItem('blu_demo', JSON.stringify(p)); }
      if (response) { setPlayer(response.player); const success = action === 'mission' ? fill(t.successMission, 30 + 5 * (player.level - 1)) : action === 'charge' ? t.successCharge : action === 'upgrade' ? t.successUpgrade : t.successDistrict; setMessage(response.message === 'ok' ? success : t[response.message as keyof Copy] || response.message); if (response.message === 'ok') { telegram?.HapticFeedback?.impactOccurred('light'); setCelebrate(true); setTimeout(() => setCelebrate(false), 1100); } }
    } catch { setMessage(t.offline); } finally { setBusy(false); setTick(Date.now()); }
  }
  const chargeWait = remaining(player.lastCharge, 3, tick), missionWait = remaining(player.lastMission, 1, tick);
  const invite = telegram?.initDataUnsafe?.user?.id ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'BluCityGame_bot'}?startapp=ref_${telegram.initDataUnsafe.user.id}` : '';
  async function share(copyOnly = false) { if (!invite) { setMessage(t.notReady); return; } try { if (!copyOnly && navigator.share) await navigator.share({ title: t.shareTitle, url: invite }); else { await navigator.clipboard.writeText(invite); setMessage(t.copied); } } catch { /* A cancelled share leaves the page unchanged. */ } }
  const playerName = telegram?.initDataUnsafe?.user?.first_name || 'BLU';
  return <main className="game-shell premium-shell" lang={lang} dir={rtl ? 'rtl' : 'ltr'}>
    <div className="background-stars" aria-hidden="true" />
    <header className="topbar"><div className="logo-lockup"><span className="logo-mark"><Icon name="bolt" size={24} /></span><div><strong>BLU<span className="logo-dot">.</span></strong><small>CITY OF ENERGY</small></div></div><div className="topbar-right"><select className="language-select" aria-label={t.language} value={lang} onChange={e => setLang(e.target.value as Lang)}><option value="en">EN</option><option value="he">עברית</option><option value="ar">عربي</option></select></div></header>
    {mode === 'loading' ? <div className="loading-state" role="status"><div className="loading-battery"><Icon name="bolt" size={36} /></div><p>{t.loading}</p><div className="loading-line" /></div> : mode === 'error' ? <section className="error-state" role="alert"><BLUCharacter low /><h1>{t.connectionError}</h1>{connectionCode && <p dir="ltr" style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 14, overflowWrap: 'anywhere' }}>BLU: {connectionCode}</p>}<GameButton onClick={() => window.location.reload()}>{t.retry}</GameButton></section> : playing ? <PlayableCity lang={lang} onMenu={() => setPlaying(false)} serverRestored={false} challenge={playRequest.mode==='circuit'} mission={playRequest.mode==='story'?playRequest.mission:undefined} onReward={() => { void refreshProgress(); }} /> : <GameHub lang={lang} name={playerName} username={telegram?.initDataUnsafe?.user?.username} live={mode === 'live'} player={player} busy={busy} chargeWait={chargeWait} onPlay={request => {if(request.mode==='story'&&request.mission!==unlockedLevel(getProgress()))return;setPlayRequest(request);setPlaying(true);}} onShare={share} onCharge={() => { void act('charge'); }} backButton={telegram?.BackButton} />}
    {message && <div className="toast" role="status" onClick={() => setMessage('')}><Icon name="spark" size={18} />{message}</div>}
  </main>;
}
