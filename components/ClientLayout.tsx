"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define se a página atual é a de login
  const isLoginPage = pathname === "/login";

  return (
    <div className="min-h-screen bg-[#050c1a]">
      {/* SÓ MOSTRA A SIDEBAR SE NÃO FOR PÁGINA DE LOGIN */}
      {!isLoginPage ? (
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-8 ml-64 overflow-y-auto h-screen">
            {children}
          </main>
        </div>
      ) : (
        /* TELA DE LOGIN CHEIA SEM SIDEBAR */
        <main className="w-full h-screen">{children}</main>
      )}
    </div>
  );
}
