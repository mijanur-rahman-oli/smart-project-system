// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
    });
  }
}

export function logError(error: Error, context?: Record<string, any>) {
  console.error('Error:', error.message, context);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

export function logInfo(message: string, data?: Record<string, any>) {
  console.log(message, data);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message,
      data,
      level: 'info',
    });
  }
}

export function logWarning(message: string, data?: Record<string, any>) {
  console.warn(message, data);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message,
      data,
      level: 'warning',
    });
  }
}

export function startSpan(name: string, operation: () => Promise<any>) {
  if (process.env.NODE_ENV === 'production') {
    return Sentry.startSpan({ name, op: 'function' }, async () => operation());
  }
  return operation();
}

export function setUserContext(user: { id: string; email: string; role: string }) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
}

export function clearUserContext() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser(null);
  }
}