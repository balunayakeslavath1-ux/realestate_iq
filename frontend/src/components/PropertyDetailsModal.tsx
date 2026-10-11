import React, { useState } from 'react';
import {
  X,
  MapPin,
  Compass,
  Heart,
  CheckCircle,
  ExternalLink,
  Phone,
  Mail,
  User as UserIcon,
  Home,
  Maximize2,
  Calendar,
  Sparkles,
  Navigation,
  Share2
} from 'lucide-react';
import type { Property, User } from '../types';

interface PropertyDetailsModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorited: boolean;
  onToggleFavorite: (propertyId: number) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
}

export const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  property,
  isOpen,
  onClose,
  isFavorited,
  onToggleFavorite,
  currentUser,
  onOpenAuth
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !property) return null;

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} Lakh`;
  };

  // Feature 6: Google Maps navigation URL
  const handleNavigateGoogleMaps = () => {
    let destination = '';
    if (property.latitude && property.longitude) {
      destination = `${property.latitude},${property.longitude}`;
    } else if (property.address) {
      destination = property.address;
    } else {
      destination = `${property.title}, ${property.locality_name || 'Hyderabad'}, Telangana, India`;
    }

    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(navUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const amenitiesList = property.amenities
    ? property.amenities.split(',').map((a) => a.trim())
    : ['24/7 Security', 'Power Backup', 'Covered Parking', 'Clubhouse Access'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Action Bar */}
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg backdrop-blur-sm transition-all"
            title="Share property link"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              if (!currentUser) {
                onOpenAuth();
              } else {
                onToggleFavorite(property.id);
              }
            }}
            className={`p-2 rounded-full border shadow-lg backdrop-blur-sm transition-all ${
              isFavorited
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-rose-400 hover:bg-slate-800'
            }`}
            title={isFavorited ? 'Remove from favourites' : 'Save to favourites (notifies owner)'}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 shadow-lg backdrop-blur-sm transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Image */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950 shrink-0">
          <img
            src={property.image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          
          {/* Badge overlays */}
          <div className="absolute bottom-4 left-6 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/90 text-white shadow-md">
              {property.property_type.toUpperCase()}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/90 text-white shadow-md">
              FOR {property.listing_type.toUpperCase()}
            </span>
            {property.is_available === false && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/90 text-white shadow-md">
                CURRENTLY RESERVED
              </span>
            )}
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Title & Asking Price */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{property.title}</h2>
              <div className="flex items-center text-slate-400 text-sm mt-1">
                <MapPin className="w-4 h-4 text-teal-400 mr-1.5 shrink-0" />
                <span>{property.address || `${property.locality_name || 'Hyderabad'}, Telangana`}</span>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-3xl font-extrabold text-teal-300">
                {formatPrice(property.price)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                ₹{property.price_per_sqft?.toLocaleString() || (Math.round(property.price / property.area_sqft)).toLocaleString()} / sq.ft
              </div>
            </div>
          </div>

          {/* Key Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center text-xs text-slate-400 mb-1">
                <Home className="w-3.5 h-3.5 text-teal-400 mr-1.5" />
                <span>Configuration</span>
              </div>
              <div className="text-base font-semibold text-white">
                {property.bedrooms ? `${property.bedrooms} BHK` : 'Studio / Plot'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center text-xs text-slate-400 mb-1">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                <span>Super Built-up</span>
              </div>
              <div className="text-base font-semibold text-white">
                {property.area_sqft?.toLocaleString()} sq.ft
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center text-xs text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                <span>Age of Property</span>
              </div>
              <div className="text-base font-semibold text-white">
                {property.age ? `${property.age} Years` : 'New Construction'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center text-xs text-slate-400 mb-1">
                <Compass className="w-3.5 h-3.5 text-teal-400 mr-1.5" />
                <span>Micro-Market</span>
              </div>
              <div className="text-base font-semibold text-white">
                {property.locality_name || 'Kokapet'}
              </div>
            </div>
          </div>

          {/* Navigation Action Banner (Feature 6) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-teal-900/30 to-indigo-900/30 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-teal-300 font-semibold text-sm">
                <Navigation className="w-4 h-4" />
                <span>Google Maps GPS Navigation</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                Launch real-time turn-by-turn driving directions to this property with destination pre-configured.
              </p>
            </div>
            <button
              onClick={handleNavigateGoogleMaps}
              className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-wide uppercase flex items-center space-x-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navigate to Property</span>
            </button>
          </div>

          {/* Amenities & Features */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Highlights & Amenities</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {amenitiesList.map((amenity, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700/70"
                >
                  ✓ {amenity}
                </span>
              ))}
            </div>
          </div>

          {/* Owner & Contact Card (Feature 4 Details) */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Listing Provider & Owner Details
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-teal-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{property.owner_name || 'PropScope Partner'}</div>
                  <div className="text-xs text-slate-400">{property.verification_status || 'Verified Property'}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>{property.owner_phone || '+91 98765 43210'}</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{property.owner_email || 'owner@realestateiq.com'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Source Link if present */}
          {property.source_url && (
            <div className="pt-2 text-right">
              <a
                href={property.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-teal-400 hover:text-teal-300 underline"
              >
                <span>View Original Listing Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
