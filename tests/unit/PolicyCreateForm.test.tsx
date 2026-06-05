import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PolicyCreateForm from '@/components/policies/PolicyCreateForm';
import * as policiesApi from '@/api/policies';
import { Category, Framework } from '@/types/enums';

vi.mock('@/api/policies');

const mockCreatePolicy = vi.mocked(policiesApi.createPolicy);

function renderForm(onSuccess = vi.fn()) {
  return render(<PolicyCreateForm onSuccess={onSuccess} />);
}

describe('PolicyCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    await user.type(screen.getByLabelText(/nombre/i), 'Política test');
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción con al menos veinte caracteres aquí.',
    );
    await user.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/selecciona una categoría/i)).toBeInTheDocument();
    });
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
    await user.selectOptions(screen.getByLabelText(/categoría/i), Category.SQL_INJECTION);
    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.OWASP_TOP_10_2021);

    await user.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/exitosamente/i)).toBeInTheDocument();
    });

    expect(mockCreatePolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Política SQL',
        category: Category.SQL_INJECTION,
        framework: Framework.OWASP_TOP_10_2021,
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
    await user.selectOptions(screen.getByLabelText(/categoría/i), Category.XSS);
    await user.selectOptions(screen.getByLabelText(/marco normativo/i), Framework.ISO_27001);
    await user.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/ya existe una política/i)).toBeInTheDocument();
    });
  });

  it('renders all 5 category options', () => {
    renderForm();
    const select = screen.getByLabelText(/categoría/i);
    expect(select).toContainElement(screen.getByText('SQL Injection'));
    expect(select).toContainElement(screen.getByText('XSS'));
    expect(select).toContainElement(screen.getByText('Authentication Failure'));
    expect(select).toContainElement(screen.getByText('Insecure Data Handling'));
    expect(select).toContainElement(screen.getByText('Dependency Vulnerability'));
  });

  it('renders all 5 framework options', () => {
    renderForm();
    const select = screen.getByLabelText(/marco normativo/i);
    expect(select).toContainElement(screen.getByText('ISO/IEC 27001'));
    expect(select).toContainElement(screen.getByText('OWASP Top 10 2021'));
    expect(select).toContainElement(screen.getByText('OWASP ASVS'));
    expect(select).toContainElement(screen.getByText('Claude Code Security'));
    expect(select).toContainElement(screen.getByText('DevSecOps'));
  });
});
