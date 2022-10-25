export type Coordinate = {
  lat: number;
  long: number;
};

export type Image = {
  w: number; // width of the photo
  h: number; // height of the photo
  url: string;
};

export type Photo = {
  id: string;
  placeId?: string; // identifier of the place, this photo is attached to
  location: {
    lat: number;
    long: number;
  };
  images: {
    // array of different sizes of the image
    w: number; // width of the photo
    h: number; // height of the photo
    url: string;
  }[];
};

export type Place = {
  id: string; // globally unique place identifier
  name: string;
  type: 'place' | 'campground' | 'visitorcenter'
  url?: string; // place URL from NPS API
  description: string;
  location: Coordinate;
  cover: Photo[];
};

export type Park = ParkHeader & {
  places: Place[];
  photos: Photo[];
};

export type ParkHeader = {
  code: string; // uppercase 4-letters, e.g. “YELL”
  bbox: {
    lat: number;
    long: number;
  }[];
  detailsUrl: string; // relative or absolute URL to the park details data
  name: string;
  designation: string;
  states: string[]; // uppercase 2-letters, e.g. “AK”
  cover: Photo;
  description: string;
};

export type Index = {
  parks: ParkHeader[];
};

export type BoundingBoxConf = {
  total: number;
  data: { parkCode: string; coordinates: string[] }[];
};

export type BoundingBoxList = {
  total: number;
  data: {
    [key: string]: {
      parkCode: string;
      bbox: Coordinate[];
    };
  };
};
