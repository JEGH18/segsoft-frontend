import { PASSWORD_RULES } from '@/utils/passwordRules';

/** The checklist under a new-password field, ticked as the user types. */
export function PasswordRulesList({ password, id = 'password-rules' }: { password: string; id?: string }) {
  return (
    <ul id={id} aria-label="Requisitos de la contraseña" className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.id}
            data-ok={ok}
            className={`text-xs flex items-center gap-1.5 ${ok ? 'text-green-700' : 'text-neutral-500'}`}
          >
            <span aria-hidden="true">{ok ? '✓' : '○'}</span>
            {rule.label}
            <span className="sr-only">{ok ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
