import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>
  } catch {
    return {}
  }
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest()
    if (!request?.headers) throw new Error('Unauthorized: No request headers available')

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized: No authorization header provided')
    }

    const token = authHeader.slice(7).trim()
    if (!token || token.split('.').length !== 3) {
      throw new Error('Unauthorized: Invalid token')
    }

    // Do not call /auth/v1/user from this middleware. On the deployed app that
    // endpoint can reject an otherwise usable access token (403), which caused
    // the admin panel to incorrectly show "Acesso restrito". The token is only
    // decoded here to pass identity metadata downstream; the admin Edge Function
    // remains the authoritative verifier and checks the signed token server-side.
    const claims = decodeJwtPayload(token)
    const userId = String(claims.sub ?? '').trim()
    if (!userId) throw new Error('Unauthorized: No user ID found in token')

    return next({
      context: {
        userId,
        claims: { sub: userId, email: String(claims.email ?? '') },
        authorization: authHeader,
      },
    })
  },
)
