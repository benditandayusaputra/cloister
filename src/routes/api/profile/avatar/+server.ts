import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, profiles } from '$lib/db/server/index.ts';
import { handler, bad, tooLarge } from '$lib/server/problem.ts';
import { requireAuth, assertSameOrigin } from '$lib/server/auth.ts';
import { blob } from '$lib/server/blob.ts';

const MAKS_BYTE = 1_048_576;

const kunciAvatar = (userId: string) => `avatar/${userId.slice(0, 2)}/${userId}.img`;

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);

		const form = await event.request.formData().catch(() => null);
		const foto = form?.get('foto');
		if (!(foto instanceof File)) throw bad('Kirim berkas gambar di bidang "foto"');
		if (foto.type !== 'image/webp') throw bad('Format harus WebP');
		if (foto.size > MAKS_BYTE) throw tooLarge('Foto profil maksimal 1 MB');

		const bytes = new Uint8Array(await foto.arrayBuffer());
		await blob.put(kunciAvatar(ctx.userId), bytes);

		const avatarUrl = `/api/profile/avatar/${ctx.userId}?v=${Date.now().toString(36)}`;
		await db
			.insert(profiles)
			.values({ userId: ctx.userId, avatarUrl })
			.onConflictDoUpdate({ target: profiles.userId, set: { avatarUrl } });

		return json({ avatarUrl });
	});

export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		await blob.del(kunciAvatar(ctx.userId));
		await db.update(profiles).set({ avatarUrl: null }).where(eq(profiles.userId, ctx.userId));
		return json({ avatarUrl: null });
	});
