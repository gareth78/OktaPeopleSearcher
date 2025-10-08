import type { Metadata } from "next";
import { ReactNode } from "react";

import "../styles/globals.css";

type RootLayoutProps = {
  children: ReactNode;
};

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "OrgContact";

export const metadata: Metadata = {
  title: appName,
  description: `${appName} helps teammates find contact details quickly.`,
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}
