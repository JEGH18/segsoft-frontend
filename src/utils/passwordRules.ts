// Same rules as the backend (PasswordPolicyValidator), used when registering and when choosing a
// new password. The backend also rejects common passwords; that error comes back from the API.
export const PASSWORD_RULES = [
  { id: 'length', label: 'Al menos 12 caracteres', test: (p: string) => p.length >= 12 },
  { id: 'upper', label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Un carácter especial (por ejemplo ! - _ @)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function meetsPasswordRules(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
