'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ImageIcon, Save, AlertCircle } from 'lucide-react'
import { getFabrics, addCosting, type Fabric } from '@/lib/costcal-storage'

type ProfitMode = 'PERCENT' | 'FIXED'
type ProfitUnit = 'PERCENT' | 'LKR'
interface OtherCost { id: string; label: string; amount: number }

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

function uuid() { return Math.random().toString(36).slice(2) }

export default function CostCalculator({ onSaved }: { onSaved?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [fabricSearch, setFabricSearch] = useState('')
  const [fabricDropdown, setFabricDropdown] = useState(false)
  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null)
  const [pieces, setPieces] = useState('')
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([])
  const [newCostLabel, setNewCostLabel] = useState('')
  const [newCostAmount, setNewCostAmount] = useState('')
  const [profitMode, setProfitMode] = useState<ProfitMode>('PERCENT')
  const [profitUnit, setProfitUnit] = useState<ProfitUnit>('PERCENT')
  const [profitValue, setProfitValue] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [bnplTotal, setBnplTotal] = useState('')
  const [bnplMerchant, setBnplMerchant] = useState('')
  const [gatewayPerc, setGatewayPerc] = useState('')
  const [vatPerc, setVatPerc] = useState('')
  const [deliveryTotal, setDeliveryTotal] = useState('')
  const [deliveryMerchant, setDeliveryMerchant] = useState('')
  const [costumeCode, setCostumeCode] = useState('')
  const [costumeImage, setCostumeImage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { getFabrics().then(setFabrics) }, [])

  const filteredFabrics = fabrics.filter(f => f.name.toLowerCase().includes(fabricSearch.toLowerCase()))

  const baseFabricCost = selectedFabric && pieces ? selectedFabric.cost / Number(pieces) : 0
  const otherCostsTotal = otherCosts.reduce((s, c) => s + c.amount, 0)
  const totalProductionCost = baseFabricCost + otherCostsTotal

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
    setOtherCosts(c => [...c, { id: uuid(), label: newCostLabel, amount: Number(newCostAmount) }])
    setNewCostLabel(''); setNewCostAmount('')
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCostumeImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!costumeCode || deductionsError) return
    setSaving(true)
    await addCosting({
      code: costumeCode,
      image: costumeImage || undefined,
      fabricId: selectedFabric?.id,
      totalProductionCost,
      netProfit: actualNetProfit,
      sellingPrice: finalSellingPrice,
    })
    setSaving(false)
    if (onSaved) onSaved()
  }

  const fmt = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* LEFT: Inputs */}
      <div className="col-span-2 space-y-5">

        {/* Section 1: Fabric & Yield */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">1. Fabric & Yield</h3>
          <div className="space-y-4">
            <div className="relative">
              <label className={labelCls}>Select Fabric</label>
              <button type="button" onClick={() => setFabricDropdown(d => !d)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white">
                <span className={selectedFabric ? 'text-gray-900' : 'text-gray-400'}>{selectedFabric ? selectedFabric.name : 'Choose a fabric…'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {fabricDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <input autoFocus value={fabricSearch} onChange={e => setFabricSearch(e.target.value)} placeholder="Search fabrics…" className="w-full px-2 py-1.5 text-sm outline-none" />
                  </div>
                  <div className="max-h-48 overflow-auto">
                    <button onClick={() => { setSelectedFabric(null); setFabricDropdown(false); setFabricSearch('') }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50">No fabric / Pre-made</button>
                    {filteredFabrics.map(f => (
                      <button key={f.id} onClick={() => { setSelectedFabric(f); setFabricDropdown(false); setFabricSearch('') }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        <span className="font-medium">{f.name}</span>
                        <span className="text-gray-400 ml-2">LKR {f.cost.toLocaleString()}</span>
                      </button>
                    ))}
                    {filteredFabrics.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No fabrics found</p>}
                  </div>
                </div>
              )}
            </div>
            {selectedFabric && (
              <div>
                <label className={labelCls}>Total Pieces Yielded from this Fabric</label>
                <input type="number" value={pieces} onChange={e => setPieces(e.target.value)} className={inputCls} placeholder="e.g. 10" min="1" />
                {pieces && Number(pieces) > 0 && (
                  <p className="text-xs text-gray-500 mt-1.5">Fabric cost per item: <strong>LKR {fmt(baseFabricCost)}</strong></p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Other Costs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">2. Other Production Costs</h3>
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
            <input value={newCostLabel} onChange={e => setNewCostLabel(e.target.value)} placeholder="Cost label (e.g. Labour)" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            <input type="number" value={newCostAmount} onChange={e => setNewCostAmount(e.target.value)} placeholder="Amount" className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            <button onClick={addOtherCost} className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"><Plus className="w-4 h-4" /> Add</button>
          </div>
        </div>

        {/* Section 3: Pricing Strategy */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">3. Pricing Strategy</h3>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setProfitMode('PERCENT')} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${profitMode === 'PERCENT' ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Target Profit Margin</button>
            <button onClick={() => setProfitMode('FIXED')} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${profitMode === 'FIXED' ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Manual Selling Price</button>
          </div>
          {profitMode === 'PERCENT' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setProfitUnit('PERCENT')} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${profitUnit === 'PERCENT' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}>%</button>
                <button onClick={() => setProfitUnit('LKR')} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${profitUnit === 'LKR' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}>LKR</button>
                <input type="number" value={profitValue} onChange={e => setProfitValue(e.target.value)} placeholder={profitUnit === 'PERCENT' ? 'e.g. 30' : 'e.g. 1500'} className={`flex-1 ${inputCls}`} />
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Item Selling Price (LKR)</label>
              <input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} className={inputCls} placeholder="Enter selling price" />
            </div>
          )}
        </div>

        {/* Section 4: Deductions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">4. Deductions & Taxes</h3>
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
                  <p className="text-xs text-gray-400 mt-1">Merchant absorbs % — customer pays {bnplCustomerPerc.toFixed(1)}%</p>
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

        {/* Section 5: Delivery */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">5. Delivery Costs</h3>
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

        {/* Save Block */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Save to Library</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Costume Code / SKU *</label>
              <input value={costumeCode} onChange={e => setCostumeCode(e.target.value)} className={inputCls} placeholder="e.g. AC-SHIRT-001" />
            </div>
            <div>
              <label className={labelCls}>Costume Photo (optional)</label>
              <div className="flex items-center gap-3">
                {costumeImage ? (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={costumeImage} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                )}
                <button onClick={() => fileRef.current?.click()} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">Upload</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </div>
            </div>
          </div>
          <button onClick={handleSave} disabled={!costumeCode || deductionsError || saving}
            className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save to Library'}
          </button>
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
              <span className="font-medium text-gray-900">LKR {fmt(baseFabricCost)}</span>
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
                  <p className="text-gray-400 text-xs mb-1">Final Selling Price</p>
                  <p className="text-white font-bold text-3xl">LKR {fmt(finalSellingPrice)}</p>
                  {customerDelivery > 0 && (
                    <p className="text-gray-400 text-xs mt-1">Total checkout: LKR {fmt(totalCheckoutPrice)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
