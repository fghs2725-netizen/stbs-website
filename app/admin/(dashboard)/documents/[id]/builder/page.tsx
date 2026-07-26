import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PDFBuilder from '@/components/documents/builder/PDFBuilder';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  let initialData = null;
  const { id } = await params;
  
  try {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: 'asc' } },
        sections: { orderBy: { position: 'asc' } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!document) {
      return notFound();
    }

    initialData = {
      id: document.id,
      reference: document.reference,
      type: document.type,
      status: document.status,
      title: document.title,
      subject: document.subject || '',
      notes: document.notes || '',
      terms: document.terms || '',
      totalAmount: Number(document.totalAmount),
      clientName: document.clientName || '',
      clientEmail: document.clientEmail || '',
      clientCompany: document.clientCompany || '',
      clientId: document.clientId || '',
      pdfUrl: document.pdfUrl,
      items: document.items.map(item => ({
        id: item.id,
        position: item.position,
        itemCode: item.itemCode || '',
        description: item.description,
        unit: item.unit || '',
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount: Number(item.amount),
        gstPercent: Number(item.gstPercent),
        gstAmount: Number(item.gstAmount),
        hsnCode: item.hsnCode || '',
        category: item.category || '',
        notes: item.notes || '',
      })),
      sections: document.sections.map(section => ({
        id: section.id,
        type: section.type,
        position: section.position,
        title: section.title || '',
        content: (section.content as Record<string, unknown>) || {},
        visible: section.visible,
      })),
    };
    
  } catch (error) {
    console.error('Error fetching document:', error);
    initialData = {
      id,
      reference: 'DOC-0000',
      type: 'INTERNAL_DOCUMENT',
      status: 'DRAFT',
      title: 'New Document',
      subject: '',
      notes: '',
      terms: '',
      totalAmount: 0,
      clientName: '',
      clientEmail: '',
      clientCompany: '',
      clientId: '',
      pdfUrl: null,
      items: [],
      sections: [],
    };
  }

  return (
    <div className="h-screen w-full flex flex-col bg-ink overflow-hidden fixed inset-0 z-50">
      <div className="h-14 bg-steel/80 border-b border-white/10 flex items-center px-4 shrink-0">
        <Link href="/admin/documents" className="flex items-center text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Documents
        </Link>
        <div className="mx-auto font-oswald text-lg font-medium text-white">
          <span className="text-signal">STBS</span> Builder <span className="text-gray-500 mx-2">|</span> {initialData?.reference || 'Draft'}
        </div>
        <div className="w-[140px]"></div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <PDFBuilder initialDocument={initialData} documentType={initialData?.type || 'INTERNAL_DOCUMENT'} />
      </div>
    </div>
  );
}
