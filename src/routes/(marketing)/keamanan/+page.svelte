<script lang="ts">
	import Kertas from '$components/dasar/Kertas.svelte';

	const primitif = [
		['Key stretching', 'Argon2id', 'm = 64 MiB, t = 3, p = 1, keluaran 32 byte'],
		['Derivasi sub-kunci', 'HKDF-SHA-256', 'info berlabel versi'],
		['Enkripsi simetris', 'XChaCha20-Poly1305 (IETF)', 'nonce 24 byte acak, AAD wajib'],
		['Hash', 'BLAKE2b-256', 'blind index tag'],
		['Mnemonic', 'BIP-39', '256 bit entropi, 24 kata']
	];
</script>

<svelte:head>
	<title>Keamanan · Cloister</title>
</svelte:head>

<article style="display:flex;flex-direction:column;gap:var(--s-5);padding-bottom:var(--s-6)">
	<h1 class="t-judul t-xl">Keamanan dan kriptografi</h1>

	<Kertas padding="var(--s-6)">
		<h2 class="t-judul" style="color:var(--ink);font-size:var(--text-lg);margin-bottom:var(--s-4)">
			Primitif
		</h2>
		<div style="overflow-x:auto">
			<table style="width:100%;border-collapse:collapse;min-width:520px">
				<tbody>
					{#each primitif as [a, b, c], i (i)}
						<tr>
							<td
								style="padding:9px 10px;border-bottom:1px solid rgb(27 27 23 / 0.12);font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-soft);white-space:nowrap"
								>{a}</td
							>
							<td
								style="padding:9px 10px;border-bottom:1px solid rgb(27 27 23 / 0.12);font-family:var(--f-data);font-size:var(--text-sm);color:var(--ink)"
								>{b}</td
							>
							<td
								style="padding:9px 10px;border-bottom:1px solid rgb(27 27 23 / 0.12);font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-soft)"
								>{c}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Kertas>

	<Kertas warna="buram" padding="var(--s-6)">
		<div class="prosa">
			<h2>Hierarki kunci</h2>
			<pre><code>Sandi --Argon2id(salt_user)--&gt; Stretched Key 32B
  |--HKDF "cloister:auth:v1"--&gt; Auth Key   (dikirim ke server, di-hash ulang)
  `--HKDF "cloister:kek:v1" --&gt; KEK        (tidak pernah keluar perangkat)

Master Key 32B acak
  |--dibungkus KEK-----------&gt; wrapped_master_key
  |--dibungkus Recovery Key--&gt; recovery_wrapped_mk
  |--HKDF "cloister:index:v1"---&gt; Index Key (blind index tag)
  `--membungkus--------------&gt; DEK per entri --&gt; ciphertext entri</code></pre>

			<h2>Melaporkan kerentanan</h2>
			<p>
				Kirim ke alamat kontak di <code>SECURITY.md</code>. Kebijakan disclosure 90 hari. Semua
				perubahan pada <code>src/lib/crypto/</code> butuh review dua maintainer.
			</p>

			<h2>Model ancaman singkat</h2>
			<ul>
				<li>
					<strong>Operator server jahat atau dipaksa hukum</strong> — hanya mendapat ciphertext dan
					metadata yang didokumentasikan.
				</li>
				<li>
					<strong>Pencuri sandi</strong> — perangkat baru tidak otomatis dapat kunci. Mode Diperkuat
					menghapus jalur sandi sepenuhnya.
				</li>
				<li>
					<strong>XSS</strong> — ancaman paling serius. CSP ketat, kunci di Web Worker, semua
					markdown lewat DOMPurify, halaman publik dipisah dari bundle aplikasi.
				</li>
				<li>
					<strong>Perangkat dicuri</strong> — kunci aplikasi dengan PIN lokal, kunci dibuang dari
					memori saat terkunci.
				</li>
				<li>
					<strong>Pengguna sendiri membocorkan orang lain saat menerbitkan</strong> — Penyaring
					Identitas berjalan di perangkat sebelum apa pun dikirim, dan menandai hal yang bisa
					mengarah ke orang tertentu.
				</li>
			</ul>

			<h2>Yang tidak kami klaim</h2>
			<p>
				Penyimpanan terenkripsi melindungi dari paparan di sisi server, tetapi tidak bisa mengubah
				perangkat atau browser yang sudah dikompromikan menjadi lingkungan yang tepercaya. Kami
				tidak mengklaim kebal terhadap XSS, hanya berlapis melawannya. Verifikasi build mendeteksi
				penggantian bundle menyeluruh, bukan penggantian selektif ke satu pengguna. Setiap batas ini
				ditulis lengkap beserta sisa risikonya di <code>docs/THREAT-MODEL.md</code>.
			</p>

			<h2>Periksa sendiri</h2>
			<p>
				Kalau kamu punya akun, halaman <a href="/bukti">Bukti</a> memperlihatkan catatan aslimu,
				payload yang dikirim ke server, dan baris database yang sesungguhnya — berdampingan, dari
				sistem yang sedang berjalan. Verifikasi semacam ini sudah dilakukan Notesnook lewat
				Vericrypt; kami menganggapnya standar minimum untuk aplikasi terenkripsi, bukan fitur
				unggulan.
			</p>
		</div>
	</Kertas>
</article>
