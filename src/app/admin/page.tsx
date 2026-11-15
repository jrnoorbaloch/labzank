import type { Metadata } from "next";
import AdminDictionary from "@/components/dictionary/AdminDictionary";

export const metadata: Metadata = {
  title: "Admin — Labzaank",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDictionary />;
}
