import { prisma } from "../../lib/prisma";

/**
 * Search for properties by name, location, or keywords
 */
export const searchProperties = async (query: string, limit: number = 5) => {
  try {
    const searchQuery = query.toLowerCase().trim();

    // Ensure search query is not empty
    if (!searchQuery || searchQuery.length < 2) {
      console.log("❌ Search query too short");
      return [];
    }

    console.log("🔎 Searching with query:", searchQuery);

    const properties = await prisma.property.findMany({
      where: {
        OR: [
          { title: { contains: searchQuery, mode: "insensitive" } },
          { location: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        location: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        area: true,
        description: true,
        type: true,
      },
      take: limit,
    });

    console.log("📊 Database search found:", properties.length, "properties");
    if (properties.length > 0) {
      console.log(
        "📍 Found properties:",
        properties.map((p) => p.title),
      );
    }

    return properties || [];
  } catch (error) {
    console.error("❌ Error searching properties:", error);
    return [];
  }
};

/**
 * Get property details by ID
 */
export const getPropertyDetails = async (propertyId: string) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        location: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        area: true,
        description: true,
        type: true,
        images: {
          select: {
            url: true,
          },
          take: 3,
        },
      },
    });

    return property;
  } catch (error) {
    console.error("Error fetching property details:", error);
    return null;
  }
};

/**
 * Format property data for chat context
 */
export const formatPropertiesForChat = (
  properties: Awaited<ReturnType<typeof searchProperties>>,
): string => {
  if (!properties || properties.length === 0) {
    return "No properties found matching your search.";
  }

  if (properties.length === 1) {
    const prop = properties[0];
    return `Found: "${prop.title}" in ${prop.location}
Price: ₹${(prop.price / 100000).toFixed(1)}L
Type: ${prop.type} | Bedrooms: ${prop.bedrooms} | Bathrooms: ${prop.bathrooms}
Area: ${prop.area} sqft
Description: ${prop.description || "No details available"}`;
  }

  // Multiple properties
  let result = `Found ${properties.length} matching properties:\n`;
  properties.forEach((prop, index) => {
    result += `\n${index + 1}. "${prop.title}" - ${prop.location}
   Price: ₹${(prop.price / 100000).toFixed(1)}L | ${prop.bedrooms}BHK | ${prop.type}`;
  });

  return result;
};
