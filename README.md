# Star Tap Hero

Star Tap Hero now includes a minimal Pi payment test flow for the Pi Developer Portal checklist.

## Pi payment test flow

- Payment purpose: support / tip the mini game.
- Amount: `0.01 Pi`.
- Current use: Testnet / checklist testing only.
- Frontend creates the payment with the Pi SDK.
- Netlify Functions approve and complete the payment through the Pi Platform API.

## Netlify environment variable

Set this environment variable in Netlify before testing payment:

- `PI_API_KEY`

Do not commit API keys, Server API keys, private keys, seed phrases, wallet passwords, or other secrets to GitHub.
