export function getDeployTokenFromRequest(c: {
  req: {
    header: (name: string) => string | undefined;
    query: (name: string) => string | undefined;
  };
}): string | null {
  const auth = c.req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token) {
      return token;
    }
  }

  const queryToken = c.req.query("token");
  if (queryToken) {
    return queryToken;
  }

  return null;
}
