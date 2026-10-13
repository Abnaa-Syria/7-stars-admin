import { useEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Globe2, Image, Languages, Mail, Save, Shield } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { mediaApi, settingsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation, applyServerErrors } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { useTimezones } from '@/features/accounts/AccountFormFields';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  FormField,
  MultiSelect,
  PageHeader,
  QueryState,
  Select,
  SwitchRow,
  TextInput,
  Textarea,
} from '@/components/ui';

const GROUPS = [
  { id: 'general', icon: Globe2 },
  { id: 'branding', icon: Image },
  { id: 'localization', icon: Languages },
  { id: 'security', icon: Shield },
  { id: 'media', icon: Image },
  { id: 'email', icon: Mail },
];

const MIME_OPTIONS = [
  { value: 'image/jpeg', label: 'JPG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WEBP' },
  { value: 'image/gif', label: 'GIF' },
  { value: 'application/pdf', label: 'PDF' },
];

function fieldCopy(t, key) {
  return {
    label: t(['settings', 'fields', key, 0], null, key),
    hint: t(['settings', 'fields', key, 1], null, ''),
  };
}

function MediaRefField({ setting, value, onChange, disabled }) {
  const { t } = useI18n();
  const preview = useQuery({
    queryKey: queryKeys.mediaItem(value),
    queryFn: () => mediaApi.get(value).then((r) => r.data),
    enabled: Boolean(value),
    retry: false,
  });
  const upload = useApiMutation((payload) => mediaApi.upload(payload), {
    invalidate: [['media']],
    successMessage: false,
    onSuccess: (res) => onChange(res.data.id),
  });
  const url = preview.data?.url;
  return (
    <div className="row wrap" style={{ alignItems: 'center' }}>
      {url && <img src={url} alt="" style={{ maxHeight: 56, maxWidth: 120, objectFit: 'contain', borderRadius: 8 }} />}
      <Button
        size="sm"
        variant="gold-outline"
        loading={upload.isPending}
        disabled={disabled}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/jpeg,image/png,image/webp';
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const category = setting.key.includes('Background') ? 'SYSTEM_IMAGE' : 'SYSTEM_LOGO';
            upload.mutate({ file, category, visibility: 'PUBLIC' });
          };
          input.click();
        }}
      >
        {t('settings.chooseImage')}
      </Button>
      {value && (
        <Button size="sm" variant="ghost" onClick={() => onChange(null)} disabled={disabled}>
          {t('settings.removeImage')}
        </Button>
      )}
    </div>
  );
}

function SettingControl({ setting, value, onChange, disabled, timezones }) {
  const { t } = useI18n();
  const { key, dataType } = setting;
  if (setting.isMediaReference) return <MediaRefField setting={setting} value={value} onChange={onChange} disabled={disabled} />;
  if (dataType === 'BOOLEAN') return <SwitchRow label={fieldCopy(t, key).label} hint={fieldCopy(t, key).hint} checked={value} onChange={onChange} disabled={disabled} />;
  if (key === 'localization.defaultLanguage') {
    return <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} options={['ar', 'en'].map((l) => ({ value: l, label: t(`enums.language.${l}`) }))} />;
  }
  if (key === 'localization.enabledLanguages') {
    return <MultiSelect value={value || []} onChange={onChange} disabled={disabled} options={['ar', 'en'].map((l) => ({ value: l, label: t(`enums.language.${l}`) }))} />;
  }
  if (key === 'localization.defaultTimezone') {
    return (
      <Select className="ltr" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {timezones.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </Select>
    );
  }
  if (key === 'localization.calendar') {
    return <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} options={['gregory', 'islamic-umalqura'].map((c) => ({ value: c, label: t(`settings.calendars.${c}`) }))} />;
  }
  if (key === 'media.allowedMimeTypes') {
    return <MultiSelect value={value || []} onChange={onChange} disabled={disabled} options={MIME_OPTIONS} />;
  }
  if (key === 'branding.primaryColor') {
    return (
      <div className="row">
        <input type="color" value={value || '#C9A227'} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label={fieldCopy(t, key).label} />
        <TextInput className="ltr" value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      </div>
    );
  }
  if (dataType === 'NUMBER') {
    return <TextInput type="number" className="ltr" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} disabled={disabled} />;
  }
  if (key.endsWith('Ar') || key.includes('footer') || key.includes('tagline')) {
    return <Textarea rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
  }
  return <TextInput value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={key.toLowerCase().includes('email') ? 'ltr' : undefined} />;
}

export default function SettingsPage() {
  const { t, formatDateTime } = useI18n();
  const { group = 'general' } = useParams();
  const { can } = useAuth();
  const timezones = useTimezones();
  const canUpdate = can(P.SETTINGS_UPDATE);
  const query = useQuery({ queryKey: queryKeys.settings(group), queryFn: () => settingsApi.getGroup(group).then((r) => r.data) });
  const [values, setValues] = useState(null);

  useEffect(() => {
    if (query.data) {
      setValues(Object.fromEntries(query.data.settings.map((s) => [s.key, s.value])));
    }
  }, [query.data]);

  const original = useMemo(() => (query.data ? Object.fromEntries(query.data.settings.map((s) => [s.key, s.value])) : {}), [query.data]);
  const dirty = values && JSON.stringify(values) !== JSON.stringify(original);

  const mutation = useApiMutation((payload) => settingsApi.updateGroup(group, payload), {
    invalidate: [['settings'], ['public-settings'], ['audit-logs']],
    successMessage: t('settings.saved'),
  });

  const save = async () => {
    const payload = {};
    for (const [key, value] of Object.entries(values || {})) {
      if (JSON.stringify(value ?? null) !== JSON.stringify(original[key] ?? null)) payload[key] = value === '' ? '' : value;
    }
    if (!Object.keys(payload).length) return;
    try {
      await mutation.mutateAsync(payload);
    } catch (err) {
      applyServerErrors(err, () => {});
    }
  };

  const current = GROUPS.find((g) => g.id === group) || GROUPS[0];

  return (
    <div className="stack-lg">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="settings-layout">
        <Card className="settings-nav">
          {GROUPS.map((g) => (
            <NavLink key={g.id} to={`/settings/${g.id}`} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <g.icon size={16} />
              {t(`settings.groups.${g.id}`)}
            </NavLink>
          ))}
        </Card>
        <QueryState query={query}>
          {(data) => (
            <Card>
              <CardHeader title={t(`settings.groups.${current.id}`)} subtitle={t(`settings.groupDescriptions.${current.id}`)} />
              <CardBody>
                <Alert tone="info">{t('settings.secretNotice')}</Alert>
                <div className="stack-lg" style={{ marginTop: 18 }}>
                  {(data.settings || []).map((setting) => {
                    const copy = fieldCopy(t, setting.key);
                    const control = (
                      <SettingControl
                        setting={setting}
                        value={values?.[setting.key]}
                        onChange={(v) => setValues((prev) => ({ ...prev, [setting.key]: v }))}
                        disabled={!canUpdate || mutation.isPending}
                        timezones={timezones}
                      />
                    );
                    if (setting.dataType === 'BOOLEAN') return <div key={setting.key}>{control}</div>;
                    return (
                      <FormField key={setting.key} label={copy.label} hint={copy.hint || (setting.updatedAt ? t('settings.lastUpdated', { time: formatDateTime(setting.updatedAt) }) : undefined)}>
                        {() => control}
                      </FormField>
                    );
                  })}
                </div>
              </CardBody>
              {canUpdate && (
                <CardFooter>
                  <span className="muted">{dirty ? t('common.unsavedChanges') : t('settings.noChanges')}</span>
                  <span className="header__spacer" />
                  <Button variant="primary" icon={Save} disabled={!dirty} loading={mutation.isPending} onClick={save}>
                    {t('common.saveChanges')}
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}
        </QueryState>
      </div>
    </div>
  );
}
