import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PolicyListPage from '@/components/policies/PolicyListPage';
import * as policiesApi from '@/api/policies';
import type { PolicyPage } from '@/types/policy';

vi.mock('@/api/policies');

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const fakePage = (names: string[]): PolicyPage => ({
  content: names.map((name) => ({
    id: crypto.randomUUID(),
    name,
    description: 'Descripción suficiente para la política',
    category: 'SQL_INJECTION' as never,
    framework: 'OWASP_TOP_10_2021' as never,
    controlId: 'A03:2021',
    status: 'ACTIVE',
    version: 1,
    weight: 50,
    createdAt: new Date().toISOString(),
    createdById: null,
  })),
  totalElements: names.length,
  totalPages: Math.ceil(names.length / 10),
  number: 0,
  size: 10,
  first: true,
  last: true,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PolicyListPage', () => {
  it('muestra políticas cuando la API retorna datos', async () => {
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(fakePage(['Política SQL', 'Política XSS']));

    render(<PolicyListPage />, { wrapper });

    expect(await screen.findByText('Política SQL')).toBeInTheDocument();
    expect(screen.getByText('Política XSS')).toBeInTheDocument();
  });

  it('muestra mensaje cuando el banco está vacío', async () => {
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(fakePage([]));

    render(<PolicyListPage />, { wrapper });

    expect(
      await screen.findByText(/No se encontraron políticas/i),
    ).toBeInTheDocument();
  });

  it('muestra error cuando la API falla', async () => {
    vi.mocked(policiesApi.listPolicies).mockRejectedValue(new Error('Network Error'));

    render(<PolicyListPage />, { wrapper });

    expect(await screen.findByRole('alert')).toHaveTextContent(/Error al cargar/i);
  });

  it('muestra conteo total de políticas', async () => {
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(fakePage(['P1', 'P2', 'P3']));

    render(<PolicyListPage />, { wrapper });

    expect(await screen.findByText(/3 políticas encontradas/i)).toBeInTheDocument();
  });

  it('tiene inputs de filtro accesibles', async () => {
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(fakePage([]));

    render(<PolicyListPage />, { wrapper });

    await screen.findByText(/0 políticas/i);

    expect(screen.getByRole('combobox', { name: /categoría/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /marco normativo/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /estado/i })).toBeInTheDocument();
  });

  it('llama de nuevo a la API al cambiar el filtro de categoría', async () => {
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(fakePage(['P1']));

    render(<PolicyListPage />, { wrapper });

    await screen.findByText('P1');

    fireEvent.change(screen.getByRole('combobox', { name: /categoría/i }), {
      target: { value: 'SQL_INJECTION' },
    });

    await waitFor(() => {
      expect(vi.mocked(policiesApi.listPolicies)).toHaveBeenCalledTimes(2);
    });
  });

  it('aplica debounce de 300ms al buscar por nombre', async () => {
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(fakePage([]));

    render(<PolicyListPage />, { wrapper });

    // Esperar la llamada inicial
    await waitFor(() =>
      expect(vi.mocked(policiesApi.listPolicies)).toHaveBeenCalledTimes(1),
    );

    const searchInput = screen.getByRole('textbox', { name: /nombre/i });
    fireEvent.change(searchInput, { target: { value: 'sql' } });
    fireEvent.change(searchInput, { target: { value: 'sql i' } });
    fireEvent.change(searchInput, { target: { value: 'sql in' } });

    // Inmediatamente no hay nueva llamada (debounce activo)
    expect(vi.mocked(policiesApi.listPolicies)).toHaveBeenCalledTimes(1);

    // Tras el debounce (>300 ms) sí se dispara
    await waitFor(
      () => expect(vi.mocked(policiesApi.listPolicies)).toHaveBeenCalledTimes(2),
      { timeout: 2000 },
    );
  }, 10000);

  it('muestra controles de paginación cuando hay más de una página', async () => {
    const multiPage: PolicyPage = {
      content: Array.from({ length: 10 }, (_, i) => ({
        id: crypto.randomUUID(),
        name: `Política ${i}`,
        description: 'Descripción suficiente para la política',
        category: 'SQL_INJECTION' as never,
        framework: 'OWASP_TOP_10_2021' as never,
        controlId: null,
        status: 'ACTIVE',
        version: 1,
        weight: 50,
        createdAt: new Date().toISOString(),
        createdById: null,
      })),
      totalElements: 25,
      totalPages: 3,
      number: 0,
      size: 10,
      first: true,
      last: false,
    };
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(multiPage);

    render(<PolicyListPage />, { wrapper });

    // Esperar que aparezca el botón de siguiente página
    expect(
      await screen.findByRole('button', { name: /página siguiente/i }, { timeout: 8000 }),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /página anterior/i })).toBeInTheDocument();
  }, 10000);
});
