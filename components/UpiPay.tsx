"use client";
// "Pay with UPI": a button that opens GPay/PhonePe/Paytm on phones, plus a QR code for
// paying from another phone, and the UPI ID to copy. Money goes straight to the shop.
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { formatPrice, upiLink } from "@/lib/catalogue";
import { CopyButton } from "./CopyButton";

export function UpiPay({ upiId, payee, amount, note, label }: { upiId: string; payee: string; amount?: number; note: string; label?: string }) {
  const link = upiLink(upiId, payee, amount, note);
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(link, { width: 220, margin: 1, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(null));
  }, [link]);

  return (
    <div className="upi">
      <a className="btn upi-btn" href={link}>
        {label ?? (amount ? `Pay ${formatPrice(amount)} with UPI` : "Pay with UPI")}
      </a>
      <p className="hint small">Opens GPay, PhonePe, Paytm or any UPI app on your phone.</p>
      <div className="upi-alt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt={`UPI QR code for ${upiId}`} width={140} height={140} />}
        <div>
          <p className="hint small">Or scan with another phone, or pay to:</p>
          <p className="upi-id">{upiId}</p>
          <CopyButton text={upiId} />
        </div>
      </div>
    </div>
  );
}
