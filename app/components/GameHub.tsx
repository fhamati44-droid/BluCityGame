'use client';
import { localized, translateValue, type Lang } from '../../lib/i18n';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import CoinPacks from './CoinPacks';
import WalletBoundary from './WalletBoundary';
import { useProgress, dispatchProgress, getSyncStatus, useSyncStatus, useWalletTesting, createBrowserLink } from '../../lib/progress-store';
import { ITEMS, DASH_COST_COINS, unlockedLevel, cityName } from '../../lib/levels';
const TonWalletPanel = dynamic(() => import('./TonWalletPanel'), { ssr: false, loading: () => <section className="hub-card" role="status">Loading wallet…</section> });
const WardrobePreview = dynamic(() => import('./WardrobePreview'), { ssr: false });
import { useEffect, useRef, useState } from 'react';
import { claimDailyReward, dailyState, exchangeCoins, upgradeDash, parseLevelProgress, SAVE_KEY, LEVELS, COINS_PER_BLU, DASH_COST_BLU, type LevelProgress, type LevelId } from '../../lib/levels';
type Tab = 'home' | 'missions' | 'upgrades' | 'friends' | 'profile';
export type PlayRequest = {
    mode: 'story';
    mission: LevelId;
} | {
    mode: 'circuit';
};
type Props = {
    lang: Lang;
    name: string;
    username?: string;
    live: boolean;
    player: {
        level: number;
        charge: number;
        referrals: number;
    };
    busy: boolean;
    chargeWait: number;
    onPlay: (request: PlayRequest) => void;
    onShare: (copyOnly?: boolean) => void;
    onCharge: () => void;
    backButton?: {
        show: () => void;
        hide: () => void;
        onClick: (fn: () => void) => void;
        offClick: (fn: () => void) => void;
    };
};
const text = {
    en: { home: 'Home', missions: 'Missions', upgrades: 'BLU', friends: 'Friends', profile: 'Profile', hello: 'Welcome back,', title: 'THE CITY NEEDS YOU', intro: 'Find energy. Restore the grid. Bring BLU City to life', play: 'ENTER THE CITY', resume: 'CONTINUE ADVENTURE', zone: 'CENTRAL GRID', level: 'Level', coins: 'Coin', blu: 'BLU', complete: 'Complete', collected: 'Collected', locked: 'Locked', ready: 'Ready', mission1: 'Light up the city', mission2: 'Metro Rush', desc1: 'Find 3 energy cells and charge the main generator. Watch the streets light up', desc2: 'Recover 2 signal cores and charge the station to bring the metro back', next: 'YOUR NEXT MOVE', progress: 'City restored', daily: 'DAILY CHARGE', dailyHint: 'Come back tomorrow for the next reward. A missed day restarts the streak', claim: 'Claim reward', claimed: 'Claimed today', day: 'Day', allDone: 'Central Grid restored', allDoneDesc: 'Both missions are complete. Explore the rail and secret routes while the next chapter is being built', explore: 'EXPLORE THE CITY', upgradeTitle: 'MAKE BLU YOURS', upgradeIntro: 'Earn Coin in the city. Equip BLU and improve your abilities', dash: 'Extended dash', dashDesc: 'Travel farther with every dash. Each upgrade adds 0.1 seconds', current: 'Now', after: 'Next', upgrade: 'Upgrade dash', max: 'Fully upgraded', exchangeTitle: 'Coin → BLU', exchangeDesc: 'Turn mission rewards into BLU for ability upgrades', exchange: 'Convert', insufficient: 'Not enough', getCoins: 'Earn Coin in missions or collect your daily reward', guide: 'HOW TO PLAY', move: 'Move', moveHint: 'Use the left joystick. On desktop: WASD', jump: 'Jump', jumpHint: 'Swipe up or tap Jump. Tap again for a double jump', dashHint: 'Tap Dash with at least 12 energy. Hold Charge at an objective', energy: 'STATION ENERGY', charge: 'Recharge', charging: 'Ready in', minutes: 'min', stationHint: 'Station reserve is separate from the energy collected inside the city', friendsTitle: 'POWER UP TOGETHER', friendsIntro: 'Invite a friend into BLU City. The adventure comes first', joined: 'Friends joined', invite: 'Invite a friend', copy: 'Copy link', inTelegram: 'Invites are available when you open the game in Telegram', community: 'Community races', communityHint: 'Multiplayer challenges and a verified leaderboard are planned. No rankings are available yet', profileTitle: 'YOUR BLU JOURNEY', explorer: 'Central Grid explorer', achievements: 'ACHIEVEMENTS', badge1: 'First light', badge2: 'Metro restored', badge3: 'Dash engineer', saved: 'City progress, Coin and BLU are saved on this device', gameOnly: 'BLU and Coin are internal game currencies with no cash value', learn: 'Meet BLU', tutorial1: 'BLU is a living battery. The city has lost its power, and you can bring it back', tutorial2: 'Move through Central Grid, collect cells and hold Charge at the generator', tutorial3: 'Finish missions for Coin. Buy equipment and improve your dash — no wallet needed', nextStep: 'Next', start: 'Let’s play', skip: 'Skip', help: 'Controls', reward: 'Reward collected', exchanged: 'Converted to BLU', upgraded: 'Dash upgraded', saveError: 'Could not save. Your balance was not changed', local: 'Device save', connected: 'Telegram connected', openNext: 'Complete Level 1 to unlock', future: 'ENERGY TOWER', futureHint: 'Next chapter · in development', counter: 'Missions completed', preview: 'Shop and skins', previewHint: 'Classic BLU is equipped. More skins are planned', seconds: 'sec' },
    he: { home: 'בית', missions: 'משימות', upgrades: 'BLU', friends: 'חברים', profile: 'פרופיל', hello: 'ברוך שובך,', title: 'העיר צריכה אותך', intro: 'מצא אנרגיה. הפעל את הרשת. החזר חיים לעיר של BLU', play: 'היכנס לעיר', resume: 'המשך בהרפתקה', zone: 'CENTRAL GRID', level: 'שלב', coins: 'Coin', blu: 'BLU', complete: 'הושלם', collected: 'נאספו', locked: 'נעול', ready: 'מוכן', mission1: 'מאירים את העיר', mission2: 'מרוץ המטרו', desc1: 'מצא 3 תאי אנרגיה וטען את הגנרטור הראשי. ראה את הרחובות נדלקים', desc2: 'אסוף 2 ליבות איתות וטען את התחנה כדי להחזיר את המטרו לפעולה', next: 'הצעד הבא שלך', progress: 'העיר התעוררה', daily: 'טעינה יומית', dailyHint: 'חזור מחר לפרס הבא. יום ללא איסוף מתחיל את הרצף מחדש', claim: 'אסוף פרס', claimed: 'נאסף היום', day: 'יום', allDone: 'Central Grid חזר לחיים', allDoneDesc: 'שתי המשימות הושלמו. חקור את המסילה ואת הדרכים הסודיות בזמן שהפרק הבא נבנה', explore: 'חקור את העיר', upgradeTitle: 'BLU בדרך שלך', upgradeIntro: 'הרווח Coin בעיר. צייד את BLU ושדרג את היכולות שלו', dash: 'דאש ארוך', dashDesc: 'עבור מרחק גדול יותר בכל דאש. כל שדרוג מוסיף 0.1 שניות', current: 'עכשיו', after: 'הבא', upgrade: 'שדרג דאש', max: 'שודרג עד הסוף', exchangeTitle: 'Coin → BLU', exchangeDesc: 'המר את פרסי המשימות ל־BLU ושדרג את היכולות שלך', exchange: 'המר', insufficient: 'אין מספיק', getCoins: 'קבל Coin במשימות או באיסוף הפרס היומי', guide: 'איך משחקים', move: 'תנועה', moveHint: 'השתמש בג׳ויסטיק משמאל. במחשב: WASD', jump: 'קפיצה', jumpHint: 'החלק למעלה או לחץ קפיצה. לחץ שוב לקפיצה כפולה', dashHint: 'לחץ דאש עם לפחות 12 אנרגיה. החזק טעינה ליד יעד', energy: 'אנרגיית התחנה', charge: 'טען', charging: 'מוכן בעוד', minutes: 'דק׳', stationHint: 'עתודת התחנה נפרדת מהאנרגיה שאוספים בתוך העיר', friendsTitle: 'ביחד מאירים יותר', friendsIntro: 'הזמן חבר לעיר של BLU. ההרפתקה במרכז', joined: 'חברים שהצטרפו', invite: 'הזמן חבר', copy: 'העתק קישור', inTelegram: 'הזמנות זמינות כשפותחים את המשחק מתוך טלגרם', community: 'מרוצי הקהילה', communityHint: 'אתגרים משותפים וטבלת מובילים מאומתת מתוכננים בהמשך. עדיין אין דירוג', profileTitle: 'המסע שלך עם BLU', explorer: 'חוקר Central Grid', achievements: 'הישגים', badge1: 'האור הראשון', badge2: 'המטרו חוזר', badge3: 'מומחה דאש', saved: 'ההתקדמות בעיר, Coin ו־BLU נשמרים במכשיר הזה', gameOnly: 'BLU ו־Coin הם מטבעות משחק פנימיים ללא ערך כספי', learn: 'מכירים את BLU', tutorial1: 'BLU הוא סוללה חיה. העיר איבדה את החשמל שלה — ואתה יכול להחזיר אותו', tutorial2: 'נוע ב־Central Grid, אסוף תאים והחזק טעינה ליד הגנרטור', tutorial3: 'השלם משימות וקבל Coin. קנה ציוד ושדרג את הדאש — בלי ארנק', nextStep: 'הבא', start: 'מתחילים לשחק', skip: 'דלג', help: 'שליטה', reward: 'הפרס נאסף', exchanged: 'המטבעות הומרו ל־BLU', upgraded: 'הדאש שודרג', saveError: 'השמירה נכשלה. היתרה לא השתנתה', local: 'שמירה במכשיר', connected: 'מחובר לטלגרם', openNext: 'השלם את שלב 1 כדי לפתוח', future: 'מגדל האנרגיה', futureHint: 'הפרק הבא · בפיתוח', counter: 'משימות שהושלמו', preview: 'חנות וסקינים', previewHint: 'Classic BLU נבחר. סקינים נוספים מתוכננים בהמשך', seconds: 'שניות' },
    ar: { home: 'الرئيسية', missions: 'المهام', upgrades: 'BLU', friends: 'الأصحاب', profile: 'الملف', hello: 'أهلًا برجعتك،', title: 'المدينة محتاجتك', intro: 'اجمع الطاقة. شغّل الشبكة. رجّع الحياة لمدينة BLU', play: 'ادخل المدينة', resume: 'كمّل المغامرة', zone: 'CENTRAL GRID', level: 'المرحلة', coins: 'Coin', blu: 'BLU', complete: 'مكتملة', collected: 'تم جمعها', locked: 'مقفلة', ready: 'جاهزة', mission1: 'نوّر المدينة', mission2: 'سباق المترو', desc1: 'اجمع 3 خلايا طاقة واشحن المولّد الرئيسي. شوف الشوارع بتنور', desc2: 'اجمع نواتين للإشارة واشحن المحطة لترجع المترو يشتغل', next: 'خطوتك الجاية', progress: 'المدينة رجعت للحياة', daily: 'الشحن اليومي', dailyHint: 'ارجع بكرا للمكافأة الجاية. يوم بدون جمع برجع السلسلة من الأول', claim: 'اجمع المكافأة', claimed: 'انجمعت اليوم', day: 'يوم', allDone: 'Central Grid رجعت للحياة', allDoneDesc: 'خلصت المهمتين. اكتشف السكة والطرق السرية لحد ما يجهز الفصل الجاي', explore: 'اكتشف المدينة', upgradeTitle: 'BLU على طريقتك', upgradeIntro: 'اكسب Coin بالمدينة وجهّز BLU وطوّر قدراته', dash: 'اندفاع أطول', dashDesc: 'اقطع مسافة أكبر مع كل اندفاع. كل تطوير بضيف 0.1 ثانية', current: 'هسا', after: 'الجاي', upgrade: 'طوّر الاندفاع', max: 'التطوير كامل', exchangeTitle: 'Coin → BLU', exchangeDesc: 'حوّل مكافآت المهام إلى BLU وطوّر قدراتك', exchange: 'حوّل', insufficient: 'الرصيد مش كافي', getCoins: 'اكسب Coin من المهام أو من المكافأة اليومية', guide: 'كيف تلعب', move: 'الحركة', moveHint: 'استخدم العصا عاليسار. عالكمبيوتر: WASD', jump: 'القفز', jumpHint: 'اسحب لفوق أو اضغط اقفز. اضغط مرة ثانية للقفزة المزدوجة', dashHint: 'اضغط اندفاع مع 12 طاقة على الأقل. اضغط الشحن مطولًا عند الهدف', energy: 'طاقة المحطة', charge: 'اشحن', charging: 'جاهزة بعد', minutes: 'دقيقة', stationHint: 'احتياطي المحطة منفصل عن الطاقة اللي بتجمعها داخل المدينة', friendsTitle: 'سوا مننوّر أكثر', friendsIntro: 'ادعُ صاحبك لمدينة BLU. المغامرة أولًا', joined: 'أصحاب انضمّوا', invite: 'ادعُ صاحبك', copy: 'انسخ الرابط', inTelegram: 'الدعوات متاحة لما تفتح اللعبة من تليجرام', community: 'سباقات المجتمع', communityHint: 'التحديات المشتركة وجدول متصدرين موثّق مخطط لها لاحقًا. ما في ترتيب حاليًا', profileTitle: 'رحلتك مع BLU', explorer: 'مستكشف Central Grid', achievements: 'الإنجازات', badge1: 'أول ضو', badge2: 'المترو رجع', badge3: 'خبير الاندفاع', saved: 'تقدم المدينة وCoin وBLU محفوظين على هالجهاز', gameOnly: 'BLU وCoin عملات داخل اللعبة وما إلها قيمة نقدية', learn: 'تعرّف على BLU', tutorial1: 'BLU بطارية حيّة. المدينة فقدت الكهربا — وإنت بتقدر ترجعها', tutorial2: 'تحرّك في Central Grid، اجمع الخلايا واضغط الشحن عند المولّد', tutorial3: 'خلّص المهام واكسب Coin. اشترِ معدات وطوّر الاندفاع بدون محفظة', nextStep: 'التالي', start: 'يلا نلعب', skip: 'تخطّى', help: 'التحكم', reward: 'انجمعت المكافأة', exchanged: 'تم التحويل إلى BLU', upgraded: 'تطوّر الاندفاع', saveError: 'فشل الحفظ. الرصيد ما تغيّر', local: 'حفظ على الجهاز', connected: 'متصل بتليجرام', openNext: 'خلّص المرحلة 1 لتفتحها', future: 'برج الطاقة', futureHint: 'الفصل الجاي · قيد التطوير', counter: 'مهام مكتملة', preview: 'المتجر والسكينات', previewHint: 'Classic BLU مجهّز. سكينات إضافية مخطط لها لاحقًا', seconds: 'ثانية' },
};
const paths: Record<string, string> = { home: 'M3 10 12 3l9 7v10H3Zm6 10v-6h6v6', missions: 'M5 3h14v18H5Zm3 5h8M8 12h8M8 16h5', upgrades: 'M13 2 4 13h7l-1 9 10-12h-7Z', friends: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 9v-3a6 6 0 0 1 12 0v3Zm14-16a4 4 0 0 1 0 7m1 3a5 5 0 0 1 3 6', profile: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM4 22v-2a8 8 0 0 1 16 0v2', coin: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm3-15h-4a3 3 0 0 0 0 6h2a2 2 0 0 1 0 4H9m3-12v14', arrow: 'M5 12h14m-6-6 6 6-6 6', check: 'm5 12 4 4L19 6', lock: 'M6 10h12v11H6Zm3 0V6a3 3 0 0 1 6 0v4', gift: 'M3 9h18v12H3Zm0 4h18M12 9v12m0-12C3 9 5 1 8 3c3 1 4 6 4 6Zm0 0c9 0 7-8 4-6-3 1-4 6-4 6Z', trophy: 'M7 3h10v7a5 5 0 0 1-10 0Zm0 2H3v4a4 4 0 0 0 4 4m10-8h4v4a4 4 0 0 1-4 4M12 15v6m-4 0h8', info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v6m0-10v1' };
function HubIcon({ name, size = 22 }: {
    name: string;
    size?: number;
}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.upgrades}/></svg>; }
function HubButton({ children, onClick, disabled, secondary = false }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    secondary?: boolean;
}) { return <button className={`hub-button ${secondary ? 'secondary' : ''}`} onClick={onClick} disabled={disabled}>{children}<HubIcon name="arrow" size={18}/></button>; }
function ProgressBar({ value, label }: {
    value: number;
    label: string;
}) { return <div className="hub-progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }}/></div>; }
function GameCard({ children, className = '' }: {
    children: React.ReactNode;
    className?: string;
}) { return <section className={`hub-card ${className}`}>{children}</section>; }
export default function GameHub({ lang, name, username, live, player, busy, chargeWait, onPlay, onShare, onCharge, backButton }: Props) {
    const t = localized(lang, text);
    const [tab, setTab] = useState<Tab>('home');
    const [walletVisited, setWalletVisited] = useState(false);
    const progress = useProgress();
    const sync = useSyncStatus();
    const walletTesting = useWalletTesting();
    const beta = localized(lang, { en: "Open beta · Play without a wallet. Coin is for game upgrades and has no cash value. Beta progress does not guarantee future tokens", he: "בטא פתוחה · משחקים בלי ארנק. Coin משמש לשדרוגים במשחק וללא ערך כספי. ההתקדמות בבטא אינה מבטיחה טוקנים בעתיד", ar: "نسخة تجريبية مفتوحة · العب بدون محفظة. Coin للتطوير داخل اللعبة وبدون قيمة نقدية. التقدم بالتجربة لا يضمن توكنات مستقبلًا" });
    const labels = localized(lang, { en: { shop: "Equipment", buy: "Buy", owned: "Owned", equip: "Equip", equipped: "Equipped", classic: "Classic BLU", run: "Energy circuit", runHint: "Collect 20 bolts, then charge the finish beacon. +40 Coin per run. Minimum 20 seconds; one-minute reward cooldown", link: "Connect this account to a browser", sync: "Cloud save", setup: "Cloud setup required · device save", failed: "Sync failed · reopen before spending", buyCoins: "Buy Coin", pending: "Coin purchases require payment setup", linked: "One-time link copied. Open in your browser within 10 minutes", desc: ["Carry one cell at a time to the shop. Complete 3 deliveries, then charge the shop", "Take the bounce pad to the rooftops. Catch the drone energy trail", "Find repair tools and escort the mechanic to the workshop", "Activate three power nodes and charge the district gate"] }, he: { shop: "ציוד ומראה", buy: "קנה", owned: "בבעלותך", equip: "לבש", equipped: "נבחר", classic: "BLU קלאסי", run: "מסלול האנרגיה", runHint: "אסוף 20 ברקים וטען את נקודת הסיום. 40 Coin לכל סיבוב. לפחות 20 שניות; דקת המתנה בין פרסים", link: "חבר את החשבון הזה לדפדפן", sync: "שמירה בענן", setup: "נדרשת הגדרת ענן · שמירה במכשיר", failed: "הסנכרון נכשל · פתח מחדש לפני קנייה", buyCoins: "קנה Coin", pending: "רכישת Coin דורשת הגדרת תשלומים", linked: "קישור חד־פעמי הועתק. פתח בדפדפן תוך 10 דקות", desc: ["קח תא אחד בכל פעם והבא אותו לחנות. השלם 3 משלוחים ואז טען את החנות", "השתמש במקפצה כדי לעלות לגגות. תפוס את עקבות הרחפן", "מצא כלי תיקון ולווה את המכונאי לסדנה", "החזק טעינה ליד כל אחת משלוש נקודות הכוח, ואז טען את שער הרובע"] }, ar: { shop: "معدات ومظهر", buy: "اشترِ", owned: "ملكك", equip: "البس", equipped: "مجهّز", classic: "BLU كلاسيكي", run: "مسار الطاقة", runHint: "اجمع 20 برق واشحن نقطة النهاية. 40 Coin للجولة. 20 ثانية على الأقل ودقيقة بين المكافآت", link: "اربط الحساب بالمتصفح", sync: "حفظ سحابي", setup: "إعداد السحابة مطلوب · حفظ محلي", failed: "فشل التزامن · افتح من جديد قبل الشراء", buyCoins: "اشترِ Coin", pending: "شراء Coin بحاجة لإعداد الدفع", linked: "تم نسخ رابط لمرة واحدة. افتحه خلال عشر دقائق", desc: ["وصّل خلية واحدة كل مرة للدكان. أكمل 3 توصيلات ثم اشحن الدكان", "استخدم منصة القفز للوصول للسطوح واتبع الدرون", "اجمع أدوات التصليح ورافق الميكانيكي للورشة", "شغّل ثلاث نقاط طاقة واشحن بوابة الحي"] } });
    const [hydrated, setHydrated] = useState(false);
    const [toast, setToast] = useState('');
    const [modal, setModal] = useState<'daily' | 'controls' | 'onboarding' | null>(null);
    const [step, setStep] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const modalRef = useRef<HTMLElement>(null);
    useEffect(() => { try {
        if (!localStorage.getItem('blu_onboarding_v1'))
            setModal('onboarding');
    }
    catch { /* a fresh session still works */ } setHydrated(true); const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
    useEffect(() => { if (!toast)
        return; const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); }, [toast]);
    useEffect(() => { if (!backButton)
        return; const back = () => { if (modal)
        setModal(null);
    else
        setTab('home'); }; if (tab !== 'home' || modal) {
        backButton.show();
        backButton.onClick(back);
    }
    else
        backButton.hide(); return () => backButton.offClick(back); }, [backButton, tab, modal]);
    useEffect(() => {
        if (!modal)
            return;
        const previous = document.activeElement as HTMLElement | null;
        const panel = modalRef.current;
        panel?.querySelector<HTMLElement>('button')?.focus();
        const keyboard = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                setModal(null);
            if (e.key !== 'Tab' || !panel)
                return;
            const targets = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')];
            const first = targets[0], last = targets[targets.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            }
            else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        };
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', keyboard);
        return () => { window.removeEventListener('keydown', keyboard); document.body.style.overflow = overflow; previous?.focus(); };
    }, [modal]);
    const daily = dailyState(progress, now);
    const done = progress.completed.length;
    const cityLabel = `Level ${progress.cityLevel} · ${cityName(progress.cityLevel, lang)}`;
    const nextCity = translateValue(lang, lang === 'he' ? 'העיר התעוררה! פתח עיר גדולה יותר' : translateValue(lang, lang === 'ar' ? 'المدينة استيقظت! افتح مدينة أكبر' : 'City awakened! Open a larger city'));
    const active = unlockedLevel(progress);
    const missionNames = LEVELS.map(l => localized(lang, l.names));
    const select = (value: Tab) => { setTab(value); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const perform = (command: import('../../lib/levels').GameCommand, message: string) => { if ((sync === 'sync-error' || sync === 'offline' || sync === 'storage-error')) {
        setToast(labels.failed);
        return;
    } const next = dispatchProgress(command); if (next !== progress) {
        setToast(message);
        navigator.vibrate?.(12);
    } };
    const wardrobe = <><WardrobePreview /><GameCard><h2>{labels.shop}</h2><p>{translateValue(lang, lang === 'he' ? 'הציוד מתעדכן על BLU בתוך העיר. פריטים תפקודיים מופעלים לאחר הקנייה' : translateValue(lang, lang === 'ar' ? 'المعدات بتظهر على BLU داخل المدينة. القدرات بتشتغل بعد الشراء' : 'Equipment appears on BLU in the city. Ability equipment activates on purchase'))}</p><HubButton secondary onClick={() => perform({ type: 'equip', id: 'classic' }, labels.equipped)}>{labels.classic} {progress.skin === 'classic' ? '✓' : ''}</HubButton></GameCard>{ITEMS.map(item => { const owned = progress.inventory.includes(item.id), skin = item.id === 'neon' || item.id === 'gold'; return <GameCard key={item.id}><div className="hub-card-top"><span className="equipment-swatch" style={{ background: item.color }}/><span>{owned ? labels.owned : `${item.cost} Coin`}</span></div><h2>{localized(lang, item.names)}</h2><p>{localized(lang, item.desc)}</p><HubButton disabled={owned ? !skin : progress.coins < item.cost} onClick={() => perform({ type: owned ? 'equip' : 'buy', id: item.id }, owned ? labels.equipped : labels.owned)}>{owned ? skin ? progress.skin === item.id ? labels.equipped : labels.equip : labels.owned : `${labels.buy} · ${item.cost} Coin`}</HubButton></GameCard>; })}<CoinPacks lang={lang} live={live} onToast={setToast}/></>;
    const finishIntro = () => { try {
        localStorage.setItem('blu_onboarding_v1', '1');
    }
    catch { } setModal(null); };
    const missionCard = (index: number) => {
        const level = LEVELS[index], completed = progress.completed.includes(level.id), locked = level.id > active;
        const got = progress.objectives[level.id].filter(Boolean).length;
        return <GameCard className={`hub-mission-card ${locked ? 'locked' : ''}`} key={level.id}><div className="hub-card-top"><span className="hub-level">{t.missions} {level.id}</span><span className={`hub-state ${completed ? 'complete' : ''}`}><HubIcon name={completed ? 'check' : locked ? 'lock' : 'upgrades'} size={13}/>{completed ? t.complete : locked ? t.locked : t.ready}</span></div><h2>{missionNames[index]}</h2><p>{index === 0 ? t.desc1 : index === 1 ? t.desc2 : labels.desc[index - 2]}</p><ProgressBar value={got / level.required * 100} label={missionNames[index]}/><div className="hub-card-meta"><span>{got}/{level.required} {t.collected}</span><b dir="ltr">+{level.rewardCoins} Coin</b></div>{!completed && <HubButton onClick={() => onPlay({ mode: 'story', mission: level.id })} disabled={locked}>{locked ? `${t.level} ${level.id - 1} → ${t.level} ${level.id}` : t.play}</HubButton>}</GameCard>;
    };
    return <div className="game-hub">
    <div className="hub-status"><i className={live ? 'live' : ''}/>{sync === 'cloud' ? labels.sync : sync === 'saving' ? labels.sync + '…' : sync === 'setup-required' ? labels.setup : (sync === 'sync-error' || sync === 'offline' || sync === 'storage-error') ? labels.failed : t.local}<button onClick={() => setModal('controls')} aria-label={t.help}><HubIcon name="info" size={17}/>{t.help}</button></div>
    <div className="hub-wallet" aria-label="Game currencies"><div className="coin"><HubIcon name="coin"/><span><small>COIN</small><strong>{hydrated ? progress.coins.toLocaleString(lang) : '—'}</strong></span></div>{walletTesting && <div className="blu"><HubIcon name="upgrades"/><span><small>BLU</small><strong>{hydrated ? progress.blu.toLocaleString(lang) : '—'}</strong></span></div>}</div>
    <p className="hub-storage-note">{beta}</p>
    {walletTesting && (walletVisited ? <div hidden={tab !== 'upgrades'}><WalletBoundary lang={lang}><TonWalletPanel lang={lang}/></WalletBoundary></div> : tab === 'upgrades' && <GameCard><h2>{translateValue(lang, lang === 'he' ? 'ארנק BLU' : translateValue(lang, lang === 'ar' ? 'محفظة BLU' : 'BLU wallet'))}</h2><p>{translateValue(lang, lang === 'he' ? 'TESTNET · לחץ כדי לטעון את הארנק ולשחזר חיבור קיים' : translateValue(lang, lang === 'ar' ? 'TESTNET · اضغط لتحميل المحفظة واستعادة الاتصال' : 'TESTNET · Load the wallet to restore an existing connection'))}</p><HubButton onClick={() => setWalletVisited(true)}>{translateValue(lang, lang === 'he' ? 'הצג ארנק' : translateValue(lang, lang === 'ar' ? 'عرض المحفظة' : 'Show wallet'))}</HubButton></GameCard>)}
    <div key={tab} className="hub-screen">
      {tab === 'home' && <>
        <section className={`hub-hero ${progress.restored ? 'powered' : ''}`}><div className="hub-city-silhouette" aria-hidden="true">{[32, 65, 45, 95, 58, 110, 75, 48, 88].map((height, i) => <i key={i} style={{ height: `${height}px` }}/>)}</div><span className="hub-zone"><i />{cityLabel}</span><p className="hub-greeting">{t.hello} {name}</p><h1>{t.title}</h1><p className="hub-hero-intro">{t.intro}</p><div className="hub-mascot"><span /><Image src="/blu.webp" alt="BLU" width={300} height={300} priority/></div><div className="hub-hero-bottom"><span>{t.missions} {active} · {missionNames[active - 1]}</span><HubButton onClick={() => onPlay({ mode: 'story', mission: active })}>{done === 6 ? t.explore : progress.cells.some(Boolean) || progress.restored ? t.resume : t.play}</HubButton></div></section>
        <div className="hub-heading"><span>{t.next}</span><button onClick={() => select('missions')}>{t.missions}<HubIcon name="arrow" size={15}/></button></div>
        {done === 6 ? <GameCard><span className="hub-card-emblem"><HubIcon name="check"/></span><h2>{nextCity}</h2><p>{translateValue(lang, lang === 'he' ? 'שש משימות הושלמו. הציוד והיתרות נשמרים בעיר הבאה' : translateValue(lang, lang === 'ar' ? 'أكملت ست مهام. المعدات والرصيد يبقون في المدينة التالية' : 'Six missions complete. Your equipment and balances carry into the next city'))}</p><HubButton onClick={() => { perform({ type: 'next-city' }, nextCity); }}>{nextCity} · Level {progress.cityLevel + 1}</HubButton><ProgressBar value={100} label={t.progress}/></GameCard> : missionCard(active - 1)}
        <button className="hub-daily-teaser" onClick={() => setModal('daily')}><span className="hub-gift"><HubIcon name="gift" size={28}/></span><span><small>{t.daily}</small><strong>{daily.claimed ? t.claimed : `+${daily.reward} Coin`}</strong><em>{t.day} {daily.day}/7</em></span><HubIcon name={daily.claimed ? 'check' : 'arrow'}/></button>
        <GameCard className="hub-mini-world"><div><small>{cityLabel}</small><h2>{t.progress}</h2><p>{done}/6 {t.counter}</p></div><div className="hub-ring" style={{ ['--progress' as string]: `${Math.round(done / 6 * 100)}%` }}><strong>{Math.round(done / 6 * 100)}%</strong></div></GameCard>
      </>}
      {tab === 'missions' && <><p className="hub-eyebrow">{cityLabel}</p><h1>{t.missions}</h1><p className="hub-lead">{t.intro}</p>{LEVELS.map((_, i) => missionCard(i))}<GameCard><h2>{labels.run}</h2><p>{labels.runHint}</p><p>{progress.runs} × · {progress.runBest || "—"} s</p><HubButton disabled={done < 2 || now - progress.lastRun < 60000} onClick={() => onPlay({ mode: 'circuit' })}>{labels.run} · +40 Coin</HubButton></GameCard></>}
      {tab === 'upgrades' && <><p className="hub-eyebrow">BLU LAB</p><h1>{t.upgradeTitle}</h1><p className="hub-lead">{t.upgradeIntro}</p><GameCard className="hub-upgrade-card"><div className="hub-card-top"><span className="hub-card-emblem"><HubIcon name="upgrades"/></span><span className="hub-state">{progress.dashLevel}/3</span></div><h2>{t.dash}</h2><p>{t.dashDesc}</p><div className="hub-upgrade-compare"><div><small>{t.current}</small><strong>{(.34 + progress.dashLevel * .1).toFixed(2)} <em>{t.seconds}</em></strong></div><HubIcon name="arrow"/><div><small>{t.after}</small><strong>{(.34 + Math.min(3, progress.dashLevel + 1) * .1).toFixed(2)} <em>{t.seconds}</em></strong></div></div><ProgressBar value={progress.dashLevel / 3 * 100} label={t.dash}/><HubButton onClick={() => perform({ type: 'dash' }, t.upgraded)} disabled={progress.coins < DASH_COST_COINS && (!walletTesting || progress.blu < DASH_COST_BLU) || progress.dashLevel >= 3}>{progress.dashLevel >= 3 ? t.max : `${t.upgrade} · ${DASH_COST_COINS} Coin${walletTesting ? " / 2 BLU" : ""}`}</HubButton>{progress.coins < DASH_COST_COINS && (!walletTesting || progress.blu < DASH_COST_BLU) && progress.dashLevel < 3 && <small className="hub-note">{t.insufficient} Coin{walletTesting ? " / BLU" : ""}</small>}</GameCard>{walletTesting && <GameCard><h2 dir="ltr">{t.exchangeTitle}</h2><p>{t.exchangeDesc}</p><div className="hub-exchange-rate" dir="ltr"><b>{COINS_PER_BLU} Coin</b><HubIcon name="arrow"/><b>1 BLU</b></div><HubButton secondary onClick={() => perform({ type: 'exchange' }, t.exchanged)} disabled={progress.coins < COINS_PER_BLU}>{t.exchange}</HubButton><small className="hub-note">{t.getCoins}</small></GameCard>}{wardrobe}</>}
      {tab === 'friends' && <><p className="hub-eyebrow">BLU COMMUNITY</p><h1>{t.friendsTitle}</h1><p className="hub-lead">{t.friendsIntro}</p><div className="hub-friends-art"><span><HubIcon name="friends" size={40}/></span><Image src="/blu.webp" alt="BLU" width={180} height={180}/></div><GameCard><div className="hub-friend-count"><strong>{player.referrals}</strong><span>{t.joined}</span></div><HubButton onClick={() => onShare(false)} disabled={!live}>{t.invite}</HubButton><HubButton secondary onClick={() => onShare(true)} disabled={!live}>{t.copy}</HubButton>{!live && <small className="hub-note">{t.inTelegram}</small>}</GameCard><GameCard className="hub-future"><HubIcon name="trophy" size={28}/><h2>{t.community}</h2><p>{t.communityHint}</p></GameCard></>}
      {tab === 'profile' && <><p className="hub-eyebrow">BLU EXPLORER</p><h1>{t.profileTitle}</h1><GameCard className="hub-profile"><div className="hub-avatar">{name.slice(0, 1).toUpperCase()}</div><div><h2>{name}</h2><p>{username ? `@${username}` : t.explorer}</p></div></GameCard><div className="hub-stat-grid"><GameCard><HubIcon name="missions"/><strong>{done}/6</strong><small>{t.counter}</small></GameCard><GameCard><HubIcon name="upgrades"/><strong>{progress.dashLevel}/3</strong><small>{t.dash}</small></GameCard></div><div className="hub-heading"><span>{t.achievements}</span></div><div className="hub-badges">{[progress.restored, progress.metroDone, progress.dashLevel > 0].map((earned, i) => <div key={i} className={earned ? 'earned' : ''}><HubIcon name={earned ? 'trophy' : 'lock'} size={25}/><span>{[t.badge1, t.badge2, t.badge3][i]}</span></div>)}</div><p className="hub-storage-note"><HubIcon name="info" size={16}/>{sync === 'cloud' ? labels.sync : t.saved}</p>{live && <HubButton secondary onClick={async () => { try {
        await navigator.clipboard.writeText(await createBrowserLink());
        setToast(labels.linked);
    }
    catch {
        setToast(labels.setup);
    } }}>{labels.link}</HubButton>}{!live && <a className="hub-text-button" href="https://t.me/BluCityGame_bot">Telegram · BLU CITY</a>}<button className="hub-text-button" onClick={() => { setStep(0); setModal('onboarding'); }}>{t.learn}</button></>}
    </div>
    <p className="hub-legal">{t.gameOnly}</p>
    <nav className="hub-nav" aria-label={t.home}>{(['home', 'missions', 'upgrades', 'friends', 'profile'] as Tab[]).map(value => <button key={value} aria-current={tab === value ? 'page' : undefined} className={tab === value ? 'active' : ''} onClick={() => select(value)}><HubIcon name={value}/><span>{t[value]}</span></button>)}</nav>
    {modal && <div className="hub-modal-backdrop" onClick={() => setModal(null)}><section ref={modalRef} className="hub-modal" role="dialog" aria-modal="true" aria-labelledby="hub-modal-title" onClick={e => e.stopPropagation()}><button className="hub-modal-close" aria-label={translateValue(lang, lang === 'he' ? 'סגור' : translateValue(lang, lang === 'ar' ? 'إغلاق' : 'Close'))} onClick={() => setModal(null)}>×</button>
      {modal === 'daily' ? <><span className="hub-modal-icon"><HubIcon name="gift" size={36}/></span><h2 id="hub-modal-title">{t.daily}</h2><p>{t.dailyHint}</p><div className="hub-daily-days">{[20, 30, 40, 50, 60, 80, 100].map((reward, i) => <div key={i} className={`${i + 1 === daily.day ? 'today' : ''} ${i + 1 < daily.day || i + 1 === daily.day && daily.claimed ? 'claimed' : ''}`}><small>{t.day} {i + 1}</small><HubIcon name={i + 1 < daily.day || i + 1 === daily.day && daily.claimed ? 'check' : 'coin'} size={20}/><b>+{reward}</b></div>)}</div><HubButton disabled={daily.claimed} onClick={() => perform({ type: 'daily' }, t.reward)}>{daily.claimed ? t.claimed : `${t.claim} · +${daily.reward} Coin`}</HubButton></> : modal === 'controls' ? <><h2 id="hub-modal-title">{t.guide}</h2><div className="hub-control-tip"><b>01 · {t.move}</b><p>{t.moveHint}</p></div><div className="hub-control-tip"><b>02 · {t.jump}</b><p>{t.jumpHint}</p></div><div className="hub-control-tip"><b>03 · BLU</b><p>{t.dashHint}</p></div><HubButton onClick={() => setModal(null)}>{t.ready}</HubButton></> : <><Image className="hub-intro-blu" src="/blu.webp" alt="BLU" width={180} height={180}/><div className="hub-intro-dots">{[0, 1, 2].map(i => <i key={i} className={i === step ? 'active' : ''}/>)}</div><h2 id="hub-modal-title">{[t.learn, t.mission1, t.upgradeTitle][step]}</h2><p>{[t.tutorial1, t.tutorial2, t.tutorial3][step]}</p><HubButton onClick={() => { if (step < 2)
            setStep(step + 1);
        else {
            finishIntro();
            onPlay({ mode: 'story', mission: active });
        } }}>{step < 2 ? t.nextStep : t.start}</HubButton><button className="hub-text-button" onClick={finishIntro}>{t.skip}</button></>}
    </section></div>}
    {toast && <div className="hub-toast" role="status"><HubIcon name="check" size={18}/>{toast}</div>}
  </div>;
}
