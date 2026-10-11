import { Heart, MapPin, Navigation, Building, Trash2 } from 'lucide-react';
import type { Property, User } from '../types';

interface FavoritesViewProps {
  favorites: Property[];
  currentUser: User | null;
  onRemoveFavorite: (propertyId: number) => void;
  onSelectProperty: (property: Property) => void;
  onOpenAuth: () => void;
  onNavigateGoogleMaps: (property: Property) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  currentUser,
  onRemoveFavorite,
  onSelectProperty,
  onOpenAuth,
  onNavigateGoogleMaps
}) => {
  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 mb-4">
          <Heart className="w-8 h-8 fill-rose-500/20" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">My Saved Favourites</h2>
        <p className="text-sm text-slate-400 mb-6">
          Sign in to your RealEstateIQ account to keep track of your saved flats, synchronize across devices, and coordinate directly with property owners.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 transition-all"
        >
          Sign In to Access Favourites
        </button>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} Lakh`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <Heart className="w-5 h-5 fill-rose-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">My Saved Favourites</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-teal-300 border border-slate-700">
              {favorites.length} {favorites.length === 1 ? 'Flat' : 'Flats'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Properties saved under {currentUser.name} ({currentUser.email}). The owners have been notified via automated email.
          </p>
        </div>
      </div>

      {/* Grid of Favourites */}
      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((prop) => (
            <div
              key={prop.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group"
            >
              {/* Photo & Actions */}
              <div className="relative h-48 w-full bg-slate-950 overflow-hidden cursor-pointer" onClick={() => onSelectProperty(prop)}>
                <img
                  src={prop.image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'}
                  alt={prop.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFavorite(prop.id);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-slate-800 shadow-md transition-all"
                  title="Remove from favourites"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="absolute bottom-3 left-3 flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-500 text-slate-950">
                    {prop.property_type}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/90 text-white">
                    For {prop.listing_type}
                  </span>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => onSelectProperty(prop)}
                      className="font-bold text-white text-base hover:text-teal-300 cursor-pointer line-clamp-1"
                    >
                      {prop.title}
                    </h3>
                  </div>

                  <div className="flex items-center text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400 mr-1 shrink-0" />
                    <span className="truncate">{prop.address || `${prop.locality_name || 'Hyderabad'}, Telangana`}</span>
                  </div>

                  {/* Price & BHK */}
                  <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-slate-800">
                    <div>
                      <span className="text-xl font-extrabold text-teal-300">
                        {formatPrice(prop.price)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5">
                        (₹{prop.price_per_sqft || Math.round(prop.price / prop.area_sqft)}/sqft)
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-300">
                      {prop.bedrooms ? `${prop.bedrooms} BHK` : 'Plot'} • {prop.area_sqft} sqft
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => onNavigateGoogleMaps(prop)}
                    className="flex-1 py-2 px-3 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Navigate</span>
                  </button>

                  <button
                    onClick={() => onSelectProperty(prop)}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
          <Building className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Favourites Saved Yet</h3>
          <p className="text-xs text-slate-400">
            Browse through the Property Listings tab and click the heart icon on any flat to save it here. Saving a flat automatically alerts the property owner!
          </p>
        </div>
      )}
    </div>
  );
};
