import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listRules, createRule, archiveRule } from '@/api/rules';
import type { CreateRuleRequest, RuleResponse, RuleType, Severity } from '@/types/rule';

const SEVERITY_CLASSES: Record<Severity, string> = {
  CRITICAL: 'text-neutral-900 font-bold',
  HIGH: 'text-neutral-700 font-semibold',
  MEDIUM: 'text-neutral-500 font-medium',
  LOW: 'text-neutral-400',
};

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  PATTERN_REGEX: 'Patrón Regex',
  AST_QUERY: 'Consulta AST',
  CONFIG_CHECK: 'Config Check',
  DEPENDENCY_CHECK: 'Dependencias',
};

interface Props {
  policyId: string;
  isAdmin: boolean;
}

export default function RuleManagementSection({ policyId, isAdmin }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');

  const [ruleType, setRuleType] = useState<RuleType>('PATTERN_REGEX');
  const [pattern, setPattern] = useState('');
  const [severity, setSeverity] = useState<Severity>('HIGH');
  const [languages, setLanguages] = useState('java,python');
  const [cweId, setCweId] = useState('');

  // CONFIG_CHECK
  const [configKey, setConfigKey] = useState('');
  const [configMode, setConfigMode] = useState<'must_exist' | 'not_value'>('must_exist');
  const [configValue, setConfigValue] = useState('');

  // DEPENDENCY_CHECK
  const [depEcosystem, setDepEcosystem] = useState<'maven' | 'npm' | 'pypi'>('maven');
  const [depGroup, setDepGroup] = useState('');
  const [depName, setDepName] = useState('');
  const [depBelowVersion, setDepBelowVersion] = useState('');
  const [depCve, setDepCve] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['rules', policyId],
    queryFn: () => listRules(policyId),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (req: CreateRuleRequest) => createRule(policyId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules', policyId] });
      qc.invalidateQueries({ queryKey: ['policy', policyId] });
      setShowForm(false);
      setPattern('');
      setFormError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setFormError(err?.response?.data?.message ?? 'Error al crear la regla');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (ruleId: string) => archiveRule(ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules', policyId] });
      qc.invalidateQueries({ queryKey: ['policy', policyId] });
    },
  });

  function buildPayload(): Record<string, unknown> {
    if (ruleType === 'PATTERN_REGEX' || ruleType === 'AST_QUERY') {
      return { pattern };
    }
    if (ruleType === 'CONFIG_CHECK') {
      const check: Record<string, unknown> = { key: configKey };
      if (configMode === 'not_value') check.not_value = configValue;
      else check.must_exist = true;
      return { checks: [check] };
    }
    if (ruleType === 'DEPENDENCY_CHECK') {
      const entry: Record<string, unknown> = {
        ecosystem: depEcosystem,
        below_version: depBelowVersion,
        cve: depCve,
      };
      if (depEcosystem === 'maven') {
        entry.group = depGroup;
        entry.artifact = depName;
      } else {
        entry.package = depName;
      }
      return { known_vulnerable: [entry] };
    }
    return {};
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    createMutation.mutate({
      type: ruleType,
      payload: buildPayload(),
      severity,
      languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
      cweId: cweId || undefined,
    });
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-neutral-900">
          Reglas técnicas <span className="text-neutral-400 font-normal">({data?.totalElements ?? 0})</span>
        </h3>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            aria-label="Añadir regla"
            className={showForm ? 'btn-outline text-xs px-3 py-1.5' : 'btn-primary text-xs px-3 py-1.5'}
          >
            {showForm ? 'Cancelar' : '+ Añadir regla'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="card p-4 mb-4 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="form-label block mb-1">Tipo</label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as RuleType)}
                className="form-select w-auto"
              >
                {(Object.keys(RULE_TYPE_LABELS) as RuleType[]).map((t) => (
                  <option key={t} value={t}>{RULE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label block mb-1">Severidad</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="form-select w-auto"
              >
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Severity[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label block mb-1">CWE ID</label>
              <input
                value={cweId}
                onChange={(e) => setCweId(e.target.value)}
                placeholder="CWE-89"
                className="form-input w-28"
              />
            </div>

            <div>
              <label className="form-label block mb-1">Lenguajes (csv)</label>
              <input
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="java,python"
                className="form-input w-40"
              />
            </div>
          </div>

          {(ruleType === 'PATTERN_REGEX' || ruleType === 'AST_QUERY') && (
            <div>
              <label className="form-label block mb-1">Patrón Regex</label>
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder='(?i)(api[_-]?key)\s*='
                required
                aria-label="Patrón regex"
                className="form-input font-mono"
              />
            </div>
          )}

          {ruleType === 'CONFIG_CHECK' && (
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="form-label block mb-1">Clave de configuración</label>
                <input
                  value={configKey}
                  onChange={(e) => setConfigKey(e.target.value)}
                  placeholder="server.ssl.enabled"
                  required
                  aria-label="Clave de configuración"
                  className="form-input font-mono w-64"
                />
              </div>
              <div>
                <label className="form-label block mb-1">Condición</label>
                <select
                  value={configMode}
                  onChange={(e) => setConfigMode(e.target.value as 'must_exist' | 'not_value')}
                  className="form-select w-auto"
                >
                  <option value="must_exist">Debe existir (marca si falta)</option>
                  <option value="not_value">No debe tener valor… (marca si coincide)</option>
                </select>
              </div>
              {configMode === 'not_value' && (
                <div>
                  <label className="form-label block mb-1">Valor prohibido</label>
                  <input
                    value={configValue}
                    onChange={(e) => setConfigValue(e.target.value)}
                    placeholder="false"
                    aria-label="Valor prohibido"
                    className="form-input w-32"
                  />
                </div>
              )}
            </div>
          )}

          {ruleType === 'DEPENDENCY_CHECK' && (
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="form-label block mb-1">Ecosistema</label>
                <select
                  value={depEcosystem}
                  onChange={(e) => setDepEcosystem(e.target.value as 'maven' | 'npm' | 'pypi')}
                  className="form-select w-auto"
                >
                  <option value="maven">Maven (pom.xml)</option>
                  <option value="npm">npm (package.json)</option>
                  <option value="pypi">PyPI (requirements.txt)</option>
                </select>
              </div>
              {depEcosystem === 'maven' && (
                <div>
                  <label className="form-label block mb-1">groupId</label>
                  <input
                    value={depGroup}
                    onChange={(e) => setDepGroup(e.target.value)}
                    placeholder="org.apache.logging.log4j"
                    className="form-input font-mono w-56"
                  />
                </div>
              )}
              <div>
                <label className="form-label block mb-1">
                  {depEcosystem === 'maven' ? 'artifactId' : 'Paquete'}
                </label>
                <input
                  value={depName}
                  onChange={(e) => setDepName(e.target.value)}
                  placeholder={depEcosystem === 'maven' ? 'log4j-core' : 'lodash'}
                  required
                  className="form-input font-mono w-44"
                />
              </div>
              <div>
                <label className="form-label block mb-1">Versión vulnerable &lt;</label>
                <input
                  value={depBelowVersion}
                  onChange={(e) => setDepBelowVersion(e.target.value)}
                  placeholder="2.17.1"
                  required
                  className="form-input w-28"
                />
              </div>
              <div>
                <label className="form-label block mb-1">CVE</label>
                <input
                  value={depCve}
                  onChange={(e) => setDepCve(e.target.value)}
                  placeholder="CVE-2021-44228"
                  className="form-input font-mono w-44"
                />
              </div>
            </div>
          )}

          {formError && (
            <p role="alert" className="text-sm text-red-600">{formError}</p>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Guardando...' : 'Guardar regla'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-neutral-500">Cargando reglas...</p>
      ) : data?.content.length === 0 ? (
        <p className="text-sm text-neutral-500 italic">
          Sin reglas activas. Esta política no es ejecutable aún.
        </p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="table-th">Tipo</th>
                  <th className="table-th">Payload</th>
                  <th className="table-th">Lenguajes</th>
                  <th className="table-th">Severidad</th>
                  <th className="table-th">CWE</th>
                  {isAdmin && <th className="table-th">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data?.content.map((rule: RuleResponse) => (
                  <tr key={rule.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="table-td">{RULE_TYPE_LABELS[rule.type]}</td>
                    <td className="table-td font-mono text-xs max-w-xs truncate">
                      {rule.type === 'PATTERN_REGEX'
                        ? String(rule.payload.pattern ?? '')
                        : JSON.stringify(rule.payload).slice(0, 60) + '…'}
                    </td>
                    <td className="table-td">{rule.languages.join(', ') || '—'}</td>
                    <td className="table-td">
                      <span className={SEVERITY_CLASSES[rule.severity]}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="table-td font-mono text-xs">{rule.cweId || '—'}</td>
                    {isAdmin && (
                      <td className="table-td">
                        <button
                          onClick={() => archiveMutation.mutate(rule.id)}
                          disabled={archiveMutation.isPending}
                          aria-label={`Archivar regla ${rule.id}`}
                          className="text-xs border border-neutral-200 rounded px-2 py-1 text-neutral-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Archivar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
