export function sleep(ms: number) {
  if (process.env.NODE_ENV === 'production') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
