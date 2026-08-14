import _sodium from 'libsodium-wrappers-sumo';

export type Sodium = typeof _sodium;

let ready: Promise<Sodium> | null = null;

export function sodium(): Promise<Sodium> {
	if (!ready) ready = _sodium.ready.then(() => _sodium);
	return ready;
}
