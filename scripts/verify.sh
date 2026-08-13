#!/usr/bin/env bash
#
# Verifikasi build Cloister.
#
# Menjawab pertanyaan: "bagaimana saya tahu JavaScript yang dikirim peladen
# tidak disisipi backdoor?"
#
# Cara kerjanya: ambil build-manifest.json dari rilis GitHub, unduh setiap aset
# yang disebutkan di dalamnya dari situs yang sedang berjalan, hitung SHA-256-nya,
# lalu bandingkan.
#
#   ./scripts/verify.sh https://cloister.app v1.0.0
#
# BATASAN YANG WAJIB DIBACA
#
#   Ini mendeteksi penggantian MENYELURUH — ketika peladen melayani bundle
#   berbeda kepada semua orang. Ia TIDAK mendeteksi penggantian SELEKTIF, yaitu
#   ketika peladen melayani bundle jahat hanya kepada satu pengguna yang
#   ditargetkan dan bundle bersih kepada pemeriksa. Untuk kasus itu dibutuhkan
#   pemverifikasi di luar halaman itu sendiri; lihat docs/THREAT-MODEL.md.
#
set -euo pipefail

URL="${1:-}"
TAG="${2:-}"
REPO="${CLOISTER_REPO:-benditandayusaputra/cloister}"

if [[ -z "$URL" || -z "$TAG" ]]; then
	echo "Pakai: $0 <url-produksi> <tag-rilis>" >&2
	echo "Contoh: $0 https://cloister.app v1.0.0" >&2
	exit 2
fi

URL="${URL%/}"

for alat in curl jq; do
	command -v "$alat" >/dev/null 2>&1 || { echo "Butuh '$alat' di PATH." >&2; exit 2; }
done

# sha256sum di Linux, shasum -a 256 di macOS.
if command -v sha256sum >/dev/null 2>&1; then
	hitung() { sha256sum | cut -d' ' -f1; }
elif command -v shasum >/dev/null 2>&1; then
	hitung() { shasum -a 256 | cut -d' ' -f1; }
else
	echo "Butuh sha256sum atau shasum." >&2
	exit 2
fi

KERJA="$(mktemp -d)"
trap 'rm -rf "$KERJA"' EXIT

MANIFEST_URL="https://github.com/${REPO}/releases/download/${TAG}/build-manifest.json"
SIG_URL="${MANIFEST_URL}.minisig"

echo "Repositori : $REPO"
echo "Rilis      : $TAG"
echo "Situs      : $URL"
echo

echo "Mengambil manifest…"
if ! curl -fsSL "$MANIFEST_URL" -o "$KERJA/manifest.json"; then
	echo "GAGAL: manifest tidak ditemukan di $MANIFEST_URL" >&2
	echo "Rilis itu mungkin belum memuat manifest, atau tag-nya salah." >&2
	exit 1
fi

# Tanda tangan bersifat opsional supaya skrip tetap berguna tanpa minisign,
# tapi kalau minisign ada dan kunci publiknya ada, verifikasi wajib lulus.
if curl -fsSL "$SIG_URL" -o "$KERJA/manifest.json.minisig" 2>/dev/null; then
	if command -v minisign >/dev/null 2>&1 && [[ -f "$(dirname "$0")/minisign.pub" ]]; then
		echo -n "Tanda tangan manifest: "
		if minisign -Vm "$KERJA/manifest.json" -p "$(dirname "$0")/minisign.pub" >/dev/null 2>&1; then
			echo "valid"
		else
			echo "TIDAK VALID"
			exit 1
		fi
	else
		echo "Tanda tangan manifest: ada, tapi minisign atau kunci publik tidak tersedia — dilewati"
	fi
else
	echo "Tanda tangan manifest: tidak ada di rilis ini"
fi
echo

TOTAL=0
COCOK=0
BEDA=0
HILANG=0

while IFS=$'\t' read -r jalur hash_harap; do
	[[ -z "$jalur" ]] && continue
	TOTAL=$((TOTAL + 1))

	if ! curl -fsSL "${URL}${jalur}" -o "$KERJA/aset" 2>/dev/null; then
		echo "  HILANG   $jalur"
		HILANG=$((HILANG + 1))
		continue
	fi

	hash_asli="$(hitung < "$KERJA/aset")"
	if [[ "$hash_asli" == "$hash_harap" ]]; then
		COCOK=$((COCOK + 1))
	else
		echo "  BEDA     $jalur"
		echo "           harap: $hash_harap"
		echo "           dapat: $hash_asli"
		BEDA=$((BEDA + 1))
	fi
done < <(jq -r '.assets[] | "\(.path)\t\(.sha256)"' "$KERJA/manifest.json")

echo
echo "Memeriksa $TOTAL aset"
echo "$COCOK cocok, $BEDA tidak cocok, $HILANG tidak ditemukan"

if (( BEDA > 0 || HILANG > 0 )); then
	echo
	echo "HASIL: TIDAK COCOK."
	echo "Aset yang dilayani $URL berbeda dari yang ditandatangani di rilis $TAG."
	exit 1
fi

echo
echo "HASIL: COCOK."
echo "Semua aset yang dilayani identik dengan yang ditandatangani di rilis $TAG."
echo "Ingat: ini tidak mendeteksi penggantian selektif ke satu pengguna."
