import { prisma } from '@/lib/prisma';
import { ShieldCheck, ShieldAlert, FileText, Calendar, Building2, Info } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export const metadata = {
  title: 'Document Verification | STBS Enterprise',
  description: 'Verify STBS Enterprise documents securely',
};

interface VerifyPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function VerifyPage(props: VerifyPageProps) {
  const params = await props.params;
  const { code } = params;

  let verificationResult: boolean | null = null;
  let documentInfo: any = null;
  let scanCount = 0;
  let error = null;

  try {
    const verification = await prisma.qRVerification.findUnique({
      where: { code },
      include: {
        document: true,
      },
    });

    if (verification && verification.document) {
      verificationResult = true;
      documentInfo = verification.document;
      scanCount = verification.scannedCount;

      await prisma.qRVerification.update({
        where: { id: verification.id },
        data: {
          scannedCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      });
    } else {
      verificationResult = false;
    }
  } catch (err) {
    console.error('Error verifying QR code:', err);
    error = true;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f] rounded-md flex items-center justify-center text-[#f7c600] font-bold text-lg">
            S
          </div>
          <span className="font-bold text-gray-900 text-xl tracking-tight">STBS Enterprise</span>
        </div>
        <div className="text-sm font-medium text-gray-500">
          Secure Verification System
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          
          {error ? (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Error</h1>
              <p className="text-gray-600 mb-6">
                We encountered a system error while trying to verify this document. Please try again later.
              </p>
            </div>
          ) : verificationResult === true ? (
            <div>
              <div className="bg-green-50 p-8 text-center border-b border-green-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ShieldCheck className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-green-800 mb-1">Document Verified</h1>
                <p className="text-green-700 text-sm font-medium">Authentic STBS Enterprise Document</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Document Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-[#1e3a5f] mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Reference</p>
                        <p className="text-gray-900 font-semibold">{documentInfo.reference}</p>
                        <p className="text-gray-600 text-sm">{documentInfo.title}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-[#1e3a5f] mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Type</p>
                        <p className="text-gray-900 font-semibold">{documentInfo.type?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-[#1e3a5f] mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Date Issued</p>
                        <p className="text-gray-900 font-semibold">
                          {documentInfo.createdAt ? format(new Date(documentInfo.createdAt), 'dd MMMM yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-[#1e3a5f] mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Status</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 mt-1">
                          {documentInfo.status?.replace(/_/g, ' ') || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {scanCount > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-xs text-gray-500 text-center">
                    This document has been verified {scanCount} time{scanCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Not Found</h1>
              <p className="text-gray-600 mb-6">
                The verification code provided is invalid or the document no longer exists in our system.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-sm text-gray-600 text-left">
                <strong>Suggestions:</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Ensure you scanned the entire QR code clearly.</li>
                  <li>Check if the document has been revoked.</li>
                  <li>Contact STBS support for assistance.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} STBS Enterprise. All rights reserved.</p>
        <p className="mt-1">
          <Link href="/contact" className="text-[#1e3a5f] hover:underline">Contact Support</Link>
          {' '}&bull;{' '}
          <Link href="/privacy" className="text-[#1e3a5f] hover:underline">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
