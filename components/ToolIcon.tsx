import type { ToolIcon as ToolIconName } from "@/lib/tools";

const paths: Record<ToolIconName, string[]> = {
  merge: [
    "M8 7h7a4 4 0 0 1 0 8H8",
    "M8 7l3-3m-3 3 3 3",
    "M16 17H9a4 4 0 0 1 0-8h1",
  ],
  split: [
    "M7 4v6a4 4 0 0 1-4 4",
    "M7 10a4 4 0 0 0 4 4h2",
    "M17 4v16",
    "M14 7l3-3 3 3",
    "M14 17l3 3 3-3",
  ],
  compress: [
    "M8 3v6H2",
    "M8 9 3 4",
    "M16 21v-6h6",
    "M16 15l5 5",
    "M9 15h6",
    "M12 12v6",
  ],
  pdfWord: [
    "M7 3h7l5 5v13H7z",
    "M14 3v5h5",
    "M9 13l1.2 5 1.8-5 1.8 5 1.2-5",
  ],
  wordPdf: [
    "M6 3h8l5 5v13H6z",
    "M14 3v5h5",
    "M9 14h6",
    "M9 18h4",
  ],
  pdfPptx: [
    "M6 3h8l5 5v13H6z",
    "M14 3v5h5",
    "M9 12h6",
    "M9 16h4",
    "M9 9h2",
  ],
  pptxPdf: [
    "M4 3h8l5 5v13H4z",
    "M11 3v5h5",
    "M7 13h10",
    "M9 17l3-3 3 3",
  ],
  pdfExcel: [
    "M6 3h8l5 5v13H6z",
    "M14 3v5h5",
    "M8 12h8",
    "M8 16h8",
    "M9 9h2",
  ],
  excelPdf: [
    "M4 3h8l5 5v13H4z",
    "M11 3v5h5",
    "M7 13h10",
    "M9 17l3-3 3 3",
  ],
  pdfJpg: [
    "M6 3h8l5 5v13H6z",
    "M14 3v5h5",
    "M9 17l2.2-2.5 1.8 2 1.4-1.5L17 18H8z",
    "M10 12h.01",
  ],
  jpgPdf: [
    "M4 5h16v14H4z",
    "M7 15l3-3 2.5 3 2-2.2L18 16",
    "M8 9h.01",
  ],
  ocr: [
    "M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z",
    "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z",
    "M5 4h4",
    "M15 20h4",
  ],
  rotate: [
    "M20 7v6h-6",
    "M20 13a8 8 0 1 1-2.3-5.7L20 10",
  ],
  watermark: [
    "M12 3c3.5 4 6 7.3 6 10a6 6 0 0 1-12 0c0-2.7 2.5-6 6-10Z",
    "M8.5 15.5c2.2 1.5 4.5 1.5 7 0",
  ],
  lock: [
    "M7 10V8a5 5 0 0 1 10 0v2",
    "M6 10h12v11H6z",
    "M12 14v3",
  ],
  unlock: [
    "M8 10V8a5 5 0 0 1 9.5-2.2",
    "M6 10h12v11H6z",
    "M12 14v3",
  ],
  organize: [
    "M5 5h14",
    "M5 12h14",
    "M5 19h14",
    "M8 3v4",
    "M16 10v4",
    "M11 17v4",
  ],
  number: [
    "M8 4 6 20",
    "M16 4l-2 16",
    "M4 9h18",
    "M3 15h18",
  ],
  signature: [
    "M4 18c2.5-5 4-8 6-8 2.4 0 1.2 5-1 5-1.6 0-1.5-2.5.4-2.5 2.6 0 3.1 5.5 6.1 5.5 1.4 0 2.5-.6 3.5-1.5",
    "M18 5l2 2",
    "M13 12l6-6",
  ],
  crop: [
    "M6 2v14a2 2 0 0 0 2 2h14",
    "M22 18V6a2 2 0 0 0-2-2H10",
    "M2 6h4",
    "M18 22v-4",
  ],
  repair: [
    "M14 7l3-3 3 3-3 3",
    "M5 19l9-9",
    "M3 21h6",
    "M14 14l7 7",
  ],
  htmlPdf: [
    "M4 6h16",
    "M4 10h16",
    "M4 14h10",
    "M4 18h6",
    "M18 18l4-4-4-4",
  ],
  pdfPdfa: [
    "M6 3h8l5 5v13H6z",
    "M14 3v5h5",
    "M9 13h6",
    "M9 17h4",
    "M16 17h2",
  ],
  redact: [
    "M4 4h16v6H4z",
    "M4 14h16v6H4z",
  ],
  compare: [
    "M4 4h6v16H4z",
    "M14 4h6v16h-6z",
    "M10 12h4",
  ],
  forms: [
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M8 8h8",
    "M8 12h8",
    "M8 16h5",
  ],
  summarizeAi: [
    "M6 4h12",
    "M6 8h12",
    "M6 12h8",
    "M6 16h6",
    "M17 14l2 2 4-4",
  ],
  translate: [
    "M3 5h8",
    "M7 3v2",
    "M3 9c2 4 6 4 8 0",
    "M11 21l4-10 4 10",
    "M12 18h6",
  ],
};

export function ToolIcon({ icon, className = "h-6 w-6" }: { icon: ToolIconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[icon].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}
