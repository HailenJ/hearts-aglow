import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet } from 'jose'
import { verifyAccess } from '../src/auth.js'
import worker from '../src/index.js'

const env = { TEAM_DOMAIN: 'https://team.cloudflareaccess.com', POLICY_AUD: 'aud123' }
const { publicKey, privateKey } = await generateKeyPair('RS256')
const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: 'RS256', kid: 'k1' }] })

const sign = ({ iss = env.TEAM_DOMAIN, aud = env.POLICY_AUD, exp = '1h' } = {}) =>
  new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(iss).setAudience(aud).setIssuedAt().setExpirationTime(exp).sign(privateKey)
const req = (token, path = '/') =>
  new Request('https://stats.heartsaglow.io' + path, { headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {} })

test('a valid token for the right audience and issuer passes', async () => {
  assert.equal(await verifyAccess(req(await sign()), env, jwks), true)
})

test('no header, expired token, wrong aud, wrong iss each fail', async () => {
  assert.equal(await verifyAccess(req(), env, jwks), false)
  assert.equal(await verifyAccess(req(await sign({ exp: Math.floor(Date.now() / 1000) - 60 })), env, jwks), false)
  assert.equal(await verifyAccess(req(await sign({ aud: 'other' })), env, jwks), false)
  assert.equal(await verifyAccess(req(await sign({ iss: 'https://evil.example' })), env, jwks), false)
})

test('fetch returns 403 for / and /style.css without a valid token', async () => {
  let called = false
  const e = { ...env, ASSETS: { fetch: () => { called = true; return new Response('x') } } }
  for (const p of ['/', '/style.css']) {
    const res = await worker.fetch(req(null, p), e)
    assert.equal(res.status, 403)
    assert.equal(await res.text(), 'Forbidden')
  }
  assert.equal(called, false)
})

test('fetch returns 403 when TEAM_DOMAIN or POLICY_AUD is unset', async () => {
  const token = await sign()
  for (const e of [{ ...env, TEAM_DOMAIN: '' }, { ...env, POLICY_AUD: '' }]) {
    assert.equal((await worker.fetch(req(token), e)).status, 403)
  }
})
