export function androidHeaderTopPadding(
  platformOS: string,
  statusBarHeight: number | undefined,
  basePadding: number,
): number {
  return platformOS === 'android'
    ? basePadding + Math.max(statusBarHeight ?? 0, 0)
    : basePadding;
}
