import React, { useCallback, useMemo, useState } from 'react'
import type { Block } from '../store'
import { useCanvasStore } from '../store'
import BlockMenu from './BlockMenu'
import ResizeHandle from './ResizeHandle'
import { useBlockInteractions } from './useBlockInteractions'

interface TableBlockProps {
  block: Block
}

interface TableData {
  headers: string[]
  rows: string[][]
}

function parseTableData(content: string): TableData {
  try {
    const parsed = JSON.parse(content) as Partial<TableData>
    if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
      return {
        headers: parsed.headers.map(String),
        rows: parsed.rows.map((row) => (Array.isArray(row) ? row.map(String) : [])),
      }
    }
  } catch { /* fall through */ }

  return { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', '']] }
}

const TableBlock: React.FC<TableBlockProps> = ({ block }) => {
  const updateBlock = useCanvasStore((s) => s.updateBlock)
  const { titleBarMouseDown, handleResizeMouseDown, isMenuOpen, zIndex, cursor, userSelect, closeMenu } =
    useBlockInteractions(block, { minWidth: 260, minHeight: 160 })

  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const tableData = useMemo(() => parseTableData(block.content), [block.content])

  const sortedData = useMemo(() => {
    if (sortColumn === null) return tableData
    const sortedRows = [...tableData.rows].sort((a, b) => {
      const va = (a[sortColumn] ?? '').toLowerCase()
      const vb = (b[sortColumn] ?? '').toLowerCase()
      const numA = Number(va)
      const numB = Number(vb)
      if (!isNaN(numA) && !isNaN(numB)) return sortAsc ? numA - numB : numB - numA
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return { ...tableData, rows: sortedRows }
  }, [tableData, sortColumn, sortAsc])

  const saveData = useCallback(
    (data: TableData) => updateBlock(block.id, { content: JSON.stringify(data) }),
    [block.id, updateBlock]
  )

  const handleCellClick = (row: number, col: number) => {
    if (block.locked) return
    setEditingCell({ row, col })
    setEditValue(sortedData.rows[row]?.[col] ?? '')
  }

  const handleCellBlur = () => {
    if (editingCell && !block.locked) {
      const newData = { ...tableData }
      const originalRowIndex = tableData.rows.indexOf(sortedData.rows[editingCell.row])
      if (originalRowIndex >= 0) {
        newData.rows = [...newData.rows]
        newData.rows[originalRowIndex] = [...newData.rows[originalRowIndex]]
        newData.rows[originalRowIndex][editingCell.col] = editValue
      }
      saveData(newData)
    }
    setEditingCell(null)
  }

  const handleSort = (col: number) => {
    if (sortColumn === col) {
      if (sortAsc) { setSortAsc(false) } else { setSortColumn(null); setSortAsc(true) }
    } else {
      setSortColumn(col)
      setSortAsc(true)
    }
  }

  const handleAddRow = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (block.locked) return
    saveData({ ...tableData, rows: [...tableData.rows, new Array(tableData.headers.length).fill('')] })
  }

  const handleAddColumn = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (block.locked) return
    saveData({
      headers: [...tableData.headers, `Column ${tableData.headers.length + 1}`],
      rows: tableData.rows.map((row) => [...row, '']),
    })
  }

  return (
    <div
      className="physical-block table-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '1px solid #86efac',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        boxShadow: '0 18px 36px rgba(15, 23, 42, 0.13)',
        cursor,
        userSelect,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex,
      }}
      onMouseDown={titleBarMouseDown}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <div
        className="table-block-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f0fdf4',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {block.title || 'Table'}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={handleAddRow} onMouseDown={(e) => e.stopPropagation()} style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '4px', color: '#166534', fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}>+ Row</button>
          <button type="button" onClick={handleAddColumn} onMouseDown={(e) => e.stopPropagation()} style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '4px', color: '#166534', fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}>+ Col</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', paddingRight: '20px', paddingBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '13px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <thead>
            <tr>
              {sortedData.headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  onClick={() => handleSort(colIndex)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  style={{ padding: '6px 10px', paddingRight: colIndex === sortedData.headers.length - 1 ? '28px' : '10px', borderBottom: '2px solid #86efac', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 700, textAlign: 'left', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 }}
                >
                  {header}
                  {sortColumn === colIndex && <span style={{ marginLeft: '4px', fontSize: '10px' }}>{sortAsc ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} style={{ padding: '4px 10px', paddingRight: colIndex === row.length - 1 ? '28px' : '10px', borderBottom: '1px solid #f3f4f6', color: '#1f2937', minWidth: '80px' }}>
                    {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') handleCellBlur() }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', border: '1px solid #86efac', borderRadius: '3px', padding: '2px 4px', fontSize: '13px', outline: 'none', backgroundColor: '#f0fdf4' }}
                      />
                    ) : (
                      <div
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        style={{ cursor: block.locked ? 'default' : 'text', minHeight: '20px' }}
                      >
                        {cell || (block.locked ? '' : <span style={{ color: '#d1d5db' }}>Click to edit</span>)}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ResizeHandle block={block} onMouseDown={handleResizeMouseDown} color="#86efac" size={24} />
    </div>
  )
}

export default TableBlock
