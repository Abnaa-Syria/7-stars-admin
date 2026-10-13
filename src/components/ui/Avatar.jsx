import { useState } from 'react';

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '؟';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ src, name, size = 36 }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="avatar" style={{ '--size': `${size}px` }} aria-hidden="true">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : initials(name)}
    </span>
  );
}

/** Avatar + name + secondary line used in tables and headers. */
export function Identity({ user, meta, size = 36 }) {
  if (!user) return null;
  return (
    <span className="identity">
      <Avatar src={user.avatar?.url} name={user.fullName} size={size} />
      <span className="identity__text">
        <span className="identity__name truncate" style={{ display: 'block' }}>
          {user.fullName}
        </span>
        <span className="identity__meta ltr truncate" style={{ display: 'block' }}>
          {meta ?? user.email}
        </span>
      </span>
    </span>
  );
}
