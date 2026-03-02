import { useState, useMemo, Fragment } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
} from '@tanstack/react-table'
import type { Project } from '../data/types'
import { ScoreBar, TotalScore } from './ScoreBar'
import { TrackBadge } from './TrackBadge'
import { FlagBadge } from './FlagBadge'
import { ProjectDetail } from './ProjectDetail'
import { ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export function ProjectTable({
  data,
  globalFilter,
  trackFilter,
}: {
  data: Project[]
  globalFilter: string
  trackFilter: number | null
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'total', desc: true },
  ])
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const filteredData = useMemo(() => {
    let result = data
    if (trackFilter !== null) {
      result = result.filter((p) => p.trackNumber === trackFilter)
    }
    return result
  }, [data, trackFilter])

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              row.toggleExpanded()
            }}
            className="rounded p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
          >
            {row.getIsExpanded() ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        ),
        size: 36,
        enableSorting: false,
      },
      {
        accessorKey: 'rank',
        header: '#',
        cell: ({ getValue }) => (
          <span className="text-sm font-semibold tabular-nums text-[var(--sea-ink-soft)]">
            {getValue<number>()}
          </span>
        ),
        size: 48,
      },
      {
        accessorKey: 'name',
        header: 'Project',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <a
              href={row.original.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.name}
            </a>
            <div className="flex flex-wrap items-center gap-1.5">
              <TrackBadge trackNumber={row.original.trackNumber} />
              {row.original.flags.map((f) => (
                <FlagBadge key={f} flag={f} />
              ))}
            </div>
          </div>
        ),
        filterFn: 'includesString',
        size: 260,
      },
      {
        id: 'total',
        accessorFn: (row) => row.scores.total,
        header: 'Total',
        cell: ({ getValue }) => <TotalScore score={getValue<number>()} />,
        size: 70,
      },
      {
        id: 'technicity',
        accessorFn: (row) => row.scores.technicity,
        header: 'Tech',
        cell: ({ getValue }) => <ScoreBar score={getValue<number>()} max={25} />,
        size: 120,
      },
      {
        id: 'creativity',
        accessorFn: (row) => row.scores.creativity,
        header: 'Creative',
        cell: ({ getValue }) => <ScoreBar score={getValue<number>()} max={25} />,
        size: 120,
      },
      {
        id: 'usefulness',
        accessorFn: (row) => row.scores.usefulness,
        header: 'Useful',
        cell: ({ getValue }) => <ScoreBar score={getValue<number>()} max={25} />,
        size: 120,
      },
      {
        id: 'alignment',
        accessorFn: (row) => row.scores.alignment,
        header: 'Align',
        cell: ({ getValue }) => <ScoreBar score={getValue<number>()} max={25} />,
        size: 120,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, expanded, globalFilter },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    globalFilterFn: 'includesString',
  })

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[var(--line)]">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : (
                    <button
                      className={`inline-flex items-center gap-1 ${
                        header.column.getCanSort()
                          ? 'cursor-pointer select-none hover:text-[var(--sea-ink)]'
                          : ''
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                      disabled={!header.column.getCanSort()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getCanSort() && (
                        <>
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp size={12} />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-30" />
                          )}
                        </>
                      )}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <Fragment key={row.id}>
              <tr
                className={`border-b border-[var(--line)] transition hover:bg-[var(--link-bg-hover)] ${
                  row.getIsExpanded() ? 'bg-[var(--link-bg-hover)]' : ''
                }`}
                onClick={() => row.toggleExpanded()}
                style={{ cursor: 'pointer' }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {row.getIsExpanded() && (
                <tr key={`${row.id}-detail`} className="border-b border-[var(--line)] bg-[var(--surface-strong)]">
                  <td colSpan={row.getVisibleCells().length}>
                    <ProjectDetail project={row.original} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-[var(--sea-ink-soft)]">
          No projects match your filters.
        </div>
      )}
    </div>
  )
}
