'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, Save, AlertCircle, Search, Package } from 'lucide-react'
import { getFabrics, type Fabric } from '@/lib/costcal-storage'
import { adminFetch } from '@/lib/api'

type ProfitMode = 'PERCENT' | 'FIXED'
type ProfitUnit = 'PERCENT' | 'LKR'

interface Product { id: string; name: string; itemCode?: string | null; status?: string }
interface FabricEntry { id: string; fabricId: string; fabricName: string; quantity: number; unitCost: number; subtotal: number }
interface OtherCost { id: string; label: string; amount: number }

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'
function uid() { return Math.random().toString(36).slice(2) }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', published: 'Published', active: 'Active (ORM)', inactive: 'Inactive',
}

export default function CostCalculator({ onSaved }: { onSaved?: () => void }) {
  // Product selection
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [productDropdown, setProductDropdown] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [existingCosting, setExistingCosting] = useState(false)

  // Fabrics
  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [fabricEntries, setFabricEntries] = useState<FabricEntry[]>([])
  const [pieces, setPieces] = useState('')
  // per-row fabric picker state
  const [fabricSearch, setFabricSearch] = useState<Record<string, string>>({})
  const [fabricDropdown, setFabricDropdown] = useState<Record<string, boolean>>({})

  // Other costs
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([])
  const [newCostLabel, setNewCostLabel] = useState('')
  const [newCostAmount, setNewCostAmount] = useState('')

  // Pricing
  const [profitMode, setProfitMode] = useState<ProfitMode>('PERCENT')
  const [profitUnit, setProfitUnit] = useState<ProfitUnit>('PERCENT')
  const [profitValue, setProfitValue] = useState('')
  const [manualPrice, setManualPrice] = useState('')

  // Deductions
  const [bnplTotal, setBnplTotal] = useState('')
  const [bnplMerchant, setBnplMerchant] = useState('')
  const [gatewayPerc, setGatewayPerc] = useState('')
  const [vatPerc, setVatPerc] = useState('')

  // Delivery
  const [deliveryTotal, setDeliveryTotal] = useState('')
  const [deliveryMerchant, setDeliveryMerchant] = useState('')

  const [saving, setSaving] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)

  const [productsError, setProductsError] = useState(false)

  useEffect(() => {
    getFabrics().then(setFabrics)
    fetch('/api/products?limit=500')
      .then(r => r.json())
      .then(d => {
        if (d.success) setProducts(d.data?.products ?? [])
        else setProductsError(true)
      })
      .catch(() => setProductsError(true))
  }, [])

  // Check if selected product already has a costing
  useEffect(() => {
    if (!selectedProduct) { setExistingCosting(false); return }
    fetch('/api/costcal/costings')
      .then(r => r.json())
      .then(d => {
        const has = (d.data?.costings ?? []).some((c: { productId: string }) => c.productId === selectedProduct.id)
        setExistingCosting(has)
      })
      .catch(() => {})
  }, [selectedProduct])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.itemCode ?? '').toLowerCase().includes(productSearch.toLowerCase())
  )

  // ── Fabric entry management ──────────────────────────────────────────────
  const addFabricRow = () => {
    const rowId = uid()
    setFabricEntries(e => [...e, { id: rowId, fabricId: '', fabricName: '', quantity: 0, unitCost: 0, subtotal: 0 }])
  }

  const removeFabricRow = (id: string) => setFabricEntries(e => e.filter(r => r.id !== id))

  const selectFabric = (rowId: string, fabric: Fabric) => {
    setFabricEntries(e => e.map(r => {
      if (r.id !== rowId) return r
      const subtotal = fabric.costPerUnit * r.quantity
      return { ...r, fabricId: fabric.id, fabricName: fabric.name, unitCost: fabric.costPerUnit, subtotal }
    }))
    setFabricDropdown(d => ({ ...d, [rowId]: false }))
    setFabricSearch(s => ({ ...s, [rowId]: '' }))
  }

  const updateQty = (rowId: string, qty: number) => {
    setFabricEntries(e => e.map(r => {
      if (r.id !== rowId) return r
      return { ...r, quantity: qty, subtotal: r.unitCost * qty }
    }))
  }

  // ── Calculations ─────────────────────────────────────────────────────────
  const totalFabricCost = fabricEntries.reduce((s, r) => s + r.subtotal, 0)
  const fabricCostPerItem = pieces && Number(pieces) > 0 ? totalFabricCost / Number(pieces) : 0
  const otherCostsTotal = otherCosts.reduce((s, c) => s + c.amount, 0)
  const totalProductionCost = fabricCostPerItem + otherCostsTotal

  const netProfit = profitMode === 'PERCENT'
    ? (profitUnit === 'PERCENT' ? totalProductionCost * (Number(profitValue) / 100) : Number(profitValue))
    : 0

  const targetAmountToClear = totalProductionCost + (profitMode === 'PERCENT' ? netProfit : 0)
  const bnplCustomerPerc = Math.max(0, Number(bnplTotal) - Number(bnplMerchant))
  const clientDeductionsPerc = bnplCustomerPerc + Number(gatewayPerc) + Number(vatPerc)
  const customerDelivery = Math.max(0, Number(deliveryTotal) - Number(deliveryMerchant))
  const merchantDelivery = Number(deliveryMerchant)
  const deductionsError = clientDeductionsPerc >= 100

  let finalSellingPrice = 0
  let totalCheckoutPrice = 0
  if (profitMode === 'PERCENT') {
    if (!deductionsError) {
      totalCheckoutPrice = (targetAmountToClear + customerDelivery) / (1 - clientDeductionsPerc / 100)
      finalSellingPrice = totalCheckoutPrice - customerDelivery
    }
  } else {
    finalSellingPrice = Number(manualPrice)
    totalCheckoutPrice = finalSellingPrice + customerDelivery
  }

  const merchantAbsorbedBNPL = (Number(bnplMerchant) / 100) * totalCheckoutPrice
  const actualNetProfit = profitMode === 'PERCENT'
    ? netProfit - merchantAbsorbedBNPL - merchantDelivery
    : totalCheckoutPrice - (clientDeductionsPerc / 100) * totalCheckoutPrice - customerDelivery - merchantAbsorbedBNPL - merchantDelivery - totalProductionCost

  const addOtherCost = () => {
    if (!newCostLabel || !newCostAmount) return
    setOtherCosts(c => [...c, { id: uid(), label: newCostLabel, amount: Number(newCostAmount) }])
    setNewCostLabel(''); setNewCostAmount('')
  }

  const doSave = async () => {
    if (!selectedProduct || deductionsError) return
    setSaving(true)
    try {
      await adminFetch('/api/costcal/costings', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          fabricEntries: fabricEntries.map(({ id: _, ...r }) => r),
          pieces: Number(pieces) || 1,
          otherCosts: otherCosts.map(({ id: _, ...c }) => c),
          profitMode, profitUnit, profitValue: Number(profitValue),
          bnplTotal: Number(bnplTotal), bnplMerchant: Number(bnplMerchant),
          gatewayPerc: Number(gatewayPerc), vatPerc: Number(vatPerc),
          deliveryTotal: Number(deliveryTotal), deliveryMerchant: Number(deliveryMerchant),
          totalProductionCost,
          netProfit: actualNetProfit,
          recommendedPrice: finalSellingPrice,
          sellingPrice: finalSellingPrice,
          originalPrice: 0,
          status: 'draft',
        }),
      })
      if (onSaved) onSaved()
    } finally {
      setSaving(false)
      setConfirmReplace(false)
    }
  }

  const handleAddToInventory = () => {
    if (!selectedProduct) return
    if (existingCosting) { setConfirmReplace(true); return }
    doSave()
  }

  const fmt = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const canSave = !!selectedProduct && !deductionsError && fabricEntries.length > 0 && !!pieces && Number(pieces) > 0

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Confirm replace dialog */}
      {confirmReplace && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-2">Replace existing costing?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <strong>{selectedProduct?.name}</strong> already has a costing in inventory. This will overwrite it with the current calculation.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmReplace(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={doSave} disabled={saving} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                {saving ? 'Saving…' : 'Yes, replace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT: Inputs */}
      <div className="col-span-2 space-y-5">

        {/* Section 1: Select Product */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">1. Select Product</h3>
          <div className="relative">
            <label className={labelCls}>Product *</label>
            <button type="button" onClick={() => setProductDropdown(d => !d)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white">
              {selectedProduct ? (
                <span className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-900">{selectedProduct.name}</span>
                  {selectedProduct.itemCode && <span className="text-gray-400 text-xs">{selectedProduct.itemCode}</span>}
                  {existingCosting && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Has costing</span>}
                </span>
              ) : (
                <span className="text-gray-400">Choose a product…</span>
              )}
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
            {productDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100 flex items-center gap-2 px-3">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input autoFocus value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search by name or SKU…" className="w-full text-sm outline-none" />
                </div>
                <div className="max-h-52 overflow-auto">
                  {filteredProducts.map(p => (
                    <button key={p.id} onClick={() => { setSelectedProduct(p); setProductDropdown(false); setProductSearch('') }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between gap-2">
                      <span>
                        <span className="font-medium text-gray-900 block">{p.name}</span>
                        {p.itemCode && <span className="text-xs text-gray-400">{p.itemCode}</span>}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">{STATUS_LABELS[p.status ?? ''] ?? p.status}</span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && !productsError && <p className="px-3 py-3 text-sm text-gray-400">No products found</p>}
                  {productsError && <p className="px-3 py-3 text-sm text-red-500">Failed to load products — please refresh</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Fabrics & Production Run */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">2. Fabrics & Production Run</h3>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Total Pieces in this Production Run *</label>
              <input type="number" min={1} value={pieces} onChange={e => setPieces(e.target.value)}
                className={inputCls} placeholder="e.g. 20 dresses" />
            </div>

            {fabricEntries.length > 0 && (
              <div className="space-y-3">
                {fabricEntries.map(row => {
                  const filtFabrics = fabrics.filter(f =>
                    f.name.toLowerCase().includes((fabricSearch[row.id] ?? '').toLowerCase())
                  )
                  return (
                    <div key={row.id} className="grid grid-cols-[1fr_120px_auto] gap-3 items-start">
                      {/* Fabric picker */}
                      <div className="relative">
                        <button type="button" onClick={() => setFabricDropdown(d => ({ ...d, [row.id]: !d[row.id] }))}
                          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black">
                          <span className={row.fabricName ? 'text-gray-900' : 'text-gray-400'}>
                            {row.fabricName || 'Select fabric…'}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        </button>
                        {fabricDropdown[row.id] && (
                          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                            <div className="p-2 border-b border-gray-100">
                              <input autoFocus value={fabricSearch[row.id] ?? ''}
                                onChange={e => setFabricSearch(s => ({ ...s, [row.id]: e.target.value }))}
                                placeholder="Search fabrics…" className="w-full text-sm px-1 outline-none" />
                            </div>
                            <div className="max-h-40 overflow-auto">
                              {filtFabrics.map(f => (
                                <button key={f.id} onClick={() => selectFabric(row.id, f)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between">
                                  <span className="font-medium">{f.name}</span>
                                  <span className="text-gray-400 text-xs">LKR {f.costPerUnit.toLocaleString()} / {f.unit ?? 'unit'}</span>
                                </button>
                              ))}
                              {filtFabrics.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No fabrics found</p>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quantity */}
                      <div>
                        <input type="number" min={0} value={row.quantity || ''}
                          onChange={e => updateQty(row.id, Number(e.target.value))}
                          placeholder={`Qty (${row.fabricName ? fabrics.find(f => f.id === row.fabricId)?.unit ?? 'units' : 'units'})`}
                          className={inputCls} />
                        {row.subtotal > 0 && <p className="text-xs text-gray-400 mt-1">LKR {fmt(row.subtotal)}</p>}
                      </div>

                      <button onClick={() => removeFabricRow(row.id)} className="mt-2 p-2 text-gray-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <button onClick={addFabricRow}
              className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 w-full justify-center">
              <Plus className="w-4 h-4" /> Add Fabric
            </button>

            {fabricEntries.length > 0 && pieces && Number(pieces) > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total fabric cost</span>
                  <span className="font-medium">LKR {fmt(totalFabricCost)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-gray-900">
                  <span>Fabric cost per item ({pieces} pcs)</span>
                  <span>LKR {fmt(fabricCostPerItem)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Other Production Costs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">3. Other Production Costs</h3>
          <div className="space-y-2 mb-3">
            {otherCosts.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">{c.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">LKR {fmt(c.amount)}</span>
                  <button onClick={() => setOtherCosts(cs => cs.filter(x => x.id !== c.id))} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newCostLabel} onChange={e => setNewCostLabel(e.target.value)} placeholder="Label (e.g. Labour)" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            <input type="number" value={newCostAmount} onChange={e => setNewCostAmount(e.target.value)} placeholder="Amount" className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            <button onClick={addOtherCost} className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"><Plus className="w-4 h-4" /> Add</button>
          </div>
        </div>

        {/* Section 4: Pricing Strategy */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">4. Pricing Strategy</h3>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setProfitMode('PERCENT')} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${profitMode === 'PERCENT' ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Target Profit Margin</button>
            <button onClick={() => setProfitMode('FIXED')} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${profitMode === 'FIXED' ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Manual Selling Price</button>
          </div>
          {profitMode === 'PERCENT' ? (
            <div className="flex gap-2">
              <button onClick={() => setProfitUnit('PERCENT')} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${profitUnit === 'PERCENT' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}>%</button>
              <button onClick={() => setProfitUnit('LKR')} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${profitUnit === 'LKR' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}>LKR</button>
              <input type="number" value={profitValue} onChange={e => setProfitValue(e.target.value)} placeholder={profitUnit === 'PERCENT' ? 'e.g. 30' : 'e.g. 1500'} className={`flex-1 ${inputCls}`} />
            </div>
          ) : (
            <div>
              <label className={labelCls}>Item Selling Price (LKR)</label>
              <input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} className={inputCls} placeholder="Enter selling price" />
            </div>
          )}
        </div>

        {/* Section 5: Deductions & Taxes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">5. Deductions & Taxes</h3>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>BNPL (Koko / Mintpay) — Total %</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input type="number" value={bnplTotal} onChange={e => setBnplTotal(e.target.value)} className={inputCls} placeholder="Total BNPL %" />
                  <p className="text-xs text-gray-400 mt-1">Total BNPL fee %</p>
                </div>
                <div>
                  <input type="number" value={bnplMerchant} onChange={e => setBnplMerchant(e.target.value)} className={inputCls} placeholder="Merchant absorbs %" />
                  <p className="text-xs text-gray-400 mt-1">Customer pays {bnplCustomerPerc.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Payment Gateway %</label>
                <input type="number" value={gatewayPerc} onChange={e => setGatewayPerc(e.target.value)} className={inputCls} placeholder="e.g. 2.5" />
              </div>
              <div>
                <label className={labelCls}>VAT %</label>
                <input type="number" value={vatPerc} onChange={e => setVatPerc(e.target.value)} className={inputCls} placeholder="e.g. 18" />
              </div>
            </div>
            {deductionsError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> Total customer deductions ≥ 100% — selling price cannot be calculated.
              </div>
            )}
          </div>
        </div>

        {/* Section 6: Delivery */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">6. Delivery Costs</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Total Delivery Cost (LKR)</label>
              <input type="number" value={deliveryTotal} onChange={e => setDeliveryTotal(e.target.value)} className={inputCls} placeholder="e.g. 400" />
            </div>
            <div>
              <label className={labelCls}>Merchant Absorbs (LKR)</label>
              <input type="number" value={deliveryMerchant} onChange={e => setDeliveryMerchant(e.target.value)} className={inputCls} placeholder="e.g. 0" />
              <p className="text-xs text-gray-400 mt-1">Customer pays LKR {customerDelivery.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Add to Inventory */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {!selectedProduct && (
            <p className="text-sm text-gray-400 text-center py-2">Select a product above to add it to inventory</p>
          )}
          {selectedProduct && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Recommended price: <strong>LKR {fmt(finalSellingPrice)}</strong>
                  {existingCosting && <span className="ml-2 text-amber-600">· Will replace existing costing</span>}
                </p>
              </div>
              <button onClick={handleAddToInventory} disabled={!canSave || saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 shrink-0 transition-colors">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : existingCosting ? 'Update Inventory' : 'Add to Inventory'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Summary */}
      <div className="col-span-1">
        <div className="sticky top-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 px-5 py-4">
            <h3 className="text-white font-semibold text-sm">Calculation Summary</h3>
            <p className="text-gray-400 text-xs mt-0.5">Updates in real-time</p>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Fabric Cost / Item</span>
              <span className="font-medium text-gray-900">LKR {fmt(fabricCostPerItem)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Other Costs</span>
              <span className="font-medium text-gray-900">LKR {fmt(otherCostsTotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-3">
              <span>Total Production Cost</span>
              <span>LKR {fmt(totalProductionCost)}</span>
            </div>

            {profitMode === 'PERCENT' && netProfit > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Expected Profit</span>
                <span className="font-medium text-green-600">LKR {fmt(netProfit)}</span>
              </div>
            )}
            {merchantAbsorbedBNPL > 0 && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Less: Merchant BNPL</span>
                <span className="text-red-500">-LKR {fmt(merchantAbsorbedBNPL)}</span>
              </div>
            )}
            {merchantDelivery > 0 && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Less: Merchant Delivery</span>
                <span className="text-red-500">-LKR {fmt(merchantDelivery)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-gray-100 pt-3">
              <span>Actual Net Profit</span>
              <span className={actualNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}>LKR {fmt(actualNetProfit)}</span>
            </div>
            {customerDelivery > 0 && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Customer Delivery</span>
                <span>LKR {fmt(customerDelivery)}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-4 mt-2">
              {deductionsError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-red-600 font-bold text-2xl">ERROR</p>
                  <p className="text-red-500 text-xs mt-1">Deductions ≥ 100%</p>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-xs mb-1">Recommended Selling Price</p>
                  <p className="text-white font-bold text-3xl">LKR {fmt(finalSellingPrice)}</p>
                  {customerDelivery > 0 && (
                    <p className="text-gray-400 text-xs mt-1">Total checkout: LKR {fmt(totalCheckoutPrice)}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">You can adjust this in Costumes Inventory</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
