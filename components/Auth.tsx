
import React, { useState } from 'react';
import { UserRole, UserProfile, ShopProfile } from '../types';
import { dbService } from '../databaseService';

interface AuthProps {
  onLogin: (user: UserProfile | ShopProfile) => void;
}

const ADMIN_SECRET = 'FOUNDER99';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('');
  const [otherCategory, setOtherCategory] = useState('');
  const [vehicleType, setVehicleType] = useState('Two-wheeler');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (isLogin && phone === '007' && password === ADMIN_SECRET) {
      onLogin({ id: 'founder_001', role: 'admin', name: 'The Founder', phoneNumber: '007', pinCode: '000000', city: 'Global', rating: 5.0, totalRatings: 0 } as UserProfile);
      return;
    }

    try {
      const allUsers = await dbService.loadUsers();
      const normalizedPhone = phone.trim().replace(/\D/g, '');

      if (isLogin) {
        const user = allUsers.find((u: any) => u.phoneNumber.replace(/\D/g, '') === normalizedPhone && u.password === password);
        if (user) onLogin(user);
        else setError('Incorrect credentials.');
      } else {
        if (password !== confirmPassword) { setError('Passwords do not match.'); setIsLoading(false); return; }
        if (allUsers.some((u: any) => u.phoneNumber.replace(/\D/g, '') === normalizedPhone)) { setError('Number already exists.'); setIsLoading(false); return; }
        if (!role || !pinCode || !city) { setError('Fill essential fields.'); setIsLoading(false); return; }

        let newUser: UserProfile | ShopProfile;
        const commonData = { name: name.trim(), phoneNumber: normalizedPhone, password, pinCode: pinCode.trim(), city: city.trim(), locality: locality.trim(), rating: role === 'delivery_partner' ? 4.8 : 5.0, totalRatings: 0 };

        if (role === 'customer') newUser = { id: 'cust_' + Math.random().toString(36).substr(2, 9), role: 'customer', ...commonData } as UserProfile;
        else if (role === 'shop_owner') newUser = { id: 'shop_' + Math.random().toString(36).substr(2, 9), role: 'shop_owner', ...commonData, shopName: shopName.trim() || name.trim(), category: category || 'Other' } as ShopProfile;
        else newUser = { id: 'deliv_' + Math.random().toString(36).substr(2, 9), role: 'delivery_partner', ...commonData, vehicleType } as UserProfile;

        await dbService.saveUsers([newUser]);
        onLogin(newUser);
      }
    } catch (err) { setError('Database connection error.'); } finally { setIsLoading(false); }
  };

  if (!role && !isLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-indigo-600">
        <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-md w-full text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2 italic tracking-tighter">LocalLink</h1>
          <p className="text-gray-500 font-medium mb-10">Choose your account type</p>
          <div className="space-y-4">
            <button onClick={() => setRole('customer')} className="w-full flex items-center justify-between p-6 border-2 border-indigo-100 rounded-3xl hover:border-indigo-600 hover:bg-indigo-50 transition group">
              <div className="text-left"><span className="text-xs font-black text-indigo-600 uppercase tracking-widest">I want to buy</span><p className="text-lg font-bold text-gray-900">Customer</p></div>
              <span className="text-4xl group-hover:scale-110 transition">🛍️</span>
            </button>
            <button onClick={() => setRole('shop_owner')} className="w-full flex items-center justify-between p-6 border-2 border-purple-100 rounded-3xl hover:border-purple-600 hover:bg-purple-50 transition group">
              <div className="text-left"><span className="text-xs font-black text-purple-600 uppercase tracking-widest">I want to sell</span><p className="text-lg font-bold text-gray-900">Shop Owner</p></div>
              <span className="text-4xl group-hover:scale-110 transition">🏪</span>
            </button>
            
            <div className="pt-4 border-t border-gray-100">
              <button onClick={() => setRole('delivery_partner')} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl hover:bg-gray-100 transition group">
                <span className="text-xl">🛵</span>
                <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-indigo-600 transition tracking-widest">Delivery Partner Signup</span>
              </button>
            </div>
          </div>
          <button onClick={() => setIsLogin(true)} className="mt-8 text-sm font-bold text-indigo-600 hover:underline">Already registered? Log in here</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-[40px] shadow-xl p-10 max-w-md w-full border border-gray-100">
        <div className="flex justify-between items-end mb-8">
          <div><h2 className="text-3xl font-black text-gray-900 tracking-tight">{isLogin ? 'Login' : 'Sign Up'}</h2><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{isLogin ? 'Welcome back' : `${role?.replace('_',' ')} registration`}</p></div>
          <button onClick={() => { setIsLogin(!isLogin); setRole(null); setError(''); }} className="text-xs font-black text-indigo-600 hover:underline">{isLogin ? 'Create Account' : 'Back to selection'}</button>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-6">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <input required className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name *" />}
          <input required type="text" className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number *" />
          <div className="grid grid-cols-2 gap-3">
            <input required type="password" className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password *" />
            {!isLogin && <input required type="password" className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm *" />}
          </div>
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input required className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none" value={pinCode} onChange={e => setPinCode(e.target.value)} placeholder="Pin Code *" maxLength={6} />
                <input required className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none" value={city} onChange={e => setCity(e.target.value)} placeholder="City *" />
              </div>
              <input className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none" value={locality} onChange={e => setLocality(e.target.value)} placeholder="Locality *" required />
            </>
          )}
          {!isLogin && role === 'shop_owner' && (
            <>
              <input required className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Business Name *" />
              <select required className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-400" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select Category *</option><option value="Sports">Sports</option><option value="Grocery">Grocery</option><option value="Electronics">Electronics</option><option value="Pharmacy">Pharmacy</option><option value="Fashion & Apparel">Fashion & Apparel</option><option value="Food & Bakery">Food & Bakery</option><option value="Books & Stationery">Books & Stationery</option><option value="Hardware">Hardware</option><option value="Home Decor">Home Decor</option><option value="Other">Other</option>
              </select>
            </>
          )}
          {!isLogin && role === 'delivery_partner' && (
            <select required className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-400" value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
               <option value="Two-wheeler">Two-wheeler (Bike/Scooty)</option><option value="Three-wheeler">Three-wheeler (Auto)</option><option value="Small Tempo">Small Tempo (e-Rickshaw/Chota Hathi)</option><option value="Cycle">Cycle</option>
            </select>
          )}
          <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-black p-5 rounded-2xl mt-4 hover:bg-indigo-700 transition shadow-xl uppercase tracking-widest text-xs disabled:opacity-50">{isLoading ? 'Processing...' : (isLogin ? 'Enter' : 'Create Account')}</button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
