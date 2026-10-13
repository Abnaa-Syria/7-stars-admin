import { useI18n } from '@/i18n';
import { Checkbox } from '@/components/ui';

export function PermissionEditor({ modules = [], value = [], onChange, disabled }) {
  const { t } = useI18n();
  const selected = new Set(value);
  const allIds = modules.flatMap((m) => m.permissions.map((p) => p.id));
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggle = (id) => onChange(selected.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  const toggleGroup = (perms) => {
    const ids = perms.map((p) => p.id);
    const groupOn = ids.every((id) => selected.has(id));
    onChange(groupOn ? value.filter((id) => !ids.includes(id)) : [...new Set([...value, ...ids])]);
  };

  return (
    <div className="stack">
      <div className="row wrap">
        <button type="button" className="btn btn--sm" disabled={disabled} onClick={() => onChange(allOn ? [] : allIds)}>
          {allOn ? t('common.deselectAll') : t('common.selectAll')}
        </button>
        <span className="muted">{t('roles.selectedOf', { selected: value.length, total: allIds.length })}</span>
      </div>
      <div className="perm-groups">
        {modules.map((group) => {
          const ids = group.permissions.map((p) => p.id);
          const count = ids.filter((id) => selected.has(id)).length;
          const groupOn = count === ids.length && ids.length > 0;
          const mixed = count > 0 && !groupOn;
          return (
            <section key={group.module} className="perm-group">
              <div className="perm-group__head">
                <Checkbox label={t(`permissions.modules.${group.module}`, null, group.module)} checked={groupOn} indeterminate={mixed} disabled={disabled} onChange={() => toggleGroup(group.permissions)} />
                <span className="perm-group__count">
                  {count}/{ids.length}
                </span>
              </div>
              <div className="perm-group__list">
                {group.permissions.map((p) => (
                  <label key={p.id} className="perm-item">
                    <input type="checkbox" checked={selected.has(p.id)} disabled={disabled} onChange={() => toggle(p.id)} />
                    <span>
                      <div className="perm-group__title">{p.name}</div>
                      <div className="perm-item__slug ltr">{p.slug}</div>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
