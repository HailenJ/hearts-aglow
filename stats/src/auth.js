import { createRemoteJWKSet, jwtVerify } from 'jose'

// One remote set per team domain; jose caches the fetched keys inside it.
const remote = new Map()

export async function verifyAccess(request, env, jwks) {
  // Local preview only: both flags live in the gitignored .dev.vars, never in wrangler.jsonc.
  if (env.ENVIRONMENT === 'dev' && env.DEV_SKIP_ACCESS === '1') return true
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  // Fail closed: an unconfigured gate admits nobody.
  if (!token || !env.TEAM_DOMAIN || !env.POLICY_AUD) return false
  try {
    if (!jwks) {
      if (!remote.has(env.TEAM_DOMAIN)) {
        remote.set(env.TEAM_DOMAIN, createRemoteJWKSet(new URL(env.TEAM_DOMAIN + '/cdn-cgi/access/certs')))
      }
      jwks = remote.get(env.TEAM_DOMAIN)
    }
    await jwtVerify(token, jwks, { issuer: env.TEAM_DOMAIN, audience: env.POLICY_AUD, algorithms: ['RS256'] })
    return true
  } catch {
    return false
  }
}
