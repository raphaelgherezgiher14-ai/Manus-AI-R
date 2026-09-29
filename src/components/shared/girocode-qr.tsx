import { QRCodeSVG } from "qrcode.react";

interface GiroCodeQrProps {
  value: string;
  size?: number;
}

/**
 * Renders a GiroCode / EPC QR (ISO 20022). Error correction M is required by
 * the GiroCode spec so banking apps can scan the payload reliably.
 */
export function GiroCodeQr({ value, size = 220 }: GiroCodeQrProps) {
  return (
    <div className="inline-flex rounded-xl border border-border/60 bg-white p-3">
      <QRCodeSVG value={value} size={size} level="M" fgColor="#0B172A" bgColor="#ffffff" />
    </div>
  );
}
