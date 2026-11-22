"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SESSION_KEY } from "@/lib/domain";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(sessionStorage.getItem(SESSION_KEY) ? "/painel" : "/entrar");
  }, [router]);
  return null;
}
