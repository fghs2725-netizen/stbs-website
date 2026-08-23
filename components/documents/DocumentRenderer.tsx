import { format } from 'date-fns';

interface DocumentRendererProps {
  document: any;
  items?: any[];
  sections?: any[];
}

/**
 * Rows of the Bill of Quantities that fit comfortably on one A4 sheet
 * (leaves room for the section title, wrapped descriptions, and totals).
 */
const ROWS_PER_PAGE = 18;

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < rows.length; i += size) pages.push(rows.slice(i, i + size));
  return pages;
}

/**
 * A section type is rendered unless an explicit sections entry marks it
 * invisible. Absent sections default to visible.
 */
function sectionVisible(sections: any[], type: string): boolean {
  const entry = Array.isArray(sections) ? sections.find(s => s?.type === type) : undefined;
  return entry ? entry.visible !== false : true;
}

interface SheetProps {
  children: React.ReactNode;
  footerLeft: string;
  pageNumber: number;
  totalPages: number;
}

/**
 * One A4 sheet. min-height (not fixed height) so overflowing content flows
 * onto an extra printed page instead of being silently clipped.
 */
function Sheet({ children, footerLeft, pageNumber, totalPages }: SheetProps) {
  return (
    <div className="doc-page" style={{ width: '210mm', minHeight: '297mm', padding: '20mm', background: '#ffffff', position: 'relative', pageBreakAfter: 'always' }}>
      {children}
      <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
        <div style={{ fontSize: '10px', color: '#999' }}>{footerLeft}</div>
        <div style={{ fontSize: '10px', color: '#999' }}>Page {pageNumber} of {totalPages}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a5f', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', paddingBottom: '8px', borderBottom: '2px solid #f7c600' }}>
      {children}
    </div>
  );
}

function CoverPage({ document, pageNumber, totalPages }: { document: any; pageNumber: number; totalPages: number }) {
  return (
    <Sheet footerLeft="Saini Tubewell Boring Service | Sonipat, Haryana" pageNumber={pageNumber} totalPages={totalPages}>
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
      {(document.clientName || document.clientCompany) && (
        <div style={{ marginLeft: '15mm', marginBottom: '20mm' }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Prepared For</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e3a5f' }}>{document.clientCompany || document.clientName}</div>
          {document.clientEmail && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{document.clientEmail}</div>}
        </div>
      )}
    </Sheet>
  );
}

function ItemsPage({ document, rows, startIndex, isLast, pageNumber, totalPages }: { document: any; rows: any[]; startIndex: number; isLast: boolean; pageNumber: number; totalPages: number }) {
  return (
    <Sheet footerLeft={`STBS Enterprise | ${document.reference}`} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionTitle>{startIndex === 0 ? 'Bill of Quantities' : 'Bill of Quantities (continued)'}</SectionTitle>

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
          {rows.map((item: any, index: number) => (
            <tr key={item.id ?? startIndex + index} style={{ borderBottom: '1px solid #e5e7eb', background: (startIndex + index) % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
              <td style={{ padding: '8px', color: '#666' }}>{startIndex + index + 1}</td>
              <td style={{ padding: '8px', color: '#333', fontWeight: '500' }}>{item.description}</td>
              <td style={{ padding: '8px', textAlign: 'center', color: '#666' }}>{item.unit}</td>
              <td style={{ padding: '8px', textAlign: 'right', color: '#333' }}>{Number(item.quantity)}</td>
              <td style={{ padding: '8px', textAlign: 'right', color: '#333' }}>{formatCurrency(Number(item.rate))}</td>
              <td style={{ padding: '8px', textAlign: 'right', color: '#1e3a5f', fontWeight: '600' }}>{formatCurrency(Number(item.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals appear once, on the final items sheet */}
      {isLast && (
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
      )}
    </Sheet>
  );
}

function NotesPage({ document, pageNumber, totalPages }: { document: any; pageNumber: number; totalPages: number }) {
  return (
    <Sheet footerLeft={`STBS Enterprise | ${document.reference}`} pageNumber={pageNumber} totalPages={totalPages}>
      {document.notes && (
        <div style={{ marginBottom: '30mm' }}>
          <SectionTitle>Notes</SectionTitle>
          <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{document.notes}</div>
        </div>
      )}

      {document.terms && (
        <div>
          <SectionTitle>Terms &amp; Conditions</SectionTitle>
          <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{document.terms}</div>
        </div>
      )}
    </Sheet>
  );
}

function SignaturePage({ document, pageNumber, totalPages }: { document: any; pageNumber: number; totalPages: number }) {
  // Date is anchored to the persisted record so regenerating a PDF never
  // re-dates the authorization page.
  const authorizedDate = document.createdAt
    ? format(new Date(document.createdAt), 'dd/MM/yyyy')
    : '____/____/____';

  return (
    <Sheet footerLeft={`STBS Enterprise | ${document.reference}`} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionTitle>Authorization</SectionTitle>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: '40mm' }}>
        {/* Company signature */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '60px' }}>For Saini Tubewell Boring Service</div>
          <div style={{ borderBottom: '1px solid #333', marginBottom: '8px' }}>&nbsp;</div>
          <div style={{ fontSize: '12px', color: '#333', fontWeight: '600' }}>Authorized Signatory</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Date: {authorizedDate}</div>
        </div>

        {/* Client signature */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '60px' }}>Client Acceptance</div>
          <div style={{ borderBottom: '1px solid #333', marginBottom: '8px' }}>&nbsp;</div>
          <div style={{ fontSize: '12px', color: '#333', fontWeight: '600' }}>{document.clientName || document.clientCompany || 'Client'}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Date: _______________</div>
        </div>
      </div>
    </Sheet>
  );
}

export function DocumentRenderer({ document, items = [], sections = [] }: DocumentRendererProps) {
  const showBoq = sectionVisible(sections, 'boq');
  const showNotes = sectionVisible(sections, 'terms') && !!(document.notes || document.terms);
  const showSignatures = sectionVisible(sections, 'signatures');

  const itemChunks = showBoq ? chunkRows(Array.isArray(items) ? items : [], ROWS_PER_PAGE) : [];

  const totalPages = 1 + itemChunks.length + (showNotes ? 1 : 0) + (showSignatures ? 1 : 0);
  let currentPage = 0;
  const nextPage = () => ++currentPage;

  return (
    <>
      <CoverPage document={document} pageNumber={nextPage()} totalPages={totalPages} />
      {itemChunks.map((rows, chunkIndex) => (
        <ItemsPage
          key={chunkIndex}
          document={document}
          rows={rows}
          startIndex={chunkIndex * ROWS_PER_PAGE}
          isLast={chunkIndex === itemChunks.length - 1}
          pageNumber={nextPage()}
          totalPages={totalPages}
        />
      ))}
      {showNotes && <NotesPage document={document} pageNumber={nextPage()} totalPages={totalPages} />}
      {showSignatures && <SignaturePage document={document} pageNumber={nextPage()} totalPages={totalPages} />}
    </>
  );
}
