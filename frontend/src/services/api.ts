import type {
  Locality, Property, PropertyListResponse, MarketSummary,
  SupplyAnalysis, DemandAnalysis, MarketTrends, MarketCompareResponse, FilterState
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export async function fetchLocalities(search?: string): Promise<Locality[]> {
  const url = new URL(`${API_BASE}/localities`);
  if (search) url.searchParams.append('search', search);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load localities');
  return res.json();
}



export async function fetchProperties(filters: FilterState, page: number = 1, pageSize: number = 20): Promise<PropertyListResponse> {
  const url = new URL(`${API_BASE}/properties`);
  if (filters.locality_id) url.searchParams.append('locality_id', filters.locality_id.toString());
  if (filters.property_type && filters.property_type !== 'all') url.searchParams.append('property_type', filters.property_type);
  if (filters.listing_type) url.searchParams.append('listing_type', filters.listing_type);
  if (filters.min_price) url.searchParams.append('min_price', filters.min_price.toString());
  if (filters.max_price) url.searchParams.append('max_price', filters.max_price.toString());
  if (filters.min_area) url.searchParams.append('min_area', filters.min_area.toString());
  if (filters.max_area) url.searchParams.append('max_area', filters.max_area.toString());
  if (filters.bedrooms) url.searchParams.append('bedrooms', filters.bedrooms.toString());
  if (filters.sort_by) url.searchParams.append('sort_by', filters.sort_by);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('page_size', pageSize.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load properties');
  return res.json();
}

export async function fetchPropertyById(id: number): Promise<Property> {
  const res = await fetch(`${API_BASE}/properties/${id}`);
  if (!res.ok) throw new Error(`Property ${id} not found`);
  return res.json();
}

export async function fetchMarketSummary(localityId?: number, listingType: string = 'sale', propertyType: string = 'all'): Promise<MarketSummary> {
  const url = new URL(`${API_BASE}/market/summary`);
  if (localityId) url.searchParams.append('locality_id', localityId.toString());
  url.searchParams.append('listing_type', listingType);
  if (propertyType && propertyType !== 'all') url.searchParams.append('property_type', propertyType);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load market summary');
  return res.json();
}

export async function fetchSupplyAnalysis(localityId?: number, listingType: string = 'sale'): Promise<SupplyAnalysis> {
  const url = new URL(`${API_BASE}/market/supply`);
  if (localityId) url.searchParams.append('locality_id', localityId.toString());
  url.searchParams.append('listing_type', listingType);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load supply analysis');
  return res.json();
}

export async function fetchDemandAnalysis(localityId?: number): Promise<DemandAnalysis> {
  const url = new URL(`${API_BASE}/market/demand`);
  if (localityId) url.searchParams.append('locality_id', localityId.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load demand analysis');
  return res.json();
}

export async function fetchMarketTrends(
  localityId?: number,
  listingType: string = 'sale',
  propertyType: string = 'all',
  startDate?: string,
  endDate?: string
): Promise<MarketTrends> {
  const url = new URL(`${API_BASE}/market/trends`);
  if (localityId) url.searchParams.append('locality_id', localityId.toString());
  url.searchParams.append('listing_type', listingType);
  if (propertyType && propertyType !== 'all') url.searchParams.append('property_type', propertyType);
  if (startDate) url.searchParams.append('start_date', startDate);
  if (endDate) url.searchParams.append('end_date', endDate);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load market trends');
  return res.json();
}

export async function fetchLocalityComparison(
  localityIds: number[],
  listingType: string = 'sale',
  propertyType: string = 'all'
): Promise<MarketCompareResponse> {
  const url = new URL(`${API_BASE}/market/compare`);
  url.searchParams.append('locality_ids', localityIds.join(','));
  url.searchParams.append('listing_type', listingType);
  if (propertyType && propertyType !== 'all') url.searchParams.append('property_type', propertyType);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load locality comparison');
  return res.json();
}

export async function uploadPropertiesCSV(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/import/csv`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Import failed' }));
    throw new Error(errorData.detail || 'Import failed');
  }
  return res.json();
}

export async function resetDemoDatabase(): Promise<any> {
  const res = await fetch(`${API_BASE}/import/reset-seed`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset demo dataset');
  return res.json();
}

export function getTemplateDownloadUrl(): string {
  return `${API_BASE}/import/template`;
}

// Multi-Agent Pipeline APIs
export async function runAgentAnalysis(params?: {
  budget_min?: number;
  budget_max?: number;
  risk_preference?: string;
  property_type?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/agents/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {})
  });
  if (!res.ok) throw new Error('Agent analysis run failed');
  return res.json();
}

export async function predictPropertyPrice(params: {
  locality_name: string;
  property_type: string;
  area_sqft: number;
  bedrooms: number;
  age: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/agents/predict-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Price prediction failed');
  return res.json();
}

export async function fetchLatestAgentReport(): Promise<any> {
  const res = await fetch(`${API_BASE}/agents/latest-report`);
  if (!res.ok) throw new Error('Failed to fetch latest agent report');
  return res.json();
}

export async function fetchForecast(localityName?: string): Promise<any> {
  const url = new URL(`${API_BASE}/agents/forecast`);
  if (localityName) url.searchParams.append('locality_name', localityName);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}

// Authentication APIs
export async function loginUser(email: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(error.detail || 'Login failed');
  }
  return res.json();
}

export async function registerUser(payload: {
  email: string;
  name: string;
  password: string;
  phone?: string;
  share_contact_consent?: boolean;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(error.detail || 'Registration failed');
  }
  return res.json();
}

export async function fetchUserProfile(token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Session expired. Please log in again.');
  return res.json();
}

// User Favorites & Automatic Owner Notification APIs
export async function fetchFavorites(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/favorites`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to load favourites');
  return res.json();
}

export async function fetchFavoritePropertyIds(token: string): Promise<number[]> {
  const res = await fetch(`${API_BASE}/favorites/ids`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) return [];
  return res.json();
}

export async function addFavoriteProperty(propertyId: number, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/favorites/${propertyId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add favourite' }));
    throw new Error(err.detail || 'Failed to add favourite');
  }
  return res.json();
}

export async function removeFavoriteProperty(propertyId: number, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/favorites/${propertyId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to remove favourite' }));
    throw new Error(err.detail || 'Failed to remove favourite');
  }
  return res.json();
}

export async function fetchNotificationLogs(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/favorites/notifications`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSmtpSettings(token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/favorites/smtp-settings`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch SMTP settings' }));
    throw new Error(err.detail || 'Failed to fetch SMTP settings');
  }
  return res.json();
}

export async function updateSmtpSettings(data: any, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/favorites/smtp-settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save SMTP settings' }));
    throw new Error(err.detail || 'Failed to save SMTP settings');
  }
  return res.json();
}

export async function sendTestEmailToPhone(targetEmail: string, token: string, propertyId?: number): Promise<any> {
  const res = await fetch(`${API_BASE}/favorites/send-test-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ target_email: targetEmail, property_id: propertyId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to send test email' }));
    throw new Error(err.detail || 'Failed to send test email');
  }
  return res.json();
}

// Admin CRUD APIs
export async function adminCreateProperty(data: any, token: string): Promise<Property> {
  const res = await fetch(`${API_BASE}/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create property' }));
    throw new Error(err.detail || 'Failed to create property');
  }
  return res.json();
}

export async function adminUpdateProperty(id: number, data: any, token: string): Promise<Property> {
  const res = await fetch(`${API_BASE}/properties/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update property' }));
    throw new Error(err.detail || 'Failed to update property');
  }
  return res.json();
}

export async function adminDeleteProperty(id: number, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/properties/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete property' }));
    throw new Error(err.detail || 'Failed to delete property');
  }
  return res.json();
}

export async function adminTogglePropertyStatus(id: number, token: string): Promise<Property> {
  const res = await fetch(`${API_BASE}/properties/${id}/toggle-status`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to toggle status' }));
    throw new Error(err.detail || 'Failed to toggle status');
  }
  return res.json();
}

// Apify Live Ingestion API
export async function syncApifyLiveFeed(params?: {
  actor_id?: string;
  dataset_id?: string;
  limit?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/import/apify-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Apify sync failed' }));
    throw new Error(err.detail || 'Apify sync failed');
  }
  return res.json();
}


