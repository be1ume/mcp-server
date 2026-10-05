import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request } from "express";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
const SUPPORTED_SCOPES = new Set(["mcp", "offline_access"]);

type OAuthClient = {
  redirectUris: Set<string>;
};

type AuthorizationCode = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string[];
  resource: string;
  expiresAt: number;
};

type RefreshToken = {
  clientId: string;
  scope: string[];
  resource: string;
};

type OAuthOptions = {
  authToken: string | undefined;
  getResourceUrl: (request: Request) => string;
};

const clients = new Map<string, OAuthClient>();
const authorizationCodes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, number>();
const refreshTokens = new Map<string, RefreshToken>();

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function sha256Base64Url(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function errorResponse(res: Parameters<Parameters<Express["get"]>[1]>[1], status: number, error: string, description: string): void {
  res.status(status).json({ error, error_description: description });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function renderLoginPage(fields: Record<string, string>, message = ""): string {
  const hiddenFields = Object.entries(fields)
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
    .join("\n");
  const error = message
    ? `<p role="alert" style="color:#a12622">${escapeHtml(message)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authorize MCP access</title></head>
<body style="font:16px system-ui,sans-serif;max-width:440px;margin:48px auto;padding:0 20px;color:#222">
  <h1>Authorize Claude</h1>
  <p>Enter your MCP server token to authorize Claude to access this server's workspace tools.</p>
  ${error}
  <form method="post" action="/authorize">
    ${hiddenFields}
    <label for="token">MCP server token</label>
    <input id="token" name="token" type="password" autocomplete="current-password" required style="display:block;box-sizing:border-box;width:100%;padding:10px;margin:8px 0 16px">
    <button type="submit" style="padding:10px 16px">Authorize</button>
  </form>
</body>
</html>`;
}

function readAuthorizationRequest(
  params: Record<string, unknown>,
  resourceUrl: string
): { clientId: string; redirectUri: string; state: string; codeChallenge: string; scope: string[]; resource: string } | undefined {
  const responseType = stringField(params.response_type);
  const clientId = stringField(params.client_id);
  const redirectUri = stringField(params.redirect_uri);
  const state = stringField(params.state);
  const codeChallenge = stringField(params.code_challenge);
  const challengeMethod = stringField(params.code_challenge_method);
  const requestedResource = stringField(params.resource);
  const scopeValue = stringField(params.scope) ?? "mcp";
  const scope = scopeValue.split(/\s+/).filter(Boolean);
  const client = clientId ? clients.get(clientId) : undefined;

  if (
    responseType !== "code" ||
    !client ||
    !redirectUri ||
    !client.redirectUris.has(redirectUri) ||
    !state ||
    !codeChallenge ||
    challengeMethod !== "S256" ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge) ||
    scope.some((value) => !SUPPORTED_SCOPES.has(value)) ||
    (requestedResource !== undefined && requestedResource !== resourceUrl)
  ) {
    return undefined;
  }

  return {
    clientId: clientId!,
    redirectUri,
    state,
    codeChallenge,
    scope,
    resource: resourceUrl
  };
}

function validateRedirectUri(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";

    return !url.username && !url.password && !url.hash &&
      (url.protocol === "https:" || (url.protocol === "http:" && isLoopback));
  } catch {
    return false;
  }
}

function issueTokens(clientId: string, scope: string[], resource: string) {
  const accessToken = randomToken();
  const refreshToken = randomToken();

  accessTokens.set(accessToken, Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  refreshTokens.set(refreshToken, { clientId, scope, resource });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: scope.join(" ")
  };
}

export function configureOAuth(app: Express, options: OAuthOptions): (token: string) => boolean {
  const getIssuer = (request: Request): string => new URL(options.getResourceUrl(request)).origin;

  app.get("/.well-known/oauth-protected-resource", (req, res) => {
    const issuer = getIssuer(req);

    res.json({
      resource: options.getResourceUrl(req),
      authorization_servers: [issuer],
      scopes_supported: ["mcp"],
      bearer_methods_supported: ["header"]
    });
  });

  app.get("/.well-known/oauth-authorization-server", (req, res) => {
    const issuer = getIssuer(req);

    res.json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      registration_endpoint: `${issuer}/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["mcp", "offline_access"]
    });
  });

  app.post("/register", (req, res) => {
    const redirectUris = req.body?.redirect_uris;

    if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every(validateRedirectUri)) {
      errorResponse(res, 400, "invalid_client_metadata", "redirect_uris must contain valid HTTPS or loopback URLs.");
      return;
    }

    if (req.body?.token_endpoint_auth_method && req.body.token_endpoint_auth_method !== "none") {
      errorResponse(res, 400, "invalid_client_metadata", "Only public clients without a client secret are supported.");
      return;
    }

    const clientId = randomToken();
    clients.set(clientId, { redirectUris: new Set(redirectUris) });

    res.status(201).json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      redirect_uris: redirectUris,
      client_name: typeof req.body?.client_name === "string" ? req.body.client_name : undefined
    });
  });

  app.get("/authorize", (req, res) => {
    const authorization = readAuthorizationRequest(req.query, options.getResourceUrl(req));

    if (!authorization) {
      errorResponse(res, 400, "invalid_request", "The authorization request is invalid or the client is not registered.");
      return;
    }

    res.type("html").send(renderLoginPage({
      response_type: "code",
      client_id: authorization.clientId,
      redirect_uri: authorization.redirectUri,
      state: authorization.state,
      code_challenge: authorization.codeChallenge,
      code_challenge_method: "S256",
      scope: authorization.scope.join(" "),
      resource: authorization.resource
    }));
  });

  app.post("/authorize", (req, res) => {
    const authorization = readAuthorizationRequest(req.body, options.getResourceUrl(req));

    if (!authorization) {
      errorResponse(res, 400, "invalid_request", "The authorization request is invalid or the client is not registered.");
      return;
    }

    const submittedToken = stringField(req.body?.token) ?? "";
    const expectedToken = options.authToken ?? "";
    const submitted = Buffer.from(submittedToken);
    const expected = Buffer.from(expectedToken);
    const tokenMatches = submitted.length === expected.length && expected.length > 0 && timingSafeEqual(submitted, expected);

    if (!tokenMatches) {
      res.status(401).type("html").send(renderLoginPage({
        response_type: "code",
        client_id: authorization.clientId,
        redirect_uri: authorization.redirectUri,
        state: authorization.state,
        code_challenge: authorization.codeChallenge,
        code_challenge_method: "S256",
        scope: authorization.scope.join(" "),
        resource: authorization.resource
      }, "The token was not accepted. Check MCP_AUTH_TOKEN and try again."));
      return;
    }

    const code = randomToken();
    authorizationCodes.set(code, {
      clientId: authorization.clientId,
      redirectUri: authorization.redirectUri,
      codeChallenge: authorization.codeChallenge,
      scope: authorization.scope,
      resource: authorization.resource,
      expiresAt: Date.now() + AUTH_CODE_TTL_MS
    });

    const callback = new URL(authorization.redirectUri);
    callback.searchParams.set("code", code);
    callback.searchParams.set("state", authorization.state);
    res.redirect(302, callback.toString());
  });

  app.post("/token", (req, res) => {
    const grantType = stringField(req.body?.grant_type);
    const clientId = stringField(req.body?.client_id);
    const resource = stringField(req.body?.resource);
    const currentResource = options.getResourceUrl(req);

    res.set("Cache-Control", "no-store").set("Pragma", "no-cache");

    if (!clientId || !clients.has(clientId)) {
      errorResponse(res, 401, "invalid_client", "The OAuth client is not registered.");
      return;
    }

    if (resource !== undefined && resource !== currentResource) {
      errorResponse(res, 400, "invalid_target", "The resource does not match this MCP server.");
      return;
    }

    if (grantType === "authorization_code") {
      const code = stringField(req.body?.code);
      const redirectUri = stringField(req.body?.redirect_uri);
      const verifier = stringField(req.body?.code_verifier);
      const authorization = code ? authorizationCodes.get(code) : undefined;

      if (code) {
        authorizationCodes.delete(code);
      }

      if (
        !authorization ||
        authorization.expiresAt < Date.now() ||
        authorization.clientId !== clientId ||
        authorization.redirectUri !== redirectUri ||
        !verifier ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
        sha256Base64Url(verifier) !== authorization.codeChallenge
      ) {
        errorResponse(res, 400, "invalid_grant", "The authorization code is invalid or expired.");
        return;
      }

      res.json(issueTokens(clientId, authorization.scope, authorization.resource));
      return;
    }

    if (grantType === "refresh_token") {
      const oldRefreshToken = stringField(req.body?.refresh_token);
      const refresh = oldRefreshToken ? refreshTokens.get(oldRefreshToken) : undefined;

      if (!refresh || refresh.clientId !== clientId || (resource !== undefined && refresh.resource !== resource)) {
        errorResponse(res, 400, "invalid_grant", "The refresh token is invalid or expired.");
        return;
      }

      refreshTokens.delete(oldRefreshToken!);
      res.json(issueTokens(clientId, refresh.scope, refresh.resource));
      return;
    }

    errorResponse(res, 400, "unsupported_grant_type", "Supported grants are authorization_code and refresh_token.");
  });

  return (token: string): boolean => {
    const expiry = accessTokens.get(token);

    if (!expiry) {
      return false;
    }

    if (expiry <= Date.now()) {
      accessTokens.delete(token);
      return false;
    }

    return true;
  };
}