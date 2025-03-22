exports.version = 1
exports.description = 'Implements OTP 2FA authentication'
exports.apiRequired = 12.1 // Btn
exports.frontend_js = ['main.js']
exports.repo = "damienzonly/hfs-2fa"
exports.preview = ["https://github.com/user-attachments/assets/58336a9c-7cec-428e-8a19-3203e7160702","https://github.com/user-attachments/assets/89e0c41b-6a74-4c6a-becc-072517c72d97","https://github.com/user-attachments/assets/8edb44a7-7949-4242-8fa7-de18da0e48e4","https://github.com/user-attachments/assets/e4f4ea64-ac6a-4274-84ea-9a1078c5f99f"]

exports.config = {
    issuer: {
        type: 'string',
        label: 'Issuer',
        helperText: 'This will appear in the authenticator app, if not set, it will use base_url or the server host name'
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