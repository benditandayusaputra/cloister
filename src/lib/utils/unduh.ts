export function unduhBlob(nama: string, blob: Blob) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = nama;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const unduhTeks = (nama: string, isi: string) =>
	unduhBlob(nama, new Blob([isi], { type: 'text/plain;charset=utf-8' }));
