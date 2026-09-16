import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";

// SASE 디자인 시스템 서체. 한글 글립이 많아 unicode-range로 쪼갠 서브셋을 쓴다 —
// 화면에 실제로 나온 글자 구간의 woff2만 내려받는다 (외부 CDN 없이 자체 서빙).
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI 기반 일일 배송 최적화 시스템",
  description:
    "출고등록현황과 차량 톤수 마스터를 업로드해 기사 9명·12회전 배차 코스를 자동 편성합니다. 데이터베이스를 쓰지 않는 무저장 구조.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
