/**
 * Resolver health boot gate — suppress offline chrome until first health fetch.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-18
 */

let resolverHealthBootSettled = false;

export function isResolverHealthBootSettled() {
  return resolverHealthBootSettled;
}

export function markResolverHealthBootSettled() {
  resolverHealthBootSettled = true;
}

export function resetResolverHealthBootSettled() {
  resolverHealthBootSettled = false;
}
