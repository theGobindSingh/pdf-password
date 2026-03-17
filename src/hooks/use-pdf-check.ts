import { checkPdfProtection } from '@/utils';
import { useMutation } from '@tanstack/react-query';

export function usePdfCheck() {
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      const result = await checkPdfProtection(arrayBuffer);
      return { result, arrayBuffer };
    },
  });

  return {
    checkPdf: mutation.mutate,
    checkPdfAsync: mutation.mutateAsync,
    status: mutation.status,
    data: mutation.data,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
