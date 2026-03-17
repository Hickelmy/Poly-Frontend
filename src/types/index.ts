// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name?: string;
  full_name?: string;
  email: string;
  user_role?: string;
  role?: string;
  profile_image?: string;
  phone?: string;
  street?: string;
  house_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  residence_lat?: number;
  residence_lng?: number;
  zone_id?: string;
  bio?: string;
  created_date?: string;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
  zone_type?: string;
  polygon_coords?: string;
  latitude?: number;
  longitude?: number;
  created_date?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  short_description?: string;
  category?: string;
  status?: string;
  image_url?: string;
  evidences?: string[];
  target_amount?: number;
  current_amount?: number;
  funding_deadline?: string;
  min_votes?: number;
  up_votes_count?: number;
  down_votes_count?: number;
  votes_count?: number;
  owner_id?: string;
  owner_email?: string;
  owner_name?: string;
  zone_id?: string;
  latitude?: number;
  longitude?: number;
  created_date?: string;
}

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  discountPercent?: number;
  category?: string;
  image_url?: string;
  evidences?: string[];
  quantity_available?: number;
  unit_type?: string;
  payment_methods?: string[];
  seller_delivery?: boolean;
  owner_id?: string;
  owner_email?: string;
  owner_name?: string;
  zone_id?: string;
  latitude?: number;
  longitude?: number;
  created_date?: string;
}

export interface Service {
  id: string;
  title: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  evidences?: string[];
  availability?: Record<string, string[]>;
  owner_id?: string;
  owner_email?: string;
  owner_name?: string;
  zone_id?: string;
  latitude?: number;
  longitude?: number;
  created_date?: string;
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  discountPercent: number | null;
  image: string | null;
  sellerName: string | null;
  unitType: string;
  quantityAvailable: number;
  quantity: number;
}

export interface Address {
  street?: string;
  house_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
}

export interface Order {
  id: string;
  userId?: string;
  userEmail?: string;
  productId?: string;
  serviceId?: string;
  projectId?: string;
  quantity?: number;
  subtotal?: number;
  total?: number;
  status?: string;
  paymentMethod?: string;
  deliveryMethod?: string;
  created_date?: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title?: string;
  message?: string;
  read?: boolean;
  created_date?: string;
}
