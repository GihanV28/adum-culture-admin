'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Layers, Calculator, Archive } from 'lucide-react'
import type { Costing } from '@/components/costcal/SavedInventory'

const FabricDirectory = dynamic(() => import('@/components/costcal/FabricDirectory'), { ssr: false })
const CostCalculator = dynamic(() => import('@/components/costcal/CostCalculator'), { ssr: false })
const SavedInventory = dynamic(() => import('@/components/costcal/SavedInventory'), { ssr: false })

type Tab = 'fabrics' | 'calculator' | 'inventory'

const tabs = [
  { id: 'fabrics' as Tab, label: 'Fabric Directory', icon: Layers },
  { id: 'calculator' as Tab, label: 'Cost Calculator', icon: Calculator },
  { id: 'inventory' as Tab, label: 'Costumes Inventory', icon: Archive },
]

export default function CostCalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('fabrics')
  const [inventoryKey, setInventoryKey] = useState(0)
  const [editingCosting, setEditingCosting] = useState<Costing | null>(null)

  const handleEditInCalculator = (costing: Costing) => {
    setEditingCosting(costing)
    setActiveTab('calculator')
  }

  const handleSaved = () => {
    setEditingCosting(null)
    setInventoryKey(k => k + 1)
    setActiveTab('inventory')
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cost Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">Manage fabrics, calculate costume production costs and pricing.</p>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl mb-6 sm:mb-8">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveTab(id); if (id !== 'calculator') setEditingCosting(null) }}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">{label}</span>
            <span className="xs:hidden sm:hidden">{id === 'fabrics' ? 'Fabrics' : id === 'calculator' ? 'Calc' : 'Inventory'}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'fabrics' && <FabricDirectory />}
      {activeTab === 'calculator' && (
        <CostCalculator
          key={editingCosting?.id ?? 'new'}
          editingCosting={editingCosting}
          onSaved={handleSaved}
        />
      )}
      {activeTab === 'inventory' && (
        <SavedInventory key={inventoryKey} onEditInCalculator={handleEditInCalculator} />
      )}
    </div>
  )
}
