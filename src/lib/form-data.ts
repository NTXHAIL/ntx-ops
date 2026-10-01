export function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return value == null ? "" : String(value);
}

export function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
