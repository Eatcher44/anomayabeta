/**
 * App variant configuration.
 * Set to "beta" for testers, "prod" for production.
 */
export type AppVariant = 'prod' | 'beta';

export const APP_VARIANT: AppVariant = 'beta';

export const isBeta = APP_VARIANT === 'beta';
