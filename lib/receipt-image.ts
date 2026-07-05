/** Target pixel width for receipt logos on thermal paper. */
export function getLogoTargetWidth(paperSize: '58mm' | '80mm') {
  return paperSize === '80mm' ? 280 : 200;
}

export function getQrTargetWidth(paperSize: '58mm' | '80mm') {
  return paperSize === '80mm' ? 240 : 180;
}

/** Resize image to exact print width with high-quality scaling (client-side only). */
export function resizeImageForPrint(dataUrl: string, targetWidth: number): Promise<string> {
  if (!dataUrl || !targetWidth) return Promise.resolve('');
  if (typeof window === 'undefined') return Promise.resolve(dataUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const naturalW = img.naturalWidth || targetWidth;
      const naturalH = img.naturalHeight || targetWidth;
      if (naturalW <= 0 || naturalH <= 0) {
        resolve(dataUrl);
        return;
      }

      const aspect = naturalH / naturalW;
      const targetHeight = Math.max(1, Math.round(targetWidth * aspect));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function buildLogoHtml(logoDataUrl: string, targetWidth: number) {
  if (!logoDataUrl) return '';
  return (
    '<div style="text-align:center;margin-bottom:8px;">' +
    `<img src="${logoDataUrl}" width="${targetWidth}" height="auto" ` +
    `style="width:${targetWidth}px;height:auto;display:block;margin:0 auto;` +
    'image-rendering:optimizeQuality;-ms-interpolation-mode:bicubic;" alt="" />' +
    '</div>'
  );
}

/** Prepend logo block for browser / iframe print fallbacks. */
export function injectLogoIntoReceiptHtml(html: string, logoHtml: string) {
  if (!logoHtml) return html;
  if (html.includes('<body>')) {
    return html.replace('<body>', '<body>' + logoHtml);
  }
  return logoHtml + html;
}
