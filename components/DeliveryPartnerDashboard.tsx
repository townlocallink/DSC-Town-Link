
import React from 'react';
import { UserProfile, Order } from '../types';

interface DeliveryPartnerDashboardProps {
  user: UserProfile;
  orders: Order[];
  onAcceptJob: (orderId: string) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
}

const DeliveryPartnerDashboard: React.FC<DeliveryPartnerDashboardProps> = ({ 
  user, orders, onAcceptJob, onUpdateStatus 
}) => {
  const myCityOrders = orders.filter(o => o.city === user.city);
  const availableJobs = myCityOrders.filter(o => o.status === 'pending_assignment');
  const myActiveJobs = myCityOrders.filter(o => o.deliveryPartnerId === user.id && o.status !== 'delivered');
  const myHistory = myCityOrders.filter(o => o.deliveryPartnerId === user.id && o.status === 'delivered');

  return (
    <div className="space-y-10 pb-20">
      <header className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Namaste, {user.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-indigo-600 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{user.vehicleType}</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">★ {user.rating} (Ready for Jobs)</span>
          </div>
        </div>
      </header>

      {/* Available Jobs */}
      <section>
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2 flex justify-between items-center">
          <span>🎯 Available Town Jobs ({availableJobs.length})</span>
          <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[8px] animate-pulse font-black uppercase">Live Scanning: {user.city}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {availableJobs.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-gray-200 rounded-[32px]">
              <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Waiting for new orders in {user.city}...</p>
            </div>
          ) : (
            availableJobs.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col h-full hover:border-indigo-600 transition">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{job.category || 'Local Item'}</span>
                  <p className="text-lg font-black text-indigo-600">Collect: ₹{job.amountToCollect}</p>
                </div>
                
                <div className="space-y-3 mb-6">
                   <div className="flex gap-2">
                     <span className="text-lg">🏪</span>
                     <div>
                       <p className="text-[8px] font-black text-gray-400 uppercase">Shop</p>
                       <p className="text-xs font-bold text-gray-800">{job.shopName}</p>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <span className="text-lg">📍</span>
                     <div>
                       <p className="text-[8px] font-black text-gray-400 uppercase">Customer Address</p>
                       <p className="text-xs font-bold text-gray-800">{job.deliveryAddress}</p>
                     </div>
                   </div>
                </div>

                <button onClick={() => onAcceptJob(job.id)} className="mt-auto bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 tracking-widest hover:scale-[1.02] transition">Accept Delivery Job</button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Active Jobs */}
      {myActiveJobs.length > 0 && (
        <section>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">⚡ Active Deliveries</h3>
          <div className="space-y-4">
            {myActiveJobs.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-[32px] border-2 border-indigo-600 shadow-lg flex flex-col gap-6">
                <div className="flex justify-between items-center border-b pb-4">
                   <div>
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Order Progress</p>
                      <h4 className="font-black text-xl italic capitalize">{job.status.replace(/_/g, ' ')}</h4>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black text-gray-400 uppercase">To Collect</p>
                      <p className="text-2xl font-black text-indigo-600">₹{job.amountToCollect}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Step 1: Pickup from Shop</p>
                      <p className="text-xs font-black text-gray-800 mb-1">{job.shopName}</p>
                      <p className="text-[10px] font-bold text-gray-500 mb-2">{job.shopAddress || "Address loading..."}</p>
                      <a href={`tel:${job.shopPhone}`} className="text-xs font-black text-indigo-600 underline">Call Shop: {job.shopPhone}</a>
                   </div>
                   <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-indigo-600">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Step 2: Drop to Customer</p>
                      <p className="text-xs font-black text-gray-800 mb-1">{job.customerName}</p>
                      <p className="text-[10px] font-bold text-gray-500 mb-2">{job.deliveryAddress}</p>
                      <a href={`tel:${job.customerPhone}`} className="text-xs font-black text-indigo-600 underline">Call Customer: {job.customerPhone}</a>
                   </div>
                </div>

                <div className="flex gap-3">
                  {job.status === 'assigned' && (
                    <button onClick={() => onUpdateStatus(job.id, 'collected')} className="flex-1 bg-gray-900 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">I have collected the items</button>
                  )}
                  {job.status === 'collected' && (
                    <button onClick={() => onUpdateStatus(job.id, 'delivered')} className="flex-1 bg-green-600 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-100">Order Delivered & Payment Done</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* History */}
      <section>
         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">📜 Completed Today</h3>
         <div className="space-y-3">
            {myHistory.length === 0 ? (
               <p className="text-[10px] font-black text-gray-300 uppercase italic px-2">No completed deliveries yet</p>
            ) : (
               myHistory.map(job => (
                 <div key={job.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center opacity-70">
                    <div>
                       <p className="text-xs font-bold text-gray-800">Delivered to {job.customerName}</p>
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{new Date(job.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm font-black text-green-600">₹{job.amountToCollect}</p>
                 </div>
               ))
            )}
         </div>
      </section>
    </div>
  );
};

export default DeliveryPartnerDashboard;
