import { cn } from "@/lib/utils";

/**
 * SASE 로고 (디자인 시스템 01. LOGO)
 *
 * 빨간 타원 + 흰 테두리 + 흰 워드마크 + 노란 스우시. 외부 이미지 없이 인라인 SVG로 그린다.
 */
export function SaseLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 64"
      role="img"
      aria-label="SASE"
      className={cn("h-9 w-auto shrink-0", className)}
    >
      <ellipse cx="60" cy="32" rx="59" ry="31" fill="#e31f26" />
      <ellipse cx="60" cy="32" rx="55" ry="27" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path
        d="M28 45.5 C 48 53, 76 53, 94 42.5 C 78 49.5, 50 50.5, 28 45.5 Z"
        fill="#e1d200"
      />
      <text
        x="60"
        y="41"
        textAnchor="middle"
        fontFamily="'Pretendard Variable', Pretendard, sans-serif"
        fontSize="29"
        fontWeight="800"
        letterSpacing="-0.5"
        fill="#fff"
      >
        SASE
      </text>
    </svg>
  );
}
