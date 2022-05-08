import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

async function seedLocation() {
  const mockdataPath = path.join(__dirname, "..", "prisma/location.json");
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
        Review: {
          create: item.review.reviews.map((e: any) => ({
            rating: Math.floor(e.rating),
            content: e.content,
            userId: e.userId + 1,
            createdAt: new Date(parseInt(e.date)),
          })),
        },
      },
    });
  }
  console.log(`seed ${mockdata.length} location success`);
}

async function seedUser() {
  const mockdataPath = path.join(__dirname, "..", "prisma/user.json");
  const mockdata = JSON.parse(fs.readFileSync(mockdataPath, "utf8"));
  for (let i = 0; i < mockdata.length; i++) {
    let item = mockdata[i];
    await prisma.user.upsert({
      where: {
        email: item.email,
      },
      update: {},
      create: {
        name: item.name,
        email: item.email,
        password: "123",
      },
    });
  }
  console.log(`seed ${mockdata.length} user success`);
}

seedUser().then(() => {
  seedLocation();
});
