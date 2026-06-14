"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 관리 허브가 단일 진입점이므로 /mypage/manage 직접 진입은 /mypage로 보낸다.
export default function ManageIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/mypage");
  }, [router]);
  return null;
}
