/**
 * App variant configuration.
 * "dev" = full features unlocked for development/testing
 * "beta" = restricted beta for testers
 * "prod" = production
 */
export type AppVariant = 'dev' | 'prod' | 'beta';

export const APP_VARIANT: AppVariant = 'beta';

export const isBeta = (APP_VARIANT as string) === 'beta';
export const isDev = APP_VARIANT === 'dev';
export const isDevOrProd = APP_VARIANT === 'dev' || APP_VARIANT === 'prod';
