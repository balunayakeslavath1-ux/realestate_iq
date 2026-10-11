import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  ExternalLink,
  Layers,
  ChevronRight,
  Building2,
  Car,
  Plane,
  Train
} from 'lucide-react';
import type { Locality, Property } from '../types';

interface InteractiveMapProps {
  localities: Locality[];
  selectedLocalityId?: number | null;
  onSelectLocality: (localityId: number | null) => void;
  localityMetrics?: Record<string, { medianPrice?: number; pricePerSqft?: number; activityScore?: number }>;
  properties?: Property[];
  onSelectProperty?: (property: Property) => void;
  onNavigateGoogleMaps?: (property: Property) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  localities,
  selectedLocalityId,
  onSelectLocality,
  localityMetrics = {},
  properties = [],
  onSelectProperty,
  onNavigateGoogleMaps
}) => {
  // Current selected property for directions / focus
  const [selectedFlatId, setSelectedFlatId] = useState<number | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [originPreset, setOriginPreset] = useState<string>('current');

  // Find active locality
  const selectedLocality = useMemo(() => {
    return localities.find((l) => l.id === selectedLocalityId) || null;
  }, [localities, selectedLocalityId]);

  // Filter properties for the active locality (or all if none selected)
  const displayedProperties = useMemo(() => {
    if (!selectedLocalityId) return properties.slice(0, 12);
    const filtered = properties.filter((p) => p.locality_id === selectedLocalityId);
    return filtered.length > 0 ? filtered : properties.slice(0, 8);
  }, [properties, selectedLocalityId]);

  // Selected flat object
  const activeFlat = useMemo(() => {
    if (selectedFlatId) {
      const found = properties.find((p) => p.id === selectedFlatId);
      if (found) return found;
    }
    return displayedProperties[0] || null;
  }, [selectedFlatId, properties, displayedProperties]);

  // Compute map center and query for Google Maps
  const mapCenterQuery = useMemo(() => {
    if (activeFlat) {
      if (activeFlat.latitude && activeFlat.longitude) {
        return `${activeFlat.latitude},${activeFlat.longitude}`;
      }
      return `${activeFlat.title}, ${activeFlat.locality_name || 'Hyderabad'}, Telangana, India`;
    }
    if (selectedLocality) {
      return `${selectedLocality.latitude},${selectedLocality.longitude}`;
    }
    // Default to West Hyderabad IT Corridor (Financial District / Gachibowli)
    return '17.435,78.345';
  }, [activeFlat, selectedLocality]);

  const mapZoom = useMemo(() => {
    if (activeFlat) return 16;
    if (selectedLocality) return 14;
    return 12;
  }, [activeFlat, selectedLocality]);

  // Google Maps Embed URL (Standard embed compatible with all browsers & zero setup)
  const mapEmbedUrl = useMemo(() => {
    const modeFlag = mapType === 'satellite' ? '&t=k' : '';
    return `https://maps.google.com/maps?q=${encodeURIComponent(mapCenterQuery)}&z=${mapZoom}${modeFlag}&hl=en&output=embed`;
  }, [mapCenterQuery, mapZoom, mapType]);

  // Generate Google Maps Directions URL
  const getDirectionsUrl = (flat: Property, originMode: string) => {
    let dest = '';
    if (flat.latitude && flat.longitude) {
      dest = `${flat.latitude},${flat.longitude}`;
    } else if (flat.address) {
      dest = flat.address;
    } else {
      dest = `${flat.title}, ${flat.locality_name || 'Hyderabad'}, Telangana, India`;
    }

    let originParam = '';
    if (originMode === 'airport') {
      originParam = '&origin=Rajiv+Gandhi+International+Airport+Hyderabad';
    } else if (originMode === 'cyber_towers') {
      originParam = '&origin=Cyber+Towers+Hitec+City+Hyderabad';
    } else if (originMode === 'metro') {
      originParam = '&origin=Miyapur+Metro+Station+Hyderabad';
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}${originParam}`;
  };

  const handleOpenDirections = (flat: Property) => {
    if (onNavigateGoogleMaps) {
      onNavigateGoogleMaps(flat);
    } else {
      const url = getDirectionsUrl(flat, originPreset);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    return `₹${(price / 100000).toFixed(2)} Lakh`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-base tracking-tight">
                Interactive Google Maps & Directions Hub
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                LIVE GOOGLE MAPS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore property locations across Kokapet, Gachibowli, Miyapur, Kondapur, Tellapur & Manikonda with turn-by-turn navigation.
            </p>
          </div>
        </div>

        {/* Map Type Controls & Reset */}
        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                mapType === 'roadmap' ? 'bg-teal-500 text-slate-950 shadow font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Street Map
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                mapType === 'satellite' ? 'bg-teal-500 text-slate-950 shadow font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>

          {selectedLocalityId && (
            <button
              onClick={() => {
                onSelectLocality(null);
                setSelectedFlatId(null);
              }}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 bg-teal-950/60 border border-teal-500/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              Reset to All Hyderabad
            </button>
          )}
        </div>
      </div>

      {/* Main Map + Properties Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Left Column: Google Maps Embed (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 relative bg-slate-950 min-h-[400px] lg:min-h-full flex flex-col">
          {/* Active Location Banner Overlay */}
          <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg pointer-events-auto flex items-center space-x-2">
              <MapPin className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                {activeFlat
                  ? `${activeFlat.title} (${activeFlat.locality_name || 'Hyderabad'})`
                  : selectedLocality
                  ? `${selectedLocality.name}, Hyderabad`
                  : 'West Hyderabad IT Corridor'}
              </span>
              {activeFlat && (
                <span className="text-[11px] text-teal-300 font-semibold bg-teal-950/80 px-2 py-0.5 rounded border border-teal-500/30">
                  {formatPrice(activeFlat.price)}
                </span>
              )}
            </div>

            {/* Quick Open in External Google Maps Button */}
            {activeFlat && (
              <button
                onClick={() => handleOpenDirections(activeFlat)}
                className="pointer-events-auto bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs shadow-xl flex items-center space-x-1.5 active:scale-95 transition-all"
                title="Launch full navigation in Google Maps app or browser"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Directions to Flat</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>

          {/* Real Google Maps Iframe */}
          <iframe
            title="Google Maps Hyderabad Real Estate View"
            src={mapEmbedUrl}
            className="w-full h-full min-h-[420px] lg:min-h-[520px] border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Bottom Map Info Strip */}
          <div className="p-2.5 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-4">
            <div className="flex items-center space-x-4">
              <span>📍 Coordinates: {mapCenterQuery}</span>
              <span className="hidden sm:inline">• Zoom Level: {mapZoom}x</span>
            </div>
            <div className="flex items-center space-x-1 text-teal-400 font-medium">
              <span>Google Maps Platform</span>
            </div>
          </div>
        </div>

        {/* Right Column: Property Locations & Directions Panel (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/90 flex flex-col max-h-[620px] overflow-hidden">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Flats in {selectedLocality ? selectedLocality.name : 'West Hyderabad'}
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {displayedProperties.length} listings
            </span>
          </div>

          {/* Selected Flat Directions Action Card */}
          {activeFlat && (
            <div className="p-4 bg-teal-950/20 border-b border-teal-500/20">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
                    Selected Flat for Directions
                  </div>
                  <h5 className="text-sm font-bold text-white line-clamp-1">{activeFlat.title}</h5>
                  <p className="text-xs text-slate-300">
                    {activeFlat.bedrooms} BHK • {activeFlat.area_sqft} sq.ft • {formatPrice(activeFlat.price)}
                  </p>
                </div>
              </div>

              {/* Origin Selection */}
              <div className="mt-2.5 mb-3">
                <div className="text-[10px] text-slate-400 font-semibold uppercase mb-1.5">
                  Calculate directions from:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    onClick={() => setOriginPreset('current')}
                    className={`px-2 py-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition-colors ${
                      originPreset === 'current'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="truncate">Your Location (GPS)</span>
                  </button>

                  <button
                    onClick={() => setOriginPreset('cyber_towers')}
                    className={`px-2 py-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition-colors ${
                      originPreset === 'cyber_towers'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">Hitec Cyber Towers</span>
                  </button>

                  <button
                    onClick={() => setOriginPreset('airport')}
                    className={`px-2 py-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition-colors ${
                      originPreset === 'airport'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Plane className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">RGIA Airport (HYD)</span>
                  </button>

                  <button
                    onClick={() => setOriginPreset('metro')}
                    className={`px-2 py-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition-colors ${
                      originPreset === 'metro'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Train className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">Miyapur Metro</span>
                  </button>
                </div>
              </div>

              {/* Main Directions Button */}
              <button
                onClick={() => handleOpenDirections(activeFlat)}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20 active:scale-98 transition-all"
              >
                <Navigation className="w-4 h-4" />
                <span>Open Directions in Google Maps</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            </div>
          )}

          {/* Scrollable Property Locations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1.5">
            {displayedProperties.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No properties found in this locality.
              </div>
            ) : (
              displayedProperties.map((prop) => {
                const isSelected = activeFlat?.id === prop.id;
                return (
                  <div
                    key={prop.id}
                    onClick={() => {
                      setSelectedFlatId(prop.id);
                      if (onSelectProperty) onSelectProperty(prop);
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex items-center space-x-3 ${
                      isSelected
                        ? 'bg-teal-950/60 border border-teal-500/50 shadow-md ring-1 ring-teal-500/30'
                        : 'bg-slate-800/40 hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg bg-slate-700 overflow-hidden shrink-0 relative">
                      <img
                        src={
                          prop.image_url ||
                          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80'
                        }
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 bg-slate-950/80 text-[9px] font-mono font-bold text-teal-300 px-1 py-0.5 rounded-tl">
                        {prop.bedrooms}BHK
                      </span>
                    </div>

                    {/* Property Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h6 className="text-xs font-bold text-white truncate">{prop.title}</h6>
                        <span className="text-xs font-bold text-teal-400 shrink-0 ml-1">
                          {formatPrice(prop.price)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        📍 {prop.locality_name || 'Hyderabad'} • {prop.area_sqft} sq.ft
                      </p>
                      <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-500">
                        <span>₹{Math.round(prop.price / (prop.area_sqft || 1)).toLocaleString()}/sq.ft</span>
                        <span>•</span>
                        <span className="text-emerald-400">Click to pin map</span>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? 'text-teal-400 translate-x-1' : 'text-slate-600'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Select Locality Bar (Matching original image layout) */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 mr-2 flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span>Quick Select:</span>
        </span>

        {/* All Hyderabad Button */}
        <button
          onClick={() => {
            onSelectLocality(null);
            setSelectedFlatId(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedLocalityId === null
              ? 'bg-teal-500 text-slate-950 font-bold shadow-md ring-2 ring-teal-400/50'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          All Hyderabad
        </button>

        {/* Locality Pills */}
        {localities.map((loc) => {
          const isSelected = selectedLocalityId === loc.id;
          const metrics = localityMetrics[loc.name];
          const priceBadge = metrics?.pricePerSqft
            ? `₹${Math.round(metrics.pricePerSqft / 1000)}k`
            : '';

          return (
            <button
              key={loc.id}
              onClick={() => {
                onSelectLocality(loc.id);
                setSelectedFlatId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                isSelected
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md ring-2 ring-teal-400/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>{loc.name}</span>
              {priceBadge && (
                <span
                  className={`text-[10px] px-1 rounded ${
                    isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-teal-400'
                  }`}
                >
                  {priceBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
