import { forwardRef } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

/**
 * Button with variants: primary | secondary | outline | ghost | gold-outline | danger | danger-solid.
 * Pass `to` to render a router link styled as a button.
 */
export const Button = forwardRef(function Button(
  { variant = 'secondary', size, block, icon: Icon, iconEnd: IconEnd, loading, disabled, className, children, to, type = 'button', ...rest },
  ref,
) {
  const classes = clsx(
    'btn',
    variant !== 'secondary' && `btn--${variant}`,
    size && `btn--${size}`,
    block && 'btn--block',
    !children && 'btn--icon',
    className,
  );
  const iconSize = size === 'sm' ? 15 : 17;
  const content = (
    <>
      {loading ? <span className="spinner" /> : Icon && <Icon size={iconSize} />}
      {children}
      {IconEnd && !loading && <IconEnd size={iconSize} />}
    </>
  );
  if (to && !disabled) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});
