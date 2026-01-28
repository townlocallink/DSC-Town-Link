
import React, { useState, useMemo } from 'react';
import { UserProfile, ShopProfile, ProductRequest, Offer, Order, MarketplaceStats } from '../types';
import { dbService } from '../databaseService';

interface AdminDashboardProps {
  requests: ProductRequest[];
  offers: Offer[];
  orders: Order[];
  allUsers: (UserProfile | ShopProfile)[];
  onImportData: (data: any) => void;
}

const TOWN_HUB_ID = 'town_hub_admin';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ requests, offers, orders, allUsers, onImportData }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'interactions' | 'conversations' | 'townhub' | 'users'>('overview');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [rescuingReqId, setRescuingReqId] = useState<string | null>(null);
  const [townHubPrice, setTownHubPrice] = useState('');
  const [townHubMessage, setTownHubMessage] = useState('');
  const [finalizingPickupOrderId, setFinalizingPickupOrderId] = useState<string | null>(null);
  const [customPickupAddress, setCustomPickupAddress] = useState('');
  const [customPickupPhone, setCustomPickupPhone] = useState('');

  const stats: MarketplaceStats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRequests = requests.length;
    return {
      totalUsers: allUsers.filter(u => u.role === 'customer').length,
      totalShops: allUsers.filter(u => u.role === 'shop_owner').length,
      totalRequests,
      totalOrders,
      conversionRate: totalRequests > 0 ? (totalOrders / totalRequests) * 100 : 0,
      activeCategories: requests.reduce((acc, req) => {
        acc[req.category] = (acc[req.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [allUsers, requests, orders]);

  // Grouped and sorted interactions
  const categorizedInteractions = useMemo(() => {
    const live: any[] = [];
    const fulfilled: any[] = [];

    // Track every request as a transaction journey
    requests.forEach(req => {
      const reqOffers = offers.filter(o => o.requestId === req.id);
      const reqOrder = orders.find(o => o.requestId === req.id);
      
      let stage: string;
      if (reqOrder?.status === 'delivered') stage = 'FULFILLED';
      else if (reqOrder?.status === 'collected') stage = 'DELIVERY_IN_PROGRESS';
      else if (reqOrder?.status === 'assigned') stage = 'DRIVER_ASSIGNED';
      else if (reqOrder) stage = 'ORDER_CONFIRMED';
      else if (reqOffers.length > 0) stage = 'OFFER_SENT';
      else stage = 'BROADCAST';

      const tx = { req, reqOffers, reqOrder, stage, time: req.createdAt };
      if (stage === 'FULFILLED') fulfilled.push(tx);
      else live.push(tx);
    });

    return {
      live: live.sort((a, b) => b.time - a.time),
      fulfilled: fulfilled.sort((a, b) => b.time - a.time)
    };
  }, [requests, offers, orders]);

  const deadLeads = useMemo(() => {
    const tenMinsAgo = Date.now() - (10 * 60 * 1000);
    return requests.filter(r => 
      r.status === 'broadcasted' && 
      r.createdAt < tenMinsAgo && 
      !offers.some(o => o.requestId === r.id)
    );
  }, [requests, offers]);

  const townHubPendingFinalization = orders.filter(o => o.isTownHubOrder && !o.townHubPickupFinalized);

  const sendTownHubOffer = async (req: ProductRequest) => {
    if (!townHubPrice) return;
    const offer: Offer = {
      id: 'th_off_' + Math.random().toString(36).substr(2, 9),
      requestId: req.id,
      customerId: req.customerId,
      shopId: TOWN_HUB_ID,
      shopName: 'Town Hub',
      shopRating: 4.9,
      price: parseFloat(townHubPrice),
      message: townHubMessage,
      createdAt: Date.now(),
      status: 'pending',
      chatHistory: []
    };
    await dbService.saveItem(offer.id, 'offer', offer);
    setRescuingReqId(null);
    setTownHubPrice('');
    setTownHubMessage('');
    alert("Town Hub offer sent to customer!");
  };

  const finalizePickup = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updatedOrder = {
        ...order,
        shopAddress: customPickupAddress,
        shopPhone: customPickupPhone,
        townHubPickupFinalized: true
      };
      await dbService.saveItem(orderId, 'order', updatedOrder);
      setFinalizingPickupOrderId(null);
      setCustomPickupAddress('');
      setCustomPickupPhone('');
      alert("Pickup details shared with delivery partner!");
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* GOD VIEW HEADER */}
      <div className="bg-[#0f172a] rounded-[40px] p-10 text-white shadow-2xl border border-gray-800">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.8)]"></span>
              <h2 className="text-4xl font-black tracking-tighter italic">Town Command</h2>
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Real-time Global Visibility</p>
          </div>
          
          <div className="flex flex-wrap bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'interactions', label: 'Interactions', icon: '🔄' },
              { id: 'conversations', label: 'Monitor', icon: '🕵️' },
              { id: 'townhub', label: 'Town Hub', icon: '🚁', alert: deadLeads.length + townHubPendingFinalization.length },
              { id: 'users', label: 'Registry', icon: '📋' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span> {tab.label}
                {tab.alert ? <span className="absolute -top-1 -right-1 bg-red-600 text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">{tab.alert}</span> : null}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {[
               { label: 'Total Sales', value: `₹${orders.reduce((sum, o) => sum + (o.amountToCollect || 0), 0)}`, icon: '💎', color: 'text-emerald-400' },
               { label: 'Live Funnel', value: `${stats.conversionRate.toFixed(1)}%`, icon: '⚖️', color: 'text-indigo-400' },
               { label: 'Market Needs', value: stats.totalRequests, icon: '📡', color: 'text-amber-400' },
               { label: 'Shop Network', value: stats.totalShops, icon: '🏗️', color: 'text-purple-400' },
             ].map((item, idx) => (
               <div key={idx} className="bg-white/5 p-8 rounded-[32px] border border-white/5 backdrop-blur-md">
                 <span className="text-2xl mb-3 block">{item.icon}</span>
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">{item.label}</p>
                 <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* INTERACTIONS TAB - GROUPED & EXPANDABLE */}
      {activeTab === 'interactions' && (
        <div className="space-y-10">
          <section>
            <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-4 mb-6 flex items-center gap-2">
               <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></span>
               Live Marketplace Flow
            </h3>
            <div className="space-y-3">
              {categorizedInteractions.live.map((tx) => (
                <div key={tx.req.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden hover:border-indigo-600 transition">
                   <button 
                     onClick={() => setSelectedTxId(selectedTxId === tx.req.id ? null : tx.req.id)}
                     className="w-full p-6 flex justify-between items-center text-left"
                   >
                      <div className="flex items-center gap-5">
                         <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">
                            {tx.stage === 'BROADCAST' ? '📡' : tx.stage === 'OFFER_SENT' ? '🏷️' : '🚚'}
                         </div>
                         <div>
                            <p className="text-xs font-black text-gray-900 uppercase">{tx.req.customerName} asked for {tx.req.category}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{new Date(tx.time).toLocaleTimeString()}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                          tx.stage === 'BROADCAST' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          tx.stage === 'OFFER_SENT' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}>
                          {tx.stage.replace(/_/g, ' ')}
                        </span>
                        <span className={`transition-transform duration-300 ${selectedTxId === tx.req.id ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                   </button>
                   
                   {selectedTxId === tx.req.id && (
                     <div className="px-10 pb-8 pt-4 border-t border-gray-50 bg-gray-50/30 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-6">
                              <div>
                                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Customer Need</p>
                                 <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                                    <p className="text-sm font-medium italic">"{tx.req.description}"</p>
                                    {tx.req.image && <img src={tx.req.image} className="mt-4 rounded-xl w-full h-32 object-cover border" alt="Request" />}
                                 </div>
                              </div>
                              <div>
                                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Quotes Summary</p>
                                 <div className="space-y-2">
                                    {tx.reqOffers.map((o: any) => (
                                      <div key={o.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-50">
                                         <p className="text-[11px] font-bold text-gray-700">{o.shopName}</p>
                                         <p className="text-[11px] font-black text-indigo-600">₹{o.price}</p>
                                      </div>
                                    ))}
                                    {tx.reqOffers.length === 0 && <p className="text-[10px] text-gray-300 italic">No quotes sent yet.</p>}
                                 </div>
                              </div>
                           </div>
                           <div className="space-y-6">
                              <div>
                                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Order Status Details</p>
                                 {tx.reqOrder ? (
                                   <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-100">
                                      <p className="text-[8px] font-black uppercase opacity-70 mb-1">Live Order ID: #{tx.reqOrder.id.slice(0,6)}</p>
                                      <p className="text-xl font-black italic mb-4">{tx.reqOrder.status.replace(/_/g, ' ')}</p>
                                      <div className="space-y-2 text-[10px] font-bold">
                                         <p className="flex justify-between"><span>Shop:</span> <span className="opacity-90">{tx.reqOrder.shopName}</span></p>
                                         <p className="flex justify-between"><span>Payment:</span> <span className="opacity-90">₹{tx.reqOrder.amountToCollect} (Collect)</span></p>
                                         <p className="flex justify-between"><span>Courier:</span> <span className="opacity-90">{tx.reqOrder.deliveryPartnerName || 'Pending'}</span></p>
                                      </div>
                                   </div>
                                 ) : (
                                   <div className="bg-gray-100 p-8 rounded-3xl text-center border-2 border-dashed border-gray-200">
                                      <p className="text-[10px] font-black uppercase text-gray-400">Waiting for conversion</p>
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-4 mb-6">📜 Fulfillment History</h3>
            <div className="space-y-2 opacity-70">
              {categorizedInteractions.fulfilled.map((tx) => (
                <div key={tx.req.id} className="bg-white p-5 rounded-2xl border border-gray-50 flex justify-between items-center grayscale-[0.5]">
                   <div className="flex items-center gap-4">
                      <span className="text-xl">✅</span>
                      <div>
                         <p className="text-xs font-bold text-gray-800">{tx.req.customerName}'s {tx.req.category} Order</p>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Completed on {new Date(tx.time).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <p className="text-sm font-black text-green-600">₹{tx.reqOrder?.amountToCollect}</p>
                </div>
              ))}
              {categorizedInteractions.fulfilled.length === 0 && <p className="text-[10px] text-gray-300 italic px-4">No completed orders yet.</p>}
            </div>
          </section>
        </div>
      )}

      {/* TOWN HUB OPS - THE RESCUE CENTER */}
      {activeTab === 'townhub' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
           <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black italic tracking-tighter">Dead Lead Rescue</h3>
                <span className="bg-red-50 text-red-600 text-[9px] font-black uppercase px-3 py-1 rounded-full animate-pulse border border-red-100">
                   {deadLeads.length} Needs Over 10 Mins Old
                </span>
              </div>
              <p className="text-[11px] font-medium text-gray-500 mb-8 leading-relaxed">
                 These customers have received 0 offers after 10 minutes. Act as <b>Town Hub</b> to fulfill their needs yourself.
              </p>
              
              <div className="space-y-4">
                {deadLeads.map(lead => (
                  <div key={lead.id} className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex flex-col gap-4">
                     <div className="flex justify-between items-start">
                        <span className="bg-white border text-[8px] font-black px-3 py-1 rounded-full uppercase text-gray-400 tracking-widest">
                           {lead.category} • {lead.city}
                        </span>
                        <p className="text-[9px] font-bold text-gray-400 italic">Posted {Math.floor((Date.now() - lead.createdAt) / 60000)}m ago</p>
                     </div>
                     <p className="text-sm font-bold text-gray-800 italic">"{lead.description}"</p>
                     <button 
                       onClick={() => setRescuingReqId(lead.id)}
                       className="w-fit bg-red-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition"
                     >
                       Rescue Lead
                     </button>

                     {rescuingReqId === lead.id && (
                       <div className="mt-4 p-6 bg-white rounded-3xl border border-red-100 animate-fade-in space-y-4 shadow-xl">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Send Offer as 'Town Hub'</p>
                          <input 
                            type="number" 
                            className="w-full p-4 bg-gray-50 rounded-xl outline-none font-black text-xl border focus:border-red-600" 
                            placeholder="Price (₹)" 
                            value={townHubPrice}
                            onChange={e => setTownHubPrice(e.target.value)}
                          />
                          <textarea 
                            className="w-full p-4 bg-gray-50 rounded-xl outline-none text-sm font-medium h-24 border focus:border-red-600" 
                            placeholder="Message to customer (Ex: Found this at local market, high quality...)"
                            value={townHubMessage}
                            onChange={e => setTownHubMessage(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => sendTownHubOffer(lead)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Submit Rescue Offer</button>
                            <button onClick={() => {setRescuingReqId(null); setTownHubPrice(''); setTownHubMessage('');}} className="px-4 py-3 text-gray-400 text-[10px] font-black uppercase">Cancel</button>
                          </div>
                       </div>
                     )}
                  </div>
                ))}
                {deadLeads.length === 0 && (
                  <div className="py-20 text-center opacity-30">
                     <span className="text-4xl">🚀</span>
                     <p className="text-[10px] font-black uppercase mt-4 tracking-widest">No dead leads detected</p>
                  </div>
                )}
              </div>
           </div>

           <div className="bg-[#1e293b] rounded-[40px] p-8 text-white shadow-xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black italic tracking-tighter text-indigo-400">Town Hub Dispatch</h3>
                <span className="bg-indigo-600 text-[8px] font-black uppercase px-3 py-1 rounded-full border border-indigo-500">
                   {townHubPendingFinalization.length} Pending Details
                </span>
              </div>
              <p className="text-[11px] font-medium text-gray-400 mb-8 leading-relaxed italic">
                 When a customer accepts a Town Hub offer, you must provide the physical shop's address and phone number for the delivery partner.
              </p>

              <div className="space-y-4">
                 {townHubPendingFinalization.map(order => (
                   <div key={order.id} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex justify-between items-center">
                         <p className="text-xs font-black">Order #{order.id.slice(0,6)}</p>
                         <span className="text-[8px] font-black uppercase text-amber-400">Action Required</span>
                      </div>
                      <p className="text-[11px] text-gray-400 italic">"Fulfilling {order.itemDescription?.slice(0, 50)}..."</p>
                      
                      <button 
                        onClick={() => setFinalizingPickupOrderId(order.id)}
                        className="w-full bg-indigo-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition"
                      >
                        Add Physical Shop Details
                      </button>

                      {finalizingPickupOrderId === order.id && (
                        <div className="p-6 bg-white text-gray-900 rounded-3xl space-y-4 shadow-2xl animate-fade-in">
                           <div>
                              <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Found Shop Address</label>
                              <input 
                                className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-xs" 
                                placeholder="Where should driver pick this up?"
                                value={customPickupAddress}
                                onChange={e => setCustomPickupAddress(e.target.value)}
                              />
                           </div>
                           <div>
                              <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Found Shop Phone</label>
                              <input 
                                className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-xs" 
                                placeholder="Contact person phone number"
                                value={customPickupPhone}
                                onChange={e => setCustomPickupPhone(e.target.value)}
                              />
                           </div>
                           <div className="flex gap-2 pt-2">
                             <button onClick={() => finalizePickup(order.id)} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Send to Driver</button>
                             <button onClick={() => setFinalizingPickupOrderId(null)} className="px-4 py-3 text-gray-400 text-[10px] font-black uppercase">Cancel</button>
                           </div>
                        </div>
                      )}
                   </div>
                 ))}
                 {townHubPendingFinalization.length === 0 && (
                   <div className="py-20 text-center opacity-30">
                      <p className="text-[10px] font-black uppercase tracking-widest">No dispatches pending</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* OTHER TABS (Monitor, Users) - Keeping previous high-density UI */}
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
          <div className="lg:col-span-1 bg-white rounded-[40px] p-8 border border-gray-100 overflow-y-auto no-scrollbar">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Active Shop-Customer Chats</h3>
             <div className="space-y-3">
               {offers.filter(o => (o.chatHistory?.length || 0) > 0).length === 0 ? (
                 <p className="text-center text-gray-300 py-20 text-[10px] font-black uppercase tracking-widest">No chats detected yet</p>
               ) : (
                 offers.filter(o => (o.chatHistory?.length || 0) > 0).map(conv => (
                   <button 
                     key={conv.id} 
                     onClick={() => setSelectedTxId(conv.id)}
                     className={`w-full p-6 rounded-[32px] border text-left transition ${selectedTxId === conv.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-50 hover:bg-gray-50'}`}
                   >
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{conv.shopName}</p>
                        <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{conv.chatHistory?.length}</span>
                     </div>
                     <p className="text-xs font-bold text-gray-800 truncate">vs {allUsers.find(u => u.id === conv.customerId)?.name || 'Resident'}</p>
                   </button>
                 ))
               )}
             </div>
          </div>
          <div className="lg:col-span-2 bg-[#fcfcfc] rounded-[40px] border border-gray-100 overflow-hidden flex flex-col">
             {selectedTxId && offers.find(o => o.id === selectedTxId) ? (
               <>
                 <div className="p-8 border-b border-gray-100 bg-white flex justify-between items-center">
                    <div>
                       <h4 className="text-xl font-black italic">Monitoring Chat</h4>
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Observation Mode Enabled</p>
                    </div>
                    <button onClick={() => setSelectedTxId(null)} className="text-gray-400">✕</button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar">
                    {offers.find(o => o.id === selectedTxId)?.chatHistory?.map((msg, i) => {
                      const sender = allUsers.find(u => u.id === msg.senderId);
                      const isShop = sender?.role === 'shop_owner' || sender?.id === TOWN_HUB_ID;
                      return (
                        <div key={i} className={`flex flex-col ${isShop ? 'items-start' : 'items-end'}`}>
                          <div className={`p-4 rounded-[20px] max-w-[80%] text-sm font-medium shadow-sm border ${isShop ? 'bg-white border-gray-100 rounded-tl-none' : 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none'}`}>
                            {msg.text}
                          </div>
                          <span className="text-[8px] font-black text-gray-400 uppercase mt-2 mx-1">{sender?.name || 'Unknown'} • {new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                      )
                    })}
                 </div>
               </>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center opacity-20 p-20 text-center">
                 <span className="text-6xl mb-4">🕵️‍♂️</span>
                 <h3 className="text-2xl font-black italic">Sales Monitor</h3>
                 <p className="text-sm font-bold">Listen to how shops are talking to your town residents.</p>
               </div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-gray-50 flex justify-between items-center">
             <div><h3 className="text-2xl font-black italic">Town Registry</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Marketplace participants</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400"><th className="px-10 py-6">User / Business</th><th className="px-10 py-6">City</th><th className="px-10 py-6 text-right">Verification</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50/30 transition group">
                    <td className="px-10 py-8">
                       <p className="font-black text-gray-900">{'shopName' in u ? u.shopName : u.name} <span className="text-[8px] text-gray-400 font-bold ml-1">({u.role})</span></p>
                    </td>
                    <td className="px-10 py-8"><p className="text-xs font-bold text-gray-800">{u.city}</p></td>
                    <td className="px-10 py-8 text-right">
                       <button onClick={() => dbService.updateUserProfile(u.id, { isVerified: !u.isVerified })} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${u.isVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                         {u.isVerified ? 'Verified' : 'Pending'}
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <footer className="mt-12 flex items-center justify-between border-t border-gray-100 pt-8 px-4">
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Town Command Build v11.2</span>
            </div>
         </div>
      </footer>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
