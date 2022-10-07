import axios from "axios";
import { MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useState } from "react";

import Map, { GeoJSONSource, Layer, Marker, Popup, Source } from "react-map-gl";
import { Pin } from "./components/Pin";
import {
  clusterCountLayer,
  clusterLayer,
  unclusteredPointLayer,
} from "./layers";
import { Index, Park } from "./types";

import mapboxgl from 'mapbox-gl';
/* eslint-disable @typescript-eslint/no-var-requires */
(mapboxgl as any).workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default; // eslint-disable-line


const MAPBOX_TOKEN =
  "pk.eyJ1IjoiaXZhbi1zaGFmcmFuIiwiYSI6ImNsOG41NzJrOTBlYmkzdW81cWgyaTFuc2cifQ.lR0nYJMF4TdIazl-B1mV6w"; // Set your mapbox token here

export default function App() {
  const [parkCodes, setParkCodes] = useState<string[]>([]);
  const [selectedPark, setSelectedPark] = useState("ARCH");
  const [popupInfo, setPopupInfo] = useState<any>(null);
  const [park, setPark] = useState<Park | null>(null);

  const [markers, setMarkers] = useState<JSX.Element[] | null>(null);

  const [data, setData] = useState<GeoJSONSource | null>(null);

  const [viewState, setViewState] = useState({
    longitude: -100,
    latitude: 40,
    zoom: 8,
  });

  useEffect(() => {
    const requestParksIndex = async () => {
      let res = await axios.get<Index>(
        `https://nps-photos-app-data.s3.amazonaws.com/index.json`
      );
      console.log(res.data);
      setParkCodes(res.data.parks.map((item) => item.code));
    };
    requestParksIndex();
  }, []);

  useEffect(() => {
    const requestPark = async () => {
      let res = await axios.get<Park>(
        `https://nps-photos-app-data.s3.amazonaws.com/parks/${selectedPark}.json`
      );
      setViewState({
        latitude: res.data.bbox[0].lat,
        longitude: res.data.bbox[0].long,
        zoom: 8,
      });
      setPark(res.data);

      let photoData: any = {
        type: "FeatureCollection",
        features: [],
      };

      photoData.features = res.data.photos.map((photo) => {
        let img = photo.images[0]!;
        return {
          type: "Feature",
          properties: {
            id: photo.id,
            w: img.w,
            h: img.h,
            url: img.url,
            title:
              (photo.placeId &&
                res.data.places.find(({ id }) => photo.placeId === id)?.name) ||
              "No place for this photo",
            mag: 2.3,
            lat: photo.location.lat,
            long: photo.location.long,
          },
          geometry: {
            type: "Point",
            coordinates: [photo.location.long, photo.location.lat],
          },
        };
      });

      setData(photoData);
    };

    requestPark();
  }, [setPark, selectedPark]);

  useEffect(() => {
    if (park) {
      let newMarkers = park.places.map((place) => {
        return (
          <Marker
            key={
              place.id +
              place.location.lat +
              place.location.long +
              Math.random()
            }
            latitude={place.location.lat}
            longitude={place.location.long}
            onClick={(e) => {
              e.originalEvent.stopPropagation();

              setPopupInfo({
                title: place.name,
                url: place.cover?.images[0]!.url,
                location: place.location,
              });
            }}
          >
            <Pin size={18} fill="#00dd00" />
          </Marker>
        );
      });
      setMarkers(newMarkers);
    }
  }, [park]);

  const handleSelect = (value: string) => {
    setSelectedPark(value);
  };

  const onClick = (e: MapLayerMouseEvent) => {
    const features = e.features || [];

    if (features.length > 0) {
      console.log(features);
      setPopupInfo({
        title: features[0].properties?.title,
        subtitle: `w:${features[0].properties?.w}px\t\t\th:${features[0].properties?.h}px`,
        url: features[0].properties?.url,
        location: {
          lat: features[0].properties?.lat,
          long: features[0].properties?.long,
        },
      });
    }
  };

  return (
    <>
      <div className="overlay">
        <select onChange={(e) => handleSelect(e.target.value)}>
          {parkCodes.map((code) => {
            return (
              <option value={code} key={code}>
                {code}
              </option>
            );
          })}
        </select>
      </div>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v9"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={[unclusteredPointLayer.id!]}
        onClick={onClick}
        style={{ width: "100vw", height: "100vh" }}
      >
        {markers}

        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.location.long}
            latitude={popupInfo.location.lat}
            onClose={() => setPopupInfo(null)}
          >
            <h4>{popupInfo.title}</h4>
            <p>{popupInfo.subtitle}</p>

            <img width="100%" src={popupInfo.url} alt={popupInfo.title} />
          </Popup>
        )}

        {data ? (
          <Source
            id="photos"
            type="geojson"
            data={data as any}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...unclusteredPointLayer} />
          </Source>
        ) : null}
      </Map>
    </>
  );
}
