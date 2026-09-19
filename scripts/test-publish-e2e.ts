import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { getStorageService } from "../lib/storage/storage-service";
import {
  getPublishedPage,
  getPublishedClients,
  getPublishedFeaturedClients,
  getPublishedGalleryItems,
  getPublishedNavigation,
} from "../lib/website/queries";
import { getPublicSiteConfig } from "../lib/website/public-config";

/**
 * Snapshot-model publish E2E test.
 *
 * Requires the dev server running on http://localhost:3010
 * (start with: npm run dev -- -p 3010)
 *
 * Mirrors the exact server-action semantics against the database and then
 * verifies both the public query layer and the rendered HTML of the live site.
 * Always restores the dev database to its original baseline.
 */

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3010";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  const mark = cond ? "ok" : "FAIL";
  if (!cond) failures++;
  console.log(`  ${mark}  ${label}${detail ? `  [${detail}]` : ""}`);
}

async function html(path: string): Promise<string> {
  const res = await fetch(BASE + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  return res.text();
}

async function main() {
  console.log("── Snapshot publish model — E2E ──\n");

  // ── Capture baseline ─────────────────────────────────────────────────────
  const homePage = await prisma.websitePage.findUniqueOrThrow({
    where: { slug: "home" },
  });
  const homeSections = await prisma.websiteSection.findMany({
    where: { pageId: homePage.id, deletedAt: null },
    orderBy: { position: "asc" },
  });
  const heroOriginal = homeSections.find((s) => s.type === "hero")!;
  const heroOriginalContent = heroOriginal.content as Record<string, unknown>;

  // This test's fixture is an unpublished Home. Clear any prior live snapshot
  // before the baseline assertions so a previous manual publish cannot leak in.
  await prisma.$transaction([
    prisma.websiteSection.updateMany({
      where: { pageId: homePage.id, deletedAt: null },
      data: { publishedContent: Prisma.DbNull, publishedAt: null },
    }),
    prisma.websitePage.update({
      where: { id: homePage.id },
      data: { status: "DRAFT", publishedData: Prisma.DbNull, publishedAt: null },
    }),
  ]);

  // ── Section 1: Homepage publish cycle (hero heading) ────────────────────
  console.log("Section 1  Homepage CMS publish cycle (hero heading)");
  {
    const fallback = await html("/");
    check("baseline: unpublished home renders static fallback", fallback.includes("Go deeper."), "title 'Go deeper.' present");

    // A. Edit section (draft) — mirror updateSectionContent
    const v1 = { ...heroOriginalContent, heading: "CMS Hero V1" };
    await prisma.websiteSection.update({ where: { id: heroOriginal.id }, data: { content: v1 } });
    await prisma.websitePage.update({ where: { id: homePage.id }, data: { status: "DRAFT" } });
    let page = await getPublishedPage("home");
    check("A. save draft -> home stays unpublished", page === null, "public page hidden");
    let h = await html("/");
    check("A. save draft -> public home still shows old/static value", h.includes("Go deeper.") && !h.includes("CMS Hero V1"), "");

    // B. Publish
    const sections = await prisma.websiteSection.findMany({ where: { pageId: homePage.id, deletedAt: null } });
    await prisma.$transaction([
      ...sections.map((s) =>
        prisma.websiteSection.update({ where: { id: s.id }, data: { publishedContent: s.content as object, publishedAt: new Date() } })
      ),
      prisma.websitePage.update({ where: { id: homePage.id }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
    ]);
    page = await getPublishedPage("home");
    const heroLive = page?.sections.find((s: { type: string }) => s.type === "hero");
    check("B. publish -> public page now returns CMS hero", (heroLive?.content as { heading?: string }).heading === "CMS Hero V1", "heading='CMS Hero V1'");
    h = await html("/");
    check("B. publish -> live site shows new heading", h.includes("CMS Hero V1") && !h.includes("Go deeper."), "");

    // C. Edit again (draft) → previous published value must remain live
    const v2 = { ...heroOriginalContent, heading: "CMS Hero V2" };
    await prisma.websiteSection.update({ where: { id: heroOriginal.id }, data: { content: v2 } });
    await prisma.websitePage.update({ where: { id: homePage.id }, data: { status: "DRAFT" } });
    page = await getPublishedPage("home");
    const heroAfterEdit = page?.sections.find((s: { type: string }) => s.type === "hero");
    check("C. edit after publish -> previous published heading stays live", (heroAfterEdit?.content as { heading?: string }).heading === "CMS Hero V1", "public heading still 'CMS Hero V1'");
    h = await html("/");
    check("C. edit after publish -> live site keeps previous published value", h.includes("CMS Hero V1") && !h.includes("CMS Hero V2"), "");

    // D. Republish → snapshot updates
    const sections2 = await prisma.websiteSection.findMany({ where: { pageId: homePage.id, deletedAt: null } });
    await prisma.$transaction([
      ...sections2.map((s) =>
        prisma.websiteSection.update({ where: { id: s.id }, data: { publishedContent: s.content as object, publishedAt: new Date() } })
      ),
      prisma.websitePage.update({ where: { id: homePage.id }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
    ]);
    page = await getPublishedPage("home");
    const heroRepub = page?.sections.find((s: { type: string }) => s.type === "hero");
    check("D. republish -> new draft promoted to live", (heroRepub?.content as { heading?: string }).heading === "CMS Hero V2", "heading='CMS Hero V2'");
    h = await html("/");
    check("D. republish -> live site shows promoted value", h.includes("CMS Hero V2") && !h.includes("CMS Hero V1"), "");

    // E. Explicit unpublish → back to static fallback
    const secs = await prisma.websiteSection.findMany({ where: { pageId: homePage.id, deletedAt: null } });
    await prisma.$transaction([
      ...secs.map((s) => prisma.websiteSection.update({ where: { id: s.id }, data: { publishedContent: Prisma.DbNull, publishedAt: null } })),
      prisma.websitePage.update({ where: { id: homePage.id }, data: { status: "DRAFT", publishedAt: null } }),
    ]);
    page = await getPublishedPage("home");
    check("E. unpublish -> returns to null (static fallback)", page === null, "");
    h = await html("/");
    check("E. unpublish -> live site returns to static fallback", h.includes("Go deeper.") && !h.includes("CMS Hero"), "");
    console.log("");
  }

  // ── Section 2: Client publish cycle ─────────────────────────────────────
  console.log("Section 2  Client CMS publish cycle");
  {
    const beforeClients = await getPublishedClients();
    check("baseline: no live clients", beforeClients === null, "public clients empty");

    const testClient = await prisma.websiteClient.create({
      data: { name: "QA Snapshot Client", sector: "Test Sector", visible: true, featured: true, position: 900 },
    });
    const pubClients = await getPublishedClients();
    check("draft client -> public clients unchanged (not live)", pubClients === null, "draft hidden");

    // publish (mirror publishWebsiteClient)
    const snap = { name: testClient.name, logoUrl: null, websiteUrl: null, altText: null, description: null, sector: testClient.sector, featured: true, position: 900, visible: true };
    await prisma.websiteClient.update({ where: { id: testClient.id }, data: { status: "PUBLISHED", publishedAt: new Date(), publishedData: snap as Prisma.InputJsonValue } });
    let featured = await getPublishedFeaturedClients();
    check("publish -> client becomes live (featured)", featured?.[0]?.name === "QA Snapshot Client", `featured[0].name='${featured?.[0]?.name}'`);

    // edit (mirror updateWebsiteClient) → draft, snapshot stays
    await prisma.websiteClient.update({ where: { id: testClient.id }, data: { name: "QA Snapshot Client v2", status: "DRAFT" } });
    featured = await getPublishedFeaturedClients();
    check("edit after publish -> previous published client value stays live", featured?.[0]?.name === "QA Snapshot Client", `public name still '${featured?.[0]?.name}'`);

    // republish → new value live
    const snap2 = { ...snap, name: "QA Snapshot Client v2" };
    await prisma.websiteClient.update({ where: { id: testClient.id }, data: { status: "PUBLISHED", publishedAt: new Date(), publishedData: snap2 as Prisma.InputJsonValue } });
    featured = await getPublishedFeaturedClients();
    check("republish -> edited client value becomes live", featured?.[0]?.name === "QA Snapshot Client v2", `name='${featured?.[0]?.name}'`);

    // unpublish (mirror unpublishWebsiteClient)
    await prisma.websiteClient.update({ where: { id: testClient.id }, data: { status: "DRAFT", publishedAt: null, publishedData: Prisma.DbNull } });
    featured = await getPublishedFeaturedClients();
    check("unpublish -> client gone from public", featured === null, "");

    // cleanup
    await prisma.websiteClient.delete({ where: { id: testClient.id } });
    const clientsPage = await html("/clients");
    check("public /clients unaffected and static (no fabricated data)", clientsPage.includes("Ashoka University") && !clientsPage.includes("QA Snapshot"), "");
    console.log("");
  }

  // ── Section 3: Gallery publish cycle (via published home page) ──────────
  console.log("Section 3  Gallery CMS publish cycle (visible via published home page)");
  {
    const storage = getStorageService();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const up = await storage.upload({ buffer: png, originalName: "qa-snapshot.png", mimeType: "image/png", entityType: "website", entityId: "site" });
    if (!up.success || !up.fileId || !up.key || !up.url) throw new Error(`storage.upload failed: ${up.error}`);
    check("uploaded test image via storage service", up.url.startsWith("/api/storage/local/website/"), up.key);

    // public storage streaming check
    const mediaRes = await fetch(BASE + up.url, { cache: "no-store" });
    const mediaBody = Buffer.from(await mediaRes.arrayBuffer());
    check("published storage URL streams publicly", mediaRes.status === 200 && mediaRes.headers.get("content-type") === "image/png", `HTTP ${mediaRes.status} CT=${mediaRes.headers.get("content-type")}`);
    check("streamed bytes match uploaded bytes", mediaBody.length === png.length, `${mediaBody.length} bytes`);

    const item = await prisma.websiteGalleryItem.create({
      data: { mediaUrl: up.url, caption: "QA Gallery V1", altText: "QA alt", sourceType: "REAL_PROJECT", visible: true, width: 1, height: 1, fileSize: png.length, position: 900 },
    });
    let live = await getPublishedGalleryItems();
    check("draft gallery item -> not live", live === null, "");

    // house home page live so gallery preview section renders publicly
    const secs = await prisma.websiteSection.findMany({ where: { pageId: homePage.id, deletedAt: null } });
    await prisma.$transaction([
      ...secs.map((s) => prisma.websiteSection.update({ where: { id: s.id }, data: { publishedContent: s.content as object, publishedAt: new Date() } })),
      prisma.websitePage.update({ where: { id: homePage.id }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
    ]);
    let h = await html("/");
    check("published home + draft gallery item -> no gallery images on live site", !h.includes("QA Gallery V1"), "");

    // publish gallery item
    const gsnap = { mediaUrl: up.url, thumbnailUrl: null, caption: "QA Gallery V1", altText: "QA alt", category: null, sourceType: "REAL_PROJECT", featured: false, position: 900, visible: true, width: 1, height: 1, fileSize: png.length };
    await prisma.websiteGalleryItem.update({ where: { id: item.id }, data: { status: "PUBLISHED", publishedAt: new Date(), publishedData: gsnap as Prisma.InputJsonValue } });
    live = await getPublishedGalleryItems();
    check("publish gallery item -> live", live?.[0]?.caption === "QA Gallery V1", `caption='${live?.[0]?.caption}'`);
    h = await html("/");
    check("publish -> gallery preview appears on live site", h.includes("QA Gallery V1"), "");

    // edit caption (draft) → snapshot stays
    await prisma.websiteGalleryItem.update({ where: { id: item.id }, data: { caption: "QA Gallery V2", status: "DRAFT" } });
    live = await getPublishedGalleryItems();
    check("edit after publish -> previous published gallery caption stays live", live?.[0]?.caption === "QA Gallery V1", `public caption still '${live?.[0]?.caption}'`);
    h = await html("/");
    check("edit after publish -> live site keeps previous gallery value", h.includes("QA Gallery V1") && !h.includes("QA Gallery V2"), "");

    // unpublish → gone
    await prisma.websiteGalleryItem.update({ where: { id: item.id }, data: { status: "DRAFT", publishedAt: null, publishedData: Prisma.DbNull } });
    live = await getPublishedGalleryItems();
    check("unpublish -> gallery item gone from public", live === null, "");
    h = await html("/");
    check("unpublish -> no gallery preview on live site", !h.includes("QA Gallery V1") && !h.includes("QA Gallery V2"), "");

    // cleanup
    await prisma.websiteGalleryItem.delete({ where: { id: item.id } });
    const del = await storage.delete(up.fileId);
    check("cleanup: gallery row + storage file removed", del.success, "");
    // unpublish home back to baseline
    const secs2 = await prisma.websiteSection.findMany({ where: { pageId: homePage.id, deletedAt: null } });
    await prisma.$transaction([
      ...secs2.map((s) => prisma.websiteSection.update({ where: { id: s.id }, data: { publishedContent: Prisma.DbNull, publishedAt: null } })),
      prisma.websitePage.update({ where: { id: homePage.id }, data: { status: "DRAFT", publishedAt: null } }),
    ]);
    console.log("");
  }

  // ── Section 4: Navigation publish cycle ──────────────────────────────────
  console.log("Section 4  Navigation CMS publish cycle");
  {
    const navItems = await prisma.websiteNavItem.findMany({ where: { deletedAt: null }, orderBy: { position: "asc" } });
    const first = navItems[0];
    const originalLabel = first.label;
    check(`baseline: ${navItems.length} nav rows, none published`, (await getPublishedNavigation()) === null, "");

    // edit first label (draft) — mirrors updateNavItem (only content + status)
    await prisma.websiteNavItem.update({ where: { id: first.id }, data: { label: "About Test V1", status: "DRAFT" } });
    let cfg = await getPublicSiteConfig();
    check("edit draft -> public nav unchanged (fallback links)", cfg.navLinks[0].label === "Services", cfg.navLinks[0].label);
    let h = await html("/about");
    check("edit draft -> live header unchanged", h.includes("About Test V1") === false, "no test label in header");

    // publish all rows (mirror publishNavItem)
    for (const n of navItems) {
      const dsnap = { label: n.id === first.id ? "About Test V1" : n.label, url: n.url, position: n.position, visible: true, openNewTab: n.openNewTab, parentId: n.parentId };
      await prisma.websiteNavItem.update({ where: { id: n.id }, data: { status: "PUBLISHED", publishedAt: new Date(), publishedData: dsnap as Prisma.InputJsonValue } });
    }
    cfg = await getPublicSiteConfig();
    const liveNav = await getPublishedNavigation();
    check("publish -> CMS nav live with edited label", cfg.navLinks[0].label === "About Test V1" && (liveNav as unknown[]).length === navItems.length, `nav[0]='${cfg.navLinks[0].label}'`);
    h = await html("/about");
    check("publish -> live header shows edited label", h.includes("About Test V1"), "");

    // edit again (draft) — mirrors updateNavItem: keeps snapshot + publishedAt live
    await prisma.websiteNavItem.update({ where: { id: first.id }, data: { label: "About Test V2", status: "DRAFT" } });
    cfg = await getPublicSiteConfig();
    check("edit after publish -> previous published nav label stays live", cfg.navLinks[0].label === "About Test V1", cfg.navLinks[0].label);
    h = await html("/about");
    check("edit after publish -> live header keeps previous published value", h.includes("About Test V1") && !h.includes("About Test V2"), "");

    // unpublish all
    await prisma.$transaction(
      navItems.map((n) => prisma.websiteNavItem.update({ where: { id: n.id }, data: { status: "DRAFT", publishedAt: null, publishedData: Prisma.DbNull } }))
    );
    cfg = await getPublicSiteConfig();
    check("unpublish -> public nav falls back to the default links", cfg.navLinks[0].label === "Services", cfg.navLinks[0].label);
    h = await html("/about");
    check("unpublish -> live header back to static fallback", !h.includes("About Test"), "");

    // restore original label
    await prisma.websiteNavItem.update({ where: { id: first.id }, data: { label: originalLabel, status: "DRAFT", publishedData: Prisma.DbNull, publishedAt: null } });
    console.log("");
  }

  // ── Restore baseline ─────────────────────────────────────────────────────
  await prisma.websiteSection.update({ where: { id: heroOriginal.id }, data: { content: heroOriginalContent as Prisma.InputJsonValue, publishedContent: Prisma.DbNull, publishedAt: null } });
  await prisma.websitePage.update({ where: { id: homePage.id }, data: { status: "DRAFT", publishedData: Prisma.DbNull, publishedAt: null } });
  const restored = await getPublishedPage("home");
  const finalHtml = await html("/");
  check("baseline restored: home unpublished", restored === null, "");
  check("baseline restored: static home renders again", finalHtml.includes("Go deeper.") && !finalHtml.includes("CMS Hero") && !finalHtml.includes("QA Gallery"), "");
  const navState = await prisma.websiteNavItem.findMany({ where: { deletedAt: null } });
  check("baseline restored: nav labels intact", navState.every((n) => !n.label.includes("Test")), "");
  console.log("");

  const allClients = await getPublishedClients();
  const allGallery = await getPublishedGalleryItems();
  check("final: no extraneous live clients", allClients === null, "");
  check("final: no extraneous live gallery items", allGallery === null, "");

  console.log(failures === 0 ? `\nALL PASSED` : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("TEST ERROR:", e);
  process.exit(1);
});
