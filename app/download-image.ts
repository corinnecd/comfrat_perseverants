/**
 * Télécharge une image (QR en data:URL) sans la mettre dans un lien :
 * évite que le navigateur affiche en bas de page la longue adresse « data:image/png;base64… » au survol.
 */
export async function downloadImage(dataUrl: string, filename: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
