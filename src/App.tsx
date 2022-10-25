import axios from "axios";
import { MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useCallback, useEffect, useState } from "react";

import Map, { GeoJSONSource, Layer, Popup, Source } from "react-map-gl";
import { unclusteredPointLayer } from "./layers";
import { Index, Park } from "./types";

import mapboxgl from "mapbox-gl";
/* eslint-disable @typescript-eslint/no-var-requires */
(mapboxgl as any).workerClass =
  require("worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker").default; // eslint-disable-line

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiaXZhbi1zaGFmcmFuIiwiYSI6ImNsOG41NzJrOTBlYmkzdW81cWgyaTFuc2cifQ.lR0nYJMF4TdIazl-B1mV6w"; // Set your mapbox token here

export default function App() {
  const [parkCodes, setParkCodes] = useState<string[]>([]);
  const [selectedPark, setSelectedPark] = useState<string | undefined>(
    undefined
  );
  const [popupInfo, setPopupInfo] = useState<any>(null);
  const [park, setPark] = useState<Park | null>(null);

  const [data, setData] = useState<GeoJSONSource | null>(null);

  const [cursor, setCursor] = useState("auto");

  const [viewState, setViewState] = useState({
    longitude: -100,
    latitude: 40,
    zoom: 12,
  });

  useEffect(() => {
    const requestParksIndex = async () => {
      let res = await axios.get<Index>(
        `https://nps-photos-app-data.s3.amazonaws.com/index.json`
      );
      setParkCodes(res.data.parks.map((item) => item.code));
      setSelectedPark(res.data.parks[0]!.code);
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
        zoom: 9,
      });
      setPark(res.data);

      let data: any = {
        type: "FeatureCollection",
        features: [],
      };

      data.features = res.data.photos.map((photo) => {
        let img = photo.images[0]!;
        return {
          type: "Feature",
          properties: {
            id: photo.id,
            w: img.w,
            h: img.h,
            url: img.url,
            type: "photo",
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

      let places = res.data.places.map((place) => {
        let img = place.cover[0] && place.cover[0].images[0];
        let title = place.name;

        if (!img) {
          img = { w: 0, h: 0, url: "" };
          title += " (No associated photo)";
        }

        return {
          type: "Feature",
          properties: {
            id: place.id,
            w: img.w,
            h: img.h,
            url: img.url,
            title: title,
            mag: 2.3,
            type: place.type,
            lat: place.location.lat,
            long: place.location.long,
          },
          geometry: {
            type: "Point",
            coordinates: [place.location.long, place.location.lat],
          },
        };
      });

      places = places.filter((item) => item !== null);

      data.features.push(...places);
      setData(data);
    };

    if (selectedPark) {
      requestPark();
    }
  }, [setPark, selectedPark]);

  const handleSelect = (value: string) => {
    setSelectedPark(value);
  };

  const onClick = (e: MapLayerMouseEvent) => {
    setPopupInfo(null);
    const features = e.features || [];

    if (features.length > 0) {
      setPopupInfo({
        id: features[0].properties?.id,
        title: features[0].properties?.title,
        subtitle: `w:${features[0].properties?.w}px\t\t\th:${features[0].properties?.h}px`,
        url: features[0].properties?.url,
        type: features[0].properties?.type,
        location: {
          lat: features[0].properties?.lat,
          long: features[0].properties?.long,
        },
      });
    }
  };

  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor("auto"), []);

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

      <div className="overlay-info">
        <p>Red markers are places</p>
        <p>Blue ones are photos</p>

        <p>Photo count for selected park on server: {park?.photos.length}</p>
        <p>Total places: {park?.places.length}</p>
      </div>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v9"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={
          unclusteredPointLayer.id ? [unclusteredPointLayer.id] : undefined
        }
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        cursor={cursor}
        style={{ width: "100vw", height: "100vh" }}
      >
        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.location.long}
            latitude={popupInfo.location.lat}
            closeOnClick={false}
            onClose={() => {
              setPopupInfo(null);
            }}
          >
            <h4>{popupInfo.title}</h4>
            <p>[{popupInfo.type}]</p>
            <p>{popupInfo.subtitle}</p>

            <img width="100%" src={popupInfo.url} alt={popupInfo.title} />
          </Popup>
        )}

        {data ? (
          <Source
            id="photos"
            type="geojson"
            cluster={false}
            data={data as any}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            <Layer id={"unclustered-point"} {...unclusteredPointLayer} />
          </Source>
        ) : null}
      </Map>
    </>
  );
}
