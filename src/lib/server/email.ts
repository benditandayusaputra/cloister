import { CFG } from './env.ts';

interface Mail {
	to: string;
	subject: string;
	text: string;
}

async function send(mail: Mail): Promise<void> {
	if (!CFG.resendKey) {
		console.info(`[email:dev] ke=${mail.to} subjek=${mail.subject}\n${mail.text}`);
		return;
	}
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { authorization: `Bearer ${CFG.resendKey}`, 'content-type': 'application/json' },
		body: JSON.stringify({ from: CFG.mailFrom, to: mail.to, subject: mail.subject, text: mail.text })
	});
	if (!res.ok) console.error('[email] gagal', await res.text());
}

export const mail = {
	verify: (to: string, code: string) =>
		send({
			to,
			subject: 'Kode verifikasi Cloister',
			text: `Kode verifikasi kamu: ${code}\n\nBerlaku 10 menit. Kalau bukan kamu yang mendaftar, abaikan email ini.`
		}),

	passwordChanged: (to: string) =>
		send({
			to,
			subject: 'Sandi Cloister kamu diganti',
			text: 'Sandi akun Cloister kamu baru saja diganti dan semua sesi lain dicabut. Kalau bukan kamu, segera pulihkan akun dengan 24 kata pemulihan.'
		}),

	deviceAdded: (to: string, name: string) =>
		send({
			to,
			subject: 'Perangkat baru terhubung ke Cloister',
			text: `Perangkat "${name}" baru saja disambungkan ke akunmu. Kalau bukan kamu, cabut perangkat itu di Pengaturan lalu ganti sandi.`
		}),

	recoveryUsed: (to: string) =>
		send({
			to,
			subject: 'Frasa pemulihan Cloister dipakai',
			text: 'Frasa pemulihan 24 kata akunmu baru saja dipakai untuk membuka arsip di perangkat baru. Kalau bukan kamu, segera ganti sandi.'
		}),

	mulaiBaru: (to: string, code: string, jumlahEntri: number) =>
		send({
			to,
			subject: 'Kode untuk mulai dari nol di Cloister',
			text: `Kode: ${code}\n\nSeseorang meminta memulai Cloister dari nol untuk akun ini. Kalau dilanjutkan, ${jumlahEntri} tulisan lamamu tidak akan bisa dibuka lagi tanpa 24 kata pemulihan yang lama.\n\nKode berlaku 10 menit.\n\nKALAU BUKAN KAMU: jangan berikan kode ini ke siapa pun, dan segera ganti sandimu. Seseorang tahu sandi akunmu.`
		}),

	mulaiBaruSelesai: (to: string, tenggangHari: number) =>
		send({
			to,
			subject: 'Cloister kamu dimulai dari nol',
			text: `Akun Cloister kamu baru saja dimulai dari nol dengan kunci baru. Semua perangkat lain dikeluarkan.\n\nTulisan lamamu belum dihapus. Kalau kamu menemukan 24 kata pemulihan yang lama dalam ${tenggangHari} hari ke depan, semuanya masih bisa diambil kembali. Setelah itu dibuang permanen.\n\nKalau bukan kamu yang melakukan ini, segera hubungi kami.`
		}),

	accountDeleted: (to: string) =>
		send({
			to,
			subject: 'Akun Cloister dijadwalkan dihapus',
			text: 'Akunmu akan dihapus permanen dalam 7 hari. Masuk kembali sebelum itu untuk membatalkan.'
		})
};
