import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Category, Framework } from '@/types/enums';
import { createPolicy } from '@/api/policies';

const schema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres'),
  description: z
    .string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(500, 'La descripción no puede superar 500 caracteres'),
  category: z.nativeEnum(Category, { required_error: 'Selecciona una categoría' }),
  framework: z.nativeEnum(Framework, { required_error: 'Selecciona un marco normativo' }),
  controlId: z.string().max(100, 'Máximo 100 caracteres').optional(),
});

type FormValues = z.infer<typeof schema>;

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.SQL_INJECTION]: 'SQL Injection',
  [Category.XSS]: 'XSS',
  [Category.AUTHENTICATION_FAILURE]: 'Authentication Failure',
  [Category.INSECURE_DATA_HANDLING]: 'Insecure Data Handling',
  [Category.DEPENDENCY_VULNERABILITY]: 'Dependency Vulnerability',
};

const FRAMEWORK_LABELS: Record<Framework, string> = {
  [Framework.ISO_27001]: 'ISO/IEC 27001',
  [Framework.OWASP_TOP_10_2021]: 'OWASP Top 10 2021',
  [Framework.OWASP_ASVS]: 'OWASP ASVS',
  [Framework.CLAUDE_CODE_SECURITY]: 'Claude Code Security',
  [Framework.DEVSECOPS]: 'DevSecOps',
};

interface PolicyCreateFormProps {
  onSuccess?: (id: string) => void;
}

export default function PolicyCreateForm({ onSuccess }: PolicyCreateFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const policy = await createPolicy(values);
      setSuccess(true);
      reset();
      onSuccess?.(policy.id);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errorCode?: string } } };
      const code = axiosErr.response?.data?.errorCode;
      if (code === 'POLICY_CONFLICT') {
        setServerError('Ya existe una política con ese nombre y marco normativo.');
      } else {
        setServerError(axiosErr.response?.data?.message ?? 'Error al registrar la política.');
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Formulario de registro de política"
      className="space-y-5"
    >
      <div>
        <label htmlFor="name" className="form-label block mb-1.5">Nombre *</label>
        <input
          id="name"
          type="text"
          {...register('name')}
          aria-describedby="name-error"
          className={`form-input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
        />
        {errors.name && (
          <p id="name-error" role="alert" className="field-error">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="form-label block mb-1.5">
          Descripción * <span className="text-neutral-400 font-normal">(20–500 caracteres)</span>
        </label>
        <textarea
          id="description"
          rows={4}
          {...register('description')}
          aria-describedby="desc-error"
          className={`form-textarea ${errors.description ? 'border-red-400 focus:ring-red-400' : ''}`}
        />
        {errors.description && (
          <p id="desc-error" role="alert" className="field-error">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="category" className="form-label block mb-1.5">Categoría *</label>
          <select
            id="category"
            {...register('category')}
            aria-describedby="cat-error"
            className={`form-select ${errors.category ? 'border-red-400 focus:ring-red-400' : ''}`}
          >
            <option value="">-- Selecciona una categoría --</option>
            {Object.values(Category).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          {errors.category && (
            <p id="cat-error" role="alert" className="field-error">{errors.category.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="framework" className="form-label block mb-1.5">Marco normativo *</label>
          <select
            id="framework"
            {...register('framework')}
            aria-describedby="fw-error"
            className={`form-select ${errors.framework ? 'border-red-400 focus:ring-red-400' : ''}`}
          >
            <option value="">-- Selecciona un marco --</option>
            {Object.values(Framework).map((fw) => (
              <option key={fw} value={fw}>{FRAMEWORK_LABELS[fw]}</option>
            ))}
          </select>
          {errors.framework && (
            <p id="fw-error" role="alert" className="field-error">{errors.framework.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="controlId" className="form-label block mb-1.5">
          Control ID <span className="text-neutral-400 font-normal">(opcional)</span>
        </label>
        <input
          id="controlId"
          type="text"
          placeholder="ej. A03:2021"
          {...register('controlId')}
          className="form-input max-w-xs"
        />
        {errors.controlId && (
          <p role="alert" className="field-error">{errors.controlId.message}</p>
        )}
      </div>

      {serverError && (
        <div role="alert" aria-live="assertive" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {serverError}
        </div>
      )}
      {success && (
        <div role="status" aria-live="polite" className="px-4 py-3 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm rounded-lg">
          Política registrada exitosamente.
        </div>
      )}

      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="btn-primary">
        {isSubmitting ? 'Registrando...' : 'Registrar política'}
      </button>
    </form>
  );
}
