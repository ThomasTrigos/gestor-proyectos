import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import client from '../api/client';
import { AxiosRequestConfig, AxiosError } from 'axios';

// Generic fetcher
const fetcher = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await client.get<T>(url, config);
  return response.data;
};

// Hook for GET requests
export function useApiQuery<T>(
  key: any[],
  url: string,
  config?: AxiosRequestConfig,
  options?: Omit<UseQueryOptions<T, AxiosError, T, any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, AxiosError, T, any[]>({
    queryKey: key,
    queryFn: () => fetcher<T>(url, config),
    ...options,
  });
}

// Hook for POST/PUT/PATCH/DELETE
export function useApiMutation<TData, TVariables = any>(
  method: 'post' | 'put' | 'patch' | 'delete',
  url: string | ((vars: TVariables) => string),
  options?: UseMutationOptions<TData, AxiosError, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, AxiosError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const endpoint = typeof url === 'function' ? url(variables) : url;
      if (method === 'delete') {
        const response = await client.delete<TData>(endpoint);
        return response.data;
      }
      const response = await client[method]<TData>(endpoint, variables);
      return response.data;
    },
    ...options,
  });
}
