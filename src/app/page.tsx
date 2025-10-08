export const dynamic = "force-dynamic";
export const revalidate = 0;

import { unstable_noStore as noStore } from "next/cache";

import { UsersExplorer } from "../components/UsersExplorer";

export default function HomePage() {
  noStore();
  return <UsersExplorer />;
}
