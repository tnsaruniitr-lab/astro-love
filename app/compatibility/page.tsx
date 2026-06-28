import { redirect } from "next/navigation";

// Compatibility is now the home page. Keep this route as a permanent redirect
// so older shared links (/compatibility?r=...) still resolve to the reading.
export default function Page({ searchParams }: { searchParams?: { r?: string } }) {
  redirect(searchParams?.r ? `/?r=${searchParams.r}` : "/");
}
