import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo, formatDate } from '../../utils/formatters';
import type { DistributorCommodity, PurchaseOrder } from '../../types';
import {
  Truck,
  CheckCircle,
  PlusCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Building2,
  Edit2,
  X,
  MapPin,
} from 'lucide-react';

export const DistributorDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'commodities' | 'orders' | 'settlement'>('commodities');
  const [commodities, setCommodities] = useState<DistributorCommodity[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Listing Modal State
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [listingForm, setListingForm] = useState({
    product_name: '',
    category: 'Grains',
    pack_size: '50kg Bag',
    price_naira: 66500,
    delivery_fee_naira: 13125,
    min_order_packs: 1,
    available_packs: 100,
    warehouse_location: 'Idu Industrial Layout, Abuja Central Depot',
  });
  const [creatingListing, setCreatingListing] = useState(false);

  // Dispatch Modal State
  const [dispatchModalOrder, setDispatchModalOrder] = useState<PurchaseOrder | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    driver_name: '',
    driver_phone: '',
    vehicle_plate: '',
    waybill_number: '',
  });
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Price Edit Inline State
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [editPriceNaira, setEditPriceNaira] = useState<number>(0);
  const [editDeliveryNaira, setEditDeliveryNaira] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [commRes, ordRes] = await Promise.all([
        fetch('/api/distributor/commodities', { headers }),
        fetch('/api/distributor/orders', { headers }),
      ]);

      if (commRes.ok) {
        const commData = await commRes.json();
        setCommodities(commData || []);
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData || []);
      }
    } catch (err) {
      console.error('Failed to load distributor data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Create New Commodity Listing
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setCreatingListing(true);
    try {
      const res = await fetch('/api/distributor/commodities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_name: listingForm.product_name,
          category: listingForm.category,
          pack_size: listingForm.pack_size,
          price_per_pack_kobo: listingForm.price_naira * 100,
          delivery_fee_kobo: listingForm.delivery_fee_naira * 100,
          min_order_packs: listingForm.min_order_packs,
          available_packs: listingForm.available_packs,
          warehouse_location: listingForm.warehouse_location,
        }),
      });

      if (res.ok) {
        setIsListingModalOpen(false);
        setListingForm({
          product_name: '',
          category: 'Grains',
          pack_size: '50kg Bag',
          price_naira: 65000,
          delivery_fee_naira: 12000,
          min_order_packs: 1,
          available_packs: 100,
          warehouse_location: 'Idu Industrial Layout, Abuja Central Depot',
        });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create listing');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setCreatingListing(false);
    }
  };

  // Handle Quick Price Update
  const handleUpdatePrice = async (comm: DistributorCommodity) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/distributor/commodities/${comm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...comm,
          price_per_pack_kobo: editPriceNaira * 100,
          delivery_fee_kobo: editDeliveryNaira * 100,
        }),
      });

      if (res.ok) {
        setEditingCommId(null);
        fetchData();
      } else {
        alert('Failed to update price');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating price');
    }
  };

  // Handle Dispatch Order
  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalOrder || !token) return;

    setDispatchLoading(true);
    try {
      const res = await fetch(`/api/distributor/orders/${dispatchModalOrder.id}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dispatchForm),
      });

      if (res.ok) {
        setDispatchModalOrder(null);
        setDispatchForm({ driver_name: '', driver_phone: '', vehicle_plate: '', waybill_number: '' });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to dispatch order');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setDispatchLoading(false);
    }
  };

  // Handle Confirm Delivered
  const handleMarkDelivered = async (orderId: string) => {
    if (!token || !confirm('Confirm that the truck has arrived at Piwoyi and goods are handed to the Hub Coordinator?')) return;

    try {
      const res = await fetch(`/api/distributor/orders/${orderId}/delivered`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('✓ Order marked as delivered! Units in Piwoyi are now ready for member pickup.');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order status');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const totalInvoicedKobo = orders.reduce((acc, o) => acc + o.total_amount_kobo, 0);

  return (
    <div className="pb-24 max-w-4xl mx-auto px-3.5 pt-4">
      {/* Distributor Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-sm mb-5 border border-blue-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center font-bold text-blue-300 text-xl">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-base text-white">
                  {user?.full_name || 'Alhaji Dahiru (Northern Agro Millers Ltd)'}
                </h1>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                  <ShieldCheck size={11} /> Verified Agro Supplier
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5 flex items-center gap-2">
                <span>Depot: Idu Industrial Park, Abuja</span>
                <span>•</span>
                <span>Dispatch SLA: &lt; 24 Hours</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsListingModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-blue-950 font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>List Commodity</span>
            </button>
          </div>
        </div>

        {/* Distributor KPI Stats */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-white/10 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-lg font-black text-white">{commodities.length}</div>
            <div className="text-[11px] text-blue-200/70 font-medium">Commodity Quotes</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-lg font-black text-emerald-400">{orders.length}</div>
            <div className="text-[11px] text-blue-200/70 font-medium">Purchase Orders</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-lg font-black text-amber-300">{formatKobo(totalInvoicedKobo)}</div>
            <div className="text-[11px] text-blue-200/70 font-medium">Total Invoiced</div>
          </div>
        </div>
      </div>

      {/* Portal Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('commodities')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'commodities'
              ? 'text-blue-900 border-b-2 border-blue-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Commodity Catalog & Prices ({commodities.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'orders'
              ? 'text-blue-900 border-b-2 border-blue-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Purchase Orders & Dispatch ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('settlement')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'settlement'
              ? 'text-blue-900 border-b-2 border-blue-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Settlements & Banking
        </button>
      </div>

      {/* Tab: Commodities */}
      {activeTab === 'commodities' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Wholesale Offerings & Pricing Table</h2>
              <p className="text-[11px] text-gray-400">
                These prices are fetched live by SharedBuy coordinators launching units in Piwoyi, Abuja.
              </p>
            </div>
            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
              title="Refresh catalog"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {commodities.map((comm) => {
              const isEditing = editingCommId === comm.id;

              return (
                <div key={comm.id} className="bg-white rounded-3xl border border-gray-200 p-4.5 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[10px] uppercase">
                        {comm.category}
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm mt-1">{comm.product_name}</h3>
                      <div className="text-[11px] text-gray-500">Pack Size: <strong>{comm.pack_size}</strong></div>
                    </div>

                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingCommId(null);
                        } else {
                          setEditingCommId(comm.id);
                          setEditPriceNaira(comm.price_per_pack_kobo / 100);
                          setEditDeliveryNaira(comm.delivery_fee_kobo / 100);
                        }
                      }}
                      className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
                      title="Edit Price"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-0.5">Wholesale Price (₦)</label>
                          <input
                            type="number"
                            step={500}
                            value={editPriceNaira}
                            onChange={(e) => setEditPriceNaira(Number(e.target.value))}
                            className="w-full p-1.5 bg-white rounded-lg border border-gray-300 font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-600 block mb-0.5">Delivery to Piwoyi (₦)</label>
                          <input
                            type="number"
                            step={250}
                            value={editDeliveryNaira}
                            onChange={(e) => setEditDeliveryNaira(Number(e.target.value))}
                            className="w-full p-1.5 bg-white rounded-lg border border-gray-300 font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          onClick={() => setEditingCommId(null)}
                          className="px-2.5 py-1 rounded-lg bg-gray-200 text-gray-700 font-semibold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdatePrice(comm)}
                          className="px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Wholesale Price / Pack:</span>
                        <span className="font-extrabold text-sm text-gray-900">{formatKobo(comm.price_per_pack_kobo)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-500">Delivery Logistics to Piwoyi:</span>
                        <span className="font-bold text-emerald-800">{formatKobo(comm.delivery_fee_kobo)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500">Available In Stock:</span>
                        <span className="font-semibold text-gray-800">{comm.available_packs} packs</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-gray-400" />
                      <span className="truncate max-w-[200px]">{comm.warehouse_location}</span>
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      ● Active Quote
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Purchase Orders & Dispatch Desk */}
      {activeTab === 'orders' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Bulk Purchase Orders & Waybill Dispatch Desk</h2>
              <p className="text-[11px] text-gray-400">
                Purchase orders consolidated by SharedBuy Ops for dispatch to Piwoyi estate hubs.
              </p>
            </div>
            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="py-12 bg-white rounded-3xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
              No purchase orders received yet. Once platform units in Piwoyi fill up, purchase orders will arrive here.
            </div>
          ) : (
            <div className="space-y-3.5">
              {orders.map((po) => (
                <div key={po.id} className="bg-white rounded-3xl border border-gray-200 p-5 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-900">{po.order_number}</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          po.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                          po.status === 'DISPATCHED' ? 'bg-amber-100 text-amber-900 animate-pulse' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {po.status === 'DISPATCHED' ? '🚚 IN TRANSIT' : po.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Destination: <strong>{po.destination_area}</strong> ({po.destination_landmarks?.join(' & ')})
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-gray-900">{formatKobo(po.total_amount_kobo)}</div>
                      <div className="text-[10px] text-gray-400">Includes ₦{(po.total_delivery_fee_kobo / 100).toLocaleString()} logistics</div>
                    </div>
                  </div>

                  {/* Dispatch Manifest Details */}
                  {po.status === 'DISPATCHED' && (
                    <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-1 text-xs">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Truck size={14} className="text-amber-700" /> Active Dispatch Manifest & Waybill
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-700 pt-1">
                        <div>Driver: <strong>{po.driver_name}</strong></div>
                        <div>Phone: <strong>{po.driver_phone}</strong></div>
                        <div>Truck Plate: <strong className="font-mono">{po.vehicle_plate}</strong></div>
                        <div>Waybill #: <strong className="font-mono">{po.waybill_number}</strong></div>
                      </div>
                      <div className="text-[10px] text-amber-800 mt-1">
                        Dispatched: {po.dispatched_at && formatDate(po.dispatched_at)}
                      </div>
                    </div>
                  )}

                  {po.status === 'DELIVERED' && (
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle size={15} className="text-emerald-700" /> Successfully Delivered to Hub Coordinator
                      </span>
                      <span className="text-[11px] text-emerald-800 font-semibold">
                        {po.delivered_at && formatDate(po.delivered_at)}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-gray-400">
                      Ordered: {formatDate(po.ordered_at)}
                    </span>

                    <div className="flex items-center gap-2">
                      {po.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setDispatchModalOrder(po);
                            setDispatchForm({
                              driver_name: 'Audu Mohammed',
                              driver_phone: '+2348091122334',
                              vehicle_plate: 'ABJ-774-XY',
                              waybill_number: `WB-${Math.floor(1000 + Math.random() * 9000)}`,
                            });
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Truck size={14} /> Accept & Dispatch Truck
                        </button>
                      )}

                      {po.status === 'DISPATCHED' && (
                        <button
                          onClick={() => handleMarkDelivered(po.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle size={14} /> Confirm Delivered at Hub
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Settlement */}
      {activeTab === 'settlement' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-700" />
            <h2 className="font-bold text-sm text-gray-900">Distributor Direct Settlement Account</h2>
          </div>
          <p className="text-gray-500 text-[11px]">
            Wholesale payments from SharedBuy Escrow are settled directly into your commercial bank account upon truck delivery confirmation.
          </p>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Corporate Bank:</span>
              <strong className="text-gray-900">Zenith Bank Plc</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account Number (NUBAN):</span>
              <strong className="text-gray-900 font-mono">1012349988</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account Name:</span>
              <strong className="text-gray-900">Northern Agro Millers Logistics Ltd</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Settlement Currency:</span>
              <strong className="text-emerald-700 font-bold">Nigerian Naira (NGN)</strong>
            </div>
          </div>
        </div>
      )}

      {/* Modal: List New Commodity */}
      {isListingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">List New Wholesale Commodity</h3>
              <button onClick={() => setIsListingModalOpen(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={listingForm.product_name}
                  onChange={(e) => setListingForm({ ...listingForm, product_name: e.target.value })}
                  placeholder="e.g. Premium White Garri (50kg Bag)"
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Category</label>
                  <select
                    value={listingForm.category}
                    onChange={(e) => setListingForm({ ...listingForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-medium"
                  >
                    <option value="Grains">Grains & Rice</option>
                    <option value="Tubers & Flour">Tubers & Garri</option>
                    <option value="Oils">Cooking Oils</option>
                    <option value="Dairy">Dairy & Milk</option>
                    <option value="Seafood & Seasonings">Seafood & Seasonings</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Pack Size</label>
                  <input
                    type="text"
                    required
                    value={listingForm.pack_size}
                    onChange={(e) => setListingForm({ ...listingForm, pack_size: e.target.value })}
                    placeholder="e.g. 50kg Bag"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Wholesale Price (₦)</label>
                  <input
                    type="number"
                    required
                    step={500}
                    value={listingForm.price_naira}
                    onChange={(e) => setListingForm({ ...listingForm, price_naira: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Delivery to Piwoyi (₦)</label>
                  <input
                    type="number"
                    required
                    step={250}
                    value={listingForm.delivery_fee_naira}
                    onChange={(e) => setListingForm({ ...listingForm, delivery_fee_naira: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Available Packs</label>
                  <input
                    type="number"
                    required
                    value={listingForm.available_packs}
                    onChange={(e) => setListingForm({ ...listingForm, available_packs: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Minimum Order</label>
                  <input
                    type="number"
                    required
                    value={listingForm.min_order_packs}
                    onChange={(e) => setListingForm({ ...listingForm, min_order_packs: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Warehouse Location</label>
                <input
                  type="text"
                  required
                  value={listingForm.warehouse_location}
                  onChange={(e) => setListingForm({ ...listingForm, warehouse_location: e.target.value })}
                  placeholder="e.g. Idu Industrial Layout, Abuja Central Depot"
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={creatingListing}
                className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {creatingListing ? <Loader2 size={16} className="animate-spin" /> : <span>Publish Commodity Quote</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispatch Order */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  Waybill Manifest
                </span>
                <h3 className="font-bold text-sm text-gray-900 mt-1">
                  Dispatch Truck for {dispatchModalOrder.order_number}
                </h3>
              </div>
              <button onClick={() => setDispatchModalOrder(null)} className="p-1 rounded-full text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDispatchOrder} className="space-y-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Driver Full Name</label>
                <input
                  type="text"
                  required
                  value={dispatchForm.driver_name}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                  placeholder="e.g. Audu Mohammed"
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Driver Phone Number</label>
                <input
                  type="tel"
                  required
                  value={dispatchForm.driver_phone}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, driver_phone: e.target.value })}
                  placeholder="e.g. +2348091122334"
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Truck Plate Number</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.vehicle_plate}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_plate: e.target.value })}
                    placeholder="e.g. ABJ-774-XY"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Waybill Number</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.waybill_number}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, waybill_number: e.target.value })}
                    placeholder="e.g. WB-9941"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 text-[11px] text-blue-900 border border-blue-200">
                Dispatching will notify Piwoyi hub coordinators and transition linked units to <strong>IN_TRANSIT</strong> status.
              </div>

              <button
                type="submit"
                disabled={dispatchLoading}
                className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {dispatchLoading ? <Loader2 size={16} className="animate-spin" /> : <span>Confirm Truck Dispatch</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
