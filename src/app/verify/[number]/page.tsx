import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({ params }: { params: { number: string } }) {
  const number = decodeURIComponent(params.number);
  const doc = await prisma.document.findFirst({
    where: { number },
    select: {
      number: true,
      subject: true,
      status: true,
      dateGregorian: true,
      docType: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-moj-light flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow border max-w-lg w-full p-8 text-center">
        <img src="/logo.svg" alt="" className="w-16 h-16 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-moj-green mb-1">التحقق من المكاتبة</h1>
        <p className="text-sm text-gray-500 mb-6">ركيزة — المحكمة العمالية بالرياض</p>
        {!doc ? (
          <div className="text-red-600">لم يُعثر على مستند بالرقم: <span dir="ltr">{number}</span></div>
        ) : (
          <div className="text-right space-y-2 text-sm">
            <div><span className="text-gray-500">الرقم:</span> <span dir="ltr">{doc.number}</span></div>
            <div><span className="text-gray-500">الموضوع:</span> {doc.subject || '—'}</div>
            <div><span className="text-gray-500">النوع:</span> {doc.docType}</div>
            <div><span className="text-gray-500">الحالة:</span> {doc.status}</div>
            <div><span className="text-gray-500">التاريخ:</span> {doc.dateGregorian || '—'}</div>
            <div className="text-xs text-gray-400 pt-3 border-t">عرض عام للقراءة فقط — للاستخدام الداخلي فقط</div>
          </div>
        )}
      </div>
    </div>
  );
}
