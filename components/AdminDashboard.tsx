
import React, { useState, useMemo, useRef } from 'react';
import { UserProfile, ShopProfile, ProductRequest, Offer, Order, MarketplaceStats, DirectMessage } from '../types';
import { dbService } from '../databaseService';
import DirectChat from './DirectChat';

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
  const [townHubImage, setTownHubImage] = useState<string | null>(null);
  const [finalizingPickupOrderId, setFinalizingPickupOrderId] = useState<string | null>(null);
  const [customPickupAddress, setCustomPickupAddress] = useState('');
  const [customPickupPhone, setCustomPickupPhone] = useState('');
  const [selectedMonitorOfferId, setSelectedMonitorOfferId] = useState<string | null>(null);

  const offerImageRef = useRef<HTMLInputElement>(null);

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

  const categorizedInteractions = useMemo(() => {
    const live: any[] = [];
    const fulfilled: any[] = [];

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

  const handleOfferImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setTownHubImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

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
      productImage: townHubImage || undefined,
      createdAt: Date.now(),
      status: 'pending',
      chatHistory: []
    };
    await dbService.saveItem(offer.id, 'offer', offer);
    setRescuingReqId(null);
    setTownHubPrice('');
    setTownHubMessage('');
    setTownHubImage(null);
    alert("Town Hub offer sent to customer!");
  };

  const handleMonitorReply = async (text: string, image?: string) => {
    if (!selectedMonitorOfferId) return;
    const target = offers.find(o => o.id === selectedMonitorOfferId);
    if (target) {
      const msg: DirectMessage = {
        senderId: TOWN_HUB_ID,
        text,
        image,
        timestamp: Date.now()
      };
      const upd = { ...target, chatHistory: [...(target.chatHistory || []), msg] };
      await dbService.saveItem(target.id, 'offer', upd);
    }
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

  const townHubProfile: ShopProfile = {
    id: TOWN_HUB_ID,
    role: 'shop_owner',
    name: 'The Founder',
    phoneNumber: '007',
    pinCode: '000000',
    city: 'Global',
    rating: 5.0,
    totalRatings: 0,
    shopName: 'Town Hub',
    category: 'Global'
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="bg-[#0f172a] rounded-[40px] p-10 text-white shadow-2xl border border-gray-800">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.8)]"></span>
              <h2 className="text-4xl font-black tracking-tighter italic">Town Command</h2>
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Hyperlocal God-Mode</p>
          </div>
          
          <div className="flex flex-wrap bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'interactions', label: 'Flow', icon: '🔄' },
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
               { label: 'Conversion', value: `${stats.conversionRate.toFixed(1)}%`, icon: '⚖️', color: 'text-indigo-400' },
               { label: 'Global Needs', value: stats.totalRequests, icon: '📡', color: 'text-amber-400' },
               { label: 'Verified Shops', value: stats.totalShops, icon: '🏗️', color: 'text-purple-400' },
             ].map((item, idx) => (
               <div key={idx} className="bg-white/5 p-8 rounded-[32px] border border-white/5 backdrop-blur-sm">
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">{item.label}</p>
                 <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
               </div>
             ))}
          </div>
        )}
      </div>

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
                         <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">{tx.stage === 'BROADCAST' ? '📡' : tx.stage === 'OFFER_SENT' ? '🏷️' : '🚚'}</div>
                         <div>
                            <p className="text-xs font-black text-gray-900 uppercase">{tx.req.customerName} asked for {tx.req.category}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{new Date(tx.time).toLocaleTimeString()}</p>
                         </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${tx.stage === 'BROADCAST' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{tx.stage.replace(/_/g, ' ')}</span>
                   </button>
                   {selectedTxId === tx.req.id && (
                     <div className="px-10 pb-8 pt-4 border-t border-gray-50 bg-gray-50/30 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Customer Need</p>
                              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                                 <p className="text-sm font-medium italic">"{tx.req.description}"</p>
                                 {tx.req.image && <img src={tx.req.image} className="mt-4 rounded-xl w-full h-32 object-cover" alt="Req" />}
                              </div>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Offers Tracking</p>
                              <div className="space-y-2">
                                 {tx.reqOffers.map((o: any) => (
                                   <div key={o.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-50">
                                      <p className="text-[11px] font-bold text-gray-700">{o.shopName} {o.shopId === TOWN_HUB_ID && '★'}</p>
                                      <p className="text-[11px] font-black text-indigo-600">₹{o.price}</p>
                                   </div>
                                 ))}
                                 {tx.reqOffers.length === 0 && <p className="text-[10px] text-gray-300 italic">No quotes yet.</p>}
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
          <div className="lg:col-span-1 bg-white rounded-[40px] p-8 border border-gray-100 overflow-y-auto no-scrollbar">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Conversation Directory</h3>
             <div className="space-y-3">
               {offers.filter(o => (o.chatHistory?.length || 0) > 0).length === 0 ? (
                 <p className="text-center text-gray-300 py-20 text-[10px] font-black uppercase tracking-widest">No active chats</p>
               ) : (
                 offers.filter(o => (o.chatHistory?.length || 0) > 0).map(conv => (
                   <button 
                     key={conv.id} 
                     onClick={() => setSelectedMonitorOfferId(conv.id)}
                     className={`w-full p-6 rounded-[32px] border text-left transition ${selectedMonitorOfferId === conv.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-50 hover:bg-gray-50'}`}
                   >
                     <div className="flex justify-between items-start mb-2">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${conv.shopId === TOWN_HUB_ID ? 'text-red-600' : 'text-indigo-600'}`}>
                           {conv.shopName} {conv.shopId === TOWN_HUB_ID && '(Rescue)'}
                        </p>
                        <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{conv.chatHistory?.length}</span>
                     </div>
                     <p className="text-xs font-bold text-gray-800 truncate">vs Resident</p>
                   </button>
                 ))
               )}
             </div>
          </div>
          <div className="lg:col-span-2 bg-[#fcfcfc] rounded-[40px] border border-gray-100 overflow-hidden flex flex-col items-center justify-center p-4">
             {selectedMonitorOfferId ? (
                (() => {
                  const target = offers.find(o => o.id === selectedMonitorOfferId);
                  const isTownHub = target?.shopId === TOWN_HUB_ID;
                  return isTownHub ? (
                    <DirectChat 
                      currentUser={townHubProfile}
                      otherPartyName="Local Resident"
                      history={target?.chatHistory || []}
                      onSendMessage={handleMonitorReply}
                      onClose={() => setSelectedMonitorOfferId(null)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col">
                       <div className="p-8 border-b bg-white flex justify-between items-center">
                          <h4 className="text-xl font-black italic">Observation Mode</h4>
                          <button onClick={() => setSelectedMonitorOfferId(null)}>✕</button>
                       </div>
                       <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar">
                          {target?.chatHistory?.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.senderId === target.shopId ? 'items-start' : 'items-end'}`}>
                              <div className={`p-4 rounded-[20px] max-w-[80%] text-sm font-medium shadow-sm border ${msg.senderId === target.shopId ? 'bg-white border-gray-100' : 'bg-indigo-600 text-white border-indigo-500'}`}>
                                {msg.image && <img src={msg.image} className="mb-2 rounded-xl max-h-40 object-contain" alt="Chat" />}
                                {msg.text}
                              </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  );
                })()
             ) : (
               <div className="opacity-20 text-center"><span className="text-6xl mb-4 block">🕵️‍♂️</span><h3 className="text-2xl font-black italic">Select a Chat</h3><p className="text-sm font-bold">Monitor shop behavior or reply to rescue chats.</p></div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'townhub' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
           <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-black italic tracking-tighter mb-8">Rescue Leads Center</h3>
              <div className="space-y-4">
                {deadLeads.map(lead => (
                  <div key={lead.id} className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                     <div className="flex justify-between items-start mb-4">
                        <span className="bg-white border text-[8px] font-black px-3 py-1 rounded-full uppercase text-gray-400">{lead.category}</span>
                        <p className="text-[9px] font-bold text-gray-400 italic">Posted {Math.floor((Date.now() - lead.createdAt) / 60000)}m ago</p>
                     </div>
                     <p className="text-sm font-bold text-gray-800 italic mb-6">"{lead.description}"</p>
                     
                     {rescuingReqId === lead.id ? (
                       <div className="p-6 bg-white rounded-3xl border border-red-100 animate-fade-in space-y-4 shadow-xl">
                          <input type="number" className="w-full p-4 bg-gray-50 rounded-xl outline-none font-black text-xl border focus:border-red-600" placeholder="Price (₹)" value={townHubPrice} onChange={e => setTownHubPrice(e.target.value)} />
                          <textarea className="w-full p-4 bg-gray-50 rounded-xl outline-none text-sm font-medium h-24 border focus:border-red-600" placeholder="Message to customer..." value={townHubMessage} onChange={e => setTownHubMessage(e.target.value)} />
                          
                          <div className="space-y-2">
                             <p className="text-[9px] font-black text-gray-400 uppercase">Attach Physical Item Photo</p>
                             {townHubImage && <img src={townHubImage} className="w-full h-32 object-cover rounded-xl border mb-2" />}
                             <button onClick={() => offerImageRef.current?.click()} className="w-full py-3 bg-gray-50 border-2 border-dashed rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400">
                                {townHubImage ? 'Change Photo' : '+ Take / Upload Photo'}
                             </button>
                             <input type="file" hidden ref={offerImageRef} accept="image/*" onChange={handleOfferImage} />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button onClick={() => sendTownHubOffer(lead)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Submit Rescue</button>
                            <button onClick={() => setRescuingReqId(null)} className="px-4 py-3 text-gray-400 text-[10px] font-black uppercase">Cancel</button>
                          </div>
                       </div>
                     ) : (
                       <button onClick={() => setRescuingReqId(lead.id)} className="w-full bg-red-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Initiate Rescue</button>
                     )}
                  </div>
                ))}
                {deadLeads.length === 0 && <div className="py-20 text-center opacity-30"><p className="text-[10px] font-black uppercase tracking-widest">No leads need rescue</p></div>}
              </div>
           </div>

           <div className="bg-[#1e293b] rounded-[40px] p-8 text-white">
              <h3 className="text-2xl font-black italic tracking-tighter text-indigo-400 mb-8">Hub Dispatch Queue</h3>
              <div className="space-y-4">
                 {townHubPendingFinalization.map(order => (
                   <div key={order.id} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <p className="text-xs font-black">Dispatch #{order.id.slice(0,6)}</p>
                      <button onClick={() => setFinalizingPickupOrderId(order.id)} className="w-full bg-indigo-600 py-4 rounded-2xl text-[10px] font-black uppercase">Finalize Pickup Location</button>
                      {finalizingPickupOrderId === order.id && (
                        <div className="p-6 bg-white text-gray-900 rounded-3xl space-y-4 animate-fade-in shadow-2xl">
                           <input className="w-full p-4 bg-gray-50 rounded-xl font-bold text-xs" placeholder="Physical Shop Address" value={customPickupAddress} onChange={e => setCustomPickupAddress(e.target.value)} />
                           <input className="w-full p-4 bg-gray-50 rounded-xl font-bold text-xs" placeholder="Shop Contact Number" value={customPickupPhone} onChange={e => setCustomPickupPhone(e.target.value)} />
                           <button onClick={() => finalizePickup(order.id)} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Confirm Dispatch</button>
                        </div>
                      )}
                   </div>
                 ))}
                 {townHubPendingFinalization.length === 0 && <div className="py-20 text-center opacity-30"><p className="text-[10px] font-black uppercase tracking-widest">No dispatches pending</p></div>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
