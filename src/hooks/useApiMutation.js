import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/providers/ToastProvider';

/**
 * React Query mutation with consistent UX: success toast (backend localized message by default),
 * error toast, and invalidation of affected query key prefixes.
 */
export function useApiMutation(mutationFn, { invalidate = [], successMessage, silentError = false, onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn,
    onSuccess: async (result, variables) => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      if (successMessage !== false) toast.success(successMessage || result?.message);
      onSuccess?.(result, variables);
    },
    onError: (error, variables) => {
      if (!silentError) toast.error(error.message);
      onError?.(error, variables);
    },
  });
}

/** Maps API field errors (422/409) onto react-hook-form fields. Returns true when any were applied. */
export function applyServerErrors(error, setError, fieldMap = {}) {
  const fields = error?.fieldErrors || {};
  const entries = Object.entries(fields);
  for (const [field, message] of entries) {
    setError(fieldMap[field] || field, { type: 'server', message });
  }
  return entries.length > 0;
}
