exports.version = 1
exports.description = 'HFS 2FA Plugin'
exports.apiRequired = 12.1 // Btn
exports.frontend_js = ['main.js']

exports.config = {
    issuer: {
        type: 'string',
        label: 'Issuer',
    }
}

exports.init = async api => {
    const { getCurrentUsername } = api.require('./auth')
    const se = require('./speakeasy')
    const qr = require('./qrcode')
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

    return {
        customRest: {
            async createSecret({}, ctx) {
                const u = getCurrentUsername(ctx) || null
                if (!u) throw 'not logged in'
                const secret = se.generateSecret({ length: 20 })
                const existing = await db.get(u)
                if (existing) throw 'secret already exists'
                await db.put(u, secret)
                return { secret }
            },
            async deleteSecret({}, ctx) {
                const u = getCurrentUsername(ctx) || null
                if (!u) throw 'not logged in'
                const existing = await db.get(u)
                if (!existing) throw 'secret does not exist'
                await db.del(u)
                return {}
            },
            async getSecret({}, ctx) {
                const issuer = api.getConfig('issuer') || api.getHfsConfig('base_url') || ctx.host || 'HFS'
                const u = getCurrentUsername(ctx) || null
                if (!u) throw 'not logged in'
                const existing = await db.get(u)
                if (!existing) throw 'secret does not exist'
                return {...existing, qr: await qr.toDataURL(`${existing.otpauth_url}&issuer='${issuer}'`)}
            },
        }
    }
}