
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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ requests, offers, orders, allUsers, onImportData }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'interactions' | 'conversations' | 'funnel' | 'users'>('overview');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

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

  // Unified Interaction Feed (Chronological events)
  const interactions = useMemo(() => {
    const events: any[] = [
      ...requests.map(r => ({ type: 'request', data: r, time: r.createdAt })),
      ...offers.map(o => ({ type: 'offer', data: o, time: o.createdAt })),
      ...orders.map(ord => ({ type: 'order', data: ord, time: ord.createdAt }))
    ];
    return events.sort((a, b) => b.time - a.time);
  }, [requests, offers, orders]);

  const activeConversations = offers.filter(o => (o.chatHistory?.length || 0) > 0);

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    await dbService.updateUserProfile(userId, { isVerified: !currentStatus });
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header Section */}
      <div className="bg-[#121212] rounded-[40px] p-10 text-white shadow-2xl border border-gray-800">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></span>
              <h2 className="text-4xl font-black tracking-tighter italic">Command Center</h2>
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Hyperlocal God-Mode Interface</p>
          </div>
          
          <div className="flex flex-wrap bg-[#1a1a1a] p-1.5 rounded-2xl border border-gray-800 shadow-inner">
            {(['overview', 'interactions', 'conversations', 'funnel', 'users'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Market GMV', value: `₹${orders.reduce((sum, o) => sum + (o.amountToCollect || 0), 0)}`, icon: '💰', color: 'text-green-400' },
              { label: 'Active Funnel', value: `${stats.conversionRate.toFixed(1)}%`, icon: '⚡', color: 'text-indigo-400' },
              { label: 'Town Leads', value: stats.totalRequests, icon: '📡', color: 'text-amber-400' },
              { label: 'Shop Network', value: stats.totalShops, icon: '🏪', color: 'text-purple-400' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 p-8 rounded-[32px] border border-white/5 backdrop-blur-md hover:bg-white/10 transition">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">{item.label}</p>
                <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INTERACTIONS FEED */}
      {activeTab === 'interactions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-4">Live Activity Audit</h3>
             <div className="space-y-3">
               {interactions.map((event, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-[32px] border border-gray-100 flex items-center gap-6 shadow-sm hover:border-indigo-600 transition">
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50 text-xl">
                     {event.type === 'request' ? '📡' : event.type === 'offer' ? '🏷️' : '📦'}
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{event.type}</p>
                        <p className="text-[9px] font-bold text-gray-400">{new Date(event.time).toLocaleString()}</p>
                     </div>
                     <p className="text-sm font-bold text-gray-800 mt-1">
                       {event.type === 'request' ? `${event.data.customerName} asked for ${event.data.category}` : 
                        event.type === 'offer' ? `${event.data.shopName} quoted ₹${event.data.price}` : 
                        `Order #${event.data.id.slice(0,4)}: ${event.data.status}`}
                     </p>
                     <p className="text-[10px] font-medium text-gray-400 mt-1 italic">
                       {event.type === 'request' ? event.data.description : event.data.message || event.data.itemDescription}
                     </p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
          <div className="bg-white rounded-[40px] p-8 border border-gray-100 h-fit sticky top-6">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Market Health Overview</h4>
             <div className="space-y-6">
                {Object.entries(stats.activeCategories).sort((a,b) => b[1]-a[1]).map(([cat, count]) => (
                  <div key={cat}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black text-gray-900">{cat}</span>
                      <span className="text-[10px] font-black text-indigo-600">{count} Active</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(count / stats.totalRequests) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* CONVERSATION MONITOR */}
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
          <div className="lg:col-span-1 bg-white rounded-[40px] p-8 border border-gray-100 overflow-y-auto no-scrollbar">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Active Shop-Customer Chats</h3>
             <div className="space-y-3">
               {activeConversations.length === 0 ? (
                 <p className="text-center text-gray-300 py-20 text-[10px] font-black uppercase tracking-widest">No chats detected yet</p>
               ) : (
                 activeConversations.map(conv => (
                   <button 
                     key={conv.id} 
                     onClick={() => setSelectedOfferId(conv.id)}
                     className={`w-full p-6 rounded-[32px] border text-left transition ${selectedOfferId === conv.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-50 hover:bg-gray-50'}`}
                   >
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{conv.shopName}</p>
                        <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{conv.chatHistory?.length}</span>
                     </div>
                     <p className="text-xs font-bold text-gray-800 truncate">vs {allUsers.find(u => u.id === conv.customerId)?.name || 'Resident'}</p>
                     <p className="text-[9px] text-gray-400 mt-1 italic">Last: {conv.chatHistory?.[conv.chatHistory.length - 1]?.text}</p>
                   </button>
                 ))
               )}
             </div>
          </div>
          <div className="lg:col-span-2 bg-[#fcfcfc] rounded-[40px] border border-gray-100 overflow-hidden flex flex-col">
             {selectedOfferId ? (
               <>
                 <div className="p-8 border-b border-gray-100 bg-white flex justify-between items-center">
                    <div>
                       <h4 className="text-xl font-black italic">Monitoring Chat</h4>
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Observation Mode Enabled</p>
                    </div>
                    <button onClick={() => setSelectedOfferId(null)} className="text-gray-400">✕</button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar">
                    {offers.find(o => o.id === selectedOfferId)?.chatHistory?.map((msg, i) => {
                      const sender = allUsers.find(u => u.id === msg.senderId);
                      const isShop = sender?.role === 'shop_owner';
                      return (
                        <div key={i} className={`flex flex-col ${isShop ? 'items-start' : 'items-end'}`}>
                          <div className={`p-4 rounded-[20px] max-w-[80%] text-sm font-medium shadow-sm border ${isShop ? 'bg-white border-gray-100 rounded-tl-none' : 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none'}`}>
                            {msg.text}
                          </div>
                          <span className="text-[8px] font-black text-gray-400 uppercase mt-2 mx-1">{sender?.name || 'Unknown'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )
                    })}
                 </div>
               </>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center opacity-20 p-20 text-center">
                 <span className="text-6xl mb-4">🕵️‍♂️</span>
                 <h3 className="text-2xl font-black italic">Sales Friction Analysis</h3>
                 <p className="text-sm font-bold">Select a conversation to see how local businesses are closing deals or losing them.</p>
               </div>
             )}
          </div>
        </div>
      )}

      {/* USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-gray-50 flex justify-between items-center">
             <div>
                <h3 className="text-2xl font-black italic">Town Registry</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Verify and manage marketplace participants</p>
             </div>
             <div className="flex gap-4">
                <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Customers: {allUsers.filter(u => u.role === 'customer').length}</span>
                <span className="bg-purple-50 text-purple-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Shops: {allUsers.filter(u => u.role === 'shop_owner').length}</span>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="px-10 py-6">User / Business</th>
                  <th className="px-10 py-6">City & Locality</th>
                  <th className="px-10 py-6">Performance</th>
                  <th className="px-10 py-6 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50/30 transition group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">{u.role === 'customer' ? '🛒' : u.role === 'shop_owner' ? '🏪' : '🛵'}</div>
                         <div>
                            <p className="font-black text-gray-900">{'shopName' in u ? u.shopName : u.name}</p>
                            <p className="text-[9px] text-gray-400 uppercase font-black">{u.phoneNumber}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className="text-xs font-bold text-gray-800">{u.city}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{u.locality || 'No Locality'}</p>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-1">
                         <span className="text-sm font-black text-indigo-600">★ {u.rating.toFixed(1)}</span>
                         <span className="text-[9px] font-bold text-gray-300">({u.totalRatings})</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <button 
                         onClick={() => toggleVerification(u.id, !!u.isVerified)}
                         className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                           u.isVerified ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
                         }`}
                       >
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

      {/* FUNNEL ANALYSIS */}
      {activeTab === 'funnel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-black italic mb-8">Conversion Funnel</h3>
              <div className="space-y-12">
                 {[
                   { label: 'Broadcasts', count: requests.length, color: 'bg-amber-400' },
                   { label: 'Quotes Provided', count: offers.length, color: 'bg-indigo-400' },
                   { label: 'Orders Won', count: orders.length, color: 'bg-green-400' },
                   { label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length, color: 'bg-emerald-600' }
                 ].map((stage, i, arr) => (
                   <div key={stage.label} className="relative">
                      <div className="flex justify-between items-end mb-3">
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stage.label}</span>
                         <span className="text-2xl font-black text-gray-900">{stage.count}</span>
                      </div>
                      <div className="w-full h-4 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                         <div 
                           className={`${stage.color} h-full transition-all duration-1000`} 
                           style={{ width: `${(stage.count / (arr[0].count || 1)) * 100}%` }}
                         ></div>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-gray-300 text-xl">↓</div>
                      )}
                   </div>
                 ))}
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-[#1a1a1a] rounded-[40px] p-8 text-white border border-gray-800">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Critical Alerts</h4>
                 <div className="space-y-4">
                    {requests.filter(r => !offers.some(o => o.requestId === r.id)).slice(0, 5).map(r => (
                      <div key={r.id} className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex justify-between items-center">
                         <div>
                            <p className="text-xs font-bold text-red-400">Dead Lead Alert</p>
                            <p className="text-[9px] font-medium text-gray-500">"{r.description.slice(0, 40)}..."</p>
                         </div>
                         <span className="text-[8px] font-black uppercase text-red-500 bg-red-500/10 px-2 py-1 rounded">0 Offers</span>
                      </div>
                    ))}
                    {requests.length === 0 && <p className="text-center py-10 text-[10px] font-black uppercase text-gray-600">No friction detected</p>}
                 </div>
              </div>

              <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Market Retention</h4>
                 <div className="flex items-center gap-8">
                    <div className="w-24 h-24 rounded-full border-8 border-indigo-600 flex items-center justify-center">
                       <span className="text-xl font-black">{stats.conversionRate.toFixed(0)}%</span>
                    </div>
                    <div>
                       <p className="text-sm font-bold text-gray-800">Average Conversion</p>
                       <p className="text-[10px] font-medium text-gray-400">Town broadcast to successful sale ratio.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <footer className="mt-12 flex items-center justify-between border-t border-gray-100 pt-8 px-4">
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Live Cloud Connection</span>
            </div>
            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
               Town Nodes Active: <span className="text-indigo-600">{allUsers.length}</span>
            </div>
         </div>
         <div className="text-[9px] font-black uppercase text-gray-300 tracking-tighter italic">
            Command Center Build v10.0.0 Alpha
         </div>
      </footer>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
