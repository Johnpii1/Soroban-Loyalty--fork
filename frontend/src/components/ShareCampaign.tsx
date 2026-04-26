"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/context/I18nContext";

interface Props {
  campaignId: number;
  url: string;
}

export function ShareCampaign({ campaignId, url }: Props) {
  const { toast } = useToast();
  const { t } = useI18n();
  const qrRef = useRef<HTMLDivElement>(null);

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    toast(t('sharing.copied'), "success");
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `campaign-${campaignId}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast(t('sharing.downloaded'), "success");
    }
  };

  return (
    <div className="share-campaign-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      padding: '24px',
      background: 'var(--bg-surface)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      maxWidth: '400px',
      margin: '20px 0'
    }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('sharing.title')}</h3>
      <div className="qr-box" ref={qrRef} style={{
        background: '#fff',
        padding: '12px',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <QRCodeCanvas
          value={url}
          size={180}
          bgColor={"#ffffff"}
          fgColor={"#0f1117"}
          level={"H"}
          includeMargin={false}
        />
      </div>
      <div className="share-actions" style={{
        display: 'flex',
        gap: '12px',
        width: '100%'
      }}>
        <button onClick={copyUrl} className="btn btn-primary" style={{ flex: 1 }}>
          {t('sharing.copyUrl')}
        </button>
        <button onClick={downloadQR} className="btn btn-outline" style={{ flex: 1 }}>
          {t('sharing.downloadQR')}
        </button>
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all', textAlign: 'center' }}>
        {url}
      </div>
    </div>
  );
}
