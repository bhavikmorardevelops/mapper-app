'use client'

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2, Globe, AlertCircle } from 'lucide-react';

interface Place {
  name: string;
  description?: string;
  coordinates?: any;
}

const Mapper = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load Google Maps API
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
      return;
    }

    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setError('Failed to load Google Maps');
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [GOOGLE_MAPS_API_KEY]);

  // Initialize map when loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        zoom: 2,
        center: { lat: 20, lng: 0 },
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }
  }, [mapLoaded]);

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const addMarkersToMap = async (extractedPlaces: Place[]) => {
    if (!mapInstance.current) return;

    clearMarkers();
    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();
    const successfulPlaces: Place[] = [];

    for (const place of extractedPlaces) {
      try {
        const result = await new Promise<any>((resolve, reject) => {
          geocoder.geocode({ address: place.name }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error(`Geocoding failed for ${place.name}`));
            }
          });
        });

        const marker = new window.google.maps.Marker({
          position: result.geometry.location,
          map: mapInstance.current,
          title: place.name,
          animation: window.google.maps.Animation.DROP,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${place.name}</h3>
              ${place.description ? `<p style="margin: 0; font-size: 14px; color: #666;">${place.description}</p>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current, marker);
        });

        markersRef.current.push(marker);
        bounds.extend(result.geometry.location);
        successfulPlaces.push({...place, coordinates: result.geometry.location});

      } catch (error) {
        console.warn(`Failed to geocode ${place.name}:`, error);
      }
    }

    if (successfulPlaces.length > 0) {
      mapInstance.current.fitBounds(bounds);
      if (successfulPlaces.length === 1) {
        mapInstance.current.setZoom(15);
      }
      setPlaces(successfulPlaces);
    }

    return successfulPlaces;
  };

  // For now, let's add a test function with sample places
  const testWithSamplePlaces = async () => {
    const samplePlaces = [
      { name: "Big Ben, London", description: "Famous clock tower" },
      { name: "Tower Bridge, London", description: "Iconic bridge" },
      { name: "London Eye, London", description: "Giant observation wheel" }
    ];
    
    setLoading(true);
    try {
      await addMarkersToMap(samplePlaces);
    } catch (error) {
      setError('Failed to load sample places');
    } finally {
      setLoading(false);
    }
  };

  const showUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        if (mapInstance.current) {
          const marker = new window.google.maps.Marker({
            position: userLocation,
            map: mapInstance.current,
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg fill="blue" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24)
            }
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: '<div style="padding: 8px;"><strong>Your Location</strong></div>'
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance.current, marker);
          });

          markersRef.current.push(marker);
        }
      },
      (error) => {
        setError('Unable to get your location');
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <MapPin className="h-10 w-10 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Mapper</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Extract places from any article and see them on a map. Perfect for travel guides, restaurant lists, and attraction recommendations.
          </p>
        </div>

        {/* Input Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  Article URL (Coming Soon)
                </label>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/best-restaurants-london"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={true}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={testWithSamplePlaces}
                  disabled={loading || !mapLoaded}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Globe className="h-5 w-5 mr-2" />
                      Test Sample
                    </>
                  )}
                </button>
                <button
                  onClick={showUserLocation}
                  disabled={!mapLoaded || loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  My Location
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {!GOOGLE_MAPS_API_KEY && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  <strong>Next Step:</strong> Add your Google Maps API key to see the map!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Map Section */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="h-96 sm:h-[500px] lg:h-[600px] relative">
              <div
                ref={mapRef}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
              />
              {!mapLoaded && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {!GOOGLE_MAPS_API_KEY ? 'Waiting for API key...' : 'Loading Google Maps...'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Results Summary */}
            {places.length > 0 && (
              <div className="p-4 bg-gray-50 border-t">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Found {places.length} place{places.length !== 1 ? 's' : ''}:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {places.map((place, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {place.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mapper;
