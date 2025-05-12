export function getIp(headers: Headers): string | undefined {
  const xRealIp = headers.get('x-real-ip');
  const xForwardedFor = headers.get('x-forwarded-for');

  if (xRealIp) return xRealIp.trim();
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    const firstIp = ips[0];
    if (!firstIp) return undefined;
    return firstIp.trim();
  }
  return undefined;
}
