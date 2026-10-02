import {NextRequest,NextResponse} from 'next/server';
import {availableLanguages} from '@/lib/i18n';
export const dynamic='force-dynamic';
export function GET(request:NextRequest){
 const languages=availableLanguages(request.headers.get('x-vercel-ip-country'));
 return NextResponse.json({languages},{headers:{'Cache-Control':'private, no-store'}});
}
