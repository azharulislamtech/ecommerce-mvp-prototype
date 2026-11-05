import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata;
// R11.2: the site root is lang="bn"; the admin is written in English, so screen readers and
// spell-checkers get the right language here.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div lang="en">{children}</div>;
}
