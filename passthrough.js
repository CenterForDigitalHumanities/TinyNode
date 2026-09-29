export function resolveAuthorization(req) {
  const incoming = req.headers?.authorization;
  if (incoming) {
    return incoming;
  }
  return `******`;
}

export function requirePassthroughAllowed(req, res, next) {
  const incoming = req.headers?.authorization;
  const allow = process.env.ALLOW_PASSTHROUGH_TOKENS;
  if (incoming && allow && allow.toLowerCase() === 'false') {
    return res.status(403).send('Token passthrough is not allowed on this TinyNode instance');
  }
  next();
}
