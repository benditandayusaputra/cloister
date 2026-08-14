import adapterVercel from '@sveltejs/adapter-vercel';
import adapterNode from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// CLOISTER_ADAPTER=node untuk self-host, default Vercel.
			adapter:
				process.env.CLOISTER_ADAPTER === 'node'
					? adapterNode({ out: 'build' })
					: adapterVercel({ runtime: 'nodejs22.x' }),
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['none'],
					'script-src': ['self', 'wasm-unsafe-eval'],
					'style-src': ['self', 'unsafe-inline'],
					// Ubin peta baru diminta setelah pemiliknya menyetujui; lihat PetaLokasi.
					'img-src': ['self', 'blob:', 'data:', 'https://tile.openstreetmap.org'],
					// open-meteo dipanggil langsung dari browser, bukan lewat server kita,
					// supaya koordinat pengguna tidak pernah lewat sini. Tanpa baris ini
					// permintaannya diblokir CSP dan cuacanya diam-diam tidak pernah muncul.
					'connect-src': ['self', 'blob:', 'data:', 'https://api.open-meteo.com'],
					'font-src': ['self', 'data:'],
					'worker-src': ['self', 'blob:'],
					'manifest-src': ['self'],
					'frame-ancestors': ['none'],
					'base-uri': ['none'],
					'form-action': ['self'],
					'object-src': ['none']
				}
			},
			serviceWorker: { register: false },
			alias: {
				$crypto: 'src/lib/crypto',
				$components: 'src/lib/components'
			}
		})
	],
	worker: { format: 'es' },
	// Port sengaja tidak memakai default Vite (5173) supaya tidak bentrok
	// dengan aplikasi lain yang sedang berjalan.
	server: { port: 4820, strictPort: true },
	preview: { port: 4821, strictPort: true }
});
