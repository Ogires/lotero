// Secretos del Worker (`wrangler secret put`): no están en wrangler.jsonc, así que
// `wrangler types` no los incluye. Se añaden al `Env` global y al de `cloudflare:workers`.

interface SecretosLotero {
  /** Token que exige `POST /admin/ingesta`; el workflow de GitHub lo tiene como secreto. */
  ADMIN_TOKEN: string;
  /** Token de GitHub de grano fino con permiso Actions: write sobre el repositorio. */
  GITHUB_DISPATCH_TOKEN: string;
}

interface Env extends SecretosLotero {}

declare namespace Cloudflare {
  interface Env extends SecretosLotero {}
}
