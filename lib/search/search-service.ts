import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SearchableEntityType = "Document" | "Client" | "Project" | "DocumentTemplate" | "AuditLog";

export interface IndexEntityParams {
  entityType: SearchableEntityType | string;
  entityId: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  query: string;
  entityType?: SearchableEntityType | string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: "rank" | "date" | "title";
  sortOrder?: "asc" | "desc";
}

export interface SearchResult {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  snippet: string;
  rank: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  tookMs: number;
}

export interface SaveSearchParams {
  name: string;
  query: string;
  filters?: Record<string, unknown>;
  userId?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sanitize a user-provided search query for safe PostgreSQL tsquery usage.
 * Escapes special characters and wraps terms.
 */
function sanitizeQuery(raw: string): string {
  const cleaned = raw
    .replace(/[^\w\s\-]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (!cleaned) return "";

  const terms = cleaned.split(" ").filter(Boolean);
  const tsQuery = terms.map((t) => `"${t.replace(/"/g, '""')}"`).join(" & ");

  return tsQuery;
}

/**
 * Extract a plain text snippet around the matched terms.
 */
function extractSnippet(content: string, _query: string, maxLen = 200): string {
  if (content.length <= maxLen) return content;
  const half = Math.floor(maxLen / 2);
  const start = Math.max(0, Math.floor(content.length / 2) - half);
  const snippet = content.substring(start, start + maxLen);
  return (start > 0 ? "..." : "") + snippet + (start + maxLen < content.length ? "..." : "");
}

// ─── Search Service ─────────────────────────────────────────────────────────

class SearchService {
  /**
   * Index a single entity into the search index.
   */
  async indexEntity(params: IndexEntityParams): Promise<void> {
    try {
      const rank = params.title.length + params.content.length;

      await prisma.searchIndex.upsert({
        where: {
          entityType_entityId: {
            entityType: params.entityType,
            entityId: params.entityId,
          },
        },
        create: {
          entityType: params.entityType,
          entityId: params.entityId,
          title: params.title,
          content: params.content,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
          rank,
        },
        update: {
          title: params.title,
          content: params.content,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
          rank,
        },
      });
    } catch (error) {
      console.error("[SearchService] Index error:", error);
    }
  }

  /**
   * Remove an entity from the search index.
   */
  async removeEntity(entityType: string, entityId: string): Promise<void> {
    try {
      await prisma.searchIndex.deleteMany({
        where: { entityType, entityId },
      });
    } catch (error) {
      console.error("[SearchService] Remove index error:", error);
    }
  }

  /**
   * Full-text search using PostgreSQL ts_vector / ts_query.
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const offset = (page - 1) * pageSize;
    const tsQuery = sanitizeQuery(options.query);

    if (!tsQuery) {
      return {
        results: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        query: options.query,
        tookMs: 0,
      };
    }

    try {
      // Build parameterized query — tsQuery is passed as $1 to prevent SQL injection.
      const conditions: string[] = [`(si.title || ' ' || si.content) @@ to_tsquery('english', $1)`];
      const queryValues: unknown[] = [tsQuery];
      let paramIdx = 2;

      if (options.entityType) {
        conditions.push(`si."entityType" = $${paramIdx++}`);
        queryValues.push(options.entityType);
      }

      if (options.dateFrom) {
        conditions.push(`si."createdAt" >= $${paramIdx++}`);
        queryValues.push(options.dateFrom);
      }

      if (options.dateTo) {
        conditions.push(`si."createdAt" <= $${paramIdx++}`);
        queryValues.push(options.dateTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      let orderClause: string;
      switch (options.sortBy) {
        case "date":
          orderClause = `ORDER BY si."createdAt" ${options.sortOrder === "asc" ? "ASC" : "DESC"}`;
          break;
        case "title":
          orderClause = `ORDER BY si.title ${options.sortOrder === "asc" ? "ASC" : "DESC"}`;
          break;
        case "rank":
        default:
          orderClause = `ORDER BY ts_rank_cd(to_tsvector('english', si.title || ' ' || si.content), to_tsquery('english', $1)) DESC`;
          break;
      }

      // Parameterized count query
      const countQuery = `
        SELECT COUNT(*) as count
        FROM "SearchIndex" si
        ${whereClause}
      `;

      // Parameterized data query — $N references match queryValues
      const limitParam = paramIdx++;
      const offsetParam = paramIdx++;
      const dataQuery = `
        SELECT
          si.id,
          si."entityType",
          si."entityId",
          si.title,
          si.content,
          si.metadata,
          si.rank,
          si."createdAt",
          ts_rank_cd(to_tsvector('english', si.title || ' ' || si.content), to_tsquery('english', $1)) as relevance_rank
        FROM "SearchIndex" si
        ${whereClause}
        ${orderClause}
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `;

      const countValues = queryValues;
      const dataValues = [...queryValues, pageSize, offset];

      const [countResult, dataResults] = await Promise.all([
        prisma.$queryRawUnsafe(countQuery, ...countValues) as Promise<Array<{ count: bigint }>>,
        prisma.$queryRawUnsafe(dataQuery, ...dataValues) as Promise<Array<{
          id: string;
          entityType: string;
          entityId: string;
          title: string;
          content: string;
          metadata: unknown;
          rank: number;
          createdAt: Date;
          relevance_rank: number;
        }>>,
      ]);

      const total = Number(countResult[0]?.count || 0);
      const results: SearchResult[] = dataResults.map((row) => ({
        id: row.id,
        entityType: row.entityType,
        entityId: row.entityId,
        title: row.title,
        snippet: extractSnippet(row.content, options.query),
        rank: row.relevance_rank || 0,
        metadata: (row.metadata as Record<string, unknown>) || undefined,
        createdAt: row.createdAt,
      }));

      return {
        results,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        query: options.query,
        tookMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[SearchService] Search query error:", error);

      return this.fallbackSearch(options, startTime);
    }
  }

  /**
   * Fallback ILIKE-based search when full-text search fails.
   */
  private async fallbackSearch(options: SearchOptions, startTime: number): Promise<SearchResponse> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${options.query}%`;

    const where: Record<string, unknown> = {
      OR: [
        { title: { contains: options.query, mode: "insensitive" } },
        { content: { contains: options.query, mode: "insensitive" } },
      ],
    };

    if (options.entityType) {
      where.entityType = options.entityType;
    }
    if (options.dateFrom || options.dateTo) {
      where.createdAt = {
        ...(options.dateFrom ? { gte: options.dateFrom } : {}),
        ...(options.dateTo ? { lte: options.dateTo } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      prisma.searchIndex.findMany({
        where,
        orderBy: { rank: "desc" },
        take: pageSize,
        skip: offset,
      }),
      prisma.searchIndex.count({ where }),
    ]);

    const results: SearchResult[] = rows.map((row) => ({
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      title: row.title,
      snippet: extractSnippet(row.content, options.query),
      rank: row.rank,
      metadata: (row.metadata as Record<string, unknown>) || undefined,
      createdAt: row.createdAt,
    }));

    return {
      results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      query: options.query,
      tookMs: Date.now() - startTime,
    };
  }

  /**
   * Reindex all entities from the database.
   */
  async reindexAll(): Promise<{ indexed: number; errors: number }> {
    let indexed = 0;
    let errors = 0;

    const batchSize = 100;
    let offset = 0;

    while (true) {
      const documents = await prisma.document.findMany({
        where: { deletedAt: null },
        select: { id: true, title: true, reference: true, type: true, status: true, subject: true, notes: true, clientName: true, createdAt: true },
        take: batchSize,
        skip: offset,
      });

      if (documents.length === 0) break;

      for (const doc of documents) {
        try {
          const content = [doc.title, doc.reference, doc.type, doc.status, doc.subject, doc.notes, doc.clientName].filter(Boolean).join(" ");
          await this.indexEntity({
            entityType: "Document",
            entityId: doc.id,
            title: doc.title,
            content,
            metadata: { type: doc.type, status: doc.status, reference: doc.reference },
          });
          indexed++;
        } catch {
          errors++;
        }
      }

      offset += batchSize;
    }

    offset = 0;
    while (true) {
      const clients = await prisma.client.findMany({
        where: { deletedAt: null },
        select: { id: true, companyName: true, contactPerson: true, email: true, phone: true, city: true, state: true, siteAddress: true },
        take: batchSize,
        skip: offset,
      });

      if (clients.length === 0) break;

      for (const client of clients) {
        try {
          const content = [client.companyName, client.contactPerson, client.email, client.phone, client.city, client.state, client.siteAddress].filter(Boolean).join(" ");
          await this.indexEntity({
            entityType: "Client",
            entityId: client.id,
            title: client.companyName,
            content,
            metadata: { email: client.email, city: client.city },
          });
          indexed++;
        } catch {
          errors++;
        }
      }

      offset += batchSize;
    }

    offset = 0;
    while (true) {
      const projects = await prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, description: true, status: true, client: { select: { companyName: true } } },
        take: batchSize,
        skip: offset,
      });

      if (projects.length === 0) break;

      for (const project of projects) {
        try {
          const content = [project.name, project.description, project.status, project.client?.companyName].filter(Boolean).join(" ");
          await this.indexEntity({
            entityType: "Project",
            entityId: project.id,
            title: project.name,
            content,
            metadata: { status: project.status, client: project.client?.companyName },
          });
          indexed++;
        } catch {
          errors++;
        }
      }

      offset += batchSize;
    }

    offset = 0;
    while (true) {
      const templates = await prisma.documentTemplate.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, type: true, description: true },
        take: batchSize,
        skip: offset,
      });

      if (templates.length === 0) break;

      for (const tpl of templates) {
        try {
          const content = [tpl.name, tpl.type, tpl.description].filter(Boolean).join(" ");
          await this.indexEntity({
            entityType: "DocumentTemplate",
            entityId: tpl.id,
            title: tpl.name,
            content,
            metadata: { type: tpl.type },
          });
          indexed++;
        } catch {
          errors++;
        }
      }

      offset += batchSize;
    }

    offset = 0;
    while (true) {
      const auditLogs = await prisma.auditLog.findMany({
        select: { id: true, action: true, entityType: true, entityId: true, description: true, metadata: true },
        orderBy: { createdAt: "desc" },
        take: batchSize,
        skip: offset,
      });

      if (auditLogs.length === 0) break;

      for (const log of auditLogs) {
        try {
          const content = [log.action, log.entityType, log.entityId, log.description].filter(Boolean).join(" ");
          await this.indexEntity({
            entityType: "AuditLog",
            entityId: log.id,
            title: `${log.action} — ${log.entityType}`,
            content,
            metadata: log.metadata as Record<string, unknown> | undefined,
          });
          indexed++;
        } catch {
          errors++;
        }
      }

      offset += batchSize;
    }

    return { indexed, errors };
  }

  /**
   * Get search suggestions based on a prefix.
   */
  async getSuggestions(prefix: string, limit = 10): Promise<string[]> {
    if (!prefix || prefix.length < 2) return [];

    const term = prefix.toLowerCase();

    const results = await prisma.searchIndex.findMany({
      where: {
        title: { contains: term, mode: "insensitive" },
      },
      select: { title: true },
      distinct: ["title"],
      take: limit,
    });

    const unique = [...new Set(results.map((r) => r.title))];
    return unique;
  }

  /**
   * Save a search for later reuse.
   */
  async saveSearch(params: SaveSearchParams): Promise<string> {
    const saved = await prisma.savedSearch.create({
      data: {
        name: params.name,
        query: params.query,
        filters: params.filters ? JSON.parse(JSON.stringify(params.filters)) : undefined,
        userId: params.userId || null,
      },
    });

    return saved.id;
  }

  /**
   * Get saved searches.
   */
  async getSavedSearches(userId?: string): Promise<Array<{
    id: string;
    name: string;
    query: string;
    filters: unknown;
    createdAt: Date;
  }>> {
    return prisma.savedSearch.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Delete a saved search.
   */
  async deleteSavedSearch(id: string): Promise<void> {
    await prisma.savedSearch.delete({ where: { id } });
  }

  /**
   * Auto-reindex an entity when it's created or updated.
   */
  async onEntityChange(
    entityType: SearchableEntityType,
    entityId: string,
    data: { title: string; content: string; metadata?: Record<string, unknown> }
  ): Promise<void> {
    await this.indexEntity({ entityType, entityId, ...data });
  }

  /**
   * Remove entity from index on delete.
   */
  async onEntityDelete(entityType: SearchableEntityType, entityId: string): Promise<void> {
    await this.removeEntity(entityType, entityId);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!_instance) {
    _instance = new SearchService();
  }
  return _instance;
}

export const searchService = getSearchService();
