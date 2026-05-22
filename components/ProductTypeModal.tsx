'use client'
import { Package, Layers } from 'lucide-react'

interface Props {
  onSelect: (type: 'single' | 'variable') => void
  onClose: () => void
}

export default function ProductTypeModal({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Add New Product</h2>
        <p className="text-sm text-gray-500 text-center mb-8">What type of product are you adding?</p>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => onSelect('single')}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-black hover:bg-gray-50 transition-all text-left group">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Single</p>
              <p className="text-xs text-gray-500 mt-1">One color variant</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">AC-F-S-0001</p>
            </div>
          </button>

          <button onClick={() => onSelect('variable')}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-black hover:bg-gray-50 transition-all text-left group">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Variable</p>
              <p className="text-xs text-gray-500 mt-1">Multiple colors, each with own SKU & images</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">AC-F-B-0002 / AC-F-W-0003</p>
            </div>
          </button>
        </div>

        <button onClick={onClose} className="mt-6 w-full text-sm text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  )
}
