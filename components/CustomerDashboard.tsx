
import React, { useState } from 'react';
import { UserProfile, ProductRequest, Offer, Order, DirectMessage, DailyUpdate } from '../types';
import ChatAgent from './ChatAgent';
import RequestList from './RequestList';
import OfferList from './OfferList';
import DirectChat from './DirectChat';

interface CustomerDashboardProps {
  user: UserProfile;
  requests: ProductRequest[];
  offers: Offer[];
  orders: Order[];
  updates: DailyUpdate[];
  onNewRequest: (req: ProductRequest) => void;
  onAcceptOffer: (order: Order) => void;
  onUpdateUser: (user: UserProfile) => void;
  onSendMessage: (offerId: string, msg: DirectMessage, recipientId: string) => void;
  onMarkReceived: (orderId: string) => void;
  onSubmitRating: (targetId: string, rating: number, orderId: string, type: 'shop') => void;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ 
  user, requests, offers, orders, updates, onNewRequest, onAcceptOffer, onUpdateUser, onSendMessage, onMarkReceived, onSubmitRating
}) => {
  const [showChat, setShowChat] = useState(false);
  const [activeChatOfferId, setActiveChatOfferId] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<{orderId: string, shopId: string} | null>(null);
  const [tempRating, setTempRating] = useState(0);

  const activeChatOffer = offers.find(o => o.id === activeChatOfferId);
  const myRequests = requests.filter(r => r.customerId === user.id);
  const myOrders = orders.filter(o => o.customerId === user.id);
  const relevantOffers = offers.filter(o => {
    const isForMe = o.customerId === user.id;
    const isForMyRequest = myRequests.some(r => r.id === o.requestId);
    const alreadyOrdered = myOrders.some(ord => ord.offerId === o.id);
    return (isForMe || isForMyRequest) && o.status !== 'rejected' && !alreadyOrdered;
  });

  const handleRatingSubmit = () => {
    if (ratingModal && tempRating > 0) {
      onSubmitRating(ratingModal.shopId, tempRating, ratingModal.orderId, 'shop');
      setRatingModal(null);
      setTempRating(0);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hello, {user.name}!</h2>
            <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border border-indigo-100">{user.city}</span>
          </div>
          <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Verified Buyer ★ {user.rating}</p>
        </div>
        <button onClick={() => setShowChat(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition flex flex-col items-center justify-center">
          <span>+ Ask Sahayak</span>
          <span className="text-[9px] font-bold lowercase tracking-tight opacity-90 block mt-0.5">Order Here</span>
        </button>
      </header>

      {updates.length > 0 && (
        <section>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">🔥 Town Square News</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {updates.map(update => (
              <div key={update.id} className="min-w-[280px] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col shrink-0">
                {update.image && <div className="h-32 w-full overflow-hidden"><img src={update.image} className="w-full h-full object-cover" alt="Update" /></div>}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px]">🏪</div>
                    <span className="text-[10px] font-black uppercase text-indigo-600 truncate">{update.shopName}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 line-clamp-2 italic">"{update.text}"</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showChat && (
        <div className="fixed inset-0 z-[110] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <ChatAgent user={user} onClose={() => setShowChat(false)} onFinalized={(req) => { onNewRequest(req); setShowChat(false); }} />
          </div>
        </div>
      )}

      {activeChatOffer && (
        <div className="fixed inset-0 z-[120] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <DirectChat currentUser={user} otherPartyName={activeChatOffer.shopName} history={activeChatOffer.chatHistory || []} onSendMessage={(text) => onSendMessage(activeChatOffer.id, { senderId: user.id, text, timestamp: Date.now() }, activeChatOffer.shopId)} onClose={() => setActiveChatOfferId(null)} />
        </div>
      )}

      {ratingModal && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm w-full text-center">
             <h3 className="text-xl font-black mb-2 italic tracking-tight">Rate Your Experience</h3>
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">How was the service?</p>
             <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map(star => (
                   <button key={star} onClick={() => setTempRating(star)} className={`text-4xl transition-transform active:scale-90 ${star <= tempRating ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
                ))}
             </div>
             <div className="flex flex-col gap-2">
               <button onClick={handleRatingSubmit} disabled={tempRating === 0} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-50">Submit Rating</button>
               <button onClick={() => setRatingModal(null)} className="py-2 text-[10px] font-black uppercase text-gray-400">Not Now</button>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">📦 My Active Needs</h3><RequestList requests={myRequests} offers={offers} userType="customer" /></section>
        <section><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">🏷️ Quotes Received</h3><OfferList offers={relevantOffers} requests={myRequests} user={user} onAccept={onAcceptOffer} onUpdateUser={onUpdateUser} onOpenChat={(off) => setActiveChatOfferId(off.id)} /></section>
      </div>

      <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">📜 Delivery History</h3>
        <div className="space-y-4">
          {myOrders.length === 0 ? <div className="p-12 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest italic">No orders yet</div> : 
            myOrders.map(order => (
              <div key={order.id} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-black text-gray-900">Order #{order.id.slice(0, 5).toUpperCase()}</p>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {order.deliveryPartnerName && (
                    <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-tighter italic">Partner: {order.deliveryPartnerName} ({order.deliveryPartnerVehicle})</p>
                  )}
                </div>
                {order.status === 'delivered' && !order.shopRated && (
                   <button onClick={() => setRatingModal({orderId: order.id, shopId: order.shopId})} className="bg-yellow-400 text-black px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-100">Rate Shop</button>
                )}
              </div>
            ))
          }
        </div>
      </section>
    </div>
  );
};

export default CustomerDashboard;
