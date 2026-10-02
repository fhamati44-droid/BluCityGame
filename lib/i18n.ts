import de from './locales/de.json';
import it from './locales/it.json';
import es from './locales/es.json';
import el from './locales/el.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';
export type Lang='en'|'he'|'ar'|'de'|'it'|'es'|'el'|'pt'|'ru'|'tr';
export const LANGUAGE_NAMES:Record<Lang,string>={en:'English',he:'עברית',ar:'العربية',de:'Deutsch',it:'Italiano',es:'Español',el:'Ελληνικά',pt:'Português',ru:'Русский',tr:'Türkçe'};
export const isRtl=(lang:Lang)=>lang==='he'||lang==='ar';
export function availableLanguages(country:string|null):Lang[]{return (Object.keys(LANGUAGE_NAMES) as Lang[]).filter(l=>l!=='he'||country==='IL');}
export function resolveLanguage(preferred:string,allowed:Lang[]):Lang{const code=preferred.toLowerCase().split(/[-_]/)[0];const normalized=code==='iw'?'he':code;return allowed.includes(normalized as Lang)?normalized as Lang:'en';}
const catalogs:Partial<Record<Lang,Record<string,string>>>={de,it,es,el,pt,ru,tr};
export function translateValue<T>(lang:Lang,value:T):T{
 if(typeof value==='string')return (catalogs[lang]?.[value]??value) as T;
 if(Array.isArray(value))return value.map(v=>translateValue(lang,v)) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,translateValue(lang,v)])) as T;
 return value;
}
export function localized<T>(lang:Lang,values:{en:T;he?:unknown;ar?:unknown}):T{
 if(lang==='he'&&values.he!==undefined)return values.he as T;
 if(lang==='ar'&&values.ar!==undefined)return values.ar as T;
 return translateValue(lang,values.en);
}
