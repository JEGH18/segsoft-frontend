import { useEffect, useId, useRef } from 'react';

interface SelectAllCheckboxProps {
  /** Ids currently shown in the table (after search/filters). */
  visibleIds: string[];
  selectedIds: string[];
  /** Receives the whole new selection. */
  onChange: (nextSelectedIds: string[]) => void;
  /** True when filters hide part of the list: only the visible rows are toggled. */
  filtered?: boolean;
  disabled?: boolean;
}

/**
 * "Seleccionar todas" for a list of policies. Acts on the visible rows only:
 * with a filter active it selects (or clears) just the filtered policies and
 * keeps whatever was already selected elsewhere. Checked when every visible
 * row is selected, indeterminate when only some are.
 */
export default function SelectAllCheckbox({
  visibleIds,
  selectedIds,
  onChange,
  filtered = false,
  disabled = false,
}: SelectAllCheckboxProps) {
  const inputId = useId();
  const ref = useRef<HTMLInputElement>(null);
  const selected = new Set(selectedIds);
  const selectedVisible = visibleIds.filter((id) => selected.has(id)).length;
  const allSelected = visibleIds.length > 0 && selectedVisible === visibleIds.length;
  const someSelected = selectedVisible > 0 && !allSelected;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someSelected;
  }, [someSelected]);

  function handleChange() {
    if (allSelected) {
      const visible = new Set(visibleIds);
      onChange(selectedIds.filter((id) => !visible.has(id)));
    } else {
      onChange([...selectedIds, ...visibleIds.filter((id) => !selected.has(id))]);
    }
  }

  const label = filtered
    ? `Seleccionar las ${visibleIds.length} política${visibleIds.length === 1 ? '' : 's'} filtrada${visibleIds.length === 1 ? '' : 's'}`
    : `Seleccionar todas (${visibleIds.length})`;

  return (
    <label htmlFor={inputId} className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 cursor-pointer select-none">
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        checked={allSelected}
        onChange={handleChange}
        disabled={disabled || visibleIds.length === 0}
        aria-checked={someSelected ? 'mixed' : allSelected}
        className="w-4 h-4 rounded border-neutral-300 accent-neutral-900"
      />
      {label}
    </label>
  );
}
