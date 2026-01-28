
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, ShopProfile, ProductRequest, Offer, Order, DailyUpdate, DirectMessage } from './types';
import Auth from './components/Auth';
import CustomerDashboard from './components/CustomerDashboard';
import ShopOwnerDashboard from './components/ShopOwnerDashboard';
import AdminDashboard from './components/AdminDashboard';
import DeliveryPartnerDashboard from './components/DeliveryPartnerDashboard';
import Confetti from './components/Confetti';
import { dbService } from './databaseService';

const SESSION_KEY = 'locallink_v14_active_user';
const NOTIFICATION_SOUND_BASE64 = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18AZmZmZmZtZGVmZ2hoaWprbG1ub3BxcXNzc3R1dXV2dnZ3d3h4eHl5eXp6ent7fHx9fX5+fn9/gICAgYGBgoKCg4ODhISEhYWFhoaGh4eHiIiIiYmJioqKi4uLi8vLzMzMzc3Nzs7Oz8/P0NDQ0dHR0tLS09PT1NTU1dXV1tbW19fX2NjY2dnZ2tra29vb3Nzc3d3d3t7e39/f4ODg4eHh4uLi4+Pj5OTk5eXl5ubm5+fn6Ojo6enp6urq6+vr7Ozs7e3t7u7u7+/v8PDw8fHx8vLy8/Pz9PT09fX19vb29/f3+Pj4+fn5+vr6+vv7+/z8/P39/f4BAQEBAA==';

interface Notification {
  id: string;
  text: string;
  type: 'order' | 'offer' | 'chat' | 'system' | 'lead';
  timestamp: number;
  isRead: boolean;
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | ShopProfile | null>(null);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [allUsers, setAllUsers] = useState<(UserProfile | ShopProfile)[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const initializedRef = useRef(false);

  const getNotifStorageKey = (userId: string) => `locallink_notifs_${userId}`;

  const playNotificationSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND_BASE64);
    }
    audioRef.current.play().catch(() => {});
  }, []);

  const addNotification = useCallback((text: string, type: Notification['type'], silent: boolean = false) => {
    const n: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      type,
      timestamp: Date.now(),
      isRead: false
    };
    
    setNotifications(prev => {
      const updated = [n, ...prev].slice(0, 50);
      if (user?.id) {
        localStorage.setItem(getNotifStorageKey(user.id), JSON.stringify(updated));
      }
      return updated;
    });
    
    if (!silent) playNotificationSound();
  }, [playNotificationSound, user?.id]);

  useEffect(() => {
    let unsubscribeMarket = () => {};
    let unsubscribeUser = () => {};
    let unsubscribeAllUsers = () => {};

    const initApp = async () => {
      const savedSession = localStorage.getItem(SESSION_KEY);
      let currentUser: UserProfile | ShopProfile | null = null;
      
      if (savedSession) {
        try {
          currentUser = JSON.parse(savedSession);
          setUser(currentUser);
          
          const savedNotifs = localStorage.getItem(getNotifStorageKey(currentUser!.id));
          if (savedNotifs) {
            setNotifications(JSON.parse(savedNotifs));
          }

          unsubscribeUser = dbService.listenToUserProfile(currentUser!.id, (updatedUser) => {
            if (updatedUser) {
              setUser(updatedUser);
              localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
            }
          });

          if (currentUser.role === 'admin') {
            unsubscribeAllUsers = dbService.listenToAllUsers((users) => {
              setAllUsers(users);
            });
          }
        } catch (e) {
          console.error("Session restore failed", e);
        }
      }

      unsubscribeMarket = dbService.listenToMarketData((data) => {
        const isReady = initializedRef.current;

        setRequests(prev => {
          const sorted = (data.requests || []).sort((a: any, b: any) => b.createdAt - a.createdAt);
          if (isReady && currentUser?.role === 'shop_owner') {
            const myShop = currentUser as ShopProfile;
            const newLeads = sorted.filter((r: any) => 
              !prev.find(p => p.id === r.id) && 
              r.createdAt > sessionStartTimeRef.current &&
              r.status === 'broadcasted'
            );
            newLeads.forEach((r: any, idx) => {
              if (r.city === myShop.city && (r.category === myShop.category || r.category === 'Other')) {
                setTimeout(() => addNotification(`Town Broadcast: New lead for ${r.category}!`, 'lead'), idx * 100);
              }
            });
          }
          return sorted;
        });

        setOffers(prev => {
          const sorted = (data.offers || []).sort((a: any, b: any) => b.createdAt - a.createdAt);
          if (isReady) {
            const newQuotes = sorted.filter((o: any) => 
              !prev.find(p => p.id === o.id) && 
              o.customerId === currentUser?.id &&
              o.createdAt > sessionStartTimeRef.current
            );
            newQuotes.forEach((o, idx) => setTimeout(() => addNotification(`New quote from ${o.shopName}!`, 'offer'), idx * 100));
            
            if (currentUser?.role === 'shop_owner') {
              sorted.forEach((o: any) => {
                const prevO = prev.find(p => p.id === o.id);
                if (prevO && prevO.status !== 'rejected' && o.status === 'rejected' && o.shopId === currentUser.id) {
                   addNotification(`Update: Customer chose another shop for their request.`, 'system');
                }
              });
            }
          }
          return sorted;
        });

        setOrders(prev => {
          const sorted = (data.orders || []).sort((a: any, b: any) => b.createdAt - a.createdAt);
          if (isReady) {
            const newOrders = sorted.filter((o: any) => !prev.find(p => p.id === o.id) && o.createdAt > sessionStartTimeRef.current);
            newOrders.forEach((o, idx) => {
              setTimeout(() => {
                const isRelevant = o.customerId === currentUser?.id || o.shopId === currentUser?.id || (currentUser?.role === 'delivery_partner' && o.city === currentUser.city);
                if (isRelevant) {
                  if (o.customerId === currentUser?.id) addNotification(`Order confirmed! Assignment in progress...`, 'order');
                  else if (o.shopId === currentUser?.id) addNotification(`Business Update: New order received!`, 'order');
                  else if (currentUser?.role === 'delivery_partner') addNotification(`New Job: Delivery job available nearby!`, 'order');
                }
              }, idx * 100);
            });
          }
          return sorted;
        });

        setUpdates((data.updates || []).sort((a: any, b: any) => b.createdAt - a.createdAt));
        
        if (!initializedRef.current) {
          initializedRef.current = true;
          setIsInitializing(false);
        }
      });

      setIsCloudActive(dbService.isCloudActive());
    };

    initApp();
    return () => {
      unsubscribeMarket();
      unsubscribeUser();
      unsubscribeAllUsers();
    };
  }, [addNotification]);

  const handleLogin = (u: UserProfile | ShopProfile) => {
    sessionStartTimeRef.current = Date.now();
    setUser(u);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    dbService.saveUsers([u]);
    const savedNotifs = localStorage.getItem(getNotifStorageKey(u.id));
    setNotifications(savedNotifs ? JSON.parse(savedNotifs) : []);
    addNotification(`Market Link active for ${u.name}.`, 'system', true);
    
    if (u.role === 'admin') {
      dbService.listenToAllUsers((users) => setAllUsers(users));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setNotifications([]);
    setAllUsers([]);
    localStorage.removeItem(SESSION_KEY);
    initializedRef.current = false;
  };

  const handleAcceptOffer = async (order: Order) => {
    const allUsersList = await dbService.loadUsers();
    const shop = allUsersList.find(u => u.id === order.shopId);
    const customer = allUsersList.find(u => u.id === order.customerId);
    const req = requests.find(r => r.id === order.requestId);

    const enrichedOrder: Order = {
      ...order,
      shopPhone: shop?.phoneNumber,
      shopAddress: shop?.address,
      customerPhone: customer?.phoneNumber,
      customerName: customer?.name,
      category: req?.category,
      itemDescription: req?.description,
      status: 'pending_assignment'
    };

    setOrders(prev => [enrichedOrder, ...prev]);
    await dbService.saveItem(enrichedOrder.id, 'order', enrichedOrder);

    const competingOffers = offers.filter(o => o.requestId === order.requestId && o.id !== order.offerId);
    for (const compOffer of competingOffers) {
      const rejectedOffer = { ...compOffer, status: 'rejected' as const };
      await dbService.saveItem(compOffer.id, 'offer', rejectedOffer);
    }

    const acceptedOffer = offers.find(o => o.id === order.offerId);
    if (acceptedOffer) await dbService.saveItem(acceptedOffer.id, 'offer', { ...acceptedOffer, status: 'accepted' as const });

    const targetRequest = requests.find(r => r.id === order.requestId);
    if (targetRequest) await dbService.saveItem(targetRequest.id, 'request', { ...targetRequest, status: 'fulfilled' as const });
    
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };

  const handleDeliveryAccept = async (orderId: string) => {
    if (!user || user.role !== 'delivery_partner') return;
    const allData = await dbService.loadMarketData();
    const currentOrder = allData.orders.find((o: Order) => o.id === orderId);
    
    if (!currentOrder || currentOrder.status !== 'pending_assignment') {
      alert("Oops! This delivery job was already taken by someone else.");
      return;
    }

    const updatedOrder: Order = {
      ...currentOrder,
      deliveryPartnerId: user.id,
      deliveryPartnerName: user.name,
      deliveryPartnerPhone: user.phoneNumber,
      deliveryPartnerVehicle: user.vehicleType,
      status: 'assigned'
    };

    await dbService.saveItem(orderId, 'order', updatedOrder);
  };

  const handleDeliveryStatus = async (orderId: string, status: Order['status']) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      const updatedOrder = { ...targetOrder, status };
      await dbService.saveItem(orderId, 'order', updatedOrder);
    }
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    if (user?.id) localStorage.setItem(getNotifStorageKey(user.id), JSON.stringify(updated));
    setIsNotificationOpen(false);
  };

  const clearNotifications = () => {
    setNotifications([]);
    if (user?.id) localStorage.removeItem(getNotifStorageKey(user.id));
    setIsNotificationOpen(false);
  };

  if (isInitializing && user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-600 font-black uppercase tracking-widest text-xs italic">Connecting town network...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      {showConfetti && <Confetti />}
      <div className="max-w-7xl mx-auto">
        {!user ? (
          <Auth onLogin={handleLogin} />
        ) : (
          <>
            <nav className="flex justify-between items-center mb-10 relative">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛍️</span>
                <div className="flex flex-col">
                  <h1 className="text-3xl font-black italic tracking-tighter text-indigo-600 leading-none">LocalLink</h1>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mt-1">Town Dispatch Hub</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isNotificationOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-100 shadow-sm hover:border-indigo-600'}`}>
                    <span className="text-xl">🔔</span>
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-lg animate-pulse">{unreadCount}</span>}
                  </button>
                  {isNotificationOpen && (
                    <div className="absolute right-0 top-12 w-80 bg-white rounded-[32px] shadow-2xl border border-gray-100 z-[3000] overflow-hidden animate-bounce-in origin-top-right">
                      <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-800">Alert Center</h4>
                        <div className="flex gap-2">
                           <button onClick={markAllRead} className="text-[9px] font-black uppercase text-indigo-600">Read All</button>
                           <button onClick={clearNotifications} className="text-[9px] font-black uppercase text-red-500">Clear</button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto no-scrollbar">
                        {notifications.length === 0 ? <div className="p-10 text-center text-gray-300"><p className="text-[10px] font-black uppercase tracking-widest italic">All clear</p></div> : 
                        notifications.map(n => (
                          <div key={n.id} className={`p-4 border-b border-gray-50 flex gap-4 items-start ${n.isRead ? 'bg-white' : 'bg-indigo-50/30'}`}>
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-sm shrink-0">{n.type === 'offer' ? '🏷️' : n.type === 'order' ? '📦' : n.type === 'chat' ? '💬' : n.type === 'lead' ? '📡' : '🔔'}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-gray-800 leading-tight">{n.text}</p>
                              <p className="text-[8px] font-black text-gray-400 uppercase mt-1">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            {!n.isRead && <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 shrink-0"></div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={handleLogout} className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">Logout</button>
              </div>
            </nav>

            {user.role === 'admin' ? (
              <AdminDashboard requests={requests} offers={offers} orders={orders} allUsers={allUsers} onImportData={(data) => dbService.saveUsers(data.users || [])} />
            ) : user.role === 'customer' ? (
              <CustomerDashboard
                user={user as UserProfile}
                requests={requests}
                offers={offers} 
                orders={orders}
                updates={updates}
                onNewRequest={(req) => { dbService.saveItem(req.id, 'request', req); }}
                onAcceptOffer={handleAcceptOffer}
                onUpdateUser={(u) => { dbService.updateUserProfile(u.id, u); }}
                onSendMessage={(oid, msg) => {
                  const target = offers.find(o => o.id === oid);
                  if (target) {
                    const upd = { ...target, chatHistory: [...(target.chatHistory || []), msg] };
                    dbService.saveItem(oid, 'offer', upd);
                  }
                }}
                onMarkReceived={() => {}}
                onSubmitRating={(tid, r, oid) => {
                   dbService.updateUserProfile(tid, { rating: r });
                   const ord = orders.find(o => o.id === oid);
                   if (ord) dbService.saveItem(oid, 'order', { ...ord, shopRated: true });
                }}
              />
            ) : user.role === 'shop_owner' ? (
              <ShopOwnerDashboard
                user={user as ShopProfile}
                requests={requests}
                totalGlobalRequests={requests.length}
                offers={offers}
                orders={orders}
                onPostUpdate={(upd) => { dbService.saveItem(upd.id, 'update', upd); }}
                onSubmitOffer={(off) => { dbService.saveItem(off.id, 'offer', off); }}
                onUpdateOrder={() => {}}
                onSendMessage={(oid, msg) => {
                  const target = offers.find(o => o.id === oid);
                  if (target) {
                    const upd = { ...target, chatHistory: [...(target.chatHistory || []), msg] };
                    dbService.saveItem(oid, 'offer', upd);
                  }
                }}
                onSubmitRating={(tid, r, oid) => {
                   dbService.updateUserProfile(tid, { rating: r });
                   const ord = orders.find(o => o.id === oid);
                   if (ord) dbService.saveItem(oid, 'order', { ...ord, customerRated: true });
                }}
              />
            ) : (
              <DeliveryPartnerDashboard
                user={user as UserProfile}
                orders={orders}
                onAcceptJob={handleDeliveryAccept}
                onUpdateStatus={handleDeliveryStatus}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
