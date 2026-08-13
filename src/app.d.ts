declare global {
	namespace App {
		interface Error {
			title?: string;
			detail?: string;
		}
		interface Locals {
			nonce?: string;
		}
	}
}

export {};
