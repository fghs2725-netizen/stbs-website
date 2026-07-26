import { format } from 'date-fns';
import { IndianRupee } from 'lucide-react';

interface DocumentRendererProps {
  document: any;
  items?: any[];
  sections?: any[];
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CoverPage({ document }: { document: any }) {
  return (
    <div className="doc-page" style={{ width: '210mm', height: '297mm', padding: '20mm', background: '#ffffff', position: 'relative', overflow: 'hidden', pageBreakAfter: 'always' }}>
      {/* Accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '8mm', height: '100%', background: 'linear-gradient(180deg, #1e3a5f 0%, #152a45 100%)' }} />
      
      {/* Header area */}
      <div style={{ marginLeft: '15mm', marginBottom: '20mm' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', background: '#1e3a5f', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f7c600', fontWeight: 'bold', fontSize: '24px' }}>S</div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e3a5f', letterSpacing: '2px', fontFamily: 'Oswald, sans-serif' }}>SAINI TUBEWELL BORING SERVICE</div>
            <div style={{ fontSize: '11px', color: '#666', letterSpacing: '4px', textTransform: 'uppercase' }}>Drilling Deep. Building Trust. Est. 1992</div>
          </div>
        </div>
      </div>

      {/* Document title */}
      <div style={{ marginLeft: '15mm', marginBottom: '30mm' }}>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1e3a5f', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '3px', lineHeight: 1.2 }}>
          {document.type?.replace(/_/g, ' ') || 'DOCUMENT'}
        </div>
        <div style={{ width: '60px', height: '4px', background: '#f7c600', marginTop: '12px' }} />
      </div>

      {/* Document info */}
      <div style={{ marginLeft: '15mm', marginBottom: '30mm' }}>
        <table style={{ borderCollapse: 'collapse', width: '70%' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', width: '40%', borderBottom: '1px solid #eee' }}>Reference</td>
              <td style={{ padding: '8px 0', fontSize: '14px', fontWeight: '600', color: '#1e3a5f', borderBottom: '1px solid #eee' }}>{document.reference}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #eee' }}>Date</td>
              <td style={{ padding: '8px 0', fontSize: '14px', color: '#333', borderBottom: '1px solid #eee' }}>{document.createdAt ? format(new Date(document.createdAt), 'dd MMMM yyyy') : 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #eee' }}>Subject</td>
              <td style={{ padding: '8px 0', fontSize: '14px', color: '#333', borderBottom: '1px solid #eee' }}>{document.subject || document.title}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</td>
              <td style={{ padding: '8px 0' }}>
                <span style={{ display: 'inline-block', padding: '2px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: document.status === 'APPROVED' ? '#d1fae5' : document.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7', color: document.status === 'APPROVED' ? '#065f46' : document.status === 'CANCELLED' ? '#991b1b' : '#92400e' }}>
                  {document.status?.replace(/_/g, ' ')}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Client info */}
      {document.clientName && (
        <div style={{ marginLeft: '15mm', marginBottom: '20mm' }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Prepared For</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e3a5f' }}>{document.clientCompany || document.clientName}</div>
          {document.clientEmail && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{document.clientEmail}</div>}
        </div>
      )}

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
        <div style={{ fontSize: '10px', color: '#999' }}>Saini Tubewell Boring Service | Sonipat, Haryana</div>
        <div style={{ fontSize: '10px', color: '#999' }}>Page 1</div>
      </div>
    </div>
  );
}

function ItemsPage({ document, items }: { document: any; items: any[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="doc-page" style={{ width: '210mm', height: '297mm', padding: '20mm', background: '#ffffff', position: 'relative', pageBreakAfter: 'always' }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a5f', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', paddingBottom: '8px', borderBottom: '2px solid #f7c600' }}>
        Bill of Quantities
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: '#ffffff' }}>
            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>#</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>Description</th>
            <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600' }}>Unit</th>
            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>Qty</th>
            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>Rate</th>
            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, index: number) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', background: index % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
              <td style={{ padding: '8px', color: '#666' }}>{index + 1}</td>
              <td style={{ padding: '8px', color: '#333', fontWeight: '500' }}>{item.description}</td>
              <td style={{ padding: '8px', textAlign: 'center', color: '#666' }}>{item.unit}</td>
              <td style={{ padding: '8px', textAlign: 'right', color: '#333' }}>{Number(item.quantity)}</td>
              <td style={{ padding: '8px', textAlign: 'right', color: '#333' }}>{formatCurrency(Number(item.rate))}</td>
              <td style={{ padding: '8px', textAlign: 'right', color: '#1e3a5f', fontWeight: '600' }}>{formatCurrency(Number(item.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <div style={{ width: '250px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ color: '#666', fontSize: '13px' }}>Subtotal</span>
            <span style={{ fontWeight: '600', color: '#333' }}>{formatCurrency(Number(document.totalAmount) || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #1e3a5f', marginTop: '4px' }}>
            <span style={{ fontWeight: 'bold', color: '#1e3a5f', fontSize: '15px' }}>Total Amount</span>
            <span style={{ fontWeight: 'bold', color: '#1e3a5f', fontSize: '15px' }}>{formatCurrency(Number(document.totalAmount) || 0)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
        <div style={{ fontSize: '10px', color: '#999' }}>STBS Enterprise | {document.reference}</div>
        <div style={{ fontSize: '10px', color: '#999' }}>Page 2</div>
      </div>
    </div>
  );
}

function NotesPage({ document }: { document: any }) {
  const hasNotes = document.notes || document.terms;
  if (!hasNotes) return null;

  return (
    <div className="doc-page" style={{ width: '210mm', height: '297mm', padding: '20mm', background: '#ffffff', position: 'relative', pageBreakAfter: 'always' }}>
      {document.notes && (
        <div style={{ marginBottom: '30mm' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a5f', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #f7c600' }}>
            Notes
          </div>
          <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{document.notes}</div>
        </div>
      )}

      {document.terms && (
        <div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a5f', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #f7c600' }}>
            Terms &amp; Conditions
          </div>
          <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{document.terms}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
        <div style={{ fontSize: '10px', color: '#999' }}>STBS Enterprise | {document.reference}</div>
        <div style={{ fontSize: '10px', color: '#999' }}>Page 3</div>
      </div>
    </div>
  );
}

function SignaturePage({ document }: { document: any }) {
  return (
    <div className="doc-page" style={{ width: '210mm', height: '297mm', padding: '20mm', background: '#ffffff', position: 'relative' }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a5f', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '30mm', paddingBottom: '8px', borderBottom: '2px solid #f7c600' }}>
        Authorization
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: '40mm' }}>
        {/* Company signature */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '60px' }}>For Saini Tubewell Boring Service</div>
          <div style={{ borderBottom: '1px solid #333', marginBottom: '8px' }}>&nbsp;</div>
          <div style={{ fontSize: '12px', color: '#333', fontWeight: '600' }}>Authorized Signatory</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Date: {format(new Date(), 'dd/MM/yyyy')}</div>
        </div>

        {/* Client signature */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '60px' }}>Client Acceptance</div>
          <div style={{ borderBottom: '1px solid #333', marginBottom: '8px' }}>&nbsp;</div>
          <div style={{ fontSize: '12px', color: '#333', fontWeight: '600' }}>{document.clientName || 'Client'}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Date: _______________</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
        <div style={{ fontSize: '10px', color: '#999' }}>STBS Enterprise | {document.reference}</div>
        <div style={{ fontSize: '10px', color: '#999' }}>Page 4</div>
      </div>
    </div>
  );
}

export function DocumentRenderer({ document, items = [], sections = [] }: DocumentRendererProps) {
  return (
    <>
      <CoverPage document={document} />
      <ItemsPage document={document} items={items} />
      <NotesPage document={document} />
      <SignaturePage document={document} />
    </>
  );
}
