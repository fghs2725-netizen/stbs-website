import Link from 'next/link';
import { Plus, Search, X } from 'lucide-react';
import { DocumentTable } from '@/components/admin/DocumentTable';
import { Pagination } from '@/components/admin/Pagination';
import { prisma } from '@/lib/prisma';
import { DOCUMENT_TYPE_CONFIGS, DOCUMENT_STATUS_CONFIG } from '@/lib/documents/template-registry';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

// Frequent business states surfaced as one-tap filters; values are real
// DocumentStatus enum members, labels come from the shared status config.
const STATUS_CHIP_VALUES = ['', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ISSUED', 'FINALIZED', 'COMPLETED'];

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }>
}) {
  const { q, type, status, page: pageParam } = await searchParams;
  const query = q || '';
  const typeFilter = type || '';
  const statusFilter = status || '';
  const activeFilterNames = [query && 'search', typeFilter && 'type', statusFilter && 'status'].filter(Boolean);

  const pageNumber = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  let documents: any[] = [];
  let totalItems = 0;
  let totalPages = 1;

  try {
    const where: any = { deletedAt: null };
    if (query) {
      where.OR = [
        { reference: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { clientName: { contains: query, mode: 'insensitive' } },
        { clientCompany: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (typeFilter) where.type = typeFilter;
    if (statusFilter) where.status = statusFilter;

    // Deterministic ordering: id tiebreaker keeps pages stable when rows
    // share the same createdAt timestamp.
    [documents, totalItems] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: PAGE_SIZE,
        skip: (pageNumber - 1) * PAGE_SIZE,
      }),
      prisma.document.count({ where }),
    ]);
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

    documents = documents.map(d => ({
      id: d.id,
      reference: d.reference,
      type: d.type,
      title: d.title,
      clientCompany: d.clientCompany || d.clientName || 'Unknown Client',
      status: d.status,
      totalAmount: Number(d.totalAmount) || 0,
      date: d.createdAt.toISOString(),
      pdfUrl: d.pdfUrl
    }));
  } catch (error) {
    console.error('Database error on documents page:', error);
  }

  // A page number past the last result would otherwise render an empty list
  // under a clamped footer ("page 2 of 2" + "No documents found"); the table
  // explains itself instead. Queries are untouched.
  const outOfRange = totalItems > 0 && pageNumber > totalPages;

  return (
    <div className="admin-page min-h-0 flex-1">
      <PageHeader eyebrow="Documents" title="Documents" description="Manage quotations, invoices, reports and certificates." action={<Button asChild><Link href="/admin/documents/new"><Plus className="size-4" />New Document</Link></Button>} />
      <div className="hidden">
        <div>
          <h1 className="text-3xl font-oswald font-bold tracking-tight text-white mb-1">Documents</h1>
          <p className="text-gray-400 text-sm">Quotations, invoices, reports and certificates — all in one place.</p>
        </div>
        <Link href="/admin/documents/new" className="min-h-[40px] inline-flex items-center px-4 py-2 bg-signal text-ink text-sm font-bold rounded-lg hover:bg-signal/90 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Link>
      </div>

      <div className="admin-card flex-1 flex flex-col overflow-hidden">
        {/* Filters compose through plain GET params: shareable and reload-
            safe. Submitting drops the page param, returning to page 1. */}
        <form method="GET" action="/admin/documents" className="p-4 pb-3 border-b border-white/5 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              name="q"
              placeholder="Search by reference, title, or client..."
              className="admin-input pl-10 pr-4"
              defaultValue={query}
            />
          </div>
          <select name="type" defaultValue={typeFilter} aria-label="Filter by document type" className="admin-input min-w-[150px] text-sm">
            <option value="">All Types</option>
            {Object.entries(DOCUMENT_TYPE_CONFIGS).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={statusFilter} aria-label="Filter by status" className="admin-input min-w-[150px] text-sm">
            <option value="">All Statuses</option>
            {Object.entries(DOCUMENT_STATUS_CONFIG).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.label}</option>
            ))}
          </select>
          <button type="submit" className="min-h-[40px] px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm text-white hover:bg-white/5 transition-colors">
            Apply
          </button>
        </form>

        {/* Status quick-filter chips — plain links so filtered views stay
            copyable URLs rather than hidden component state. */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-white/5" role="group" aria-label="Quick status filters">
          {STATUS_CHIP_VALUES.map(value => {
            const isActive = statusFilter === value;
            const qs = new URLSearchParams();
            if (query) qs.set('q', query);
            if (typeFilter) qs.set('type', typeFilter);
            if (value) qs.set('status', value);
            const suffix = qs.toString();
            const label = value ? DOCUMENT_STATUS_CONFIG[value as keyof typeof DOCUMENT_STATUS_CONFIG]?.label : 'All';
            return (
              <Link
                key={label}
                href={suffix ? `/admin/documents?${suffix}` : '/admin/documents'}
                aria-pressed={isActive}
                className={`min-h-[36px] px-3 inline-flex items-center rounded-full text-xs font-medium border transition-colors ${
                  isActive
                    ? 'bg-signal/15 border-signal/60 text-signal'
                    : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/25'
                }`}
              >
                {label}
              </Link>
            );
          })}
          {activeFilterNames.length > 0 && (
            <Link
              href="/admin/documents"
              aria-label="Clear all filters"
              className="min-h-[36px] px-3 inline-flex items-center gap-1.5 rounded-full text-xs font-medium text-gray-400 hover:text-red-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear ({activeFilterNames.join(' + ')})
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <DocumentTable documents={documents} outOfRange={outOfRange} />
        </div>

        <Pagination
          page={Math.min(pageNumber, totalPages)}
          totalPages={totalPages}
          totalItems={totalItems}
          basePath="/admin/documents"
          params={{ q: query, type: typeFilter, status: statusFilter }}
        />
      </div>
    </div>
  );
}
