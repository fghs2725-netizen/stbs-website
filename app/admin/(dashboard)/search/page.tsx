import SearchClient from "./SearchClient";

export const metadata = {
  title: "Search | STBS Admin",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <SearchClient initialQuery={q || ""} />;
}
