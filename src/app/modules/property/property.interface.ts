import {
  ListingType,
  PropertyStatus,
  PropertyType,
} from "../../../generated/prisma/enums";

export interface Property {
  title: string;
  description: string;
  price: number;
  location: string;
  address?: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  type: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  isPremium: boolean;
  isFeatured: boolean;
}
