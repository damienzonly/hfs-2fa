{
    const { h, Btn} = HFS;
    const { useState, useEffect } = HFS.React;

    HFS.onEvent('appendMenuBar', () => h(Btn, {
        icon: 'key',
        label: '2FA',
        onClick: () => {
            HFS.dialogLib.newDialog({ title: '2FA', Content: Dialog2FA })
        }
    }))

    HFS.onEvent('beforeLoginSubmit', () => h(OTPInput))

    function OTPInput() {
        const [otp, setOtp] = useState('')
        return h('div', { className: 'field' },
            h('label', { htmlFor: 'otp' }, 'OTP'),
            h('input', {
                id: 'otp',
                name: 'otp',
                type: 'tel',
                onChange: e => setOtp(e.target.value),
                value: otp
            }),
            h('p', {style: { fontSize: '0.8em'}}, 'Ignore if you do not have 2FA enabled')
        )
    }

    function Dialog2FA() {
        const [secret, setSecret] = useState(null)
        async function load() {
            const secret = await getSecret()
            if (secret) setSecret(secret)
        }

        useEffect(() => { load() }, [])

        const secretButton = secret ? h(Btn, {
            label: 'Disable',
            style: styles.button,
            onClick: () => {
                deleteSecret().finally(() => {
                    setSecret(null)
                })
            }
        }) : h(Btn, {
            label: 'Configure',
            style: styles.button,
            onClick: () => {
                createSecret().then(s => {
                    load()
                })
            }
        })
        const components = [
            h('h5', null, `2FA is ${secret ? 'enabled' : 'disabled'}`),
            secret ? h('p', null, `Note: The QR scan is needed only once`) : null,
            secret ? h('p', null, `Scan the following QR in your authenticator app`) : null,
            secret ? h('img', { src: secret.qr }) : null,
            secret ? h('p', null, 'Or manually:') : null,
            secret ? h('p', null, secret.base32) : null,
            secretButton
        ]
        return h('div', { className: 'dialog', style: styles.dialog2faWrapper }, null,
           ...components.filter(Boolean)
        )
    }
}

const styles = {
    dialog2faWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        marginTop: '1em'
    }
}

function getSecret() {
    return fetch('/~/api/2fa/getSecret', {method: 'POST'}).then(r => r.json()).catch(() => null)
}
function createSecret() {
    return fetch('/~/api/2fa/createSecret', {method: 'POST'}).then(r => r.json()).catch(() => null)
}

function deleteSecret() {
    return fetch('/~/api/2fa/deleteSecret', {method: 'POST'}).then(r => r.json()).catch(() => null)
}