
import React, { useState } from 'react';
import { ShopProfile, ProductRequest, Offer, Order, DirectMessage, DailyUpdate } from '../types';
import OfferForm from './OfferForm';
import DirectChat from './DirectChat';

interface ShopOwnerDashboardProps {
  user: ShopProfile;
  requests: ProductRequest[];
  totalGlobalRequests: number;
  offers: Offer[];
  orders: Order[];
  onPostUpdate: (update: DailyUpdate) => void;
  onSubmitOffer: (offer: Offer) => void;
  onUpdateOrder: (orderId: string, status: Order['status']) => void;
  onSendMessage: (offerId: string, msg: DirectMessage, recipientId: string) => void;
  onSubmitRating: (targetId: string, rating: number, orderId: string, type: 'customer') => void;
}

const ShopOwnerDashboard: React.FC<ShopOwnerDashboardProps> = ({ 
  user, requests, offers, orders, onPostUpdate, onSubmitOffer, onUpdateOrder, onSendMessage, onSubmitRating
}) => {
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [activeChatOfferId, setActiveChatOfferId] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [ratingModal, setRatingModal] = useState<{orderId: string, customerId: string} | null>(null);
  const [tempRating, setTempRating] = useState(0);

  const activeChatOffer = offers.find(o => o.id === activeChatOfferId);
  const myOffers = offers.filter(o => o.shopId === user.id);
  const myOrders = orders.filter(o => o.shopId === user.id);
  const rejectedOffers = myOffers.filter(o => o.status === 'rejected');
  const activeOffers = myOffers.filter(o => o.status !== 'rejected');

  const filteredRequests = requests.filter(r => {
    if (r.status !== 'broadcasted') return false;
    const sameCity = (r.city || '').toLowerCase().trim() === (user.city || '').toLowerCase().trim();
    const samePin = (r.pinCode || '').trim() === (user.pinCode || '').trim();
    if (!sameCity && !samePin) return false;
    const shopCat = (user.category || 'Other').toLowerCase().trim();
    const reqCat = (r.category || 'Other').toLowerCase().trim();
    return reqCat === shopCat || reqCat === 'other';
  });

  const handleRatingSubmit = () => {
    if (ratingModal && tempRating > 0) {
      onSubmitRating(ratingModal.customerId, tempRating, ratingModal.orderId, 'customer');
      setRatingModal(null);
      setTempRating(0);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{user.shopName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-indigo-600 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{user.category} Specialist</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">★ {user.rating}</span>
          </div>
        </div>
        <button onClick={() => setShowUpdateModal(true)} className="bg-orange-500 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-orange-100 hover:bg-orange-600 transition">Broadcast Update</button>
      </header>

      <section>
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2 flex justify-between items-center">
          <span>📡 Local Town Leads ({filteredRequests.length})</span>
          <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[8px] animate-pulse font-black uppercase tracking-widest">Live Scanning: {user.city}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRequests.length === 0 ? <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-gray-200 rounded-[32px]"><p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Searching for leads in {user.city}...</p></div> : 
            filteredRequests.map(req => {
              const myOffer = activeOffers.find(o => o.requestId === req.id);
              return (
                <div key={req.id} className="p-6 rounded-[32px] shadow-sm border bg-white border-gray-100 flex flex-col h-full hover:border-indigo-600 transition group">
                  <div className="flex justify-between items-start mb-4"><span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{req.category}</span><span className="text-[8px] font-black text-gray-300 uppercase">{new Date(req.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                  <p className="text-gray-900 text-sm font-semibold leading-relaxed mb-auto bg-gray-50/50 p-4 rounded-2xl italic">"{req.description}"</p>
                  <div className="mt-6">
                    {myOffer ? (
                       <div className="flex gap-2">
                          <button onClick={() => setActiveChatOfferId(myOffer.id)} className="flex-1 bg-white border-2 border-indigo-100 text-indigo-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest relative">Chat{(myOffer.chatHistory?.length || 0) > 0 && <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-bounce">{myOffer.chatHistory?.length}</span>}</button>
                          <div className={`flex-[1.5] text-[10px] font-black py-3 rounded-2xl text-center flex items-center justify-center uppercase tracking-widest ${myOffer.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>{myOffer.status === 'accepted' ? 'Order Won' : `Quote: ₹${myOffer.price}`}</div>
                       </div>
                    ) : <button onClick={() => setSelectedRequest(req)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 tracking-widest">Send My Quote</button>}
                  </div>
                </div>
              );
            })
          }
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">📦 Order Pipeline</h3>
        <div className="space-y-4">
          {myOrders.length === 0 ? <div className="p-10 text-center text-gray-300 bg-white rounded-[32px] border border-gray-100 font-black uppercase text-[10px] tracking-widest italic">No sales today yet</div> : 
            myOrders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-[32px] border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm gap-4">
                <div className="flex-1">
                  <p className="font-black text-gray-900">Order #{order.id.slice(0, 4).toUpperCase()}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Status: {order.status.replace(/_/g, ' ')}</p>
                  {order.deliveryPartnerName && <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter mt-1">Driver: {order.deliveryPartnerName}</p>}
                </div>
                {order.status === 'delivered' && !order.customerRated && (
                   <button onClick={() => setRatingModal({orderId: order.id, customerId: order.customerId})} className="bg-yellow-400 text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">Rate Customer</button>
                )}
                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>{order.status.replace(/_/g, ' ')}</span>
              </div>
            ))
          }
        </div>
      </section>

      {rejectedOffers.length > 0 && (
        <section className="pt-6 border-t border-gray-100">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">❌ Offers Not Accepted</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-60 grayscale">
            {rejectedOffers.map(off => (
              <div key={off.id} className="p-6 rounded-[32px] border bg-gray-50 border-gray-200 flex flex-col">
                <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-black text-gray-500 uppercase">Lost Potential Sale</p><span className="text-[8px] font-black text-gray-400 uppercase">Archive</span></div>
                <div className="bg-white/50 p-4 rounded-2xl italic text-[11px] text-gray-400 font-medium">"{off.message || "My quote for the local need..."}"</div>
                <div className="mt-4 flex justify-between items-center"><span className="text-[10px] font-black text-gray-400">YOUR QUOTE: ₹{off.price}</span><span className="bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Closed</span></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 z-[150] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm w-full"><h3 className="text-2xl font-black mb-2 italic tracking-tighter">Town Update</h3><textarea className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-3xl mb-4 h-32 outline-none text-sm font-medium" placeholder="Ex: Special 10% off on all sweets today!" value={updateText} onChange={e => setUpdateText(e.target.value)} /><div className="flex gap-2"><button onClick={() => { onPostUpdate({ id: 'upd_'+Math.random().toString(36).substr(2,9), shopId: user.id, shopName: user.shopName, text: updateText, createdAt: Date.now(), expiresAt: Date.now()+86400000 }); setShowUpdateModal(false); setUpdateText(''); }} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Post Now</button><button onClick={() => setShowUpdateModal(false)} className="px-4 py-4 text-gray-400 text-[10px] font-black uppercase">Cancel</button></div></div>
        </div>
      )}

      {ratingModal && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm w-full text-center"><h3 className="text-xl font-black mb-2 italic tracking-tight">Rate Customer</h3><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Feedback on transaction</p><div className="flex justify-center gap-2 mb-8">{[1, 2, 3, 4, 5].map(star => (<button key={star} onClick={() => setTempRating(star)} className={`text-4xl transition-transform active:scale-90 ${star <= tempRating ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>))}</div><div className="flex flex-col gap-2"><button onClick={handleRatingSubmit} disabled={tempRating === 0} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-50">Submit Rating</button><button onClick={() => setRatingModal(null)} className="py-2 text-[10px] font-black uppercase text-gray-400">Cancel</button></div></div>
        </div>
      )}

      {activeChatOffer && (
        <div className="fixed inset-0 z-[120] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4"><DirectChat currentUser={user} otherPartyName="Local Customer" history={activeChatOffer.chatHistory || []} onSendMessage={(text) => onSendMessage(activeChatOffer.id, { senderId: user.id, text, timestamp: Date.now() }, activeChatOffer.customerId)} onClose={() => setActiveChatOfferId(null)} /></div>
      )}
      
      {selectedRequest && (
        <div className="fixed inset-0 z-[120] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-white w-full max-w-md p-8 rounded-[40px] shadow-2xl"><OfferForm request={selectedRequest} shop={user} onClose={() => setSelectedRequest(null)} onSubmit={onSubmitOffer} /></div></div>
      )}
    </div>
  );
};

export default ShopOwnerDashboard;
