import express from "express";
import prisma from "../prisma";
import { authenticateToken } from "./user";
import moment from "moment";
import seedrandom from "seedrandom";

const router = express.Router();

async function getPeopleCount(
  locationId: number,
  minReputationPoint: number = 0,
  maxNumber = 1000
) {
  const people = await prisma.planLocation.aggregate({
    where: {
      locationId,
      date: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      plan: {
        user: {
          reputationPoint: {
            gte: minReputationPoint,
          },
        },
      },
    },
    _sum: {
      numberOfPeople: true,
    },
  });
  let rng = seedrandom(locationId.toString() + minReputationPoint.toString());
  let numberOfPeople = Math.floor(rng() * maxNumber);
  return numberOfPeople + (people._sum.numberOfPeople || 0);
}

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || 10;
  limit = Math.min(limit, 20);
  const offset = (page - 1) * limit;

  const search = (req.query.search as string) || "";

  const locations: any = await prisma.location.findMany({
    take: limit,
    skip: offset,
    where: {
      name: {
        contains: search?.toLowerCase(),
      },
    },
    include: {
      _count: {
        select: {
          Review: true,
        },
      },
    },
  });

  for (const location of locations) {
    location.intendedPeople = await getPeopleCount(location.id);
    location.highIntendedPeople = await getPeopleCount(
      location.id,
      50,
      location.intendedPeople
    );
    let review: any = await prisma.review.aggregate({
      _avg: {
        rating: true,
      },
      where: {
        locationId: location.id,
      },
    });
    review = review._avg.rating || 0;
    location.review = review;
  }
  const total_locations = await prisma.location.count({
    where: {
      name: {
        contains: search?.toLowerCase(),
      },
    },
  });
  const current_page = page;
  const total_page = Math.ceil(total_locations / limit);
  res.json({
    locations,
    current_page,
    total_page,
  });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const location: any = await prisma.location.findFirst({
    where: {
      id: id,
    },
    include: {
      LocationImages: true,
      _count: {
        select: {
          Review: true,
        },
      },
    },
  });
  location.intendedPeople = await getPeopleCount(location.id);
  location.highIntendedPeople = await getPeopleCount(
    location.id,
    50,
    location.intendedPeople
  );
  let review: any = await prisma.review.aggregate({
    _avg: {
      rating: true,
    },
    where: {
      locationId: location.id,
    },
  });
  review = review._avg.rating || 0;
  location.review = review;
  res.json(location);
});

router.get("/:id/graph", async (req, res) => {
  const locationId = parseInt(req.params.id);
  const pls: any = await prisma.planLocation.findMany({
    where: {
      locationId,
    },
    select: {
      numberOfPeople: true,
      isVisited: true,
      date: true,
    },
  });

  const filter: "hour" | "week" | "month" = req.query.filter as
    | "hour"
    | "week"
    | "month"; // hour, week, month
  if (filter != "hour" && filter != "week" && filter != "month") {
    res.json({
      error: "invalid filter",
    });
    return;
  }
  const visited_true = pls.filter((pl: any) => pl.isVisited);
  const visited_false = pls.filter((pl: any) => !pl.isVisited);
  // last 12 hour and next 12 hour
  const minHour = moment().subtract(12, `${filter}s`);
  const maxHour = moment().add(12, `${filter}s`);
  const visited_true_hour = visited_true.filter((pl: any) =>
    moment(pl.date).isBetween(minHour, maxHour, null, "[]")
  );

  const visited_false_hour = visited_false.filter((pl: any) =>
    moment(pl.date).isBetween(minHour, maxHour, null, "[]")
  );
  const x = [];
  const y1: any[] = []; // that su den
  const y2: any[] = []; // du dinh
  for (let i = -12; i < 13; i++) {
    const hour = moment().add(i, `${filter}s`);
    x.push(hour);
  }
  for (let i = -12; i < 13; i++) {
    let _y1 = 0;
    let _y2 = 0;
    const hour = moment().add(i, `${filter}s`);
    const hour_visited_true = visited_true_hour.filter((pl: any) =>
      moment(pl.date).isSame(hour, filter)
    );
    const hour_visited_false = visited_false_hour.filter((pl: any) =>
      moment(pl.date).isSame(hour, filter)
    );
    _y1 = hour_visited_true.reduce(
      (acc: any, curr: any) => acc + curr.numberOfPeople,
      0
    );
    _y2 = hour_visited_false.reduce(
      (acc: any, curr: any) => acc + curr.numberOfPeople,
      0
    );
    y1.push(_y1);
    y2.push(_y2);
  }
  let t1 = await getPeopleCount(locationId);
  let t2 = await getPeopleCount(locationId, 50, t1);
  let rng = seedrandom(locationId.toString() + filter);
  for (let i = 0; i < y1.length; i++) {
    let temp1 = Math.floor(rng() * t1);
    y1[i] += temp1;
    y2[i] += Math.floor(rng() * Math.min(t2, temp1));
  }

  res.json({ x, intended: y1, reality: y2 });
});

router.get("/:id/reviews", async (req, res) => {
  const id = parseInt(req.params.id);
  const page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || 10;
  limit = Math.max(limit, 50);
  const offset = (page - 1) * limit;

  const reviews = await prisma.review.findMany({
    where: {
      locationId: id,
    },
    take: limit,
    skip: offset,
    include: {
      user: true,
    },
  });
  const total_reviews = await prisma.review.count({
    where: {
      locationId: id,
    },
  });

  const current_page = page;
  const total_page = Math.ceil(total_reviews / limit);
  res.json({
    reviews,
    current_page,
    total_page,
  });
});

router.post("/:id/reviews", authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  const id = parseInt(req.params.id);
  let rating = parseInt(req.body.rating);
  let content = req.body.content;
  const isReviewExist = await prisma.review.findFirst({
    where: {
      locationId: id,
      userId,
    },
  });
  if (isReviewExist) {
    res.status(500).json({
      message: "You have already reviewed this location",
    });
  } else {
    const review = await prisma.review.create({
      data: {
        content,
        rating,
        locationId: id,
        userId,
      },
    });
    res.json(review);
  }
});

export default router;
