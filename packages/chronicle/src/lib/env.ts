export function substituteEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => {
    const val = process.env[name];
    if (val === undefined) {
      throw new Error(`Environment variable '${name}' is not set`);
    }
    return val;
  });
}
