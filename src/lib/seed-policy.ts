/** Demo shop data is inserted only into an empty database. */
export function shouldSeedDemoData(userCount: number) {
  return userCount === 0;
}
