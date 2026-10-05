import '@testing-library/jest-dom';

// jsdom's Blob lacks text(), which every supported browser has; error bodies
// of blob downloads are read with it.
if (!Blob.prototype.text) {
  Blob.prototype.text = function text(this: Blob) {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(this);
    });
  };
}
