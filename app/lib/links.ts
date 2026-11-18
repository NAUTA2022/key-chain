/** Same-site path ('/x'), never protocol-relative ('//host') or backslash tricks ('/\\host') that browsers resolve off-site. */
export function isInternalPath(href: string): boolean {
  return /^\/(?![/\\])/.test(href);
}
