// MainApp.jsx
import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Navigation, Plus, ChevronUp, ChevronDown, ArrowLeft } from "lucide-react";
import "./index.css";
import Router from "./Router";

// Individual imports for each component used in this sample
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-legend";
import "@arcgis/map-components/components/arcgis-search";
import "@arcgis/map-components/components/arcgis-locate";

// Core API imports
import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import View from "@arcgis/core/views/View.js";
import Circle from "@arcgis/core/geometry/Circle.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";

// Simple BathroomCard component
function BathroomCard({ title, description, location }) {
    return (
        <div className="bathroom-card" style={{ marginBottom: '12px' }}>
            <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{title}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: '500' }}>Open</span>
                        <div style={{ color: '#eab308', fontSize: '14px' }}>★★★★☆</div>
                    </div>
                </div>
                <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px', lineHeight: '1.4' }}>{description}</p>
                <div style={{ display: 'flex', alignItems: 'center', color: '#6b7280', fontSize: '12px' }}>
                    <MapPin style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                    <span>0.2 miles away</span>
                </div>
            </div>
        </div>
    );
}

function MainApp({ onBackToWelcome }) {
    const defaultCenter = [-73.9856644, 40.7484405];
    const defaultZoom = 10;

    // Backend variables
    let clickPoint; // Clicked Point on Map
    let distance = 0.5; // TODO: make this selected by the user

    const [viewPoint, setViewPoint] = useState(null);
    const [addPin, setAddPin] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [bottomSheetHeight, setBottomSheetHeight] = useState(window.innerWidth <= 768 ? 160 : 420);
    const [isDragging, setIsDragging] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [selectedRadius, setSelectedRadius] = useState('0.5');

    const locateRef = useRef(null);
    const bottomSheetRef = useRef(null);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);
    
    // Solve route conditional
    const [shouldRoute, setShouldRoute] = useState(false);

    const handleRouteClick = () => {
        setShouldRoute(true);
    };

    // Graphics layer for pins
    let pointLayer = new GraphicsLayer({
        id: "pointLayer",
    });

    // Graphics layer for radius
    let radiusLayer = new GraphicsLayer({
        id: "radiusLayer",
    });

    // Feature Layer with real bathroom data
    let dataLayer = new FeatureLayer({
        portalItem: {
            id: "439b9127797a428e97589420adee7775",
        },
        outFields: ["*"],
    });

    // Graphic Layer for selected bathroom data points
    let selectedLayer = new GraphicsLayer({
        id: "selectedLayer",
    });

    // Route graphic layer for directions
    const routeLayerRef = useRef(new GraphicsLayer({ id: "routeLayer" }));


    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (!mobile) {
                setBottomSheetHeight(420);
            } else if (bottomSheetHeight > 160) {
                // Keep current height if expanded on mobile
            } else {
                setBottomSheetHeight(160);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [bottomSheetHeight]);

    // Drag handlers for bottom sheet
    const handleDragStart = (e) => {
        if (!isMobile) return;
        setIsDragging(true);
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        dragStartY.current = clientY;
        dragStartHeight.current = bottomSheetHeight;
        e.preventDefault();
    };

    const handleDragMove = (e) => {
        if (!isDragging || !isMobile) return;

        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const deltaY = dragStartY.current - clientY;
        const newHeight = Math.max(120, Math.min(window.innerHeight * 0.8, dragStartHeight.current + deltaY));

        setBottomSheetHeight(newHeight);
        e.preventDefault();
    };

    const handleDragEnd = () => {
        if (!isDragging || !isMobile) return;
        setIsDragging(false);

        const windowHeight = window.innerHeight;
        if (bottomSheetHeight < windowHeight * 0.25) {
            setBottomSheetHeight(160);
        } else if (bottomSheetHeight < windowHeight * 0.6) {
            setBottomSheetHeight(windowHeight * 0.5);
        } else {
            setBottomSheetHeight(windowHeight * 0.8);
        }
    };

    // Add event listeners for drag
    useEffect(() => {
        const handleMouseMove = (e) => handleDragMove(e);
        const handleMouseUp = () => handleDragEnd();
        const handleTouchMove = (e) => handleDragMove(e);
        const handleTouchEnd = () => handleDragEnd();

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging]);

    const handleViewReady = (event) => {
        let viewElement = event.target;
        const view = viewElement.arcgisView;
        viewElement.map.add(pointLayer); // Layer for point
        viewElement.map.add(selectedLayer); // Layer for selected bathroom points
        viewElement.map.add(routeLayerRef.current); // Layer for routes
        viewElement.map.add(radiusLayer); //Layer for radius
    };

    const recenterMap = () => {
        if (viewPoint) {
            viewPoint.goTo({
                center: defaultCenter,
                zoom: defaultZoom,
            });
        }
    };

    useEffect(() => {
        if(locateRef.current){
            locateRef.current.goToOverride = (view, options) => {
                options.target.scale = 1500;
                return view.goTo(options.target);
            };
        }
    }, []);

    const enableAddPinMode = () => {
        setAddPin(true);
    };

    /* POINT / FEATURE QUERY LOGIC */

    // Clear Pin Layer
    function clearGraphics() {
        pointLayer.removeAll(); // Remove graphics from GraphicsLayer
        selectedLayer.removeAll(); // Clear selection
        radiusLayer.removeAll(); // Clear radius
    }

    // Event Listener for dropping pin
    const handleClick = async (event) => {
        clearGraphics();
        clickPoint = event.detail.mapPoint;
        // Pass point to the showPlaces() function
        clickPoint && placePoint(clickPoint);
        clickPoint && queryFeatures(clickPoint);
    };

    async function placePoint(click) {
        const markerSymbol = {
            type: "simple-marker",
            style: "triangle",
            size: 15,
            color: "red",
            outline: {
                color: "white",
                width: 2,
            },
        };

        const pointGraphic = new Graphic({
            geometry: click,
            symbol: markerSymbol,
        });

        const circleGeometry = new Circle({
            center: click,
            geodesic: true,
            numberOfPoints: 100,
            radius: distance,
            radiusUnit: "miles",
        });

        const circleGraphic = new Graphic({
            geometry: circleGeometry,
            symbol: {
            type: "simple-fill", // autocasts as SimpleFillSymbol
            style: "solid",
            color: [3, 140, 255, 0.1],
            outline: {
                width: 1,
                color: [3, 140, 255],
            },
            },
        });

        radiusLayer.graphics.add(circleGraphic);
        pointLayer.graphics.add(pointGraphic);
    };

    // Query the feature layer with the bathroom data points
    function queryFeatures(point) {
        let units = "miles";
        dataLayer
            .queryFeatures({
                geometry: point,
                // distance and units will be null if basic query selected
                distance: distance,
                units: units,
                spatialRelationship: "intersects",
                returnGeometry: true,
                returnQueryGeometry: true,
                outFields: ["*"],
            })
            .then((results) => {
                displayResults(results);
            });
    }

    function displayResults(results) {
        const symbol = {
            type: "simple-marker",
            style: "triangle",
            size: 10,
            color: "blue",
            outline: {
                color: "white",
                width: 2,
            },
        };

        results.features.forEach((feature) => {
            feature.symbol = symbol;
        });

        selectedLayer.graphics.addMany(results.features);
    }

    const toggleBottomSheet = () => {
        if (!isMobile) return;

        const windowHeight = window.innerHeight;
        if (bottomSheetHeight <= 160) {
            setBottomSheetHeight(windowHeight * 0.5);
        } else if (bottomSheetHeight <= windowHeight * 0.5) {
            setBottomSheetHeight(windowHeight * 0.8);
        } else {
            setBottomSheetHeight(160);
        }
    };

    // Desktop layout
    if (!isMobile) {
        return (
            <div style={{
                display: 'flex',
                height: '100vh',
                width: '100vw',
                fontFamily: 'Helvetica, Arial, sans-serif'
            }}>
                {/* LEFT SIDEBAR - Desktop */}
                <div style={{
                    width: '420px',
                    minWidth: '420px',
                    maxWidth: '420px',
                    height: '100vh',
                    background: 'white',
                    borderRight: '1px solid #d1d5db',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* LOGO AND SEARCH SECTION */}
                    <div style={{
                        padding: '24px',
                        borderBottom: '1px solid #e5e7eb',
                        flexShrink: 0
                    }}>
                        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                onClick={onBackToWelcome}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: '#6b7280',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                                title="Back to Welcome"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            {/* Logo Options */}
                            {/* OPTION 1: Use your own logo file (requires logo.png in public folder) */}
                            {/*
                            <img
                                src="/logo.png"
                                alt="GottaGo"
                                style={{ height: '32px', width: 'auto' }}
                            />
                            */}

                            {/* OPTION 2: SVG Logo */}
                            <img
                                src="/logo.png"
                                alt="GottaGo"
                                style={{ height: '32px', width: 'auto' }}
                            />

                            {/* OPTION 3: Text + Emoji Logo */}
                            {/*
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: '#8b4513',
                                fontFamily: 'Georgia, serif',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                🚽 GottaGo
                            </div>
                            */}
                        </div>

                        <div style={{ position: 'relative' }}>
                            <Search style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9ca3af',
                                width: '16px',
                                height: '16px'
                            }} />
                            <input
                                type="text"
                                placeholder="Search for a place, address, or location of interest"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 40px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    {/* LOCATIONS HEADER */}
                    <div style={{
                        padding: '16px 24px',
                        background: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        flexShrink: 0
                    }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#111827'
                        }}>
                            Nearby Restrooms (12)
                        </h2>
                    </div>

                    {/* SCROLLABLE LOCATIONS LIST */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        background: '#f9fafb',
                        padding: '16px',
                        minHeight: 0
                    }}>
                        <BathroomCard title="Starbucks Coffee" description="Clean restroom, customer access only" location={[0,0,0]} />
                        <BathroomCard title="Central Park Visitor Center" description="Public restroom, accessible, family-friendly" location={[0,0,0]} />
                        <BathroomCard title="McDonald's" description="Fast food restaurant restroom" location={[0,0,0]} />
                        <BathroomCard title="Public Library" description="Clean public restroom, accessible" location={[0,0,0]} />
                        <BathroomCard title="Gas Station" description="24/7 access, may require key" location={[0,0,0]} />
                        <BathroomCard title="Shopping Mall" description="Large restroom facility" location={[0,0,0]} />
                        <BathroomCard title="City Hall" description="Public access during hours" location={[0,0,0]} />
                    </div>

                    {/* BOTTOM SECTION */}
                    <div style={{
                        padding: '24px',
                        background: 'white',
                        borderTop: '1px solid #e5e7eb',
                        flexShrink: 0
                    }}>
                        <p style={{
                            margin: '0 0 16px 0',
                            color: '#4b5563',
                            fontSize: '14px',
                            lineHeight: '1.5'
                        }}>
                            Click to drop a pin and explore available restrooms around you.
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={recenterMap} style={{
                                flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151',
                                padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '500',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'inherit'
                            }}>
                                <Navigation style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                                Recenter
                            </button>
                            <button onClick={enableAddPinMode} style={{
                                flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151',
                                padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '500',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'inherit'
                            }}>
                                <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                                Toggle Pin Mode
                            </button>
                        </div>
                    </div>
                </div>

                {/* MAP SECTION - Desktop */}
                <div style={{ flex: 1, height: '100vh', position: 'relative' }}>
                    <arcgis-map
                        item-id="5fcd777290d04ea2bcaa94a77374eeca"
                        onarcgisViewReadyChange={handleViewReady}
                        onarcgisViewClick={handleClick}
                        center={defaultCenter.join(",")}
                        zoom={defaultZoom.toString()}
                        style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', top: 0, left: 0 }}
                    >
                        <arcgis-zoom position="top-left" />
                        <arcgis-locate ref={locateRef} position="top-left" />
                    </arcgis-map>

                    {addPin && (
                        <div style={{
                            position: 'absolute', top: '16px', left: '16px', background: '#2563eb',
                            color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', zIndex: 1000
                        }}>
                            Click on the map to add a restroom location
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Mobile layout with bottom sheet
    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            position: 'relative',
            fontFamily: 'Helvetica, Arial, sans-serif',
            overflow: 'hidden'
        }}>
            {/* FULL SCREEN MAP - Mobile */}
            <div style={{
                width: '100%',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0
            }}>
                <arcgis-map
                    item-id="5fcd777290d04ea2bcaa94a77374eeca"
                    onarcgisViewReadyChange={handleViewReady}
                    onarcgisViewClick={handleClick}
                    center={defaultCenter.join(",")}
                    zoom={defaultZoom.toString()}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                >
                    <arcgis-zoom position="top-right" />
                    <arcgis-locate ref={locateRef} position="top-right" />
                </arcgis-map>

                {addPin && (
                    <div style={{
                        position: 'absolute', top: '16px', left: '16px', background: '#2563eb',
                        color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', zIndex: 999
                    }}>
                        Click on the map to add a restroom location
                    </div>
                )}
            </div>

            {/* BOTTOM SHEET - Mobile */}
            <div
                ref={bottomSheetRef}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${bottomSheetHeight}px`,
                    background: 'white',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px',
                    boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    maxHeight: '80vh'
                }}
            >
                {/* DRAG HANDLE */}
                <div
                    style={{
                        padding: '12px 0 8px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'grab',
                        flexShrink: 0
                    }}
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    onClick={toggleBottomSheet}
                >
                    <div style={{
                        width: '40px',
                        height: '4px',
                        backgroundColor: '#d1d5db',
                        borderRadius: '2px'
                    }} />
                </div>

                {/* LOGO SECTION - Only show when expanded */}
                {bottomSheetHeight > 300 && (
                    <div style={{ padding: '0 24px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={onBackToWelcome}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#6b7280'
                            }}
                            title="Back to Welcome"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        {/* Logo for mobile expanded view */}
                        <img
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 80'%3E%3Cpath d='M20 20 Q20 10 30 10 L170 10 Q180 10 180 20 L180 60 Q180 70 170 70 L30 70 Q20 70 20 60 Z' fill='%23D4AF37'/%3E%3Ctext x='100' y='45' text-anchor='middle' font-family='serif' font-size='24' font-weight='bold' fill='%23654321'%3EGottaGo%3C/text%3E%3C/svg%3E"
                            alt="GottaGo"
                            style={{ height: '24px', width: 'auto' }}
                        />
                    </div>
                )}

                {/* SEARCH SECTION */}
                <div style={{ padding: '0 24px 16px', flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af',
                            width: '16px',
                            height: '16px'
                        }} />
                        <input
                            type="text"
                            placeholder="Search for restrooms..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 40px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '16px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>
                </div>

                {/* LOCATIONS HEADER */}
                <div style={{
                    padding: '0 24px 12px',
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#111827'
                    }}>
                        Nearby Restrooms (12)
                    </h2>
                    <button
                        onClick={toggleBottomSheet}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        {bottomSheetHeight > window.innerHeight * 0.6 ?
                            <ChevronDown size={20} /> :
                            <ChevronUp size={20} />
                        }
                    </button>
                </div>

                {/* SCROLLABLE LOCATIONS LIST */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 16px',
                    minHeight: 0,
                    paddingBottom: '16px'
                }}>
                    <BathroomCard title="Starbucks Coffee" description="Clean restroom, customer access only" location={[0,0,0]} />
                    <BathroomCard title="Central Park Visitor Center" description="Public restroom, accessible, family-friendly" location={[0,0,0]} />
                    <BathroomCard title="McDonald's" description="Fast food restaurant restroom" location={[0,0,0]} />
                    <BathroomCard title="Public Library" description="Clean public restroom, accessible" location={[0,0,0]} />
                    <BathroomCard title="Gas Station" description="24/7 access, may require key" location={[0,0,0]} />
                    <BathroomCard title="Shopping Mall" description="Large restroom facility" location={[0,0,0]} />
                    <BathroomCard title="City Hall" description="Public access during hours" location={[0,0,0]} />
                </div>

                {/* FLOATING ACTION BUTTONS - Mobile */}
                {bottomSheetHeight <= 250 && (
                    <div style={{
                        position: 'absolute',
                        bottom: `${bottomSheetHeight + 16}px`,
                        right: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        zIndex: 999
                    }}>
                        <button
                            onClick={enableAddPinMode}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: '#2563eb',
                                border: 'none',
                                color: 'white',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Plus size={24} />
                        </button>
                        <button
                            onClick={recenterMap}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: 'white',
                                border: '1px solid #d1d5db',
                                color: '#374151',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Navigation size={20} />
                        </button>

                        <button onClick={handleRouteClick}>Compute Route</button>
                        {shouldRoute && <Router graphicsLayer={routeLayerRef.current}/>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MainApp;