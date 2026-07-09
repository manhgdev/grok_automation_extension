/**
 * Injected into Grok page to replace file-picker uploads
 * with programmatic File objects from extension messages.
 */
let activeInput = null;
const originalClick = HTMLInputElement.prototype.click;

HTMLInputElement.prototype.click = function (...args) {
  const isExtensionUpload =
    this.type === 'file' && document.documentElement.getAttribute('data-grok-active') === 'true';

  if (!isExtensionUpload) {
    return originalClick.apply(this, args);
  }

  activeInput = this;
};

document.addEventListener('GROK_UPLOAD_FILE_DATA', (event) => {
  const detail = event.detail;
  if (!detail || !activeInput) return;

  try {
    const { base64, filename, mimeType } = detail;
    let data = base64 || '';

    if (data.includes(',')) {
      data = data.split(',')[1];
    }

    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });
    const transfer = new DataTransfer();

    transfer.items.add(file);
    activeInput.files = transfer.files;
    activeInput.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {
    // ignore invalid payload
  } finally {
    activeInput = null;
  }
});
