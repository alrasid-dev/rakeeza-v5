import { NextResponse } from 'next/server';
import { generateUserGuidePdf, GUIDE_PDF_FILENAME } from '@/lib/user-guide-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const buffer = await generateUserGuidePdf();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${GUIDE_PDF_FILENAME}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('user guide pdf failed', e);
    return NextResponse.json({ error: 'تعذر إنشاء دليل الاستخدام' }, { status: 500 });
  }
}
