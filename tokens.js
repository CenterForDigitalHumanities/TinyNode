import dotenv from "dotenv"
dotenv.config()
import fs from "node:fs/promises"
import { parse, stringify } from "envfile"

const sourcePath = '.env'

const isTokenExpired = (token) => {
    try {
        const payload = token?.split('.')?.[1]
        if (!payload) return false
        const exp = JSON.parse(Buffer.from(payload, 'base64').toString())?.exp
        if (!Number.isFinite(exp)) return false
        return Date.now() >= exp * 1000
    }
    catch (err) {
        // Treat malformed tokens as non-expired so middleware does not block requests.
        return false
    }
}

/**
 * Use the privately stored refresh token to generate a new access token for
 * this instance of a RERUM connected TinyNode. There is no way to authenticate this 
 * process, so protect your refresh token and replace it if it is exposed. 
 * NOTE: This fails without updating or throwing an error (Auth0).
 *
 * You must have the correct refresh token in your configuration file.
 * To learn more read CONTRIBUTING.md or see https://store.rerum.io/v1/API.html#registration
 */
async function generateNewAccessToken() {
    const tokenObject = await fetch(process.env.RERUM_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "refresh_token": process.env.REFRESH_TOKEN }),
        timeout: 10000,
    })
    .then(res => res.json())
    .catch(err => {
        throw err
    })
    process.env.ACCESS_TOKEN = tokenObject.access_token
    try {
        const data = await fs.readFile('./.env', { encoding: 'utf8' })
        // Please note that this parse() will remove all #comments in the .env file.
        const env_file_obj = parse(data)
        env_file_obj.ACCESS_TOKEN = tokenObject.access_token
        await fs.writeFile('./.env', stringify(env_file_obj))
        console.log("TinyNode now has an updated access token.")
    }
    catch (env_error) {
        console.error("Could not write new token property to the file.  The access token has not been updated.")
        console.error(env_error)
    }
}

/**
 * Check if the Access Token from the configuration file is up to date.
 * If it is expired programatically refresh the token and save the new token to the configuration file.
 *
 * This does not validate your access token, so you may still be rejected by 
 * your RERUM instance as unauthorized to request a new access token.
 *
 * Note that you must have the correct refresh token in your configuration file.
 * To learn more read CONTRIBUTING.md or see https://store.rerum.io/v1/API.html#registration
 */
async function checkAccessToken(req, res, next) {
    try {
        // If the instance of TinyNode is not registered and does not have a token then there is nothing to check.
        // Move on through the middleware.  RERUM will tell you what you did wrong.
        if(!process?.env?.ACCESS_TOKEN) {
            next()
            return
        }
        if (isTokenExpired(process.env.ACCESS_TOKEN)) {
            console.log("TinyNode detected an expired access token.  Updating the token now.")
            await generateNewAccessToken()
        }
        next()    
    }
    catch (err) {
        console.log("TinyNode encountered an error trying to refresh its access token")
        console.error(err)
        next(err)
    }
    
}

export default checkAccessToken
