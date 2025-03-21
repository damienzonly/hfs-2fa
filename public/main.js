{
    const { h, Btn} = HFS;
    const { useState, useEffect } = HFS.React;

    HFS.onEvent('userPanelAfterInfo', () => h(Dialog2FA))

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
        return h('div', { className: 'dialog', style: styles.dialog2faWrapper },
            h('div', { style: { display: 'flex', alignItems: 'center' } },
                h('b', null, `2FA is ${secret ? 'enabled' : 'disabled'}`),
                secretButton,
            ),
            secret && h('div', { style: { textAlign: 'center' }},
                h('div', null, `Note: The QR scan is needed only once`),
                h('div', null, `Scan the following QR in your authenticator app`),
                h('img', { src: secret.qr }),
                h('div', { style: { wordBreak: 'break-all' } }, 'Or manually: ', secret.base32),
            ),

        )
    }


    const styles = {
        dialog2faWrapper: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        },
        button: {
            marginLeft: '1em'
        }
    }

    function getSecret() {
        return HFS.customRestCall('getSecret').catch(() => null)
    }
    function createSecret() {
        return HFS.customRestCall('createSecret').catch(() => null)
    }
    function deleteSecret() {
        return HFS.customRestCall('deleteSecret').catch(() => null)
    }
}