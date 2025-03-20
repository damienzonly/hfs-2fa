exports.version = 1
exports.description = 'HFS 2FA Plugin'
exports.apiRequired = 12
exports.frontend_js = ['main.js']

exports.init = async api => {
    const { getCurrentUsername } = api.require('./auth')
    const se = require('speakeasy')
    const qr = require('qrcode')
    const db = await api.openDb('2fa')
    
    api.events.on('finalizingLogin', async ({ ctx, username, inputs}) => {
        if (!username) throw 'not logged in'
        const secret = await db.get(username)
        if (!secret) return
        const token = inputs.otp
        if (!token) throw 'missing OTP'
        const verified = se.totp.verify({
            secret: secret.base32,
            encoding: 'base32',
            token,
            window: 1
        })
        if (!verified) throw 'invalid OTP'
    })

    async function createSecretMiddleware(ctx) {
        const u = getCurrentUsername(ctx) || null
        if (!u) throw 'not logged in'
        const secret = se.generateSecret({ length: 20 })
        const existing = await db.get(u)
        if (existing) throw 'secret already exists'
        await db.put(u, secret)
        ctx.body = secret
        ctx.status = 200
        return ctx.stop()
    }

    async function deleteSecretMiddleware(ctx) {
        const u = getCurrentUsername(ctx) || null
        if (!u) throw 'not logged in'
        const existing = await db.get(u)
        if (!existing) throw 'secret does not exist'
        await db.del(u)
        ctx.body = 'ok'
        ctx.status = 200
        return ctx.stop()
    }

    async function getSecretMiddleware(ctx) {
        const u = getCurrentUsername(ctx) || null
        if (!u) throw 'not logged in'
        const existing = await db.get(u)
        if (!existing) throw 'secret does not exist'
        ctx.body = {...existing, qr: await qr.toDataURL(existing.otpauth_url)}
        ctx.status = 200
        return ctx.stop()
    }

    return {
        middleware(ctx) {
            if (ctx.method !== 'POST') return
            switch (ctx.path) {
                case '/~/api/2fa/createSecret':
                    return createSecretMiddleware(ctx)
                case '/~/api/2fa/deleteSecret':
                    return deleteSecretMiddleware(ctx)
                case '/~/api/2fa/getSecret':
                    return getSecretMiddleware(ctx)
            }
        }
    }
}