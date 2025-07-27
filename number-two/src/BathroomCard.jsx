import { MapPin } from "lucide-react";
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
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine"
import * as geometryService from "@arcgis/core/rest/geometryService.js";
import Point from "@arcgis/core/geometry/Point"
import Circle from "@arcgis/core/geometry/Circle.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import DistanceMeasurement2D from "@arcgis/core/widgets/DistanceMeasurement2D.js";
import DistanceParameters from "@arcgis/core/rest/support/DistanceParameters.js";

function BathroomCard({ title, description, currenPoint, featurePoint }) {
    let distance = 0.3;
    const bathroomPoint = new Point({
        latitude: featurePoint.attributes.Latitude,
        longitude: featurePoint.attributes.Longitude,
        spatialReference: { wkid: 4326 }
    });

    //geometryService = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
    var distParams = new DistanceParameters();
    distParams.distanceUnit = "miles";

    distParams.geometry1 = currenPoint;
    distParams.geometry2 = bathroomPoint;
    distParams.geodesic = true;
    geometryService.distance(distParams, function(distanceHere) {
        distance = distanceHere;
        //setDistanceBetween(distanceHere);
    });

    //setDstanceBetween(calculateDistance);
    

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
                    <span>{ distance } miles away</span>
                </div>
            </div>
        </div>
    );
}

export default BathroomCard;