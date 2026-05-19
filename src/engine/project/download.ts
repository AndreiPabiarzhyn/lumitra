export const createObjectDownloadUrl = (blob: Blob): string => URL.createObjectURL(blob);

export const downloadUrl = (url: string, filename: string) => {
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = createObjectDownloadUrl(blob);
  downloadUrl(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

export const saveBlob = async (
  blob: Blob,
  filename: string,
  _pickerTypes?: SaveFilePickerOptions['types'],
) => {
  // Prefer the browser download flow so users get the normal Downloads feedback.
  downloadBlob(blob, filename);
};

export const downloadDataUrl = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');

  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const readFileAsText = (file: File): Promise<string> => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  })
);

export const pickProjectFile = (): Promise<File | null> => (
  new Promise((resolve) => {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.lumitra,application/json';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      input.remove();
      resolve(file);
    };
    document.body.appendChild(input);
    input.click();
  })
);

export const pickImageFile = (): Promise<File | null> => (
  new Promise((resolve) => {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      input.remove();
      resolve(file);
    };
    document.body.appendChild(input);
    input.click();
  })
);
type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};
