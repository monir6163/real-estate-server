import {
  ListingType,
  PropertyStatus,
  PropertyType,
} from "../../../generated/prisma/enums";

export interface IProperty {
  title: string;
  description: string;
  price: number;
  location: string;
  address?: string;
  thumbnail: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  type: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  isPremium: boolean;
  isFeatured: boolean;
  agentId: string;
  images: string[];
}
