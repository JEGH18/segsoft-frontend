import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Category, Framework } from '@/types/enums';
import { createPolicy } from '@/api/policies';
import { useFrameworkControls } from '@/hooks/useFrameworkControls';
import { useNistControls } from '@/hooks/useNistControls';
import { useIso27002Controls } from '@/hooks/useIso27002Controls';

const schema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres'),
  description: z
    .string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(500, 'La descripción no puede superar 500 caracteres'),
  // Zod's required_error only fires for `undefined`, but an unselected native
  // <select> submits '' -- without this preprocess step that fell through to
  // nativeEnum's generic "Invalid enum value..." message instead of ours.
  category: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.nativeEnum(Category, { required_error: 'Selecciona una categoría' }),
  ),
  framework: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.nativeEnum(Framework, { required_error: 'Selecciona un marco normativo' }),
  ),
  controlId: z.string().max(100, 'Máximo 100 caracteres').optional(),
  implementationGuideId: z.string().max(20, 'Máximo 20 caracteres').optional(),
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
  [Framework.NIST_SP_800_53]: 'NIST SP 800-53',
  [Framework.CUSTOM]: 'Personalizado',
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
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedFramework = watch('framework');
  const selectedCategory = watch('category');

  // CUSTOM = políticas definidas por el equipo, sin norma externa detrás --
  // por eso es el único marco sin catálogo de controles, y el único donde
  // control_id sigue siendo texto libre.
  const isCustomFramework = selectedFramework === Framework.CUSTOM;
  const hasCatalog = !!selectedFramework && !isCustomFramework;

  const { data: controls = [], isLoading: controlsLoading } = useFrameworkControls(
    hasCatalog ? selectedFramework : undefined,
  );

  // NIST tiene un catálogo mucho más amplio que las 5 categorías CCS -- este
  // listado es de referencia/exploración (agrupado por familia), no un
  // selector: el control_id que realmente se persiste siempre se deriva de
  // (framework, category) del lado del servidor, igual que para ISO/OWASP.
  const isNistFramework = selectedFramework === Framework.NIST_SP_800_53;
  const { data: nistControls = [], isLoading: nistControlsLoading } = useNistControls(isNistFramework);
  const nistControlsByFamily = nistControls.reduce<Record<string, typeof nistControls>>((acc, c) => {
    (acc[c.family] ??= []).push(c);
    return acc;
  }, {});

  const allowedCategories: Category[] = !selectedFramework
    ? []
    : isCustomFramework
      ? Object.values(Category)
      : controls.map((c) => c.category);

  const matchedControl = controls.find((c) => c.category === selectedCategory);

  // Escenario 1: solo ISO_27001 despliega el selector de guía de
  // implementación 27002, filtrado exactamente por el control Anexo A
  // recién derivado (no el catálogo 27002 completo).
  const isIso27001Framework = selectedFramework === Framework.ISO_27001;
  const { data: iso27002Guides = [], isLoading: iso27002GuidesLoading } = useIso27002Controls(
    isIso27001Framework ? matchedControl?.controlId : undefined,
  );

  // El marco cambió: la categoría (y el control derivado de ella) ya no
  // aplican necesariamente -- se limpian para forzar una elección válida.
  useEffect(() => {
    setValue('category', '' as unknown as Category);
    setValue('controlId', '');
    setValue('implementationGuideId', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFramework]);

  // La categoría cambió (dentro del mismo marco): el control Anexo A
  // derivado cambió, así que cualquier guía 27002 ya elegida para el
  // control anterior ya no corresponde.
  useEffect(() => {
    setValue('implementationGuideId', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    const controlId = isCustomFramework ? values.controlId : matchedControl?.controlId;
    if (hasCatalog && !controlId) {
      setServerError('No hay un control definido para esa combinación de marco y categoría.');
      return;
    }

    const implementationGuideId = isIso27001Framework
      ? (values.implementationGuideId || undefined)
      : undefined;

    try {
      const policy = await createPolicy({ ...values, controlId, implementationGuideId });
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

        <div>
          <label htmlFor="category" className="form-label block mb-1.5">Categoría *</label>
          <select
            id="category"
            {...register('category')}
            aria-describedby="cat-error"
            disabled={!selectedFramework || (hasCatalog && controlsLoading)}
            className={`form-select ${errors.category ? 'border-red-400 focus:ring-red-400' : ''}`}
          >
            <option value="">
              {!selectedFramework
                ? '-- Primero selecciona un marco --'
                : hasCatalog && controlsLoading
                  ? 'Cargando categorías...'
                  : '-- Selecciona una categoría --'}
            </option>
            {allowedCategories.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          {hasCatalog && !controlsLoading && allowedCategories.length === 0 && (
            <p className="text-neutral-400 text-sm mt-1">
              Este marco normativo aún no tiene categorías con control definido.
            </p>
          )}
          {errors.category && (
            <p id="cat-error" role="alert" className="field-error">{errors.category.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="controlId" className="form-label block mb-1.5">
          Control {isCustomFramework && <span className="text-neutral-400 font-normal">(opcional)</span>}
        </label>
        {isCustomFramework ? (
          <input
            id="controlId"
            type="text"
            placeholder="ej. TEAM-XSS-01"
            {...register('controlId')}
            className="form-input max-w-xs"
          />
        ) : hasCatalog && selectedCategory && matchedControl ? (
          <p id="controlId" className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 max-w-md">
            <span className="font-mono font-medium">{matchedControl.controlId}</span>
            {' — '}
            {matchedControl.controlName}
          </p>
        ) : (
          <p className="text-neutral-400 text-sm">
            Se completa automáticamente según el marco y la categoría elegidos.
          </p>
        )}
        {errors.controlId && (
          <p role="alert" className="field-error">{errors.controlId.message}</p>
        )}
      </div>

      {isIso27001Framework && matchedControl && (
        <div>
          <label htmlFor="implementationGuideId" className="form-label block mb-1.5">
            Guía de implementación (ISO/IEC 27002) <span className="text-neutral-400 font-normal">(opcional)</span>
          </label>
          <select
            id="implementationGuideId"
            {...register('implementationGuideId')}
            disabled={iso27002GuidesLoading}
            className="form-select max-w-lg"
          >
            <option value="">
              {iso27002GuidesLoading ? 'Cargando guías de implementación...' : '-- Sin detalle por ahora --'}
            </option>
            {iso27002Guides.map((g) => (
              <option key={g.id} value={g.id}>{g.id} — {g.title}</option>
            ))}
          </select>
          {!iso27002GuidesLoading && iso27002Guides.length === 0 && (
            <p className="text-neutral-400 text-sm mt-1">
              No hay guías de implementación de ISO/IEC 27002 catalogadas para este control todavía.
            </p>
          )}
          {watch('implementationGuideId') && (
            <p className="text-xs text-neutral-500 mt-1.5 max-w-lg">
              {iso27002Guides.find((g) => g.id === watch('implementationGuideId'))?.implementationGuidance}
            </p>
          )}
          {!watch('implementationGuideId') && (
            <p className="text-xs text-neutral-400 mt-1.5">
              Puedes omitirla y completarla luego editando la política.
            </p>
          )}
        </div>
      )}

      {isNistFramework && (
        <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
          <p className="form-label mb-2">Catálogo de controles NIST SP 800-53</p>
          <p className="text-xs text-neutral-500 mb-3">
            Referencia para ubicar el control por familia. El control que se guarda con la política
            se sigue derivando automáticamente de la categoría elegida arriba.
          </p>
          {nistControlsLoading ? (
            <p className="text-sm text-neutral-500">Cargando catálogo NIST...</p>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto">
              {Object.entries(nistControlsByFamily).map(([family, familyControls]) => (
                <div key={family}>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">{family}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {familyControls.map((c) => (
                      <li key={c.id} className="badge bg-white border border-neutral-200 text-neutral-700 text-xs">
                        <span className="font-mono font-medium">{c.id}</span> — {c.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
