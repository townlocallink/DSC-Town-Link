
export type UserRole = 'customer' | 'shop_owner' | 'admin' | 'delivery_partner';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  phoneNumber: string;
  password?: string;
  address?: string;
  pinCode: string;   
  city: string;      
  locality?: string; 
  rating: number;
  totalRatings: number;
  isVerified?: boolean;
  vehicleType?: string; // Specific to delivery partners
}

export interface ShopProfile extends UserProfile {
  shopName: string;
  category: string;
  shopImage?: string;
  description?: string;
  promoBanner?: string;
}

export interface DailyUpdate {
  id: string;
  shopId: string;
  shopName: string;
  text: string;
  image?: string;
  createdAt: number;
  expiresAt: number;
}

export type RequestStatus = 'drafting' | 'summarized' | 'broadcasted' | 'fulfilled' | 'cancelled';

export interface ProductRequest {
  id: string;
  customerId: string;
  customerName: string;
  pinCode: string;   
  city: string;
  locality?: string;
  category: string;
  description: string;
  status: RequestStatus;
  createdAt: number;
  image?: string;
}

export interface DirectMessage {
  senderId: string;
  text: string;
  timestamp: number;
  image?: string; // Base64 or DataURL of attached image
}

export interface GroundingChunk {
  maps?: {
    uri: string;
    title: string;
  };
}

export interface Offer {
  id: string;
  requestId: string;
  customerId: string; 
  shopId: string;
  shopName: string;
  shopRating: number;
  price: number;
  productImage?: string;
  message?: string;
  chatHistory?: DirectMessage[];
  createdAt: number;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface Order {
  id: string;
  requestId: string;
  offerId: string;
  customerId: string;
  shopId: string;
  shopName: string; // Helpful for delivery
  category?: string; // Helpful for delivery
  itemDescription?: string;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryPartnerVehicle?: string;
  deliveryAddress: string;
  shopAddress?: string;
  shopPhone?: string;
  customerPhone?: string;
  customerName?: string;
  amountToCollect: number;
  pinCode: string;
  city: string;
  status: 'pending_assignment' | 'assigned' | 'collected' | 'delivered';
  customerRated: boolean;
  shopRated: boolean;
  createdAt: number;
  isTownHubOrder?: boolean;
  townHubPickupFinalized?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  parts: { 
    text?: string; 
    inlineData?: { mimeType: string; data: string };
  }[];
  groundingChunks?: GroundingChunk[];
}

export interface MarketplaceStats {
  totalUsers: number;
  totalShops: number;
  totalRequests: number;
  totalOrders: number;
  conversionRate: number;
  activeCategories: Record<string, number>;
}
