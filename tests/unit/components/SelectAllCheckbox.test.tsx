import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectAllCheckbox from '@/components/common/SelectAllCheckbox';

function renderCheckbox(props: Partial<Parameters<typeof SelectAllCheckbox>[0]> = {}) {
  const onChange = vi.fn();
  render(<SelectAllCheckbox visibleIds={['a', 'b', 'c']} selectedIds={[]} onChange={onChange} {...props} />);
  return { onChange, checkbox: screen.getByRole('checkbox') as HTMLInputElement };
}

describe('SelectAllCheckbox', () => {
  it('is labelled "Seleccionar todas" with the number of policies', () => {
    renderCheckbox();
    expect(screen.getByLabelText('Seleccionar todas (3)')).toBeInTheDocument();
  });

  it('selects every visible policy, keeping the ones already selected elsewhere', async () => {
    const { onChange, checkbox } = renderCheckbox({ selectedIds: ['x', 'b'] });
    expect(checkbox.checked).toBe(false);

    await userEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(['x', 'b', 'a', 'c']);
  });

  it('is checked when every visible policy is selected, and clearing it only removes the visible ones', async () => {
    const { onChange, checkbox } = renderCheckbox({ selectedIds: ['x', 'a', 'b', 'c'] });
    expect(checkbox.checked).toBe(true);
    expect(checkbox.indeterminate).toBe(false);

    await userEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(['x']);
  });

  it('is indeterminate when only some visible policies are selected', () => {
    const { checkbox } = renderCheckbox({ selectedIds: ['a'] });
    expect(checkbox.checked).toBe(false);
    expect(checkbox.indeterminate).toBe(true);
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
  });

  it('says it acts on the filtered policies when a filter is active', () => {
    renderCheckbox({ visibleIds: ['a'], filtered: true });
    expect(screen.getByLabelText('Seleccionar las 1 política filtrada')).toBeInTheDocument();
  });

  it('is disabled when no policy is visible', () => {
    const { checkbox } = renderCheckbox({ visibleIds: [] });
    expect(checkbox).toBeDisabled();
  });
});
