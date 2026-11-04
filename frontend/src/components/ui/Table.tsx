import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export interface HeaderConfig {
  label: string;
  sortKey?: string;
}

export type TableHeader = string | HeaderConfig;

interface TableProps {
  headers: TableHeader[];
  children: React.ReactNode;
  currentSortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export const Table: React.FC<TableProps> = ({
  headers,
  children,
  currentSortKey,
  sortDirection,
  onSort,
}) => (
  <div className="overflow-x-auto bg-white rounded-lg shadow">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {headers.map((h, i) => {
            const isConfig = typeof h === 'object' && h !== null;
            const label = isConfig ? (h as HeaderConfig).label : (h as string);
            const sortKey = isConfig ? (h as HeaderConfig).sortKey : undefined;
            const isSorted = sortKey && currentSortKey === sortKey;

            return (
              <th
                key={i}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  sortKey && onSort ? 'cursor-pointer hover:bg-gray-100 select-none transition-colors' : ''
                }`}
                onClick={() => {
                  if (sortKey && onSort) {
                    onSort(sortKey);
                  }
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span>{label}</span>
                  {sortKey && onSort && (
                    <span className="text-gray-400">
                      {isSorted ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {children}
      </tbody>
    </table>
  </div>
);

export default Table;
