process.env.NODE_ENV ??= "test"
process.env.DOTENV_CONFIG_QUIET ??= "true"
process.env.RERUM_API_ADDR ??= "https://devstore.rerum.io/v1/api/"
process.env.RERUM_ID_PATTERN ??= "https://devstore.rerum.io/v1/id/"
process.env.ORIGIN ??= "http://localhost"
process.env.ACCESS_TOKEN ??= "token"
process.env.OPEN_API_CORS ??= "false"
// Passthrough tests assume the default.  Pin it so a deploy box's .env with
// ALLOW_PASSTHROUGH_TOKENS=false cannot flip the suite (dotenv won't override this).
process.env.ALLOW_PASSTHROUGH_TOKENS = "true"
