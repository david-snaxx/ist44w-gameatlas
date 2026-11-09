/*
 * Attack 4 — Break signup with badly formed emails.
 *
 * Try to sign up with an email that is: longer than 254 characters (the MySQL column size), only
 * spaces, only symbols, and missing an @.
 *
 * PASS = each one gets a clear 400 message.
 * Each email is its own subtest, so the report names every shape that was accepted (201) or that
 * crashed the server (500) instead of giving a clean 400.
 */

import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { api, isServerUp, SERVER_DOWN_MESSAGE, TEST_PASSWORD, deleteAccount, summarize } from './helpers.js'

let serverUp = false
before(async () => {
    serverUp = await isServerUp()
})

/** The malformed emails to try, each with a label for the report. */
const CASES = [
    { label: 'longer than 254 characters', email: `${'a'.repeat(250)}@attack.test` },
    { label: 'only spaces', email: '          ' },
    { label: 'only symbols', email: '!#$%^&*()' },
    { label: 'missing an @ sign', email: 'plainaddress.attack.test' },
]

test('signup rejects malformed emails with a 400', async (t) => {
    if (!serverUp) {
        t.skip(SERVER_DOWN_MESSAGE)
        return
    }

    const createdAccounts = []
    try {
        for (const testCase of CASES) {
            await t.test(`email ${testCase.label}`, async () => {
                const result = await api('POST', '/api/users', {
                    body: { email: testCase.email, password: TEST_PASSWORD, displayName: 'malformed' },
                })
                console.log(`Email ${testCase.label}: status ${result.status}.`)

                // track anything that slipped through so cleanup can log in as it and delete it
                if (result.status === 201) {
                    createdAccounts.push({ email: testCase.email, password: TEST_PASSWORD })
                }

                assert.equal(
                    result.status,
                    400,
                    `Signup with an email that is ${testCase.label} should answer 400 but returned ${summarize(result)}.`,
                )
            })
        }
    } finally {
        for (const account of createdAccounts) {
            await deleteAccount(account)
        }
    }
})
