import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

async function seed() {
  const mockdataPath = path.join(__dirname, "..", "prisma/mock.json");
  const mockdata = JSON.parse(fs.readFileSync(mockdataPath, "utf8"));
  for (let item of mockdata) {
    const images: string[] = item.imageUrls;
    await prisma.location.create({
      data: {
        name: item.name,
        address: item.location.summary,
        latitude: parseFloat(item.location.location.lat),
        longitude: parseFloat(item.location.location.lon),
        thumbnail: item.thumbnail,
        LocationImages: {
          create: images.map((image) => ({
            image_url: image,
          })),
        },
      },
    });
  }
}

seed();
