import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PolicyCreateForm from '@/components/policies/PolicyCreateForm';
import * as policiesApi from '@/api/policies';
import * as frameworksApi from '@/api/frameworks';
import { Category, Framework } from '@/types/enums';
import { FrameworkControl } from '@/types/policy';

vi.mock('@/api/policies');
vi.mock('@/api/frameworks');

const mockCreatePolicy = vi.mocked(policiesApi.createPolicy);
const mockGetFrameworkControls = vi.mocked(frameworksApi.getFrameworkControls);
const mockGetNistControls = vi.mocked(frameworksApi.getNistControls);

const ISO_27001_CATALOG: FrameworkControl[] = [
  { category: Category.SQL_INJECTION, controlId: 'A.9.4.1', controlName: 'Restricción de acceso a la información' },
  { category: Category.XSS, controlId: 'A.14.2.5', controlName: 'Principios de ingeniería de sistemas seguros' },
  { category: Category.AUTHENTICATION_FAILURE, controlId: 'A.9.4.2', controlName: 'Procedimientos seguros de inicio de sesión' },
  { category: Category.INSECURE_DATA_HANDLING, controlId: 'A.10.1.1', controlName: 'Política sobre el uso de controles criptográficos' },
  { category: Category.DEPENDENCY_VULNERABILITY, controlId: 'A.12.6.1', controlName: 'Gestión de las vulnerabilidades técnicas' },
];

const OWASP_TOP_10_CATALOG: FrameworkControl[] = [
  { category: Category.SQL_INJECTION, controlId: 'A03:2021', controlName: 'Injection' },
  { category: Category.XSS, controlId: 'A03:2021', controlName: 'Injection' },
  { category: Category.AUTHENTICATION_FAILURE, controlId: 'A07:2021', controlName: 'Identification and Authentication Failures' },
  { category: Category.INSECURE_DATA_HANDLING, controlId: 'A02:2021', controlName: 'Cryptographic Failures' },
  { category: Category.DEPENDENCY_VULNERABILITY, controlId: 'A06:2021', controlName: 'Vulnerable and Outdated Components' },
];

const DEVSECOPS_CATALOG: FrameworkControl[] = [
  { category: Category.AUTHENTICATION_FAILURE, controlId: 'DSO-03', controlName: 'Gestión de accesos y credenciales en pipelines' },
  { category: Category.INSECURE_DATA_HANDLING, controlId: 'DSO-02', controlName: 'Gestión de secretos' },
  { category: Category.DEPENDENCY_VULNERABILITY, controlId: 'DSO-01', controlName: 'Escaneo de dependencias en CI/CD' },
];

const NIST_CATALOG: FrameworkControl[] = [
  { category: Category.SQL_INJECTION, controlId: 'SI-10', controlName: 'Information Input Validation' },
  { category: Category.XSS, controlId: 'SI-10', controlName: 'Information Input Validation' },
  { category: Category.AUTHENTICATION_FAILURE, controlId: 'IA-5', controlName: 'Authenticator Management' },
  { category: Category.INSECURE_DATA_HANDLING, controlId: 'SC-13', controlName: 'Cryptographic Protection' },
  { category: Category.DEPENDENCY_VULNERABILITY, controlId: 'SI-2', controlName: 'Flaw Remediation' },
];

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PolicyCreateForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  );
}

async function fillNameAndDescription(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre/i), 'Política test');
  await user.type(
    screen.getByLabelText(/descripción/i),
    'Descripción con al menos veinte caracteres aquí.',
  );
}

describe('PolicyCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFrameworkControls.mockImplementation(async (framework: Framework) => {
      if (framework === Framework.ISO_27001) return ISO_27001_CATALOG;
      if (framework === Framework.OWASP_TOP_10_2021) return OWASP_TOP_10_CATALOG;
      if (framework === Framework.DEVSECOPS) return DEVSECOPS_CATALOG;
      if (framework === Framework.NIST_SP_800_53) return NIST_CATALOG;
      return [];
    });
    mockGetNistControls.mockResolvedValue([
      { id: 'AC-2', title: 'Account Management', family: 'AC' },
      { id: 'SC-13', title: 'Cryptographic Protection', family: 'SC' },
      { id: 'SC-28', title: 'Protection of Information at Rest', family: 'SC' },
      { id: 'SI-2', title: 'Flaw Remediation', family: 'SI' },
    ]);
  });

  it('renders all required fields', () => {
    renderForm();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/marco normativo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar/i })).toBeInTheDocument();
  });

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nombre es obligatorio/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when description is too short', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/nombre/i), 'Política test');
    await user.type(screen.getByLabelText(/descripción/i), 'Corta');
    await user.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/al menos 20 caracteres/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when category is not selected', async () => {
    const user = userEvent.setup();
    renderForm();

    await fillNameAndDescription(user);
    await user.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/selecciona una categoría/i)).toBeInTheDocument();
    });
  });

  it('the category select is disabled until a framework is chosen, and empty before that', () => {
    renderForm();
    const categorySelect = screen.getByLabelText(/categoría/i) as HTMLSelectElement;
    expect(categorySelect.disabled).toBe(true);
    expect(within(categorySelect).queryByText('SQL Injection')).not.toBeInTheDocument();
  });

  it('picking a framework restricts the category options to what its catalog defines (DevSecOps has no SQL Injection/XSS)', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.DEVSECOPS);

    await waitFor(() => {
      expect(mockGetFrameworkControls).toHaveBeenCalledWith(Framework.DEVSECOPS);
    });

    const categorySelect = await screen.findByLabelText(/categoría/i);
    await waitFor(() => expect((categorySelect as HTMLSelectElement).disabled).toBe(false));

    expect(within(categorySelect).getByText('Dependency Vulnerability')).toBeInTheDocument();
    expect(within(categorySelect).queryByText('SQL Injection')).not.toBeInTheDocument();
    expect(within(categorySelect).queryByText('XSS')).not.toBeInTheDocument();
  });

  it('auto-fills the control (read-only, not an editable input) once framework + category are chosen', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.ISO_27001);
    const categorySelect = await screen.findByLabelText(/categoría/i);
    await waitFor(() => expect((categorySelect as HTMLSelectElement).disabled).toBe(false));
    await user.selectOptions(categorySelect, Category.SQL_INJECTION);

    await waitFor(() => {
      expect(screen.getByText('A.9.4.1')).toBeInTheDocument();
    });
    expect(screen.getByText(/Restricción de acceso a la información/)).toBeInTheDocument();
    // Never rendered as an editable input for a catalog-backed framework.
    expect(screen.queryByPlaceholderText(/TEAM-XSS-01/)).not.toBeInTheDocument();
  });

  it('CUSTOM keeps control_id as a free-text optional field and does not hit the catalog', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.CUSTOM);

    const categorySelect = await screen.findByLabelText(/categoría/i);
    await waitFor(() => expect((categorySelect as HTMLSelectElement).disabled).toBe(false));
    // All 5 categories are offered -- no external catalog restricts a team-defined policy.
    expect(within(categorySelect).getByText('SQL Injection')).toBeInTheDocument();
    expect(within(categorySelect).getByText('XSS')).toBeInTheDocument();

    const controlInput = screen.getByLabelText(/control/i);
    await user.type(controlInput, 'TEAM-XSS-01');
    expect(controlInput).toHaveValue('TEAM-XSS-01');

    expect(mockGetFrameworkControls).not.toHaveBeenCalled();
  });

  it('changing the framework clears the previously chosen category so a stale combo cannot be submitted', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.ISO_27001);
    let categorySelect = await screen.findByLabelText(/categoría/i);
    await waitFor(() => expect((categorySelect as HTMLSelectElement).disabled).toBe(false));
    await user.selectOptions(categorySelect, Category.SQL_INJECTION);
    await waitFor(() => expect(screen.getByText('A.9.4.1')).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.DEVSECOPS);

    categorySelect = await screen.findByLabelText(/categoría/i);
    expect((categorySelect as HTMLSelectElement).value).toBe('');
    expect(screen.queryByText('A.9.4.1')).not.toBeInTheDocument();
  });

  it('submits successfully and shows success message', async () => {
    const user = userEvent.setup();
    const mockPolicy = {
      id: 'uuid-123',
      name: 'Política SQL',
      description: 'Descripción con al menos veinte caracteres aquí.',
      category: Category.SQL_INJECTION,
      framework: Framework.OWASP_TOP_10_2021,
      controlId: 'A03:2021',
      status: 'ACTIVE' as const,
      version: 1,
      weight: 50,
      createdAt: new Date().toISOString(),
      createdById: 'user-uuid',
    };
    mockCreatePolicy.mockResolvedValueOnce(mockPolicy);

    const onSuccess = vi.fn();
    renderForm(onSuccess);

    await user.type(screen.getByLabelText(/nombre/i), 'Política SQL');
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción con al menos veinte caracteres aquí.',
    );
    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.OWASP_TOP_10_2021);
    const categorySelect = await screen.findByLabelText(/categoría/i);
    await waitFor(() => expect((categorySelect as HTMLSelectElement).disabled).toBe(false));
    await user.selectOptions(categorySelect, Category.SQL_INJECTION);
    await waitFor(() => expect(screen.getByText('A03:2021')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/exitosamente/i)).toBeInTheDocument();
    });

    expect(mockCreatePolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Política SQL',
        category: Category.SQL_INJECTION,
        framework: Framework.OWASP_TOP_10_2021,
        controlId: 'A03:2021',
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith('uuid-123');
  });

  it('shows conflict error on 409 response', async () => {
    const user = userEvent.setup();
    mockCreatePolicy.mockRejectedValueOnce({
      response: { data: { errorCode: 'POLICY_CONFLICT', message: 'Duplicada' } },
    });

    renderForm();

    await user.type(screen.getByLabelText(/nombre/i), 'Política duplicada');
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción con al menos veinte caracteres aquí.',
    );
    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.ISO_27001);
    const categorySelect = await screen.findByLabelText(/categoría/i);
    await waitFor(() => expect((categorySelect as HTMLSelectElement).disabled).toBe(false));
    await user.selectOptions(categorySelect, Category.XSS);
    await waitFor(() => expect(screen.getByText('A.14.2.5')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/ya existe una política/i)).toBeInTheDocument();
    });
  });

  it('renders all 6 framework options, including NIST SP 800-53', () => {
    renderForm();
    const select = screen.getByLabelText(/marco normativo/i);
    expect(select).toContainElement(screen.getByText('ISO/IEC 27001'));
    expect(select).toContainElement(screen.getByText('OWASP Top 10 2021'));
    expect(select).toContainElement(screen.getByText('OWASP ASVS'));
    expect(select).toContainElement(screen.getByText('NIST SP 800-53'));
    expect(select).toContainElement(screen.getByText('Personalizado'));
    expect(select).toContainElement(screen.getByText('DevSecOps'));
  });

  // ── "Incorporar políticas basadas en NIST al catálogo" -- Escenario 1 ────

  it('NIST: choosing INSECURE_DATA_HANDLING derives SC-13 "Cryptographic Protection" and shows the reference catalog grouped by family', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.NIST_SP_800_53);

    await waitFor(() => {
      expect(mockGetFrameworkControls).toHaveBeenCalledWith(Framework.NIST_SP_800_53);
    });
    const categorySelect = await screen.findByLabelText(/categoría/i);
    await waitFor(() => expect((categorySelect as HTMLSelectElement).disabled).toBe(false));
    await user.selectOptions(categorySelect, Category.INSECURE_DATA_HANDLING);

    await waitFor(() => {
      expect(within(document.getElementById('controlId')!).getByText('SC-13')).toBeInTheDocument();
    });
    expect(within(document.getElementById('controlId')!).getByText(/Cryptographic Protection/)).toBeInTheDocument();

    // Reference catalog panel: grouped by family, purely informational.
    expect(await screen.findByText('Catálogo de controles NIST SP 800-53')).toBeInTheDocument();
    expect(screen.getByText('AC')).toBeInTheDocument();
    expect(screen.getByText('SI')).toBeInTheDocument();
    expect(screen.getByText('AC-2')).toBeInTheDocument();
    expect(screen.getByText(/Account Management/)).toBeInTheDocument();
  });

  it('NIST: submits successfully with the derived control_id', async () => {
    const user = userEvent.setup();
    mockCreatePolicy.mockResolvedValueOnce({
      id: 'uuid-nist-1',
      name: 'Uso de algoritmos criptográficos aprobados',
      description: 'Descripción con al menos veinte caracteres aquí.',
      category: Category.INSECURE_DATA_HANDLING,
      framework: Framework.NIST_SP_800_53,
      controlId: 'SC-13',
      status: 'ACTIVE' as const,
      version: 1,
      weight: 50,
      createdAt: new Date().toISOString(),
      createdById: 'user-uuid',
    });
    const onSuccess = vi.fn();
    renderForm(onSuccess);

    await fillNameAndDescription(user);
    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.NIST_SP_800_53);
    const categorySelect = await screen.findByLabelText(/categoría/i);
    await waitFor(() => expect((categorySelect as HTMLSelectElement).disabled).toBe(false));
    await user.selectOptions(categorySelect, Category.INSECURE_DATA_HANDLING);
    await waitFor(() => expect(within(document.getElementById('controlId')!).getByText('SC-13')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => {
      expect(mockCreatePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: Framework.NIST_SP_800_53,
          category: Category.INSECURE_DATA_HANDLING,
          controlId: 'SC-13',
        }),
      );
    });
    expect(onSuccess).toHaveBeenCalledWith('uuid-nist-1');
  });

  it('the NIST reference catalog does not show for other frameworks', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.ISO_27001);

    await waitFor(() => {
      expect(mockGetFrameworkControls).toHaveBeenCalledWith(Framework.ISO_27001);
    });
    expect(screen.queryByText('Catálogo de controles NIST SP 800-53')).not.toBeInTheDocument();
    expect(mockGetNistControls).not.toHaveBeenCalled();
  });
});
