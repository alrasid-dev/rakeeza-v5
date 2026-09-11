import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public QR PNG for Outlook/email embeds (official number / verify payload) */
export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get('text') || req.nextUrl.searchParams.get('n') || '').trim();
  if (!text || text.length > 500) {
    return NextResponse.json({ error: 'text مطلوب' }, { status: 400 });
  }
  try {
    const png = await QRCode.toBuffer(text, {
      type: 'png',
      margin: 1,
      width: 160,
      errorCorrectionLevel: 'M',
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    console.error('qr public failed', e);
    return NextResponse.json({ error: 'تعذر إنشاء QR' }, { status: 500 });
  }
}
